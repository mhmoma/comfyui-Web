(function () {
  "use strict";

  /** 运营台界面版本：改后台 UI 时务必递增，方便确认线上是否已部署 */
  const ADMIN_UI_VERSION = "1.53";

  const KEY_STORE = "comfyui_admin_key"; // localStorage：刷新不掉登录
  /** 素材站（画师/角色/资讯/登录探针）——tomkk.xyz 自定义域优先同源，避免跨域预检失败 */
  const ASSET_BASE = (() => {
    try {
      const host = String(location.hostname || "");
      if (
        host === "tomkk.xyz" ||
        host.endsWith(".tomkk.xyz") ||
        host === "comfyui-web-89u.pages.dev"
      ) {
        return location.origin;
      }
    } catch (_) {}
    return "https://comfyui-web-89u.pages.dev";
  })();
  /** 游戏云端（公告/留言/偏好/画泥）——web 新账号 */
  const CLOUD_BASE = "https://tk-game-cloud-6og.pages.dev";
  /** 交易+画师串+图床——tk 原账号 */
  const TRADE_BASE = "https://tk-game-cloud.pages.dev";
  /** 图床代理站（tk 原账号 R2 imtubro） */
  const MEDIA_PROXY_HOST = TRADE_BASE;

  let assetAuthOk = false;
  /** full = 主管理员；news = 仅资讯次级账号 */
  let adminRole = "full";
  let adminDisplayName = "";

  const MODULES = [
    { id: "overview", label: "总览", group: "概览" },
    { id: "analytics", label: "活跃统计", group: "概览" },
    { id: "audit", label: "审计", group: "概览" },
    { id: "map", label: "能力地图", group: "概览" },
    { id: "users", label: "用户档案", group: "人" },
    { id: "reads", label: "已读状态", group: "人" },
    { id: "player-artists", label: "玩家画师串", group: "人" },
    { id: "economy", label: "画泥经济", group: "钱" },
    { id: "prefs", label: "偏好明细", group: "钱" },
    { id: "notice", label: "公告", group: "社区" },
    { id: "trade", label: "画展区", group: "社区" },
    { id: "board", label: "留言板", group: "社区" },
    { id: "catalog", label: "素材入库", group: "素材" },
    { id: "artists", label: "画师库", group: "素材" },
    { id: "characters", label: "角色库", group: "素材" },
    { id: "tk188-tags", label: "重口18+标签", group: "素材" },
    { id: "news", label: "资讯", group: "素材" },
  ];

  /** 走素材站同源代理（转发到 6og）；勿放 /api/admin/overview（素材站有同名本地实现） */
  const SESSION_PREFIXES = [
    "/api/announcements",
    "/api/board",
    "/api/prefs",
    "/api/admin/analytics",
    "/api/admin/players",
    "/api/admin/audit",
    "/api/admin/ping",
    "/api/player-blocks",
  ];
  /** 交流/画师串仍直连 tk 原；media-upload 已在素材站有同源代理 */
  const TRADE_PREFIXES = [
    "/api/artist-trade",
    "/api/player-artists",
    "/api/admin/media-upload",
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
    tradeCategory: "all",
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
    mudCodePackId: "pack_1",
    mudCodeLastText: "",
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
    newsStatus: "",
    newsCategory: "",
    newsQ: "",
    newsEditingId: "",
    newsAttachments: [],
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
    changelog_ack: "更新日志已知晓",
    mud_codes: "已用兑换码",
    ui_theme: "界面主题",
    notice_seen_at: "公告已读时间",
    board_seen_at: "留言已读时间",
    notice_bar_hide: "公告条已收起",
    unlocked_series: "已解锁作品",
    show_locked_series: "仅预览锁定列表",
    show_hidden_series: "解锁硬拦截(tk18)",
    show_adult_tags: "成人标签开关",
    show_youth_tags: "年龄相关标签开关",
    show_extreme_tags: "重口18+标签开关",
    fav_tags: "收藏标签",
    fav_artist_data: "收藏画师",
    tag_usage: "常用标签（前20）",
    recent_series: "最近作品",
    mud_balance: "画泥余额",
    mud_owned: "已购装扮",
    mud_equip: "当前装备",
    mud_ach_show: "成就展示",
    mud_draw_day: "每日绘画领泥",
    mud_draw_life: "累计绘画里程碑",
    admin_stamp: "管理改动戳",
    display_name: "平台昵称",
    xiaoai_chat_model: "小艾对话模型",
    tag_translate_provider: "标签翻译接口",
    xiaoai_intimate: "小艾好感进度",
    prompt_notepad: "提示词记事本",
    session_draft: "会话草稿",
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
  const FLAG_PREF_KEYS = new Set(["show_locked_series", "show_hidden_series", "show_adult_tags", "show_youth_tags", "show_extreme_tags"]);

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
    if (key === "mud_draw_life") {
      const obj = parsePrefJson(text, null);
      if (!obj || typeof obj !== "object") return text || "—";
      const count = Math.max(0, Math.floor(Number(obj.count) || 0));
      const claimed = !!(obj.bonus10 || obj.bonus_10 || obj.claimed10);
      return `累计 ${count} 张 · 满10奖励${claimed ? "已领" : "未领"}`;
    }
    if (key === "prompt_notepad") {
      const arr = parsePrefJson(text, []);
      if (!Array.isArray(arr)) return text ? "有内容" : "无";
      return arr.length ? `${arr.length} 条记事` : "无";
    }
    if (key === "session_draft") {
      const obj = parsePrefJson(text, null);
      if (!obj || typeof obj !== "object") return text ? "有草稿" : "无";
      const at = Number(obj.at) || 0;
      return at ? `有草稿 · ${formatTime(at)}` : "有草稿";
    }
    if (key === "xiaoai_intimate") {
      const obj = parsePrefJson(text, null);
      if (!obj || typeof obj !== "object") return text || "—";
      return `好感 ${Math.max(0, Math.floor(Number(obj.affinity) || 0))}`;
    }
    if (key === "changelog_ack") {
      const ver = String(text).replace(/^"|"$/g, "");
      return ver ? `已知晓 v${ver}` : "未确认";
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
    const useTrade = TRADE_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}?`) || p.startsWith(`${prefix}/`));
    if (useTrade) {
      // media-upload / artist-trade / player-artists：素材站同源代理
      if (
        p.startsWith("/api/admin/media-upload") ||
        p.startsWith("/api/artist-trade") ||
        p.startsWith("/api/player-artists")
      ) {
        return new URL(p, ASSET_BASE).toString();
      }
      return new URL(p, TRADE_BASE).toString();
    }
    // 会话 API 与素材 API：一律同源（会话由 _moved 转发到 6og）
    return new URL(p, ASSET_BASE).toString();
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

  function mapCloudPath(path) {
    const p = String(path || "");
    // 与素材站同名的 overview：走 /api/session/overview 代理到 6og
    if (p === "/api/admin/overview" || p.startsWith("/api/admin/overview?")) {
      const q = p.includes("?") ? p.slice(p.indexOf("?")) : "";
      return `/api/session/overview${q}`;
    }
    return p;
  }

  function mapTradePath(path) {
    const p = String(path || "");
    if (p === "/api/admin/overview" || p.startsWith("/api/admin/overview?")) {
      const q = p.includes("?") ? p.slice(p.indexOf("?")) : "";
      return `/api/trade/overview${q}`;
    }
    if (p === "/api/admin/ping" || p.startsWith("/api/admin/ping?")) {
      return "/api/trade/ping";
    }
    return p;
  }

  async function cloudApi(path, opts = {}) {
    const url = new URL(mapCloudPath(path), ASSET_BASE).toString();
    const res = await fetch(url, {
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

  async function tradeApi(path, opts = {}) {
    const mapped = mapTradePath(path);
    const url = mapped.startsWith("/api/trade/")
      ? new URL(mapped, ASSET_BASE).toString()
      : resolveUrl(mapped);
    const res = await fetch(url, {
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

  function visibleModules() {
    if (adminRole === "news") {
      return MODULES.filter((m) => m.id === "news");
    }
    return MODULES;
  }

  async function verifyAuth() {
    // 先探素材站：主密钥或资讯次级密钥
    const auth = await assetApi("/api/articles/auth");
    adminRole = auth.role === "news" ? "news" : "full";
    adminDisplayName = auth.name || (adminRole === "news" ? "次级管理员" : "主管理员");
    assetAuthOk = true;

    if (adminRole === "news") {
      // 次级账号只打素材站资讯，不校验 6og / tk 原
      return;
    }

    // 主管理员：只用轻量 ping 探活，禁止登录时打 overview 扫表
    await cloudApi("/api/admin/ping");
    await tradeApi("/api/admin/ping");
  }

  function assetGateHtml(feature) {
    return `<div class="panel err">
      <p><strong>素材站密钥无效</strong>：${escapeHtml(feature)}不可用。</p>
      <p class="meta">运营台登录目前只校验了云端密钥。画师库/角色库的「最高级屏蔽」写在素材站 D1，两边 ADMIN_KEY 必须相同。</p>
      <p class="meta">请确认 Cloudflare 里 comfyui-web、6og、tk 原站的 ADMIN_KEY 一致后重新登录。</p>
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
      if (adminRole === "news") {
        route = "news";
        try { location.hash = "#news"; } catch (_) {}
      }
      routeFromHash();
      render();
    } catch (err) {
      setKey("");
      adminRole = "full";
      adminDisplayName = "";
      assetAuthOk = false;
      const msg = err.status === 403
        ? "密钥错误"
        : (err.status === 503 ? "云端未配置 ADMIN_KEY" : (err.message || "登录失败"));
      showLogin(msg);
    }
  }

  function logout() {
    setKey("");
    adminRole = "full";
    adminDisplayName = "";
    assetAuthOk = false;
    showLogin("");
    if ($("admin-key")) $("admin-key").value = "";
  }

  function routeFromHash() {
    const id = String(location.hash || "#overview").replace(/^#/, "") || "overview";
    const mods = visibleModules();
    if (adminRole === "news") {
      route = "news";
      return;
    }
    route = mods.some((m) => m.id === id) ? id : "overview";
  }

  function go(id) {
    if (adminRole === "news" && id !== "news") {
      location.hash = "news";
      return;
    }
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
    const mods = visibleModules();
    const groups = [];
    mods.forEach((m) => {
      const g = m.group || "其他";
      if (!groups.includes(g)) groups.push(g);
    });
    nav.innerHTML = groups.map((g) => {
      const items = mods.filter((m) => (m.group || "其他") === g);
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
      else if (route === "analytics") await renderAnalytics(root);
      else if (route === "audit") await renderAudit(root);
      else if (route === "users") await renderUsers(root);
      else if (route === "reads") await renderReads(root);
      else if (route === "economy") await renderEconomy(root);
      else if (route === "player-artists") await renderPlayerArtists(root);
      else if (route === "notice") await renderNotice(root);
      else if (route === "board") await renderBoard(root);
      else if (route === "trade") await renderTrade(root);
      else if (route === "news") await renderNews(root);
      else if (route === "catalog") await renderCatalog(root);
      else if (route === "artists") await renderArtists(root);
      else if (route === "characters") await renderCharacters(root);
      else if (route === "tk188-tags") await renderTk188Tags(root);
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

  const OVERVIEW_CACHE_KEY = "tk_admin_overview_cache_v2";
  const OVERVIEW_CACHE_MS = 30 * 60 * 1000;

  function readOverviewCache() {
    try {
      const raw = sessionStorage.getItem(OVERVIEW_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || Date.now() - Number(data.at || 0) > OVERVIEW_CACHE_MS) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function writeOverviewCache(payload) {
    try {
      sessionStorage.setItem(OVERVIEW_CACHE_KEY, JSON.stringify({ ...payload, at: Date.now() }));
    } catch (_) {}
  }

  async function fetchOverviewBundle(force) {
    if (!force) {
      const hit = readOverviewCache();
      if (hit) return { ...hit, fromCache: true };
    }
    let cloud = null;
    let trade = null;
    let asset = null;
    let cloudErr = "";
    let tradeErr = "";
    let assetErr = "";
    const q = force ? "?refresh=1" : "";
    try {
      cloud = await cloudApi(`/api/admin/overview${q}`);
    } catch (err) {
      cloudErr = err.message || "游戏云端总览失败";
    }
    try {
      trade = await tradeApi(`/api/admin/overview${q}`);
    } catch (err) {
      tradeErr = err.message || "交易/图床总览失败";
    }
    try {
      asset = await assetApi(`/api/admin/overview${q}`);
    } catch (err) {
      assetErr = err.message || "素材库总览失败";
    }
    const payload = { cloud, trade, asset, cloudErr, tradeErr, assetErr };
    if (cloud || trade || asset) writeOverviewCache(payload);
    return { ...payload, fromCache: false };
  }

  async function renderOverview(root) {
    setTop("总览", "按需加载：登录不扫库；总览 30 分钟内复用缓存。");
    const force = !!state.overviewForceRefresh;
    state.overviewForceRefresh = false;
    const bundle = await fetchOverviewBundle(force);
    const cloud = bundle.cloud;
    const trade = bundle.trade;
    const asset = bundle.asset;
    const cloudErr = bundle.cloudErr || "";
    const tradeErr = bundle.tradeErr || "";
    const assetErr = bundle.assetErr || "";
    const cacheHint = bundle.fromCache
      ? `浏览器缓存中 · `
      : `已拉取 · `;

    const c = cloud?.modules || {};
    const t = trade?.modules || {};
    const a = asset?.modules || {};
    const h = trade?.health || cloud?.health || null;
    const mediaOk = !!(h?.mediaOk ?? h?.mediaBinding);
    const mediaMode = h?.mediaMode || (h?.mediaBinding ? "local" : (h?.mediaProxy ? "proxy" : "none"));
    const mediaLabel =
      mediaMode === "local" ? "本站 MEDIA" : mediaMode === "proxy" ? "R2 代理 OK" : "图床未配";

    const sessionCards = [
      { href: "analytics", k: "今日活跃", v: c.analytics?.today ?? "—", s: `北京日 ${c.analytics?.day || "—"}` },
      { href: "users", k: "云端用户", v: c.users?.total ?? "—", s: "6og player_prefs" },
      { href: "economy", k: "画泥持有", v: c.economy?.holders ?? "—", s: `合计 ${c.economy?.mudSum ?? "—"}` },
      { href: "economy", k: "满10张已领", v: c.drawLife?.claimed ?? "—", s: `有记录 ${c.drawLife?.tracked ?? "—"}` },
      { href: "users", k: "邀请兑换", v: c.invite?.redeems ?? "—", s: `发码 ${c.invite?.codes ?? "—"}` },
      { href: "economy", k: "钱包转账", v: c.wallet?.transfers ?? "—", s: "转账笔数" },
      { href: "notice", k: "当前公告", v: c.notice?.active ? "有" : (cloud ? "无" : "—"), s: "游戏顶栏" },
      { href: "board", k: "留言", v: c.board?.total ?? "—", s: "社区巡查" },
      { href: "prefs", k: "记事本用户", v: c.extras?.notepadUsers ?? "—", s: "提示词记事本" },
      { href: "audit", k: "审计", v: c.audit?.total ?? "—", s: "6og 会话操作" },
      { href: "prefs", k: "偏好条目", v: c.prefs?.total ?? "—", s: "明细页" },
    ];
    const tradeCards = [
      { href: "player-artists", k: "玩家画师串", v: t.playerArtists?.total ?? "—", s: "tk 原 D1" },
      { href: "trade", k: "交流在售", v: t.trade?.active ?? "—", s: `下架 ${t.trade?.off ?? 0} · 打码 ${t.trade?.imageBlocked ?? 0}` },
    ];
    const assetCards = [
      { href: "catalog", k: "素材入库", v: "入口", s: "封面→tk 原 R2 · 元数据→本库" },
      { href: "news", k: "已发资讯", v: a.news?.published ?? "—", s: `草稿 ${a.news?.draft ?? 0}` },
      { href: "artists", k: "画师库", v: a.artists?.total ?? "—", s: `屏蔽 ${a.artists?.blocked ?? 0}` },
      { href: "characters", k: "角色", v: a.characters?.characters ?? "—", s: `系列 ${a.characters?.series ?? 0} · 屏蔽 ${a.characters?.blocked ?? 0}` },
      { href: "catalog", k: "自建词条", v: a.extras?.customTagUsers ?? "—", s: "素材库 player_custom_tags" },
    ];

    const pill = (ok, text) =>
      `<span class="health-pill ${ok ? "ok" : "bad"}">${escapeHtml(text)}</span>`;
    const acctPill = (ok, label) =>
      `<span class="acct-pill ${ok ? "ok" : "bad"}">${escapeHtml(label)}</span>`;

    const gameTone = cloudErr ? "health-err" : "";
    const tradeTone = tradeErr ? "health-err" : "";
    const mediaTone = tradeErr ? "" : (!h ? "" : (mediaOk ? "health-ok" : "health-warn"));
    const assetTone = assetErr ? "health-err" : "";

    root.innerHTML = `
      <div class="mod-stack">
        <div class="panel" style="margin-bottom:10px">
          <span class="meta">${cacheHint}</span>
          <button type="button" class="tiny" id="overview-refresh">强制刷新总览</button>
          <span class="meta">（会重算缓存，额度紧时少点）</span>
        </div>
        <section class="mod-section acct-map">
          <div class="mod-section-head">
            <strong>三账号职责</strong>
            <span class="meta">勿把「web」当成素材站</span>
          </div>
          <div class="mod-section-body">
            <div class="acct-grid">
              <div class="acct-card">
                <div class="acct-name">web 新</div>
                <div class="acct-role">会话云端 D1</div>
                <div class="acct-url mono">${escapeHtml(CLOUD_BASE.replace(/^https?:\/\//, ""))}</div>
                <div class="acct-duty">偏好 · 画泥 · 留言 · 公告 · 邀请 · 钱包 · 记事本 · 活跃</div>
                ${acctPill(!cloudErr, cloudErr ? "不可用" : "已连通")}
              </div>
              <div class="acct-card">
                <div class="acct-name">tk 原</div>
                <div class="acct-role">交易 + 图床 R2</div>
                <div class="acct-url mono">${escapeHtml(TRADE_BASE.replace(/^https?:\/\//, ""))}</div>
                <div class="acct-duty">交流 · 玩家画师串 · MEDIA 写图</div>
                ${acctPill(!tradeErr && mediaOk, tradeErr ? "不可用" : (mediaOk ? mediaLabel : "图床未配"))}
              </div>
              <div class="acct-card">
                <div class="acct-name">comfyui-web</div>
                <div class="acct-role">素材库 D1</div>
                <div class="acct-url mono">${escapeHtml(ASSET_BASE.replace(/^https?:\/\//, ""))}</div>
                <div class="acct-duty">画师库 · 角色库 · 资讯 · 运营台壳</div>
                ${acctPill(!assetErr && assetAuthOk, assetErr ? "不可用" : (assetAuthOk ? "已连通" : "密钥未通"))}
              </div>
            </div>
          </div>
        </section>

        <section class="mod-section ${gameTone}">
          <div class="mod-section-head">
            <strong>${cloudErr ? "会话云端不可用" : "web 新 · 会话云端"}</strong>
            <span class="meta">6og · prefs / 画泥 / 邀请 / 钱包</span>
          </div>
          <div class="mod-section-body">
            ${cloudErr ? `<p class="err" style="margin:0 0 10px">${escapeHtml(cloudErr)}</p>` : ""}
            <div class="grid-cards">
              ${sessionCards.map((card) => `
                <button type="button" class="stat-card" data-go="${card.href}">
                  <div class="k">${escapeHtml(card.k)}</div>
                  <div class="v">${escapeHtml(String(card.v))}</div>
                  <div class="s">${escapeHtml(card.s)}</div>
                </button>`).join("")}
            </div>
          </div>
        </section>

        <section class="mod-section ${tradeTone} ${mediaTone}">
          <div class="mod-section-head">
            <strong>${tradeErr ? "交易/图床不可用" : "tk 原 · 交易与图床"}</strong>
            <span class="meta">pages.dev · MEDIA 本机</span>
          </div>
          <div class="mod-section-body">
            ${tradeErr ? `<p class="err" style="margin:0 0 10px">${escapeHtml(tradeErr)}</p>` : ""}
            <div class="health-pills" style="margin-bottom:10px">
              ${pill(mediaOk, mediaLabel)}
              ${pill(!(h?.trade?.dataUrl > 0), `交流 HTTPS ${h?.trade?.https ?? "—"}`)}
              ${pill(!(h?.playerArtists?.dataUrl > 0), `玩家封面 HTTPS ${h?.playerArtists?.https ?? "—"}`)}
            </div>
            <div class="grid-cards">
              ${tradeCards.map((card) => `
                <button type="button" class="stat-card" data-go="${card.href}">
                  <div class="k">${escapeHtml(card.k)}</div>
                  <div class="v">${escapeHtml(String(card.v))}</div>
                  <div class="s">${escapeHtml(card.s)}</div>
                </button>`).join("")}
            </div>
          </div>
        </section>

        <section class="mod-section ${assetTone}">
          <div class="mod-section-head">
            <strong>${assetErr ? "素材库不可用" : "comfyui-web · 素材库"}</strong>
            <span class="meta">画师 / 角色 / 资讯 D1</span>
          </div>
          <div class="mod-section-body">
            ${assetErr ? `<p class="err" style="margin:0 0 10px">${escapeHtml(assetErr)}</p>` : ""}
            ${!assetAuthOk && !assetErr ? `<p class="err" style="margin:0 0 10px">素材库密钥未通过：最高级屏蔽等能力不可用，请确认两边 ADMIN_KEY 一致</p>` : ""}
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
      </div>`;
    root.querySelectorAll("[data-go]").forEach((el) => {
      el.addEventListener("click", () => go(el.getAttribute("data-go")));
    });
    $("overview-refresh")?.addEventListener("click", () => {
      state.overviewForceRefresh = true;
      try { sessionStorage.removeItem(OVERVIEW_CACHE_KEY); } catch (_) {}
      render();
    });
  }

  async function renderAnalytics(root) {
    setTop("活跃统计", "数据在 6og · 北京时间自然日 · 活跃与出图次数");
    const data = await cloudApi("/api/admin/analytics");
    const s = data?.summary || {};
    const series30 = Array.isArray(data?.series?.last30) ? data.series.last30 : [];
    const todayUsers = Array.isArray(data?.todayUsers) ? data.todayUsers : [];
    const maxDau = Math.max(1, ...series30.map((r) => Number(r.dau) || 0));
    const cards = [
      { k: "今日活跃", v: s.today ?? "—", s: data?.today || "—" },
      { k: "今日出图", v: s.todayDraws ?? "—", s: `人均 ${s.todayDrawsAvg ?? "—"} 张` },
      { k: "昨日活跃", v: s.yesterday ?? "—", s: `出图 ${s.yesterdayDraws ?? "—"}` },
      { k: "本周 UV", v: s.week ?? "—", s: `出图 ${s.weekDraws ?? "—"} · 自 ${s.weekFrom || "—"}` },
      { k: "本月 UV", v: s.month ?? "—", s: `出图 ${s.monthDraws ?? "—"} · 自 ${s.monthFrom || "—"}` },
      { k: "近 7 日 UV", v: s.last7 ?? "—", s: `出图 ${s.last7Draws ?? "—"}` },
      { k: "近 30 日 UV", v: s.last30 ?? "—", s: `出图 ${s.last30Draws ?? "—"}` },
      { k: "今日回流", v: s.returningToday ?? "—", s: "今日活跃且此前出现过" },
      { k: "累计曾活跃", v: s.everUsers ?? "—", s: "全历史独立 userId" },
      {
        k: "历史峰值",
        v: s.peak?.dau ?? "—",
        s: s.peak?.day ? `日 ${s.peak.day}` : "暂无",
      },
    ];
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    root.innerHTML = `
      <div class="mod-stack">
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>核心指标</strong>
            <span class="meta">时区 ${escapeHtml(data?.tz || "Asia/Shanghai")}</span>
          </div>
          <div class="mod-section-body">
            <div class="grid-cards">
              ${cards.map((card) => `
                <div class="stat-card" style="cursor:default">
                  <div class="k">${escapeHtml(card.k)}</div>
                  <div class="v">${escapeHtml(String(card.v))}</div>
                  <div class="s">${escapeHtml(card.s)}</div>
                </div>`).join("")}
            </div>
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>今日用户出图</strong>
            <span class="meta">按出图数排序 · 最多 100 人</span>
          </div>
          <div class="mod-section-body table-wrap">
            ${todayUsers.length ? `<table class="admin">
              <thead><tr><th>用户</th><th>今日出图</th><th>最近活跃</th></tr></thead>
              <tbody>
                ${todayUsers.map((u) => `
                  <tr>
                    <td class="mono">${escapeHtml(u.userId || "")}</td>
                    <td>${Number(u.draws) || 0}</td>
                    <td class="meta">${u.lastAt ? escapeHtml(new Date(u.lastAt).toLocaleString("zh-CN", { hour12: false })) : "—"}</td>
                  </tr>`).join("")}
              </tbody>
            </table>` : `<p class="meta" style="margin:0">今日暂无活跃用户</p>`}
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-head">
            <strong>近 30 天</strong>
            <span class="meta">日活柱 · 出图见表</span>
          </div>
          <div class="mod-section-body">
            <div class="dau-bars" aria-label="近30天日活柱状图">
              ${series30.map((row) => {
                const dau = Number(row.dau) || 0;
                const pct = Math.max(2, Math.round((dau / maxDau) * 100));
                const label = String(row.day || "").slice(5);
                return `<div class="dau-bar" title="${escapeHtml(`${row.day}: 活跃 ${dau} · 出图 ${Number(row.draws) || 0}`)}">
                  <div class="dau-bar-fill" style="height:${pct}%"></div>
                  <div class="dau-bar-val">${dau}</div>
                  <div class="dau-bar-day">${escapeHtml(label)}</div>
                </div>`;
              }).join("")}
            </div>
            <div class="table-wrap" style="margin-top:14px">
              <table class="admin">
                <thead><tr><th>日期</th><th>日活</th><th>出图</th><th>人均</th></tr></thead>
                <tbody>
                  ${[...series30].reverse().map((row) => {
                    const dau = Number(row.dau) || 0;
                    const draws = Number(row.draws) || 0;
                    const avg = dau > 0 ? Math.round((draws / dau) * 10) / 10 : 0;
                    return `<tr>
                      <td class="mono">${escapeHtml(row.day || "")}</td>
                      <td>${dau}</td>
                      <td>${draws}</td>
                      <td>${avg}</td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section class="mod-section">
          <div class="mod-section-body">
            ${notes.map((n) => `<p class="meta" style="margin:0 0 6px">${escapeHtml(n)}</p>`).join("")}
          </div>
        </section>
      </div>`;
  }

  async function renderAudit(root) {
    setTop("审计日志", "会话操作记在 6og（改画泥、解锁、清空偏好）。交流删/打码在 tk 原站执行，不进此表。");
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
    setTop("公告", "数据在 6og。玩家端始终只显示「最新一条生效公告」。可先存草稿，再点发布。");
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
    setTop("留言板", "数据在 6og。搜索 / 按 UID 筛；删单条、删该用户全部；可禁言。");
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
    setTop("画展区", "数据在 tk 原账号 D1（TRADE_BASE）。可改角色/画风分类、优质标；删 / 下架 / 打码。点 UID 进档案。");
    const q = encodeURIComponent(state.tradeQ || "");
    const blockedFlag = state.tradeBlocked ? "1" : "0";
    const cat = encodeURIComponent(state.tradeCategory || "all");
    const data = await api(
      `/api/artist-trade?view=admin&status=${encodeURIComponent(state.tradeStatus)}&page=${state.tradePage}&q=${q}&imageBlocked=${blockedFlag}&category=${cat}`
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
          <select id="trade-category" style="max-width:120px">
            <option value="all" ${state.tradeCategory === "all" ? "selected" : ""}>分类全部</option>
            <option value="character" ${state.tradeCategory === "character" ? "selected" : ""}>角色</option>
            <option value="style" ${state.tradeCategory === "style" ? "selected" : ""}>画风</option>
            <option value="featured" ${state.tradeCategory === "featured" ? "selected" : ""}>优质</option>
            <option value="normal" ${state.tradeCategory === "normal" ? "selected" : ""}>普通</option>
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
            const featured = !!row.featured;
            const direct = String(row.image || "").trim();
            const thumb = blocked
              ? ""
              : (/^https?:\/\//i.test(direct)
                ? direct
                : (row.hasImage ? `${TRADE_BASE}/api/artist-trade?thumb=${encodeURIComponent(row.id)}` : ""));
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
                      ${featured ? `<span class="badge" style="background:#c41818;color:#fff">优质</span>` : ""}
                      <span class="badge">${row.category === "character" ? "角色" : "画风"}</span>
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
                    <button type="button" data-feature="${escapeHtml(row.id)}" data-on="${featured ? "0" : "1"}">${featured ? "取消优质" : "标为优质"}</button>
                    <button type="button" data-cat="${escapeHtml(row.id)}" data-to="${row.category === "character" ? "style" : "character"}">${row.category === "character" ? "改为画风" : "改为角色"}</button>
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
      state.tradeCategory = $("trade-category")?.value || "all";
      state.tradeBlocked = !!$("trade-blocked")?.checked;
      state.tradePage = 1;
      render();
    };
    $("trade-search")?.addEventListener("click", runTradeSearch);
    $("trade-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runTradeSearch(); });
    $("trade-status")?.addEventListener("change", runTradeSearch);
    $("trade-category")?.addEventListener("change", runTradeSearch);
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
    root.querySelectorAll("[data-feature]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const listingId = btn.getAttribute("data-feature");
        const featured = btn.getAttribute("data-on") === "1";
        await api("/api/artist-trade", {
          method: "POST",
          body: JSON.stringify({ action: "admin_set_featured", listingId, featured }),
        });
        render();
      });
    });
    root.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const listingId = btn.getAttribute("data-cat");
        const category = btn.getAttribute("data-to") === "character" ? "character" : "style";
        await api("/api/artist-trade", {
          method: "POST",
          body: JSON.stringify({ action: "admin_set_category", listingId, category }),
        });
        render();
      });
    });
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
        if (!confirm("强制下架该投稿？")) return;
        await api("/api/artist-trade", { method: "POST", body: JSON.stringify({ action: "admin_force_off", listingId: btn.getAttribute("data-off") }) });
        render();
      });
    });
    bindOpenUser(root);
  }

  async function renderNews(root) {
    const isFull = adminRole === "full";
    setTop(
      "资讯",
      isFull
        ? "素材库 D1。主管理员可发帖，并在下方管理「仅资讯」次级账号。"
        : `次级账号「${adminDisplayName || "资讯编辑"}」：仅可管理资讯，其它模块不可见。`
    );
    const CAT_LABELS = { model: "模型动态", tutorial: "教程技巧", tool: "工具更新", community: "社区精选" };
    const newsMsg = (text, isErr) => {
      const el = root.querySelector("#news-msg");
      if (!el) return;
      el.textContent = text || "";
      el.className = "meta" + (isErr ? " news-msg-err" : " news-msg-ok");
      if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 4000);
    };

    const parseTags = (str) => String(str || "").split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    const articleUrl = (a) => {
      if (a?.slug) return `/news/detail?slug=${encodeURIComponent(a.slug)}`;
      if (a?.id) return `/news/detail?id=${encodeURIComponent(a.id)}`;
      return "/news/";
    };

    let stats = { total: 0, published: 0, draft: 0 };
    let articles = [];
    let needsInit = false;
    let loadErr = "";
    let newsAdmins = [];

    try {
      const params = new URLSearchParams({ limit: "100" });
      if (state.newsStatus) params.set("status", state.newsStatus);
      if (state.newsCategory) params.set("category", state.newsCategory);
      if (state.newsQ) params.set("q", state.newsQ);
      const tasks = [
        assetApi(`/api/articles?${params}`),
        assetApi("/api/articles?stats=1").catch(() => null),
      ];
      if (isFull) tasks.push(assetApi("/api/admin/news-admins").catch(() => ({ admins: [] })));
      const results = await Promise.all(tasks);
      const feed = results[0];
      const st = results[1];
      needsInit = !!feed.needs_init;
      articles = feed.articles || [];
      if (st?.stats) stats = st.stats;
      if (isFull) newsAdmins = results[2]?.admins || [];
    } catch (e) {
      loadErr = e.message || "加载失败";
    }

    let editing = null;
    if (state.newsEditingId) {
      try {
        let detail;
        try {
          detail = await assetApi(`/api/articles/by-id/${encodeURIComponent(state.newsEditingId)}`);
        } catch (_) {
          detail = await assetApi(`/api/articles?id=${encodeURIComponent(state.newsEditingId)}`);
        }
        editing = detail.article || null;
        if (!editing) state.newsEditingId = "";
      } catch (_) {
        state.newsEditingId = "";
      }
    }

    const cat = editing?.category || "tool";
    const isEdit = !!editing;
    const defaultAuthor = editing?.author
      || (adminRole === "news" && adminDisplayName ? adminDisplayName : "纵欲");

    root.innerHTML = `
      ${isFull ? `
      <div class="panel" style="margin-bottom:8px">
        <div class="item-head">
          <div>
            <strong>资讯次级账号</strong>
            <div class="meta">仅能登录发资讯；密钥只在创建/重置时显示一次，请立刻复制发给对方。</div>
          </div>
        </div>
        <div class="toolbar" style="margin-top:8px">
          <input id="na-name" placeholder="显示名（如：小编阿花）" style="max-width:200px">
          <input id="na-key" placeholder="自定义密钥（可空=自动生成）" class="grow">
          <button type="button" class="primary" id="na-create">新增次级账号</button>
        </div>
        <p id="na-msg" class="meta" style="min-height:1.2em;margin:4px 0 8px"></p>
        <div id="na-once" class="panel warn hidden" style="margin:0 0 8px"></div>
        <div class="table-wrap">
          ${newsAdmins.length ? `<table class="admin">
            <thead><tr><th>名称</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>
              ${newsAdmins.map((a) => `
                <tr>
                  <td><strong>${escapeHtml(a.name || "")}</strong><div class="meta mono">${escapeHtml(a.id)}</div></td>
                  <td class="meta">${escapeHtml(formatTime(a.created_at))}</td>
                  <td class="item-actions">
                    <button type="button" data-na-reset="${escapeHtml(a.id)}">重置密钥</button>
                    <button type="button" class="danger" data-na-del="${escapeHtml(a.id)}">删除</button>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>` : `<p class="meta">暂无次级账号。创建后把密钥发给对方，对方用同一登录框即可（只会看到资讯）。</p>`}
        </div>
      </div>` : ""}
      <div class="panel news-panel">
        <div class="toolbar news-toolbar">
          <span class="badge">${isFull ? "主管理员" : "次级 · 仅资讯"}</span>
          <span class="badge">全部 <b id="news-stat-total">${stats.total}</b></span>
          <span class="badge" style="color:var(--ok)">已发布 <b>${stats.published}</b></span>
          <span class="badge" style="color:var(--warn)">草稿 <b>${stats.draft}</b></span>
          <span class="grow"></span>
          ${isFull ? `<button type="button" id="news-init">初始化数据库</button>` : ""}
          <button type="button" id="news-refresh">刷新</button>
          <a class="btn-link" href="/news/" target="_blank" rel="noopener">查看前台 →</a>
        </div>
        ${loadErr ? `<div class="panel err" style="margin:0 0 8px">${escapeHtml(loadErr)}</div>` : ""}
        ${needsInit ? `<div class="panel warn" style="margin:0 0 8px">articles 表未初始化，请主管理员先点「初始化数据库」。</div>` : ""}
        <div class="news-layout">
          <div class="news-compose">
            <div class="item-head" style="margin-bottom:6px">
              <div>
                <strong id="news-mode-label">${isEdit ? "编辑动态" : "发布新动态"}</strong>
                <div class="meta" id="news-mode-hint">${isEdit ? `正在编辑：${escapeHtml(editing.title || "")}` : "内容将显示在资讯板块"}</div>
              </div>
              <button type="button" id="news-cancel-edit" class="${isEdit ? "" : "hidden"}">取消编辑</button>
            </div>
            <label class="news-label">标题 <span class="meta">可选</span></label>
            <input id="news-title" maxlength="120" placeholder="文章标题" value="${escapeHtml(editing?.title || "")}">
            <label class="news-label">作者 <span class="meta">默认「${escapeHtml(defaultAuthor)}」</span></label>
            <input id="news-author" maxlength="40" placeholder="${escapeHtml(defaultAuthor)}" value="${escapeHtml(defaultAuthor)}">
            <label class="news-label">正文 <span class="meta" id="news-char-count">0 / 48000</span></label>
            <div class="news-rich-toolbar" id="news-toolbar">
              <button type="button" data-tool="bold" title="粗体">粗体</button>
              <button type="button" data-tool="code" title="代码块">代码</button>
              <button type="button" data-tool="html" title="HTML 块（渲染）">HTML</button>
              <button type="button" data-tool="css" title="CSS 块（本篇生效）">CSS</button>
              <button type="button" data-tool="img-url" title="图片 URL">图URL</button>
              <button type="button" data-tool="img-file" title="本地图/动图">本地导入</button>
              <button type="button" data-tool="emoji" title="表情">表情</button>
              <button type="button" data-tool="preview" title="预览渲染">预览</button>
            </div>
            <input type="file" id="news-file" accept="image/*,image/gif,.gif,.webp,.png,.jpg,.jpeg" hidden>
            <div class="news-emoji-bar hidden" id="news-emoji-bar"></div>
            <div class="news-attach-bar" id="news-attach-bar"></div>
            <textarea id="news-content" rows="14" maxlength="48000" placeholder="支持 Markdown、表格、代码块；html/css 围栏会按效果渲染；图片可用工具插入">${escapeHtml(editing?.content || "")}</textarea>
            <p class="meta" style="margin:4px 0 8px">附件点「插入」写到光标处；可改光标位置再插，实现贴文内任意位置。</p>
            <label class="news-label">摘要 <span class="meta">可选</span></label>
            <input id="news-summary" maxlength="200" placeholder="列表页摘要" value="${escapeHtml(editing?.summary || "")}">
            <label class="news-label">标签 <span class="meta">逗号分隔</span></label>
            <input id="news-tags" placeholder="教程, AI编程" value="${escapeHtml((editing?.tags || []).join(", "))}">
            <label class="news-label">封面图 URL</label>
            <input id="news-cover" type="url" placeholder="https://…" value="${escapeHtml(editing?.cover_url || "")}">
            <div class="news-cats" id="news-cats">
              ${["tool", "model", "tutorial", "community"].map((c) =>
                `<button type="button" data-cat="${c}" class="${cat === c ? "active" : ""}">${CAT_LABELS[c]}</button>`
              ).join("")}
            </div>
            <div class="toolbar" style="margin-top:8px;margin-bottom:0">
              <label class="meta" style="display:flex;align-items:center;gap:6px">
                <input type="checkbox" id="news-draft" ${editing?.status === "draft" ? "checked" : ""}> 存为草稿
              </label>
              <span class="grow"></span>
              <button type="button" id="news-clear">清空</button>
              <button type="button" class="primary" id="news-publish">${isEdit ? "保存修改" : "发布"}</button>
            </div>
            <p id="news-msg" class="meta" style="min-height:1.2em;margin:6px 0 0"></p>
          </div>
          <div class="news-list-col">
            <div class="toolbar">
              <input class="grow" id="news-q" placeholder="搜索标题 / 内容…" value="${escapeHtml(state.newsQ || "")}">
              <button type="button" class="primary" id="news-search">搜索</button>
            </div>
            <div class="toolbar">
              <button type="button" data-nstatus="" class="filter-chip ${!state.newsStatus ? "active" : ""}">全部</button>
              <button type="button" data-nstatus="published" class="filter-chip ${state.newsStatus === "published" ? "active" : ""}">已发布</button>
              <button type="button" data-nstatus="draft" class="filter-chip ${state.newsStatus === "draft" ? "active" : ""}">草稿</button>
              <select id="news-filter-cat" style="max-width:140px">
                <option value="">全部分类</option>
                ${Object.entries(CAT_LABELS).map(([k, v]) =>
                  `<option value="${k}" ${state.newsCategory === k ? "selected" : ""}>${v}</option>`
                ).join("")}
              </select>
            </div>
            <div class="table-wrap">
              ${!articles.length
                ? `<p class="meta">${needsInit ? "请先初始化数据库" : "没有匹配的内容"}</p>`
                : `<table class="admin">
                    <thead><tr><th>标题 / 摘要</th><th>分类</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
                    <tbody>
                      ${articles.map((a) => `
                        <tr>
                          <td>
                            <div><strong>${escapeHtml(a.title || "")}</strong></div>
                            <div class="meta">${escapeHtml(a.author || "纵欲")} · ${escapeHtml(a.summary || "")}</div>
                          </td>
                          <td><span class="badge">${escapeHtml(CAT_LABELS[a.category] || a.category || "")}</span></td>
                          <td>${a.status === "draft"
                            ? `<span class="badge warn">草稿</span>`
                            : `<span class="badge" style="color:var(--ok)">已发布</span>`}</td>
                          <td class="meta">${escapeHtml(formatTime(a.published_at))}</td>
                          <td class="item-actions">
                            <button type="button" data-edit="${escapeHtml(a.id)}">编辑</button>
                            <a class="btn-link" href="${articleUrl(a)}" target="_blank" rel="noopener">预览</a>
                            ${a.status === "draft"
                              ? `<button type="button" data-pub="${escapeHtml(a.id)}">发布</button>`
                              : `<button type="button" data-draft="${escapeHtml(a.id)}">转草稿</button>`}
                            <button type="button" class="danger" data-del="${escapeHtml(a.id)}">删除</button>
                          </td>
                        </tr>`).join("")}
                    </tbody>
                  </table>`}
            </div>
          </div>
        </div>
      </div>`;

    const showNaKey = (key, hint) => {
      const box = root.querySelector("#na-once");
      if (!box) return;
      box.classList.remove("hidden");
      box.innerHTML = `<strong>请立即复制密钥</strong>（只显示一次）<br>
        <code class="mono" style="user-select:all;word-break:break-all">${escapeHtml(key)}</code>
        <div class="meta" style="margin-top:6px">${escapeHtml(hint || "")}</div>
        <button type="button" class="primary" id="na-copy" style="margin-top:8px">复制密钥</button>`;
      box.querySelector("#na-copy")?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(key);
          const m = root.querySelector("#na-msg");
          if (m) m.textContent = "已复制到剪贴板";
        } catch (_) {
          alert("复制失败，请手动选中密钥");
        }
      });
    };

    if (isFull) {
      const naMsg = (t, err) => {
        const el = root.querySelector("#na-msg");
        if (!el) return;
        el.textContent = t || "";
        el.className = "meta" + (err ? " news-msg-err" : " news-msg-ok");
      };
      const bindNaRow = (scope) => {
        scope.querySelectorAll("[data-na-reset]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!confirm("重置后旧密钥立即失效，确定？")) return;
            try {
              const data = await assetApi(`/api/admin/news-admins?id=${encodeURIComponent(btn.getAttribute("data-na-reset"))}`, {
                method: "PATCH",
                body: JSON.stringify({ reset_key: true }),
              });
              naMsg("已重置密钥");
              if (data.key) showNaKey(data.key, data.hint);
            } catch (e) {
              naMsg(e.message || "重置失败", true);
            }
          });
        });
        scope.querySelectorAll("[data-na-del]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!confirm("删除该次级账号？对方将无法再登录发资讯。")) return;
            try {
              await assetApi(`/api/admin/news-admins?id=${encodeURIComponent(btn.getAttribute("data-na-del"))}`, {
                method: "DELETE",
              });
              await render();
            } catch (e) {
              naMsg(e.message || "删除失败", true);
            }
          });
        });
      };
      bindNaRow(root);
      root.querySelector("#na-create")?.addEventListener("click", async () => {
        const name = root.querySelector("#na-name")?.value.trim() || "";
        const key = root.querySelector("#na-key")?.value.trim() || "";
        try {
          const data = await assetApi("/api/admin/news-admins", {
            method: "POST",
            body: JSON.stringify({ name: name || undefined, key: key || undefined }),
          });
          if (root.querySelector("#na-name")) root.querySelector("#na-name").value = "";
          if (root.querySelector("#na-key")) root.querySelector("#na-key").value = "";
          naMsg(`已创建「${data.admin?.name || ""}」——请先复制密钥，再点刷新`);
          if (data.key) showNaKey(data.key, data.hint);
          const panel = root.querySelector("#na-once")?.closest(".panel");
          let tbody = panel?.querySelector("tbody");
          if (!tbody && panel && data.admin) {
            const wrap = panel.querySelector(".table-wrap");
            if (wrap) {
              wrap.innerHTML = `<table class="admin"><thead><tr><th>名称</th><th>创建时间</th><th>操作</th></tr></thead><tbody></tbody></table>`;
              tbody = wrap.querySelector("tbody");
            }
          }
          if (tbody && data.admin) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><strong>${escapeHtml(data.admin.name || "")}</strong><div class="meta mono">${escapeHtml(data.admin.id)}</div></td>
              <td class="meta">${escapeHtml(formatTime(data.admin.created_at))}</td>
              <td class="item-actions">
                <button type="button" data-na-reset="${escapeHtml(data.admin.id)}">重置密钥</button>
                <button type="button" class="danger" data-na-del="${escapeHtml(data.admin.id)}">删除</button>
              </td>`;
            tbody.prepend(tr);
            bindNaRow(tr);
          }
        } catch (e) {
          naMsg(e.message || "创建失败", true);
        }
      });
    }

    const contentEl = root.querySelector("#news-content");
    const charEl = root.querySelector("#news-char-count");
    const NEWS_MAX = 48000;
    const syncChar = () => {
      if (charEl) charEl.textContent = `${(contentEl?.value || "").length} / ${NEWS_MAX}`;
    };
    syncChar();
    contentEl?.addEventListener("input", syncChar);

    const insertAtCursor = (text) => {
      if (!contentEl) return;
      const start = contentEl.selectionStart ?? contentEl.value.length;
      const end = contentEl.selectionEnd ?? start;
      const before = contentEl.value.slice(0, start);
      const after = contentEl.value.slice(end);
      const next = before + text + after;
      if (next.length > NEWS_MAX) {
        newsMsg("超出字数上限", true);
        return;
      }
      contentEl.value = next;
      const pos = start + text.length;
      contentEl.focus();
      contentEl.setSelectionRange(pos, pos);
      syncChar();
    };

    const renderAttachBar = () => {
      const bar = root.querySelector("#news-attach-bar");
      if (!bar) return;
      const list = state.newsAttachments || [];
      if (!list.length) {
        bar.innerHTML = `<span class="meta">暂无附件。本地导入或图 URL 会显示在这里，点「插入」放到光标处。</span>`;
        return;
      }
      bar.innerHTML = list.map((a, idx) => `
        <div class="news-attach-chip" draggable="true" data-att-idx="${idx}">
          <img src="${escapeHtml(a.url)}" alt="" loading="lazy">
          <span class="meta" title="${escapeHtml(a.name || a.url)}">${escapeHtml((a.name || "图").slice(0, 12))}</span>
          <button type="button" data-att-ins="${idx}">插入</button>
          <button type="button" class="danger" data-att-del="${idx}">移除</button>
        </div>`).join("");

      let dragFrom = -1;
      bar.querySelectorAll(".news-attach-chip").forEach((chip) => {
        chip.addEventListener("dragstart", () => {
          dragFrom = Number(chip.getAttribute("data-att-idx"));
        });
        chip.addEventListener("dragover", (e) => e.preventDefault());
        chip.addEventListener("drop", (e) => {
          e.preventDefault();
          const to = Number(chip.getAttribute("data-att-idx"));
          if (dragFrom < 0 || to < 0 || dragFrom === to) return;
          const arr = state.newsAttachments.slice();
          const [item] = arr.splice(dragFrom, 1);
          arr.splice(to, 0, item);
          state.newsAttachments = arr;
          renderAttachBar();
        });
      });
      bar.querySelectorAll("[data-att-ins]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const a = state.newsAttachments[Number(btn.getAttribute("data-att-ins"))];
          if (!a?.url) return;
          const alt = (a.name || "image").replace(/[\[\]]/g, "");
          insertAtCursor(`![${alt}](${a.url})\n`);
        });
      });
      bar.querySelectorAll("[data-att-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-att-del"));
          state.newsAttachments.splice(i, 1);
          renderAttachBar();
        });
      });
    };
    renderAttachBar();

    const addAttachment = (url, name) => {
      const u = String(url || "").trim();
      if (!u) return;
      state.newsAttachments = state.newsAttachments || [];
      state.newsAttachments.push({
        id: crypto.randomUUID?.() || String(Date.now()),
        url: u,
        name: name || "image",
      });
      renderAttachBar();
    };

    const EMOJIS = "😀😁😂🤣😊😍🤔😎😭🔥✅❌⭐🎉💡📌🚀💻🎨🖼📎".split("");
    const emojiBar = root.querySelector("#news-emoji-bar");
    if (emojiBar) {
      emojiBar.innerHTML = EMOJIS.map((e) =>
        `<button type="button" class="news-emoji-btn" data-emoji="${e}">${e}</button>`
      ).join("");
      emojiBar.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-emoji]");
        if (!btn) return;
        insertAtCursor(btn.getAttribute("data-emoji") || "");
      });
    }

    const showPreview = async () => {
      try {
        const data = await assetApi("/api/articles/preview", {
          method: "POST",
          body: JSON.stringify({ content: contentEl?.value || "" }),
        });
        const overlay = document.createElement("div");
        overlay.className = "news-preview-overlay";
        overlay.innerHTML = `
          <div class="news-preview-card">
            <div class="toolbar">
              <strong>正文预览</strong>
              <span class="grow"></span>
              <button type="button" id="news-preview-close">关闭</button>
            </div>
            <div class="article-content news-preview-body">${data.html || ""}</div>
          </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.addEventListener("click", (ev) => { if (ev.target === overlay) close(); });
        overlay.querySelector("#news-preview-close")?.addEventListener("click", close);
      } catch (e) {
        newsMsg(e.message || "预览失败", true);
      }
    };

    const uploadNewsImage = async (file) => {
      if (!file) return;
      if (file.size > 2.4 * 1024 * 1024) {
        newsMsg("文件过大（约 2.5MB 内），请压缩或改用图 URL", true);
        return;
      }
      newsMsg("上传中…");
      try {
        const isGif = /gif$/i.test(file.type) || /\.gif$/i.test(file.name || "");
        const image = isGif ? await fileToDataUrl(file) : await fileToCoverDataUrl(file, 1280, 0.88);
        const slug = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const up = await assetApi("/api/admin/media-upload", {
          method: "POST",
          body: JSON.stringify({ kind: "news", slug, image }),
        });
        if (!up?.url) throw new Error(up?.message || "上传失败");
        addAttachment(up.url, file.name || slug);
        insertAtCursor(`![${(file.name || "image").replace(/[\[\]]/g, "")}](${up.url})\n`);
        newsMsg("已上传并插入到光标处");
      } catch (e) {
        newsMsg(e.message || "上传失败", true);
      }
    };

    root.querySelector("#news-file")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      await uploadNewsImage(file);
    });

    root.querySelector("#news-toolbar")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-tool]");
      if (!btn) return;
      const tool = btn.getAttribute("data-tool");
      if (tool === "bold") {
        const ta = contentEl;
        if (!ta) return;
        const a = ta.selectionStart ?? 0;
        const b = ta.selectionEnd ?? a;
        const sel = ta.value.slice(a, b) || "粗体文字";
        insertAtCursor(`**${sel}**`);
        return;
      }
      if (tool === "code") {
        insertAtCursor("```js\n// 代码\nconsole.log('ok');\n```\n");
        return;
      }
      if (tool === "html") {
        insertAtCursor("```html\n<p style=\"color:#0f5c48\"><strong>自定义 HTML</strong></p>\n```\n");
        return;
      }
      if (tool === "css") {
        insertAtCursor("```css\np { line-height: 1.7; }\n```\n");
        return;
      }
      if (tool === "img-url") {
        const url = prompt("图片 / 动图 URL（https://…）");
        if (!url || !url.trim()) return;
        const u = url.trim();
        addAttachment(u, "url");
        insertAtCursor(`![image](${u})\n`);
        return;
      }
      if (tool === "img-file") {
        root.querySelector("#news-file")?.click();
        return;
      }
      if (tool === "emoji") {
        emojiBar?.classList.toggle("hidden");
        return;
      }
      if (tool === "preview") {
        await showPreview();
      }
    });

    let currentCat = cat;
    root.querySelector("#news-cats")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      currentCat = btn.getAttribute("data-cat");
      root.querySelectorAll("#news-cats [data-cat]").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
    });

    const readForm = () => ({
      title: root.querySelector("#news-title")?.value.trim() || "",
      author: root.querySelector("#news-author")?.value.trim() || "纵欲",
      content: root.querySelector("#news-content")?.value.trim() || "",
      summary: root.querySelector("#news-summary")?.value.trim() || "",
      tags: parseTags(root.querySelector("#news-tags")?.value),
      cover_url: root.querySelector("#news-cover")?.value.trim() || "",
      category: currentCat,
      status: root.querySelector("#news-draft")?.checked ? "draft" : "published",
    });

    const patchById = async (id, payload) => {
      try {
        return await assetApi(`/api/articles/by-id/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch (_) {
        return assetApi(`/api/articles?id=${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
    };

    const delById = async (id) => {
      try {
        return await assetApi(`/api/articles/by-id/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (_) {
        return assetApi(`/api/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      }
    };

    root.querySelector("#news-publish")?.addEventListener("click", async () => {
      const form = readForm();
      if (!form.content) { newsMsg("正文不能为空", true); return; }
      const btn = root.querySelector("#news-publish");
      if (btn) { btn.disabled = true; btn.textContent = isEdit ? "保存中…" : "发布中…"; }
      try {
        const payload = {
          content: form.content,
          title: form.title || undefined,
          author: form.author,
          summary: form.summary || undefined,
          tags: form.tags,
          category: form.category,
          cover_url: form.cover_url,
          status: form.status,
        };
        if (isEdit) await patchById(editing.id, payload);
        else await assetApi("/api/articles", { method: "POST", body: JSON.stringify(payload) });
        state.newsEditingId = "";
        newsMsg(isEdit ? "修改已保存" : form.status === "draft" ? "草稿已保存" : "发布成功");
        await render();
      } catch (e) {
        newsMsg(e.message || "保存失败", true);
        if (btn) { btn.disabled = false; btn.textContent = isEdit ? "保存修改" : "发布"; }
      }
    });

    root.querySelector("#news-clear")?.addEventListener("click", () => {
      if (!confirm("清空当前编辑内容？")) return;
      state.newsEditingId = "";
      render();
    });
    root.querySelector("#news-cancel-edit")?.addEventListener("click", () => {
      state.newsEditingId = "";
      render();
    });
    root.querySelector("#news-refresh")?.addEventListener("click", () => render());
    root.querySelector("#news-init")?.addEventListener("click", async () => {
      try {
        await assetApi("/api/articles/init", { method: "POST" });
        newsMsg("数据库已初始化");
        await render();
      } catch (e) {
        newsMsg(e.message || "初始化失败", true);
      }
    });

    const runSearch = () => {
      state.newsQ = root.querySelector("#news-q")?.value.trim() || "";
      render();
    };
    root.querySelector("#news-search")?.addEventListener("click", runSearch);
    root.querySelector("#news-q")?.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });
    root.querySelector("#news-filter-cat")?.addEventListener("change", (e) => {
      state.newsCategory = e.target.value || "";
      render();
    });
    root.querySelectorAll("[data-nstatus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.newsStatus = btn.getAttribute("data-nstatus") || "";
        render();
      });
    });
    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.newsEditingId = btn.getAttribute("data-edit") || "";
        render();
      });
    });
    root.querySelectorAll("[data-pub]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await patchById(btn.getAttribute("data-pub"), { status: "published" });
          await render();
        } catch (e) { alert(e.message || "发布失败"); }
      });
    });
    root.querySelectorAll("[data-draft]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await patchById(btn.getAttribute("data-draft"), { status: "draft" });
          await render();
        } catch (e) { alert(e.message || "操作失败"); }
      });
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("删除这篇文章？不可恢复。")) return;
        try {
          await delById(btn.getAttribute("data-del"));
          if (state.newsEditingId === btn.getAttribute("data-del")) state.newsEditingId = "";
          await render();
        } catch (e) { alert(e.message || "删除失败"); }
      });
    });
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
      return "Failed to fetch：接口无响应或 CORS 被拦。请确认运营台已是 v1.31 并硬刷新；仍失败把封面放到「画师新」走命令行补录。";
    }
    return msg;
  }

  async function renderTk188Tags(root) {
    setTop("重口18+标签", "玩家端默认隐藏；控制台 tk188 解锁。线上 D1 优先，空则读 tk188-tags.json。");
    root.innerHTML = `<div class="panel meta">加载中…</div>`;
    let data = null;
    try {
      data = await assetApi("/api/admin/tk188-tags");
    } catch (err) {
      root.innerHTML = `<div class="panel err">${escapeHtml(err.message || "加载失败")}</div>`;
      return;
    }
    const groups = Array.isArray(data.groups) ? data.groups : [];
    const group = groups[0] || { name: "重口18+", subgroups: [] };
    const subgroups = group.subgroups || [];
    const tagCount = data.tagCount ?? subgroups.reduce((n, s) => n + (s.tags || []).length, 0);
    const subOpts = subgroups.map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join("");

    const tables = subgroups.map((sub) => {
      const rows = (sub.tags || []).map((tag) => `
        <tr>
          <td class="mono">${escapeHtml(tag.t)}</td>
          <td>${escapeHtml(tag.d || "")}</td>
          <td><button type="button" class="warn" data-del-tag="${escapeHtml(sub.name)}" data-tag-t="${escapeHtml(tag.t)}">删</button></td>
        </tr>`).join("");
      return `
        <section class="mod-section">
          <div class="mod-section-head"><strong>${escapeHtml(sub.name)}</strong><span class="meta">${(sub.tags || []).length} 条</span></div>
          <div class="mod-section-body table-wrap">
            <table class="admin">
              <thead><tr><th>英文</th><th>中文</th><th></th></tr></thead>
              <tbody>${rows || `<tr><td colspan="3" class="meta">暂无</td></tr>`}</tbody>
            </table>
          </div>
        </section>`;
    }).join("");

    root.innerHTML = `
      <div class="mod-stack">
        <div class="summary-grid">
          <div class="summary-card"><div class="k">标签数</div><div class="v">${escapeHtml(String(tagCount))}</div></div>
          <div class="summary-card"><div class="k">数据源</div><div class="v">${escapeHtml(data.source || "—")}</div></div>
          <div class="summary-card"><div class="k">更新</div><div class="v meta">${escapeHtml(data.updatedAt ? formatTime(data.updatedAt) : "静态默认")}</div></div>
        </div>
        <section class="mod-section">
          <div class="mod-section-head"><strong>追加标签</strong></div>
          <div class="mod-section-body lazy-row">
            <select id="tk188-sub">${subOpts || `<option value="其他">其他</option>`}</select>
            <input id="tk188-en" class="grow" placeholder="英文 tag（如 nose_hook）">
            <input id="tk188-zh" placeholder="中文译名">
            <button type="button" class="primary" id="tk188-add">追加</button>
          </div>
        </section>
        ${tables || `<div class="panel meta">暂无子分类</div>`}
        <section class="mod-section">
          <div class="mod-section-head"><strong>JSON 编辑</strong><span class="meta">保存后玩家拉 /api/tk188-tags 即生效</span></div>
          <div class="mod-section-body">
            <textarea id="tk188-json" rows="16" style="width:100%;font-family:monospace">${escapeHtml(JSON.stringify(groups, null, 2))}</textarea>
            <div class="lazy-row" style="margin-top:8px">
              <button type="button" class="primary" id="tk188-save">保存到 D1</button>
              <button type="button" id="tk188-reload">重新加载</button>
            </div>
          </div>
        </section>
      </div>`;

    let workingGroups = JSON.parse(JSON.stringify(groups));

    function syncJsonField() {
      const ta = $("tk188-json");
      if (ta) ta.value = JSON.stringify(workingGroups, null, 2);
    }

    async function saveAndReload() {
      await assetApi("/api/admin/tk188-tags", {
        method: "POST",
        body: JSON.stringify({ groups: workingGroups }),
      });
      renderTk188Tags(root);
    }

    $("tk188-add")?.addEventListener("click", async () => {
      const subName = String($("tk188-sub")?.value || "").trim();
      const en = String($("tk188-en")?.value || "").trim().toLowerCase().replace(/\s+/g, "_");
      const zh = String($("tk188-zh")?.value || "").trim();
      if (!subName || !en) return alert("请选子分类并填英文 tag");
      let g = workingGroups[0];
      if (!g) {
        g = { name: "重口18+", subgroups: [] };
        workingGroups = [g];
      }
      let sub = (g.subgroups || []).find((s) => s.name === subName);
      if (!sub) {
        sub = { name: subName, tags: [] };
        g.subgroups = g.subgroups || [];
        g.subgroups.push(sub);
      }
      if ((sub.tags || []).some((t) => String(t.t).toLowerCase() === en)) return alert("该 tag 已存在");
      sub.tags = sub.tags || [];
      sub.tags.push({ t: en, d: zh || en });
      try {
        await saveAndReload();
      } catch (err) {
        alert(`保存失败：${err.message || err}`);
      }
    });

    root.querySelectorAll("[data-del-tag]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const subName = btn.getAttribute("data-del-tag");
        const t = btn.getAttribute("data-tag-t");
        const g = workingGroups[0];
        const sub = (g?.subgroups || []).find((s) => s.name === subName);
        if (!sub) return;
        sub.tags = (sub.tags || []).filter((tag) => String(tag.t) !== t);
        try {
          await saveAndReload();
        } catch (err) {
          alert(`删除失败：${err.message || err}`);
        }
      });
    });

    $("tk188-save")?.addEventListener("click", async () => {
      try {
        const parsed = JSON.parse(String($("tk188-json")?.value || "[]"));
        await assetApi("/api/admin/tk188-tags", {
          method: "POST",
          body: JSON.stringify({ groups: parsed }),
        });
        alert("已保存");
        renderTk188Tags(root);
      } catch (err) {
        alert(`保存失败：${err.message || err}`);
      }
    });

    $("tk188-reload")?.addEventListener("click", () => renderTk188Tags(root));
  }

  async function renderCatalog(root) {
    setTop("素材入库", "封面 → tk 原账号 R2；元数据 → comfyui-web 素材库 D1。");
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
        if (log) log.textContent = "上传 R2（经素材站代理）…";
        const up = await assetApi("/api/admin/media-upload", {
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
        if (log) log.textContent = "上传 R2（经素材站代理）…";
        const up = await assetApi("/api/admin/media-upload", {
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
    setTop("画师库", "素材库 D1。分页搜索；最高级屏蔽后玩家端列表/搜索都看不到，解锁码也无效。");
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
    setTop("角色库 / 作品", "素材库 D1。按作品（系列）分页搜索；最高级屏蔽后列表消失，解锁码/全解锁也无法打开。");
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
    setTop("用户管理", "会话在 6og；画师串条数与清串打 tk 原。点进去用中文按钮管画泥、装扮、解锁、隐藏作品。");
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
    const [data, seriesMap, allowData, blockedSeriesData, blockedArtistData, paData] = await Promise.all([
      api(`/api/admin/players?userId=${encodeURIComponent(userId)}`),
      ensureSeriesNameMap(),
      assetApi(`/api/content-blocks?allows=1&userId=${encodeURIComponent(userId)}`).catch(() => ({ allows: [] })),
      assetApi("/api/content-blocks?view=admin&kind=series&filter=blocked&page=1&pageSize=500").catch(() => ({ rows: [] })),
      assetApi("/api/content-blocks?view=admin&kind=artist&filter=blocked&page=1&pageSize=500").catch(() => ({ rows: [] })),
      api(`/api/player-artists?userId=${encodeURIComponent(userId)}`).catch(() => null),
    ]);
    const artistCount = Number(
      paData?.total ?? (paData?.items || []).length ?? data.artistCount ?? 0
    ) || 0;
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
          <div class="summary-card"><div class="k">累计绘画</div><div class="v">${escapeHtml(String(s.drawLife?.count ?? 0))} 张</div></div>
          <div class="summary-card"><div class="k">满10奖励</div><div class="v">${s.drawLife?.bonus10 ? "已领" : "未领"}</div></div>
          <div class="summary-card"><div class="k">记事本</div><div class="v">${escapeHtml(String(s.notepadCount ?? 0))} 条</div></div>
          <div class="summary-card"><div class="k">小艾好感</div><div class="v">${escapeHtml(String(s.xiaoaiAffinity ?? 0))}</div></div>
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
          <label><input type="checkbox" id="flag-hidden" ${s.hiddenOn ? "checked" : ""}> 解锁硬拦截（并入普通列表）</label>
          <label><input type="checkbox" id="flag-adult" ${s.adultOn ? "checked" : ""}> 成人标签</label>
          <label><input type="checkbox" id="flag-youth" ${s.youthOn ? "checked" : ""}> 年龄相关标签</label>
          <label><input type="checkbox" id="flag-extreme" ${s.extremeOn ? "checked" : ""}> 重口18+标签</label>
          <button type="button" class="primary" id="save-flags">保存开关</button>
        </div>
        <div class="lazy-row" style="margin-top:8px">
          <span class="meta">累计绘画 ${escapeHtml(String(s.drawLife?.count ?? 0))} 张 · 满10奖励 ${s.drawLife?.bonus10 ? "已领" : "未领"} · 草稿 ${s.hasSessionDraft ? "有" : "无"}</span>
          <button type="button" class="warn" id="reset-draw-life">重置满10奖励（可再领）</button>
          <button type="button" class="warn" id="reset-draw-life-full">清零累计+奖励</button>
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
        <p class="meta">更新日志已读：${escapeHtml(s.seenVersion || "—")} · 兑换码：${escapeHtml((s.codes || []).join(", ") || "无")} · 画师串 ${escapeHtml(String(artistCount))} 条</p>
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
      await userAction(userId, "set_flag", { key: "show_youth_tags", value: !!$("flag-youth")?.checked });
      await userAction(userId, "set_flag", { key: "show_extreme_tags", value: !!$("flag-extreme")?.checked });
      alert("开关已保存");
      render();
    });
    $("reset-draw-life")?.addEventListener("click", async () => {
      if (!confirm(`重置 ${name} 的「满10张奖励」领取状态（保留累计次数，可再领一次）？`)) return;
      await userAction(userId, "reset_draw_life", { keepCount: true });
      render();
    });
    $("reset-draw-life-full")?.addEventListener("click", async () => {
      if (!confirm(`清零 ${name} 的累计绘画次数，并允许重新领取满10奖励？`)) return;
      await userAction(userId, "reset_draw_life", { keepCount: false });
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
      try {
        await api("/api/player-artists?view=admin", {
          method: "DELETE",
          body: JSON.stringify({ admin: true, userId }),
        });
      } catch (_) {}
      state.usersDetail = "";
      render();
    });
  }

  async function renderEconomy(root) {
    setTop("画泥经济", "数据在 6og。持有榜、充值码生成（爱发电）、运营加减泥流水。");
    if (state.economyDetail) {
      state.usersDetail = state.economyDetail;
      state.economyDetail = "";
      go("users");
      return;
    }
    const q = (state.economyQ || "").trim();
    const [data, ledger, mudCodes] = await Promise.all([
      api(`/api/admin/players?mode=economy&page=${state.economyPage}&q=${encodeURIComponent(q)}`),
      api(`/api/admin/audit?page=${state.economyLedgerPage}&actions=${encodeURIComponent("add_mud,set_mud")}`),
      api(`/api/admin/mud-codes?status=unused&limit=1`).catch(() => ({ packs: [], stock: [], ok: false })),
    ]);
    const rows = data.rows || [];
    const st = data.stats || {};
    const ledgerRows = ledger.rows || [];
    const packs = Array.isArray(mudCodes.packs) && mudCodes.packs.length
      ? mudCodes.packs
      : [
          { id: "pack_1", label: "试水画泥", priceYuan: 1, amount: 100 },
          { id: "pack_10", label: "大袋画泥", priceYuan: 10, amount: 1500 },
        ];
    const stockMap = Object.fromEntries(
      (mudCodes.stock || []).map((s) => [String(s.packId || ""), s])
    );
    if (!packs.some((p) => p.id === state.mudCodePackId)) {
      state.mudCodePackId = packs[0]?.id || "pack_1";
    }
    const packOpts = packs
      .map((p) => {
        const stock = stockMap[p.id] || {};
        const unused = Math.max(0, Math.floor(Number(stock.unused) || 0));
        const label = `${p.label || p.id} · ¥${p.priceYuan} → ${p.amount} 泥（未用 ${unused}）`;
        return `<option value="${escapeHtml(p.id)}" ${p.id === state.mudCodePackId ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
    const stockCards = packs
      .map((p) => {
        const stock = stockMap[p.id] || {};
        const unused = Math.max(0, Math.floor(Number(stock.unused) || 0));
        const used = Math.max(0, Math.floor(Number(stock.used) || 0));
        return `<div class="summary-card">
          <div class="k">${escapeHtml(p.label || p.id)} · ¥${escapeHtml(String(p.priceYuan))}</div>
          <div class="v">${unused}</div>
          <div class="meta">未用库存 · 已兑 ${used} · 每码 ${escapeHtml(String(p.amount))} 泥</div>
        </div>`;
      })
      .join("");

    root.innerHTML = `
      <div class="mod-stack">
      <div class="summary-grid">
        <div class="summary-card"><div class="k">持有人数</div><div class="v">${escapeHtml(String(st.holders ?? 0))}</div></div>
        <div class="summary-card"><div class="k">全服画泥合计</div><div class="v">${escapeHtml(String(st.mudSum ?? 0))}</div></div>
        <div class="summary-card"><div class="k">人均（持有者）</div><div class="v">${escapeHtml(String(st.avg ?? 0))}</div></div>
      </div>

      <section class="mod-section">
        <div class="mod-section-head">
          <strong>爱发电充值码</strong>
          <span class="meta">生成后复制到爱发电「自动随机回复」· 一行一码</span>
        </div>
        <div class="mod-section-body">
          <div class="summary-grid" style="margin-bottom:12px">${stockCards || `<p class="meta">暂无库存统计（部署 6og 后刷新）</p>`}</div>
          <div class="toolbar wrap">
            <label class="meta">档位
              <select id="mud-code-pack">${packOpts}</select>
            </label>
            <label class="meta">数量
              <input id="mud-code-count" type="number" min="1" max="900" value="100" style="width:88px">
            </label>
            <input class="grow" id="mud-code-note" placeholder="备注（可选，如 afdian 补货）" maxlength="80">
            <button type="button" class="primary" id="mud-code-gen">生成</button>
            <button type="button" id="mud-code-copy" ${state.mudCodeLastText ? "" : "disabled"}>复制全部</button>
            <button type="button" id="mud-code-refresh">刷新库存</button>
          </div>
          <p class="meta" id="mud-code-status">单次最多 200；数量更大时会自动分批。玩家钱包「充值」兑 HN- 码。</p>
          <textarea id="mud-code-out" rows="12" spellcheck="false" placeholder="生成的码会出现在这里，可直接粘贴到爱发电">${escapeHtml(state.mudCodeLastText || "")}</textarea>
        </div>
      </section>

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

    $("mud-code-pack")?.addEventListener("change", () => {
      state.mudCodePackId = $("mud-code-pack")?.value || "pack_1";
    });
    $("mud-code-refresh")?.addEventListener("click", () => render());
    $("mud-code-copy")?.addEventListener("click", async () => {
      const text = String($("mud-code-out")?.value || "").trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        const stEl = $("mud-code-status");
        if (stEl) stEl.textContent = `已复制 ${text.split(/\n+/).filter(Boolean).length} 个码`;
      } catch (_) {
        $("mud-code-out")?.select();
        const stEl = $("mud-code-status");
        if (stEl) stEl.textContent = "复制失败，请手动全选复制";
      }
    });
    $("mud-code-gen")?.addEventListener("click", async () => {
      const packId = String($("mud-code-pack")?.value || state.mudCodePackId || "").trim();
      const totalWant = Math.min(900, Math.max(1, Math.floor(Number($("mud-code-count")?.value) || 1)));
      const note = String($("mud-code-note")?.value || "").trim();
      const btn = $("mud-code-gen");
      const stEl = $("mud-code-status");
      const out = $("mud-code-out");
      if (btn) btn.disabled = true;
      const collected = [];
      const batch = 200;
      try {
        let done = 0;
        while (done < totalWant) {
          const n = Math.min(batch, totalWant - done);
          if (stEl) stEl.textContent = `生成中… ${done}/${totalWant}`;
          const res = await api("/api/admin/mud-codes", {
            method: "POST",
            body: JSON.stringify({ action: "generate", packId, count: n, note }),
          });
          const codes = (res.codes || []).map((c) => c.code).filter(Boolean);
          collected.push(...codes);
          done += codes.length;
          if (!codes.length) break;
        }
        const text = collected.join("\n");
        state.mudCodeLastText = text;
        state.mudCodePackId = packId;
        if (out) out.value = text;
        if (stEl) {
          stEl.textContent = collected.length
            ? `已生成 ${collected.length} 个，点「复制全部」贴进爱发电自动随机回复`
            : "未生成任何码";
        }
        const copyBtn = $("mud-code-copy");
        if (copyBtn) copyBtn.disabled = !collected.length;
      } catch (err) {
        if (stEl) stEl.textContent = err?.message || "生成失败";
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function renderEconomyDetail() {
    /* 已并入用户管理详情 */
  }

  /* legacy stub kept for safety */
  function prefGroupsHtml() { return ""; }

  async function renderReads(root) {
    setTop("已读状态", "数据在 6og。更新日志 / 公告 / 留言已读；可按类型筛选并删除异常记录。");
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
    setTop("玩家画师串", "数据在 tk 原 D1 + R2；可按用户/名称搜索并删除单条或整户。");
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
    setTop("偏好明细", "6og player_prefs；玩家需进过新版游戏才会有平台昵称。");
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
    setTop("能力地图", "按模块对照：玩家侧能力 ↔ 后台能做什么（并标明落在哪一座云）。");
    const rows = [
      ["用户档案", "主题/解锁/收藏/开关/记事本/小艾进度", "6og 列表与详情；清串会打 tk 原", "可管", "#users"],
      ["活跃统计", "今日/本周/本月 UV、近30天日活", "6og player_daily_active", "只读", "#analytics"],
      ["已读状态", "更新日志/公告/留言已读/已知晓", "6og 筛选、删除", "可管", "#reads"],
      ["画泥经济", "余额/装扮/兑换码/每日领泥/满10张奖励/转账/充值码生成", "6og 榜单、改余额、流水、爱发电码", "可管", "#economy"],
      ["邀请码", "邀请解锁全作品、邀请人+100泥", "6og 统计；用户档案可查解锁态", "可管", "#users"],
      ["钱包", "收款短码、玩家互转画泥", "6og 转账笔数；余额在经济页改", "可管", "#economy"],
      ["玩家画师串", "自定义画师串+封面", "tk 原：搜索、删条、清空用户", "可管", "#player-artists"],
      ["偏好明细", "全部云端偏好（含青年标签/记事本/草稿）", "6og 筛选、搜索、删除", "可管", "#prefs"],
      ["画展区", "分类展销", "tk 原：角色/画风/优质 · 搜/筛/批量", "可管", "#trade"],
      ["留言板", "全服聊天", "6og 搜筛、按人删、禁言", "可管", "#board"],
      ["公告", "游戏顶栏公告", "6og 草稿/发布；同时仅 1 条生效", "可管", "#notice"],
      ["审计日志", "—", "6og 会话操作记录（不含交流打码）", "可管", "#audit"],
      ["资讯", "站点教程", "素材站发帖；主管理员可管次级资讯账号", "可管", "#news"],
      ["素材入库", "—", "封面上传 tk 原 R2 + 写本库 D1", "可管", "#catalog"],
      ["画师库/角色库", "官方检索素材", "本库搜索、最高级屏蔽、用户例外放行", "可管", "#artists"],
      ["自建词条", "玩家自定义中英词条", "落在素材库 D1（无独立页，总览见数量）", "只读统计", "#catalog"],
      ["改图消耗", "参考图改图（扣泥）", "走画泥余额，无独立队列", "随经济", "#economy"],
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
      if (adminRole === "news") {
        route = "news";
        try { location.hash = "#news"; } catch (_) {}
      }
      routeFromHash();
      render();
    } catch (_) {
      setKey("");
      adminRole = "full";
      adminDisplayName = "";
      assetAuthOk = false;
      showLogin("请重新登录");
    }
  }

  boot();
})();
