import {
  json, corsPreflight, checkNewsEditor, rowToArticle,
  makeSlug, makeTitle, makeSummary,
  ensureAuthorColumn, normalizeAuthor, DEFAULT_AUTHOR,
} from './_shared.js';

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });
  await ensureAuthorColumn(db);

  const url = new URL(request.url);
  const isAdmin = await checkNewsEditor(request, env);
  const now = Date.now();

  const idParam = (url.searchParams.get('id') || '').trim();
  if (idParam) {
    try {
      const row = await db.prepare('SELECT * FROM articles WHERE id = ?').bind(idParam).first();
      if (!row) return json(404, { error: '文章不存在' });
      if (!isAdmin && (row.status !== 'published' || row.published_at > now)) {
        return json(404, { error: '文章不存在' });
      }
      return json(200, { ok: true, article: rowToArticle(row, { includeContent: true }) });
    } catch (e) {
      return json(500, { error: e.message });
    }
  }

  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(isAdmin ? 100 : 50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const category = url.searchParams.get('category');
  const q = (url.searchParams.get('q') || '').trim();
  const offset = (page - 1) * limit;

  try {
    if (isAdmin && url.searchParams.get('stats') === '1') {
      const statsRows = await db.prepare(
        `SELECT status, COUNT(*) AS count FROM articles GROUP BY status`
      ).all();
      const stats = { total: 0, published: 0, draft: 0 };
      for (const r of statsRows.results || []) {
        stats.total += r.count;
        if (r.status === 'published') stats.published = r.count;
        if (r.status === 'draft') stats.draft = r.count;
      }
      return json(200, { ok: true, stats });
    }

    // 列表不拉 content，避免长文把首页/资讯列表拖慢
    let sql = `SELECT id, slug, title, summary, cover_url, category, tags, author, status, published_at, created_at, updated_at
               FROM articles WHERE 1=1`;
    const binds = [];

    if (!isAdmin) {
      sql += ` AND status = 'published' AND published_at <= ?`;
      binds.push(now);
    } else {
      const status = url.searchParams.get('status');
      if (status) { sql += ` AND status = ?`; binds.push(status); }
    }

    if (category && category !== 'all') {
      sql += ` AND category = ?`;
      binds.push(category);
    }

    if (q) {
      sql += ` AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)`;
      const pattern = `%${q}%`;
      binds.push(pattern, pattern, pattern);
    }

    sql += ` ORDER BY published_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...binds).all();
    const articles = results.map(r => rowToArticle(r));

    return json(200, { ok: true, page, limit, articles });
  } catch (e) {
    if (e.message && e.message.includes('no such table')) {
      return json(200, { ok: true, page, limit, articles: [], needs_init: true });
    }
    return json(500, { error: e.message });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!(await checkNewsEditor(request, env))) return json(403, { error: 'Forbidden' });

  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });
  await ensureAuthorColumn(db);

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const content = String(body.content || '').trim();
  if (!content) return json(400, { error: '内容不能为空' });

  const now = Date.now();
  const id = body.id || crypto.randomUUID();
  const slug = body.slug?.trim() || makeSlug(content);
  const title = makeTitle(content, body.title);
  const summary = makeSummary(content, body.summary);
  const category = body.category || 'tool';
  const cover_url = String(body.cover_url || '').trim();
  const author = normalizeAuthor(body.author !== undefined ? body.author : DEFAULT_AUTHOR);
  const status = body.status === 'draft' ? 'draft' : 'published';
  const published_at = body.published_at ? Number(body.published_at) : now;
  const tags = JSON.stringify(Array.isArray(body.tags) ? body.tags : []);

  try {
    await db.prepare(
      `INSERT INTO articles (id, slug, title, summary, cover_url, content, category, tags, author, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, slug, title, summary, cover_url, content, category, tags, author, status, published_at, now, now).run();

    const row = await db.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
    return json(201, { ok: true, article: rowToArticle(row, { includeContent: true }) });
  } catch (e) {
    if (e.message && e.message.includes('no such table')) {
      return json(503, { error: 'articles 表未初始化，请先 POST /api/articles/init' });
    }
    if (e.message && e.message.includes('UNIQUE')) {
      return json(409, { error: 'slug 已存在，请重试' });
    }
    return json(500, { error: e.message });
  }
}

async function getRowById(db, id) {
  return db.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first();
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  if (!(await checkNewsEditor(request, env))) return json(403, { error: 'Forbidden' });

  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });
  await ensureAuthorColumn(db);

  const id = (new URL(request.url).searchParams.get('id') || '').trim();
  if (!id) return json(400, { error: '缺少 id 参数' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'Invalid JSON' }); }

  const row = await getRowById(db, id);
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
  if (body.status === 'published' && row.status === 'draft') published_at = now;

  try {
    await db.prepare(
      `UPDATE articles SET title=?, summary=?, cover_url=?, content=?, category=?, tags=?, author=?, status=?, published_at=?, updated_at=? WHERE id=?`
    ).bind(title, summary, cover_url, content, category, tags, author, status, published_at, now, id).run();

    const updated = await getRowById(db, id);
    return json(200, { ok: true, article: rowToArticle(updated, { includeContent: true }) });
  } catch (e) {
    return json(500, { error: e.message });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!(await checkNewsEditor(request, env))) return json(403, { error: 'Forbidden' });

  const db = env.DB;
  if (!db) return json(500, { error: 'Database not configured' });

  const id = (new URL(request.url).searchParams.get('id') || '').trim();
  if (!id) return json(400, { error: '缺少 id 参数' });

  try {
    const result = await db.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
    if (!result.meta.changes) return json(404, { error: '文章不存在' });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
}
