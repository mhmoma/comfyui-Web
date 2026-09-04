import { proxyOnRequest } from "../_moved.js";

/** 同源代理 → 6og /api/admin/overview（避开与素材站同名 overview） */
export async function onRequest(context) {
  return proxyOnRequest(context, "session", "/api/admin/overview");
}
