import {
  loginWithPassword,
  startTelegramLogin,
  pollTelegramLogin,
  listLoginMethods,
  jsonResponse,
} from './_shared.js';

/**
 * GET → 返回官网支持的登录方式列表
 * POST →
 *   { method:'password', email, password }
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
