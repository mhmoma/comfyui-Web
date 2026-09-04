import { proxyOnRequest } from "../_moved.js";

/** 同源代理 → tk 原 /api/admin/overview */
export async function onRequest(context) {
  return proxyOnRequest(context, "trade", "/api/admin/overview");
}
