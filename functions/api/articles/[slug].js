import {
  json, corsPreflight, checkAdmin, rowToArticle, makeTitle, makeSummary,
  ensureAuthorColumn, normalizeAuthor,
} from './_shared.js';

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });
  await ensureAuthorColumn(db);

  const slug = params.slug;
  const isAdmin = checkAdmin(request, env);
  const now = Date.now();

  try {
    const row = await db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first();
    if (!row) return json(404, { error: '文章不存在' });

    if (!isAdmin && (row.status !== 'published' || row.published_at > now)) {
      return json(404, { error: '文章不存在' });
    }

    return json(200, { ok: true, article: rowToArticle(row, { includeContent: true }) });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!checkAdmin(request, env)) return json(403, { error: 'Forbidden' });

  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });
  await ensureAuthorColumn(db);

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Invalid JSON' }); }

  const slug = params.slug;
  const row = await db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first();
  if (!row) return json(404, { error: '文章不存在' });

  const now = Date.now();
  let content = body.content !== undefined ? String(body.content).trim() : row.content;
  let title = body.title !== undefined ? String(body.title).trim() : row.title;
  let summary = body.summary !== undefined ? String(body.summary).trim() : row.summary;
  if (body.content !== undefined) {
    if (body.title === undefined) title = makeTitle(content, row.title);
    if (body.summary === undefined) summary = makeSummary(content, row.summary);
  }
  const category = body.category !== undefined ? body.category : row.category;
  const cover_url = body.cover_url !== undefined ? String(body.cover_url).trim() : row.cover_url;
  const author = body.author !== undefined ? normalizeAuthor(body.author) : normalizeAuthor(row.author);
  let status = body.status !== undefined ? body.status : row.status;
  const tags = body.tags !== undefined ? JSON.stringify(body.tags) : row.tags;
  let published_at = body.published_at !== undefined ? Number(body.published_at) : row.published_at;
  if (body.status === 'published' && row.status === 'draft') {
    published_at = now;
  }

  try {
    await db.prepare(
      `UPDATE articles SET title=?, summary=?, cover_url=?, content=?, category=?, tags=?, author=?, status=?, published_at=?, updated_at=? WHERE slug=?`
    ).bind(title, summary, cover_url, content, category, tags, author, status, published_at, now, slug).run();

    const updated = await db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first();
    return json(200, { ok: true, article: rowToArticle(updated, { includeContent: true }) });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!checkAdmin(request, env)) return json(403, { error: 'Forbidden' });

  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });

  try {
    const result = await db.prepare('DELETE FROM articles WHERE slug = ?').bind(params.slug).run();
    if (!result.meta.changes) return json(404, { error: '文章不存在' });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
}
