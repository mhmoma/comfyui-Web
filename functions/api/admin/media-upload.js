/**
 * Same-origin proxy: admin UI → comfyui-web → tk-game-cloud R2 upload.
 * Avoids browser Failed to fetch when tk-game-cloud.pages.dev is blocked/unreachable.
 */
import { checkAdmin, corsPreflight, json } from "../articles/_shared.js";

const DEFAULT_CLOUD = "https://tk-game-cloud-6og.pages.dev";

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_KEY) {
    return json(503, { ok: false, error: "no_admin_key", message: "未配置 ADMIN_KEY" });
  }
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: "forbid", message: "管理密钥错误" });
  }

  const cloudBase = String(env.CLOUD_BASE || DEFAULT_CLOUD).replace(/\/$/, "");
  const adminKey = request.headers.get("x-admin-key") || "";
  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch (_) {
    return json(400, { ok: false, error: "bad_body", message: "无法读取上传内容" });
  }
  if (!bodyText) {
    return json(400, { ok: false, error: "empty_body", message: "上传内容为空" });
  }

  let upstream;
  try {
    upstream = await fetch(`${cloudBase}/api/admin/media-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: bodyText,
    });
  } catch (err) {
    return json(502, {
      ok: false,
      error: "cloud_unreachable",
      message: `素材站无法转发到游戏云端：${err?.message || err}`,
    });
  }

  const text = await upstream.text();
  return new Response(text || JSON.stringify({ ok: false, error: "empty_upstream" }), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    },
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return onRequestOptions();
  if (request.method === "POST") return onRequestPost(context);
  return json(405, { ok: false, error: "method" });
}
