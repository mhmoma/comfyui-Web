/**
 * 浏览器直连 Google Translate 会被 CORS 拦住（如 tomkk.xyz）。
 * 本接口在边缘代发翻译请求。
 *
 * POST { text, provider?: "google"|"mymemory" }
 * → { ok: true, text: "..." }
 */
const MAX_CHARS = 1800;

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extra,
  };
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json; charset=utf-8" }),
  });
}

async function translateGoogle(text) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=" +
    encodeURIComponent(text);
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 ComfyUI-Web-Translate" },
  });
  if (!resp.ok) throw new Error(`google ${resp.status}`);
  const data = await resp.json();
  return (data[0] || []).map((s) => s[0]).join("");
}

async function translateMyMemory(text) {
  const lines = String(text).split("\n").slice(0, 12);
  const out = [];
  for (const line of lines) {
    const q = line.trim();
    if (!q) {
      out.push("");
      continue;
    }
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(q.slice(0, 450)) +
      "&langpair=en|zh-CN";
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        out.push(q);
        continue;
      }
      const data = await resp.json();
      out.push(data.responseData?.translatedText || q);
    } catch (_) {
      out.push(q);
    }
  }
  return out.join("\n");
}

async function handle(request) {
  let text = "";
  let provider = "google";

  if (request.method === "GET") {
    const u = new URL(request.url);
    text = u.searchParams.get("q") || u.searchParams.get("text") || "";
    provider = (u.searchParams.get("provider") || "google").toLowerCase();
  } else {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "invalid_json" });
    }
    text = body.text || body.q || "";
    provider = String(body.provider || "google").toLowerCase();
  }

  text = String(text || "").replace(/\r/g, "").slice(0, MAX_CHARS);
  if (!text.trim()) return json(400, { ok: false, error: "empty_text" });

  const order =
    provider === "mymemory" ? ["mymemory", "google"] : ["google", "mymemory"];

  let lastErr = null;
  for (const p of order) {
    try {
      const translated =
        p === "mymemory" ? await translateMyMemory(text) : await translateGoogle(text);
      if (translated != null && String(translated).length) {
        return json(200, { ok: true, text: String(translated), provider: p });
      }
    } catch (e) {
      lastErr = e;
    }
  }

  return json(502, {
    ok: false,
    error: "translate_failed",
    detail: String(lastErr?.message || lastErr || ""),
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }
  try {
    return await handle(request);
  } catch (e) {
    return json(500, { ok: false, error: "server_error", detail: String(e?.message || e) });
  }
}
