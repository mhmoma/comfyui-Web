import { loginWithPassword, jsonResponse } from './_shared.js';

/**
 * POST { email, password } → 代理 dzmm.ai 登录，返回完整 cookie（不落盘）。
 */
export async function onRequestPost(context) {
  try {
    let body = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }
    const result = await loginWithPassword(body?.email || '', body?.password || '');
    return jsonResponse(result.ok ? 200 : 400, result);
  } catch (e) {
    return jsonResponse(500, { ok: false, error: String(e.message || e) });
  }
}
