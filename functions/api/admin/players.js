const PAGE_SIZE = 30;

const MUD_ITEMS = {
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

const THEME_LABEL = { hard: "硬朗框", ink: "水墨像素", hand: "手绘本" };
const SLOT_LABEL = { nameBg: "名字底色", nameBorder: "姓名边框", nameFx: "名字闪光", crown: "头顶标识", title: "称号" };

const PREF_META = {
  seen_version: { group: "reads", label: "更新日志已读" },
  notice_seen_at: { group: "reads", label: "公告已读时间" },
  board_seen_at: { group: "reads", label: "留言已读时间" },
  notice_bar_hide: { group: "reads", label: "公告条已收起" },
  ui_theme: { group: "profile", label: "界面主题" },
  unlocked_series: { group: "progress", label: "已解锁作品" },
  show_locked_series: { group: "progress", label: "显示锁定作品" },
  show_hidden_series: { group: "progress", label: "显示隐藏作品" },
  show_adult_tags: { group: "progress", label: "成人标签开关" },
  fav_tags: { group: "progress", label: "收藏标签" },
  fav_artist_data: { group: "progress", label: "收藏画师数据" },
  tag_usage: { group: "progress", label: "标签使用统计" },
  recent_series: { group: "progress", label: "最近作品" },
  mud_balance: { group: "economy", label: "画泥余额" },
  mud_owned: { group: "economy", label: "已购装扮" },
  mud_equip: { group: "economy", label: "当前装备" },
  mud_ach_show: { group: "economy", label: "成就展示" },
  mud_draw_day: { group: "economy", label: "每日领泥" },
  mud_codes: { group: "economy", label: "已用兑换码" },
};

const BLOCKS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_content_blocks (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'series',
    target_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, target_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_player_blocks_user ON player_content_blocks(user_id, kind)`,
];

const PREFS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_prefs (
    user_id TEXT NOT NULL,
    pref_key TEXT NOT NULL,
    pref_value TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, pref_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_player_prefs_updated ON player_prefs(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_player_prefs_key_updated ON player_prefs(pref_key, updated_at DESC)`,
];

/** 列表排序只扫这些键，避免把巨大的 tag_usage 等拖进 GROUP BY */
const LIST_ACTIVITY_KEYS = [
  "mud_balance", "mud_owned", "unlocked_series", "ui_theme",
  "seen_version", "board_seen_at", "notice_seen_at", "mud_equip",
];

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

function parseJsonSafe(raw, fallback) {
  try { return JSON.parse(String(raw || "")); } catch (_) { return fallback; }
}

function countJsonArray(raw) {
  const v = parseJsonSafe(raw, null);
  return Array.isArray(v) ? v.length : 0;
}

function unlockedSeriesMeta(rawOrArr) {
  const list = Array.isArray(rawOrArr)
    ? rawOrArr.map(String)
    : (() => {
      const v = parseJsonSafe(rawOrArr, []);
      return Array.isArray(v) ? v.map(String) : [];
    })();
  const unlockedAll = list.includes("*");
  return {
    unlockedSeries: unlockedAll ? ["*"] : list,
    unlockedAll,
    unlockedCount: unlockedAll ? -1 : list.length,
  };
}

async function ensureSchema(db) {
  for (const stmt of [...PREFS_SCHEMA, ...BLOCKS_SCHEMA]) {
    try { await db.prepare(stmt).run(); } catch (_) {}
  }
}

async function upsertPref(db, userId, key, value) {
  const now = Date.now();
  await db.prepare(
    `INSERT INTO player_prefs (user_id, pref_key, pref_value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, pref_key) DO UPDATE SET
       pref_value = excluded.pref_value,
       updated_at = excluded.updated_at`
  ).bind(userId, key, String(value ?? ""), now).run();
  return now;
}

async function bumpAdminStamp(db, userId) {
  return upsertPref(db, userId, "admin_stamp", String(Date.now()));
}

async function getPref(db, userId, key, fallback = "") {
  const row = await db.prepare(
    "SELECT pref_value FROM player_prefs WHERE user_id = ? AND pref_key = ? LIMIT 1"
  ).bind(userId, key).first();
  return row ? String(row.pref_value ?? "") : fallback;
}

async function loadPrefsByUser(db, userId) {
  const { results } = await db.prepare(
    "SELECT pref_key, pref_value, updated_at FROM player_prefs WHERE user_id = ?"
  ).bind(userId).all();
  const prefs = {};
  let updatedAt = 0;
  for (const row of results || []) {
    prefs[row.pref_key] = {
      value: row.pref_value || "",
      updatedAt: Number(row.updated_at) || 0,
      label: PREF_META[row.pref_key]?.label || row.pref_key,
      group: PREF_META[row.pref_key]?.group || "other",
    };
    updatedAt = Math.max(updatedAt, Number(row.updated_at) || 0);
  }
  return { prefs, updatedAt };
}

function sqlInPlaceholders(ids) {
  return ids.map(() => "?").join(",");
}

let usersTotalCache = { at: 0, total: -1, q: "" };

async function resolveDisplayNames(db, userIds) {
  const map = Object.create(null);
  const ids = Array.from(new Set((userIds || []).map(cleanUserId).filter(Boolean)));
  if (!ids.length) return map;
  const ph = sqlInPlaceholders(ids);

  // 每用户只取最新一条昵称，避免把该用户全部留言拉回 Worker
  try {
    const { results } = await db.prepare(
      `SELECT m.user_id AS user_id, m.name AS name
       FROM board_messages m
       INNER JOIN (
         SELECT user_id, MAX(at) AS max_at
         FROM board_messages
         WHERE user_id IN (${ph})
         GROUP BY user_id
       ) t ON m.user_id = t.user_id AND m.at = t.max_at`
    ).bind(...ids).all();
    for (const row of results || []) {
      const uid = cleanUserId(row.user_id);
      if (!uid || map[uid]) continue;
      const name = String(row.name || "").trim().slice(0, 40);
      if (name) map[uid] = name;
    }
  } catch (_) {
    try {
      const { results } = await db.prepare(
        `SELECT user_id, name, at FROM board_messages
         WHERE user_id IN (${ph})
         ORDER BY at DESC LIMIT 200`
      ).bind(...ids).all();
      for (const row of results || []) {
        const uid = cleanUserId(row.user_id);
        if (!uid || map[uid]) continue;
        const name = String(row.name || "").trim().slice(0, 40);
        if (name) map[uid] = name;
      }
    } catch (_) {}
  }

  const missing = ids.filter((id) => !map[id]);
  if (missing.length) {
    try {
      const mph = sqlInPlaceholders(missing);
      const { results } = await db.prepare(
        `SELECT l.seller_id AS seller_id, l.seller_name AS seller_name
         FROM artist_trade_listings l
         INNER JOIN (
           SELECT seller_id, MAX(at) AS max_at
           FROM artist_trade_listings
           WHERE seller_id IN (${mph})
           GROUP BY seller_id
         ) t ON l.seller_id = t.seller_id AND l.at = t.max_at`
      ).bind(...missing).all();
      for (const row of results || []) {
        const uid = cleanUserId(row.seller_id);
        if (!uid || map[uid]) continue;
        const name = String(row.seller_name || "").trim().slice(0, 40);
        if (name) map[uid] = name;
      }
    } catch (_) {}
  }

  return map;
}

const LIST_PREF_KEYS = ["mud_balance", "mud_owned", "unlocked_series", "ui_theme"];

function summarizeListPrefs(prefMap) {
  const get = (k) => prefMap[k] ?? "";
  const unlockMeta = unlockedSeriesMeta(get("unlocked_series"));
  return {
    theme: get("ui_theme") || "hard",
    themeLabel: THEME_LABEL[get("ui_theme")] || THEME_LABEL.hard,
    mudBalance: Math.max(0, Math.floor(Number(get("mud_balance") || 0) || 0)),
    mudOwnedCount: countJsonArray(get("mud_owned")),
    unlockedCount: unlockMeta.unlockedCount,
    unlockedAll: unlockMeta.unlockedAll,
  };
}

async function loadListSummaries(db, userIds) {
  const ids = Array.from(new Set((userIds || []).map(cleanUserId).filter(Boolean)));
  const byUser = Object.create(null);
  const blockCount = Object.create(null);
  const artistCount = Object.create(null);
  for (const id of ids) {
    byUser[id] = Object.create(null);
    blockCount[id] = 0;
    artistCount[id] = 0;
  }
  if (!ids.length) return { byUser, blockCount, artistCount };

  const ph = sqlInPlaceholders(ids);
  const keyPh = sqlInPlaceholders(LIST_PREF_KEYS);
  try {
    const { results } = await db.prepare(
      `SELECT user_id, pref_key, pref_value FROM player_prefs
       WHERE user_id IN (${ph}) AND pref_key IN (${keyPh})`
    ).bind(...ids, ...LIST_PREF_KEYS).all();
    for (const row of results || []) {
      const uid = cleanUserId(row.user_id);
      if (!uid || !byUser[uid]) continue;
      byUser[uid][row.pref_key] = row.pref_value || "";
    }
  } catch (_) {}

  try {
    const { results } = await db.prepare(
      `SELECT user_id, COUNT(*) AS c FROM player_content_blocks
       WHERE user_id IN (${ph}) GROUP BY user_id`
    ).bind(...ids).all();
    for (const row of results || []) {
      const uid = cleanUserId(row.user_id);
      if (uid) blockCount[uid] = Number(row.c) || 0;
    }
  } catch (_) {}

  try {
    const { results } = await db.prepare(
      `SELECT user_id, COUNT(*) AS c FROM player_artists
       WHERE user_id IN (${ph}) GROUP BY user_id`
    ).bind(...ids).all();
    for (const row of results || []) {
      const uid = cleanUserId(row.user_id);
      if (uid) artistCount[uid] = Number(row.c) || 0;
    }
  } catch (_) {}

  return { byUser, blockCount, artistCount };
}

async function searchUserIdsByName(db, q) {
  const like = `%${q}%`;
  const ids = new Set();
  try {
    const { results } = await db.prepare(
      `SELECT DISTINCT user_id FROM board_messages
       WHERE name LIKE ? AND user_id IS NOT NULL AND user_id != '' LIMIT 200`
    ).bind(like).all();
    for (const row of results || []) ids.add(cleanUserId(row.user_id));
  } catch (_) {}
  try {
    const { results } = await db.prepare(
      `SELECT DISTINCT seller_id AS user_id FROM artist_trade_listings
       WHERE seller_name LIKE ? AND seller_id IS NOT NULL AND seller_id != '' LIMIT 200`
    ).bind(like).all();
    for (const row of results || []) ids.add(cleanUserId(row.user_id));
  } catch (_) {}
  return Array.from(ids).filter(Boolean);
}

function summarizePrefs(prefs) {
  const get = (k) => prefs[k]?.value ?? "";
  const owned = parseJsonSafe(get("mud_owned"), []);
  const unlockMeta = unlockedSeriesMeta(parseJsonSafe(get("unlocked_series"), []));
  const equip = parseJsonSafe(get("mud_equip"), {});
  return {
    theme: get("ui_theme") || "hard",
    themeLabel: THEME_LABEL[get("ui_theme")] || THEME_LABEL.hard,
    seenVersion: String(get("seen_version") || "").replace(/^"|"$/g, ""),
    noticeSeenAt: Number(get("notice_seen_at") || 0) || 0,
    boardSeenAt: Number(get("board_seen_at") || 0) || 0,
    mudBalance: Math.max(0, Math.floor(Number(get("mud_balance") || 0) || 0)),
    mudOwned: Array.isArray(owned) ? owned.map(String) : [],
    mudOwnedCount: Array.isArray(owned) ? owned.length : 0,
    mudOwnedLabeled: (Array.isArray(owned) ? owned : []).map((id) => ({
      id: String(id),
      name: MUD_ITEMS[id] || String(id),
    })),
    mudEquip: equip && typeof equip === "object" ? equip : {},
    mudEquipLabeled: Object.entries(equip || {}).filter(([, v]) => v).map(([slot, id]) => ({
      slot,
      slotLabel: SLOT_LABEL[slot] || slot,
      id: String(id),
      name: MUD_ITEMS[id] || String(id),
    })),
    unlockedSeries: unlockMeta.unlockedSeries,
    unlockedAll: unlockMeta.unlockedAll,
    unlockedCount: unlockMeta.unlockedCount,
    favTagCount: countJsonArray(get("fav_tags")),
    adultOn: get("show_adult_tags") === "1" || get("show_adult_tags") === "true",
    lockedOn: get("show_locked_series") === "1" || get("show_locked_series") === "true",
    hiddenOn: get("show_hidden_series") === "1" || get("show_hidden_series") === "true",
    drawDay: parseJsonSafe(get("mud_draw_day"), null),
    codes: String(get("mud_codes") || "").split(",").map((s) => s.trim()).filter(Boolean),
    codesCount: String(get("mud_codes") || "").split(",").map((s) => s.trim()).filter(Boolean).length,
  };
}

async function loadBlocks(db, userId) {
  try {
    const { results } = await db.prepare(
      `SELECT kind, target_id, note, at FROM player_content_blocks
       WHERE user_id = ? ORDER BY at DESC`
    ).bind(userId).all();
    return (results || []).map((row) => ({
      kind: row.kind || "series",
      targetId: row.target_id,
      note: row.note || "",
      at: Number(row.at) || 0,
    }));
  } catch (_) {
    return [];
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.ADMIN_KEY) return json(503, { ok: false, error: "no_admin_key", message: "未配置 ADMIN_KEY" });
  if (!checkAdmin(request, env)) return json(403, { ok: false, error: "forbid", message: "管理密钥错误" });
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });

  await ensureSchema(env.DB);
  const db = env.DB;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const userId = cleanUserId(url.searchParams.get("userId"));
    if (userId) {
      const { prefs, updatedAt } = await loadPrefsByUser(db, userId);
      const summary = summarizePrefs(prefs);
      const names = await resolveDisplayNames(db, [userId]);
      let artistCount = 0;
      try {
        const row = await db.prepare("SELECT COUNT(*) AS c FROM player_artists WHERE user_id = ?").bind(userId).first();
        artistCount = Number(row?.c) || 0;
      } catch (_) {}
      const blocks = await loadBlocks(db, userId);
      return json(200, {
        ok: true,
        userId,
        displayName: names[userId] || "",
        updatedAt,
        summary,
        prefs,
        blocks,
        artistCount,
        mudCatalog: MUD_ITEMS,
        slotLabels: SLOT_LABEL,
        themeLabels: THEME_LABEL,
      });
    }

    const mode = String(url.searchParams.get("mode") || "users");
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
    const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);

    if (mode === "economy") {
      let countSql = `SELECT COUNT(*) AS c FROM player_prefs WHERE pref_key = 'mud_balance'`;
      let listSql = `SELECT user_id, pref_value, updated_at FROM player_prefs WHERE pref_key = 'mud_balance'`;
      const binds = [];
      if (q) {
        const nameIds = await searchUserIdsByName(db, q);
        if (nameIds.length) {
          const ph = nameIds.map(() => "?").join(",");
          const clause = ` AND (user_id LIKE ? OR pref_value LIKE ? OR user_id IN (${ph}))`;
          countSql += clause;
          listSql += clause;
          binds.push(`%${q}%`, `%${q}%`, ...nameIds);
        } else {
          const clause = ` AND (user_id LIKE ? OR pref_value LIKE ?)`;
          countSql += clause;
          listSql += clause;
          binds.push(`%${q}%`, `%${q}%`);
        }
      }
      const totalRow = await db.prepare(countSql).bind(...binds).first();
      const total = Number(totalRow?.c) || 0;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
      let page = Math.min(Math.max(1, pageRaw), totalPages);
      listSql += ` ORDER BY CAST(pref_value AS INTEGER) DESC, updated_at DESC LIMIT ? OFFSET ?`;
      const { results } = await db.prepare(listSql)
        .bind(...binds, PAGE_SIZE, (page - 1) * PAGE_SIZE)
        .all();
      const slice = (results || []).map((r) => ({
        userId: r.user_id,
        mudBalance: Math.max(0, Math.floor(Number(r.pref_value) || 0)),
        updatedAt: Number(r.updated_at) || 0,
      }));
      const names = await resolveDisplayNames(db, slice.map((r) => r.userId));
      const bag = await loadListSummaries(db, slice.map((r) => r.userId));
      for (const row of slice) {
        const sum = summarizeListPrefs(bag.byUser[row.userId] || {});
        row.displayName = names[row.userId] || "";
        row.mudOwnedCount = sum.mudOwnedCount;
        row.codesCount = 0;
      }
      // 顶部统计：有余额人数 / 总额用轻量聚合，避免拉全表进内存
      let mudSum = 0;
      let holders = 0;
      try {
        const agg = await db.prepare(
          `SELECT COUNT(*) AS holders, COALESCE(SUM(CAST(pref_value AS INTEGER)), 0) AS mud_sum
           FROM player_prefs WHERE pref_key = 'mud_balance' AND CAST(pref_value AS INTEGER) > 0`
        ).first();
        holders = Number(agg?.holders) || 0;
        mudSum = Number(agg?.mud_sum) || 0;
      } catch (_) {}
      return json(200, {
        ok: true, mode: "economy", rows: slice, page, total, totalPages, pageSize: PAGE_SIZE,
        stats: { holders, mudSum, avg: holders ? Math.round(mudSum / holders) : 0 },
      });
    }

    if (mode === "reads") {
      const READ_KEYS = ["seen_version", "notice_seen_at", "board_seen_at", "notice_bar_hide"];
      const key = READ_KEYS.includes(String(url.searchParams.get("key") || ""))
        ? String(url.searchParams.get("key"))
        : "seen_version";
      let sql = `SELECT user_id, pref_value, updated_at FROM player_prefs WHERE pref_key = ?`;
      const binds = [key];
      if (q) {
        sql += ` AND (user_id LIKE ? OR pref_value LIKE ?)`;
        binds.push(`%${q}%`, `%${q}%`);
      }
      sql += ` ORDER BY updated_at DESC LIMIT 500`;
      const { results } = await db.prepare(sql).bind(...binds).all();
      const allRows = (results || []).map((r) => ({
        userId: r.user_id,
        key,
        label: PREF_META[key]?.label || key,
        value: r.pref_value || "",
        updatedAt: Number(r.updated_at) || 0,
      }));
      const total = allRows.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
      let page = Math.min(Math.max(1, pageRaw), totalPages);
      return json(200, {
        ok: true,
        mode: "reads",
        key,
        rows: allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        page,
        total,
        totalPages,
        pageSize: PAGE_SIZE,
        readKeys: READ_KEYS.map((k) => ({ key: k, label: PREF_META[k]?.label || k })),
      });
    }

    // 默认用户列表（SQL 分页 + 批量摘要，避免逐用户拉全量 prefs）
    let whereSql = "";
    const binds = [];
    const actPh = sqlInPlaceholders(LIST_ACTIVITY_KEYS);
    if (q) {
      const nameIds = await searchUserIdsByName(db, q);
      if (nameIds.length) {
        const ph = nameIds.map(() => "?").join(",");
        whereSql = ` WHERE pref_key IN (${actPh}) AND (user_id LIKE ? OR user_id IN (${ph}))`;
        binds.push(...LIST_ACTIVITY_KEYS, `%${q}%`, ...nameIds);
      } else {
        whereSql = ` WHERE pref_key IN (${actPh}) AND user_id LIKE ?`;
        binds.push(...LIST_ACTIVITY_KEYS, `%${q}%`);
      }
    } else {
      whereSql = ` WHERE pref_key IN (${actPh})`;
      binds.push(...LIST_ACTIVITY_KEYS);
    }
    let total = 0;
    const cacheHit = !q && usersTotalCache.total >= 0 && (Date.now() - usersTotalCache.at) < 60_000 && usersTotalCache.q === "";
    if (cacheHit) {
      total = usersTotalCache.total;
    } else {
      const countRow = await db.prepare(
        `SELECT COUNT(DISTINCT user_id) AS c FROM player_prefs${whereSql}`
      ).bind(...binds).first();
      total = Number(countRow?.c) || 0;
      if (!q) usersTotalCache = { at: Date.now(), total, q: "" };
    }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    let page = Math.min(Math.max(1, pageRaw), totalPages);
    const { results: userRows } = await db.prepare(
      `SELECT user_id, MAX(updated_at) AS updated_at, COUNT(*) AS pref_count
       FROM player_prefs${whereSql}
       GROUP BY user_id
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, PAGE_SIZE, (page - 1) * PAGE_SIZE).all();
    const slice = userRows || [];
    const ids = slice.map((u) => u.user_id);
    const [names, bag] = await Promise.all([
      resolveDisplayNames(db, ids),
      loadListSummaries(db, ids),
    ]);
    const rows = slice.map((u) => {
      const uid = u.user_id;
      return {
        userId: uid,
        displayName: names[uid] || "",
        prefCount: Number(u.pref_count) || 0,
        updatedAt: Number(u.updated_at) || 0,
        artistCount: bag.artistCount[uid] || 0,
        blockCount: bag.blockCount[uid] || 0,
        summary: summarizeListPrefs(bag.byUser[uid] || {}),
      };
    });
    return json(200, { ok: true, mode: "users", rows, page, total, totalPages, pageSize: PAGE_SIZE });
  }

  if (request.method === "POST" || request.method === "PUT") {
    let body = {};
    try { body = await request.json(); } catch (_) {
      return json(400, { ok: false, error: "bad_json" });
    }
    const userId = cleanUserId(body.userId);
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少用户" });
    const action = String(body.action || "").trim();

    const ok = async (payload) => {
      try { await bumpAdminStamp(db, userId); } catch (_) {}
      return json(200, payload);
    };

    if (action === "add_mud") {
      const delta = Math.floor(Number(body.amount) || 0);
      if (!delta) return json(400, { ok: false, error: "bad_amount", message: "数量不能为 0" });
      const cur = Math.max(0, Math.floor(Number(await getPref(db, userId, "mud_balance", "0")) || 0));
      const next = Math.max(0, cur + delta);
      await upsertPref(db, userId, "mud_balance", String(next));
      return ok({ ok: true, action, mudBalance: next, before: cur, delta });
    }

    if (action === "set_mud") {
      const next = Math.max(0, Math.floor(Number(body.amount) || 0));
      await upsertPref(db, userId, "mud_balance", String(next));
      return ok({ ok: true, action, mudBalance: next });
    }

    if (action === "remove_owned") {
      const itemId = String(body.itemId || "").trim();
      if (!itemId) return json(400, { ok: false, error: "no_item" });
      const owned = parseJsonSafe(await getPref(db, userId, "mud_owned", "[]"), []);
      const next = (Array.isArray(owned) ? owned : []).map(String).filter((id) => id !== itemId);
      await upsertPref(db, userId, "mud_owned", JSON.stringify(next));
      const equip = parseJsonSafe(await getPref(db, userId, "mud_equip", "{}"), {});
      let changed = false;
      if (equip && typeof equip === "object") {
        for (const slot of Object.keys(equip)) {
          if (String(equip[slot]) === itemId) { equip[slot] = ""; changed = true; }
        }
        if (changed) await upsertPref(db, userId, "mud_equip", JSON.stringify(equip));
      }
      return ok({ ok: true, action, removed: itemId, owned: next });
    }

    if (action === "grant_owned") {
      const itemId = String(body.itemId || "").trim();
      if (!itemId || !MUD_ITEMS[itemId]) return json(400, { ok: false, error: "bad_item", message: "未知装扮" });
      const owned = parseJsonSafe(await getPref(db, userId, "mud_owned", "[]"), []);
      const set = new Set((Array.isArray(owned) ? owned : []).map(String));
      set.add(itemId);
      const next = Array.from(set);
      await upsertPref(db, userId, "mud_owned", JSON.stringify(next));
      return ok({ ok: true, action, granted: itemId, name: MUD_ITEMS[itemId], owned: next });
    }

    if (action === "clear_owned") {
      await upsertPref(db, userId, "mud_owned", "[]");
      await upsertPref(db, userId, "mud_equip", "{}");
      return ok({ ok: true, action });
    }

    if (action === "add_unlock") {
      const seriesId = String(body.seriesId || "").trim();
      if (!seriesId) return json(400, { ok: false, error: "no_series" });
      const rows = parseJsonSafe(await getPref(db, userId, "unlocked_series", "[]"), []);
      const set = new Set((Array.isArray(rows) ? rows : []).map(String));
      // 已是全部解锁标记时，单部追加无意义
      if (set.has("*")) {
        await upsertPref(db, userId, "show_locked_series", "1");
        return ok({ ok: true, action, unlocked: ["*"], unlockedAll: true });
      }
      // 去重（忽略大小写），保留新写入的原文 ID
      for (const id of Array.from(set)) {
        if (id.toLowerCase() === seriesId.toLowerCase()) set.delete(id);
      }
      set.add(seriesId);
      const next = Array.from(set).slice(0, 500);
      await upsertPref(db, userId, "unlocked_series", JSON.stringify(next));
      await upsertPref(db, userId, "show_locked_series", "1");
      return ok({ ok: true, action, unlocked: next });
    }

    if (action === "unlock_all") {
      // "*" 哨兵 = 全部解锁（等同玩家端 tk321），避免把上千作品 ID 写入 prefs
      await upsertPref(db, userId, "unlocked_series", JSON.stringify(["*"]));
      await upsertPref(db, userId, "show_locked_series", "1");
      return ok({ ok: true, action, unlocked: ["*"], unlockedAll: true });
    }

    if (action === "remove_unlock") {
      const seriesId = String(body.seriesId || "").trim();
      const rows = parseJsonSafe(await getPref(db, userId, "unlocked_series", "[]"), []);
      const list = (Array.isArray(rows) ? rows : []).map(String);
      if (list.includes("*")) {
        return json(400, {
          ok: false,
          error: "unlock_all_active",
          message: "当前是全部解锁，请先点「清空全部解锁」再按作品收回",
        });
      }
      const want = seriesId.toLowerCase();
      const next = list.filter((id) => id.toLowerCase() !== want);
      await upsertPref(db, userId, "unlocked_series", JSON.stringify(next));
      return ok({ ok: true, action, unlocked: next });
    }

    if (action === "clear_unlocks") {
      await upsertPref(db, userId, "unlocked_series", "[]");
      return ok({ ok: true, action });
    }

    if (action === "set_flag") {
      const key = String(body.key || "").trim();
      const allowed = new Set(["show_locked_series", "show_hidden_series", "show_adult_tags", "ui_theme"]);
      if (!allowed.has(key)) return json(400, { ok: false, error: "bad_key" });
      let value = body.value;
      if (key === "ui_theme") {
        value = ["hard", "ink", "hand"].includes(String(value)) ? String(value) : "hard";
      } else {
        value = value === true || value === 1 || value === "1" || value === "true" ? "1" : "0";
      }
      await upsertPref(db, userId, key, value);
      return ok({ ok: true, action, key, value });
    }

    if (action === "block_series") {
      const targetId = String(body.seriesId || body.targetId || "").trim().slice(0, 120);
      if (!targetId) return json(400, { ok: false, error: "no_series", message: "请填写作品 ID" });
      const note = String(body.note || "").trim().slice(0, 120);
      const now = Date.now();
      await db.prepare(
        `INSERT INTO player_content_blocks (user_id, kind, target_id, note, at)
         VALUES (?, 'series', ?, ?, ?)
         ON CONFLICT(user_id, kind, target_id) DO UPDATE SET note = excluded.note, at = excluded.at`
      ).bind(userId, targetId, note, now).run();
      return ok({ ok: true, action, targetId, note });
    }

    if (action === "unblock_series") {
      const targetId = String(body.seriesId || body.targetId || "").trim();
      await db.prepare(
        `DELETE FROM player_content_blocks WHERE user_id = ? AND kind = 'series' AND target_id = ?`
      ).bind(userId, targetId).run();
      return ok({ ok: true, action, targetId });
    }

    if (action === "clear_blocks") {
      await db.prepare(`DELETE FROM player_content_blocks WHERE user_id = ?`).bind(userId).run();
      return ok({ ok: true, action });
    }

    if (action === "wipe_user") {
      await db.prepare("DELETE FROM player_prefs WHERE user_id = ?").bind(userId).run();
      await db.prepare("DELETE FROM player_content_blocks WHERE user_id = ?").bind(userId).run();
      if (body.wipeArtists) {
        try { await db.prepare("DELETE FROM player_artists WHERE user_id = ?").bind(userId).run(); } catch (_) {}
      }
      // wipe 后仍打戳，方便客户端清空本地对应项
      try { await bumpAdminStamp(db, userId); } catch (_) {}
      return json(200, { ok: true, wiped: true, userId });
    }

    if (action === "set_pref") {
      const key = String(body.key || "").trim();
      if (!PREF_META[key]) return json(400, { ok: false, error: "bad_key" });
      let value = body.value;
      if (value != null && typeof value === "object") value = JSON.stringify(value);
      await upsertPref(db, userId, key, String(value ?? ""));
      return ok({ ok: true, action, key });
    }

    return json(400, { ok: false, error: "bad_action", message: "未知操作" });
  }

  if (request.method === "DELETE") {
    const userId = cleanUserId(url.searchParams.get("userId"));
    const key = String(url.searchParams.get("key") || "").trim();
    if (!userId) return json(400, { ok: false, error: "no_user" });
    if (key) {
      await db.prepare("DELETE FROM player_prefs WHERE user_id = ? AND pref_key = ?").bind(userId, key).run();
      return json(200, { ok: true, deleted: true, userId, key });
    }
    await db.prepare("DELETE FROM player_prefs WHERE user_id = ?").bind(userId).run();
    return json(200, { ok: true, deleted: true, userId, key: "*" });
  }

  return json(405, { ok: false, error: "method" });
}
