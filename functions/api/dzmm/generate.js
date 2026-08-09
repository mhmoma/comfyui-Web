import {
  readCookie,
  normalizeCookie,
  ensureFreshCookie,
  generate,
  jsonResponse,
} from './_shared.js';

export async function onRequestPost(context) {
  try {
    let body = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }
    const cookie = normalizeCookie(
      readCookie(context.request) || body?.cookie || ''
    );
    if (!cookie) {
      return jsonResponse(401, {
        ok: false,
        error: '请先在设置中配置 DZMM Cookie（仅保存在本机浏览器）',
        code: 'NO_COOKIE',
      });
    }

    const {
      cookie: _ignored,
      email,
      password,
      ...rest
    } = body || {};

    const auth = await ensureFreshCookie(cookie, {
      email: email || '',
      password: password || '',
      minRemain: 60,
    });
    if (!auth.ok) {
      return jsonResponse(400, auth);
    }

    const result = await generate(auth.cookie, rest);
    if (auth.refreshed || auth.cookie !== cookie) {
      result.cookie = auth.cookie;
      result.authRefreshed = true;
      result.remainSec = auth.remainSec;
      result.authSource = auth.source;
    } else if (auth.remainSec != null) {
      result.remainSec = auth.remainSec;
    }
    // 勿用 HTTP 502：自定义域名会被 Cloudflare 盖成纯文本 error code:502
    return jsonResponse(result.ok ? 200 : 400, result);
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
