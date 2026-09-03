import { ensureContentBlocks, isContentBlockedForUser } from "../content-blocks/_shared.js";

const CHARS_INDEX = "/chars/_index.json";

let indexMem = null;
let indexInflight = null;
const seriesCache = new Map(); // seriesId -> rows

async function loadCharsIndex(request) {
  if (indexMem) return indexMem;
  if (indexInflight) return indexInflight;
  indexInflight = (async () => {
    const res = await fetch(new URL(CHARS_INDEX, request.url).toString(), {
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object" || !data.files) return null;
    indexMem = data;
    return data;
  })().finally(() => {
    indexInflight = null;
  });
  return indexInflight;
}

async function loadSeriesStatic(request, seriesId) {
  if (seriesCache.has(seriesId)) return seriesCache.get(seriesId);
  const index = await loadCharsIndex(request);
  const fname = index?.files?.[seriesId];
  if (!fname) return null;
  const res = await fetch(new URL(`/chars/${fname}`, request.url).toString(), {
    cf: { cacheEverything: true, cacheTtl: 86400 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data)) return null;
  if (seriesCache.size > 80) {
    const first = seriesCache.keys().next().value;
    seriesCache.delete(first);
  }
  seriesCache.set(seriesId, data);
  return data;
}

function filterRows(rows, q) {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((r) => {
    const d = String(r.d || "").toLowerCase();
    const t = String(r.t || "").toLowerCase();
    return d.includes(needle) || t.includes(needle);
  });
}

function mapRow(r) {
  return {
    t: r.t,
    d: r.d,
    th: r.th || undefined,
    lora: r.lora || undefined,
    tags: Array.isArray(r.tags)
      ? r.tags
      : r.tags
        ? (() => {
            try {
              return JSON.parse(r.tags);
            } catch (_) {
              return undefined;
            }
          })()
        : undefined,
  };
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  const seriesId = decodeURIComponent(params.id);
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get("page");
  const q = (url.searchParams.get("q") || "").trim();
  const limitRaw = parseInt(url.searchParams.get("limit") || "48", 10);
  const paginate = pageRaw != null && pageRaw !== "";
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 48));
  const userId = String(url.searchParams.get("userId") || "").trim().slice(0, 80);

  const cors = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": userId
      ? "private, max-age=15, must-revalidate"
      : "public, max-age=3600, stale-while-revalidate=86400",
  };

  if (!seriesId) {
    return new Response(JSON.stringify({ error: "Missing series id" }), { status: 400, headers: cors });
  }

  try {
    if (db && userId) {
      try {
        await ensureContentBlocks(db);
        if (await isContentBlockedForUser(db, "series", seriesId, userId)) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "blocked",
              message: "该作品已被管理员最高级屏蔽，无法访问",
            }),
            { status: 403, headers: cors }
          );
        }
      } catch (_) {
        /* 额度不足时跳过屏蔽检查，优先返回静态角色 */
      }
    }

    const staticRows = await loadSeriesStatic(request, seriesId);
    if (staticRows) {
      const filtered = filterRows(staticRows, q).map(mapRow);
      if (!paginate) {
        return new Response(JSON.stringify(filtered), {
          headers: { ...cors, "X-Chars-Source": "static" },
        });
      }
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
      const safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * limit;
      const items = filtered.slice(offset, offset + limit);
      return new Response(
        JSON.stringify({
          items,
          total,
          page: safePage,
          limit,
          totalPages,
          hasMore: safePage < totalPages,
          source: "static",
        }),
        { headers: { ...cors, "X-Chars-Source": "static" } }
      );
    }

    if (!db) {
      return new Response(JSON.stringify({ error: "Database not configured" }), {
        status: 500,
        headers: cors,
      });
    }

    const like = q ? `%${q}%` : null;

    // 无 page：兼容旧客户端，返回完整数组
    if (!paginate) {
      const { results } = like
        ? await db
            .prepare(
              `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
             FROM characters
             WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)
             ORDER BY count DESC`
            )
            .bind(seriesId, like, like)
            .all()
        : await db
            .prepare(
              `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
             FROM characters WHERE series_id = ?
             ORDER BY count DESC`
            )
            .bind(seriesId)
            .all();
      return new Response(JSON.stringify((results || []).map(mapRow)), {
        headers: { ...cors, "X-Chars-Source": "d1" },
      });
    }

    const offset = (page - 1) * limit;
    const { results } = like
      ? await db
          .prepare(
            `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters
           WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
          )
          .bind(seriesId, like, like, limit + 1, offset)
          .all()
      : await db
          .prepare(
            `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters WHERE series_id = ?
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
          )
          .bind(seriesId, limit + 1, offset)
          .all();

    const fetched = results || [];
    const hasMore = fetched.length > limit;
    const items = (hasMore ? fetched.slice(0, limit) : fetched).map(mapRow);
    let knownTotal = 0;
    if (!like) {
      try {
        knownTotal = Number(
          (await db.prepare(`SELECT count AS n FROM series WHERE id = ? LIMIT 1`).bind(seriesId).first())?.n || 0
        );
      } catch (_) {}
    }
    const total = knownTotal > 0 ? knownTotal : hasMore ? offset + limit + 1 : offset + items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

    return new Response(
      JSON.stringify({
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore,
        source: "d1",
      }),
      { headers: { ...cors, "X-Chars-Source": "d1" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}
