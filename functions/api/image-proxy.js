/**
 * 服务端拉取平台画图链。
 * - 默认：直接回传图片二进制（带 CORS）
 * - format=dataurl：兼容旧调用，返回 JSON { dataUrl }
 */
const MAX_BYTES = 8_000_000;

const ALLOW_SUFFIXES = [
  "dzmm.ai",
  "dzmm.io",
  "aifukk.com",
  "fuckaibot.com",
  "thottai.com",
  "aicbnv.com",
  "aikda.com",
  "ainvmei.com",
  "girlloveai.com",
  "meimoaidao.com",
  "loreveil.xyz",
  "museloom.xyz",
  "echolore.xyz",
];

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
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function allowedUrl(raw) {
  const text = String(raw || "").trim();
  if (!/^https:\/\//i.test(text) || text.length > 8000) return "";
  try {
    const u = new URL(text);
    const host = (u.hostname || "").toLowerCase();
    if (!host) return "";
    if (!ALLOW_SUFFIXES.some((s) => host === s || host.endsWith("." + s))) return "";
    return text;
  } catch (_) {
    return "";
  }
}

async function fetchImage(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; tk-image-proxy/2.0)",
      Referer: "https://www.dzmm.ai/",
    },
  });
  if (!res.ok) {
    return { ok: false, error: "fetch_fail", message: `拉取图片失败 HTTP ${res.status}`, status: res.status };
  }
  const ctype = String(res.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ctype.startsWith("image/")) {
    return { ok: false, error: "not_image", message: `目标不是图片 (${ctype || "unknown"})` };
  }
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) {
    return { ok: false, error: "empty", message: "图片为空" };
  }
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: "too_large", message: "图片过大" };
  }
  return { ok: true, buf, contentType: ctype, bytes: buf.byteLength };
}

function bytesToBase64(bytes) {
  const chunk = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    parts.push(String.fromCharCode.apply(null, slice));
  }
  return btoa(parts.join(""));
}

async function parseRequest(request) {
  const urlObj = new URL(request.url);
  let target = "";
  let wantDataUrl = false;
  if (request.method === "GET") {
    target = allowedUrl(urlObj.searchParams.get("url"));
    wantDataUrl = urlObj.searchParams.get("format") === "dataurl";
  } else if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return { error: json(400, { ok: false, error: "bad_json", message: "请求体无效" }) };
    }
    target = allowedUrl(body.url || body.imageUrl || body.src);
    wantDataUrl = body.format === "dataurl" || body.dataUrl === true;
  } else {
    return { error: json(405, { ok: false, error: "method", message: "不支持的方法" }) };
  }
  if (!target) {
    return { error: json(400, { ok: false, error: "bad_url", message: "仅支持平台 HTTPS 图片地址" }) };
  }
  return { target, wantDataUrl };
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return corsPreflight();

  try {
    const parsed = await parseRequest(request);
    if (parsed.error) return parsed.error;

    const result = await fetchImage(parsed.target);
    if (!result.ok) return json(502, result);

    if (parsed.wantDataUrl) {
      const b64 = bytesToBase64(new Uint8Array(result.buf));
      const dataUrl = `data:${result.contentType};base64,${b64}`;
      if (dataUrl.length > 6_000_000) {
        return json(502, { ok: false, error: "too_large", message: "图片转存后过大" });
      }
      return json(200, {
        ok: true,
        dataUrl,
        contentType: result.contentType,
        bytes: result.bytes,
      });
    }

    return new Response(result.buf, {
      status: 200,
      headers: corsHeaders({
        "Content-Type": result.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=60",
      }),
    });
  } catch (err) {
    return json(502, {
      ok: false,
      error: "proxy_fail",
      message: err?.message || "图片代理失败",
    });
  }
}
