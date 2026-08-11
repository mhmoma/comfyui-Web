import { ensureContentBlocks, isContentBlocked, listBlockedIds } from "../content-blocks/_shared.js";

export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    await ensureContentBlocks(db);
    const blocked = new Set(
      (await listBlockedIds(db, "series")).map((id) => String(id).toLowerCase())
    );

    const { results } = await db.prepare(
      `SELECT s.id, s.name,
              (SELECT COUNT(*) FROM characters c WHERE c.series_id = s.id) AS char_count,
              (SELECT c.thumb_url FROM characters c
               WHERE c.series_id = s.id AND c.thumb_url IS NOT NULL AND c.thumb_url != ''
               ORDER BY c.count DESC LIMIT 1) AS cover_url
       FROM series s
       ORDER BY char_count DESC, s.name COLLATE NOCASE ASC`
    ).all();

    const mapped = (results || [])
      .filter((r) => !blocked.has(String(r.id || "").toLowerCase()))
      .map((r) => ({
        id: r.id,
        name: r.name,
        count: r.char_count || 0,
        cover_url: r.cover_url || null,
      }));

    return new Response(JSON.stringify(mapped), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30, must-revalidate",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
