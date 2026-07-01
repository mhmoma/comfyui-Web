const NAI_API = 'https://api.idlecloud.cc/api';
const MAX_PER_IP_HOUR = 10;
const JOB_TIMEOUT_MS = 300000;

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';

  if (env.NAI_KV) {
    const now = Date.now();

    // Check if there's an active job still running
    const activeJobData = await env.NAI_KV.get('active_job', { type: 'json' });
    if (activeJobData) {
      const elapsed = now - activeJobData.startTime;
      if (elapsed < JOB_TIMEOUT_MS) {
        // Check actual job status from API
        try {
          const statusRes = await fetch(`${NAI_API}/get_result/${activeJobData.jobId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'queued' || statusData.status === 'processing') {
              const waitSec = Math.ceil((JOB_TIMEOUT_MS - elapsed) / 1000);
              return jsonResponse(429, {
                error: `当前有任务正在生成中，请稍后再试`,
                retry_after: Math.min(waitSec, 15),
                status: statusData.status
              });
            }
          }
          // Job completed/failed, clear it
          await env.NAI_KV.delete('active_job');
        } catch (e) {
          // Can't check status, allow the request if job is old enough (>60s)
          if (elapsed < 60000) {
            return jsonResponse(429, {
              error: '当前有任务可能正在进行中，请等待约 15 秒后重试',
              retry_after: 15
            });
          }
          await env.NAI_KV.delete('active_job');
        }
      } else {
        await env.NAI_KV.delete('active_job');
      }
    }

    // IP rate limiting
    const ipKey = `ip:${clientIP}`;
    const ipData = await env.NAI_KV.get(ipKey, { type: 'json' });
    if (ipData) {
      const hourAgo = now - 3600000;
      const recentRequests = (ipData.timestamps || []).filter(t => t > hourAgo);
      if (recentRequests.length >= MAX_PER_IP_HOUR) {
        return jsonResponse(429, {
          error: `每小时最多 ${MAX_PER_IP_HOUR} 次请求，请稍后再试`,
          retry_after: Math.ceil((recentRequests[0] + 3600000 - now) / 1000)
        });
      }
    }

    // Record IP usage
    const timestamps = ipData?.timestamps?.filter(t => t > now - 3600000) || [];
    timestamps.push(now);
    await env.NAI_KV.put(ipKey, JSON.stringify({ timestamps }), { expirationTtl: 3600 });
  }

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
    const parsed = JSON.parse(data);

    // Record active job if submission succeeded
    if (res.ok && parsed.job_id && env.NAI_KV) {
      await env.NAI_KV.put('active_job', JSON.stringify({
        jobId: parsed.job_id,
        startTime: Date.now(),
        ip: clientIP,
      }), { expirationTtl: 600 });
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
      'Access-Control-Allow-Headers': 'Content-Type',
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
