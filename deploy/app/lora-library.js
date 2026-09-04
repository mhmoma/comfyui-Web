/**
 * ComfyUI Web 自研 LoRA 库
 * - 本地：server.py /api/lora/*
 * - 云端：/api/lora/*（Civitai 代理）+ ComfyUI object_info 降级列表
 */
(function (global) {
    'use strict';

    const BRIDGE_PORTS = [8080, 8765];
    const LS_KEY = 'lora_lib_meta_cache_v1';

    let _apiOrigin = '';
    let _mode = 'unknown'; // full | bridge | cloud | object_info
    let _status = null;

    function isLocalProxy() {
        if (global.isLocalProxy) return global.isLocalProxy();
        if (window.location.protocol === 'file:') return false;
        const host = window.location.hostname;
        return (host === 'localhost' || host === '127.0.0.1') && window.location.port !== '8188';
    }

    function getComfyServer() {
        if (global.getComfyUIAddress) return global.getComfyUIAddress();
        return localStorage.getItem('comfyui_address') || 'http://127.0.0.1:8188';
    }

    function apiUrl(path) {
        const base = _apiOrigin || '';
        return `${base}${path}`;
    }

    async function tryFetch(url, opts = {}) {
        const res = await fetch(url, { ...opts, cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const data = await res.json();
            return { res, data };
        }
        return { res, data: null };
    }

    async function detectBridge() {
        for (const port of BRIDGE_PORTS) {
            try {
                const url = `http://127.0.0.1:${port}/api/lora/status`;
                const { res, data } = await tryFetch(url);
                if (res.ok && data?.ok && data.available) {
                    _apiOrigin = `http://127.0.0.1:${port}`;
                    _mode = 'bridge';
                    _status = data;
                    return true;
                }
            } catch (_) { /* next port */ }
        }
        return false;
    }

    async function init() {
        if (isLocalProxy()) {
            const { res, data } = await tryFetch('/api/lora/status');
            if (res.ok && data?.ok) {
                _apiOrigin = '';
                _mode = data.available ? 'full' : 'cloud';
                _status = data;
                return _status;
            }
        }
        if (await detectBridge()) return _status;
        const { res, data } = await tryFetch('/api/lora/status');
        if (res.ok && data?.ok) {
            _apiOrigin = '';
            _mode = data.mode === 'cloud' || data.capabilities?.sync_civitai ? 'cloud' : 'object_info';
            _status = data;
            return _status;
        }
        _mode = 'object_info';
        _status = { ok: true, available: false, mode: 'object_info' };
        return _status;
    }

    function getMode() { return _mode; }
    function getStatus() { return _status; }
    function hasFullLibrary() { return _mode === 'full' || _mode === 'bridge'; }
    function canCloudSync() { return !hasFullLibrary(); }

    function _mergeCivitaiMeta(rel, model, version, extra = {}) {
        const trained = version?.trainedWords || [];
        const tags = (model?.tags || []).map(t => (typeof t === 'object' ? t.name : t)).filter(Boolean);
        const images = (version?.images || []).map(img => img.url).filter(Boolean);
        return {
            model_name: model?.name || rel.split('/').pop(),
            base_model: version?.baseModel || '',
            tags,
            trigger_words: Array.isArray(trained) ? trained : [trained].filter(Boolean),
            from_civitai: true,
            preview_url: images[0] || '',
            example_images: images,
            civitai: {
                id: version?.id,
                modelId: model?.id || version?.modelId,
                name: version?.name,
                downloadUrl: version?.downloadUrl,
            },
            ...extra,
        };
    }

    function _saveCacheEntry(rel, merged) {
        const cache = loadMetaCache();
        cache[rel] = { ...(cache[rel] || {}), ...merged };
        saveMetaCache(cache);
        return { rel_path: rel, name: rel, ...merged };
    }

    function _parseCivitaiId(input) {
        const s = String(input || '').trim();
        if (!s) return null;
        if (/^\d+$/.test(s)) return parseInt(s, 10);
        const m = s.match(/models\/(\d+)/i);
        return m ? parseInt(m[1], 10) : null;
    }

    /** 去掉扩展名；剥掉「_中文备注」后缀，避免改名后搜偏 */
    function _loraFileStem(rel) {
        let base = String(rel || '').split(/[/\\]/).pop() || '';
        base = base.replace(/\.(safetensors|pt|ckpt)$/i, '');
        // 从第一个 CJK / 假名 起整段当备注去掉（保留其前的英文原名）
        const cut = base.search(/[\u3040-\u30ff\u3400-\u9fff]/);
        if (cut > 0) {
            base = base.slice(0, cut).replace(/[_\-\s]+$/g, '');
        }
        return base;
    }

    function _normStem(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/\.(safetensors|pt|ckpt)$/i, '')
            .replace(/[\s\-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    function _buildSearchQueries(rel) {
        const stem = _loraFileStem(rel);
        const norm = _normStem(stem);
        const queries = [
            stem,
            norm.replace(/_/g, ' '),
            stem.replace(/([a-z])([A-Z])/g, '$1 $2'),
        ];
        // 再试去掉末尾版本号碎屑的短名（提高命中，不用于低分兜底）
        const short = stem.replace(/[-_]?(v?\d+(\.\d+)*)+$/i, '').replace(/[_\-\s]+$/g, '');
        if (short && short.length >= 4 && short !== stem) queries.push(short);
        // 取最长的「连续英文数字段」作关键词
        const tokens = stem.split(/[^a-zA-Z0-9]+/).filter((t) => t.length >= 4);
        tokens.sort((a, b) => b.length - a.length);
        if (tokens[0]) queries.push(tokens[0]);
        return [...new Set(queries.map((q) => q.trim()).filter((q) => q.length >= 3))];
    }

    function _scoreModelAgainstStem(model, stemNorm) {
        if (!model || !stemNorm) return 0;
        let score = 0;
        const name = _normStem(model.name || '');
        if (name === stemNorm) score += 20;
        else if (name && (name.includes(stemNorm) || stemNorm.includes(name))) score += 6;

        let bestFile = 0;
        (model.modelVersions || []).forEach((v) => {
            (v.files || []).forEach((f) => {
                const fn = _normStem(f.name || '');
                if (!fn) return;
                if (fn === stemNorm) bestFile = Math.max(bestFile, 40);
                else if (fn.startsWith(stemNorm) || stemNorm.startsWith(fn)) bestFile = Math.max(bestFile, 28);
                else if (fn.includes(stemNorm) || stemNorm.includes(fn)) {
                    // 短串互含很容易误伤，长度差太大时降分
                    const ratio = Math.min(fn.length, stemNorm.length) / Math.max(fn.length, stemNorm.length);
                    bestFile = Math.max(bestFile, ratio >= 0.55 ? 16 : 4);
                }
            });
        });
        score += bestFile;
        return score;
    }

    function _pickSearchMatch(rel, items) {
        if (!items?.length) return null;
        const stemNorm = _normStem(_loraFileStem(rel));
        let best = null;
        let bestScore = 0;
        items.forEach((m) => {
            const score = _scoreModelAgainstStem(m, stemNorm);
            if (score > bestScore) {
                bestScore = score;
                best = m;
            }
        });
        // 必须有足够把握；禁止「搜不到就拿第一条」导致张冠李戴
        if (bestScore >= 16) return best;
        return null;
    }

    function _pickVersionForStem(versions, stemNorm) {
        if (!versions?.length) return null;
        let best = versions[0];
        let bestScore = 0;
        versions.forEach((v) => {
            let score = 0;
            (v.files || []).forEach((f) => {
                const fn = _normStem(f.name || '');
                if (fn === stemNorm) score = Math.max(score, 40);
                else if (fn.startsWith(stemNorm) || stemNorm.startsWith(fn)) score = Math.max(score, 28);
                else if (fn.includes(stemNorm) || stemNorm.includes(fn)) score = Math.max(score, 12);
            });
            // 同名模型多版本时，略偏好较新（列表通常新在前）
            if (score > bestScore || (score === bestScore && score > 0 && !bestScore)) {
                bestScore = score;
                best = v;
            } else if (score === bestScore && score >= 28) {
                best = v;
            }
        });
        return bestScore >= 12 ? best : versions[0];
    }

    async function fetchCivitaiModel(modelId) {
        const { res, data } = await tryFetch(`${apiUrl('/api/lora/civitai/model')}/${modelId}`);
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'C 站模型查询失败');
        return data.data;
    }

    async function syncCivitaiByModelId(rel, modelId) {
        const model = await fetchCivitaiModel(modelId);
        const versions = model.modelVersions || [];
        if (!versions.length) throw new Error('该模型没有可用版本');
        const stemNorm = _normStem(_loraFileStem(rel));
        const version = _pickVersionForStem(versions, stemNorm) || versions[0];
        return _saveCacheEntry(rel, _mergeCivitaiMeta(rel, model, version));
    }

    async function syncCivitaiCloudBySearch(rel) {
        const queries = _buildSearchQueries(rel);
        let lastErr = null;
        let sawResults = false;
        for (const q of queries) {
            try {
                const result = await searchCivitai(q, 20);
                const items = result.items || [];
                if (items.length) sawResults = true;
                const pick = _pickSearchMatch(rel, items);
                if (!pick?.id) continue;
                return await syncCivitaiByModelId(rel, pick.id);
            } catch (e) {
                lastErr = e;
            }
        }
        if (sawResults) {
            throw new Error('C 站搜到了结果但文件名匹配不准，请粘贴模型链接/ID 再同步（已禁止自动瞎选）');
        }
        throw lastErr || new Error('C 站搜索无匹配结果，请手动填写模型 ID');
    }

    async function syncCivitaiCloud(rel, civitaiModelId) {
        const names = await listFromObjectInfo();
        if (!names.includes(rel)) throw new Error('ComfyUI 中未找到该 LoRA（请确认 ComfyUI 已启动）');
        if (civitaiModelId) {
            return syncCivitaiByModelId(rel, civitaiModelId);
        }
        const cache = loadMetaCache();
        const hash = cache[rel]?.sha256;
        if (hash) {
            try {
                const { res, data } = await tryFetch(`${apiUrl('/api/lora/civitai/hash')}/${encodeURIComponent(hash)}`);
                if (res.ok && data?.ok) {
                    const version = data.data;
                    let model = {};
                    if (version.modelId) {
                        try { model = await fetchCivitaiModel(version.modelId); } catch (_) { /* partial */ }
                    }
                    return _saveCacheEntry(rel, _mergeCivitaiMeta(rel, model, version, { sha256: hash }));
                }
            } catch (_) { /* fallback search */ }
        }
        return syncCivitaiCloudBySearch(rel);
    }

    function loadMetaCache() {
        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function saveMetaCache(cache) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(cache));
        } catch (_) { /* quota */ }
    }

    async function list({ page = 1, pageSize = 40, q = '', baseModel = '', folder = '' } = {}) {
        if (hasFullLibrary()) {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
            });
            if (q) params.set('q', q);
            if (baseModel) params.set('base_model', baseModel);
            if (folder) params.set('folder', folder);
            const { res, data } = await tryFetch(`${apiUrl('/api/lora/list')}?${params}`);
            if (!res.ok) throw new Error(data?.error || '列表加载失败');
            return data;
        }
        const names = await listFromObjectInfo();
        const cache = loadMetaCache();
        let items = names.map(name => {
            const c = cache[name] || {};
            return {
                model_name: c.model_name || name.split('/').pop(),
                name,
                rel_path: name,
                folder: name.includes('/') ? name.split('/').slice(0, -1).join('/') : '',
                base_model: c.base_model || '',
                tags: c.tags || [],
                trigger_words: c.trigger_words || [],
                from_civitai: !!c.from_civitai,
                preview_url: c.preview_url || '',
                has_preview: !!c.preview_url,
            };
        });
        const qq = (q || '').toLowerCase();
        if (qq) {
            items = items.filter(it => (
                it.model_name.toLowerCase().includes(qq)
                || it.name.toLowerCase().includes(qq)
            ));
        }
        if (baseModel) {
            items = items.filter(it => (it.base_model || '').toLowerCase() === baseModel.toLowerCase());
        }
        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const start = (page - 1) * pageSize;
        return {
            items: items.slice(start, start + pageSize),
            total,
            page,
            page_size: pageSize,
            total_pages: totalPages,
        };
    }

    async function listFromObjectInfo() {
        const server = getComfyServer();
        const res = await fetch(`${server}/object_info/LoraLoader`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.LoraLoader?.input?.required?.lora_name?.[0] || [];
    }

    async function detail(rel) {
        if (hasFullLibrary()) {
            const { res, data } = await tryFetch(`${apiUrl('/api/lora/detail')}?rel=${encodeURIComponent(rel)}`);
            if (!res.ok) throw new Error(data?.error || '详情加载失败');
            return data.item;
        }
        const cache = loadMetaCache();
        return {
            name: rel,
            rel_path: rel,
            model_name: rel.split('/').pop(),
            ...(cache[rel] || {}),
        };
    }

    function previewUrl(rel) {
        if (hasFullLibrary()) {
            return `${apiUrl('/api/lora/preview')}?rel=${encodeURIComponent(rel)}`;
        }
        const cache = loadMetaCache();
        return cache[rel]?.preview_url || '';
    }

    function exampleUrl(rel, i) {
        if (hasFullLibrary()) {
            return `${apiUrl('/api/lora/example')}?rel=${encodeURIComponent(rel)}&i=${i}`;
        }
        const cache = loadMetaCache();
        const urls = cache[rel]?.example_images || [];
        return urls[i] || '';
    }

    async function syncCivitai(rel, civitaiModelId) {
        if (hasFullLibrary()) {
            const { res, data } = await tryFetch(apiUrl('/api/lora/sync-civitai'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rel }),
            });
            if (!res.ok) {
                const msg = data?.error || `HTTP ${res.status}`;
                if (res.status === 404) {
                    throw new Error('未找到同步接口。请用 http://127.0.0.1:8080/app/ 打开（需先运行 python server.py）');
                }
                throw new Error(msg);
            }
            return data.item;
        }
        const modelId = typeof civitaiModelId === 'number'
            ? civitaiModelId
            : _parseCivitaiId(civitaiModelId);
        return syncCivitaiCloud(rel, modelId);
    }

    async function fetchExamples(rel) {
        if (hasFullLibrary()) {
            const { res, data } = await tryFetch(apiUrl('/api/lora/fetch-examples'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rel }),
            });
            if (!res.ok) throw new Error(data?.error || '示例图拉取失败');
            return data;
        }
        await syncCivitai(rel);
        const cache = loadMetaCache();
        return { ok: true, urls: cache[rel]?.example_images || [] };
    }

    async function downloadCivitai(versionId, subfolder = '', filename = '') {
        if (!hasFullLibrary()) {
            throw new Error('下载到本地需运行 python server.py 本地桥接服务');
        }
        const { res, data } = await tryFetch(apiUrl('/api/lora/download-civitai'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version_id: versionId, subfolder, filename }),
        });
        if (!res.ok) throw new Error(data?.error || '下载启动失败');
        return data;
    }

    async function downloadProgress(jobId) {
        const { res, data } = await tryFetch(`${apiUrl('/api/lora/download-progress')}?job_id=${encodeURIComponent(jobId)}`);
        if (!res.ok) return { ok: false };
        return data;
    }

    async function searchCivitai(q, limit = 20) {
        const { res, data } = await tryFetch(`${apiUrl('/api/lora/civitai/search')}?q=${encodeURIComponent(q)}&limit=${limit}`);
        if (!res.ok || !data?.ok) throw new Error(data?.error || '搜索失败');
        return data.data;
    }

    async function saveCivitaiConfig(apiKey, host) {
        const h = (host || 'civitai.red').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        localStorage.setItem('lora_civitai_host', h);
        if (apiKey !== undefined) {
            if (apiKey) localStorage.setItem('lora_civitai_key', apiKey);
            else localStorage.removeItem('lora_civitai_key');
        }
        if (hasFullLibrary()) {
            await tryFetch(apiUrl('/api/lora/config'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ civitai_api_key: apiKey || '', civitai_host: h }),
            });
        }
        return { host: h };
    }

    function getCivitaiHost() {
        return localStorage.getItem('lora_civitai_host') || 'civitai.red';
    }

    function getTriggerWordsForLora(name) {
        const cache = loadMetaCache();
        const key = String(name || '').replace(/\\/g, '/').toLowerCase();
        for (const [k, v] of Object.entries(cache)) {
            if (k.replace(/\\/g, '/').toLowerCase() === key) {
                return (v.trigger_words || []).filter(Boolean);
            }
        }
        return [];
    }

    global.LoraLibrary = {
        init,
        getMode,
        getStatus,
        hasFullLibrary,
        list,
        detail,
        previewUrl,
        exampleUrl,
        syncCivitai,
        syncCivitaiByModelId,
        parseCivitaiId: _parseCivitaiId,
        fetchExamples,
        downloadCivitai,
        downloadProgress,
        searchCivitai,
        saveCivitaiConfig,
        getCivitaiHost,
        getTriggerWordsForLora,
        apiUrl,
    };

    // ==================== UI ====================
    const LoraLibraryUI = {
        page: 1,
        totalPages: 1,
        q: '',
        baseModel: '',
        currentItem: null,
        onUseLora: null,

        async open() {
            await LoraLibrary.init();
            this.updateModeBadge();
            this.page = 1;
            const overlay = document.getElementById('portal-lora-overlay');
            if (!overlay) return;
            document.querySelectorAll('.portal-overlay').forEach(el => {
                el.classList.add('hidden');
                el.setAttribute('aria-hidden', 'true');
            });
            overlay.classList.remove('hidden');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('portal-overlay-open');
            const search = document.getElementById('portal-lora-search');
            if (search) search.value = '';
            this.q = '';
            await this.renderGrid();
        },

        close() {
            const overlay = document.getElementById('portal-lora-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.setAttribute('aria-hidden', 'true');
            }
            document.body.classList.remove('portal-overlay-open');
        },

        updateModeBadge() {
            const badge = document.getElementById('portal-lora-mode-badge');
            const hint = document.getElementById('portal-lora-setup-hint');
            if (!badge) return;
            const mode = LoraLibrary.getMode();
            const map = {
                full: '本地完整',
                bridge: '桥接服务',
                cloud: '云端模式',
                object_info: '基础列表',
            };
            badge.textContent = map[mode] || mode;
            badge.title = LoraLibrary.hasFullLibrary()
                ? '支持预览、C站同步、下载'
                : '云端：可 C 站同步元数据；下载到本地需 python server.py';
            if (hint) {
                if (LoraLibrary.hasFullLibrary()) {
                    hint.classList.add('hidden');
                    hint.textContent = '';
                } else if (mode === 'cloud') {
                    hint.classList.remove('hidden');
                    hint.innerHTML = '☁️ <strong>云端模式</strong>：可浏览本机 LoRA（需 ComfyUI 在线）、<strong>同步 C 站</strong>触发词/预览/示例图。下载 .safetensors 到 <code>models/loras</code> 仍需运行 <code>python server.py</code>。镜像站请设 <code>civitai.red</code>。';
                } else {
                    hint.classList.remove('hidden');
                    hint.innerHTML = '⚠️ 请确认 ComfyUI 已启动；设置里 Civitai 镜像填 <code>civitai.red</code>。同步将按文件名搜索 C 站匹配。';
                }
            }
        },

        async renderGrid() {
            const grid = document.getElementById('portal-lora-grid');
            if (!grid) return;
            grid.innerHTML = '<div class="portal-lora-empty">加载中…</div>';
            try {
                const data = await LoraLibrary.list({
                    page: this.page,
                    pageSize: 40,
                    q: this.q,
                    baseModel: this.baseModel,
                });
                this.totalPages = data.total_pages || 1;
                grid.innerHTML = '';
                if (!data.items?.length) {
                    grid.innerHTML = '<div class="portal-lora-empty">暂无 LoRA</div>';
                    this.renderPagination(data.total || 0);
                    return;
                }
                const bases = new Set();
                data.items.forEach(item => {
                    if (item.base_model) bases.add(item.base_model);
                    const card = document.createElement('button');
                    card.type = 'button';
                    card.className = 'portal-lora-card';
                    const img = document.createElement('img');
                    img.className = 'portal-lora-thumb';
                    img.alt = item.model_name || item.name;
                    const prev = item.preview_url
                        ? (item.preview_url.startsWith('http') ? item.preview_url : LoraLibrary.apiUrl(item.preview_url))
                        : '';
                    if (prev) img.src = prev;
                    else {
                        img.style.display = 'none';
                        card.classList.add('no-thumb');
                    }
                    const title = document.createElement('span');
                    title.className = 'portal-lora-name';
                    title.textContent = item.model_name || item.name;
                    const sub = document.createElement('span');
                    sub.className = 'portal-lora-sub';
                    sub.textContent = [item.base_model, item.folder].filter(Boolean).join(' · ') || item.name;
                    card.append(img, title, sub);
                    card.addEventListener('click', () => this.openDetail(item.rel_path || item.name));
                    grid.appendChild(card);
                });
                this.updateBaseFilter(Array.from(bases));
                this.renderPagination(data.total || 0);
            } catch (e) {
                grid.innerHTML = `<div class="portal-lora-empty">加载失败：${e.message}</div>`;
            }
        },

        updateBaseFilter(bases) {
            const sel = document.getElementById('portal-lora-base-filter');
            if (!sel || sel.dataset.filled === '1') return;
            bases.sort().forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                sel.appendChild(opt);
            });
            sel.dataset.filled = '1';
        },

        renderPagination(total) {
            const nav = document.getElementById('portal-lora-pagination');
            if (!nav) return;
            nav.innerHTML = '';
            if (this.totalPages <= 1) return;
            const prev = document.createElement('button');
            prev.type = 'button';
            prev.textContent = '← 上一页';
            prev.disabled = this.page <= 1;
            prev.onclick = () => { this.page--; this.renderGrid(); };
            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = `第 ${this.page} / ${this.totalPages} 页（共 ${total} 个）`;
            const next = document.createElement('button');
            next.type = 'button';
            next.textContent = '下一页 →';
            next.disabled = this.page >= this.totalPages;
            next.onclick = () => { this.page++; this.renderGrid(); };
            nav.append(prev, info, next);
        },

        async openDetail(rel) {
            const modal = document.getElementById('modal-lora-detail');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.getElementById('lora-detail-title').textContent = '加载中…';
            try {
                const item = await LoraLibrary.detail(rel);
                this.currentItem = item;
                document.getElementById('lora-detail-title').textContent = item.model_name || rel;
                document.getElementById('lora-detail-path').textContent = item.name || rel;
                document.getElementById('lora-detail-base').textContent = item.base_model
                    ? `基础模型：${item.base_model}` : '';
                const triggers = document.getElementById('lora-detail-triggers');
                triggers.innerHTML = '';
                (item.trigger_words || []).forEach(w => {
                    const chip = document.createElement('span');
                    chip.className = 'lora-trigger-chip';
                    chip.textContent = w;
                    triggers.appendChild(chip);
                });
                const tags = document.getElementById('lora-detail-tags');
                tags.innerHTML = '';
                (item.tags || []).forEach(t => {
                    const chip = document.createElement('span');
                    chip.className = 'lora-tag-chip';
                    chip.textContent = t;
                    tags.appendChild(chip);
                });
                const prevImg = document.getElementById('lora-detail-preview');
                const purl = LoraLibrary.previewUrl(rel);
                if (purl) {
                    prevImg.src = purl.startsWith('http') ? purl : LoraLibrary.apiUrl(purl);
                    prevImg.style.display = '';
                } else if (item.preview_url) {
                    prevImg.src = item.preview_url;
                    prevImg.style.display = '';
                } else {
                    prevImg.style.display = 'none';
                }
                this.renderExamples(rel, item);
                const hint = document.getElementById('lora-detail-hint');
                hint.textContent = LoraLibrary.hasFullLibrary()
                    ? ''
                    : '云端模式：元数据/预览来自 C 站；下载模型文件需 python server.py';
            } catch (e) {
                document.getElementById('lora-detail-title').textContent = '加载失败';
                document.getElementById('lora-detail-hint').textContent = e.message;
            }
        },

        renderExamples(rel, item) {
            const wrap = document.getElementById('lora-detail-examples');
            if (!wrap) return;
            wrap.innerHTML = '';
            const urls = item.example_images || [];
            const count = Math.max(urls.length, item.example_images_local?.length || 0, 0);
            const max = Math.max(count, urls.length);
            for (let i = 0; i < max && i < 8; i++) {
                const img = document.createElement('img');
                img.className = 'lora-example-thumb';
                const u = LoraLibrary.exampleUrl(rel, i) || urls[i];
                if (u) img.src = u.startsWith('http') ? u : LoraLibrary.apiUrl(u);
                wrap.appendChild(img);
            }
        },

        closeDetail() {
            const modal = document.getElementById('modal-lora-detail');
            if (modal) {
                modal.classList.add('hidden');
                modal.setAttribute('aria-hidden', 'true');
            }
            this.currentItem = null;
        },

        useCurrent() {
            if (!this.currentItem || typeof this.onUseLora !== 'function') return;
            const name = this.currentItem.name || this.currentItem.rel_path;
            const triggers = this.currentItem.trigger_words || [];
            this.onUseLora(name, 1.0, triggers);
            this.closeDetail();
            this.close();
        },

        async syncCurrent() {
            if (!this.currentItem) return;
            const rel = this.currentItem.rel_path || this.currentItem.name;
            const manualId = document.getElementById('lora-detail-civitai-id')?.value.trim();
            const btn = document.getElementById('lora-detail-sync');
            if (btn) { btn.disabled = true; btn.textContent = '同步中…'; }
            try {
                const parsedId = manualId ? LoraLibrary.parseCivitaiId(manualId) : null;
                const item = await LoraLibrary.syncCivitai(rel, parsedId || manualId);
                this.currentItem = { ...this.currentItem, ...item };
                await this.openDetail(rel);
                this.renderGrid();
            } catch (e) {
                alert(`同步失败：${e.message}\n\n优先用 hash/原文件名精确匹配；匹配不准不会再瞎选第一条。可粘贴 C 站模型链接/ID 再点同步。`);
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '同步 C 站'; }
            }
        },

        async fetchExamplesCurrent() {
            if (!this.currentItem) return;
            const rel = this.currentItem.rel_path || this.currentItem.name;
            const btn = document.getElementById('lora-detail-examples-btn');
            if (btn) { btn.disabled = true; btn.textContent = '拉取中…'; }
            try {
                await LoraLibrary.fetchExamples(rel);
                const item = await LoraLibrary.detail(rel);
                this.currentItem = item;
                this.renderExamples(rel, item);
            } catch (e) {
                alert('拉取失败：' + e.message);
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = '拉取示例图'; }
            }
        },

        copyTriggers() {
            const words = (this.currentItem?.trigger_words || []).join(', ');
            if (!words) { alert('暂无触发词，请先同步 C 站'); return; }
            navigator.clipboard.writeText(words).then(() => alert('已复制触发词')).catch(() => alert(words));
        },

        bind() {
            document.getElementById('btn-browse-lora')?.addEventListener('click', () => this.open());
            document.getElementById('portal-lora-close')?.addEventListener('click', () => this.close());
            document.getElementById('lora-detail-close')?.addEventListener('click', () => this.closeDetail());
            document.getElementById('lora-detail-use')?.addEventListener('click', () => this.useCurrent());
            document.getElementById('lora-detail-sync')?.addEventListener('click', () => this.syncCurrent());
            document.getElementById('lora-detail-examples-btn')?.addEventListener('click', () => this.fetchExamplesCurrent());
            document.getElementById('lora-detail-copy-triggers')?.addEventListener('click', () => this.copyTriggers());
            document.getElementById('portal-lora-refresh')?.addEventListener('click', () => {
                this.page = 1;
                this.renderGrid();
            });
            const search = document.getElementById('portal-lora-search');
            if (search) {
                let t;
                search.addEventListener('input', () => {
                    clearTimeout(t);
                    t = setTimeout(() => {
                        this.q = search.value.trim();
                        this.page = 1;
                        this.renderGrid();
                    }, 250);
                });
            }
            const baseFilter = document.getElementById('portal-lora-base-filter');
            baseFilter?.addEventListener('change', () => {
                this.baseModel = baseFilter.value;
                this.page = 1;
                this.renderGrid();
            });
        },
    };

    global.LoraLibraryUI = LoraLibraryUI;
})(window);
