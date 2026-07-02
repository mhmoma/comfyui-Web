export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200);

  if (!q || q.length < 1) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const pattern = `%${q}%`;
    const { results } = await db.prepare(
      `SELECT c.trigger_text AS t, c.name AS d, c.thumb_url AS th, c.lora_url AS lora, c.tags, c.count,
              s.name AS series_name
       FROM characters c
       JOIN series s ON c.series_id = s.id
       WHERE c.name LIKE ?1 OR c.trigger_text LIKE ?1
       ORDER BY c.count DESC
       LIMIT ?2`
    ).bind(pattern, limit).all();

    const mapped = results.map(r => ({
      t: r.t,
      d: r.d,
      th: r.th || undefined,
      lora: r.lora || undefined,
      tags: r.tags ? JSON.parse(r.tags) : undefined,
      series: r.series_name,
    }));

    return new Response(JSON.stringify(mapped), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
