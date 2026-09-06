/**
 * Same-origin reverse proxy for leftover session/trade paths on comfyui-web.
 * Admin UI on tomkk.xyz → this host → 6og / tk 原，避免浏览器直连 *.pages.dev 被 CORS/断连掐死。
 * Never touches local D1 for these routes.
 */
const SESSION = "https://tk-game-cloud-6og.pages.dev";
const TRADE = "https://tk-contest-ckm.pages.dev";

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

/**
 * @param {string} kind "session" | "trade"
 * @param {string} [pathnameOverride] upstream path, e.g. /api/admin/overview
 */
export async function proxyOnRequest(context, kind, pathnameOverride) {
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
  const path = pathnameOverride || src.pathname;
  const dest = `${base}${path}${src.search}`;

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

  const ct = String(upstream.headers.get("Content-Type") || "");
  const buf = await upstream.arrayBuffer();
  // 上游 Worker 崩溃时常回 HTML/空壳，转成可读 JSON，避免运营台只看到裸 500
  if (upstream.status >= 500 && !/json/i.test(ct)) {
    const preview = new TextDecoder().decode(buf).replace(/\s+/g, " ").trim().slice(0, 240);
    return json(upstream.status, {
      ok: false,
      error: "upstream_http_error",
      message: preview || `上游 ${base} 返回 HTTP ${upstream.status}`,
      use: dest,
      status: upstream.status,
    });
  }

  return new Response(buf, {
    status: upstream.status,
    headers: {
      "Content-Type": ct || "application/json; charset=utf-8",
      ...cors,
    },
  });
}

export async function movedOnRequest(context, kind) {
  return proxyOnRequest(context, kind);
}
