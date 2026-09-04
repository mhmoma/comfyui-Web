import { movedOnRequest } from "../_moved.js";
export async function onRequest(context) {
  return movedOnRequest(context, "session");
}
