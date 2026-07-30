/**
 * 角色卡生成 · 同域 API Mock
 * - 卡片/用户/公告等：localStorage（仅 /card 页拦截）
 * - LLM configs：localStorage
 * - LLM chat/models/test：默认走同域 Cloudflare /api/llm/* 代理（规避 CORS）
 */
(function () {
  if (!location.pathname.startsWith("/card")) return;

  // 生产同域部署默认走 CF LLM 代理；本地纯静态调试可设 false
  if (typeof window.__CARD_USE_LLM_PROXY === "undefined") {
    window.__CARD_USE_LLM_PROXY = true;
  }

  // 必须在替换 window.fetch 之前保存原生 fetch；
  // 勿挂到旧 fetch 上再覆盖 —— 否则 fetch.__cardRaw 会丢失
  const rawFetch = window.fetch.bind(window);

  const STORE_KEY = "card_portal_state_v1";
  const LS_CONFIGS = "st_api_configs";

  const DEFAULT = {
    user: {
      id: "local-user",
      username: "creator",
      email: "creator@local",
      nickname: "创作者",
      avatar: "",
      created_at: "2026-07-30 00:00:00",
    },
    cards: [],
    deleted_cards: [],
    data: {
      st_user_custom_name: "创作者",
      world_setting: "",
      usage_stats: { days: {}, totalCalls: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 },
      generation_history: [],
      draft_card: {},
      user_settings: {
        jailbreak_enabled: "false",
        display_name: "创作者",
        world_setting: "",
        theme: "dark",
        card_format: "v2",
      },
    },
    announcements: [],
  };

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!raw || typeof raw !== "object") return structuredClone(DEFAULT);
      return {
        ...structuredClone(DEFAULT),
        ...raw,
        user: { ...DEFAULT.user, ...(raw.user || {}) },
        data: { ...DEFAULT.data, ...(raw.data || {}) },
        cards: Array.isArray(raw.cards) ? raw.cards : [],
        deleted_cards: Array.isArray(raw.deleted_cards) ? raw.deleted_cards : [],
        announcements: Array.isArray(raw.announcements) ? raw.announcements : [],
      };
    } catch {
      return structuredClone(DEFAULT);
    }
  }

  function saveState(st) {
    localStorage.setItem(STORE_KEY, JSON.stringify(st));
  }

  function json(data, status) {
    return new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  async function readBody(init) {
    if (!init || init.body == null) return {};
    try {
      if (typeof init.body === "string") return JSON.parse(init.body || "{}");
      if (init.body instanceof Blob) return JSON.parse(await init.body.text());
      return JSON.parse(String(init.body));
    } catch {
      return {};
    }
  }

  function getConfigs() {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_CONFIGS) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function publicConfigs() {
    return getConfigs().map((c) => {
      const { apiKey, ...rest } = c || {};
      return { ...rest, hasKey: !!apiKey, keyDecryptFailed: false };
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

  async function upstreamChat(cfg, messages, options, stream) {
    const url = joinUrl(cfg.baseUrl, "/chat/completions");
    const body = {
      model: cfg.selectedModel || "gpt-3.5-turbo",
      messages: messages || [],
      stream: !!stream,
    };
    if (options && options.temperature != null) body.temperature = options.temperature;
    if (options && options.max_tokens) body.max_tokens = parseInt(options.max_tokens, 10);
    else if (cfg.maxTokens) body.max_tokens = parseInt(cfg.maxTokens, 10);

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (cfg.apiKey && !isMaskKey(cfg.apiKey)) {
      headers.Authorization = "Bearer " + cfg.apiKey;
    }

    return rawFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async function upstreamModels(cfg) {
    const url = joinUrl(cfg.baseUrl, "/models");
    const headers = { Accept: "application/json" };
    if (cfg.apiKey && !isMaskKey(cfg.apiKey)) {
      headers.Authorization = "Bearer " + cfg.apiKey;
    }
    return rawFetch(url, { method: "GET", headers });
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

  function proxyBody(cfg, body) {
    return {
      ...body,
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey || "",
      selectedModel: cfg.selectedModel || "",
      maxTokens: cfg.maxTokens,
    };
  }

  async function viaProxy(path, body) {
    return rawFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Card-Proxy": "1",
      },
      body: JSON.stringify(body),
    });
  }

  async function handleApi(url, init) {
    const method = ((init && init.method) || "GET").toUpperCase();
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    const st = loadState();
    const body = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
      ? await readBody(init)
      : {};

    // ---- LLM configs（纯本地）----
    if (path === "/api/llm/configs" && method === "GET") {
      return json({ ok: true, configs: publicConfigs() });
    }
    if (path === "/api/llm/configs" && (method === "POST" || method === "PUT")) {
      const incoming = body.configs;
      if (!Array.isArray(incoming)) return json({ ok: false, error: "configs 必须是数组" }, 400);
      const old = getConfigs();
      const oldById = Object.fromEntries(old.map((c) => [String(c.id), c]));
      const merged = incoming.map((c, i) => {
        const id = c.id != null ? c.id : i + 1;
        const prev = oldById[String(id)] || {};
        let key = c.apiKey || c.key || "";
        if (isMaskKey(key)) key = prev.apiKey || "";
        return { ...prev, ...c, id, apiKey: key };
      });
      localStorage.setItem(LS_CONFIGS, JSON.stringify(merged));
      return json({ ok: true, configs: publicConfigs() });
    }

    // ---- LLM 上游（默认 CF 代理）----
    if (path === "/api/llm/models" && method === "POST") {
      const cfg = getConfigs()[body.configIndex || 0];
      if (!cfg) return json({ ok: false, error: "配置不存在，请先保存" }, 400);
      if (!cfg.baseUrl) return json({ ok: false, error: "请先填写 Base URL 并保存" }, 400);
      try {
        if (window.__CARD_USE_LLM_PROXY) {
          const res = await viaProxy("/api/llm/models", proxyBody(cfg, body));
          const payload = await res.json().catch(() => ({}));
          if (payload.ok && Array.isArray(payload.models)) {
            cfg.models = payload.models;
            const all = getConfigs();
            all[body.configIndex || 0] = cfg;
            localStorage.setItem(LS_CONFIGS, JSON.stringify(all));
          }
          return new Response(JSON.stringify(payload), {
            status: res.status,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }
        const res = await upstreamModels(cfg);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          return json({ ok: false, error: "上游 " + res.status + ": " + JSON.stringify(payload).slice(0, 200) }, 400);
        }
        const models = extractModels(payload);
        cfg.models = models;
        const all = getConfigs();
        all[body.configIndex || 0] = cfg;
        localStorage.setItem(LS_CONFIGS, JSON.stringify(all));
        return json({ ok: true, models });
      } catch (e) {
        return json({ ok: false, error: "拉取模型失败: " + (e.message || e) }, 502);
      }
    }

    if (path === "/api/llm/test" && method === "POST") {
      const cfg = getConfigs()[body.configIndex || 0];
      if (!cfg) return json({ ok: false, error: "配置不存在" }, 400);
      try {
        if (window.__CARD_USE_LLM_PROXY) {
          return viaProxy("/api/llm/test", proxyBody(cfg, body));
        }
        const res = await upstreamModels(cfg);
        if (res.ok) {
          const payload = await res.json().catch(() => ({}));
          const models = extractModels(payload);
          return json({ ok: true, model: cfg.selectedModel || models[0] || "" });
        }
        const chatRes = await upstreamChat(cfg, [{ role: "user", content: "ping" }], { max_tokens: 8 }, false);
        if (!chatRes.ok) {
          const t = await chatRes.text();
          return json({ ok: false, error: "连通失败: " + t.slice(0, 200) }, 400);
        }
        return json({ ok: true, model: cfg.selectedModel || "" });
      } catch (e) {
        return json({ ok: false, error: "连通失败: " + (e.message || e) }, 400);
      }
    }

    if ((path === "/api/llm/chat" || path === "/api/llm/chat/stream") && method === "POST") {
      const cfg = getConfigs()[body.configIndex || 0];
      if (!cfg) return json({ ok: false, error: "配置不存在" }, 400);
      if (!cfg.baseUrl) return json({ ok: false, error: "Base URL 为空" }, 400);
      const stream = path.endsWith("/stream");
      try {
        if (window.__CARD_USE_LLM_PROXY) {
          return viaProxy(path, proxyBody(cfg, body));
        }
        const res = await upstreamChat(cfg, body.messages || [], body.options || {}, stream);
        if (stream) return res;
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = payload.error?.message || payload.error || JSON.stringify(payload).slice(0, 200);
          return json({ ok: false, error: "上游 " + res.status + ": " + msg }, res.status >= 400 ? res.status : 502);
        }
        const content = extractContent(payload);
        if (content == null) return json({ ok: false, error: "上游无 content" }, 502);
        return json({ ok: true, content });
      } catch (e) {
        return json({ ok: false, error: "LLM 请求失败: " + (e.message || e) }, 502);
      }
    }

    if (path === "/api/llm-proxy") {
      return json({ ok: false, error: "已禁用开放代理" }, 410);
    }

    // ---- auth / user ----
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      return json({ ok: true, token: "local-dev-token", user: st.user });
    }
    if (path === "/api/auth/me") return json({ ok: true, user: st.user });
    if (path === "/api/user/profile" && method === "PUT") {
      if (body.nickname) {
        st.user.nickname = String(body.nickname).trim();
        saveState(st);
      }
      return json({ ok: true, nickname: st.user.nickname || "" });
    }
    if (
      path === "/api/auth/send-code" ||
      path === "/api/auth/forgot-password" ||
      path === "/api/auth/reset-password"
    ) {
      return json({ ok: true });
    }
    if (path === "/api/auth/username") {
      if (body.username) {
        st.user.username = body.username;
        st.user.nickname = body.nickname || body.username;
        saveState(st);
      }
      return json({ ok: true, user: st.user });
    }
    if (path === "/api/user/delete-status") return json({ deleteStatus: "none" });
    if (path === "/api/user/delete-request" || path === "/api/user/cancel-delete") {
      return json({ ok: true });
    }
    if (path === "/api/user/clear-all" && method === "POST") {
      st.cards = [];
      st.deleted_cards = [];
      st.announcements = [];
      st.data = structuredClone(DEFAULT.data);
      saveState(st);
      localStorage.setItem(LS_CONFIGS, "[]");
      return json({ ok: true });
    }

    // ---- cards ----
    if (path === "/api/user/cards" && method === "GET") {
      return json({ ok: true, cards: st.cards });
    }
    if (path === "/api/user/cards" && method === "POST") {
      const card = body.card || body;
      if (!card.id) card.id = "c_" + Date.now();
      st.cards = st.cards.filter((c) => c.id !== card.id);
      st.cards.push(card);
      saveState(st);
      return json({ ok: true, card });
    }
    if (path === "/api/user/cards/deleted" && method === "GET") {
      return json({ ok: true, cards: st.deleted_cards });
    }
    if (path.startsWith("/api/user/cards/restore/") && method === "POST") {
      const cid = path.split("/").pop();
      const found = st.deleted_cards.find((c) => String(c.id) === cid);
      st.deleted_cards = st.deleted_cards.filter((c) => String(c.id) !== cid);
      if (found) {
        st.cards.push(found);
        saveState(st);
        return json({ ok: true, card: found });
      }
      return json({ ok: false, error: "not found" }, 404);
    }
    if (path.startsWith("/api/user/cards/deleted/") && method === "DELETE") {
      const cid = path.split("/").pop();
      st.deleted_cards = st.deleted_cards.filter((c) => String(c.id) !== cid);
      saveState(st);
      return json({ ok: true });
    }
    if (path.startsWith("/api/user/cards/") && method === "DELETE") {
      const cid = path.split("/").pop();
      if (cid === "sync" || cid === "deleted") return json({ ok: true });
      const found = st.cards.find((c) => String(c.id) === cid);
      st.cards = st.cards.filter((c) => String(c.id) !== cid);
      if (found) st.deleted_cards.push(found);
      saveState(st);
      return json({ ok: true });
    }
    if (path === "/api/user/cards/sync" && method === "POST") {
      if (Array.isArray(body.cards)) {
        st.cards = body.cards;
        saveState(st);
      }
      return json({ ok: true, cards: st.cards });
    }

    // ---- user data ----
    if (path === "/api/user/data" && method === "GET") {
      return json({ ok: true, data: st.data });
    }
    if (path === "/api/user/data/draft_card" && method === "GET") {
      return json({
        ok: true,
        data: st.data.draft_card || {},
        updatedAt: new Date().toISOString(),
      });
    }
    if (path.startsWith("/api/user/data/") && method === "PUT") {
      const key = path.slice("/api/user/data/".length);
      st.data[key] = body.value !== undefined ? body.value : body.data !== undefined ? body.data : body;
      saveState(st);
      return json({ ok: true });
    }
    if (path === "/api/user/data" && method === "PUT") {
      if (body.data && typeof body.data === "object") Object.assign(st.data, body.data);
      else Object.assign(st.data, body);
      saveState(st);
      return json({ ok: true });
    }

    if (path === "/api/counter" || path.startsWith("/api/counter/")) {
      return json({ ok: true, cards: st.cards.length, todayCards: 0, total: st.cards.length });
    }
    if (path === "/api/announcements") {
      return json({ ok: true, announcements: st.announcements || [] });
    }
    if (path.startsWith("/api/group/")) {
      if (path === "/api/group/unread") return json({ ok: true, count: 0 });
      if (path === "/api/group/pinned") return json({ ok: true, messages: [] });
      if (path === "/api/group/messages") return json({ ok: true, messages: [] });
      if (path === "/api/group/read") return json({ ok: true });
      if (path === "/api/group/stream") {
        return new Response("", { status: 204 });
      }
      return json({ ok: true });
    }

    return json({ ok: true });
  }

  // EventSource 不走 fetch；群聊 SSE 在同域无后端时会落到 HTML 页面
  const RawEventSource = window.EventSource;
  function MockGroupStream(url) {
    const bus = new EventTarget();
    const es = {
      url: String(url),
      readyState: 1,
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      onopen: null,
      onmessage: null,
      onerror: null,
      close() {
        es.readyState = 2;
      },
      addEventListener(type, fn, opts) {
        bus.addEventListener(type, fn, opts);
      },
      removeEventListener(type, fn, opts) {
        bus.removeEventListener(type, fn, opts);
      },
      dispatchEvent(ev) {
        return bus.dispatchEvent(ev);
      },
    };
    queueMicrotask(() => {
      if (es.readyState === 2) return;
      const payload = JSON.stringify({ ok: true, onlineCount: 1 });
      const ev = new MessageEvent("connected", { data: payload });
      bus.dispatchEvent(ev);
      if (typeof es.onopen === "function") {
        try {
          es.onopen(new Event("open"));
        } catch (_) {}
      }
    });
    return es;
  }
  window.EventSource = function CardEventSource(url, config) {
    let parsed;
    try {
      parsed = new URL(String(url), location.origin);
    } catch {
      return new RawEventSource(url, config);
    }
    if (
      parsed.origin === location.origin &&
      parsed.pathname.startsWith("/api/group/stream")
    ) {
      return MockGroupStream(parsed.href);
    }
    return new RawEventSource(url, config);
  };
  window.EventSource.CONNECTING = 0;
  window.EventSource.OPEN = 1;
  window.EventSource.CLOSED = 2;
  if (RawEventSource && RawEventSource.prototype) {
    window.EventSource.prototype = RawEventSource.prototype;
  }

  window.fetch = async function (input, init) {
    let url;
    try {
      url = new URL(typeof input === "string" ? input : input.url, location.origin);
    } catch {
      return rawFetch(input, init);
    }

    // CF 代理回环：不拦截
    const hdrs = (init && init.headers) || {};
    const proxyMark =
      (hdrs["X-Card-Proxy"] || hdrs["x-card-proxy"] ||
        (typeof hdrs.get === "function" && (hdrs.get("X-Card-Proxy") || hdrs.get("x-card-proxy"))));
    if (proxyMark) return rawFetch(input, init);

    if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
      // 不拦截门户已有 API（角色库 / NAI / 文章等）
      if (
        url.pathname.startsWith("/api/characters") ||
        url.pathname.startsWith("/api/artists") ||
        url.pathname.startsWith("/api/articles") ||
        url.pathname.startsWith("/api/nai") ||
        url.pathname.startsWith("/api/dzmm") ||
        url.pathname.startsWith("/api/lora")
      ) {
        return rawFetch(input, init);
      }
      try {
        return await handleApi(url, init || {});
      } catch (e) {
        return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
      }
    }
    return rawFetch(input, init);
  };
  // 供外部排查 / 兼容旧调用；必须挂在替换后的 window.fetch 上
  window.fetch.__cardRaw = rawFetch;
})();
