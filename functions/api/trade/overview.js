import { proxyOnRequest } from "../_moved.js";

/** 同源代理 → 比赛服 /api/admin/overview */
export async function onRequest(context) {
  return proxyOnRequest(context, "trade", "/api/admin/overview");
}
