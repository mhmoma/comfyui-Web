(function () {
  "use strict";

  /** 运营台界面版本：改后台 UI 时务必递增，方便确认线上是否已部署 */
  const ADMIN_UI_VERSION = "1.29";

  const KEY_STORE = "comfyui_admin_key"; // localStorage：刷新不掉登录
  /** 素材站（画师/角色/资讯/登录探针） */
  const ASSET_BASE = "https://comfyui-web-89u.pages.dev";
  /** 游戏云端（公告/留言/交易/偏好/玩家画师串） */
  const CLOUD_BASE = "https://tk-game-cloud.pages.dev";

  let assetAuthOk = false;

  const MODULES = [
    { id: "overview", label: "总览", group: "概览" },
    { id: "audit", label: "审计", group: "概览" },
    { id: "map", label: "能力地图", group: "概览" },
    { id: "users", label: "用户档案", group: "人" },
    { id: "reads", label: "已读状态", group: "人" },
    { id: "player-artists", label: "玩家画师串", group: "人" },
    { id: "economy", label: "画泥经济", group: "钱" },
    { id: "prefs", label: "偏好明细", group: "钱" },
    { id: "notice", label: "公告", group: "社区" },
    { id: "trade", label: "画师串交流", group: "社区" },
    { id: "board", label: "留言板", group: "社区" },
    { id: "catalog", label: "素材入库", group: "素材" },
    { id: "artists", label: "画师库", group: "素材" },
    { id: "characters", label: "角色库", group: "素材" },
    { id: "news", label: "资讯", group: "素材" },
  ];

  const CLOUD_PREFIXES = [
    "/api/announcements",
    "/api/board",
    "/api/artist-trade",
    "/api/prefs",
    "/api/player-artists",
    "/api/admin/overview",
    "/api/admin/players",
    "/api/admin/audit",
    "/api/admin/media-upload",
    "/api/player-blocks",
  ];

  let adminKey = localStorage.getItem(KEY_STORE) || "";
  let route = "overview";
  const state = {
    boardPage: 1,
    boardQ: "",
    boardUserId: "",
    noticePage: 1,
    tradePage: 1,
    tradeStatus: "active",
    tradeQ: "",
    tradeBlocked: false,
    auditPage: 1,
    auditQ: "",
    auditAction: "",
    prefsPage: 1,
    prefsQ: "",
    prefsKey: "",
    usersPage: 1,
    usersQ: "",
    usersDetail: "",
    usersAllowTab: "series",
    economyPage: 1,
    economyQ: "",
    economyDetail: "",
    economyLedgerPage: 1,
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

  let seriesNameCache = null;
  async function ensureSeriesNameMap() {
    if (seriesNameCache) return seriesNameCache;
    const map = Object.create(null);
    try {
      const list = await assetApi("/api/characters/series");
      const rows = Array.isArray(list) ? list : [];
      rows.forEach((row) => {
        const id = String(row?.id || "").trim();
        if (!id) return;
        map[id] = String(row?.name || id).trim() || id;
      });
    } catch (_) {}
    seriesNameCache = map;
    return map;
  }

  function seriesDisplayName(id, map) {
    const sid = String(id || "").trim();
    if (!sid) return "";
    if (sid === "*") return "全部作品";
    return (map && map[sid]) || sid;
  }

  function enrichSeriesText(text, map) {
    const raw = String(text || "");
    if (!raw || !map) return raw;
    return raw.replace(/\b([a-z0-9_().\-]+)\b/gi, (id) => {
      if (!map[id]) return id;
      if (map[id] === id) return id;
      return `${map[id]}（${id}）`;
    });
  }

  const PREF_LABELS = {
    seen_version: "更新日志已读",
    mud_codes: "已用兑换码",
    ui_theme: "界面主题",
    notice_seen_at: "公告已读时间",
    board_seen_at: "留言已读时间",
    notice_bar_hide: "公告条已收起",
    unlocked_series: "已解锁作品",
    show_locked_series: "仅预览锁定列表",
    show_hidden_series: "解锁硬拦截(tk18)",
    show_adult_tags: "成人标签开关",
    fav_tags: "收藏标签",
    fav_artist_data: "收藏画师",
    tag_usage: "标签使用统计",
    recent_series: "最近作品",
    mud_balance: "画泥余额",
    mud_owned: "已购装扮",
    mud_equip: "当前装备",
    mud_ach_show: "成就展示",
    mud_draw_day: "每日领泥",
    admin_stamp: "管理改动戳",
    display_name: "平台昵称",
  };
  const THEME_LABELS = { hard: "硬朗框", ink: "水墨像素", hand: "手绘本" };
  const MUD_LABELS = {
    bg_sky: "晴空蓝", bg_rose: "玫瑰粉", bg_mint: "薄荷绿", bg_violet: "葡萄紫",
    bg_sunset: "晚霞橙", bg_ink: "墨金",
    nb_gold_shine: "金边流光", nb_rainbow: "彩虹描边", nb_neon_cyan: "霓虹青",
    nb_neon_pink: "霓虹粉", nb_silver: "银辉边", nb_ink: "墨线框", nb_candy: "糖果点线", nb_double: "双线描边",
    fx_gold: "金字流光", fx_rainbow: "虹彩字", fx_neon: "霓虹脉冲", fx_sparkle: "星闪字",
    fx_fire: "焰色字", fx_ocean: "海波字",
    crown_star: "星光", crown_fire: "火焰", crown_flower: "樱花", crown_cat: "小猫",
    crown_sparkle: "闪光", crown_dragon: "小龙",
    title_newbie: "萌新画师", title_pro: "灵感捕手", title_night: "深夜炼丹",
    title_color: "调色大师", title_luck: "欧皇本皇",
  };
  const SLOT_LABELS = { nameBg: "名字底色", nameBorder: "姓名边框", nameFx: "名字闪光", crown: "头顶标识", title: "称号" };
  const FLAG_PREF_KEYS = new Set(["show_locked_series", "show_hidden_series", "show_adult_tags"]);

  function parsePrefJson(raw, fallback) {
    try { return JSON.parse(String(raw ?? "")); } catch (_) { return fallback; }
  }

  function formatPrefLocal(key, raw, seriesMap) {
    const text = String(raw ?? "");
    if (key === "ui_theme") return THEME_LABELS[text] || text || "—";
    if (FLAG_PREF_KEYS.has(key)) return (text === "1" || text === "true") ? "开" : "关";
    if (key === "mud_balance") return `${Math.max(0, Math.floor(Number(text) || 0))} 画泥`;
    if (key === "display_name") return text || "—";
    if (key === "seen_version") {
      const ver = String(text).replace(/^"|"$/g, "");
      return ver ? `已读到 v${ver}` : "未读";
    }
    if (key === "notice_bar_hide") return text ? `已收起（公告 ${text}）` : "未收起";
    if (key === "notice_seen_at" || key === "board_seen_at" || key === "admin_stamp") {
      return formatTime(text);
    }
    if (key === "mud_codes") {
      const list = text.split(",").map((s) => s.trim()).filter(Boolean);
      return list.length ? list.join("、") : "无";
    }
    if (key === "mud_owned") {
      const arr = parsePrefJson(text, []);
      if (!Array.isArray(arr) || !arr.length) return "无";
      return arr.map((id) => MUD_LABELS[id] || String(id)).join("、");
    }
    if (key === "mud_equip") {
      const obj = parsePrefJson(text, {});
      if (!obj || typeof obj !== "object") return "—";
      const parts = Object.entries(obj).filter(([, v]) => v).map(([slot, id]) => (
        `${SLOT_LABELS[slot] || slot}：${MUD_LABELS[id] || id}`
      ));
      return parts.length ? parts.join("；") : "未装备";
    }
    if (key === "unlocked_series" || key === "recent_series") {
      const arr = parsePrefJson(text, []);
      if (!Array.isArray(arr) || !arr.length) return "无";
      if (arr.includes("*")) return key === "unlocked_series" ? "全部作品" : "含全部标记";
      return arr.map((id) => {
        const label = seriesDisplayName(id, seriesMap);
        return seriesMap?.[id] && seriesMap[id] !== id ? `${label}` : label;
      }).join("、");
    }
    if (key === "fav_tags") {
      const arr = parsePrefJson(text, []);
      if (!Array.isArray(arr) || !arr.length) return "无";
      const names = arr.slice(0, 24).map((t) => {
        if (typeof t === "string") return t.replace(/^tag:/i, "").replace(/^artist:/i, "画师:");
        if (t && typeof t === "object") return t.name || t.cn || t.id || "";
        return String(t);
      }).filter(Boolean);
      return names.join("、") + (arr.length > 24 ? ` 等 ${arr.length} 个` : "");
    }
    if (key === "fav_artist_data") {
      const obj = parsePrefJson(text, {});
      const entries = Object.entries(obj || {});
      if (!entries.length) return "无";
      const names = entries.slice(0, 16).map(([k, v]) => (v && typeof v === "object" ? (v.name || v.title || k) : k));
      return `${entries.length} 位：${names.join("、")}${entries.length > 16 ? "…" : ""}`;
    }
    if (key === "tag_usage") {
      const obj = parsePrefJson(text, {});
      const entries = Object.entries(obj || {}).sort((a, b) => {
        const ca = (a[1] && typeof a[1] === "object") ? (Number(a[1].count) || 0) : (Number(a[1]) || 0);
        const cb = (b[1] && typeof b[1] === "object") ? (Number(b[1].count) || 0) : (Number(b[1]) || 0);
        return cb - ca;
      });
      if (!entries.length) return "无";
      return entries.slice(0, 12).map(([k, v]) => {
        if (v && typeof v === "object") return `${v.d || v.t || k}×${Number(v.count) || 1}`;
        return `${k}×${v}`;
      }).join("、") + (entries.length > 12 ? ` 等 ${entries.length} 项` : "");
    }
    if (key === "mud_draw_day") {
      const obj = parsePrefJson(text, null);
      if (!obj || typeof obj !== "object") return text || "—";
      const day = obj.day || obj.date || "";
      const earned = obj.earned ?? obj.n ?? obj.count;
      if (day) return `日期 ${day}${earned != null && earned !== "" ? ` · 领取 ${earned}` : ""}`;
      return text.slice(0, 120) || "—";
    }
    if (text.length > 220) return `${text.slice(0, 220)}…`;
    return text || "—";
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

  function paintAdminVersion() {
    const label = `运营台 v${ADMIN_UI_VERSION}`;
    document.querySelectorAll("[data-admin-ver]").forEach((el) => {
      el.textContent = label;
    });
    try {
      document.title = `绘画大师运营台 v${ADMIN_UI_VERSION}`;
    } catch (_) {}
  }

  function showLogin(err) {
    $("login")?.classList.remove("hidden");
    $("app")?.classList.add("hidden");
    paintAdminVersion();
    if ($("login-error")) {
      $("login-error").textContent = err || "";
      $("login-error").classList.toggle("hidden", !err);
    }
  }

  function showApp() {
    $("login")?.classList.add("hidden");
    $("app")?.classList.remove("hidden");
    paintAdminVersion();
  }

  async function verifyAuth() {
    // 游戏数据只认新云端库；素材站密钥必须另检（最高级屏蔽 / 资讯 / 入库）
    await cloudApi("/api/admin/overview");
    try {
      await assetApi("/api/articles/auth");
      assetAuthOk = true;
    } catch (_) {
      assetAuthOk = false;
    }
  }

  function assetGateHtml(feature) {
    return `<div class="panel err">
      <p><strong>素材站密钥无效</strong>：${escapeHtml(feature)}不可用。</p>
      <p class="meta">运营台登录目前只校验了云端密钥。画师库/角色库的「最高级屏蔽」写在素材站 D1，两边 ADMIN_KEY 必须相同。</p>
      <p class="meta">请确认 Cloudflare 里 comfyui-web 与 tk-game-cloud 的 ADMIN_KEY 一致后重新登录。</p>
    </div>`;
  }

  async function ensureAssetAuth() {
    if (assetAuthOk) return true;
    try {
      await assetApi("/api/articles/auth");
      assetAuthOk = true;
      return true;
    } catch (_) {
      assetAuthOk = false;
      return false;
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

  /** 社区列表 → 用户档案详情 */
  function openUser(uid) {
    const id = String(uid || "").trim();
    if (!id) return;
    state.usersDetail = id;
    go("users");
  }

  function bindOpenUser(root) {
    root?.querySelectorAll?.("[data-open-user]")?.forEach((btn) => {
      btn.addEventListener("click", () => openUser(btn.getAttribute("data-open-user")));
    });
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
      else if (route === "audit") await renderAudit(root);
      else if (route === "users") await renderUsers(root);
      else if (route === "reads") await renderReads(root);
      else if (route === "economy") await renderEconomy(root);
      else if (route === "player-artists") await renderPlayerArtists(root);
      else if (route === "notice") await renderNotice(root);
      else if (route === "board") await renderBoard(root);
      else if (route === "trade") await renderTrade(root);
      else if (route === "news") renderNews(root);
      else if (route === "catalog") await renderCatalog(root);
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
    let assetErr = "";
    try {
      cloud = await cloudApi("/api/admin/overview");
    } catch (err) {
      cloudErr = err.message || "云端总览失败";
    }
    try {
      asset = await assetApi("/api/admin/overview");
    } catch (err) {
      assetErr = err.message || "素材站总览失败";
    }

    const c = cloud?.modules || {};
    const a = asset?.modules || {};
    const h = cloud?.health || null;
    const cloudCards = [
      { href: "users", k: "云端用户", v: c.users?.total ?? "—", s: "有偏好记录" },
      { href: "economy", k: "画泥持有", v: c.economy?.holders ?? "—", s: `合计 ${c.economy?.mudSum ?? "—"}` },
      { href: "player-artists", k: "玩家画师串", v: c.playerArtists?.total ?? "—", s: "云端封面" },
      { href: "notice", k: "当前公告", v: c.notice?.active ? "有" : (cloud ? "无" : "—"), s: "游戏顶栏" },
      { href: "trade", k: "交流在售", v: c.trade?.active ?? "—", s: `下架 ${c.trade?.off ?? 0} · 打码 ${c.trade?.imageBlocked ?? 0}` },
      { href: "board", k: "留言", v: c.board?.total ?? "—", s: "社区巡查" },
      { href: "audit", k: "审计", v: c.audit?.total ?? "—", s: "运营操作" },
    ];
    const assetCards = [
      { href: "catalog", k: "素材入库", v: "入口", s: "R2 + D1 补录" },
      { href: "news", k: "已发资讯", v: a.news?.published ?? "—", s: `草稿 ${a.news?.draft ?? 0}` },
      { href: "artists", k: "画师库", v: a.artists?.total ?? "—", s: `屏蔽 ${a.artists?.blocked ?? 0}` },
      { href: "characters", k: "角色", v: a.characters?.characters ?? "—", s: `系列 ${a.characters?.series ?? 0} · 屏蔽 ${a.characters?.blocked ?? 0}` },
    ];
    const notes = [
      ...(cloud?.notes || []),
      ...(asset?.notes || []),
      "素材站：" + ASSET_BASE,
      "云端站：" + CLOUD_BASE,
      ...(cloudErr ? [`云端告警：${cloudErr}`] : []),
      ...(assetErr ? [`素材站告警：${assetErr}`] : []),
      ...(!assetAuthOk ? ["素材站密钥未通过：画师/角色最高级屏蔽不可用，请确认两边 ADMIN_KEY 一致"] : []),
    ];
    const healthTone = cloudErr ? "health-err" : (h && h.ok === false ? "health-warn" : "health-ok");
    const healthTitle = cloudErr
      ? "云端不可用"
      : (h?.ok === false ? "云端健康告警" : "云端健康正常");
    const healthLines = cloudErr
      ? [cloudErr]
      : (h?.hints || ["已连通云端 overview"]);
    const pill = (ok, text) =>
      `<span class="health-pill ${ok ? "ok" : "bad"}">${escapeHtml(text)}</span>`;
    root.innerHTML = `
      <div class="mod-stack">
        <section class="mod-section ${healthTone}">
          <div class="mod-section-head">
            <strong>${escapeHtml(healthTitle)}</strong>
            <span class="meta">tk-game-cloud</span>
          </div>
          <div class="mod-section-body">
            <ul class="notes" style="margin:0;padding-left:1.1em">${healthLines.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
            ${h ? `<div class="health-pills">
              ${pill(!!h.mediaBinding, `MEDIA ${h.mediaBinding ? "已绑" : "未绑"}`)}
              ${pill(!(h.trade?.dataUrl > 0), `交流 HTTPS ${h.trade?.https ?? "—"}`)}
              ${pill(!(h.playerArtists?.dataUrl > 0), `玩家封面 HTTPS ${h.playerArtists?.https ?? "—"}`)}
              ${pill(true, `审计 ${h.auditRows ?? "—"}`)}
            </div>` : ""}
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>云端 · 人 / 钱 / 社区</strong>
            <span class="meta">passinbox</span>
          </div>
          <div class="mod-section-body">
            <div class="grid-cards">
              ${cloudCards.map((card) => `
                <button type="button" class="stat-card" data-go="${card.href}">
                  <div class="k">${escapeHtml(card.k)}</div>
                  <div class="v">${escapeHtml(String(card.v))}</div>
                  <div class="s">${escapeHtml(card.s)}</div>
                </button>`).join("")}
            </div>
          </div>
        </section>
        <section class="mod-section ${assetErr ? "health-err" : ""}">
          <div class="mod-section-head">
            <strong>${assetErr ? "素材站不可用" : "素材站 · 库 / 资讯"}</strong>
            <span class="meta">web 账号</span>
          </div>
          <div class="mod-section-body">
            ${assetErr ? `<p class="err" style="margin:0 0 10px">${escapeHtml(assetErr)}</p>` : ""}
            <div class="grid-cards">
              ${assetCards.map((card) => `
                <button type="button" class="stat-card" data-go="${card.href}">
                  <div class="k">${escapeHtml(card.k)}</div>
                  <div class="v">${escapeHtml(String(card.v))}</div>
                  <div class="s">${escapeHtml(card.s)}</div>
                </button>`).join("")}
            </div>
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-head"><strong>说明</strong></div>
          <div class="mod-section-body notes">
            <ul>${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
          </div>
        </section>
      </div>`;
    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => go(el.getAttribute("data-go")));
    });
  }

  async function renderAudit(root) {
    setTop("审计日志", "记录运营改画泥、解锁、删交流、打码等操作。");
    const q = encodeURIComponent(state.auditQ || "");
    const act = encodeURIComponent(state.auditAction || "");
    const data = await api(`/api/admin/audit?page=${state.auditPage}&q=${q}&action=${act}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="audit-q" placeholder="搜 UID / 目标 / 动作 / 说明…" value="${escapeHtml(state.auditQ || "")}">
          <select id="audit-action" style="max-width:180px">
            <option value="">全部动作</option>
            ${[
              "add_mud", "set_mud", "grant_owned", "remove_owned", "clear_owned",
              "add_unlock", "unlock_all", "remove_unlock", "clear_unlocks",
              "wipe_user", "trade_delete", "trade_force_off", "trade_block_image",
            ].map((a) => `<option value="${a}" ${state.auditAction === a ? "selected" : ""}>${a}</option>`).join("")}
          </select>
          <button type="button" id="audit-search" class="primary">搜索</button>
          <button type="button" id="audit-refresh">刷新</button>
        </div>
        <div class="meta" style="margin-bottom:10px">共 ${data.total || 0} 条</div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>时间</th><th>动作</th><th>用户</th><th>目标</th><th>说明</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td class="meta">${escapeHtml(formatTime(row.at))}</td>
                  <td><span class="badge">${escapeHtml(row.action || "")}</span></td>
                  <td>${row.userId
                    ? `<button type="button" class="linkish" data-open-user="${escapeHtml(row.userId)}">${escapeHtml(row.userId)}</button>`
                    : "—"}</td>
                  <td class="mono">${escapeHtml(row.targetType || "")}${row.targetId ? ` · ${escapeHtml(row.targetId)}` : ""}</td>
                  <td>${escapeHtml(row.detail || "")}</td>
                </tr>`).join("") : `<tr><td colspan="5" class="meta">暂无审计记录（部署后新操作才会写入）</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="audit-prev" ${state.auditPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.auditPage} / ${data.totalPages || 1}</span>
          <button type="button" id="audit-next" ${state.auditPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
      </div>`;
    const runSearch = () => {
      state.auditQ = $("audit-q")?.value || "";
      state.auditAction = $("audit-action")?.value || "";
      state.auditPage = 1;
      render();
    };
    $("audit-search")?.addEventListener("click", runSearch);
    $("audit-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
    $("audit-action")?.addEventListener("change", runSearch);
    $("audit-refresh")?.addEventListener("click", () => render());
    $("audit-prev")?.addEventListener("click", () => { state.auditPage = Math.max(1, state.auditPage - 1); render(); });
    $("audit-next")?.addEventListener("click", () => { state.auditPage += 1; render(); });
    bindOpenUser(root);
  }

  async function renderNotice(root) {
    setTop("公告", "玩家端始终只显示「最新一条生效公告」。可先存草稿，再点发布。");
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
              <button type="button" class="primary" id="notice-publish">立即发布</button>
              <button type="button" id="notice-draft">存为草稿</button>
              <button type="button" id="notice-preview-refresh">刷新预览</button>
              <button type="button" id="notice-refresh">刷新列表</button>
            </div>
            <p class="meta" style="margin-top:8px">策略：同时只有 1 条对玩家生效；发布会自动下线旧公告。草稿不展示。勿写 script。</p>
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
                  <span class="badge ${row.active ? "" : "off"}">${row.active ? "生效中" : "草稿/下线"}</span>
                  <button type="button" data-load="${escapeHtml(row.id)}">载入预览</button>
                  ${!row.active ? `<button type="button" class="primary" data-publish="${escapeHtml(row.id)}">发布此条</button>` : ""}
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
      if (!confirm("发布后将成为唯一生效公告（旧公告自动下线）。继续？")) return;
      await api("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ action: "create", title, body }),
      });
      state.noticePage = 1;
      render();
    });
    $("notice-draft")?.addEventListener("click", async () => {
      const title = $("notice-title")?.value || "";
      const body = $("notice-body")?.value || "";
      if (!String(body).trim()) {
        alert("请填写公告正文");
        return;
      }
      await api("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ action: "draft", title, body }),
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
    root.querySelectorAll("[data-publish]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("发布此条为当前生效公告？其余将下线。")) return;
        await api("/api/announcements", {
          method: "POST",
          body: JSON.stringify({ action: "publish", id: btn.getAttribute("data-publish") }),
        });
        render();
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
    setTop("留言板", "搜索 / 按 UID 筛；删单条、删该用户全部；可禁言。");
    const q = encodeURIComponent(state.boardQ || "");
    const uid = encodeURIComponent(state.boardUserId || "");
    const data = await api(`/api/board?page=${state.boardPage}&q=${q}&userId=${uid}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="board-q" placeholder="搜内容 / 昵称 / UID…" value="${escapeHtml(state.boardQ || "")}">
          <input style="max-width:220px" id="board-uid" placeholder="精确 UID" value="${escapeHtml(state.boardUserId || "")}">
          <button type="button" class="primary" id="board-search">搜索</button>
          <button type="button" id="board-refresh">刷新</button>
          <button type="button" class="warn" id="board-del-user" ${state.boardUserId ? "" : "disabled"}>删该用户全部</button>
          <button type="button" class="danger" id="board-clear">清空全部</button>
        </div>
        <div class="meta" style="margin-bottom:10px">共 ${data.total || 0} 条 · 敏感词拦截需在云端配置 BOARD_BLOCK_WORDS</div>
        <div class="list" id="board-list">
          ${rows.length ? rows.map((row) => `
            <article class="item">
              <div class="item-head">
                <strong>${escapeHtml(row.name || "访客")}</strong>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  ${row.userId ? `<button type="button" class="warn" data-mute="${escapeHtml(row.userId)}">禁言7天</button>` : ""}
                  ${row.userId ? `<button type="button" data-unmute="${escapeHtml(row.userId)}">解禁</button>` : ""}
                  <button type="button" class="danger" data-del="${escapeHtml(row.id)}">删除</button>
                </div>
              </div>
              <div>${escapeHtml(row.text || "")}</div>
              <div class="meta">${escapeHtml(formatTime(row.at))}
                ${row.ip ? ` · IP ${escapeHtml(row.ip)}` : ""}
                ${row.userId ? ` · UID <button type="button" class="linkish" data-open-user="${escapeHtml(row.userId)}">${escapeHtml(row.userId)}</button>` : ""}
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
    const runBoardSearch = () => {
      state.boardQ = $("board-q")?.value || "";
      state.boardUserId = ($("board-uid")?.value || "").trim();
      state.boardPage = 1;
      render();
    };
    $("board-search")?.addEventListener("click", runBoardSearch);
    $("board-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runBoardSearch(); });
    $("board-uid")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runBoardSearch(); });
    $("board-refresh")?.addEventListener("click", () => render());
    $("board-del-user")?.addEventListener("click", async () => {
      const u = state.boardUserId || ($("board-uid")?.value || "").trim();
      if (!u) return alert("请先填精确 UID");
      if (!confirm(`删除用户 ${u} 的全部留言？`)) return;
      await api(`/api/board?userId=${encodeURIComponent(u)}`, { method: "DELETE" });
      render();
    });
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
    root.querySelectorAll("[data-mute]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const u = btn.getAttribute("data-mute");
        if (!confirm(`禁言 ${u} 留言 7 天？`)) return;
        await userAction(u, "mute_board", { days: 7 });
        alert("已禁言");
      });
    });
    root.querySelectorAll("[data-unmute]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await userAction(btn.getAttribute("data-unmute"), "unmute_board");
        alert("已解禁");
      });
    });
    bindOpenUser(root);
  }

  async function renderTrade(root) {
    setTop("画师串交流", "搜索卖家/标题，筛选打码；删 / 下架 / 打码。点 UID 进档案。");
    const q = encodeURIComponent(state.tradeQ || "");
    const blockedFlag = state.tradeBlocked ? "1" : "0";
    const data = await api(
      `/api/artist-trade?view=admin&status=${encodeURIComponent(state.tradeStatus)}&page=${state.tradePage}&q=${q}&imageBlocked=${blockedFlag}`
    );
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="trade-q" placeholder="搜标题 / 卖家名 / UID / 触发词…" value="${escapeHtml(state.tradeQ || "")}">
          <select id="trade-status" style="max-width:120px">
            <option value="active" ${state.tradeStatus === "active" ? "selected" : ""}>在售</option>
            <option value="off" ${state.tradeStatus === "off" ? "selected" : ""}>已下架</option>
            <option value="all" ${state.tradeStatus === "all" ? "selected" : ""}>全部</option>
          </select>
          <label class="meta" style="display:flex;align-items:center;gap:6px;white-space:nowrap">
            <input type="checkbox" id="trade-blocked" ${state.tradeBlocked ? "checked" : ""}> 仅打码
          </label>
          <button type="button" id="trade-search" class="primary">搜索</button>
          <button type="button" id="trade-refresh">刷新</button>
          <button type="button" id="trade-batch-off">批量下架</button>
          <button type="button" class="warn" id="trade-batch-block">批量打码</button>
          <button type="button" class="danger" id="trade-batch-del">批量删除</button>
        </div>
        <div class="meta" style="margin-bottom:10px">共 ${data.total || 0} 条 · 第 ${data.page || 1}/${data.totalPages || 1} 页 · 勾选后批量（最多 50）</div>
        <div class="list">
          ${rows.length ? rows.map((row) => {
            const blocked = !!row.imageBlocked;
            const direct = String(row.image || "").trim();
            const thumb = blocked
              ? ""
              : (/^https?:\/\//i.test(direct)
                ? direct
                : (row.hasImage ? `${CLOUD_BASE}/api/artist-trade?thumb=${encodeURIComponent(row.id)}` : ""));
            const media = thumb
              ? `<img class="thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async">`
              : `<div class="thumb-empty">${blocked ? "已打码" : "无图"}</div>`;
            return `<article class="item">
              <div class="thumb-row">
                <label style="align-self:flex-start;padding-top:4px">
                  <input type="checkbox" class="trade-check" value="${escapeHtml(row.id)}">
                </label>
                ${media}
                <div>
                  <div class="item-head">
                    <strong>${escapeHtml(row.title || "未命名")}</strong>
                    <div>
                      <span class="badge ${row.status === "off" ? "off" : ""}">${row.status === "off" ? "已下架" : "在售"}</span>
                      ${blocked ? `<span class="badge warn">图片已屏蔽</span>` : ""}
                    </div>
                  </div>
                  <div class="meta">卖家 ${escapeHtml(row.sellerName || "访客")} · UID ${
                    row.sellerId
                      ? `<button type="button" class="linkish" data-open-user="${escapeHtml(row.sellerId)}">${escapeHtml(row.sellerId)}</button>`
                      : "-"
                  } · ${Number(row.price) || 0} 画泥 · ${escapeHtml(formatTime(row.at))}</div>
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
    const runTradeSearch = () => {
      state.tradeQ = $("trade-q")?.value || "";
      state.tradeStatus = $("trade-status")?.value || "active";
      state.tradeBlocked = !!$("trade-blocked")?.checked;
      state.tradePage = 1;
      render();
    };
    $("trade-search")?.addEventListener("click", runTradeSearch);
    $("trade-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runTradeSearch(); });
    $("trade-status")?.addEventListener("change", runTradeSearch);
    $("trade-blocked")?.addEventListener("change", runTradeSearch);
    $("trade-refresh")?.addEventListener("click", () => render());
    $("trade-prev")?.addEventListener("click", () => { state.tradePage = Math.max(1, state.tradePage - 1); render(); });
    $("trade-next")?.addEventListener("click", () => { state.tradePage += 1; render(); });
    const selectedTradeIds = () =>
      Array.from(root.querySelectorAll(".trade-check:checked")).map((el) => el.value).filter(Boolean);
    const runBatch = async (action, confirmText) => {
      const listingIds = selectedTradeIds();
      if (!listingIds.length) return alert("请先勾选商品");
      if (!confirm(`${confirmText}\n已选 ${listingIds.length} 条`)) return;
      await api("/api/artist-trade", { method: "POST", body: JSON.stringify({ action, listingIds }) });
      render();
    };
    $("trade-batch-off")?.addEventListener("click", () => runBatch("admin_batch_force_off", "批量强制下架？"));
    $("trade-batch-block")?.addEventListener("click", () => runBatch("admin_batch_block_image", "批量打码并删图？不可恢复。"));
    $("trade-batch-del")?.addEventListener("click", () => runBatch("admin_batch_delete", "批量删除？购买与收益也会清。"));
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
    bindOpenUser(root);
  }

  function renderNews(root) {
    setTop("资讯", "发帖 / 草稿 / 发布仍用完整编辑器（同密钥，刷新不掉登录）。");
    root.innerHTML = `
      <div class="panel" style="padding:0;overflow:hidden">
        <iframe class="embed" src="/admin/news.html?embed=1" title="资讯管理"></iframe>
      </div>`;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_decode_failed"));
      img.src = url;
    });
  }

  /** 封面入库前压到最长边 maxEdge，避免大 PNG 整包 dataURL 打跨域上传时 Failed to fetch */
  async function fileToCoverDataUrl(file, maxEdge = 384, quality = 0.82) {
    const raw = await fileToDataUrl(file);
    const img = await loadImageFromUrl(raw);
    const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
    const w = Math.max(1, Math.round((img.width || 1) * scale));
    const h = Math.max(1, Math.round((img.height || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    let out = "";
    try {
      out = canvas.toDataURL("image/webp", quality);
    } catch (_) {
      out = "";
    }
    if (!out.startsWith("data:image/webp")) {
      out = canvas.toDataURL("image/jpeg", quality);
    }
    return out;
  }

  function catalogFetchError(err) {
    const msg = String(err?.message || err || "");
    if (/failed to fetch/i.test(msg)) {
      return "Failed to fetch：连不上游戏云端上传（tk-game-cloud）或请求被中断。请换小图（最长边约 384）后重试，并确认能打开 https://tk-game-cloud.pages.dev ；仍失败再查广告拦截/代理。";
    }
    return msg;
  }

  async function renderCatalog(root) {
    setTop("素材入库", "封面 → R2（passinbox）；元数据 → 素材站 D1。");
    root.innerHTML = `
      <div class="catalog-grid">
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>补录画师</strong>
            <span class="meta">artists/&lt;slug&gt;</span>
          </div>
          <div class="mod-section-body">
            <div class="toolbar">
              <input id="cat-a-slug" placeholder="slug（如 kuook）">
              <input id="cat-a-name" placeholder="显示名">
              <input id="cat-a-trigger" placeholder="触发词（默认=slug）">
              <input id="cat-a-count" type="number" placeholder="count" value="0">
              <input id="cat-a-score" type="number" step="0.01" placeholder="score" value="0.45">
              <input id="cat-a-file" type="file" accept="image/*">
              <button type="button" class="primary" id="cat-a-submit">上传并写入画师库</button>
              <pre class="meta" id="cat-a-log" style="white-space:pre-wrap;margin:0;width:100%"></pre>
            </div>
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>补录角色</strong>
            <span class="meta">chars/&lt;slug&gt;</span>
          </div>
          <div class="mod-section-body">
            <div class="toolbar">
              <input id="cat-c-series" placeholder="series_id">
              <input id="cat-c-series-name" placeholder="作品显示名（可选）">
              <input id="cat-c-slug" placeholder="封面 slug">
              <input id="cat-c-trigger" placeholder="trigger_text">
              <input id="cat-c-name" placeholder="角色显示名">
              <input id="cat-c-count" type="number" placeholder="count" value="0">
              <input id="cat-c-tags" placeholder="tags（逗号分隔）">
              <input id="cat-c-file" type="file" accept="image/*">
              <button type="button" class="primary" id="cat-c-submit">上传并写入角色库</button>
              <pre class="meta" id="cat-c-log" style="white-space:pre-wrap;margin:0;width:100%"></pre>
            </div>
          </div>
        </section>
      </div>`;

    $("cat-a-submit")?.addEventListener("click", async () => {
      const log = $("cat-a-log");
      try {
        const slug = String($("cat-a-slug")?.value || "").trim();
        const name = String($("cat-a-name")?.value || "").trim();
        const trigger = String($("cat-a-trigger")?.value || slug).trim();
        const file = $("cat-a-file")?.files?.[0];
        if (!slug || !name || !trigger) throw new Error("请填写 slug / 名称 / 触发词");
        if (!file) throw new Error("请选择封面图");
        if (log) log.textContent = "压缩封面…";
        const image = await fileToCoverDataUrl(file);
        if (log) log.textContent = "上传 R2…";
        const up = await cloudApi("/api/admin/media-upload", {
          method: "POST",
          body: JSON.stringify({ kind: "artist", slug, image }),
        });
        if (!up?.url) throw new Error(up?.message || "R2 上传失败");
        if (log) log.textContent = `R2 OK\n${up.url}\n写入 D1…`;
        const seed = await assetApi("/api/artists/seed", {
          method: "POST",
          body: JSON.stringify([{
            slug,
            name,
            trigger,
            count: Number($("cat-a-count")?.value || 0) || 0,
            score: Number($("cat-a-score")?.value || 0.45) || 0.45,
            thumb_url: up.url,
            img_url: up.url,
          }]),
        });
        if (log) log.textContent = `完成\n封面：${up.url}\nD1：${JSON.stringify(seed)}`;
      } catch (err) {
        if (log) log.textContent = `失败：${catalogFetchError(err)}`;
      }
    });

    $("cat-c-submit")?.addEventListener("click", async () => {
      const log = $("cat-c-log");
      try {
        const seriesId = String($("cat-c-series")?.value || "").trim();
        const seriesName = String($("cat-c-series-name")?.value || seriesId).trim();
        const slug = String($("cat-c-slug")?.value || "").trim();
        const trigger = String($("cat-c-trigger")?.value || "").trim();
        const name = String($("cat-c-name")?.value || "").trim();
        const file = $("cat-c-file")?.files?.[0];
        if (!seriesId || !slug || !trigger || !name) throw new Error("请填写 series / slug / trigger / 名称");
        if (!file) throw new Error("请选择封面图");
        if (log) log.textContent = "压缩封面…";
        const image = await fileToCoverDataUrl(file);
        if (log) log.textContent = "上传 R2…";
        const up = await cloudApi("/api/admin/media-upload", {
          method: "POST",
          body: JSON.stringify({ kind: "char", slug, image }),
        });
        if (!up?.url) throw new Error(up?.message || "R2 上传失败");
        if (log) log.textContent = `R2 OK\n${up.url}\n写入 D1…`;
        const tagsRaw = String($("cat-c-tags")?.value || "").trim();
        const tags = tagsRaw
          ? tagsRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
          : [];
        const seed = await assetApi("/api/characters/seed?action=patch", {
          method: "POST",
          body: JSON.stringify([{
            series_id: seriesId,
            series_name: seriesName,
            characters: [{
              t: trigger,
              n: name,
              th: up.url,
              c: Number($("cat-c-count")?.value || 0) || 0,
              lora: "",
              tags,
            }],
          }]),
        });
        if (log) log.textContent = `完成\n封面：${up.url}\nD1：${JSON.stringify(seed)}`;
      } catch (err) {
        if (log) log.textContent = `失败：${catalogFetchError(err)}`;
      }
    });
  }

  async function renderArtists(root) {
    setTop("画师库", "分页搜索；最高级屏蔽后玩家端列表/搜索都看不到，解锁码也无效。");
    if (!(await ensureAssetAuth())) {
      root.innerHTML = assetGateHtml("画师库最高级屏蔽");
      return;
    }
    const q = state.artistsQ || "";
    const filter = state.artistsFilter || "all";
    const data = await assetApi(
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
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({ kind: "artist", id: btn.getAttribute("data-block"), blocked: true }),
          });
          render();
        } catch (err) {
          alert(`屏蔽失败：${err.message || err}`);
        }
      });
    });
    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({ kind: "artist", id: btn.getAttribute("data-unblock"), blocked: false }),
          });
          render();
        } catch (err) {
          alert(`解除失败：${err.message || err}`);
        }
      });
    });
  }

  async function renderCharacters(root) {
    setTop("角色库 / 作品", "按作品（系列）分页搜索；最高级屏蔽后列表消失，解锁码/全解锁也无法打开。");
    if (!(await ensureAssetAuth())) {
      root.innerHTML = assetGateHtml("角色库最高级屏蔽");
      return;
    }
    const q = state.charsQ || "";
    const filter = state.charsFilter || "all";
    const data = await assetApi(
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
        <div class="notes">最高级屏蔽写入服务端。玩家端系列列表不会再出现；角色接口返回 403；tk321 / 单作品解锁码也无法绕过。可在「用户档案」里给指定用户开例外。</div>
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
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({ kind: "series", id: btn.getAttribute("data-block"), blocked: true }),
          });
          render();
        } catch (err) {
          alert(`屏蔽失败：${err.message || err}`);
        }
      });
    });
    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({ kind: "series", id: btn.getAttribute("data-unblock"), blocked: false }),
          });
          render();
        } catch (err) {
          alert(`解除失败：${err.message || err}`);
        }
      });
    });
  }

  async function userAction(userId, action, extra = {}) {
    return api("/api/admin/players", {
      method: "POST",
      body: JSON.stringify({ userId, action, ...extra }),
    });
  }

  async function renderUsers(root) {
    setTop("用户管理", "显示玩家昵称；点进去用中文按钮管画泥、装扮、解锁、隐藏作品。");
    if (state.usersDetail) {
      await renderUserDetail(root, state.usersDetail);
      return;
    }
    root.innerHTML = `<div class="panel"><p class="meta">正在加载玩家列表…</p></div>`;
    const q = (state.usersQ || "").trim();
    const data = await api(`/api/admin/players?mode=users&page=${state.usersPage}&q=${encodeURIComponent(q)}`);
    const rows = data.rows || [];
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <input class="grow" id="users-q" placeholder="搜昵称或用户ID…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="users-search">搜索</button>
          <button type="button" id="users-refresh">刷新</button>
        </div>
        <p class="meta">共 ${data.total || 0} 名玩家 · 点「打开」进入完整管理</p>
        <div class="table-wrap">
          <table class="admin">
            <thead>
              <tr>
                <th>玩家</th><th>画泥</th><th>装扮</th><th>已解锁</th><th>个人限制</th><th>主题</th><th>更新</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const s = row.summary || {};
                const name = row.displayName || "未留名";
                return `<tr>
                  <td>
                    <button type="button" class="linkish" data-open-user="${escapeHtml(row.userId)}">
                      <strong>${escapeHtml(name)}</strong>
                    </button>
                    <div class="meta mono">${escapeHtml(row.userId)}</div>
                  </td>
                  <td><strong>${escapeHtml(String(s.mudBalance ?? 0))}</strong></td>
                  <td>${escapeHtml(String(s.mudOwnedCount ?? 0))}</td>
                  <td>${s.unlockedAll || s.unlockedCount === -1 ? "全部" : escapeHtml(String(s.unlockedCount ?? 0))}</td>
                  <td>${escapeHtml(String(row.blockCount ?? 0))}</td>
                  <td>${escapeHtml(s.themeLabel || s.theme || "—")}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="primary" data-open-user="${escapeHtml(row.userId)}">打开</button></td>
                </tr>`;
              }).join("") : `<tr><td colspan="8">暂无用户</td></tr>`}
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

  async function renderUserDetail(root, userId) {
    const [data, seriesMap, allowData, blockedSeriesData, blockedArtistData] = await Promise.all([
      api(`/api/admin/players?userId=${encodeURIComponent(userId)}`),
      ensureSeriesNameMap(),
      assetApi(`/api/content-blocks?allows=1&userId=${encodeURIComponent(userId)}`).catch(() => ({ allows: [] })),
      assetApi("/api/content-blocks?view=admin&kind=series&filter=blocked&page=1&pageSize=500").catch(() => ({ rows: [] })),
      assetApi("/api/content-blocks?view=admin&kind=artist&filter=blocked&page=1&pageSize=500").catch(() => ({ rows: [] })),
    ]);
    const s = data.summary || {};
    const name = data.displayName || "未留名玩家";
    const catalog = data.mudCatalog || {};
    const owned = s.mudOwnedLabeled || [];
    const unlocked = s.unlockedSeries || [];
    const blocks = data.blocks || [];
    const allows = allowData.allows || [];
    const equip = s.mudEquipLabeled || [];
    const blockedSeries = (blockedSeriesData.rows || []).filter((r) => r.blocked);
    const blockedArtists = (blockedArtistData.rows || []).filter((r) => r.blocked);
    const allowSet = new Set(
      allows.map((a) => `${a.kind === "artist" ? "artist" : "series"}:${String(a.targetId || "").toLowerCase()}`)
    );
    setTop(`管理 · ${name}`, `ID：${userId}`);

    const catalogOpts = Object.entries(catalog).map(([id, label]) =>
      `<option value="${escapeHtml(id)}">${escapeHtml(label)}（${escapeHtml(id)}）</option>`
    ).join("");

    const unlockChips = s.unlockedAll || unlocked.includes("*")
      ? `<span class="chip">★ 已全部解锁</span>`
      : (unlocked.length ? unlocked.map((id) => `
            <span class="chip">
              <strong>${escapeHtml(seriesDisplayName(id, seriesMap))}</strong>
              ${seriesMap[id] && seriesMap[id] !== id ? `<span class="meta mono">（${escapeHtml(id)}）</span>` : ""}
              <button type="button" class="danger tiny" data-del-unlock="${escapeHtml(id)}">收回</button>
            </span>`).join("") : `<span class="meta">尚未解锁任何需码作品</span>`);

    const blockChips = blocks.length ? blocks.map((b) => `
            <span class="chip">
              <strong>${escapeHtml(seriesDisplayName(b.targetId, seriesMap))}</strong>
              ${seriesMap[b.targetId] && seriesMap[b.targetId] !== b.targetId
                ? `<span class="meta mono">（${escapeHtml(b.targetId)}）</span>` : ""}
              ${b.note ? `<span class="meta">（${escapeHtml(b.note)}）</span>` : ""}
              <button type="button" class="danger tiny" data-unblock="${escapeHtml(b.targetId)}">解除</button>
            </span>`).join("") : `<span class="meta">当前无个人限制</span>`;

    const allowCatalogRows = (kind, rows) => {
      if (!rows.length) {
        return `<tr><td colspan="4" class="meta">当前没有已最高级屏蔽的${kind === "artist" ? "画师" : "作品"}</td></tr>`;
      }
      return rows.map((row) => {
        const id = String(row.id || row.slug || "");
        const key = `${kind}:${id.toLowerCase()}`;
        const allowed = allowSet.has(key);
        const label = kind === "artist"
          ? (row.name || id)
          : (row.name || seriesDisplayName(id, seriesMap) || id);
        return `
          <tr>
            <td class="allow-status">
              <span class="status-dot ${allowed ? "green" : "red"}" title="${allowed ? "已放行" : "未放行"}"></span>
              <span class="meta">${allowed ? "已放行" : "未放行"}</span>
            </td>
            <td>${escapeHtml(label)}<div class="mono meta">${escapeHtml(id)}</div></td>
            <td class="meta">${escapeHtml(String(row.count ?? ""))}</td>
            <td>
              ${allowed
                ? `<button type="button" class="warn" data-deny-allow="${escapeHtml(id)}" data-kind="${kind}">收回放行</button>`
                : `<button type="button" class="primary" data-grant-allow="${escapeHtml(id)}" data-kind="${kind}">放行给该用户</button>`}
            </td>
          </tr>`;
      }).join("");
    };

    const allowTab = state.usersAllowTab === "artist" ? "artist" : "series";
    const allowAllowedCount = allows.length;
    const allowBlockedTotal = blockedSeries.length + blockedArtists.length;

    root.innerHTML = `
      <div class="panel">
        <div class="toolbar">
          <button type="button" id="user-back">← 返回用户列表</button>
          <span class="meta">昵称优先取平台名（进游戏后同步）；无则用留言/交易名</span>
        </div>
        <div class="summary-grid">
          <div class="summary-card"><div class="k">玩家</div><div class="v">${escapeHtml(name)}</div></div>
          <div class="summary-card"><div class="k">画泥余额</div><div class="v">${escapeHtml(String(s.mudBalance ?? 0))}</div></div>
          <div class="summary-card"><div class="k">已购装扮</div><div class="v">${escapeHtml(String(s.mudOwnedCount ?? 0))}</div></div>
          <div class="summary-card"><div class="k">已解锁作品</div><div class="v">${s.unlockedAll || s.unlockedCount === -1 ? "全部" : escapeHtml(String(s.unlockedCount ?? 0))}</div></div>
          <div class="summary-card"><div class="k">个人隐藏</div><div class="v">${escapeHtml(String(blocks.length))}</div></div>
          <div class="summary-card"><div class="k">屏蔽例外</div><div class="v">${escapeHtml(String(allowAllowedCount))} / ${escapeHtml(String(allowBlockedTotal))}</div></div>
          <div class="summary-card"><div class="k">主题</div><div class="v">${escapeHtml(s.themeLabel || "—")}</div></div>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>① 画泥（加钱 / 扣钱）</h3>
        <div class="lazy-row">
          <button type="button" class="primary" data-mud="+100">+100</button>
          <button type="button" class="primary" data-mud="+500">+500</button>
          <button type="button" class="primary" data-mud="+1000">+1000</button>
          <button type="button" class="warn" data-mud="-100">-100</button>
          <button type="button" class="danger" data-mud="0">余额清零</button>
        </div>
        <div class="lazy-row">
          <input id="mud-custom" type="number" placeholder="自定义数量（正加负扣）" style="max-width:220px">
          <button type="button" class="primary" id="mud-custom-go">执行</button>
          <input id="mud-set" type="number" min="0" placeholder="直接设为…" style="max-width:160px" value="${escapeHtml(String(s.mudBalance ?? 0))}">
          <button type="button" id="mud-set-go">设为该数</button>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>② 装扮背包（删除 / 赠送）</h3>
        <div class="chip-list">
          ${owned.length ? owned.map((item) => `
            <span class="chip">
              ${escapeHtml(item.name)}
              <button type="button" class="danger tiny" data-del-owned="${escapeHtml(item.id)}">删除</button>
            </span>`).join("") : `<span class="meta">暂无已购装扮</span>`}
        </div>
        ${equip.length ? `<p class="meta">当前装备：${equip.map((e) => `${escapeHtml(e.slotLabel)}=${escapeHtml(e.name)}`).join(" · ")}</p>` : ""}
        <div class="lazy-row">
          <select id="grant-item">${catalogOpts}</select>
          <button type="button" class="primary" id="grant-owned">赠送选中装扮</button>
          <button type="button" class="warn" id="clear-owned">清空全部装扮</button>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>③ 解锁状态</h3>
        <p class="meta">「全部解锁」= 可直接选用全部作品。「仅预览锁定列表」= 只让列表里看到锁着的作品，仍需单独解锁才能用。</p>
        <div class="chip-list">
          ${unlockChips}
        </div>
        <div class="lazy-row">
          <input id="unlock-id" class="grow" placeholder="作品 ID（与角色库一致，如 fate_(series)）">
          <button type="button" class="primary" id="add-unlock">解锁该作品</button>
          <button type="button" class="primary" id="unlock-all">全部解锁</button>
          <button type="button" class="warn" id="clear-unlocks">清空全部解锁</button>
        </div>
        <p class="meta">后台改解锁/画泥/装扮后，玩家需重新打开游戏才会同步。作品 ID 可在「角色库」复制。</p>
        <div class="lazy-row flags">
          <label><input type="checkbox" id="flag-locked" ${s.lockedOn ? "checked" : ""}> 仅预览锁定列表（不真正解锁）</label>
          <label><input type="checkbox" id="flag-hidden" ${s.hiddenOn ? "checked" : ""}> 解锁硬拦截（tk18，并入普通列表）</label>
          <label><input type="checkbox" id="flag-adult" ${s.adultOn ? "checked" : ""}> 成人标签</label>
          <button type="button" class="primary" id="save-flags">保存开关</button>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>④ 高级限制（单独对该用户隐藏作品）</h3>
        <p class="meta">被限制的作品对该用户列表中不显示，也无法打开使用。不影响其他玩家。</p>
        <div class="chip-list">
          ${blockChips}
        </div>
        <div class="lazy-row">
          <input id="block-id" class="grow" placeholder="作品 ID（隐藏）">
          <input id="block-note" placeholder="备注（可选）" style="max-width:180px">
          <button type="button" class="danger" id="add-block">对该用户隐藏</button>
          <button type="button" class="warn" id="clear-blocks">清空其全部限制</button>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>⑤ 最高级屏蔽例外（仅该用户可见）</h3>
        <p class="meta">下列为全局已最高级屏蔽的目录。绿灯=已放行给该用户；红灯=未放行（与其他玩家一样看不到）。</p>
        <div class="toolbar">
          <button type="button" id="allow-tab-series" class="${allowTab === "series" ? "primary" : ""}">作品（${blockedSeries.length}）</button>
          <button type="button" id="allow-tab-artist" class="${allowTab === "artist" ? "primary" : ""}">画师（${blockedArtists.length}）</button>
          <span class="meta">已放行 ${allowAllowedCount} · 全局屏蔽 ${allowBlockedTotal}</span>
          <button type="button" class="warn" id="clear-allows">清空其全部例外</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead>
              <tr>
                <th>状态</th>
                <th>${allowTab === "artist" ? "画师" : "作品"}</th>
                <th>${allowTab === "artist" ? "热度" : "角色数"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${allowCatalogRows(allowTab, allowTab === "artist" ? blockedArtists : blockedSeries)}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel detail-block">
        <h3>⑥ 其他</h3>
        <p class="meta">更新日志已读：${escapeHtml(s.seenVersion || "—")} · 兑换码：${escapeHtml((s.codes || []).join(", ") || "无")} · 画师串 ${escapeHtml(String(data.artistCount ?? 0))} 条</p>
        <p class="meta">留言禁言：${
          s.boardMutedUntil && s.boardMutedUntil > Date.now()
            ? `至 ${escapeHtml(formatTime(s.boardMutedUntil))}`
            : "未禁言"
        }</p>
        <div class="lazy-row">
          <select id="set-theme">
            <option value="hard" ${s.theme === "hard" ? "selected" : ""}>硬朗框</option>
            <option value="ink" ${s.theme === "ink" ? "selected" : ""}>水墨像素</option>
            <option value="hand" ${s.theme === "hand" ? "selected" : ""}>手绘本</option>
          </select>
          <button type="button" id="save-theme">改主题</button>
          <button type="button" class="warn" id="mute-board-7">禁言留言7天</button>
          <button type="button" id="unmute-board">解禁留言</button>
          <button type="button" class="danger" id="user-wipe">清空该用户全部偏好</button>
          <button type="button" class="warn" id="user-wipe-all">清空偏好+画师串</button>
        </div>
      </div>`;

    $("user-back")?.addEventListener("click", () => { state.usersDetail = ""; render(); });

    root.querySelectorAll("[data-mud]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const raw = btn.getAttribute("data-mud");
        if (raw === "0") {
          if (!confirm("确认把画泥清零？")) return;
          await userAction(userId, "set_mud", { amount: 0 });
        } else {
          await userAction(userId, "add_mud", { amount: Number(raw) });
        }
        render();
      });
    });
    $("mud-custom-go")?.addEventListener("click", async () => {
      const amount = Number($("mud-custom")?.value || 0);
      if (!amount) return alert("请输入非 0 数量");
      await userAction(userId, "add_mud", { amount });
      render();
    });
    $("mud-set-go")?.addEventListener("click", async () => {
      await userAction(userId, "set_mud", { amount: Number($("mud-set")?.value || 0) });
      render();
    });

    root.querySelectorAll("[data-del-owned]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除该装扮？")) return;
        await userAction(userId, "remove_owned", { itemId: btn.getAttribute("data-del-owned") });
        render();
      });
    });
    $("grant-owned")?.addEventListener("click", async () => {
      await userAction(userId, "grant_owned", { itemId: $("grant-item")?.value });
      render();
    });
    $("clear-owned")?.addEventListener("click", async () => {
      if (!confirm("清空全部装扮与装备？")) return;
      await userAction(userId, "clear_owned");
      render();
    });

    root.querySelectorAll("[data-del-unlock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await userAction(userId, "remove_unlock", { seriesId: btn.getAttribute("data-del-unlock") });
        render();
      });
    });
    $("add-unlock")?.addEventListener("click", async () => {
      const seriesId = ($("unlock-id")?.value || "").trim();
      if (!seriesId) return alert("请填写作品 ID");
      await userAction(userId, "add_unlock", { seriesId });
      render();
    });
    $("unlock-all")?.addEventListener("click", async () => {
      if (!confirm(`确认给 ${name} 全部解锁？等同玩家端 tk321，可直接选用全部作品。`)) return;
      await userAction(userId, "unlock_all");
      render();
    });
    $("clear-unlocks")?.addEventListener("click", async () => {
      if (!confirm("清空该用户全部解锁？")) return;
      await userAction(userId, "clear_unlocks");
      render();
    });
    $("save-flags")?.addEventListener("click", async () => {
      await userAction(userId, "set_flag", { key: "show_locked_series", value: !!$("flag-locked")?.checked });
      await userAction(userId, "set_flag", { key: "show_hidden_series", value: !!$("flag-hidden")?.checked });
      await userAction(userId, "set_flag", { key: "show_adult_tags", value: !!$("flag-adult")?.checked });
      alert("开关已保存");
      render();
    });

    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await userAction(userId, "unblock_series", { seriesId: btn.getAttribute("data-unblock") });
        render();
      });
    });
    $("add-block")?.addEventListener("click", async () => {
      const seriesId = ($("block-id")?.value || "").trim();
      if (!seriesId) return alert("请填写要隐藏的作品 ID");
      await userAction(userId, "block_series", {
        seriesId,
        note: ($("block-note")?.value || "").trim(),
      });
      render();
    });
    $("clear-blocks")?.addEventListener("click", async () => {
      if (!confirm("清空该用户全部个人隐藏限制？")) return;
      await userAction(userId, "clear_blocks");
      render();
    });

    root.querySelectorAll("[data-deny-allow]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({
              action: "deny_allow",
              userId,
              kind: btn.getAttribute("data-kind") || "series",
              id: btn.getAttribute("data-deny-allow"),
            }),
          });
          render();
        } catch (err) {
          alert(`操作失败：${err.message || err}`);
        }
      });
    });
    root.querySelectorAll("[data-grant-allow]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await assetApi("/api/content-blocks", {
            method: "POST",
            body: JSON.stringify({
              action: "allow",
              userId,
              kind: btn.getAttribute("data-kind") || "series",
              id: btn.getAttribute("data-grant-allow"),
            }),
          });
          render();
        } catch (err) {
          alert(`放行失败：${err.message || err}`);
        }
      });
    });
    $("allow-tab-series")?.addEventListener("click", () => {
      state.usersAllowTab = "series";
      render();
    });
    $("allow-tab-artist")?.addEventListener("click", () => {
      state.usersAllowTab = "artist";
      render();
    });
    $("clear-allows")?.addEventListener("click", async () => {
      if (!confirm("清空该用户全部最高级屏蔽例外？")) return;
      try {
        await assetApi("/api/content-blocks", {
          method: "POST",
          body: JSON.stringify({ action: "clear_allows", userId }),
        });
        render();
      } catch (err) {
        alert(`清空失败：${err.message || err}`);
      }
    });

    $("save-theme")?.addEventListener("click", async () => {
      await userAction(userId, "set_flag", { key: "ui_theme", value: $("set-theme")?.value });
      render();
    });
    $("mute-board-7")?.addEventListener("click", async () => {
      if (!confirm("禁言该用户留言 7 天？")) return;
      await userAction(userId, "mute_board", { days: 7 });
      render();
    });
    $("unmute-board")?.addEventListener("click", async () => {
      await userAction(userId, "unmute_board");
      render();
    });
    $("user-wipe")?.addEventListener("click", async () => {
      if (!confirm(`清空 ${name} 的全部偏好？`)) return;
      await userAction(userId, "wipe_user");
      state.usersDetail = "";
      render();
    });
    $("user-wipe-all")?.addEventListener("click", async () => {
      if (!confirm(`清空 ${name} 的偏好和画师串？不可恢复`)) return;
      await userAction(userId, "wipe_user", { wipeArtists: true });
      state.usersDetail = "";
      render();
    });
  }

  async function renderEconomy(root) {
    setTop("画泥经济", "持有榜 + 运营加减泥流水（来自审计）。");
    if (state.economyDetail) {
      state.usersDetail = state.economyDetail;
      state.economyDetail = "";
      go("users");
      return;
    }
    const q = (state.economyQ || "").trim();
    const [data, ledger] = await Promise.all([
      api(`/api/admin/players?mode=economy&page=${state.economyPage}&q=${encodeURIComponent(q)}`),
      api(`/api/admin/audit?page=${state.economyLedgerPage}&actions=${encodeURIComponent("add_mud,set_mud")}`),
    ]);
    const rows = data.rows || [];
    const st = data.stats || {};
    const ledgerRows = ledger.rows || [];
    root.innerHTML = `
      <div class="mod-stack">
      <div class="summary-grid">
        <div class="summary-card"><div class="k">持有人数</div><div class="v">${escapeHtml(String(st.holders ?? 0))}</div></div>
        <div class="summary-card"><div class="k">全服画泥合计</div><div class="v">${escapeHtml(String(st.mudSum ?? 0))}</div></div>
        <div class="summary-card"><div class="k">人均（持有者）</div><div class="v">${escapeHtml(String(st.avg ?? 0))}</div></div>
      </div>
      <section class="mod-section">
        <div class="mod-section-head">
          <strong>持有榜</strong>
          <span class="meta">点管理进档案</span>
        </div>
        <div class="mod-section-body">
        <div class="toolbar">
          <input class="grow" id="eco-q" placeholder="搜昵称 / 用户ID / 余额…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="eco-search">搜索</button>
          <button type="button" id="eco-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead>
              <tr><th>玩家</th><th>余额</th><th>已购</th><th>兑换码</th><th>更新</th><th></th></tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map((row) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(row.displayName || "未留名")}</strong>
                    <div class="meta mono">${escapeHtml(row.userId)}</div>
                  </td>
                  <td><strong>${escapeHtml(String(row.mudBalance ?? 0))}</strong></td>
                  <td>${escapeHtml(String(row.mudOwnedCount ?? 0))}</td>
                  <td>${escapeHtml(String(row.codesCount ?? 0))}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="primary" data-eco-user="${escapeHtml(row.userId)}">管理</button></td>
                </tr>`).join("") : `<tr><td colspan="6">暂无经济记录</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="eco-prev" ${state.economyPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.economyPage} / ${data.totalPages || 1}</span>
          <button type="button" id="eco-next" ${state.economyPage >= (data.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
        </div>
      </section>
      <section class="mod-section">
        <div class="mod-section-head">
          <strong>运营画泥流水</strong>
          <span class="meta">仅后台加减泥</span>
        </div>
        <div class="mod-section-body">
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>时间</th><th>动作</th><th>用户</th><th>说明</th></tr></thead>
            <tbody>
              ${ledgerRows.length ? ledgerRows.map((row) => `
                <tr>
                  <td class="meta">${escapeHtml(formatTime(row.at))}</td>
                  <td><span class="badge">${escapeHtml(row.action || "")}</span></td>
                  <td>${row.userId
                    ? `<button type="button" class="linkish" data-open-user="${escapeHtml(row.userId)}">${escapeHtml(row.userId)}</button>`
                    : "—"}</td>
                  <td>${escapeHtml(row.detail || "")}</td>
                </tr>`).join("") : `<tr><td colspan="4" class="meta">暂无加减泥记录</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button type="button" id="eco-ledger-prev" ${state.economyLedgerPage <= 1 ? "disabled" : ""}>上一页</button>
          <span class="meta">${state.economyLedgerPage} / ${ledger.totalPages || 1}</span>
          <button type="button" id="eco-ledger-next" ${state.economyLedgerPage >= (ledger.totalPages || 1) ? "disabled" : ""}>下一页</button>
        </div>
        </div>
      </section>
      </div>`;
    const syncEco = () => {
      state.economyQ = $("eco-q")?.value || "";
      state.economyPage = 1;
      render();
    };
    $("eco-search")?.addEventListener("click", syncEco);
    $("eco-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") syncEco(); });
    $("eco-refresh")?.addEventListener("click", () => render());
    $("eco-prev")?.addEventListener("click", () => { state.economyPage = Math.max(1, state.economyPage - 1); render(); });
    $("eco-next")?.addEventListener("click", () => { state.economyPage += 1; render(); });
    $("eco-ledger-prev")?.addEventListener("click", () => { state.economyLedgerPage = Math.max(1, state.economyLedgerPage - 1); render(); });
    $("eco-ledger-next")?.addEventListener("click", () => { state.economyLedgerPage += 1; render(); });
    root.querySelectorAll("[data-eco-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.usersDetail = btn.getAttribute("data-eco-user") || "";
        go("users");
      });
    });
    bindOpenUser(root);
  }

  async function renderEconomyDetail() {
    /* 已并入用户管理详情 */
  }

  /* legacy stub kept for safety */
  function prefGroupsHtml() { return ""; }

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
    setTop("偏好明细", "中文项目与可读内容；玩家需进过新版游戏才会有平台昵称。");
    const q = ($("prefs-q")?.value || state.prefsQ || "").trim();
    state.prefsQ = q;
    const keyFilter = state.prefsKey || "";
    const [data, seriesMap] = await Promise.all([
      api(`/api/prefs?view=admin&page=${state.prefsPage}&q=${encodeURIComponent(q)}${keyFilter ? `&key=${encodeURIComponent(keyFilter)}` : ""}`),
      ensureSeriesNameMap(),
    ]);
    const rows = data.rows || [];
    const allowedRaw = data.allowedKeys || Object.keys(PREF_LABELS);
    const allowed = allowedRaw.map((item) => {
      if (typeof item === "string") return { key: item, label: PREF_LABELS[item] || item };
      return { key: item.key, label: item.label || PREF_LABELS[item.key] || item.key };
    });
    root.innerHTML = `
      <div class="panel">
        <div class="toolbar wrap">
          <select id="prefs-key">
            <option value="">全部项目</option>
            ${allowed.map((k) => `<option value="${escapeHtml(k.key)}" ${k.key === keyFilter ? "selected" : ""}>${escapeHtml(k.label || k.key)}</option>`).join("")}
          </select>
          <input class="grow" id="prefs-q" placeholder="搜昵称 / 用户ID / 内容…" value="${escapeHtml(q)}">
          <button type="button" class="primary" id="prefs-search">搜索</button>
          <button type="button" id="prefs-refresh">刷新</button>
        </div>
        <div class="table-wrap">
          <table class="admin">
            <thead><tr><th>玩家</th><th>项目</th><th>内容</th><th>更新</th><th></th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((row) => {
                const name = row.displayName || "未留名";
                const keyLabel = row.keyLabel || PREF_LABELS[row.key] || row.key;
                const display = formatPrefLocal(row.key, row.value, seriesMap);
                return `
                <tr>
                  <td>
                    <strong>${escapeHtml(name)}</strong>
                    <div class="meta mono">${escapeHtml(row.userId)}</div>
                  </td>
                  <td>
                    <strong>${escapeHtml(keyLabel)}</strong>
                    <div class="meta mono">${escapeHtml(row.key)}</div>
                  </td>
                  <td title="${escapeHtml(String(row.value || "").slice(0, 500))}">${escapeHtml(String(display).slice(0, 280))}</td>
                  <td class="meta">${escapeHtml(formatTime(row.updatedAt))}</td>
                  <td><button type="button" class="danger" data-uid="${escapeHtml(row.userId)}" data-key="${escapeHtml(row.key)}">删除</button></td>
                </tr>`;
              }).join("") : `<tr><td colspan="5">暂无记录</td></tr>`}
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
      ["画泥经济", "余额/装扮/装备/兑换码/每日领泥", "榜单、改余额、运营加减泥流水", "可管", "#economy"],
      ["玩家画师串", "自定义画师串+封面", "搜索、删条、清空用户", "可管", "#player-artists"],
      ["偏好明细", "全部偏好（中文可读）", "筛选、搜索、删除", "可管", "#prefs"],
      ["画师串交流", "市场买卖", "搜/筛/批量删下架打码，UID 跳转", "可管", "#trade"],
      ["留言板", "全服聊天", "搜筛、按人删、禁言，UID 跳转", "可管", "#board"],
      ["公告", "游戏顶栏公告", "草稿/发布；同时仅 1 条生效", "可管", "#notice"],
      ["审计日志", "—", "运营操作记录与检索", "可管", "#audit"],
      ["资讯", "站点教程", "发帖草稿发布", "可管", "#news"],
      ["素材入库", "—", "封面上传 R2 + 写 D1", "可管", "#catalog"],
      ["画师库/角色库", "官方检索素材", "搜索、最高级屏蔽、用户例外放行", "可管", "#artists"],
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
    paintAdminVersion();
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
