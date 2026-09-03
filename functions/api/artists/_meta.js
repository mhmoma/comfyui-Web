export const ARTISTS_META_JSON = "/artists-meta.json";

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

/**
 * 禁止在热路径自动 COUNT(*)：artists 约 1.6 万行，多 isolate 并发会瞬间打穿免费额度。
 * total 只来自静态 artists-meta.json 或已写入的 app_meta。
 */
export async function resolveArtistTotal(db, request, letter) {
  const meta = await loadArtistsMeta(request);
  let total = metaTotalForLetter(meta, letter);
  if (total != null) return total;

  total = await readAppMetaTotal(db, letter);
  if (total != null) return total;
  return null;
}
