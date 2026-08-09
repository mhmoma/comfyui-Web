import {
  readCookie,
  normalizeCookie,
  ensureFreshCookie,
  pollTask,
  jsonResponse,
} from './_shared.js';

export async function onRequestGet(context) {
  try {
    const cookie = normalizeCookie(readCookie(context.request) || '');
    if (!cookie) {
      return jsonResponse(401, {
        ok: false,
        error: '请先在设置中配置 DZMM Cookie（仅保存在本机浏览器）',
        code: 'NO_COOKIE',
      });
    }
    const url = new URL(context.request.url);
    const query = Object.fromEntries(url.searchParams.entries());

    // 仅 token 续期，不在 query 带密码
    const auth = await ensureFreshCookie(cookie, { minRemain: 60 });
    if (!auth.ok) {
      return jsonResponse(400, auth);
    }

    const result = await pollTask(auth.cookie, query);
    if (auth.refreshed || auth.cookie !== cookie) {
      result.cookie = auth.cookie;
      result.authRefreshed = true;
      result.remainSec = auth.remainSec;
    } else if (auth.remainSec != null) {
      result.remainSec = auth.remainSec;
    }
    const pending = ['pending', 'processing', 'queued'].includes(result.status);
    return jsonResponse(result.ok || pending ? 200 : 400, result);
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
