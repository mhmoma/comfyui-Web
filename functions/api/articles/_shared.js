export const DEFAULT_AUTHOR = '纵欲';

export const ARTICLES_SCHEMA = `
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  content TEXT NOT NULL,
  category TEXT DEFAULT 'tool',
  tags TEXT DEFAULT '[]',
  author TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
`;

export const NEWS_ADMINS_SCHEMA = `
CREATE TABLE IF NOT EXISTS news_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  key_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_admins_hash ON news_admins(key_hash);
`;

/** 旧库无 author 列时自动补齐（可重复调用） */
export async function ensureAuthorColumn(db) {
  try {
    await db.prepare(`ALTER TABLE articles ADD COLUMN author TEXT DEFAULT ''`).run();
  } catch {
    /* column already exists */
  }
}

export async function ensureNewsAdminsTable(db) {
  if (!db) return;
  await db.exec(NEWS_ADMINS_SCHEMA);
}

export function normalizeAuthor(name) {
  const s = String(name ?? '').trim().slice(0, 40);
  return s || DEFAULT_AUTHOR;
}

export function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    },
  });
}

/** 仅主管理员（环境变量 ADMIN_KEY） */
export function checkAdmin(request, env) {
  const adminKey = request.headers.get('x-admin-key');
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

export async function hashAdminKey(key) {
  const data = new TextEncoder().encode(String(key || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateNewsAdminKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 解析管理员身份：full = 主密钥；news = 次级资讯账号（D1）
 * @returns {Promise<null|{role:'full'|'news', name:string, id?:string}>}
 */
export async function getAdminContext(request, env) {
  const key = (request.headers.get('x-admin-key') || '').trim();
  if (!key) return null;
  if (env.ADMIN_KEY && key === env.ADMIN_KEY) {
    return { role: 'full', name: '主管理员' };
  }
  const db = env.DB;
  if (!db) return null;
  try {
    await ensureNewsAdminsTable(db);
    const keyHash = await hashAdminKey(key);
    const row = await db.prepare(
      'SELECT id, name FROM news_admins WHERE key_hash = ? LIMIT 1'
    ).bind(keyHash).first();
    if (!row) return null;
    return {
      role: 'news',
      name: String(row.name || '次级管理员').slice(0, 40) || '次级管理员',
      id: row.id,
    };
  } catch {
    return null;
  }
}

/** 主管理员或资讯次级账号 */
export async function checkNewsEditor(request, env) {
  const ctx = await getAdminContext(request, env);
  return !!ctx;
}

export function rowToArticle(row, { includeContent = false } = {}) {
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch { tags = []; }
  const article = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary || '',
    cover_url: row.cover_url || '',
    category: row.category || 'tool',
    tags,
    author: normalizeAuthor(row.author),
    status: row.status,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source: 'api',
  };
  if (includeContent) {
    article.content = row.content || '';
    article.content_html = simpleMdToHtml(row.content || '');
  }
  return article;
}

export function makeSlug(text) {
  const base = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${base || 'post'}-${Date.now().toString(36)}`;
}

export function makeTitle(content, title) {
  if (title && title.trim()) return title.trim().slice(0, 120);
  const line = String(content || '').trim().split('\n')[0] || '动态';
  return line.slice(0, 80) + (line.length > 80 ? '…' : '');
}

export function makeSummary(content, summary) {
  if (summary && summary.trim()) return summary.trim().slice(0, 200);
  const plain = String(content || '').replace(/\s+/g, ' ').trim();
  return plain.slice(0, 120) + (plain.length > 120 ? '…' : '');
}

function inlineMd(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function simpleMdToHtml(md) {
  const lines = String(md || '').split('\n');
  const out = [];
  let inUl = false;

  function closeUl() {
    if (inUl) { out.push('</ul>'); inUl = false; }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) { closeUl(); out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('### ')) { closeUl(); out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); continue; }
    if (/^[-*] /.test(line)) {
      if (!inUl) { closeUl(); out.push('<ul>'); inUl = true; }
      out.push(`<li>${inlineMd(line.slice(2))}</li>`);
      continue;
    }
    if (line.trim() === '') { closeUl(); continue; }
    if (line.startsWith('![')) {
      closeUl();
      const m = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) out.push(`<p><img src="${m[2]}" alt="${m[1]}" loading="lazy"></p>`);
      continue;
    }
    closeUl();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeUl();
  return out.join('\n');
}
