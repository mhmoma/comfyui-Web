/* ComfyUI Web 门户站公共脚本 */
(function () {
    'use strict';

    const CATEGORY_LABELS = {
        model: '模型动态',
        tutorial: '教程技巧',
        tool: '工具更新',
        community: '社区精选',
    };

    const CATEGORY_ICONS = {
        model: '🤖',
        tutorial: '📖',
        tool: '🔧',
        community: '🎨',
    };

    const PINNED_SLUGS = [
        'artist-prompt-favorites-guide',
        'anima-setup-complete-guide',
        'comfyui-cors-troubleshoot',
    ];

    function estimateReadMinutes(article) {
        const text = [article.title, article.summary, article.content].filter(Boolean).join(' ');
        const chars = text.replace(/\s+/g, '').length;
        return Math.max(2, Math.min(20, Math.ceil(chars / 400)));
    }

    function sortArticles(articles) {
        const pinned = [];
        const rest = [];
        for (const slug of PINNED_SLUGS) {
            const found = articles.find(a => a.slug === slug);
            if (found) pinned.push(found);
        }
        for (const a of articles) {
            if (!PINNED_SLUGS.includes(a.slug)) rest.push(a);
        }
        return [...pinned, ...rest];
    }

    function categoryCoverHtml(category, size) {
        const label = CATEGORY_LABELS[category] || category;
        const icon = CATEGORY_ICONS[category] || '📰';
        const cls = escapeHtml(category || 'tutorial');
        return `<div class="cat-cover cat-${cls}"><span class="cat-cover-icon">${icon}</span><span class="cat-cover-label">${escapeHtml(label)}</span></div>`;
    }

    function thumbHtml(article) {
        if (article.cover_url) {
            return `<img src="${escapeHtml(article.cover_url)}" alt="" loading="lazy">`;
        }
        return categoryCoverHtml(article.category);
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDate(ts) {
        if (!ts) return '';
        const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
        if (isNaN(d)) return '';
        return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatTimeAgo(ts) {
        if (!ts) return '';
        const diff = Date.now() - (typeof ts === 'number' ? ts : Date.parse(ts));
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
        return formatDate(ts);
    }

    function articleUrl(article) {
        if (article.source === 'api' && article.slug) {
            return `/news/detail?slug=${encodeURIComponent(article.slug)}`;
        }
        if (article.source === 'api' && article.id) {
            return `/news/detail?id=${encodeURIComponent(article.id)}`;
        }
        return `/news/${encodeURIComponent(article.slug)}/`;
    }

    function catBadge(category) {
        const label = CATEGORY_LABELS[category] || category;
        return `<span class="cat-badge cat-${escapeHtml(category)}">${escapeHtml(label)}</span>`;
    }

    function coverHtml(coverUrl, category, cls) {
        if (coverUrl) {
            return `<img src="${escapeHtml(coverUrl)}" alt="" loading="lazy">`;
        }
        return categoryCoverHtml(category);
    }

    function articleCard(article) {
        const url = articleUrl(article);
        const mins = estimateReadMinutes(article);
        return `
            <article class="news-card">
                <a href="${url}" class="news-card-thumb">${thumbHtml(article)}</a>
                <div class="news-card-body">
                    <div class="news-card-top">
                        ${catBadge(article.category)}
                        <span class="news-card-read-time">约 ${mins} 分钟</span>
                    </div>
                    <h3 class="news-card-title"><a href="${url}">${escapeHtml(article.title)}</a></h3>
                    <p class="news-card-summary">${escapeHtml(article.summary)}</p>
                    <a href="${url}" class="news-card-read">阅读教程 →</a>
                </div>
            </article>`;
    }

    function authorDisplay(article) {
        const name = String(article?.author || '纵欲').trim() || '纵欲';
        const initial = Array.from(name)[0] || '纵';
        return { name, initial };
    }

    function weiboFeedItem(article) {
        const url = articleUrl(article);
        const { name, initial } = authorDisplay(article);
        return `
            <article class="weibo-item weibo-item-public">
                <div class="weibo-item-head">
                    <span class="weibo-avatar site">${escapeHtml(initial)}</span>
                    <div class="weibo-item-meta">
                        <strong>${escapeHtml(name)}</strong>
                        ${catBadge(article.category)}
                        <time>${formatTimeAgo(article.published_at)}</time>
                    </div>
                </div>
                <a href="${url}" class="weibo-item-link">
                    <h3 class="weibo-item-title">${escapeHtml(article.title)}</h3>
                    <p class="weibo-item-body">${escapeHtml(article.summary)}</p>
                    ${article.cover_url ? `<img class="weibo-item-cover" src="${escapeHtml(article.cover_url)}" alt="" loading="lazy">` : ''}
                </a>
            </article>`;
    }

    function featuredArticle(article) {
        const url = articleUrl(article);
        const mins = estimateReadMinutes(article);
        const pinned = PINNED_SLUGS.includes(article.slug);
        return `
            <article class="featured-article">
                <a href="${url}" class="featured-cover">
                    ${coverHtml(article.cover_url, article.category, 'featured-cover')}
                </a>
                <div class="featured-body">
                    ${pinned ? '<span class="cat-badge cat-tool" style="margin-right:6px">必读</span>' : ''}${catBadge(article.category)}
                    <h2><a href="${url}">${escapeHtml(article.title)}</a></h2>
                    <p class="featured-summary">${escapeHtml(article.summary)}</p>
                    <div class="featured-meta">约 ${mins} 分钟阅读 · ${formatDate(article.published_at)} · <a href="${url}">阅读教程 →</a></div>
                </div>
            </article>`;
    }

    async function loadNews() {
        try {
            const res = await fetch('/api/articles?limit=50', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.articles)) {
                    return data.articles.map(a => ({ ...a, source: a.source || 'api' }));
                }
            }
        } catch { /* API 不可用（本地静态预览），回退 */ }

        const res = await fetch('/news/data/news.json');
        if (!res.ok) throw new Error('无法加载资讯数据');
        const staticArticles = await res.json();
        return staticArticles.map(a => ({ ...a, source: 'static' }));
    }

    function setActiveNav() {
        const path = location.pathname.replace(/\/$/, '') || '/';
        document.querySelectorAll('.site-nav a, .home-nav-links a').forEach(a => {
            const href = a.getAttribute('href').replace(/\/$/, '') || '/';
            a.classList.toggle('active', href === path || (href !== '/' && path.startsWith(href)));
        });
    }

    function homeNewsFeature(article) {
        const url = articleUrl(article);
        const pinned = PINNED_SLUGS.includes(article.slug);
        const cover = article.cover_url
            ? `style="--home-feature-cover:url('${escapeHtml(article.cover_url)}')"`
            : '';
        return `
            <a class="home-news-feature" href="${url}" ${cover}>
                <span class="home-news-tag">${pinned ? 'Pinned' : (CATEGORY_LABELS[article.category] || '精选')}</span>
                <h3>${escapeHtml(article.title)}</h3>
            </a>`;
    }

    function homeNewsItem(article) {
        const url = articleUrl(article);
        const label = CATEGORY_LABELS[article.category] || '资讯';
        return `
            <a class="home-news-item" href="${url}">
                <span>${escapeHtml(article.title)}</span>
                <time>${escapeHtml(label)}</time>
            </a>`;
    }

    async function initHome() {
        const featuredEl = document.getElementById('featured-article');
        const gridEl = document.getElementById('news-grid');
        const homeFeatureEl = document.getElementById('home-news-feature');
        const homeListEl = document.getElementById('home-news-list');
        if (!featuredEl && !gridEl && !homeFeatureEl && !homeListEl) return;

        try {
            const articles = sortArticles(await loadNews());
            if (homeFeatureEl) {
                homeFeatureEl.innerHTML = articles.length
                    ? homeNewsFeature(articles[0])
                    : '<p class="home-empty">暂无教程，<a href="/admin/">管理后台</a>可发布</p>';
            }
            if (homeListEl) {
                const rest = articles.slice(1, 5);
                const items = rest.length
                    ? rest.map(homeNewsItem).join('')
                    : '<p class="home-empty">暂无更多教程</p>';
                homeListEl.innerHTML = items + `
                    <a class="home-news-item" href="/news/">
                        <span>查看全部资讯 →</span>
                        <time></time>
                    </a>`;
            }
            if (featuredEl) {
                featuredEl.innerHTML = articles.length
                    ? featuredArticle(articles[0])
                    : '<p class="empty-state">暂无教程，<a href="/admin/">管理后台</a>可发布</p>';
            }
            if (gridEl) {
                const rest = articles.slice(1, 7);
                gridEl.innerHTML = rest.length
                    ? rest.map(articleCard).join('')
                    : '<p class="empty-state">暂无更多教程</p>';
            }
        } catch (e) {
            if (homeListEl) homeListEl.innerHTML = '<p class="home-empty">教程加载失败</p>';
            if (gridEl) gridEl.innerHTML = '<p class="empty-state">教程加载失败</p>';
        }
    }

    async function initNewsList() {
        const listEl = document.getElementById('news-list');
        const tabsEl = document.getElementById('category-tabs');
        if (!listEl) return;

        const isFeed = listEl.classList.contains('weibo-feed');
        let articles = [];
        try {
            articles = await loadNews();
        } catch {
            listEl.innerHTML = '<p class="empty-state">资讯加载失败</p>';
            return;
        }

        let currentCat = 'all';

        function render() {
            const filtered = currentCat === 'all'
                ? articles
                : articles.filter(a => a.category === currentCat);
            if (!filtered.length) {
                listEl.innerHTML = '<p class="empty-state">该分类暂无内容</p>';
                return;
            }
            listEl.innerHTML = isFeed
                ? filtered.map(weiboFeedItem).join('')
                : filtered.map(articleCard).join('');
        }

        if (tabsEl) {
            const cats = ['all', ...new Set(articles.map(a => a.category))];
            tabsEl.innerHTML = cats.map(cat => {
                const label = cat === 'all' ? '全部' : (CATEGORY_LABELS[cat] || cat);
                return `<button class="category-tab${cat === currentCat ? ' active' : ''}" data-cat="${cat}">${label}</button>`;
            }).join('');
            tabsEl.addEventListener('click', e => {
                const btn = e.target.closest('.category-tab');
                if (!btn) return;
                currentCat = btn.dataset.cat;
                tabsEl.querySelectorAll('.category-tab').forEach(b => b.classList.toggle('active', b === btn));
                render();
            });
        }

        render();
    }

    document.addEventListener('DOMContentLoaded', () => {
        setActiveNav();
        initHome();
        initNewsList();
    });

    window.SiteNews = { loadNews, formatDate, formatTimeAgo, catBadge, CATEGORY_LABELS, articleUrl };
})();
