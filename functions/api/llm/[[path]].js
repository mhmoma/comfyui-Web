/**
 * 角色卡生成 · LLM 上游代理（同域 /api/llm/*）
 * 浏览器把 baseUrl / apiKey 放进请求体，由 CF 转发，规避 CORS。
 * 仅代理 chat / chat/stream / models / test；configs 由前端 localStorage 处理。
 */

const ALLOWED = new Set(["chat", "chat/stream", "models", "test"]);

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : "/" + path;
  return b + p;
}

function isMaskKey(key) {
  if (!key) return false;
  return [...String(key)].every((ch) => ch === "•" || ch === "*" || ch === "·");
}

function extractModels(payload) {
  const models = [];
  const data = (payload && (payload.data || payload.models)) || [];
  if (Array.isArray(data)) {
    for (const m of data) {
      if (typeof m === "string") models.push(m);
      else if (m && (m.id || m.name)) models.push(String(m.id || m.name));
    }
  }
  return [...new Set(models)];
}

function extractContent(payload) {
  try {
    return payload.choices[0].message.content;
  } catch {
    return typeof payload?.content === "string" ? payload.content : null;
  }
}

function resolvePath(params) {
  const p = params?.path;
  if (!p) return "";
  return Array.isArray(p) ? p.join("/") : String(p);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function onRequest(context) {
  const { request, params } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Card-Proxy",
      },
    });
  }

  const sub = resolvePath(params);
  if (!ALLOWED.has(sub)) {
    return json(404, { ok: false, error: "未知 LLM 路径" });
  }
  if (request.method !== "POST") {
    return json(405, { ok: false, error: "仅支持 POST" });
  }

  const body = await readJson(request);
  const baseUrl = String(body.baseUrl || "").trim();
  const apiKey = String(body.apiKey || "");
  const selectedModel = body.selectedModel || "gpt-3.5-turbo";

  if (!baseUrl) {
    return json(400, { ok: false, error: "缺少 baseUrl" });
  }
  if (!/^https?:\/\//i.test(baseUrl)) {
    return json(400, { ok: false, error: "baseUrl 必须是 http(s) URL" });
  }

  const headers = {
    Accept: "application/json",
    "User-Agent": "comfyui-web-card-llm-proxy/1.0",
  };
  if (apiKey && !isMaskKey(apiKey)) {
    headers.Authorization = "Bearer " + apiKey;
  }

  try {
    if (sub === "models" || sub === "test") {
      const modelsUrl = joinUrl(baseUrl, "/models");
      const res = await fetch(modelsUrl, { method: "GET", headers });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        const models = extractModels(payload);
        if (sub === "models") {
          if (!models.length) {
            return json(502, { ok: false, error: "无法解析模型列表" });
          }
          return json(200, { ok: true, models });
        }
        return json(200, { ok: true, model: selectedModel || models[0] || "" });
      }
      if (sub === "test") {
        // fallback short chat
        const chatUrl = joinUrl(baseUrl, "/chat/completions");
        const chatRes = await fetch(chatUrl, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 8,
            stream: false,
          }),
        });
        if (!chatRes.ok) {
          const t = await chatRes.text();
          return json(400, { ok: false, error: "连通失败: " + t.slice(0, 200) });
        }
        return json(200, { ok: true, model: selectedModel || "" });
      }
      return json(400, {
        ok: false,
        error: "上游 " + res.status + ": " + JSON.stringify(payload).slice(0, 200),
      });
    }

    const stream = sub === "chat/stream";
    const options = body.options || {};
    const chatBody = {
      model: selectedModel,
      messages: body.messages || [],
      stream,
    };
    if (options.temperature != null) chatBody.temperature = options.temperature;
    if (options.max_tokens) chatBody.max_tokens = parseInt(options.max_tokens, 10);
    else if (body.maxTokens) chatBody.max_tokens = parseInt(body.maxTokens, 10);

    const chatUrl = joinUrl(baseUrl, "/chat/completions");
    const upstream = await fetch(chatUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(chatBody),
    });

    if (stream) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg =
        payload.error?.message || payload.error || JSON.stringify(payload).slice(0, 200);
      return json(upstream.status >= 400 ? upstream.status : 502, {
        ok: false,
        error: "上游 " + upstream.status + ": " + msg,
      });
    }
    const content = extractContent(payload);
    if (content == null) {
      return json(502, { ok: false, error: "上游无 content" });
    }
    return json(200, { ok: true, content });
  } catch (e) {
    return json(502, { ok: false, error: "代理失败: " + (e.message || String(e)) });
  }
}
