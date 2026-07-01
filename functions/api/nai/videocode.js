export async function onRequestPost(context) {
  const { request, env } = context;

  const adminKey = request.headers.get('x-admin-key');
  const isAdmin = adminKey && env.ADMIN_KEY && adminKey === env.ADMIN_KEY;

  if (!isAdmin) {
    return jsonResponse(403, { error: '无权限' });
  }

  if (!env.NAI_KV) {
    return jsonResponse(500, { error: 'KV 未配置' });
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.min(parseInt(body.count) || 1, 20);
  const ttlHours = parseInt(body.ttl_hours) || 24;

  const codes = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let code = 'VID-';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const kvKey = `vcode:${code}`;
    await env.NAI_KV.put(kvKey, JSON.stringify({
      created: Date.now(),
      used: false,
    }), { expirationTtl: ttlHours * 3600 });
    codes.push(code);
  }

  return jsonResponse(200, { codes, ttl_hours: ttlHours, count: codes.length });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code || !env.NAI_KV) {
    return jsonResponse(400, { error: '缺少参数' });
  }

  const kvKey = `vcode:${code.toUpperCase()}`;
  const data = await env.NAI_KV.get(kvKey, { type: 'json' });

  if (!data) {
    return jsonResponse(404, { valid: false, error: '视频码无效或已过期' });
  }
  if (data.used) {
    return jsonResponse(410, { valid: false, error: '视频码已被使用' });
  }

  return jsonResponse(200, { valid: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
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
