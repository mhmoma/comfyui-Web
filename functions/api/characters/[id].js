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

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60, must-revalidate',
  };

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500, headers: cors });
  }
  if (!seriesId) {
    return new Response(JSON.stringify({ error: 'Missing series id' }), { status: 400, headers: cors });
  }

  try {
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

    const countRow = like
      ? await db.prepare(
          `SELECT COUNT(*) AS n FROM characters
           WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)`
        ).bind(seriesId, like, like).first()
      : await db.prepare(
          `SELECT COUNT(*) AS n FROM characters WHERE series_id = ?`
        ).bind(seriesId).first();
    const total = Number(countRow?.n || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const { results } = like
      ? await db.prepare(
          `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters
           WHERE series_id = ? AND (name LIKE ? OR trigger_text LIKE ?)
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
        ).bind(seriesId, like, like, limit, offset).all()
      : await db.prepare(
          `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora, tags
           FROM characters WHERE series_id = ?
           ORDER BY count DESC
           LIMIT ? OFFSET ?`
        ).bind(seriesId, limit, offset).all();

    return new Response(JSON.stringify({
      items: (results || []).map(mapRow),
      total,
      page: safePage,
      limit,
      totalPages,
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
