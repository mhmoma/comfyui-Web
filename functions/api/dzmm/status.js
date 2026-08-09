import {
  readCookie,
  normalizeCookie,
  ensureFreshCookie,
  getStatus,
  sessionRemainSec,
  jsonResponse,
} from './_shared.js';

export async function onRequestGet(context) {
  try {
    let cookie = normalizeCookie(readCookie(context.request) || '');
    let authMeta = null;
    if (cookie) {
      // 状态查询：仅 token 续期，不走密码（GET 不宜带密）
      const auth = await ensureFreshCookie(cookie, { minRemain: 0 });
      if (auth.ok) {
        cookie = auth.cookie;
        authMeta = {
          remainSec: auth.remainSec,
          authRefreshed: !!auth.refreshed,
          authSource: auth.source,
        };
        if (auth.refreshed) authMeta.cookie = auth.cookie;
      } else {
        authMeta = {
          remainSec: sessionRemainSec(cookie),
          authWarning: auth.error,
        };
      }
    }
    const status = await getStatus(cookie);
    if (authMeta) Object.assign(status, authMeta);
    else if (cookie) status.remainSec = sessionRemainSec(cookie);
    return jsonResponse(200, status);
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
