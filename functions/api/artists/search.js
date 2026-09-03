import { ensureContentBlocks, listEffectiveBlockedIds } from "../content-blocks/_shared.js";
import { filterCatalog, loadArtistsCatalog, sortCatalog } from "./_catalog.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json(500, { error: "DB not bound" });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10), 200);
  const userId = String(url.searchParams.get("userId") || "").trim().slice(0, 80);

  if (!q || q.length < 1) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    let blocked = [];
    try {
      await ensureContentBlocks(db);
      blocked = await listEffectiveBlockedIds(db, "artist", userId);
    } catch (_) {}

    const catalog = await loadArtistsCatalog(request);
    if (catalog) {
      let rows = filterCatalog(catalog, { q, blocked });
      rows = sortCatalog(rows, "count", "DESC").slice(0, limit);
      return new Response(JSON.stringify(rows), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    const pattern = `%${q}%`;
    const binds = [pattern, pattern, pattern];
    let notIn = "";
    if (blocked.length) {
      notIn = ` AND slug NOT IN (${blocked.map(() => "?").join(",")})`;
      binds.push(...blocked);
    }
    binds.push(limit);

    const { results } = await db.prepare(
      `SELECT slug, name, trigger_text, count, score, thumb_url, img_url
       FROM artists
       WHERE (name LIKE ? OR trigger_text LIKE ? OR slug LIKE ?)${notIn}
       ORDER BY count DESC
       LIMIT ?`
    ).bind(...binds).all();

    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
