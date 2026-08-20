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

    // 避免对每个系列做相关子查询（3690+ 系列时可达数秒～十几秒）
    const { results } = await db.prepare(
      `SELECT s.id, s.name,
              COALESCE(cnt.n, 0) AS char_count,
              cov.thumb_url AS cover_url
       FROM series s
       LEFT JOIN (
         SELECT series_id, COUNT(*) AS n
         FROM characters
         GROUP BY series_id
       ) cnt ON cnt.series_id = s.id
       LEFT JOIN (
         SELECT c.series_id, c.thumb_url
         FROM characters c
         INNER JOIN (
           SELECT series_id, MAX(count) AS max_count
           FROM characters
           WHERE thumb_url IS NOT NULL AND thumb_url != ''
           GROUP BY series_id
         ) best
           ON best.series_id = c.series_id AND c.count = best.max_count
         WHERE c.thumb_url IS NOT NULL AND c.thumb_url != ''
         GROUP BY c.series_id
       ) cov ON cov.series_id = s.id
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
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
