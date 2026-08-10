const ALLOWED_KEYS = new Set(["seen_version"]);

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
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

function cleanKey(value) {
  const key = String(value || "").trim().slice(0, 64);
  return ALLOWED_KEYS.has(key) ? key : "";
}

function cleanValue(value) {
  return String(value ?? "").trim().slice(0, 64);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });

  await ensureTable(env.DB);

  if (request.method === "GET") {
    const url = new URL(request.url);
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

  if (request.method === "PUT" || request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    const userId = cleanUserId(body.userId);
    const key = cleanKey(body.key || "seen_version");
    const value = cleanValue(body.value);
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
