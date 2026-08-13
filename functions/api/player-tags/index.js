/**
 * 玩家自建词条库（分类 + 词条）
 * GET  ?userId=
 * PUT  { userId, categories, tags }
 * DELETE { userId } 清空
 */
const MAX_CATEGORIES = 30;
const MAX_TAGS = 500;
const MAX_NAME = 40;
const MAX_EN = 200;
const MAX_ZH = 80;
const MAX_PAYLOAD = 120_000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_custom_tags (
    user_id TEXT NOT NULL PRIMARY KEY,
    payload TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  )`,
];

let ready = false;

async function ensureTable(db) {
  if (ready) return;
  for (const stmt of SCHEMA) {
    try { await db.prepare(stmt).run(); } catch (_) {}
  }
  ready = true;
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
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
    },
  });
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

function uidFrom(request, body) {
  const header = cleanUserId(request.headers.get("x-user-id"));
  const fromBody = cleanUserId(body?.userId);
  const fromQuery = cleanUserId(new URL(request.url).searchParams.get("userId"));
  return header || fromBody || fromQuery;
}

function sanitizeLib(raw) {
  const catsIn = Array.isArray(raw?.categories) ? raw.categories : [];
  const tagsIn = Array.isArray(raw?.tags) ? raw.tags : [];
  const categories = [];
  const catIds = new Set();
  for (const row of catsIn.slice(0, MAX_CATEGORIES)) {
    const id = String(row?.id || "").trim().slice(0, 40);
    const name = String(row?.name || "").trim().slice(0, MAX_NAME);
    if (!id || !name) continue;
    if (catIds.has(id)) continue;
    catIds.add(id);
    categories.push({
      id,
      name,
      sort: Math.floor(Number(row?.sort) || categories.length),
    });
  }
  categories.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh"));

  const tags = [];
  const tagIds = new Set();
  for (const row of tagsIn.slice(0, MAX_TAGS)) {
    const id = String(row?.id || "").trim().slice(0, 40);
    const en = String(row?.en || row?.t || "").trim().slice(0, MAX_EN);
    if (!id || !en) continue;
    if (tagIds.has(id)) continue;
    tagIds.add(id);
    let categoryId = String(row?.categoryId || "").trim().slice(0, 40);
    if (categoryId && !catIds.has(categoryId)) categoryId = "";
    tags.push({
      id,
      categoryId,
      en,
      zh: String(row?.zh || row?.d || "").trim().slice(0, MAX_ZH),
      sort: Math.floor(Number(row?.sort) || tags.length),
    });
  }
  tags.sort((a, b) => a.sort - b.sort || a.en.localeCompare(b.en));

  return { categories, tags };
}

function emptyLib() {
  return { categories: [], tags: [] };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db" });
  await ensureTable(env.DB);

  if (request.method === "GET") {
    const userId = uidFrom(request, null);
    if (!userId) return json(400, { ok: false, error: "need_user" });
    const row = await env.DB.prepare(
      "SELECT payload, updated_at FROM player_custom_tags WHERE user_id = ? LIMIT 1"
    ).bind(userId).first();
    if (!row) {
      return json(200, { ok: true, userId, ...emptyLib(), updatedAt: 0 });
    }
    let parsed = emptyLib();
    try { parsed = sanitizeLib(JSON.parse(row.payload || "{}")); } catch (_) {}
    return json(200, {
      ok: true,
      userId,
      categories: parsed.categories,
      tags: parsed.tags,
      updatedAt: Number(row.updated_at) || 0,
    });
  }

  if (request.method === "PUT") {
    let body = {};
    try { body = await request.json(); } catch (_) {
      return json(400, { ok: false, error: "bad_json" });
    }
    const userId = uidFrom(request, body);
    if (!userId) return json(400, { ok: false, error: "need_user" });
    const lib = sanitizeLib(body);
    const payload = JSON.stringify(lib);
    if (payload.length > MAX_PAYLOAD) {
      return json(400, { ok: false, error: "too_large", message: "词条库过大" });
    }
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO player_custom_tags (user_id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`
    ).bind(userId, payload, now).run();
    return json(200, {
      ok: true,
      userId,
      categories: lib.categories,
      tags: lib.tags,
      updatedAt: now,
    });
  }

  if (request.method === "DELETE") {
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const userId = uidFrom(request, body);
    if (!userId) return json(400, { ok: false, error: "need_user" });
    await env.DB.prepare("DELETE FROM player_custom_tags WHERE user_id = ?").bind(userId).run();
    return json(200, { ok: true, userId, cleared: true });
  }

  return json(405, { ok: false, error: "method" });
}
