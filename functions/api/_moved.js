/**
 * Same-origin reverse proxy for leftover session/trade paths on comfyui-web.
 * Admin UI on tomkk.xyz → this host → 6og / tk 原，避免浏览器直连 *.pages.dev 被 CORS/断连掐死。
 * Never touches local D1 for these routes.
 */
const SESSION = "https://tk-game-cloud-6og.pages.dev";
const TRADE = "https://tk-game-cloud.pages.dev";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });
}

export async function movedOnRequest(context, kind) {
  const request = context?.request;
  if (!request) return json(500, { ok: false, error: "no_request" });

  if (String(request.method || "").toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...cors, "Access-Control-Max-Age": "86400" },
    });
  }

  const base = (kind === "trade" ? TRADE : SESSION).replace(/\/$/, "");
  const src = new URL(request.url);
  const dest = `${base}${src.pathname}${src.search}`;

  const headers = new Headers();
  for (const name of ["content-type", "x-admin-key", "x-user-id", "authorization", "accept"]) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }

  const init = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(dest, init);
  } catch (err) {
    return json(502, {
      ok: false,
      error: "upstream_unreachable",
      message: `无法转发到 ${base}：${err?.message || err}`,
      use: base,
    });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
      ...cors,
    },
  });
}
