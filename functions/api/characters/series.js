import { ensureContentBlocks, listEffectiveBlockedIds } from "../content-blocks/_shared.js";

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
    const url = new URL(context.request.url);
    const userId = String(url.searchParams.get("userId") || "").trim().slice(0, 80);
    const blocked = new Set(
      (await listEffectiveBlockedIds(db, "series", userId)).map((id) => String(id).toLowerCase())
    );

    // 列表只要 id/name/count；封面按系列点开再取，避免 3600+ 行 JOIN + 大 JSON 把生图页拖死
    const { results } = await db.prepare(
      `SELECT s.id, s.name, COALESCE(cnt.n, 0) AS char_count
       FROM series s
       LEFT JOIN (
         SELECT series_id, COUNT(*) AS n
         FROM characters
         GROUP BY series_id
       ) cnt ON cnt.series_id = s.id
       ORDER BY char_count DESC, s.name COLLATE NOCASE ASC`
    ).all();

    const mapped = (results || [])
      .filter((r) => !blocked.has(String(r.id || "").toLowerCase()))
      .map((r) => ({
        id: r.id,
        name: r.name,
        count: r.char_count || 0,
        cover_url: null,
      }));

    const cacheHeaders = userId
      ? { "Cache-Control": "private, max-age=0, must-revalidate" }
      : { "Cache-Control": "public, max-age=120, s-maxage=300" };

    return new Response(JSON.stringify(mapped), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        ...cacheHeaders,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
