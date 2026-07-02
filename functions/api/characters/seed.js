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
  FOREIGN KEY (series_id) REFERENCES series(id)
);
CREATE INDEX IF NOT EXISTS idx_chars_series ON characters(series_id);
CREATE INDEX IF NOT EXISTS idx_chars_count ON characters(count DESC);
CREATE INDEX IF NOT EXISTS idx_chars_name ON characters(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_chars_trigger ON characters(trigger_text COLLATE NOCASE);
`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return json(500, { error: 'DB not bound' });
  }

  const adminKey = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
    return json(403, { error: 'Forbidden' });
  }

  try {
    const { results: existing } = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='characters'"
    ).all();

    const schemaStatements = SCHEMA.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of schemaStatements) {
      await db.prepare(stmt).run();
    }

    const githubUrl = 'https://raw.githubusercontent.com/mhmoma/comfyui-Web/main/characters.json';
    const res = await fetch(githubUrl);
    if (!res.ok) {
      return json(500, { error: `Failed to fetch characters.json from GitHub: ${res.status}` });
    }
    const data = await res.json();

    await db.prepare('DELETE FROM characters').run();
    await db.prepare('DELETE FROM series').run();

    let seriesCount = 0;
    let charCount = 0;

    for (const s of data) {
      await db.prepare('INSERT INTO series (id, name, count) VALUES (?, ?, ?)')
        .bind(s.id, s.name, s.count || 0).run();
      seriesCount++;

      const BATCH = 25;
      for (let i = 0; i < s.characters.length; i += BATCH) {
        const batch = s.characters.slice(i, i + BATCH);
        const stmts = batch.map(ch =>
          db.prepare(
            'INSERT INTO characters (series_id, trigger_text, name, thumb_url, count, lora_url) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(s.id, ch.t, ch.n, ch.th || '', ch.c || 0, ch.lora || '')
        );
        await db.batch(stmts);
        charCount += batch.length;
      }
    }

    return json(200, {
      ok: true,
      series: seriesCount,
      characters: charCount,
      message: `Seeded ${seriesCount} series and ${charCount} characters`,
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
