const ALLOWED_KEYS = new Set(["seen_version", "mud_codes"]);
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

function cleanKey(value) {
  const key = String(value || "").trim().slice(0, 64);
  return ALLOWED_KEYS.has(key) ? key : "";
}

function cleanValue(value, key = "") {
  const max = key === "mud_codes" ? 512 : 64;
  return String(value ?? "").trim().slice(0, max);
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
    const key = cleanKey(url.searchParams.get("key") || "seen_version");
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });
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
    const key = cleanKey(body.key || "seen_version");
    const value = cleanValue(body.value, key);
    if (!userId) return json(400, { ok: false, error: "no_user", message: "缺少 userId" });
    if (!key) return json(400, { ok: false, error: "bad_key", message: "不支持的 key" });
    if (!value) return json(400, { ok: false, error: "empty", message: "value 不能为空" });
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO player_prefs (user_id, pref_key, pref_value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, pref_key) DO UPDATE SET
         pref_value = excluded.pref_value,
         updated_at = excluded.updated_at`
    ).bind(userId, key, value, now).run();
    return json(200, { ok: true, userId, key, value, updatedAt: now });
  }

  return json(405, { ok: false, error: "method", message: "不支持的方法" });
}
