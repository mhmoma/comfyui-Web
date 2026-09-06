import { movedOnRequest } from "../_moved.js";
/** Proxy → 6og /api/admin/mud-codes（画泥充值码） */
export async function onRequest(context) {
  return movedOnRequest(context, "session");
}
