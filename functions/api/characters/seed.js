const SCHEMA = `
CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  count INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id TEXT NOT NULL,
  trigger_text TEXT NOT NULL,
  name TEXT NOT NULL,
  thumb_url TEXT DEFAULT '',
  count INTEGER DEFAULT 0,
  lora_url TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  FOREIGN KEY (series_id) REFERENCES series(id)
);
CREATE INDEX IF NOT EXISTS idx_chars_series ON characters(series_id);
CREATE INDEX IF NOT EXISTS idx_chars_count ON characters(count DESC);
CREATE INDEX IF NOT EXISTS idx_chars_name ON characters(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_chars_trigger ON characters(trigger_text COLLATE NOCASE);
`;

const SERIES_PER_BATCH = 50;

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json(500, { error: 'DB not bound' });

  const adminKey = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return json(403, { error: 'Forbidden' });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '0', 10);

  try {
    if (page === 0) {
      const stmts = SCHEMA.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        await db.prepare(stmt).run();
      }
      await db.prepare('DELETE FROM characters').run();
      await db.prepare('DELETE FROM series').run();
    }

    const githubUrl = 'https://raw.githubusercontent.com/mhmoma/comfyui-Web/main/characters.json';
    const res = await fetch(githubUrl);
    if (!res.ok) return json(500, { error: `GitHub fetch failed: ${res.status}` });
    const allData = await res.json();

    const start = page * SERIES_PER_BATCH;
    const end = Math.min(start + SERIES_PER_BATCH, allData.length);
    const batch = allData.slice(start, end);

    if (batch.length === 0) {
      const { results } = await db.prepare('SELECT COUNT(*) as cnt FROM characters').all();
      const charCount = results[0]?.cnt || 0;
      return json(200, { ok: true, done: true, totalCharacters: charCount, message: 'All data seeded!' });
    }

    let charCount = 0;
    const seriesStmts = batch.map(s =>
      db.prepare('INSERT OR REPLACE INTO series (id, name, count) VALUES (?, ?, ?)').bind(s.id, s.name, s.count || 0)
    );
    await db.batch(seriesStmts);

    for (const s of batch) {
      const charStmts = s.characters.map(ch =>
        db.prepare(
          'INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(s.id, ch.t, ch.n, ch.th || '', ch.c || 0, ch.lora || '', ch.tags ? JSON.stringify(ch.tags) : '')
      );
      if (charStmts.length > 0) {
        await db.batch(charStmts);
        charCount += charStmts.length;
      }
    }

    const hasMore = end < allData.length;
    return json(200, {
      ok: true,
      done: !hasMore,
      page,
      seriesProcessed: batch.length,
      charactersInserted: charCount,
      progress: `${end}/${allData.length} series`,
      nextPage: hasMore ? page + 1 : null,
    });
  } catch (e) {
    return json(500, { error: e.message, stack: e.stack });
  }
}

function json(status, data) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
