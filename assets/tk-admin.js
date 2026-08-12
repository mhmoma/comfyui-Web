(function () {
  "use strict";

  const KEY_STORE = "comfyui_admin_key"; // localStorage：刷新不掉登录
  /** 素材站（画师/角色/资讯/登录探针） */
  const ASSET_BASE = "https://comfyui-web-89u.pages.dev";
  /** 游戏云端（公告/留言/交易/偏好/玩家画师串） */
  const CLOUD_BASE = "https://tk-game-cloud.pages.dev";

  const MODULES = [
    { id: "overview", label: "总览", group: "概览" },
    { id: "users", label: "用户档案", group: "用户管理" },
    { id: "reads", label: "已读状态", group: "用户管理" },
    { id: "player-artists", label: "玩家画师串", group: "用户管理" },
    { id: "economy", label: "画泥经济", group: "经济管理" },
    { id: "prefs", label: "偏好明细", group: "经济管理" },
    { id: "notice", label: "公告", group: "社区" },
    { id: "trade", label: "画师串交流", group: "社区" },
    { id: "board", label: "留言板", group: "社区" },
    { id: "news", label: "资讯", group: "素材库" },
    { id: "artists", label: "画师库", group: "素材库" },
    { id: "characters", label: "角色库", group: "素材库" },
    { id: "map", label: "能力地图", group: "概览" },
  ];

  const CLOUD_PREFIXES = [
    "/api/announcements",
    "/api/board",
    "/api/artist-trade",
    "/api/prefs",
    "/api/player-artists",
    "/api/admin/overview",
    "/api/admin/players",
  ];

  let adminKey = localStorage.getItem(KEY_STORE) || "";
  let route = "overview";
  const state = {
    boardPage: 1,
    noticePage: 1,
    tradePage: 1,
    tradeStatus: "active",
    prefsPage: 1,
    prefsQ: "",
    prefsKey: "",
    usersPage: 1,
    usersQ: "",
    usersDetail: "",
    economyPage: 1,
    economyQ: "",
    economyDetail: "",
    readsPage: 1,
    readsQ: "",
    readsKey: "seen_version",
    paPage: 1,
    paQ: "",
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
    const groups = [];
    MODULES.forEach((m) => {
      const g = m.group || "其他";
      if (!groups.includes(g)) groups.push(g);
    });
    nav.innerHTML = groups.map((g) => {
      const items = MODULES.filter((m) => (m.group || "其他") === g);
      return `
        <div class="nav-group">
          <div class="nav-group-title">${escapeHtml(g)}</div>
          ${items.map((m) =>
            `<button type="button" data-route="${m.id}" class="${route === m.id ? "active" : ""}">${escapeHtml(m.label)}</button>`
          ).join("")}
        </div>`;
    }).join("");
  }

  async function render() {
    renderNav();
    const root = $("view");
    if (!root) return;
    root.innerHTML = `<div class="panel meta">加载中…</div>`;
    try {
      if (route === "overview") await renderOverview(root);
      else if (route === "users") await renderUsers(root);
      else if (route === "reads") await renderReads(root);
      else if (route === "economy") await renderEconomy(root);
      else if (route === "player-artists") await renderPlayerArtists(root);
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
    setTop("总览", "用户 / 经济走新云端库；素材库仍在正式站。");
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
      { href: "users", k: "云端用户", v: c.users?.total ?? "—", s: "有偏好记录的玩家" },
      { href: "economy", k: "画泥持有", v: c.economy?.holders ?? "—", s: `全服余额合计 ${c.economy?.mudSum ?? "—"}` },
      { href: "player-artists", k: "玩家画师串", v: c.playerArtists?.total ?? "—", s: "云端持久封面" },
      { href: "notice", k: "当前公告", v: c.notice?.active ? "有" : (cloud ? "无" : "—"), s: "游戏顶栏" },
      { href: "trade", k: "画师串在售", v: c.trade?.active ?? "—", s: `下架 ${c.trade?.off ?? 0} · 打码 ${c.trade?.imageBlocked ?? 0}` },
      { href: "board", k: "留言条数", v: c.board?.total ?? "—", s: "可删 / 清空" },
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

  async function renderUsers(root) {
    setTop("用户档案", "按玩家汇总主题、已读、解锁、画泥；点开可改单项或清空档案。");
    if (state.usersDetail) {
      await renderUserDetail(root, state.usersDetail);
      return;
    }
    const q = (state.usersQ || "").trim();
    const data = await api(`/api/admin/players?mode=users&page=${state.usersPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="users-q" placeholder="搜 userId…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="users-search">搜索</button>
          <button type="button" id="users-refresh">刷新</button>
        </div>
        <p class="meta">共 ${data.total || 0} 名有云端记录的玩家</p>
        <div class="table-wrap">
          <table class="admin">
            <thead>
              <tr>
                <th>用户</th><th>主题</th><th>日志已读</th><th>画泥</th><th>解锁</th><th>收藏标签</th><th>画师串</th><th>更新</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const s = row.summary || {};
                return `<tr>
                  <td class="mono">${escapeHtml(row.userId)}</td>
                  <td>${escapeHtml(s.theme || "—")}</td>
                  <td class="mono">${escapeHtml(s.seenVersion || "—")}</td>
                  <td><strong>${escapeHtml(String(s.mudBalance ?? 0))}</strong></td>
                  <td>${escapeHtml(String(s.unlockedCount ?? 0))}</td>
                  <td>${escapeHtml(String(s.favTagCount ?? 0))}</td>
                  <td>${escapeHtml(String(row.artistCount ?? 0))}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="primary" data-open-user="${escapeHtml(row.userId)}">详情</button></td>
                </tr>`;
              }).join("") : `<tr><td colspan="9">暂无用户</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="users-prev" ${state.usersPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.usersPage} / ${data.totalPages || 1}</span>
          <button type="button" id="users-next" ${state.usersPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("users-search")?.addEventListener("click", () => {
      state.usersQ = $("users-q")?.value || "";
      state.usersPage = 1;
      render();
    });
    $("users-q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.usersQ = $("users-q")?.value || "";
        state.usersPage = 1;
        render();
      }
    });
    $("users-refresh")?.addEventListener("click", () => render());
    $("users-prev")?.addEventListener("click", () => { state.usersPage = Math.max(1, state.usersPage - 1); render(); });
    $("users-next")?.addEventListener("click", () => { state.usersPage += 1; render(); });
    root.querySelectorAll("[data-open-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.usersDetail = btn.getAttribute("data-open-user") || "";
        render();
      });
    });
  }

  function prefGroupsHtml(prefs, groups, meta) {
    const order = [
      ["reads", "已读状态"],
      ["profile", "界面与进度"],
      ["economy", "画泥经济"],
      ["other", "其他"],
    ];
    const matchGroup = (key, gid) => {
      const g = prefs[key]?.group || meta?.[key]?.group || "other";
      if (gid === "profile") return g === "profile" || g === "progress";
      return g === gid;
    };
    return order.map(([gid, title]) => {
      const fromBag = Object.keys(prefs).filter((k) => matchGroup(k, gid));
      const known = groups?.[gid] || [];
      const list = Array.from(new Set([...known, ...fromBag]));
      if (!list.length) return "";
      return `
        <div class="detail-block">
          <h3>${escapeHtml(title)}</h3>
          <div class="table-wrap">
            <table class="admin">
              <thead><tr><th>字段</th><th>说明</th><th>值</th><th></th></tr></thead>
              <tbody>
                ${list.map((key) => {
                  const metaRow = meta?.[key] || {};
                  const row = prefs[key] || {};
                  const label = row.label || metaRow.label || key;
                  const hint = row.hint || metaRow.hint || "";
                  const val = String(row.value ?? "");
                  return `<tr>
                    <td><strong>${escapeHtml(label)}</strong><div class="meta mono">${escapeHtml(key)}</div></td>
                    <td class="meta">${escapeHtml(hint)}</td>
                    <td>
                      <textarea class="pref-edit mono" data-pref-key="${escapeHtml(key)}" rows="${val.length > 80 ? 4 : 2}">${escapeHtml(val)}</textarea>
                    </td>
                    <td class="stack-btns">
                      <button type="button" class="primary" data-save-pref="${escapeHtml(key)}">保存</button>
                      <button type="button" class="danger" data-del-pref="${escapeHtml(key)}">删除</button>
                    </td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }).join("");
  }

  async function renderUserDetail(root, userId) {
    setTop("用户详情", userId);
    const data = await api(`/api/admin/players?userId=${encodeURIComponent(userId)}`);
    const s = data.summary || {};
    const prefs = data.prefs || {};
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <button type="button" id="user-back">← 返回列表</button>
          <button type="button" class="danger" id="user-wipe">清空该用户全部偏好</button>
          <button type="button" class="warn" id="user-wipe-all">清空偏好 + 画师串</button>
        </div>
        <div class="summary-grid">
          <div class="summary-card"><div class="k">主题</div><div class="v">${escapeHtml(s.theme || "—")}</div></div>
          <div class="summary-card"><div class="k">更新日志已读</div><div class="v mono">${escapeHtml(s.seenVersion || "—")}</div></div>
          <div class="summary-card"><div class="k">画泥</div><div class="v">${escapeHtml(String(s.mudBalance ?? 0))}</div></div>
          <div class="summary-card"><div class="k">已购装扮</div><div class="v">${escapeHtml(String(s.mudOwnedCount ?? 0))}</div></div>
          <div class="summary-card"><div class="k">解锁作品</div><div class="v">${escapeHtml(String(s.unlockedCount ?? 0))}</div></div>
          <div class="summary-card"><div class="k">玩家画师串</div><div class="v">${escapeHtml(String(data.artistCount ?? 0))}</div></div>
        </div>
        ${prefGroupsHtml(prefs, data.groups, data.meta)}
      </div>`;
    $("user-back")?.addEventListener("click", () => { state.usersDetail = ""; render(); });
    $("user-wipe")?.addEventListener("click", async () => {
      if (!confirm(`清空 ${userId} 的全部偏好？`)) return;
      await api("/api/admin/players", {
        method: "POST",
        body: JSON.stringify({ action: "wipe_user", userId }),
      });
      state.usersDetail = "";
      render();
    });
    $("user-wipe-all")?.addEventListener("click", async () => {
      if (!confirm(`清空 ${userId} 的偏好 AND 玩家画师串？不可恢复`)) return;
      await api("/api/admin/players", {
        method: "POST",
        body: JSON.stringify({ action: "wipe_user", userId, wipeArtists: true }),
      });
      state.usersDetail = "";
      render();
    });
    root.querySelectorAll("[data-save-pref]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-save-pref");
        const ta = Array.from(root.querySelectorAll("textarea[data-pref-key]"))
          .find((el) => el.getAttribute("data-pref-key") === key);
        await api("/api/admin/players", {
          method: "POST",
          body: JSON.stringify({ action: "set_pref", userId, key, value: ta?.value ?? "" }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-del-pref]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-del-pref");
        if (!confirm(`删除字段 ${key}？`)) return;
        await api(`/api/admin/players?userId=${encodeURIComponent(userId)}&key=${encodeURIComponent(key)}`, { method: "DELETE" });
        render();
      });
    });
  }

  async function renderEconomy(root) {
    setTop("画泥经济", "按余额排序；可调整余额、已购、装备、兑换码痕迹。");
    if (state.economyDetail) {
      await renderEconomyDetail(root, state.economyDetail);
      return;
    }
    const q = (state.economyQ || "").trim();
    const data = await api(`/api/admin/players?mode=economy&page=${state.economyPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    const st = data.stats || {};
    root.innerHTML = `
      <div class="summary-grid">
        <div class="summary-card"><div class="k">持有人数</div><div class="v">${escapeHtml(String(st.holders ?? 0))}</div></div>
        <div class="summary-card"><div class="k">全服画泥合计</div><div class="v">${escapeHtml(String(st.mudSum ?? 0))}</div></div>
        <div class="summary-card"><div class="k">人均（持有者）</div><div class="v">${escapeHtml(String(st.avg ?? 0))}</div></div>
      </div>
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="eco-q" placeholder="搜 userId / 余额…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="eco-search">搜索</button>
          <button type="button" id="eco-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead>
              <tr><th>用户</th><th>余额</th><th>已购</th><th>兑换码数</th><th>今日领泥</th><th>更新</th><th></th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const day = row.drawDay && typeof row.drawDay === "object"
                  ? `${row.drawDay.day || "—"} / ${row.drawDay.earned ?? 0}`
                  : "—";
                return `<tr>
                  <td class="mono">${escapeHtml(row.userId)}</td>
                  <td><strong>${escapeHtml(String(row.mudBalance ?? 0))}</strong></td>
                  <td>${escapeHtml(String(row.mudOwnedCount ?? 0))}</td>
                  <td>${escapeHtml(String(row.codesCount ?? 0))}</td>
                  <td class="meta">${escapeHtml(day)}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="primary" data-eco-user="${escapeHtml(row.userId)}">调整</button></td>
                </tr>`;
              }).join("") : `<tr><td colspan="7">暂无经济记录</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="eco-prev" ${state.economyPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.economyPage} / ${data.totalPages || 1}</span>
          <button type="button" id="eco-next" ${state.economyPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("eco-search")?.addEventListener("click", () => {
      state.economyQ = $("eco-q")?.value || "";
      state.economyPage = 1;
      render();
    });
    $("eco-q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.economyQ = $("eco-q")?.value || "";
        state.economyPage = 1;
        render();
      }
    });
    $("eco-refresh")?.addEventListener("click", () => render());
    $("eco-prev")?.addEventListener("click", () => { state.economyPage = Math.max(1, state.economyPage - 1); render(); });
    $("eco-next")?.addEventListener("click", () => { state.economyPage += 1; render(); });
    root.querySelectorAll("[data-eco-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.economyDetail = btn.getAttribute("data-eco-user") || "";
        render();
      });
    });
  }

  async function renderEconomyDetail(root, userId) {
    setTop("经济调整", userId);
    const data = await api(`/api/admin/players?userId=${encodeURIComponent(userId)}`);
    const prefs = data.prefs || {};
    const bal = prefs.mud_balance?.value || "0";
    const owned = prefs.mud_owned?.value || "[]";
    const equip = prefs.mud_equip?.value || "{}";
    const codes = prefs.mud_codes?.value || "";
    const draw = prefs.mud_draw_day?.value || "{}";
    const ach = prefs.mud_ach_show?.value || "{}";
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <button type="button" id="eco-back">← 返回经济榜</button>
          <button type="button" data-go-user="${escapeHtml(userId)}">打开完整用户档案</button>
        </div>
        <div class="form-grid">
          <label>画泥余额
            <input id="eco-bal" type="number" min="0" step="1" value="${escapeHtml(bal)}">
          </label>
          <label>已购装扮 JSON 数组
            <textarea id="eco-owned" class="mono" rows="4">${escapeHtml(owned)}</textarea>
          </label>
          <label>当前装备 JSON
            <textarea id="eco-equip" class="mono" rows="4">${escapeHtml(equip)}</textarea>
          </label>
          <label>已用兑换码（逗号分隔）
            <textarea id="eco-codes" class="mono" rows="2">${escapeHtml(codes)}</textarea>
          </label>
          <label>每日领泥 JSON
            <textarea id="eco-draw" class="mono" rows="2">${escapeHtml(draw)}</textarea>
          </label>
          <label>成就展示 JSON
            <textarea id="eco-ach" class="mono" rows="2">${escapeHtml(ach)}</textarea>
          </label>
        </div>
        <div class="toolbar">
          <button type="button" class="primary" id="eco-save">保存经济数据</button>
          <button type="button" class="warn" id="eco-zero">余额清零</button>
        </div>
      </div>`;
    $("eco-back")?.addEventListener("click", () => { state.economyDetail = ""; render(); });
    root.querySelector("[data-go-user]")?.addEventListener("click", () => {
      state.economyDetail = "";
      state.usersDetail = userId;
      go("users");
    });
    $("eco-zero")?.addEventListener("click", () => { if ($("eco-bal")) $("eco-bal").value = "0"; });
    $("eco-save")?.addEventListener("click", async () => {
      let mudOwned = $("eco-owned")?.value || "[]";
      let mudEquip = $("eco-equip")?.value || "{}";
      let mudDrawDay = $("eco-draw")?.value || "{}";
      try { mudOwned = JSON.parse(mudOwned); } catch (_) { alert("已购 JSON 无效"); return; }
      try { mudEquip = JSON.parse(mudEquip); } catch (_) { alert("装备 JSON 无效"); return; }
      try { mudDrawDay = JSON.parse(mudDrawDay); } catch (_) { alert("每日领泥 JSON 无效"); return; }
      await api("/api/admin/players", {
        method: "POST",
        body: JSON.stringify({
          action: "set_economy",
          userId,
          mudBalance: Number($("eco-bal")?.value || 0),
          mudOwned,
          mudEquip,
          mudCodes: $("eco-codes")?.value || "",
          mudDrawDay,
        }),
      });
      await api("/api/admin/players", {
        method: "POST",
        body: JSON.stringify({
          action: "set_pref",
          userId,
          key: "mud_ach_show",
          value: $("eco-ach")?.value || "{}",
        }),
      });
      alert("已保存");
      render();
    });
  }

  async function renderReads(root) {
    setTop("已读状态", "更新日志 / 公告 / 留言已读；可按类型筛选并删除异常记录。");
    const q = (state.readsQ || "").trim();
    const key = state.readsKey || "seen_version";
    const data = await api(`/api/admin/players?mode=reads&key=${encodeURIComponent(key)}&page=${state.readsPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    const keys = data.readKeys || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar wrap">
          <select id="reads-key">
            ${keys.map((k) => `<option value="${escapeHtml(k.key)}" ${k.key === key ? "selected" : ""}>${escapeHtml(k.label)} (${escapeHtml(k.key)})</option>`).join("")}
          </select>
          <input class="grow" id="reads-q" placeholder="搜 userId / value…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="reads-search">搜索</button>
          <button type="button" id="reads-refresh">刷新</button>
        </div>
        <p class="meta">当前：${escapeHtml(data.key || key)} · ${data.total || 0} 条</p>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>用户</th><th>类型</th><th>值</th><th>更新</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td class="mono">${escapeHtml(row.userId)}</td>
                  <td>${escapeHtml(row.label || row.key)}</td>
                  <td class="mono">${escapeHtml(String(row.value || "").slice(0, 120))}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td class="stack-btns">
                    <button type="button" data-open-user="${escapeHtml(row.userId)}">档案</button>
                    <button type="button" class="danger" data-del-read="${escapeHtml(row.userId)}" data-key="${escapeHtml(row.key)}">删除</button>
                  </td>
                </tr>`).join("") : `<tr><td colspan="5">暂无记录</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="reads-prev" ${state.readsPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.readsPage} / ${data.totalPages || 1}</span>
          <button type="button" id="reads-next" ${state.readsPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("reads-key")?.addEventListener("change", () => {
      state.readsKey = $("reads-key")?.value || "seen_version";
      state.readsPage = 1;
      render();
    });
    $("reads-search")?.addEventListener("click", () => {
      state.readsQ = $("reads-q")?.value || "";
      state.readsKey = $("reads-key")?.value || state.readsKey;
      state.readsPage = 1;
      render();
    });
    $("reads-refresh")?.addEventListener("click", () => render());
    $("reads-prev")?.addEventListener("click", () => { state.readsPage = Math.max(1, state.readsPage - 1); render(); });
    $("reads-next")?.addEventListener("click", () => { state.readsPage += 1; render(); });
    root.querySelectorAll("[data-open-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.usersDetail = btn.getAttribute("data-open-user") || "";
        go("users");
      });
    });
    root.querySelectorAll("[data-del-read]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除该已读记录？")) return;
        const uid = btn.getAttribute("data-del-read");
        const k = btn.getAttribute("data-key");
        await api(`/api/admin/players?userId=${encodeURIComponent(uid)}&key=${encodeURIComponent(k)}`, { method: "DELETE" });
        render();
      });
    });
  }

  async function renderPlayerArtists(root) {
    setTop("玩家画师串", "云端持久存档；可按用户/名称搜索并删除单条或整户。");
    const q = (state.paQ || "").trim();
    const data = await api(`/api/player-artists?view=admin&page=${state.paPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="pa-q" placeholder="搜 userId / 名称 / slug…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="pa-search">搜索</button>
          <button type="button" id="pa-refresh">刷新</button>
        </div>
        <p class="meta">共 ${data.total || 0} 条</p>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>封面</th><th>用户</th><th>名称</th><th>slug</th><th>来源</th><th>更新</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const thumb = row.hasThumb && row.thumb_url
                  ? (String(row.thumb_url).startsWith("data:")
                    ? `<img class="thumb" src="${escapeHtml(row.thumb_url)}" alt="">`
                    : `<img class="thumb" src="${escapeHtml(row.thumb_url)}" alt="" loading="lazy">`)
                  : `<span class="meta">无图</span>`;
                const src = [
                  row.fromTrade ? "交易" : "",
                  row.fromStyle ? "收藏风格" : "",
                ].filter(Boolean).join(" · ") || "自定义";
                return `<tr>
                  <td>${thumb}</td>
                  <td class="mono">${escapeHtml(row.userId)}</td>
                  <td>${escapeHtml(row.name || "—")}</td>
                  <td class="mono">${escapeHtml(row.slug || "")}</td>
                  <td class="meta">${escapeHtml(src)}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updated_at))}</td>
                  <td class="stack-btns">
                    <button type="button" data-open-user="${escapeHtml(row.userId)}">档案</button>
                    <button type="button" class="danger" data-del-pa="${escapeHtml(row.userId)}" data-slug="${escapeHtml(row.slug || "")}">删条</button>
                    <button type="button" class="warn" data-wipe-pa="${escapeHtml(row.userId)}">清空该用户</button>
                  </td>
                </tr>`;
              }).join("") : `<tr><td colspan="7">暂无玩家画师串</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="pa-prev" ${state.paPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.paPage} / ${data.totalPages || 1}</span>
          <button type="button" id="pa-next" ${state.paPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    $("pa-search")?.addEventListener("click", () => {
      state.paQ = $("pa-q")?.value || "";
      state.paPage = 1;
      render();
    });
    $("pa-q")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.paQ = $("pa-q")?.value || "";
        state.paPage = 1;
        render();
      }
    });
    $("pa-refresh")?.addEventListener("click", () => render());
    $("pa-prev")?.addEventListener("click", () => { state.paPage = Math.max(1, state.paPage - 1); render(); });
    $("pa-next")?.addEventListener("click", () => { state.paPage += 1; render(); });
    root.querySelectorAll("[data-open-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.usersDetail = btn.getAttribute("data-open-user") || "";
        go("users");
      });
    });
    root.querySelectorAll("[data-del-pa]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除该条画师串？")) return;
        await api("/api/player-artists?view=admin", {
          method: "DELETE",
          body: JSON.stringify({
            admin: true,
            userId: btn.getAttribute("data-del-pa"),
            slug: btn.getAttribute("data-slug"),
          }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-wipe-pa]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-wipe-pa");
        if (!confirm(`清空用户 ${uid} 的全部玩家画师串？`)) return;
        await api("/api/player-artists?view=admin", {
          method: "DELETE",
          body: JSON.stringify({ admin: true, userId: uid }),
        });
        render();
      });
    });
  }

  async function renderPrefs(root) {
    setTop("偏好明细", "原始 key/value 表（排障用）。日常请用「用户档案 / 经济 / 已读」。");
    const q = ($("prefs-q")?.value || state.prefsQ || "").trim();
    state.prefsQ = q;
    const keyFilter = state.prefsKey || "";
    const data = await api(`/api/prefs?view=admin&page=${state.prefsPage}&q=${encodeURIComponent(q)}${keyFilter ? `&key=${encodeURIComponent(keyFilter)}` : ""}`);
    const rows = data.rows || [];
    const allowed = data.allowedKeys || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar wrap">
          <select id="prefs-key">
            <option value="">全部 key</option>
            ${allowed.map((k) => `<option value="${escapeHtml(k)}" ${k === keyFilter ? "selected" : ""}>${escapeHtml(k)}</option>`).join("")}
          </select>
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
    $("prefs-key")?.addEventListener("change", () => {
      state.prefsKey = $("prefs-key")?.value || "";
      state.prefsPage = 1;
      render();
    });
    $("prefs-search")?.addEventListener("click", () => {
      state.prefsQ = $("prefs-q")?.value || "";
      state.prefsKey = $("prefs-key")?.value || "";
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
    setTop("能力地图", "按模块对照：玩家侧能力 ↔ 后台能做什么。");
    const rows = [
      ["用户档案", "主题/解锁/收藏/开关", "列表、详情编辑、清空档案", "可管", "#users"],
      ["已读状态", "更新日志/公告/留言已读", "按类型筛选、删除", "可管", "#reads"],
      ["画泥经济", "余额/装扮/装备/兑换码/每日领泥", "榜单、改余额、改背包", "可管", "#economy"],
      ["玩家画师串", "自定义画师串+封面", "搜索、删条、清空用户", "可管", "#player-artists"],
      ["偏好明细", "全部 prefs 原始表", "排障删除", "可管", "#prefs"],
      ["画师串交流", "市场买卖", "删/下架/打码", "可管", "#trade"],
      ["留言板", "全服聊天", "删单条、清空", "可管", "#board"],
      ["公告", "游戏顶栏公告", "编辑发布", "可管", "#notice"],
      ["资讯", "站点教程", "发帖草稿发布", "可管", "#news"],
      ["画师库/角色库", "官方检索素材", "搜索、最高级屏蔽", "可管", "#artists"],
      ["举报审核", "—", "暂无独立队列", "未建", ""],
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
