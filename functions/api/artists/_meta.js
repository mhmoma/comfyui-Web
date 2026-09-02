export const ARTISTS_META_JSON = "/artists-meta.json";

let bootstrapInflight = null;

export async function loadArtistsMeta(request) {
  try {
    const url = new URL(ARTISTS_META_JSON, request.url);
    const res = await fetch(url.toString(), {
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (_) {
    return null;
  }
}

export function metaTotalForLetter(meta, letter) {
  if (!meta) return null;
  if (!letter || letter === "all") {
    const total = Number(meta.total);
    return Number.isFinite(total) && total > 0 ? total : null;
  }
  const letters = meta.letters && typeof meta.letters === "object" ? meta.letters : null;
  if (!letters) return null;
  const raw = letters[letter];
  const total = Number(raw);
  return Number.isFinite(total) && total >= 0 ? total : null;
}

export async function ensureAppMetaTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  ).run();
}

export async function readAppMetaTotal(db, letter) {
  try {
    await ensureAppMetaTable(db);
    const key = !letter || letter === "all" ? "artists_total" : `artists_letter_${letter}`;
    const row = await db.prepare("SELECT value FROM app_meta WHERE key = ? LIMIT 1").bind(key).first();
    const total = parseInt(String(row?.value ?? ""), 10);
    return Number.isFinite(total) && total >= 0 ? total : null;
  } catch (_) {
    return null;
  }
}

async function writeAppMeta(db, key, value) {
  await ensureAppMetaTable(db);
  await db.prepare(
    "INSERT OR REPLACE INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)"
  ).bind(key, String(value), Date.now()).run();
}

/** 额度恢复后首次缺 total 时自动 COUNT 一次并写入 app_meta，之后只读 1 行。 */
async function bootstrapArtistTotal(db, letter) {
  const cacheKey = !letter || letter === "all" ? "all" : letter;
  if (bootstrapInflight && bootstrapInflight.key === cacheKey) {
    return bootstrapInflight.promise;
  }

  const promise = (async () => {
    const existing = await readAppMetaTotal(db, letter);
    if (existing != null) return existing;

    let where = "";
    const binds = [];
    let metaKey = "artists_total";

    if (letter && letter !== "all") {
      metaKey = letter === "other" ? "artists_letter_other" : `artists_letter_${letter}`;
      if (letter === "other") {
        where = " WHERE LOWER(SUBSTR(name, 1, 1)) NOT BETWEEN 'a' AND 'z'";
      } else if (/^[a-z]$/.test(letter)) {
        where = " WHERE LOWER(SUBSTR(name, 1, 1)) = ?";
        binds.push(letter);
      } else {
        return null;
      }
    }

    const { results } = await db.prepare(`SELECT COUNT(*) AS cnt FROM artists${where}`).bind(...binds).all();
    const total = Number(results[0]?.cnt) || 0;
    await writeAppMeta(db, metaKey, total);
    return total;
  })();

  bootstrapInflight = { key: cacheKey, promise };
  try {
    return await promise;
  } finally {
    if (bootstrapInflight?.promise === promise) bootstrapInflight = null;
  }
}

export async function resolveArtistTotal(db, request, letter) {
  const meta = await loadArtistsMeta(request);
  let total = metaTotalForLetter(meta, letter);
  if (total != null) return total;

  total = await readAppMetaTotal(db, letter);
  if (total != null) return total;

  try {
    return await bootstrapArtistTotal(db, letter);
  } catch (_) {
    return null;
  }
}
