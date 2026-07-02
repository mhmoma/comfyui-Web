export async function onRequestGet(context) {
  const { env, params } = context;
  const db = env.DB;
  const seriesId = params.id;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!seriesId) {
    return new Response(JSON.stringify({ error: 'Missing series id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const { results } = await db.prepare(
      `SELECT trigger_text AS t, name AS d, thumb_url AS th, lora_url AS lora
       FROM characters
       WHERE series_id = ?
       ORDER BY count DESC`
    ).bind(seriesId).all();

    const mapped = results.map(r => ({
      t: r.t,
      d: r.d,
      th: r.th || undefined,
      lora: r.lora || undefined,
    }));

    return new Response(JSON.stringify(mapped), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
