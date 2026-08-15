const SCHEMA = `
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS series;
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

const CHARS_PER_BATCH = 50;

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json(500, { error: 'DB not bound' });

  const adminKey = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return json(403, { error: 'Forbidden' });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'data';

  try {
    if (action === 'init') {
      const stmts = SCHEMA.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        await db.prepare(stmt).run();
      }
      return json(200, { ok: true, message: 'Schema created, tables cleared' });
    }

    if (action === 'status') {
      const { results: sc } = await db.prepare('SELECT COUNT(*) as cnt FROM series').all();
      const { results: cc } = await db.prepare('SELECT COUNT(*) as cnt FROM characters').all();
      return json(200, { ok: true, series: sc[0]?.cnt || 0, characters: cc[0]?.cnt || 0 });
    }

    // 增量补录：[{ series_id, series_name?, characters:[{t,n,th,c,lora,tags}] }]
    // 按 trigger_text 去重替换，并重算 series.count
    if (action === 'patch') {
      const body = await request.json();
      if (!Array.isArray(body) || body.length === 0) {
        return json(400, { error: 'POST body must be a non-empty array of patch objects' });
      }
      let upserted = 0;
      const seriesTouched = [];
      for (const patch of body) {
        const seriesId = String(patch.series_id || '').trim();
        if (!seriesId || !Array.isArray(patch.characters)) continue;
        const seriesName = String(patch.series_name || seriesId);
        await db.prepare(
          'INSERT INTO series (id, name, count) VALUES (?, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name'
        ).bind(seriesId, seriesName).run();
        for (const ch of patch.characters) {
          const t = String(ch.t || '').trim();
          if (!t) continue;
          await db.prepare(
            'DELETE FROM characters WHERE series_id = ? AND trigger_text = ?'
          ).bind(seriesId, t).run();
          await db.prepare(
            'INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            seriesId,
            t,
            ch.n || t.split(',')[0].trim(),
            ch.th || '',
            ch.c || 0,
            ch.lora || '',
            ch.tags ? JSON.stringify(ch.tags) : ''
          ).run();
          upserted += 1;
        }
        const row = await db.prepare(
          'SELECT COUNT(*) AS n FROM characters WHERE series_id = ?'
        ).bind(seriesId).first();
        const n = Number(row?.n || 0);
        await db.prepare('UPDATE series SET count = ? WHERE id = ?').bind(n, seriesId).run();
        seriesTouched.push({ id: seriesId, count: n });
      }
      return json(200, { ok: true, upserted, series: seriesTouched });
    }

    const body = await request.json();
    if (!Array.isArray(body) || body.length === 0) {
      return json(400, { error: 'POST body must be a non-empty array of series objects' });
    }

    let charCount = 0;
    const seriesStmts = body.map(s =>
      db.prepare('INSERT OR REPLACE INTO series (id, name, count) VALUES (?, ?, ?)').bind(
        s.id,
        s.name,
        Array.isArray(s.characters) ? s.characters.length : (s.count || 0)
      )
    );
    await db.batch(seriesStmts);

    for (const s of body) {
      if (!s.characters || !Array.isArray(s.characters)) continue;
      const allCharStmts = s.characters.map(ch =>
        db.prepare(
          'INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url, tags) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(s.id, ch.t, ch.n, ch.th || '', ch.c || 0, ch.lora || '', ch.tags ? JSON.stringify(ch.tags) : '')
      );
      for (let i = 0; i < allCharStmts.length; i += CHARS_PER_BATCH) {
        const chunk = allCharStmts.slice(i, i + CHARS_PER_BATCH);
        await db.batch(chunk);
        charCount += chunk.length;
      }
    }

    return json(200, {
      ok: true,
      seriesProcessed: body.length,
      charactersInserted: charCount,
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
