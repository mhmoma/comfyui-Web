/**
 * 服务端拉取平台画图链，转成 data URL 返回给游戏前端。
 * 绕过浏览器 CORS（dzmm draw 图在 iframe/本地预览下无法直接 fetch）。
 */
const MAX_BYTES = 5_000_000;
const MAX_DATA_URL = 4_500_000;

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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function allowedUrl(raw) {
  const text = String(raw || "").trim();
  if (!/^https:\/\//i.test(text) || text.length > 4000) return "";
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

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchAsDataUrl(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "comfyui-web-image-proxy/1.0",
    },
  });
  if (!res.ok) {
    return { ok: false, error: "fetch_fail", message: `拉取图片失败 HTTP ${res.status}` };
  }
  const ctype = String(res.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ctype.startsWith("image/")) {
    return { ok: false, error: "not_image", message: "目标不是图片" };
  }
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) {
    return { ok: false, error: "empty", message: "图片为空" };
  }
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: "too_large", message: "图片过大，请换更小的图" };
  }
  const b64 = bytesToBase64(new Uint8Array(buf));
  const dataUrl = `data:${ctype};base64,${b64}`;
  if (dataUrl.length > MAX_DATA_URL) {
    return { ok: false, error: "too_large", message: "图片转存后过大，请换更小的图" };
  }
  return { ok: true, dataUrl, contentType: ctype, bytes: buf.byteLength };
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return corsPreflight();

  let url = "";
  if (request.method === "GET") {
    url = allowedUrl(new URL(request.url).searchParams.get("url"));
  } else if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    url = allowedUrl(body.url || body.imageUrl || body.src);
  } else {
    return json(405, { ok: false, error: "method", message: "不支持的方法" });
  }

  if (!url) {
    return json(400, { ok: false, error: "bad_url", message: "仅支持平台 HTTPS 图片地址" });
  }

  try {
    const result = await fetchAsDataUrl(url);
    if (!result.ok) return json(502, result);
    return json(200, result);
  } catch (err) {
    return json(502, {
      ok: false,
      error: "proxy_fail",
      message: err?.message || "图片代理失败",
    });
  }
}
