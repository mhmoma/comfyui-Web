#!/usr/bin/env node
/**
 * 从 content/news/*.md 构建资讯 JSON、详情页、RSS 与 sitemap
 * 用法: node scripts/build-news.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'news');
const SITE_URL = 'https://comfyui-web-89u.pages.dev';

const CATEGORY_LABELS = {
    model: '模型动态',
    tutorial: '教程技巧',
    tool: '工具更新',
    community: '社区精选',
};

// ── Frontmatter 解析 ──
function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw.trim() };
    const meta = {};
    for (const line of match[1].split('\n')) {
        const m = line.match(/^([\w-]+):\s*(.+)$/);
        if (!m) continue;
        let val = m[2].trim();
        if (val.startsWith('[') || val.startsWith('"')) {
            try { val = JSON.parse(val); } catch { /* keep string */ }
        } else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (/^\d+$/.test(val)) val = parseInt(val, 10);
        meta[m[1]] = val;
    }
    return { meta, body: match[2].trim() };
}

// ── 简易 Markdown → HTML ──
function mdToHtml(md) {
    const lines = md.split('\n');
    const out = [];
    let inPre = false;
    let inUl = false;
    let inOl = false;
    let i = 0;

    function closeLists() {
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (inOl) { out.push('</ol>'); inOl = false; }
    }

    function inline(text) {
        return text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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

    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith('```')) {
            closeLists();
            if (!inPre) { out.push('<pre><code>'); inPre = true; }
            else { out.push('</code></pre>'); inPre = false; }
            i += 1;
            continue;
        }
        if (inPre) {
            out.push(line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
            i += 1;
            continue;
        }

        if (isTableRow(line) && i + 1 < lines.length && isSepRow(lines[i + 1])) {
            closeLists();
            const headers = splitCells(line);
            i += 2;
            const rows = [];
            while (i < lines.length && isTableRow(lines[i]) && !isSepRow(lines[i])) {
                rows.push(splitCells(lines[i]));
                i += 1;
            }
            out.push('<div class="md-table-wrap"><table class="md-table">');
            out.push('<thead><tr>' + headers.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead>');
            out.push('<tbody>');
            for (const row of rows) {
                const cells = headers.map((_, idx) => row[idx] ?? '');
                out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
            }
            out.push('</tbody></table></div>');
            continue;
        }

        if (line.startsWith('### ')) { closeLists(); out.push(`<h3>${inline(line.slice(4))}</h3>`); i += 1; continue; }
        if (line.startsWith('## ')) { closeLists(); out.push(`<h2>${inline(line.slice(3))}</h2>`); i += 1; continue; }
        if (line.startsWith('# ')) { closeLists(); out.push(`<h1>${inline(line.slice(2))}</h1>`); i += 1; continue; }
        if (line.startsWith('> ')) { closeLists(); out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); i += 1; continue; }
        if (/^[-*] /.test(line)) {
            if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; }
            out.push(`<li>${inline(line.slice(2))}</li>`);
            i += 1;
            continue;
        }
        if (/^\d+\. /.test(line)) {
            if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; }
            out.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`);
            i += 1;
            continue;
        }
        if (line.trim() === '') { closeLists(); i += 1; continue; }
        if (line.startsWith('![')) {
            closeLists();
            const imgM = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imgM) out.push(`<p><img src="${imgM[2]}" alt="${imgM[1]}"></p>`);
            i += 1;
            continue;
        }
        closeLists();
        out.push(`<p>${inline(line)}</p>`);
        i += 1;
    }
    closeLists();
    if (inPre) out.push('</code></pre>');
    return out.join('\n');
}

function slugFromFilename(filename) {
    return filename.replace(/\.md$/, '');
}

function parseDate(val) {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    const d = Date.parse(String(val));
    return isNaN(d) ? Date.now() : d;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✓', path.relative(ROOT, filePath));
}

// ── 页面模板 ──
function siteNav(activePage) {
    const pages = [
        { href: '/news/', label: '资讯', key: 'news' },
        { href: '/guides/', label: '教程', key: 'guides' },
        { href: '/app/', label: '工具', key: 'app' },
        { href: '/about/', label: '关于', key: 'about' },
    ];
    const navLinks = pages.map(p =>
        `<a href="${p.href}"${p.key === activePage ? ' class="active"' : ''}>${p.label}</a>`
    ).join('\n                ');
    return `<header class="site-header">
        <div class="site-header-inner">
            <a href="/" class="site-logo">ComfyUI Web</a>
            <nav class="site-nav">
                ${navLinks}
            </nav>
            <a href="/app/" class="site-cta">进入生图 →</a>
        </div>
    </header>`;
}

function siteFooter() {
    return `<footer class="site-footer">
        <p>ComfyUI Web · AI 绘画资讯与工具站</p>
        <p style="margin-top:8px">
            <a href="/news/">资讯</a> ·
            <a href="/guides/">教程</a> ·
            <a href="/app/">生图工具</a> ·
            <a href="/feed.xml">RSS 订阅</a>
        </p>
    </footer>`;
}

function articleDetailPage(article) {
    const catLabel = CATEGORY_LABELS[article.category] || article.category;
    const tagsHtml = (article.tags || []).map(t =>
        `<span class="article-tag"><a href="/app/?tag=${encodeURIComponent(t)}">#${t}</a></span>`
    ).join('\n                ');
    const dateStr = new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    const ogImage = article.cover_url || '';
    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.summary,
        datePublished: new Date(article.published_at).toISOString(),
        image: ogImage || undefined,
        author: { '@type': 'Organization', name: 'ComfyUI Web' },
    });

    const appLink = article.app_link
        ? `<a href="${article.app_link}" class="btn-primary">一键试用此功能 →</a>`
        : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} · ComfyUI Web</title>
    <meta name="description" content="${article.summary.replace(/"/g, '&quot;')}">
    <link rel="canonical" href="${SITE_URL}/news/${article.slug}/">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${article.title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${article.summary.replace(/"/g, '&quot;')}">
    <meta property="og:url" content="${SITE_URL}/news/${article.slug}/">
    ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
    <link rel="stylesheet" href="/assets/site.css?v=1">
    <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
    ${siteNav('news')}
    <main class="site-main">
        <article>
            <header class="article-header">
                <span class="cat-badge cat-${article.category}">${catLabel}</span>
                <h1>${article.title}</h1>
                <div class="article-meta">
                    <span>${dateStr}</span>
                    ${article.author ? `<span>${article.author}</span>` : ''}
                </div>
            </header>
            ${ogImage ? `<img class="article-cover" src="${ogImage}" alt="">` : ''}
            <div class="article-content">
                ${article.content_html}
            </div>
            ${tagsHtml ? `<div class="article-tags">${tagsHtml}</div>` : ''}
            <div class="article-actions">
                ${appLink}
                <a href="/news/" class="btn-secondary">← 返回资讯列表</a>
            </div>
        </article>
    </main>
    ${siteFooter()}
    <script src="/assets/site.js?v=1"></script>
</body>
</html>`;
}

function buildRss(articles) {
    const items = articles.map(a => {
        const date = new Date(a.published_at).toUTCString();
        return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE_URL}/news/${a.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/news/${a.slug}/</guid>
      <pubDate>${date}</pubDate>
      <description><![CDATA[${a.summary}]]></description>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ComfyUI Web 资讯</title>
    <link>${SITE_URL}/news/</link>
    <description>AI 绘画模型动态、教程技巧与工具更新</description>
    <language>zh-CN</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

function buildSitemap(articles) {
    const staticPages = ['/', '/news/', '/guides/', '/about/', '/app/'];
    const urls = staticPages.map(p => `  <url><loc>${SITE_URL}${p}</loc><changefreq>weekly</changefreq></url>`);
    for (const a of articles) {
        urls.push(`  <url><loc>${SITE_URL}/news/${a.slug}/</loc><lastmod>${new Date(a.published_at).toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq></url>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// ── 主流程 ──
function main() {
    console.log('构建资讯…');
    if (!fs.existsSync(CONTENT_DIR)) {
        console.error('未找到 content/news/ 目录');
        process.exit(1);
    }

    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md')).sort();
    const articles = [];

    for (const file of files) {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
        const { meta, body } = parseFrontmatter(raw);
        const slug = meta.slug || slugFromFilename(file);
        const article = {
            slug,
            title: meta.title || slug,
            summary: meta.summary || '',
            cover_url: meta.cover_url || '',
            category: meta.category || 'tool',
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            author: meta.author || '',
            app_link: meta.app_link || '',
            status: meta.status || 'published',
            published_at: parseDate(meta.published_at),
            content_html: mdToHtml(body),
        };
        if (article.status !== 'published') continue;
        articles.push(article);
    }

    articles.sort((a, b) => b.published_at - a.published_at);

    const jsonData = articles.map(({ content_html, ...rest }) => rest);

    // 写入项目根目录
    writeFile(path.join(ROOT, 'news', 'data', 'news.json'), JSON.stringify(jsonData, null, 2));
    for (const a of articles) {
        writeFile(path.join(ROOT, 'news', a.slug, 'index.html'), articleDetailPage(a));
    }
    writeFile(path.join(ROOT, 'feed.xml'), buildRss(articles));
    writeFile(path.join(ROOT, 'sitemap.xml'), buildSitemap(articles));

    // 同步到 deploy/
    const deployRoot = path.join(ROOT, 'deploy');
    writeFile(path.join(deployRoot, 'news', 'data', 'news.json'), JSON.stringify(jsonData, null, 2));
    for (const a of articles) {
        writeFile(path.join(deployRoot, 'news', a.slug, 'index.html'), articleDetailPage(a));
    }
    writeFile(path.join(deployRoot, 'feed.xml'), buildRss(articles));
    writeFile(path.join(deployRoot, 'sitemap.xml'), buildSitemap(articles));

    console.log(`\n完成：${articles.length} 篇文章`);
}

main();
