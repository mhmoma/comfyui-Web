(function () {
  "use strict";

  const KEY_STORE = "comfyui_admin_key"; // localStorage：刷新不掉登录
  const MODULES = [
    { id: "overview", label: "总览" },
    { id: "trade", label: "画师串交流" },
    { id: "board", label: "留言板" },
    { id: "news", label: "资讯" },
    { id: "artists", label: "画师库" },
    { id: "characters", label: "角色库" },
    { id: "prefs", label: "玩家偏好" },
    { id: "map", label: "能力地图" },
  ];

  let adminKey = localStorage.getItem(KEY_STORE) || "";
  let route = "overview";
  const state = {
    boardPage: 1,
    tradePage: 1,
    tradeStatus: "active",
    prefsPage: 1,
    artistsPage: 1,
    charsSeries: "",
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

  async function api(path, opts = {}) {
    const res = await fetch(path, {
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
    // articles/auth 是现成探针
    await api("/api/articles/auth");
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
      showLogin(err.status === 403 ? "密钥错误" : (err.message || "登录失败"));
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
    setTop("总览", "各模块库存一眼看完，点卡片进入对应管理。");
    const data = await api("/api/admin/overview");
    const m = data.modules || {};
    const cards = [
      { href: "trade", k: "画师串在售", v: m.trade?.active ?? "—", s: `下架 ${m.trade?.off ?? 0} · 打码 ${m.trade?.imageBlocked ?? 0}` },
      { href: "board", k: "留言条数", v: m.board?.total ?? "—", s: "可删 / 清空" },
      { href: "news", k: "已发资讯", v: m.news?.published ?? "—", s: `草稿 ${m.news?.draft ?? 0}` },
      { href: "artists", k: "画师库", v: m.artists?.total ?? "—", s: "公开检索库" },
      { href: "characters", k: "角色数", v: m.characters?.characters ?? "—", s: `系列 ${m.characters?.series ?? 0}` },
      { href: "prefs", k: "偏好记录", v: m.prefs?.total ?? "—", s: "seen_version / mud_codes" },
    ];
    root.innerHTML = `
      <div class="grid-cards">
        ${cards.map((c) => `
          <button type="button" class="stat-card" data-go="${c.href}">
            <div class="k">${escapeHtml(c.k)}</div>
            <div class="v">${escapeHtml(String(c.v))}</div>
            <div class="s">${escapeHtml(c.s)}</div>
          </button>`).join("")}
      </div>
      <div class="panel notes">
        <strong>说明</strong>
        <ul>${(data.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </div>`;
    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => go(el.getAttribute("data-go")));
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
            const media = row.image
              ? `<img class="thumb" src="${escapeHtml(row.image)}" alt="">`
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
                    <button type="button" class="warn" data-block="${escapeHtml(row.id)}" ${blocked || (!row.image && !row.hasImage) ? "disabled" : ""}>屏蔽图片</button>
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
    setTop("画师库", "公开画师串检索库；可看库存与抽样，重灌请走 seed 脚本。");
    let status = { artists: "—" };
    try {
      status = await api("/api/artists/seed?action=status", { method: "POST", body: "{}" });
    } catch (_) {}
    const list = await fetch(`/api/artists/list?page=${state.artistsPage}&limit=40`).then((r) => r.json());
    const rows = list.results || list.artists || list.rows || list.data || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <span class="meta grow">库内约 ${status.artists ?? "—"} 条 · 本页 ${rows.length}</span>
          <button type="button" id="artists-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>名称</th><th>触发词</th><th>热度</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.name || row.slug || "")}</td>
                  <td class="mono">${escapeHtml(String(row.trigger_text || row.trigger || "").slice(0, 120))}</td>
                  <td>${escapeHtml(String(row.count ?? row.score ?? ""))}</td>
                </tr>`).join("") : `<tr><td colspan="3">暂无数据</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="artists-prev" ${state.artistsPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">第 ${state.artistsPage} 页</span>
          <button type="button" id="artists-next">下一页</button>
        </div>
      </div>`;
    $("artists-refresh")?.addEventListener("click", () => render());
    $("artists-prev")?.addEventListener("click", () => { state.artistsPage = Math.max(1, state.artistsPage - 1); render(); });
    $("artists-next")?.addEventListener("click", () => { state.artistsPage += 1; render(); });
  }

  async function renderCharacters(root) {
    setTop("角色库", "系列与角色库存；详细维护仍以 seed 灌库为主。");
    let status = {};
    try {
      status = await api("/api/characters/seed?action=status", { method: "POST", body: "{}" });
    } catch (_) {}
    const seriesRaw = await fetch("/api/characters/series").then((r) => r.json()).catch(() => []);
    const seriesRows = Array.isArray(seriesRaw)
      ? seriesRaw
      : (seriesRaw.series || seriesRaw.rows || seriesRaw.data || []);
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <span class="meta grow">系列 ${status.series ?? seriesRows.length ?? "—"} · 角色 ${status.characters ?? "—"}</span>
          <button type="button" id="chars-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>系列 ID</th><th>名称</th><th>数量</th></tr></thead>
            <tbody>
              ${seriesRows.length ? seriesRows.map((row) => `
                <tr>
                  <td class="mono">${escapeHtml(row.id || "")}</td>
                  <td>${escapeHtml(row.name || "")}</td>
                  <td>${escapeHtml(String(row.count ?? ""))}</td>
                </tr>`).join("") : `<tr><td colspan="3">暂无系列</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
    $("chars-refresh")?.addEventListener("click", () => render());
  }

  async function renderPrefs(root) {
    setTop("玩家偏好", "seen_version / mud_codes；可按 UID 删除，防止异常占用。");
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
      ["画师库", "官方画师串检索", "看库存；灌库用 seed", "只读+运维", "#artists"],
      ["角色库", "作品角色系列", "看库存；灌库用 seed", "只读+运维", "#characters"],
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
