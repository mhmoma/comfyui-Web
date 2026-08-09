import { normalizeCookie, isCompleteDzmmCookie, jsonResponse } from './_shared.js';

/**
 * Compatibility endpoint. Does NOT persist cookie on Cloudflare.
 * Client must keep credentials in localStorage and send X-Dzmm-Cookie.
 */
export async function onRequestPost(context) {
  try {
    let cookie = '';
    try {
      const body = await context.request.json();
      cookie = normalizeCookie(body?.cookie || '');
    } catch {
      cookie = '';
    }
    const complete = isCompleteDzmmCookie(cookie);
    return jsonResponse(200, {
      ok: complete || !cookie,
      hasCookie: Boolean(cookie),
      cookieComplete: complete,
      acceptedLocally: complete,
      stored: false,
      storage: 'client-only',
      message: complete
        ? '已识别完整 Cookie 字段（仅保存在浏览器本地）'
        : cookie
          ? 'Cookie 字段不完整，请粘贴完整的 sb-rls-auth-token（或全部 .0/.1/.2）'
          : '凭证仅保存在浏览器本地，服务端不落盘',
      error: cookie && !complete
        ? 'Cookie 字段不完整，请粘贴完整的 sb-rls-auth-token（或全部 .0/.1/.2）'
        : undefined,
    });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
