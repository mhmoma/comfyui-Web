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

let authorColumnReady = false;
let newsAdminsReady = false;

/** 旧库无 author 列时自动补齐（每 isolate 只试一次，避免每次 ALTER 拖垮 D1） */
export async function ensureAuthorColumn(db) {
  if (!db || authorColumnReady) return;
  try {
    await db.prepare(`ALTER TABLE articles ADD COLUMN author TEXT DEFAULT ''`).run();
  } catch {
    /* column already exists */
  }
  authorColumnReady = true;
}

export async function ensureNewsAdminsTable(db) {
  if (!db || newsAdminsReady) return;
  const stmts = NEWS_ADMINS_SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of stmts) {
    await db.prepare(stmt).run();
  }
  newsAdminsReady = true;
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

function escapeHtmlText(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 允许的标签；去掉 script/iframe/on* 等 */
export function sanitizeHtml(html) {
  let s = String(html || '');
  s = s.replace(/<\s*(script|iframe|object|embed|form|input|link|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|iframe|object|embed|form|input|link|meta|base)[^>]*\/?>/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"');
  s = s.replace(/\s(href|src)\s*=\s*javascript:[^\s>]*/gi, ' $1="#"');
  return s;
}

/** 正文内联样式：禁止 import / expression / javascript */
export function sanitizeCss(css) {
  let s = String(css || '');
  s = s.replace(/@import[\s\S]*?;/gi, '');
  s = s.replace(/expression\s*\(/gi, 'invalid(');
  s = s.replace(/javascript\s*:/gi, 'invalid:');
  s = s.replace(/-moz-binding\s*:/gi, 'invalid:');
  s = s.replace(/behavior\s*:/gi, 'invalid:');
  // 限制选择器作用域：包进 .article-content（简单前缀）
  return s;
}

function scopeCss(css) {
  const clean = sanitizeCss(css).trim();
  if (!clean) return '';
  // 粗略：每条规则前加 .article-content（已在 style 外层包 div 时仍加一层保险）
  return clean.replace(/(^|})\s*([^{}@][^{]*)\{/g, (m, brace, sel) => {
    const scoped = String(sel)
      .split(',')
      .map((part) => {
        const p = part.trim();
        if (!p) return p;
        if (p.startsWith('.article-content')) return p;
        if (p.startsWith('@')) return p;
        return `.article-content ${p}`;
      })
      .join(', ');
    return `${brace} ${scoped}{`;
  });
}

export function simpleMdToHtml(md) {
  const lines = String(md || '').split('\n');
  const out = [];
  let inUl = false;
  let i = 0;

  function closeUl() {
    if (inUl) { out.push('</ul>'); inUl = false; }
  }

  function splitCells(line) {
    let s = String(line || '').trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
  }

  function isSepRow(line) {
    const cells = splitCells(line);
    if (!cells.length) return false;
    return cells.every((c) => /^:?-{3,}:?$/.test(c));
  }

  function isTableRow(line) {
    const t = String(line || '').trim();
    return t.includes('|') && !t.startsWith('```');
  }

  function flushFence(lang, bodyLines) {
    const body = bodyLines.join('\n');
    const l = String(lang || '').trim().toLowerCase();
    if (l === 'html' || l === 'htm') {
      out.push(`<div class="md-html">${sanitizeHtml(body)}</div>`);
      return;
    }
    if (l === 'css') {
      const scoped = scopeCss(body);
      if (scoped) out.push(`<style data-article-css>${scoped}</style>`);
      out.push(`<pre class="md-code"><code class="language-css">${escapeHtmlText(body)}</code></pre>`);
      return;
    }
    const cls = l ? ` language-${escapeHtmlText(l.replace(/[^a-z0-9_+-]/gi, ''))}` : '';
    out.push(`<pre class="md-code"><code class="${cls.trim()}">${escapeHtmlText(body)}</code></pre>`);
  }

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码 / html / css
    if (line.startsWith('```')) {
      closeUl();
      const lang = line.slice(3).trim();
      i += 1;
      const bodyLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        bodyLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].startsWith('```')) i += 1;
      flushFence(lang, bodyLines);
      continue;
    }

    // GFM 表格
    if (
      isTableRow(line)
      && i + 1 < lines.length
      && isSepRow(lines[i + 1])
    ) {
      closeUl();
      const headers = splitCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i]) && !isSepRow(lines[i])) {
        rows.push(splitCells(lines[i]));
        i += 1;
      }
      out.push('<div class="md-table-wrap"><table class="md-table">');
      out.push('<thead><tr>' + headers.map((h) => `<th>${inlineMd(h)}</th>`).join('') + '</tr></thead>');
      out.push('<tbody>');
      for (const row of rows) {
        const cells = headers.map((_, idx) => row[idx] ?? '');
        out.push('<tr>' + cells.map((c) => `<td>${inlineMd(c)}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table></div>');
      continue;
    }

    if (line.startsWith('## ')) { closeUl(); out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); i += 1; continue; }
    if (line.startsWith('### ')) { closeUl(); out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); i += 1; continue; }
    if (line.startsWith('> ')) {
      closeUl();
      out.push(`<blockquote><p>${inlineMd(line.slice(2))}</p></blockquote>`);
      i += 1;
      continue;
    }
    if (/^[-*] /.test(line)) {
      if (!inUl) { closeUl(); out.push('<ul>'); inUl = true; }
      out.push(`<li>${inlineMd(line.slice(2))}</li>`);
      i += 1;
      continue;
    }
    if (line.trim() === '') { closeUl(); i += 1; continue; }
    if (line.startsWith('![')) {
      closeUl();
      const m = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) {
        const src = String(m[2] || '').trim();
        const alt = escapeHtmlText(m[1] || '');
        if (/^https?:\/\//i.test(src) || src.startsWith('/')) {
          out.push(`<p class="md-img"><img src="${escapeHtmlText(src)}" alt="${alt}" loading="lazy"></p>`);
        }
      }
      i += 1;
      continue;
    }
    closeUl();
    out.push(`<p>${inlineMd(line)}</p>`);
    i += 1;
  }
  closeUl();
  return out.join('\n');
}
