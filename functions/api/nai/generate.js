const NAI_API = 'https://api.idlecloud.cc/api';
const MAX_PER_IP_HOUR = 10;
const MAX_QUEUE_SIZE = 5;
const JOB_TIMEOUT_MS = 300000;
const WAITER_TIMEOUT_MS = 120000;

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
  const now = Date.now();

  if (!env.NAI_KV) {
    return await submitToApi(apiKey, request);
  }

  // Admin check
  const adminKey = request.headers.get('x-admin-key');
  const isAdmin = adminKey && env.ADMIN_KEY && adminKey === env.ADMIN_KEY;

  // IP rate limiting (skip for admin)
  const ipKey = `ip:${clientIP}`;
  const ipData = await env.NAI_KV.get(ipKey, { type: 'json' });
  if (!isAdmin && ipData) {
    const hourAgo = now - 3600000;
    const recentRequests = (ipData.timestamps || []).filter(t => t > hourAgo);
    if (recentRequests.length >= MAX_PER_IP_HOUR) {
      return jsonResponse(429, {
        error: `每小时最多 ${MAX_PER_IP_HOUR} 次请求，请稍后再试`,
        retry_after: Math.ceil((recentRequests[0] + 3600000 - now) / 1000),
        rate_limited: true
      });
    }
  }

  // Check active job
  const activeJob = await env.NAI_KV.get('active_job', { type: 'json' });
  let jobBusy = false;

  if (activeJob) {
    const elapsed = now - activeJob.startTime;
    if (elapsed < JOB_TIMEOUT_MS) {
      try {
        const statusRes = await fetch(`${NAI_API}/get_result/${activeJob.jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'queued' || statusData.status === 'processing') {
            jobBusy = true;
          } else {
            await env.NAI_KV.delete('active_job');
          }
        }
      } catch (e) {
        if (elapsed < 60000) jobBusy = true;
        else await env.NAI_KV.delete('active_job');
      }
    } else {
      await env.NAI_KV.delete('active_job');
    }
  }

  // Manage wait queue
  let waitQueue = await env.NAI_KV.get('wait_queue', { type: 'json' }) || [];
  waitQueue = waitQueue.filter(w => now - w.timestamp < WAITER_TIMEOUT_MS);

  if (jobBusy) {
    // Admin: insert at front of queue, will be next after current job finishes
    if (isAdmin) {
      const existingIdx = waitQueue.findIndex(w => w.ip === clientIP);
      if (existingIdx > 0) {
        waitQueue.splice(existingIdx, 1);
        waitQueue.unshift({ ip: clientIP, timestamp: now, admin: true });
      } else if (existingIdx < 0) {
        waitQueue.unshift({ ip: clientIP, timestamp: now, admin: true });
      } else {
        waitQueue[0].timestamp = now;
      }
      await env.NAI_KV.put('wait_queue', JSON.stringify(waitQueue), { expirationTtl: 300 });
      return jsonResponse(429, {
        error: '管理员已插队，等待当前任务完成',
        queued: true,
        queue_position: 1,
        queue_total: waitQueue.length,
        retry_after: 5
      });
    }

    const existingIdx = waitQueue.findIndex(w => w.ip === clientIP);
    if (existingIdx >= 0) {
      waitQueue[existingIdx].timestamp = now;
    } else {
      if (waitQueue.length >= MAX_QUEUE_SIZE) {
        return jsonResponse(429, {
          error: '排队已满（最多5人），请稍后再试',
          queue_full: true,
          retry_after: 30
        });
      }
      waitQueue.push({ ip: clientIP, timestamp: now });
    }

    await env.NAI_KV.put('wait_queue', JSON.stringify(waitQueue), { expirationTtl: 300 });

    const position = waitQueue.findIndex(w => w.ip === clientIP) + 1;
    return jsonResponse(429, {
      error: `排队中，前方正在生成`,
      queued: true,
      queue_position: position,
      queue_total: waitQueue.length,
      retry_after: 10
    });
  }

  // Job slot is free
  if (waitQueue.length > 0) {
    const firstWaiter = waitQueue[0];
    // Admin always cuts to front
    if (isAdmin) {
      const existingIdx = waitQueue.findIndex(w => w.ip === clientIP);
      if (existingIdx >= 0) waitQueue.splice(existingIdx, 1);
      else if (existingIdx < 0 && firstWaiter.ip !== clientIP) {
        // not in queue but slot free with others waiting — admin takes it
      }
      await env.NAI_KV.put('wait_queue', JSON.stringify(waitQueue), { expirationTtl: 300 });
      // fall through to submit
    } else if (firstWaiter.ip !== clientIP) {
      const existingIdx = waitQueue.findIndex(w => w.ip === clientIP);
      if (existingIdx < 0) {
        if (waitQueue.length >= MAX_QUEUE_SIZE) {
          return jsonResponse(429, {
            error: '排队已满（最多5人），请稍后再试',
            queue_full: true,
            retry_after: 30
          });
        }
        waitQueue.push({ ip: clientIP, timestamp: now });
      }
      await env.NAI_KV.put('wait_queue', JSON.stringify(waitQueue), { expirationTtl: 300 });

      const position = waitQueue.findIndex(w => w.ip === clientIP) + 1;
      return jsonResponse(429, {
        error: `排队中，请等待前方用户`,
        queued: true,
        queue_position: position,
        queue_total: waitQueue.length,
        retry_after: 5
      });
    } else {
      waitQueue.shift();
      await env.NAI_KV.put('wait_queue', JSON.stringify(waitQueue), { expirationTtl: 300 });
    }
  }

  // Record IP usage (skip for admin)
  if (!isAdmin) {
    const timestamps = ipData?.timestamps?.filter(t => t > now - 3600000) || [];
    timestamps.push(now);
    await env.NAI_KV.put(ipKey, JSON.stringify({ timestamps }), { expirationTtl: 3600 });
  }

  // Submit to API
  return await submitToApi(apiKey, request, env, clientIP);
}

async function submitToApi(apiKey, request, env, clientIP) {
  try {
    const body = await request.text();
    const res = await fetch(`${NAI_API}/generate_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.text();

    if (res.ok && env?.NAI_KV) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.job_id) {
          await env.NAI_KV.put('active_job', JSON.stringify({
            jobId: parsed.job_id,
            startTime: Date.now(),
            ip: clientIP || 'unknown',
          }), { expirationTtl: 600 });
        }
      } catch (e) {}
    }

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return jsonResponse(502, { error: `代理请求失败: ${err.message}` });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
