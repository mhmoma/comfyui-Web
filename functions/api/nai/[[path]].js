const NAI_API = 'https://api.idlecloud.cc/api';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const subpath = params.path;
  if (!subpath || !subpath.startsWith('result/')) {
    return jsonResponse(400, { error: '无效的请求路径' });
  }

  const jobId = subpath.replace('result/', '');

  try {
    const res = await fetch(`${NAI_API}/get_result/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
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
    return jsonResponse(502, { error: `查询失败: ${err.message}` });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
