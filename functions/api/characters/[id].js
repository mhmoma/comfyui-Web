import { ensureContentBlocks, isContentBlockedForUser } from "../content-blocks/_shared.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  const seriesId = decodeURIComponent(params.id);
  const url = new URL(request.url);
  const pageRaw = url.searchParams.get('page');
  const q = (url.searchParams.get('q') || '').trim();
  const limitRaw = parseInt(url.searchParams.get('limit') || '48', 10);
  const paginate = pageRaw != null && pageRaw !== '';
  const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 48));
  const userId = String(url.searchParams.get('userId') || '').trim().slice(0, 80);

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': userId ? 'private, max-age=15, must-revalidate' : 'public, max-age=30, must-revalidate',
  };

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500, headers: cors });
  }
  if (!seriesId) {
    return new Response(JSON.stringify({ error: 'Missing series id' }), { status: 400, headers: cors });
  }

  try {
    await ensureContentBlocks(db);
    if (await isContentBlockedForUser(db, 'series', seriesId, userId)) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'blocked',
        message: '该作品已被管理员最高级屏蔽，无法访问',
      }), { status: 403, headers: cors });
    }

    const like = q ? `%${q}%` : null;

    // 无 page：兼容旧客户端，返回完整数组
    if (!paginate) {
      const { results } = like
        ? await db.prepare(
            `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
             FROM characters
             WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)
             ORDER BY count DESC`
          ).bind(seriesId, like, like).all()
        : await db.prepare(
            `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
             FROM characters WHERE series_id = ?
             ORDER BY count DESC`
          ).bind(seriesId).all();
      return new Response(JSON.stringify((results || []).map(mapRow)), { headers: cors });
    }

    // 用 LIMIT+1 判断 hasMore，避免每次 COUNT(*) 再扫一遍同系列角色
    const offset = (page - 1) * limit;
    const { results } = like
      ? await db.prepare(
          `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters
           WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
        ).bind(seriesId, like, like, limit + 1, offset).all()
      : await db.prepare(
          `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters WHERE series_id = ?
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
        ).bind(seriesId, limit + 1, offset).all();

    const fetched = results || [];
    const hasMore = fetched.length > limit;
    const items = (hasMore ? fetched.slice(0, limit) : fetched).map(mapRow);
    const knownTotal = !like
      ? Number((await db.prepare(`SELECT count AS n FROM series WHERE id = ? LIMIT 1`).bind(seriesId).first())?.n || 0)
      : 0;
    const total = knownTotal > 0 ? knownTotal : (hasMore ? offset + limit + 1 : offset + items.length);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

    return new Response(JSON.stringify({
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}

function mapRow(r) {
  return {
    t: r.t,
    d: r.d,
    th: r.th || undefined,
    lora: r.lora || undefined,
    tags: r.tags ? JSON.parse(r.tags) : undefined,
  };
}
