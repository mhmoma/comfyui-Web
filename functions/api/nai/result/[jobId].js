const NAI_API = 'https://api.idlecloud.cc/api';

export async function onRequestGet(context) {
  const { env, params } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const rawJobId = params.jobId;
  if (!rawJobId) {
    return jsonResponse(400, { error: '缺少 jobId' });
  }
  const jobId = decodeURIComponent(rawJobId);

  try {
    const res = await fetch(`${NAI_API}/get_result/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (res.status >= 500) {
      return jsonResponse(200, { status: 'processing', _note: `upstream ${res.status}` });
    }

    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return jsonResponse(200, { status: 'processing', _note: `fetch error: ${err.message}` });
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
