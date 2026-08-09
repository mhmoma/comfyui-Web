import {
  readCookie,
  normalizeCookie,
  ensureFreshCookie,
  refreshSessionCookie,
  loginWithPassword,
  sessionRemainSec,
  AUTH_REFRESH_SKEW,
  jsonResponse,
} from './_shared.js';

/**
 * POST { cookie?, email?, password?, force?, minRemain? }
 * - 默认懒续期（剩余 < 180s）
 * - force:true 强制走 /api/auth/token，失败可密码重登
 * Cookie 也可放请求头 X-Dzmm-Cookie
 */
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
    const email = body?.email || '';
    const password = body?.password || '';
    const force = body?.force === true || body?.force === 1 || body?.force === '1';

    if (force) {
      let result = await refreshSessionCookie(cookie);
      if (!result.ok && email && password) {
        const login = await loginWithPassword(email, password);
        if (login.ok) {
          return jsonResponse(200, {
            ok: true,
            cookie: login.cookie,
            remainSec: sessionRemainSec(login.cookie),
            refreshed: true,
            source: 'password',
          });
        }
        return jsonResponse(400, {
          ok: false,
          error: result.error || login.error || '强制续期失败',
          code: result.code || login.code || 'REFRESH_FAILED',
        });
      }
      if (!result.ok) {
        return jsonResponse(400, { ...result, refreshed: false });
      }
      return jsonResponse(200, {
        ok: true,
        cookie: result.cookie,
        remainSec: result.remainSec,
        refreshed: true,
        source: result.source || 'token',
      });
    }

    const result = await ensureFreshCookie(cookie, {
      email,
      password,
      minRemain: Number(body?.minRemain) || 60,
    });
    return jsonResponse(result.ok ? 200 : 400, result);
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}

export async function onRequestGet(context) {
  try {
    const cookie = normalizeCookie(readCookie(context.request) || '');
    const remainSec = sessionRemainSec(cookie);
    return jsonResponse(200, {
      ok: true,
      hasCookie: Boolean(cookie),
      remainSec,
      skew: AUTH_REFRESH_SKEW,
      hint: 'POST 此接口可懒续期 / 强制续期',
    });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
