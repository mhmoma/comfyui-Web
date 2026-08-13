const ALLOWED_KEYS = new Set([
  "seen_version",
  "mud_codes",
  "ui_theme",
  "notice_seen_at",
  "board_seen_at",
  "notice_bar_hide",
  "unlocked_series",
  "show_locked_series",
  "show_hidden_series",
  "show_adult_tags",
  "fav_tags",
  "fav_artist_data",
  "tag_usage",
  "recent_series",
  "mud_balance",
  "mud_owned",
  "mud_equip",
  "mud_ach_show",
  "mud_draw_day",
  "admin_stamp",
]);

const VALUE_MAX = {
  seen_version: 32,
  mud_codes: 512,
  ui_theme: 16,
  notice_seen_at: 24,
  board_seen_at: 24,
  notice_bar_hide: 96,
  unlocked_series: 12_000,
  show_locked_series: 8,
  show_hidden_series: 8,
  show_adult_tags: 8,
  fav_tags: 6_000,
  fav_artist_data: 12_000,
  tag_usage: 12_000,
  recent_series: 2_000,
  mud_balance: 24,
  mud_owned: 6_000,
  mud_equip: 2_000,
  mud_ach_show: 2_000,
  mud_draw_day: 96,
  admin_stamp: 24,
};

const PAGE_SIZE = 30;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_prefs (
    user_id TEXT NOT NULL,
    pref_key TEXT NOT NULL,
    pref_value TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, pref_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_player_prefs_updated ON player_prefs(updated_at DESC)`,
];

async function ensureTable(db) {
  try {
    await db.prepare("SELECT 1 FROM player_prefs LIMIT 1").all();
  } catch (_) {
    for (const stmt of SCHEMA) {
      await db.prepare(stmt).run();
    }
  }
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
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

function cleanKey(value) {
  const key = String(value || "").trim().slice(0, 64);
  return ALLOWED_KEYS.has(key) ? key : "";
}

function cleanValue(value, key = "") {
  const max = VALUE_MAX[key] || 256;
  return String(value ?? "").slice(0, max);
}

async function upsertPref(db, userId, key, value) {
  const now = Date.now();
  await db.prepare(
    `INSERT INTO player_prefs (user_id, pref_key, pref_value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, pref_key) DO UPDATE SET
       pref_value = excluded.pref_value,
       updated_at = excluded.updated_at`
  ).bind(userId, key, value, now).run();
  return now;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });

  await ensureTable(env.DB);
  const url = new URL(request.url);
  const admin = checkAdmin(request, env);

  if (request.method === "GET") {
    if (admin && url.searchParams.get("view") === "admin") {
      const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);
      const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
      const keyFilter = cleanKey(url.searchParams.get("key") || "") || "";
      const where = [];
      const binds = [];
      if (q) {
        where.push("(user_id LIKE ? OR pref_value LIKE ?)");
        binds.push(`%${q}%`, `%${q}%`);
      }
      if (keyFilter) {
        where.push("pref_key = ?");
        binds.push(keyFilter);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM player_prefs ${whereSql}`
      ).bind(...binds).first();
      const total = Number(totalRow?.c) || 0;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
      let page = pageRaw < 1 ? 1 : pageRaw;
      if (page > totalPages) page = totalPages;
      const offset = (page - 1) * PAGE_SIZE;
      const { results } = await env.DB.prepare(
        `SELECT user_id, pref_key, pref_value, updated_at
         FROM player_prefs ${whereSql}
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, PAGE_SIZE, offset).all();
      return json(200, {
        ok: true,
        admin: true,
        rows: (results || []).map((row) => ({
          userId: row.user_id,
          key: row.pref_key,
          value: row.pref_value,
          updatedAt: Number(row.updated_at) || 0,
        })),
        page,
        total,
        totalPages,
        pageSize: PAGE_SIZE,
        allowedKeys: [...ALLOWED_KEYS],
      });
    }

    const userId = cleanUserId(url.searchParams.get("userId"));
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });

    if (url.searchParams.get("all") === "1") {
      const { results } = await env.DB.prepare(
        "SELECT pref_key, pref_value, updated_at FROM player_prefs WHERE user_id = ?"
      ).bind(userId).all();
      const prefs = {};
      for (const row of results || []) {
        if (!ALLOWED_KEYS.has(row.pref_key)) continue;
        prefs[row.pref_key] = {
          value: row.pref_value || "",
          updatedAt: Number(row.updated_at) || 0,
        };
      }
      return json(200, { ok: true, userId, prefs });
    }

    const key = cleanKey(url.searchParams.get("key") || "seen_version");
    if (!key) return json(400, { ok: false, error: "bad_key", message: "不支持的 key" });
    const row = await env.DB.prepare(
      "SELECT pref_value, updated_at FROM player_prefs WHERE user_id = ? AND pref_key = ? LIMIT 1"
    ).bind(userId, key).first();
    return json(200, {
      ok: true,
      userId,
      key,
      value: row?.pref_value || "",
      updatedAt: Number(row?.updated_at) || 0,
    });
  }

  if (request.method === "DELETE") {
    if (!admin) return json(403, { ok: false, error: "forbid", message: "需要管理密钥" });
    const userId = cleanUserId(url.searchParams.get("userId"));
    const key = cleanKey(url.searchParams.get("key") || "");
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });
    if (key) {
      await env.DB.prepare(
        "DELETE FROM player_prefs WHERE user_id = ? AND pref_key = ?"
      ).bind(userId, key).run();
    } else {
      await env.DB.prepare("DELETE FROM player_prefs WHERE user_id = ?").bind(userId).run();
    }
    return json(200, { ok: true, deleted: true, userId, key: key || "*" });
  }

  if (request.method === "PUT" || request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }

    if (admin && String(body.action || "") === "admin_delete") {
      const userId = cleanUserId(body.userId);
      const key = cleanKey(body.key || "");
      if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });
      if (key) {
        await env.DB.prepare(
          "DELETE FROM player_prefs WHERE user_id = ? AND pref_key = ?"
        ).bind(userId, key).run();
      } else {
        await env.DB.prepare("DELETE FROM player_prefs WHERE user_id = ?").bind(userId).run();
      }
      return json(200, { ok: true, deleted: true, userId, key: key || "*" });
    }

    const userId = cleanUserId(body.userId);
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });

    if (body.prefs && typeof body.prefs === "object" && !Array.isArray(body.prefs)) {
      const saved = {};
      for (const [rawKey, rawVal] of Object.entries(body.prefs)) {
        const key = cleanKey(rawKey);
        if (!key) continue;
        const value = cleanValue(rawVal, key);
        const updatedAt = await upsertPref(env.DB, userId, key, value);
        saved[key] = { value, updatedAt };
      }
      return json(200, { ok: true, userId, prefs: saved });
    }

    const key = cleanKey(body.key || "seen_version");
    const value = cleanValue(body.value, key);
    if (!key) return json(400, { ok: false, error: "bad_key", message: "不支持的 key" });
    const updatedAt = await upsertPref(env.DB, userId, key, value);
    return json(200, { ok: true, userId, key, value, updatedAt });
  }

  return json(405, { ok: false, error: "method", message: "不支持的方法" });
}
