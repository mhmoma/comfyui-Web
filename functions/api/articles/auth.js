import { json, corsPreflight, getAdminContext } from './_shared.js';

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) {
    return json(503, { error: '服务端未配置 ADMIN_KEY，请在 Cloudflare 环境变量中设置' });
  }

  const ctx = await getAdminContext(request, env);
  if (!ctx) {
    return json(403, { error: '管理密钥错误' });
  }

  return json(200, {
    ok: true,
    role: ctx.role,
    name: ctx.name,
  });
}
