const NAI_API = 'https://api.idlecloud.cc/api';
const COOLDOWN_MS = 25000;
const MAX_PER_IP_HOUR = 10;

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';

  // IP rate limiting via KV
  if (env.NAI_KV) {
    const ipKey = `ip:${clientIP}`;
    const ipData = await env.NAI_KV.get(ipKey, { type: 'json' });
    const now = Date.now();

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

    // Check global cooldown
    const lastReq = await env.NAI_KV.get('last_request_time');
    if (lastReq && now - parseInt(lastReq) < COOLDOWN_MS) {
      const waitSec = Math.ceil((parseInt(lastReq) + COOLDOWN_MS - now) / 1000);
      return jsonResponse(429, {
        error: `当前有人在使用，请等待 ${waitSec} 秒后重试`,
        retry_after: waitSec
      });
    }

    // Record this request
    await env.NAI_KV.put('last_request_time', now.toString(), { expirationTtl: 60 });

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
