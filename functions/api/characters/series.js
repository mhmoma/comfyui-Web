export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const { results } = await db.prepare(
      `SELECT s.id, s.name, s.count,
              (SELECT c.thumb_url FROM characters c
               WHERE c.series_id = s.id AND c.thumb_url IS NOT NULL AND c.thumb_url != ''
               ORDER BY c.count DESC LIMIT 1) AS cover_url
       FROM series s
       ORDER BY s.count DESC`
    ).all();

    const mapped = results.map(r => ({
      id: r.id,
      name: r.name,
      count: r.count,
      cover_url: r.cover_url || null,
    }));

    return new Response(JSON.stringify(mapped), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=120, must-revalidate' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
