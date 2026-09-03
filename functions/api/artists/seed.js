const SCHEMA = `
CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trigger_text TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  score REAL DEFAULT 0,
  thumb_url TEXT DEFAULT '',
  img_url TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_artists_count ON artists(count DESC);
CREATE INDEX IF NOT EXISTS idx_artists_score ON artists(score DESC);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_artists_trigger ON artists(trigger_text COLLATE NOCASE);
`;

const BATCH_SIZE = 50;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
};

async function ensureAppMetaTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  ).run();
}

async function writeMetaKey(db, key, value) {
  await ensureAppMetaTable(db);
  await db.prepare(
    "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)"
  ).bind(key, String(value), Date.now()).run();
}

async function rebuildArtistsMeta(db) {
  const { results } = await db.prepare("SELECT COUNT(*) as cnt FROM artists").all();
  const total = Number(results[0]?.cnt) || 0;
  await writeMetaKey(db, "artists_total", total);

  const letters = {};
  for (const ch of "abcdefghijklmnopqrstuvwxyz") {
    const row = await db.prepare(
      "SELECT COUNT(*) AS cnt FROM artists WHERE LOWER(SUBSTR(name, 1, 1)) = ?"
    ).bind(ch).first();
    letters[ch] = Number(row?.cnt) || 0;
    await writeMetaKey(db, `artists_letter_${ch}`, letters[ch]);
  }
  const otherRow = await db.prepare(
    "SELECT COUNT(*) AS cnt FROM artists WHERE LOWER(SUBSTR(name, 1, 1)) NOT BETWEEN 'a' AND 'z'"
  ).first();
  letters.other = Number(otherRow?.cnt) || 0;
  await writeMetaKey(db, "artists_letter_other", letters.other);

  return { total, letters };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json(500, { error: "DB not bound" });

  const adminKey = request.headers.get("x-admin-key");
  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return json(403, { error: "Forbidden" });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "data";

  try {
    if (action === "init") {
      await db.prepare("DROP TABLE IF EXISTS artists").run();
      const stmts = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        await db.prepare(stmt).run();
      }
      return json(200, { ok: true, message: "Artists table created" });
    }

    if (action === "status") {
      const meta = await rebuildArtistsMeta(db);
      return json(200, { ok: true, artists: meta.total });
    }

    if (action === "rebuild-meta") {
      const meta = await rebuildArtistsMeta(db);
      return json(200, {
        ok: true,
        ...meta,
        message: "app_meta rebuilt",
      });
    }

    const body = await request.json();
    if (!Array.isArray(body) || body.length === 0) {
      return json(400, { error: "POST body must be a non-empty array of artist objects" });
    }

    let inserted = 0;
    const allStmts = body.map((a) =>
      db.prepare(
        "INSERT OR REPLACE INTO artists (slug, name, trigger_text, count, score, thumb_url, img_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(a.slug, a.name, a.trigger, a.count || 0, a.score || 0, a.thumb_url || "", a.img_url || "")
    );

    for (let i = 0; i < allStmts.length; i += BATCH_SIZE) {
      const chunk = allStmts.slice(i, i + BATCH_SIZE);
      await db.batch(chunk);
      inserted += chunk.length;
    }

    return json(200, { ok: true, inserted, note: "After bulk seed run ?action=rebuild-meta once" });
  } catch (e) {
    return json(500, { error: e.message, stack: e.stack });
  }
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return onRequestOptions();
  if (request.method === "POST") return onRequestPost(context);
  return json(405, { error: "method" });
}

function json(status, data) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
