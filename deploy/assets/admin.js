(function () {
    'use strict';

    const KEY_STORAGE = 'comfyui_admin_key';
    const CATEGORY_LABELS = { model: '模型动态', tutorial: '教程技巧', tool: '工具更新', community: '社区精选' };

    // localStorage 持久登录；兼容旧 sessionStorage
    let adminKey = localStorage.getItem(KEY_STORAGE) || sessionStorage.getItem(KEY_STORAGE) || '';
    if (adminKey) {
        localStorage.setItem(KEY_STORAGE, adminKey);
        try { sessionStorage.setItem(KEY_STORAGE, adminKey); } catch (_) {}
    }
    let currentCategory = 'tool';
    let editingId = null;
    let editingSlug = null;
    let filterStatus = '';
    let filterCategory = '';
    let searchQuery = '';
    let searchTimer = null;
    let allArticles = [];

    const $ = id => document.getElementById(id);

    function headers() {
        return { 'Content-Type': 'application/json', 'x-admin-key': adminKey };
    }

    function adminHeaders() {
        return { 'x-admin-key': adminKey };
    }

    function escapeHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    async function patchArticleById(id, payload) {
        const res = await apiFetch(`/api/articles/by-id/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify(payload),
        });
        if (res.ok) return { res, data: await res.json() };
        const res2 = await apiFetch(`/api/articles?id=${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify(payload),
        });
        return { res: res2, data: await res2.json() };
    }

    async function fetchArticleById(id) {
        let res = await apiFetch(`/api/articles/by-id/${encodeURIComponent(id)}`, { headers: adminHeaders() });
        if (!res.ok) {
            res = await apiFetch(`/api/articles?id=${encodeURIComponent(id)}`, { headers: adminHeaders() });
        }
        return res;
    }

    function articleIdFrom(el) {
        return el?.getAttribute('data-article-id') || '';
    }

    function articleUrl(article) {
        if (article.slug) return `/news/detail?slug=${encodeURIComponent(article.slug)}`;
        if (article.id) return `/news/detail?id=${encodeURIComponent(article.id)}`;
        return '/news/';
    }

    function parseTags(str) {
        return String(str || '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
    }

    function showLoginError(text) {
        const el = $('login-error');
        if (!el) return;
        if (text) {
            el.textContent = text;
            el.classList.remove('hidden');
        } else {
            el.textContent = '';
            el.classList.add('hidden');
        }
    }

    async function verifyAuth(key) {
        const res = await fetch('/api/articles/auth', {
            headers: { 'x-admin-key': key || adminKey },
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) throw new Error(data.error || '服务端未配置 ADMIN_KEY');
        if (!res.ok) throw new Error(data.error || '管理密钥错误');
        return true;
    }

    function handleAuthFailure() {
        showMsg('登录已失效，请重新输入管理密钥', true);
        logout();
    }

    async function apiFetch(url, options = {}) {
        const res = await fetch(url, options);
        if (res.status === 403) {
            handleAuthFailure();
            throw new Error('管理密钥无效或已过期');
        }
        return res;
    }

    function showMsg(text, isError) {
        const el = $('composer-msg');
        if (!el) return;
        el.textContent = text;
        el.className = 'composer-msg' + (isError ? ' error' : ' ok');
        if (text) setTimeout(() => { el.textContent = ''; }, 5000);
    }

    function updateCharCount() {
        const len = ($('post-content')?.value || '').length;
        const el = $('char-count');
        if (el) el.textContent = `${len} / 5000`;
    }

    function setCategory(cat) {
        currentCategory = cat;
        document.querySelectorAll('.weibo-cat').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === cat);
        });
    }

    function resetForm() {
        editingId = null;
        editingSlug = null;
        $('post-title').value = '';
        if ($('post-author')) $('post-author').value = '纵欲';
        $('post-content').value = '';
        $('post-summary').value = '';
        $('post-tags').value = '';
        $('post-cover').value = '';
        $('post-draft').checked = false;
        $('cover-preview')?.classList.add('hidden');
        $('btn-cancel-edit')?.classList.add('hidden');
        $('compose-mode-label').textContent = '发布新动态';
        $('compose-mode-hint').textContent = '内容将显示在资讯板块';
        $('btn-publish').textContent = '发布';
        setCategory('tool');
        updateCharCount();
    }

    function startEdit(article) {
        editingId = article.id;
        editingSlug = article.slug;
        $('post-title').value = article.title || '';
        if ($('post-author')) $('post-author').value = article.author || '纵欲';
        $('post-content').value = article.content || article.summary || '';
        $('post-summary').value = article.summary || '';
        $('post-tags').value = (article.tags || []).join(', ');
        $('post-cover').value = article.cover_url || '';
        $('post-draft').checked = article.status === 'draft';
        setCategory(article.category || 'tool');
        $('btn-cancel-edit')?.classList.remove('hidden');
        $('compose-mode-label').textContent = '编辑动态';
        $('compose-mode-hint').textContent = `正在编辑：${article.title}`;
        $('btn-publish').textContent = '保存修改';
        updateCharCount();
        updateCoverPreview();
        $('compose-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showMsg('已载入编辑，修改后点「保存修改」');
    }

    function updateCoverPreview() {
        const url = $('post-cover')?.value.trim();
        const box = $('cover-preview');
        if (!box) return;
        if (url) {
            box.innerHTML = `<img src="${escapeHtml(url)}" alt="">`;
            box.classList.remove('hidden');
        } else {
            box.classList.add('hidden');
        }
    }

    function getFormData() {
        const content = $('post-content').value.trim();
        const title = $('post-title').value.trim();
        const author = ($('post-author')?.value || '').trim() || '纵欲';
        const summary = $('post-summary').value.trim();
        const tags = parseTags($('post-tags').value);
        const cover_url = $('post-cover').value.trim();
        const status = $('post-draft').checked ? 'draft' : 'published';
        return { content, title, author, summary, tags, cover_url, status, category: currentCategory };
    }

    function renderTableRow(a) {
        const statusLabel = a.status === 'draft'
            ? '<span class="status-badge draft">草稿</span>'
            : '<span class="status-badge published">已发布</span>';
        const catLabel = CATEGORY_LABELS[a.category] || a.category;
        return `
            <tr data-article-id="${escapeHtml(a.id)}" data-slug="${escapeHtml(a.slug)}">
                <td class="col-title">
                    <div class="row-title">${escapeHtml(a.title)}</div>
                    <div class="row-summary">${escapeHtml(a.author || '纵欲')} · ${escapeHtml(a.summary)}</div>
                </td>
                <td class="col-cat"><span class="cat-badge cat-${escapeHtml(a.category)}">${escapeHtml(catLabel)}</span></td>
                <td class="col-status">${statusLabel}</td>
                <td class="col-time">${formatTime(a.published_at)}</td>
                <td class="col-actions">
                        <button type="button" class="btn-text btn-edit" data-article-id="${escapeHtml(a.id)}">编辑</button>
                        <a href="${articleUrl(a)}" target="_blank" rel="noopener" class="btn-text">预览</a>
                        ${a.status === 'draft'
                        ? `<button type="button" class="btn-text btn-publish-one" data-article-id="${escapeHtml(a.id)}">发布</button>`
                        : `<button type="button" class="btn-text btn-unpublish" data-article-id="${escapeHtml(a.id)}">转草稿</button>`}
                        <button type="button" class="btn-text btn-delete danger" data-article-id="${escapeHtml(a.id)}">删除</button>
                </td>
            </tr>`;
    }

    function filterArticlesLocal() {
        let list = [...allArticles];
        if (filterStatus) list = list.filter(a => a.status === filterStatus);
        if (filterCategory) list = list.filter(a => a.category === filterCategory);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(a =>
                (a.title || '').toLowerCase().includes(q) ||
                (a.summary || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    function renderFeed() {
        const feed = $('admin-feed');
        const list = filterArticlesLocal();
        if (!list.length) {
            feed.innerHTML = '<p class="empty-state">没有匹配的内容</p>';
            return;
        }
        feed.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>标题 / 摘要</th>
                        <th>分类</th>
                        <th>状态</th>
                        <th>时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>${list.map(renderTableRow).join('')}</tbody>
            </table>`;
    }

    async function loadStats() {
        try {
            const res = await apiFetch('/api/articles?stats=1', { headers: adminHeaders() });
            const data = await res.json();
            if (!res.ok || !data.stats) return;
            $('stat-total').textContent = data.stats.total || 0;
            $('stat-published').textContent = data.stats.published || 0;
            $('stat-draft').textContent = data.stats.draft || 0;
        } catch { /* ignore */ }
    }

    async function loadFeed() {
        const feed = $('admin-feed');
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (filterStatus) params.set('status', filterStatus);
            if (filterCategory) params.set('category', filterCategory);
            if (searchQuery) params.set('q', searchQuery);

            const res = await apiFetch(`/api/articles?${params}`, { headers: adminHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '加载失败');
            if (data.needs_init) {
                feed.innerHTML = '<p class="empty-state">数据库未初始化，请点击「初始化数据库」</p>';
                return;
            }
            allArticles = data.articles || [];
            renderFeed();
            await loadStats();
        } catch (e) {
            feed.innerHTML = `<p class="empty-state">加载失败：${escapeHtml(e.message)}<br><small>本地预览无 API，请部署到 Cloudflare 后使用。</small></p>`;
        }
    }

    async function savePost() {
        const data = getFormData();
        if (!data.content) { showMsg('正文不能为空', true); return; }

        const btn = $('btn-publish');
        const isEdit = !!editingId;
        btn.disabled = true;
        btn.textContent = isEdit ? '保存中…' : '发布中…';

        try {
            const payload = {
                content: data.content,
                title: data.title || undefined,
                author: data.author || '纵欲',
                summary: data.summary || undefined,
                tags: data.tags,
                category: data.category,
                cover_url: data.cover_url,
                status: data.status,
            };

            let res, json;
            if (isEdit) {
                ({ res, data: json } = await patchArticleById(editingId, payload));
            } else {
                res = await apiFetch('/api/articles', {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify(payload),
                });
                json = await res.json();
            }
            if (!res.ok) throw new Error(json.error || '保存失败');

            showMsg(isEdit ? '修改已保存' : (data.status === 'draft' ? '草稿已保存' : '发布成功'));
            resetForm();
            await loadFeed();
        } catch (e) {
            showMsg(e.message, true);
        } finally {
            btn.disabled = false;
            btn.textContent = editingSlug ? '保存修改' : '发布';
        }
    }

    async function fetchAndEdit(id) {
        if (!id) { showMsg('无法识别文章 ID', true); return; }
        try {
            const res = await fetchArticleById(id);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '加载失败');
            startEdit(data.article);
        } catch (e) {
            showMsg(e.message, true);
        }
    }

    async function toggleStatus(id, newStatus) {
        if (!id) { showMsg('无法识别文章 ID', true); return; }
        try {
            const { res, data } = await patchArticleById(id, { status: newStatus });
            if (!res.ok) throw new Error(data.error || '操作失败');
            await loadFeed();
            showMsg(newStatus === 'published' ? '已发布' : '已转为草稿');
        } catch (e) {
            showMsg(e.message, true);
        }
    }

    async function deletePost(id) {
        if (!id) { showMsg('无法识别文章 ID', true); return; }
        const item = allArticles.find(a => a.id === id);
        const title = item?.title || id;
        if (!confirm(`确认删除「${title}」？\n此操作不可恢复。`)) return;
        try {
            let res = await apiFetch(`/api/articles/by-id/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: adminHeaders(),
            });
            if (!res.ok) {
                res = await apiFetch(`/api/articles?id=${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    headers: adminHeaders(),
                });
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '删除失败');
            if (editingId === id) resetForm();
            await loadFeed();
            showMsg('已删除');
        } catch (e) {
            showMsg(e.message, true);
        }
    }

    async function initDb() {
        if (!confirm('确认初始化 articles 数据库表？\n（不会删除已有文章）')) return;
        try {
            const res = await apiFetch('/api/articles/init', { method: 'POST', headers: headers() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '初始化失败');
            showMsg('数据库表已就绪');
            await loadFeed();
        } catch (e) {
            showMsg(e.message, true);
        }
    }

    function showComposer() {
        $('login-panel').classList.add('hidden');
        $('composer-panel').classList.remove('hidden');
        loadFeed();
    }

    async function login() {
        const key = $('admin-key-input').value.trim();
        if (!key) { showLoginError('请输入管理密钥'); return; }

        const btn = $('btn-admin-login');
        btn.disabled = true;
        btn.textContent = '验证中…';
        showLoginError('');

        try {
            await verifyAuth(key);
            adminKey = key;
            localStorage.setItem(KEY_STORAGE, adminKey);
            try { sessionStorage.setItem(KEY_STORAGE, adminKey); } catch (_) {}
            showComposer();
        } catch (e) {
            adminKey = '';
            localStorage.removeItem(KEY_STORAGE);
            try { sessionStorage.removeItem(KEY_STORAGE); } catch (_) {}
            showLoginError(e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '登录';
        }
    }

    function logout() {
        adminKey = '';
        localStorage.removeItem(KEY_STORAGE);
        try { sessionStorage.removeItem(KEY_STORAGE); } catch (_) {}
        $('composer-panel').classList.add('hidden');
        $('login-panel').classList.remove('hidden');
        $('admin-key-input').value = '';
        resetForm();
    }

    async function tryRestoreSession() {
        if (!adminKey) return;
        try {
            await verifyAuth(adminKey);
            showComposer();
        } catch {
            logout();
            showLoginError('上次登录已失效，请重新输入密钥');
        }
    }

    // 嵌入运营台时隐藏站点头
    if (new URLSearchParams(location.search).get('embed') === '1') {
        document.querySelector('.site-header')?.style.setProperty('display', 'none');
        document.body.classList.add('admin-embed');
    }

    // ── 事件绑定 ──
    $('btn-admin-login')?.addEventListener('click', login);
    $('admin-key-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    $('btn-admin-logout')?.addEventListener('click', logout);
    $('btn-publish')?.addEventListener('click', savePost);
    $('btn-clear')?.addEventListener('click', () => { if (confirm('清空当前编辑内容？')) resetForm(); });
    $('btn-cancel-edit')?.addEventListener('click', resetForm);
    $('btn-init-db')?.addEventListener('click', initDb);
    $('post-content')?.addEventListener('input', updateCharCount);
    $('post-cover')?.addEventListener('input', updateCoverPreview);

    document.getElementById('post-categories')?.addEventListener('click', e => {
        const btn = e.target.closest('.weibo-cat');
        if (btn) setCategory(btn.dataset.cat);
    });

    document.getElementById('admin-filters')?.addEventListener('click', e => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        filterStatus = tab.dataset.status || '';
        document.querySelectorAll('.filter-tab').forEach(b => b.classList.toggle('active', b === tab));
        loadFeed();
    });

    $('filter-category')?.addEventListener('change', e => {
        filterCategory = e.target.value;
        loadFeed();
    });

    $('admin-search')?.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            if (allArticles.length && !searchQuery) {
                renderFeed();
            } else {
                loadFeed();
            }
        }, 300);
    });

    $('admin-feed')?.addEventListener('click', e => {
        const row = e.target.closest('[data-article-id]');
        const id = articleIdFrom(row);
        if (!id) return;
        if (e.target.closest('.btn-edit')) fetchAndEdit(id);
        else if (e.target.closest('.btn-delete')) deletePost(id);
        else if (e.target.closest('.btn-publish-one')) toggleStatus(id, 'published');
        else if (e.target.closest('.btn-unpublish')) toggleStatus(id, 'draft');
    });

    tryRestoreSession();
    updateCharCount();
})();
