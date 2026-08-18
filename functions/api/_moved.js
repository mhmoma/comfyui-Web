/**
 * comfyui-web is the asset library only.
 * Session/trade APIs used to live here as leftovers — return 410, never touch D1.
 */
const SESSION = "https://tk-game-cloud-6og.pages.dev";
const TRADE = "https://tk-game-cloud.pages.dev";

const cors = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function movedOnRequest(context, kind) {
  const request = context?.request;
  if (request && String(request.method || "").toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  const use = kind === "trade" ? TRADE : SESSION;
  return new Response(
    JSON.stringify({
      ok: false,
      error: "moved",
      message: `this API lives on ${use}`,
      use,
    }),
    { status: 410, headers: cors }
  );
}
