import { ensureContentBlocks, listEffectiveBlockedIds } from "../content-blocks/_shared.js";

const SERIES_JSON = "/series-list-20260811.json";

async function loadSeriesStatic(request) {
  const staticUrl = new URL(SERIES_JSON, request.url);
  const staticRes = await fetch(staticUrl.toString(), {
    cf: { cacheEverything: true, cacheTtl: 86400 },
  });
  if (!staticRes.ok) return null;
  const data = await staticRes.json();
  return Array.isArray(data) ? data : null;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const db = env.DB;

  try {
    const url = new URL(request.url);
    const userId = String(url.searchParams.get("userId") || "").trim().slice(0, 80);

    let blocked = new Set();
    // 无 userId 时公共列表不查屏蔽表，避免热路径碰 D1
    if (db && userId) {
      try {
        await ensureContentBlocks(db);
        blocked = new Set(
          (await listEffectiveBlockedIds(db, "series", userId)).map((id) => String(id).toLowerCase())
        );
      } catch (_) {
        /* D1 额度用尽等：跳过屏蔽过滤，优先保证静态列表可用 */
      }
    }

    let mapped = null;
    const staticList = await loadSeriesStatic(request);
    if (staticList) {
      mapped = staticList
        .filter((r) => !blocked.has(String(r.id || "").toLowerCase()))
        .map((r) => ({
          id: r.id,
          name: r.name,
          count: Number(r.count) || 0,
          cover_url: r.cover_url || null,
        }));
    }

    if (!mapped) {
      if (!db) {
        return new Response(JSON.stringify({ error: "series_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
      try {
        const { results } = await db.prepare(
          `SELECT id, name FROM series ORDER BY name COLLATE NOCASE ASC`
        ).all();
        mapped = (results || [])
          .filter((r) => !blocked.has(String(r.id || "").toLowerCase()))
          .map((r) => ({
            id: r.id,
            name: r.name,
            count: 0,
            cover_url: null,
          }));
      } catch (_) {
        return new Response(JSON.stringify({ error: "series_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    const cacheHeaders = userId
      ? { "Cache-Control": "private, max-age=0, must-revalidate" }
      : { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" };

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
