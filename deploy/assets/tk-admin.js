(function () {
  "use strict";

  const KEY_STORE = "comfyui_admin_key"; // localStorage：刷新不掉登录
  /** 素材站（画师/角色/资讯/登录探针） */
  const ASSET_BASE = "https://comfyui-web-89u.pages.dev";
  /** 游戏云端（公告/留言/交易/偏好/玩家画师串） */
  const CLOUD_BASE = "https://tk-game-cloud.pages.dev";

  const MODULES = [
    { id: "overview", label: "总览" },
    { id: "notice", label: "公告" },
    { id: "trade", label: "画师串交流" },
    { id: "board", label: "留言板" },
    { id: "news", label: "资讯" },
    { id: "artists", label: "画师库" },
    { id: "characters", label: "角色库" },
    { id: "prefs", label: "玩家偏好" },
    { id: "map", label: "能力地图" },
  ];

  const CLOUD_PREFIXES = [
    "/api/announcements",
    "/api/board",
    "/api/artist-trade",
    "/api/prefs",
    "/api/player-artists",
    "/api/admin/overview",
  ];

  let adminKey = localStorage.getItem(KEY_STORE) || "";
  let route = "overview";
  const state = {
    boardPage: 1,
    noticePage: 1,
    tradePage: 1,
    tradeStatus: "active",
    prefsPage: 1,
    artistsPage: 1,
    artistsQ: "",
    artistsFilter: "all",
    charsPage: 1,
    charsQ: "",
    charsFilter: "all",
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatTime(at) {
    const ts = Number(at) || 0;
    if (!ts) return "—";
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function setKey(value) {
    adminKey = value || "";
    if (adminKey) localStorage.setItem(KEY_STORE, adminKey);
    else localStorage.removeItem(KEY_STORE);
    // 兼容旧页
    try { sessionStorage.setItem(KEY_STORE, adminKey); } catch (_) {}
  }

  function resolveUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const p = String(path || "");
    const useCloud = CLOUD_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}?`) || p.startsWith(`${prefix}/`));
    const base = useCloud ? CLOUD_BASE : ASSET_BASE;
    return new URL(p, base).toString();
  }

  async function api(path, opts = {}) {
    const res = await fetch(resolveUrl(path), {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "x-admin-key": adminKey,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function assetApi(path, opts = {}) {
    const res = await fetch(new URL(path, ASSET_BASE).toString(), {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "x-admin-key": adminKey,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function cloudApi(path, opts = {}) {
    const res = await fetch(new URL(path, CLOUD_BASE).toString(), {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        "x-admin-key": adminKey,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function showLogin(err) {
    $("login")?.classList.remove("hidden");
    $("app")?.classList.add("hidden");
    if ($("login-error")) {
      $("login-error").textContent = err || "";
      $("login-error").classList.toggle("hidden", !err);
    }
  }

  function showApp() {
    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");
  }

  async function verifyAuth() {
    // 游戏数据只认新云端库；素材站密钥另作二次探针（资讯/画师/角色）
    await cloudApi("/api/admin/overview");
    try {
      await assetApi("/api/articles/auth");
    } catch (_) {
      // 素材站密钥不一致时仍可进后台，仅云端模块可用
    }
  }

  async function login() {
    const key = ($("admin-key")?.value || "").trim();
    if (!key) return showLogin("请输入管理密钥");
    setKey(key);
    try {
      await verifyAuth();
      showApp();
      routeFromHash();
      render();
    } catch (err) {
      setKey("");
      const msg = err.status === 403
        ? "密钥错误"
        : (err.status === 503 ? "云端未配置 ADMIN_KEY" : (err.message || "登录失败"));
      showLogin(msg);
    }
  }

  function logout() {
    setKey("");
    showLogin("");
    if ($("admin-key")) $("admin-key").value = "";
  }

  function routeFromHash() {
    const id = String(location.hash || "#overview").replace(/^#/, "") || "overview";
    route = MODULES.some((m) => m.id === id) ? id : "overview";
  }

  function go(id) {
    location.hash = id;
  }

  function setTop(title, sub) {
    if ($("view-title")) $("view-title").textContent = title;
    if ($("view-sub")) $("view-sub").textContent = sub || "";
  }

  function renderNav() {
    const nav = $("nav");
    if (!nav) return;
    nav.innerHTML = MODULES.map((m) =>
      `<button type="button" data-route="${m.id}" class="${route === m.id ? "active" : ""}">${escapeHtml(m.label)}</button>`
    ).join("");
  }

  async function render() {
    renderNav();
    const root = $("view");
    if (!root) return;
    root.innerHTML = `<div class="panel meta">加载中…</div>`;
    try {
      if (route === "overview") await renderOverview(root);
      else if (route === "notice") await renderNotice(root);
      else if (route === "board") await renderBoard(root);
      else if (route === "trade") await renderTrade(root);
      else if (route === "news") renderNews(root);
      else if (route === "artists") await renderArtists(root);
      else if (route === "characters") await renderCharacters(root);
      else if (route === "prefs") await renderPrefs(root);
      else if (route === "map") renderMap(root);
    } catch (err) {
      if (err.status === 403) {
        setKey("");
        showLogin("密钥失效，请重新登录");
        return;
      }
      root.innerHTML = `<div class="panel err">${escapeHtml(err.message || "加载失败")}</div>`;
    }
  }

  async function renderOverview(root) {
    setTop("总览", "云端库（新）+ 素材库（正式站）分开展示。");
    let cloud = null;
    let asset = null;
    let cloudErr = "";
    try {
      cloud = await cloudApi("/api/admin/overview");
    } catch (err) {
      cloudErr = err.message || "云端总览失败";
    }
    try {
      asset = await assetApi("/api/admin/overview");
    } catch (_) {}

    const c = cloud?.modules || {};
    const a = asset?.modules || {};
    const cards = [
      { href: "notice", k: "当前公告", v: c.notice?.active ? "有" : (cloud ? "无" : "—"), s: "云端库 · 游戏顶栏" },
      { href: "trade", k: "画师串在售", v: c.trade?.active ?? "—", s: `云端 · 下架 ${c.trade?.off ?? 0} · 打码 ${c.trade?.imageBlocked ?? 0}` },
      { href: "board", k: "留言条数", v: c.board?.total ?? "—", s: "云端库 · 可删 / 清空" },
      { href: "prefs", k: "偏好记录", v: c.prefs?.total ?? "—", s: `云端 · 玩家画师串 ${c.playerArtists?.total ?? 0}` },
      { href: "news", k: "已发资讯", v: a.news?.published ?? "—", s: `素材站 · 草稿 ${a.news?.draft ?? 0}` },
      { href: "artists", k: "画师库", v: a.artists?.total ?? "—", s: "素材站 · 公开检索库" },
      { href: "characters", k: "角色数", v: a.characters?.characters ?? "—", s: `素材站 · 系列 ${a.characters?.series ?? 0}` },
    ];
    const notes = [
      ...(cloud?.notes || []),
      "素材站：" + ASSET_BASE,
      "云端站：" + CLOUD_BASE,
      ...(cloudErr ? [`云端告警：${cloudErr}`] : []),
    ];
    root.innerHTML = `
      <div class="grid-cards">
        ${cards.map((card) => `
          <button type="button" class="stat-card" data-go="${card.href}">
            <div class="k">${escapeHtml(card.k)}</div>
            <div class="v">${escapeHtml(String(card.v))}</div>
            <div class="s">${escapeHtml(card.s)}</div>
          </button>`).join("")}
      </div>
      <div class="panel notes">
        <strong>说明</strong>
        <ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </div>`;
    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => go(el.getAttribute("data-go")));
    });
  }

  async function renderNotice(root) {
    setTop("公告", "左侧编辑，右侧实时预览（与玩家端黑白硬边栏一致）。支持 HTML / 图 / 代码 / 特效。");
    const data = await api(`/api/announcements?view=admin&page=${state.noticePage}`);
    const rows = data.rows || [];
    const plainPreview = (html) => String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    function sanitizeNoticeHtml(raw) {
      let html = String(raw || "");
      html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
      html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      html = html.replace(/\shref\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, ' href="#"');
      html = html.replace(/\ssrc\s*=\s*(['"])\s*javascript:[^'"]*\1/gi, "");
      return html;
    }
    function escapeNotice(value) {
      return String(value || "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      }[c]));
    }
    function looksLikeHtml(raw) {
      return /<\/?[a-z][\s\S]*>/i.test(String(raw || ""));
    }
    function markdownLite(raw) {
      let s = escapeNotice(raw);
      s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="notice-code"><code>${code}</code></pre>`);
      s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
      s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
      s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img class="notice-img" src="$2" alt="$1" loading="lazy">');
      s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      s = s.replace(/\n{2,}/g, "</p><p>");
      s = s.replace(/\n/g, "<br>");
      return `<p>${s}</p>`;
    }
    function renderBodyHtml(raw) {
      const text = String(raw || "").trim();
      if (!text) return `<p class="notice-empty">在左侧输入正文，这里实时预览</p>`;
      if (looksLikeHtml(text)) return sanitizeNoticeHtml(text);
      return markdownLite(text);
    }
    function formatPreviewTime() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function updateLivePreview() {
      const title = String($("notice-title")?.value || "").trim() || "公告标题预览";
      const body = $("notice-body")?.value || "";
      const titleEl = $("notice-preview-title");
      const timeEl = $("notice-preview-time");
      const bodyEl = $("notice-preview-body");
      if (titleEl) titleEl.textContent = title;
      if (timeEl) timeEl.textContent = formatPreviewTime() + " · 预览";
      if (bodyEl) bodyEl.innerHTML = renderBodyHtml(body);
    }

    root.innerHTML = `
      <div class="panel">
        <div class="notice-editor-grid">
          <div class="notice-editor-pane">
            <div class="meta" style="margin-bottom:6px">编辑</div>
            <input id="notice-title" type="text" maxlength="80" placeholder="标题（大字显示，最多 80 字）">
            <textarea id="notice-body" maxlength="48000" rows="14" placeholder="正文：纯文本或 HTML。支持 b/i/code/pre/img/style、表情，以及 fx-blink / fx-pulse / fx-shake / fx-marquee / fx-stamp / fx-invert / fx-outline"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button type="button" id="notice-publish">发布公告</button>
              <button type="button" id="notice-preview-refresh">刷新预览</button>
              <button type="button" id="notice-refresh">刷新列表</button>
            </div>
            <p class="meta" style="margin-top:8px">最多约 48KB。勿写 script。点列表「载入预览」可回看已发内容。</p>
          </div>
          <div class="notice-preview-pane">
            <div class="meta" style="margin-bottom:6px">玩家端预览</div>
            <div class="notice-preview-shell" aria-label="公告预览">
              <header class="notice-preview-head">
                <div class="notice-preview-head-row">
                  <span class="notice-preview-kicker">NOTICE</span>
                  <span class="notice-preview-close">关闭</span>
                </div>
                <h2 id="notice-preview-title" class="notice-preview-title">公告标题预览</h2>
                <p id="notice-preview-time" class="notice-preview-time"></p>
              </header>
              <div class="notice-preview-rule"></div>
              <div id="notice-preview-body" class="notice-preview-rich notice-rich"></div>
            </div>
          </div>
        </div>
        <p class="meta">共 ${data.total || 0} 条 · 第 ${data.page || 1}/${data.totalPages || 1} 页</p>
        <div class="list">
          ${rows.length ? rows.map((row) => `
            <article class="item">
              <div class="item-head">
                <strong>${escapeHtml(row.title || "（无标题）")}</strong>
                <div>
                  <span class="badge ${row.active ? "" : "off"}">${row.active ? "生效中" : "已下线"}</span>
                  <button type="button" data-load="${escapeHtml(row.id)}">载入预览</button>
                  ${row.active ? `<button type="button" class="warn" data-off="${escapeHtml(row.id)}">下线</button>` : ""}
                  <button type="button" class="danger" data-del="${escapeHtml(row.id)}">删除</button>
                </div>
              </div>
              <div>${escapeHtml(plainPreview(row.body) || "（空）")}</div>
              <div class="meta">${escapeHtml(formatTime(row.at))} · <span class="mono">${escapeHtml(row.id)}</span> · ${String(row.body || "").length} 字</div>
            </article>`).join("") : `<div class="meta">暂无公告</div>`}
        </div>
        <div class="pager">
          <button type="button" id="notice-prev" ${state.noticePage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.noticePage} / ${data.totalPages || 1}</span>
          <button type="button" id="notice-next" ${state.noticePage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;

    const rowById = Object.fromEntries(rows.map((r) => [r.id, r]));
    $("notice-refresh")?.addEventListener("click", () => render());
    $("notice-prev")?.addEventListener("click", () => { state.noticePage = Math.max(1, state.noticePage - 1); render(); });
    $("notice-next")?.addEventListener("click", () => { state.noticePage += 1; render(); });
    $("notice-preview-refresh")?.addEventListener("click", updateLivePreview);
    $("notice-title")?.addEventListener("input", updateLivePreview);
    $("notice-body")?.addEventListener("input", updateLivePreview);
    updateLivePreview();

    // 默认载入当前生效公告到预览（不覆盖正在输入时：仅空编辑框）
    const active = rows.find((r) => r.active);
    if (active && !$("notice-title")?.value && !$("notice-body")?.value) {
      if ($("notice-title")) $("notice-title").value = active.title || "";
      if ($("notice-body")) $("notice-body").value = active.body || "";
      updateLivePreview();
    }

    $("notice-publish")?.addEventListener("click", async () => {
      const title = $("notice-title")?.value || "";
      const body = $("notice-body")?.value || "";
      if (!String(body).trim()) {
        alert("请填写公告正文");
        return;
      }
      updateLivePreview();
      if (!confirm("发布后将替换当前生效公告，玩家会看到预览中的内容。继续？")) return;
      await api("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ action: "create", title, body }),
      });
      state.noticePage = 1;
      render();
    });
    root.querySelectorAll("[data-load]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = rowById[btn.getAttribute("data-load")];
        if (!row) return;
        if ($("notice-title")) $("notice-title").value = row.title || "";
        if ($("notice-body")) $("notice-body").value = row.body || "";
        updateLivePreview();
        $("notice-body")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
      });
    });
    root.querySelectorAll("[data-off]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("下线这条公告？")) return;
        await api("/api/announcements", {
          method: "POST",
          body: JSON.stringify({ action: "deactivate", id: btn.getAttribute("data-off") }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除这条公告记录？")) return;
        await api(`/api/announcements?id=${encodeURIComponent(btn.getAttribute("data-del"))}`, { method: "DELETE" });
        render();
      });
    });
  }

  async function renderBoard(root) {
    setTop("留言板", "全服聊天巡查：删除单条或清空。");
    const data = await api(`/api/board?page=${state.boardPage}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <span class="meta">共 ${data.total || 0} 条 · 第 ${data.page || 1}/${data.totalPages || 1} 页</span>
          <button type="button" id="board-refresh">刷新</button>
          <button type="button" class="danger" id="board-clear">清空全部</button>
        </div>
        <div class="list" id="board-list">
          ${rows.length ? rows.map((row) => `
            <article class="item">
              <div class="item-head">
                <strong>${escapeHtml(row.name || "访客")}</strong>
                <button type="button" class="danger" data-del="${escapeHtml(row.id)}">删除</button>
              </div>
              <div>${escapeHtml(row.text || "")}</div>
              <div class="meta">${escapeHtml(formatTime(row.at))}
                ${row.ip ? ` · IP ${escapeHtml(row.ip)}` : ""}
                ${row.userId ? ` · UID ${escapeHtml(row.userId)}` : ""}
                · <span class="mono">${escapeHtml(row.id)}</span>
              </div>
            </article>`).join("") : `<div class="meta">暂无留言</div>`}
        </div>
        <div class="pager">
          <button type="button" id="board-prev" ${state.boardPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.boardPage} / ${data.totalPages || 1}</span>
          <button type="button" id="board-next" ${state.boardPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("board-refresh")?.addEventListener("click", () => render());
    $("board-clear")?.addEventListener("click", async () => {
      if (!confirm("清空全部留言？不可恢复。")) return;
      if (!confirm("再确认一次清空？")) return;
      await api("/api/board?all=1", { method: "DELETE" });
      state.boardPage = 1;
      render();
    });
    $("board-prev")?.addEventListener("click", () => { state.boardPage = Math.max(1, state.boardPage - 1); render(); });
    $("board-next")?.addEventListener("click", () => { state.boardPage += 1; render(); });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除这条留言？")) return;
        await api(`/api/board?id=${encodeURIComponent(btn.getAttribute("data-del"))}`, { method: "DELETE" });
        render();
      });
    });
  }

  async function renderTrade(root) {
    setTop("画师串交流", "删除整条 / 强制下架 / 屏蔽图片（打码后连卖家也看不到）。");
    const data = await api(`/api/artist-trade?view=admin&status=${encodeURIComponent(state.tradeStatus)}&page=${state.tradePage}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <select id="trade-status" style="max-width:140px">
            <option value="active" ${state.tradeStatus === "active" ? "selected" : ""}>在售</option>
            <option value="off" ${state.tradeStatus === "off" ? "selected" : ""}>已下架</option>
            <option value="all" ${state.tradeStatus === "all" ? "selected" : ""}>全部</option>
          </select>
          <span class="meta grow">共 ${data.total || 0} 条 · 第 ${data.page || 1}/${data.totalPages || 1} 页</span>
          <button type="button" id="trade-refresh">刷新</button>
        </div>
        <div class="list">
          ${rows.length ? rows.map((row) => {
            const blocked = !!row.imageBlocked;
            const thumb = row.hasImage && !blocked
              ? `${CLOUD_BASE}/api/artist-trade?thumb=${encodeURIComponent(row.id)}`
              : "";
            const media = thumb
              ? `<img class="thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async">`
              : `<div class="thumb-empty">${blocked ? "已打码" : "无图"}</div>`;
            return `<article class="item">
              <div class="thumb-row">
                ${media}
                <div>
                  <div class="item-head">
                    <strong>${escapeHtml(row.title || "未命名")}</strong>
                    <div>
                      <span class="badge ${row.status === "off" ? "off" : ""}">${row.status === "off" ? "已下架" : "在售"}</span>
                      ${blocked ? `<span class="badge warn">图片已屏蔽</span>` : ""}
                    </div>
                  </div>
                  <div class="meta">卖家 ${escapeHtml(row.sellerName || "访客")} · UID <span class="mono">${escapeHtml(row.sellerId || "-")}</span> · ${Number(row.price) || 0} 画泥 · ${escapeHtml(formatTime(row.at))}</div>
                  <pre class="trigger">${escapeHtml(row.trigger || "")}</pre>
                  <div class="item-actions">
                    <button type="button" class="warn" data-block="${escapeHtml(row.id)}" ${blocked || !row.hasImage ? "disabled" : ""}>屏蔽图片</button>
                    <button type="button" data-off="${escapeHtml(row.id)}" ${row.status === "off" ? "disabled" : ""}>强制下架</button>
                    <button type="button" class="danger" data-del="${escapeHtml(row.id)}">删除整条</button>
                  </div>
                </div>
              </div>
            </article>`;
          }).join("") : `<div class="meta">没有记录</div>`}
        </div>
        <div class="pager">
          <button type="button" id="trade-prev" ${state.tradePage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.tradePage} / ${data.totalPages || 1}</span>
          <button type="button" id="trade-next" ${state.tradePage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("trade-status")?.addEventListener("change", (e) => {
      state.tradeStatus = e.target.value;
      state.tradePage = 1;
      render();
    });
    $("trade-refresh")?.addEventListener("click", () => render());
    $("trade-prev")?.addEventListener("click", () => { state.tradePage = Math.max(1, state.tradePage - 1); render(); });
    $("trade-next")?.addEventListener("click", () => { state.tradePage += 1; render(); });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除整条？购买记录与未领收益也会清除。")) return;
        await api("/api/artist-trade", { method: "POST", body: JSON.stringify({ action: "admin_delete", listingId: btn.getAttribute("data-del") }) });
        render();
      });
    });
    root.querySelectorAll("[data-block]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("屏蔽后清空图片，对外与卖家均不可见，不可恢复。")) return;
        await api("/api/artist-trade", { method: "POST", body: JSON.stringify({ action: "admin_block_image", listingId: btn.getAttribute("data-block") }) });
        render();
      });
    });
    root.querySelectorAll("[data-off]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("强制下架该画师串？")) return;
        await api("/api/artist-trade", { method: "POST", body: JSON.stringify({ action: "admin_force_off", listingId: btn.getAttribute("data-off") }) });
        render();
      });
    });
  }

  function renderNews(root) {
    setTop("资讯", "发帖 / 草稿 / 发布仍用完整编辑器（同密钥，刷新不掉登录）。");
    root.innerHTML = `
      <div class="panel" style="padding:0;overflow:hidden">
        <iframe class="embed" src="/admin/news.html?embed=1" title="资讯管理"></iframe>
      </div>`;
  }

  async function renderArtists(root) {
    setTop("画师库", "分页搜索；最高级屏蔽后玩家端列表/搜索都看不到，解锁码也无效。");
    const q = state.artistsQ || "";
    const filter = state.artistsFilter || "all";
    const data = await api(
      `/api/content-blocks?view=admin&kind=artist&page=${state.artistsPage}&q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`
    );
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="artists-q" placeholder="搜名称 / slug / 触发词…" value="${escapeHtml(q)}">
          <select id="artists-filter" style="max-width:120px">
            <option value="all" ${filter === "all" ? "selected" : ""}>全部</option>
            <option value="blocked" ${filter === "blocked" ? "selected" : ""}>已屏蔽</option>
            <option value="open" ${filter === "open" ? "selected" : ""}>未屏蔽</option>
          </select>
          <button type="button" class="primary" id="artists-search">搜索</button>
          <button type="button" id="artists-refresh">刷新</button>
        </div>
        <div class="meta" style="margin-bottom:8px">共 ${data.total || 0} 条 · 第 ${data.page || 1}/${data.totalPages || 1} 页</div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>名称</th><th>触发词</th><th>热度</th><th>状态</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.name || "")}<div class="mono meta">${escapeHtml(row.slug || row.id || "")}</div></td>
                  <td class="mono">${escapeHtml(String(row.trigger || "").slice(0, 100))}</td>
                  <td>${escapeHtml(String(row.count ?? ""))}</td>
                  <td>${row.blocked ? `<span class="badge warn">已屏蔽</span>` : `<span class="badge">正常</span>`}</td>
                  <td>
                    ${row.blocked
                      ? `<button type="button" data-unblock="${escapeHtml(row.id || row.slug)}">解除屏蔽</button>`
                      : `<button type="button" class="danger" data-block="${escapeHtml(row.id || row.slug)}">最高级屏蔽</button>`}
                  </td>
                </tr>`).join("") : `<tr><td colspan="5">暂无数据</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="artists-prev" ${state.artistsPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.artistsPage} / ${data.totalPages || 1}</span>
          <button type="button" id="artists-next" ${state.artistsPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    const syncQ = () => {
      state.artistsQ = $("artists-q")?.value || "";
      state.artistsFilter = $("artists-filter")?.value || "all";
      state.artistsPage = 1;
      render();
    };
    $("artists-search")?.addEventListener("click", syncQ);
    $("artists-filter")?.addEventListener("change", syncQ);
    $("artists-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") syncQ(); });
    $("artists-refresh")?.addEventListener("click", () => render());
    $("artists-prev")?.addEventListener("click", () => { state.artistsPage = Math.max(1, state.artistsPage - 1); render(); });
    $("artists-next")?.addEventListener("click", () => { state.artistsPage += 1; render(); });
    root.querySelectorAll("[data-block]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("最高级屏蔽该画师？玩家将完全看不到，任何解锁码无效。")) return;
        await api("/api/content-blocks", {
          method: "POST",
          body: JSON.stringify({ kind: "artist", id: btn.getAttribute("data-block"), blocked: true }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api("/api/content-blocks", {
          method: "POST",
          body: JSON.stringify({ kind: "artist", id: btn.getAttribute("data-unblock"), blocked: false }),
        });
        render();
      });
    });
  }

  async function renderCharacters(root) {
    setTop("角色库 / 作品", "按作品（系列）分页搜索；最高级屏蔽后列表消失，解锁码/全解锁也无法打开。");
    const q = state.charsQ || "";
    const filter = state.charsFilter || "all";
    const data = await api(
      `/api/content-blocks?view=admin&kind=series&page=${state.charsPage}&q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`
    );
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="chars-q" placeholder="搜作品 id / 名称…" value="${escapeHtml(q)}">
          <select id="chars-filter" style="max-width:120px">
            <option value="all" ${filter === "all" ? "selected" : ""}>全部</option>
            <option value="blocked" ${filter === "blocked" ? "selected" : ""}>已屏蔽</option>
            <option value="open" ${filter === "open" ? "selected" : ""}>未屏蔽</option>
          </select>
          <button type="button" class="primary" id="chars-search">搜索</button>
          <button type="button" id="chars-refresh">刷新</button>
        </div>
        <div class="meta" style="margin-bottom:8px">共 ${data.total || 0} 部 · 第 ${data.page || 1}/${data.totalPages || 1} 页</div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>作品</th><th>角色数</th><th>状态</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.name || "")}<div class="mono meta">${escapeHtml(row.id || "")}</div></td>
                  <td>${escapeHtml(String(row.count ?? 0))}</td>
                  <td>${row.blocked ? `<span class="badge warn">已屏蔽</span>` : `<span class="badge">正常</span>`}</td>
                  <td>
                    ${row.blocked
                      ? `<button type="button" data-unblock="${escapeHtml(row.id)}">解除屏蔽</button>`
                      : `<button type="button" class="danger" data-block="${escapeHtml(row.id)}">最高级屏蔽</button>`}
                  </td>
                </tr>`).join("") : `<tr><td colspan="4">暂无数据</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="chars-prev" ${state.charsPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.charsPage} / ${data.totalPages || 1}</span>
          <button type="button" id="chars-next" ${state.charsPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
        <div class="notes">最高级屏蔽写入服务端。玩家端系列列表不会再出现；角色接口返回 403；tk321 / 单作品解锁码也无法绕过。</div>
      </div>`;
    const syncQ = () => {
      state.charsQ = $("chars-q")?.value || "";
      state.charsFilter = $("chars-filter")?.value || "all";
      state.charsPage = 1;
      render();
    };
    $("chars-search")?.addEventListener("click", syncQ);
    $("chars-filter")?.addEventListener("change", syncQ);
    $("chars-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") syncQ(); });
    $("chars-refresh")?.addEventListener("click", () => render());
    $("chars-prev")?.addEventListener("click", () => { state.charsPage = Math.max(1, state.charsPage - 1); render(); });
    $("chars-next")?.addEventListener("click", () => { state.charsPage += 1; render(); });
    root.querySelectorAll("[data-block]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("最高级屏蔽该作品？任何解锁码都不能打开。")) return;
        await api("/api/content-blocks", {
          method: "POST",
          body: JSON.stringify({ kind: "series", id: btn.getAttribute("data-block"), blocked: true }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api("/api/content-blocks", {
          method: "POST",
          body: JSON.stringify({ kind: "series", id: btn.getAttribute("data-unblock"), blocked: false }),
        });
        render();
      });
    });
  }

  async function renderPrefs(root) {
    setTop("玩家偏好", "已读/主题/解锁/收藏/画泥等；可按 UID 删除。");
    const q = ($("prefs-q")?.value || state.prefsQ || "").trim();
    state.prefsQ = q;
    const data = await api(`/api/prefs?view=admin&page=${state.prefsPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="prefs-q" placeholder="搜 userId / value…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="prefs-search">搜索</button>
          <button type="button" id="prefs-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>用户</th><th>key</th><th>value</th><th>更新</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td class="mono">${escapeHtml(row.userId)}</td>
                  <td>${escapeHtml(row.key)}</td>
                  <td class="mono">${escapeHtml(String(row.value || "").slice(0, 160))}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="danger" data-uid="${escapeHtml(row.userId)}" data-key="${escapeHtml(row.key)}">删除</button></td>
                </tr>`).join("") : `<tr><td colspan="5">暂无记录</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="prefs-prev" ${state.prefsPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.prefsPage} / ${data.totalPages || 1}（${data.total || 0}）</span>
          <button type="button" id="prefs-next" ${state.prefsPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("prefs-search")?.addEventListener("click", () => {
      state.prefsQ = $("prefs-q")?.value || "";
      state.prefsPage = 1;
      render();
    });
    $("prefs-q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.prefsQ = $("prefs-q")?.value || "";
        state.prefsPage = 1;
        render();
      }
    });
    $("prefs-refresh")?.addEventListener("click", () => render());
    $("prefs-prev")?.addEventListener("click", () => { state.prefsPage = Math.max(1, state.prefsPage - 1); render(); });
    $("prefs-next")?.addEventListener("click", () => { state.prefsPage += 1; render(); });
    root.querySelectorAll("[data-uid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除该偏好记录？")) return;
        const uid = btn.getAttribute("data-uid");
        const key = btn.getAttribute("data-key");
        await api(`/api/prefs?userId=${encodeURIComponent(uid)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        render();
      });
    });
  }

  function renderMap(root) {
    setTop("能力地图", "哪些能管、哪些不能管——按模块对照。");
    const rows = [
      ["画师串交流", "市场/上架/购买/收益", "删除、强制下架、屏蔽打码", "可管", "#trade"],
      ["留言板", "全服聊天", "删单条、清空", "可管", "#board"],
      ["资讯", "站点教程资讯", "发帖/草稿/发布/删", "可管", "#news"],
      ["画师库", "官方画师串检索", "分页搜索；最高级屏蔽", "可管", "#artists"],
      ["角色库", "作品角色系列", "按作品搜索；最高级屏蔽（解锁码无效）", "可管", "#characters"],
      ["玩家偏好", "版本已读 / 兑换码痕迹", "查询、删除", "可管", "#prefs"],
      ["画泥经济", "商店/抽奖/交易花泥", "余额在玩家本地+KV", "不可信管", ""],
      ["标签库", "tags.json", "静态文件，无 API CRUD", "仓库维护", ""],
      ["举报审核", "—", "暂无独立举报队列", "未建", ""],
      ["创意工坊", "—", "本游戏未接入", "—", ""],
    ];
    root.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>模块</th><th>玩家侧</th><th>后台能做什么</th><th>状态</th></tr></thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td>${r[4] ? `<a href="${r[4]}">${escapeHtml(r[0])}</a>` : escapeHtml(r[0])}</td>
                  <td>${escapeHtml(r[1])}</td>
                  <td>${escapeHtml(r[2])}</td>
                  <td><span class="badge">${escapeHtml(r[3])}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function bindShell() {
    $("btn-login")?.addEventListener("click", login);
    $("admin-key")?.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
    $("btn-logout")?.addEventListener("click", logout);
    $("btn-reload")?.addEventListener("click", () => render());
    $("nav")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-route]");
      if (!btn) return;
      go(btn.getAttribute("data-route"));
    });
    window.addEventListener("hashchange", () => {
      routeFromHash();
      if (adminKey) render();
    });
  }

  async function boot() {
    bindShell();
    routeFromHash();
    if (!adminKey) {
      showLogin("");
      return;
    }
    try {
      await verifyAuth();
      showApp();
      render();
    } catch (_) {
      setKey("");
      showLogin("请重新登录");
    }
  }

  boot();
})();
