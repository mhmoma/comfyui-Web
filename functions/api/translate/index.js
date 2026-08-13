/**
 * 标签翻译代理：避开游戏 iframe（origin null）直连外网 CORS。
 * POST { text: "line1\\nline2" } → { ok, text }
 */
const MAX_Q = 1800;

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

async function translateGoogle(text) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", "User-Agent": "tk-game-cloud-translate/1.0" },
  });
  if (!resp.ok) {
    const err = new Error(`upstream_${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  return (data[0] || []).map((s) => s[0]).join("");
}

async function translateMyMemory(text) {
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const out = [];
  for (const line of lines) {
    try {
      const resp = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(line)}&langpair=en|zh-CN`,
        { headers: { Accept: "application/json" } }
      );
      if (!resp.ok) {
        out.push(line);
        continue;
      }
      const data = await resp.json();
      out.push(String(data?.responseData?.translatedText || line));
    } catch (_) {
      out.push(line);
    }
  }
  return out.join("\n");
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "POST" && request.method !== "GET") {
    return json(405, { ok: false, error: "method" });
  }

  let text = "";
  if (request.method === "GET") {
    text = String(new URL(request.url).searchParams.get("q") || "");
  } else {
    try {
      const body = await request.json();
      text = String(body?.text ?? body?.q ?? "");
    } catch (_) {
      return json(400, { ok: false, error: "bad_json" });
    }
  }
  text = text.replace(/\r/g, "").trim().slice(0, MAX_Q);
  if (!text) return json(400, { ok: false, error: "empty" });

  try {
    const out = await translateGoogle(text);
    return json(200, { ok: true, text: out, via: "google" });
  } catch (err) {
    try {
      const out = await translateMyMemory(text);
      return json(200, { ok: true, text: out, via: "mymemory" });
    } catch (err2) {
      return json(502, {
        ok: false,
        error: String(err?.message || "upstream_fail"),
        message: String(err2?.message || ""),
      });
    }
  }
}
