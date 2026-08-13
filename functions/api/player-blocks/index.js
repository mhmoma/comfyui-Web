/**
 * 玩家个人作品限制（隐藏不可见）
 * GET ?userId=  → { series: string[] }
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_content_blocks (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'series',
    target_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, target_id)
  )`,
];

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
      "Cache-Control": "private, max-age=15",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

async function ensure(db) {
  for (const stmt of SCHEMA) {
    try { await db.prepare(stmt).run(); } catch (_) {}
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "GET") return json(405, { ok: false, error: "method" });
  if (!env.DB) return json(500, { ok: false, error: "no_db" });
  await ensure(env.DB);

  const url = new URL(request.url);
  const userId = cleanUserId(url.searchParams.get("userId"));
  if (!userId) return json(400, { ok: false, error: "no_user" });

  try {
    const { results } = await env.DB.prepare(
      `SELECT target_id FROM player_content_blocks WHERE user_id = ? AND kind = 'series'`
    ).bind(userId).all();
    const series = (results || []).map((r) => String(r.target_id || "").trim()).filter(Boolean);
    return json(200, { ok: true, userId, series });
  } catch (_) {
    return json(200, { ok: true, userId, series: [] });
  }
}
