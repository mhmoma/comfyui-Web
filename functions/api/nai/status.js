const NAI_API = 'https://api.idlecloud.cc/api';

function log(tag, ...args) {
  console.log(`[NAI-Status][${tag}]`, ...args);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const apiKey = env.NAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, { error: '服务器未配置 API Key' });
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');
  if (!jobId) {
    return jsonResponse(400, { error: '缺少 id 参数' });
  }

  const fetchStart = Date.now();
  try {
    const res = await fetch(`${NAI_API}/get_result/${encodeURIComponent(jobId)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const fetchDuration = Date.now() - fetchStart;

    const data = await res.text();
    let parsed;
    try { parsed = JSON.parse(data); } catch (e) { parsed = {}; }

    if (res.status >= 500 || res.status === 404) {
      log('UPSTREAM_ERR', `job_id=${jobId}, upstream_status=${res.status}, fetchDuration=${fetchDuration}ms, body=${data.substring(0, 500)}`);
      return jsonResponse(200, {
        status: 'processing',
        _upstream_status: res.status,
        _upstream_body: data.substring(0, 500),
        _note: `upstream ${res.status}`,
        _fetchDuration: fetchDuration,
      });
    }

    log('POLL', `job_id=${jobId}, status=${parsed.status || 'unknown'}, upstream_http=${res.status}, fetchDuration=${fetchDuration}ms, has_video_url=${!!parsed.video_url}, has_image_url=${!!parsed.image_url}, has_error=${!!parsed.error}`);

    if (parsed.status === 'failed') {
      log('JOB_FAILED', `job_id=${jobId}, error=${parsed.error}, full=${data.substring(0, 500)}`);
    }

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    const fetchDuration = Date.now() - fetchStart;
    log('FETCH_EXCEPTION', `job_id=${jobId}, error=${err.message}, fetchDuration=${fetchDuration}ms`);
    return jsonResponse(200, {
      status: 'processing',
      _note: `fetch error: ${err.message}`,
      _error_type: err.constructor.name,
      _fetchDuration: fetchDuration,
    });
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
