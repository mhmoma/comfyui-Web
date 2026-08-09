import {
  loginWithPassword,
  startTelegramLogin,
  pollTelegramLogin,
  listLoginMethods,
  ensureFreshCookie,
  refreshSessionCookie,
  readCookie,
  normalizeCookie,
  sessionRemainSec,
  jsonResponse,
} from './_shared.js';

/**
 * GET → 返回官网支持的登录方式列表
 * POST →
 *   { method:'password', email, password }
 *   { method:'ensure', cookie?, email?, password?, minRemain? } 懒续期
 *   { method:'refresh', cookie?, email?, password? } 强制续期
 *   { method:'telegram-start' }
 *   { method:'telegram-poll', signInCode }
 */
export async function onRequestGet() {
  return jsonResponse(200, {
    ok: true,
    methods: listLoginMethods(),
  });
}

export async function onRequestPost(context) {
  try {
    let body = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }

    const method = String(body?.method || 'password').trim();

    if (method === 'password' || method === 'email') {
      const result = await loginWithPassword(body?.email || '', body?.password || '');
      return jsonResponse(result.ok ? 200 : 400, { ...result, method: 'password' });
    }

    if (method === 'ensure') {
      const cookie = normalizeCookie(
        readCookie(context.request) || body?.cookie || ''
      );
      const result = await ensureFreshCookie(cookie, {
        email: body?.email || '',
        password: body?.password || '',
        minRemain: Number(body?.minRemain) || 60,
      });
      return jsonResponse(result.ok ? 200 : 400, { ...result, method: 'ensure' });
    }

    if (method === 'refresh') {
      const cookie = normalizeCookie(
        readCookie(context.request) || body?.cookie || ''
      );
      const result = await refreshSessionCookie(cookie);
      if (!result.ok && body?.email && body?.password) {
        const login = await loginWithPassword(body.email, body.password);
        if (login.ok) {
          return jsonResponse(200, {
            ok: true,
            cookie: login.cookie,
            remainSec: sessionRemainSec(login.cookie),
            refreshed: true,
            source: 'password',
            method: 'refresh',
          });
        }
        return jsonResponse(400, {
          ok: false,
          error: result.error || login.error || '续期失败',
          code: result.code || login.code,
          method: 'refresh',
        });
      }
      return jsonResponse(result.ok ? 200 : 400, {
        ...result,
        refreshed: !!result.ok,
        method: 'refresh',
      });
    }

    if (method === 'telegram-start' || method === 'telegram_start') {
      const result = await startTelegramLogin();
      return jsonResponse(result.ok ? 200 : 400, { ...result, method: 'telegram' });
    }

    if (method === 'telegram-poll' || method === 'telegram_poll') {
      const result = await pollTelegramLogin(body?.signInCode || body?.code || '');
      const http =
        result.ok || result.status === 'waiting_confirmation' ? 200 : 400;
      return jsonResponse(http, { ...result, method: 'telegram' });
    }

    return jsonResponse(400, {
      ok: false,
      error: `不支持的 method: ${method}`,
      methods: listLoginMethods(),
    });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
