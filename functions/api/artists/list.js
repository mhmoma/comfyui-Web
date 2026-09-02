import { ensureContentBlocks, listEffectiveBlockedIds } from "../content-blocks/_shared.js";
import { resolveArtistTotal } from "./_meta.js";

const VALID_SORT = { score: "score", count: "count", fav: "score", name: "name" };
const VALID_ORDER = { asc: "ASC", desc: "DESC" };

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json(500, { error: "DB not bound" });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
  const sortParam = url.searchParams.get("sort") || "score";
  const orderParam = url.searchParams.get("order") || (sortParam === "name" ? "asc" : "desc");
  const letter = (url.searchParams.get("letter") || "").toLowerCase();
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const userId = String(url.searchParams.get("userId") || "").trim().slice(0, 80);
  const offset = (page - 1) * limit;
  const needTotal = page === 1;

  const sortCol = VALID_SORT[sortParam] || "score";
  const sortDir = VALID_ORDER[orderParam] || "DESC";

  try {
    let blocked = [];
    try {
      await ensureContentBlocks(db);
      blocked = await listEffectiveBlockedIds(db, "artist", userId);
    } catch (_) {
      /* D1 不可用时跳过屏蔽，保证列表可读 */
    }
    const conditions = [];
    const binds = [];

    if (letter && letter !== "all") {
      if (letter === "other") {
        conditions.push("LOWER(SUBSTR(name, 1, 1)) NOT BETWEEN 'a' AND 'z'");
      } else if (/^[a-z]$/.test(letter)) {
        conditions.push("LOWER(SUBSTR(name, 1, 1)) = ?");
        binds.push(letter);
      }
    }
    if (q) {
      conditions.push("(name LIKE ? OR trigger_text LIKE ? OR slug LIKE ?)");
      binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (blocked.length) {
      const placeholders = blocked.map(() => "?").join(",");
      conditions.push(`slug NOT IN (${placeholders})`);
      binds.push(...blocked);
    }

    const where = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const dataQuery = `SELECT slug, name, trigger_text, count, score, thumb_url, img_url FROM artists${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;

    const dataResult = await db.prepare(dataQuery).bind(...binds, limit + 1, offset).all();
    const fetched = dataResult.results || [];
    const hasMore = fetched.length > limit;
    const results = hasMore ? fetched.slice(0, limit) : fetched;

    let total = null;
    let pages = null;
    const canUseMeta = needTotal && !q && blocked.length === 0;
    if (canUseMeta) {
      total = await resolveArtistTotal(db, request, letter);
    }
    if (needTotal && total == null && !hasMore) {
      total = results.length;
    }
    if (total != null) pages = Math.max(1, Math.ceil(total / limit));
    else if (needTotal && !hasMore) pages = page;
    else if (needTotal && hasMore) pages = page + 1;

    return new Response(
      JSON.stringify({
        total,
        page,
        pages,
        hasMore,
        results,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": userId || blocked.length || q
            ? "private, max-age=0, must-revalidate"
            : needTotal
              ? "public, max-age=86400, stale-while-revalidate=604800"
              : "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
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
