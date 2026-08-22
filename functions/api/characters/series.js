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

    // 数量来自静态 series_char_counts.json；这里只返回系列目录，保证秒开
    // 展示排序由前端按角色数降序完成（勿在此按 name 当最终 UI 序）
    const { results } = await db.prepare(
      `SELECT id, name FROM series ORDER BY name COLLATE NOCASE ASC`
    ).all();

    const mapped = (results || [])
      .filter((r) => !blocked.has(String(r.id || "").toLowerCase()))
      .map((r) => ({
        id: r.id,
        name: r.name,
        count: 0,
        cover_url: null,
      }));

    // 前端用 series_char_counts.json 覆盖 count，并按角色数降序展示
    const cacheHeaders = userId
      ? { "Cache-Control": "private, max-age=0, must-revalidate" }
      : { "Cache-Control": "public, max-age=300, s-maxage=600" };

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
