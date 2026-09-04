(function () {
    'use strict';

    // ==================== 配置管理 ====================
    const DEFAULT_SERVER = 'http://127.0.0.1:8188';

    function isLocalProxy() {
        // 判断是否通过本地代理服务器访问（localhost/127.0.0.1 + 非8188端口）
        if (window.location.protocol === 'file:') return false;
        const host = window.location.hostname;
        return (host === 'localhost' || host === '127.0.0.1') && window.location.port !== '8188';
    }

    function getServer() {
        if (isLocalProxy()) return '';
        const saved = localStorage.getItem('comfyui_address');
        if (saved) return saved;
        return DEFAULT_SERVER;
    }

    function getComfyUIAddress() {
        return localStorage.getItem('comfyui_address') || DEFAULT_SERVER;
    }

    function setComfyUIAddress(url) {
        localStorage.setItem('comfyui_address', url.replace(/\/+$/, ''));
    }

    window.isLocalProxy = isLocalProxy;
    window.getComfyUIAddress = getComfyUIAddress;

    /** 本地日期文件夹 YYYY-MM-DD（ComfyUI output 子目录） */
    function getLocalDateFolder(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** SaveImage 按日期分子目录，例如 2026-07-10/ComfyUI_Web */
    function getSaveImagePrefix(baseName) {
        const safeBase = String(baseName || 'ComfyUI_Web').replace(/[\\/:*?"<>|]+/g, '_');
        return `${getLocalDateFolder()}/${safeBase}`;
    }

    function openComfyUINative() {
        const base = getComfyUIAddress().replace(/\/+$/, '');
        window.open(`${base}/`, '_blank', 'noopener,noreferrer');
    }

    // ==================== DOM 引用 ====================
    const $ = (sel) => document.querySelector(sel);
    const dom = {
        selArch: $('#sel-arch'),
        panelSdxlModel: $('#panel-sdxl-model'),
        panelAnimaModel: $('#panel-anima-model'),
        selCheckpoint: $('#sel-checkpoint'),
        selUnet: $('#sel-unet'),
        selClip: $('#sel-clip'),
        selAnimaVae: $('#sel-anima-vae'),
        selSampler: $('#sel-sampler'),
        selScheduler: $('#sel-scheduler'),
        inpSteps: $('#inp-steps'),
        inpCfg: $('#inp-cfg'),
        inpWidth: $('#inp-width'),
        inpHeight: $('#inp-height'),
        btnSwapSize: $('#btn-swap-size'),
        inpSeed: $('#inp-seed'),
        btnRandomSeed: $('#btn-random-seed'),
        txtPositive: $('#txt-positive'),
        txtNegative: $('#txt-negative'),
        btnGenerate: $('#btn-generate'),
        progressContainer: $('#progress-container'),
        progressBar: $('#progress-bar'),
        progressText: $('#progress-text'),
        content: $('.content'),
        resultArea: $('#result-area'),
        resultPlaceholder: $('#result-placeholder'),
        resultImage: $('#result-image'),
        resultActions: $('#result-actions'),
        resultWrapper: $('#result-wrapper'),
        btnDownload: $('#btn-download'),
        btnSendToHistory: $('#btn-send-to-history'),
        historyGrid: $('#history-grid'),
        btnClearHistory: $('#btn-clear-history'),
        historyPanel: $('#history-panel'),
        historyResizer: $('#history-resizer'),
        btnHistoryToggle: $('#btn-history-toggle'),
        btnTutorial: $('#btn-tutorial'),
        modalTutorial: $('#modal-tutorial'),
        btnCloseTutorial: $('#btn-close-tutorial'),
        btnSettings: $('#btn-settings'),
        btnComfyNative: $('#btn-comfy-native'),
        modalSettings: $('#modal-settings'),
        inpServer: $('#inp-server'),
        btnSaveSettings: $('#btn-save-settings'),
        btnCancelSettings: $('#btn-cancel-settings'),
        modalPreview: $('#modal-preview'),
        previewImage: $('#preview-image'),
        btnClosePreview: $('#btn-close-preview'),
        // 可选模块
        chkVae: $('#chk-vae'),
        panelVae: $('#panel-vae'),
        selVae: $('#sel-vae'),
        chkLora: $('#chk-lora'),
        panelLora: $('#panel-lora'),
        loraList: $('#lora-list'),
        btnAddLora: $('#btn-add-lora'),
        chkHires: $('#chk-hires'),
        panelHires: $('#panel-hires'),
        inpHiresScale: $('#inp-hires-scale'),
        selUpscaleMethod: $('#sel-upscale-method'),
        inpHiresDenoise: $('#inp-hires-denoise'),
        inpHiresSteps: $('#inp-hires-steps'),
        chkControlnet: $('#chk-controlnet'),
        panelControlnet: $('#panel-controlnet'),
        selControlnet: $('#sel-controlnet'),
        inpCnStrength: $('#inp-cn-strength'),
        inpCnStart: $('#inp-cn-start'),
        inpCnEnd: $('#inp-cn-end'),
        cnModelDesc: $('#cn-model-desc'),
        inpCnImage: $('#inp-cn-image'),
        btnCnPreview: $('#btn-cn-preview'),
        cnUploadPreview: $('#cn-upload-preview'),
        cnUploadImg: $('#cn-upload-img'),
        btnCnInpaint: $('#btn-cn-inpaint'),
        cnProcessedPreview: $('#cn-processed-preview'),
        cnProcessedImg: $('#cn-processed-img'),
        cnPreviewContainer: $('#cn-preview-container'),
        cnPreview: $('#cn-preview'),
        chkImg2img: $('#chk-img2img'),
        panelImg2img: $('#panel-img2img'),
        inpRefImage: $('#inp-ref-image'),
        refPreviewContainer: $('#ref-preview-container'),
        refPreview: $('#ref-preview'),
        btnRefInpaint: $('#btn-ref-inpaint'),
        inpDenoise: $('#inp-denoise'),
        btnUseAsRef: $('#btn-use-as-ref'),
        btnCompare: $('#btn-compare'),
        modalCompare: $('#modal-compare'),
        compareContainer: $('#compare-container'),
        compareBefore: $('#compare-before'),
        compareAfter: $('#compare-after'),
        compareSlider: $('#compare-slider'),
        btnCloseCompare: $('#btn-close-compare'),
        btnPreviewRef: $('#btn-preview-ref'),
        btnPreviewInpaint: $('#btn-preview-inpaint'),
        btnPreviewDownload: $('#btn-preview-download'),
        // ADetailer
        chkAdetailer: $('#chk-adetailer'),
        panelAdetailer: $('#panel-adetailer'),
        selAdetailerModel: $('#sel-adetailer-model'),
        inpAdetailerDenoise: $('#inp-adetailer-denoise'),
        inpAdetailerThreshold: $('#inp-adetailer-threshold'),
        inpAdetailerDilation: $('#inp-adetailer-dilation'),
        // Regional Prompt
        chkRegional: $('#chk-regional'),
        panelRegional: $('#panel-regional'),
        regionalList: $('#regional-list'),
        btnAddRegion: $('#btn-add-region'),
        // IP-Adapter
        chkIpadapter: $('#chk-ipadapter'),
        panelIpadapter: $('#panel-ipadapter'),
        sectionIpadapter: $('#section-ipadapter'),
        selIpadapterModel: $('#sel-ipadapter-model'),
        inpIpaImage: $('#inp-ipa-image'),
        ipaPreviewContainer: $('#ipa-preview-container'),
        ipaPreview: $('#ipa-preview'),
        btnIpaInpaint: $('#btn-ipa-inpaint'),
        inpIpaWeight: $('#inp-ipa-weight'),
        inpIpaStart: $('#inp-ipa-start'),
        inpIpaEnd: $('#inp-ipa-end'),
        ipaStatus: $('#ipa-status'),
        ipaDownloadArea: $('#ipa-download-area'),
        btnIpaDownload: $('#btn-ipa-download'),
        ipaDownloadProgress: $('#ipa-download-progress'),
        ipaProgressBar: $('#ipa-progress-bar'),
        ipaProgressText: $('#ipa-progress-text'),
        // Status / Preview
        connStatus: $('#conn-status'),
        connDot: $('#conn-dot'),
        connText: $('#conn-text'),
        livePreview: $('#result-live-preview'),
        // Post-process preview gate
        chkPostPreview: $('#chk-post-preview'),
        modalPostPreview: $('#modal-post-preview'),
        postPreviewImg: $('#post-preview-img'),
        btnPostContinue: $('#btn-post-continue'),
        btnPostRegenerate: $('#btn-post-regenerate'),
        btnPostCancel: $('#btn-post-cancel'),
        // Inpaint
        btnInpaint: $('#btn-inpaint'),
        modalInpaint: $('#modal-inpaint'),
        inpaintViewport: $('#inpaint-viewport'),
        inpaintTransform: $('#inpaint-transform'),
        inpaintStage: $('#inpaint-stage'),
        inpaintCanvas: $('#inpaint-canvas'),
        inpaintCursor: $('#inpaint-cursor'),
        inpaintImage: $('#inpaint-image'),
        selInpaintPreset: $('#sel-inpaint-preset'),
        inpaintHint: $('#inpaint-hint'),
        txtInpaintPos: $('#txt-inpaint-pos'),
        inpInpaintDenoise: $('#inp-inpaint-denoise'),
        inpaintBrush: $('#inpaint-brush'),
        inpaintWandTol: $('#inpaint-wand-tol'),
        inpaintWandWrap: $('#inpaint-wand-wrap'),
        chkInpaintPixel: $('#chk-inpaint-pixel'),
        inpaintZoomLabel: $('#inpaint-zoom-label'),
        btnInpaintBrush: $('#btn-inpaint-brush'),
        btnInpaintEraser: $('#btn-inpaint-eraser'),
        btnInpaintWand: $('#btn-inpaint-wand'),
        btnInpaintAuto: $('#btn-inpaint-auto'),
        btnInpaintAutoYolo: $('#btn-inpaint-auto-yolo'),
        btnInpaintPan: $('#btn-inpaint-pan'),
        btnInpaintInvert: $('#btn-inpaint-invert'),
        btnInpaintFit: $('#btn-inpaint-fit'),
        btnInpaint100: $('#btn-inpaint-100'),
        btnInpaintClear: $('#btn-inpaint-clear'),
        btnInpaintRun: $('#btn-inpaint-run'),
        btnInpaintCancel: $('#btn-inpaint-cancel'),
        inpaintSidebar: $('#inpaint-sidebar'),
        btnInpaintSidebarToggle: $('#btn-inpaint-sidebar-toggle'),
        selInpaintCheckpoint: $('#sel-inpaint-checkpoint'),
        chkInpaintVae: $('#chk-inpaint-vae'),
        selInpaintMode: $('#sel-inpaint-mode'),
        inpaintEngineStatus: $('#inpaint-engine-status'),
        inpaintYoloStatus: $('#inpaint-yolo-status'),
        inpaintSamStatus: $('#inpaint-sam-status'),
        inpaintDownloadArea: $('#inpaint-download-area'),
        btnInpaintDownload: $('#btn-inpaint-download'),
        inpaintDownloadProgress: $('#inpaint-download-progress'),
        inpaintProgressText: $('#inpaint-progress-text'),
        inpaintProgressBar: $('#inpaint-progress-bar'),
        selInpaintVae: $('#sel-inpaint-vae'),
        inpInpaintSteps: $('#inp-inpaint-steps'),
        inpInpaintCfg: $('#inp-inpaint-cfg'),
        selInpaintSampler: $('#sel-inpaint-sampler'),
        selInpaintScheduler: $('#sel-inpaint-scheduler'),
        inpInpaintSamRange: $('#inp-inpaint-sam-range'),
        inpaintSamRangeValue: $('#inpaint-sam-range-value'),
        inpaintModelNote: $('#inpaint-model-note'),
        inpaintSdxlPanel: $('#inpaint-sdxl-panel'),
        inpaintAnimaPanel: $('#inpaint-anima-panel'),
        inpaintAnimaModelInfo: $('#inpaint-anima-model-info'),
        inpaintRowSampler: $('#inpaint-row-sampler'),
        inpaintRowFixed: $('#inpaint-row-fixed'),
        inpaintDenoiseWrap: $('#inpaint-denoise-wrap'),
        // Config profiles
        selProfileQuick: $('#sel-profile-quick'),
        selProfile: $('#sel-profile'),
        btnProfileSave: $('#btn-profile-save'),
        btnProfileSaveAs: $('#btn-profile-saveas'),
        btnProfileRename: $('#btn-profile-rename'),
        btnProfileDelete: $('#btn-profile-delete'),
        // Composite
        btnComposite: $('#btn-composite'),
        btnCompositeResult: $('#btn-composite-result'),
        btnPreviewCompositeBase: $('#btn-preview-composite-base'),
        btnPreviewCompositeOverlay: $('#btn-preview-composite-overlay'),
        modalComposite: $('#modal-composite'),
        compositeViewport: $('#composite-viewport'),
        compositeCanvas: $('#composite-canvas'),
        btnCompositeClose: $('#btn-composite-close'),
        btnCompositeFitView: $('#btn-composite-fit-view'),
        btnCompositeToggleGuides: $('#btn-composite-toggle-guides'),
        btnCompositeExport: $('#btn-composite-export'),
        btnCompositeSaveHistory: $('#btn-composite-save-history'),
        btnCompositeLoadBase: $('#btn-composite-load-base'),
        btnCompositeLoadOverlay: $('#btn-composite-load-overlay'),
        btnCompositeBaseResult: $('#btn-composite-base-result'),
        btnCompositeOverlayResult: $('#btn-composite-overlay-result'),
        btnCompositeFitHalf: $('#btn-composite-fit-half'),
        btnCompositeFitWidth: $('#btn-composite-fit-width'),
        btnCompositeSwap: $('#btn-composite-swap'),
        inpCompositeBase: $('#inp-composite-base'),
        inpCompositeOverlay: $('#inp-composite-overlay'),
        compositeBaseThumb: $('#composite-base-thumb'),
        compositeOverlayThumb: $('#composite-overlay-thumb'),
        compositeBaseEmpty: $('#composite-base-empty'),
        compositeOverlayEmpty: $('#composite-overlay-empty'),
        compositeOpacity: $('#composite-opacity'),
        compositeOpacityVal: $('#composite-opacity-val'),
        compositeRotation: $('#composite-rotation'),
        compositeRotationVal: $('#composite-rotation-val'),
        btnCompositeCutoutOverlay: $('#btn-composite-cutout-overlay'),
        // Cutout
        btnCutout: $('#btn-cutout'),
        btnCutoutResult: $('#btn-cutout-result'),
        btnPreviewCutout: $('#btn-preview-cutout'),
        modalCutout: $('#modal-cutout'),
        cutoutSrcPreview: $('#cutout-src-preview'),
        cutoutResultPreview: $('#cutout-result-preview'),
        cutoutSrcEmpty: $('#cutout-src-empty'),
        cutoutResultEmpty: $('#cutout-result-empty'),
        cutoutProgress: $('#cutout-progress'),
        cutoutProgressBar: $('#cutout-progress-bar'),
        cutoutProgressText: $('#cutout-progress-text'),
        btnCutoutLoad: $('#btn-cutout-load'),
        btnCutoutFromResult: $('#btn-cutout-from-result'),
        btnCutoutRun: $('#btn-cutout-run'),
        btnCutoutComposite: $('#btn-cutout-composite'),
        btnCutoutDownload: $('#btn-cutout-download'),
        btnCutoutHistory: $('#btn-cutout-history'),
        btnCutoutClose: $('#btn-cutout-close'),
        inpCutout: $('#inp-cutout'),
        cutoutAdjustPanel: $('#cutout-adjust-panel'),
        cutoutShrink: $('#cutout-shrink'),
        cutoutShrinkVal: $('#cutout-shrink-val'),
        cutoutThreshold: $('#cutout-threshold'),
        cutoutThresholdVal: $('#cutout-threshold-val'),
        cutoutFeather: $('#cutout-feather'),
        cutoutFeatherVal: $('#cutout-feather-val'),
        btnCutoutResetAdjust: $('#btn-cutout-reset-adjust'),
    };

    // ==================== 连接状态灯 ====================
    let _connTimer = null;
    async function _checkConnectionOnce() {
        if (!dom.connStatus || !dom.connText) return;
        const t0 = performance.now();
        try {
            const res = await fetch(`${getServer()}/system_stats`, { cache: 'no-store' });
            const ms = Math.round(performance.now() - t0);
            if (!res.ok) throw new Error('bad_status');
            const slow = ms >= 1200;
            dom.connStatus.classList.toggle('conn-online', !slow);
            dom.connStatus.classList.toggle('conn-slow', slow);
            dom.connStatus.classList.remove('conn-offline');
            dom.connText.textContent = slow ? `延迟 ${ms}ms` : `在线 ${ms}ms`;
            dom.connStatus.title = `ComfyUI 在线（${ms}ms）`;
        } catch {
            dom.connStatus.classList.remove('conn-online', 'conn-slow');
            dom.connStatus.classList.add('conn-offline');
            dom.connText.textContent = '离线';
            dom.connStatus.title = 'ComfyUI 离线（检查地址/代理/服务）';
        }
    }

    function setupConnectionStatus() {
        if (!dom.connStatus) return;
        if (_connTimer) clearInterval(_connTimer);
        _checkConnectionOnce();
        _connTimer = setInterval(_checkConnectionOnce, 4000);
    }

    // ==================== 生成状态（耗时/进度同步/预览） ====================
    const _gen = {
        active: false,
        promptId: null,
        startAt: 0,
        runningAt: 0, // first time observed in queue_running
        lastPct: 0,
        hasRealtimeProgress: false,
        ws: null,
        wsClientId: null,
        lastPreviewUrl: null,
    };

    function _promptExtraData() {
        return { preview_method: 'latent2rgb' };
    }

    function _fmtMs(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(s / 60);
        const ss = String(s % 60).padStart(2, '0');
        return `${m}:${ss}`;
    }

    function _setTitleProgress(pct, text) {
        const base = document.getElementById('app-version')?.textContent
            ? `ComfyUI Web ${document.getElementById('app-version').textContent}`
            : 'ComfyUI Web';
        if (!_gen.active) { document.title = base; return; }
        const pctText = (typeof pct === 'number') ? `${Math.round(pct)}%` : '';
        document.title = `${pctText} ${text || '生成中...'} - ${base}`.trim();
    }

    function _syncFab(pct) {
        const fab = document.getElementById('btn-generate-fab');
        if (!fab) return;
        if (!_gen.active) {
            fab.disabled = false;
            fab.textContent = '✨';
            return;
        }
        fab.disabled = true;
        const v = Math.round(pct || 0);
        fab.textContent = v >= 100 ? '✓' : String(v);
    }

    function _resetLivePreview() {
        if (!_gen.lastPreviewUrl) return;
        URL.revokeObjectURL(_gen.lastPreviewUrl);
        _gen.lastPreviewUrl = null;
    }

    function _setLivePreview(blob) {
        if (!dom.livePreview) return;
        _resetLivePreview();
        const url = URL.createObjectURL(blob);
        _gen.lastPreviewUrl = url;
        dom.livePreview.src = url;
        dom.livePreview.classList.remove('hidden');
        dom.resultPlaceholder?.classList.add('hidden');
    }

    function _hideLivePreview() {
        if (!dom.livePreview) return;
        dom.livePreview.classList.add('hidden');
        dom.livePreview.removeAttribute('src');
        _resetLivePreview();
    }

    function _closePreviewWS() {
        if (_gen.ws) {
            try { _gen.ws.close(); } catch { /* ignore */ }
        }
        _gen.ws = null;
        _gen.wsClientId = null;
    }

    function _getWsBase() {
        if (isLocalProxy()) {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const httpPort = parseInt(window.location.port || (window.location.protocol === 'https:' ? '443' : '80'), 10);
            return `${proto}//${window.location.hostname}:${httpPort + 1}`;
        }
        const server = getServer();
        if (!server) {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${proto}//${window.location.host}`;
        }
        return server.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    }

    function _connectPreviewWS() {
        // ComfyUI standard: ws(s)://host/ws?clientId=xxx
        const base = _getWsBase();
        const clientId = _gen.wsClientId || (`cw_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`);
        _gen.wsClientId = clientId;
        const url = `${base}/ws?clientId=${encodeURIComponent(clientId)}`;
        let ws;
        try {
            ws = new WebSocket(url);
        } catch {
            return;
        }
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
            try {
                ws.send(JSON.stringify({
                    type: 'feature_flags',
                    data: { supports_preview_metadata: true },
                }));
            } catch { /* ignore */ }
        };
        ws.onmessage = (ev) => {
            if (!_gen.active) return;
            if (typeof ev.data === 'string') {
                try {
                    const msg = JSON.parse(ev.data);
                    const dataPromptId = msg?.data?.prompt_id;
                    if (_gen.promptId && dataPromptId && dataPromptId !== _gen.promptId) return;
                    if (msg?.type === 'progress') {
                        const d = msg.data || {};
                        const pct = (typeof d.value === 'number' && typeof d.max === 'number' && d.max > 0)
                            ? (d.value / d.max) * 100
                            : (typeof d.progress === 'number' ? d.progress * 100 : null);
                        if (pct != null) {
                            _gen.hasRealtimeProgress = true;
                            setProgress(Math.max(_gen.lastPct, Math.min(99, pct)));
                        }
                    }
                } catch { /* ignore */ }
                return;
            }
            // ComfyUI binary preview frames: 8-byte header + image data
            if (ev.data instanceof ArrayBuffer) {
                const bytes = new Uint8Array(ev.data);
                if (bytes.length < 8) return;
                const view = new DataView(ev.data);
                const eventType = view.getUint32(0, false);
                let mime = 'image/jpeg';
                let imageBytes = null;
                if (eventType === 1) {
                    const imageType = view.getUint32(4, false);
                    mime = imageType === 2 ? 'image/png' : 'image/jpeg';
                    imageBytes = bytes.slice(8);
                } else if (eventType === 4) {
                    const metaLen = view.getUint32(4, false);
                    const imageStart = 8 + metaLen;
                    if (bytes.length <= imageStart) return;
                    try {
                        const metaJson = new TextDecoder().decode(bytes.slice(8, imageStart));
                        const meta = JSON.parse(metaJson);
                        mime = meta?.image_type || mime;
                    } catch { /* ignore */ }
                    imageBytes = bytes.slice(imageStart);
                }
                if (imageBytes && imageBytes.length > 0) {
                    _setLivePreview(new Blob([imageBytes], { type: mime }));
                }
            }
        };
        ws.onclose = () => { if (_gen.ws === ws) _gen.ws = null; };
        ws.onerror = () => { /* ignore */ };
        _gen.ws = ws;
    }

    // ==================== 开关面板逻辑 ====================
    function setupToggles() {
        const pairs = [
            [dom.chkVae, dom.panelVae],
            [dom.chkLora, dom.panelLora],
            [dom.chkHires, dom.panelHires],
            [dom.chkControlnet, dom.panelControlnet],
            [dom.chkImg2img, dom.panelImg2img],
            [dom.chkAdetailer, dom.panelAdetailer],
            [dom.chkRegional, dom.panelRegional],
            [$('#chk-freeu'), $('#panel-freeu')],
            [dom.chkIpadapter, dom.panelIpadapter],
        ];
        pairs.forEach(([chk, panel]) => {
            const update = () => {
                panel.classList.toggle('hidden', !chk.checked);
            };
            chk.addEventListener('change', update);
            update();
        });
    }

    function syncControlnetSpeedupGuard(opts = {}) {
        const speedup = document.getElementById('chk-speedup');
        if (!speedup || !dom.chkControlnet) return;

        const cnOn = dom.chkControlnet.checked;
        const speedupLabel = speedup.closest('label');

        if (cnOn) {
            if (speedup.checked) {
                speedup.checked = false;
                if (!opts.silent) {
                    showToast('ControlNet 已开启，已自动关闭加速模式（二者不兼容）');
                }
            }
            speedup.disabled = true;
            if (speedupLabel) {
                speedupLabel.title = 'ControlNet 开启时不可用：加速模式会破坏线稿/姿势控制';
                speedupLabel.style.opacity = '0.55';
            }
        } else {
            speedup.disabled = false;
            if (speedupLabel) {
                speedupLabel.title = '';
                speedupLabel.style.opacity = '';
            }
        }
    }

    function setupControlnetSpeedupGuard() {
        const speedup = document.getElementById('chk-speedup');
        if (!speedup || !dom.chkControlnet) return;

        dom.chkControlnet.addEventListener('change', () => syncControlnetSpeedupGuard());
        speedup.addEventListener('change', () => {
            if (speedup.checked && dom.chkControlnet.checked) {
                speedup.checked = false;
                showToast('ControlNet 开启时无法使用加速模式');
            }
        });
        syncControlnetSpeedupGuard({ silent: true });
        syncArchIsolation({ silent: true });
    }

    // ==================== LoRA 多选管理 ====================
    let loraOptions = [];
    let loraCount = 0;

    /** ComfyUI 在 Windows 下 lora_name 用反斜杠，统一比对后取 object_info 里的原始值 */
    function normalizeLoraKey(name) {
        return String(name || '').replace(/\\/g, '/').toLowerCase();
    }

    function resolveLoraNameForComfy(name) {
        if (name == null || name === '') return name;
        // 点击「添加 LoRA」时若误传入 Event，直接忽略
        if (typeof name !== 'string') {
            if (typeof name === 'object' && (name instanceof Event || typeof name.preventDefault === 'function')) {
                return '';
            }
            name = String(name);
        }
        if (loraOptions.includes(name)) return name;
        const key = normalizeLoraKey(name);
        const exact = loraOptions.find(l => normalizeLoraKey(l) === key);
        if (exact) return exact;
        const parts = name.replace(/\\/g, '/').split('/');
        const base = (parts.pop() || '').toLowerCase();
        const folder = parts.join('/').toLowerCase();
        const fuzzy = loraOptions.find(l => {
            const lp = String(l).replace(/\\/g, '/').split('/');
            const lb = (lp.pop() || '').toLowerCase();
            const lf = lp.join('/').toLowerCase();
            return lb === base && (!folder || lf === folder);
        });
        return fuzzy || name;
    }

    function _parsePromptParts(text) {
        return String(text || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    function _promptPartName(part) {
        const m = part.match(/^\((.+?):[\d.]+\)$/);
        return (m ? m[1] : part).trim();
    }

    function _getLoraTriggerWords(loraName) {
        if (window.LoraLibrary?.getTriggerWordsForLora) {
            return LoraLibrary.getTriggerWordsForLora(loraName);
        }
        return [];
    }

    function _appendTriggersToPrompt(triggers) {
        if (!triggers?.length || !dom.txtPositive) return;
        const existing = new Set(_parsePromptParts(dom.txtPositive.value).map(p => _promptPartName(p).toLowerCase()));
        const toAdd = [];
        triggers.forEach((t) => {
            const w = String(t).trim();
            if (w && !existing.has(w.toLowerCase())) {
                toAdd.push(w);
                existing.add(w.toLowerCase());
            }
        });
        if (!toAdd.length) return;
        const cur = dom.txtPositive.value.trim();
        dom.txtPositive.value = cur ? `${cur}, ${toAdd.join(', ')}` : toAdd.join(', ');
        dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function _removeTriggersFromPrompt(triggers) {
        if (!triggers?.length || !dom.txtPositive) return;
        const removeSet = new Set(triggers.map(t => String(t).trim().toLowerCase()).filter(Boolean));
        if (!removeSet.size) return;
        const parts = _parsePromptParts(dom.txtPositive.value).filter(
            p => !removeSet.has(_promptPartName(p).toLowerCase())
        );
        dom.txtPositive.value = parts.join(', ');
        dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /** 从作品栏填入的角色：可单独撤销，不必清空整段提示词 */
    const InsertedCharacters = {
        items: [],

        _tokensFromTag(tag, includeFeatureTags) {
            const tokens = [];
            const seen = new Set();
            const push = (raw) => {
                String(raw || '').split(',').forEach((piece) => {
                    const w = piece.trim();
                    if (!w) return;
                    const key = w.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    tokens.push(w);
                });
            };
            push(tag?.t);
            if (includeFeatureTags && Array.isArray(tag?.tags)) {
                tag.tags.forEach(push);
            }
            return tokens;
        },

        _idOf(tag) {
            return String(tag?.t || tag?.d || '').trim().toLowerCase() || `c_${Date.now()}`;
        },

        add(tag, mode = 'trigger') {
            if (!tag?.t) return;
            const includeTags = mode === 'trigger-tags';
            const tokens = this._tokensFromTag(tag, includeTags);
            if (!tokens.length) return;

            const id = this._idOf(tag);
            const existing = this.items.find(i => i.id === id);
            if (existing) {
                // 同一角色再次填入：合并要跟踪的词，避免重复 chip
                const have = new Set(existing.tokens.map(t => t.toLowerCase()));
                tokens.forEach((t) => {
                    if (!have.has(t.toLowerCase())) existing.tokens.push(t);
                });
                existing.mode = includeTags ? 'trigger-tags' : existing.mode;
                existing.name = tag.d || tag.t.split(',')[0] || existing.name;
                existing.thumb = tag.th || existing.thumb;
            } else {
                this.items.push({
                    id,
                    name: tag.d || tag.t.split(',')[0] || '角色',
                    thumb: tag.th || '',
                    mode: includeTags ? 'trigger-tags' : 'trigger',
                    tokens: tokens.slice(),
                });
            }

            _appendTriggersToPrompt(tokens);
            this.render();
        },

        remove(id) {
            const idx = this.items.findIndex(i => i.id === id);
            if (idx < 0) return;
            const [item] = this.items.splice(idx, 1);
            const stillNeeded = new Set();
            this.items.forEach((other) => {
                other.tokens.forEach((t) => stillNeeded.add(t.toLowerCase()));
            });
            const toRemove = item.tokens.filter(t => !stillNeeded.has(t.toLowerCase()));
            _removeTriggersFromPrompt(toRemove);
            this.render();
        },

        clearAll(removeFromPrompt = true) {
            if (removeFromPrompt) {
                const all = [];
                this.items.forEach(i => all.push(...i.tokens));
                _removeTriggersFromPrompt(all);
            }
            this.items = [];
            this.render();
        },

        pruneMissing() {
            if (!this.items.length || !dom.txtPositive) return;
            const parts = new Set(
                _parsePromptParts(dom.txtPositive.value).map(p => _promptPartName(p).toLowerCase())
            );
            const next = this.items.filter(item =>
                item.tokens.some(t => parts.has(String(t).toLowerCase()))
            );
            if (next.length !== this.items.length) {
                this.items = next;
                this.render();
            }
        },

        render() {
            const wrap = document.getElementById('inserted-chars-wrap');
            if (!wrap) return;
            wrap.innerHTML = '';
            if (!this.items.length) {
                wrap.classList.add('hidden');
                return;
            }
            wrap.classList.remove('hidden');

            const label = document.createElement('span');
            label.className = 'inserted-chars-label';
            label.textContent = '角色';
            label.title = '从作品栏加入的角色；点 ✕ 只删除该角色相关提示词';
            wrap.appendChild(label);

            this.items.forEach((item) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'inserted-char-chip';
                chip.title = `移除「${item.name}」及其相关提示词\n${item.tokens.join(', ')}`;
                chip.innerHTML = `<span class="inserted-char-name"></span><span class="inserted-char-x" aria-hidden="true">✕</span>`;
                chip.querySelector('.inserted-char-name').textContent = item.name;
                chip.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.remove(item.id);
                });
                wrap.appendChild(chip);
            });
        },
    };

    function setupInsertedCharacters() {
        InsertedCharacters.render();
        if (!dom.txtPositive) return;
        dom.txtPositive.addEventListener('input', () => InsertedCharacters.pruneMissing());
    }

    // ==================== 随机画师串（对齐 TK 绘画工具） ====================
    let _randomArtistBusy = false;
    let _lastRandomArtists = []; // 干净画师名（无 @ / by）
    let _lastRandomTokens = [];  // 实际写入提示词的 token

    function _cleanArtistName(name) {
        return String(name || '').replace(/^@/, '').replace(/^by\s+/i, '').trim();
    }

    function _formatRandomArtistToken(rawName) {
        const clean = _cleanArtistName(rawName);
        if (!clean) return '';
        if (isAnimaMode()) return formatAnimaArtistTag(clean);
        // SDXL：尽量保留库里的 trigger 形态（下划线）
        return clean.replace(/\s+/g, '_');
    }

    function _isArtistStylePart(part) {
        const p = _promptPartName(part).trim();
        if (/^@/.test(p) || /^by\s+/i.test(p)) return true;
        const key = _cleanArtistName(p).toLowerCase().replace(/\s+/g, '_');
        return _lastRandomTokens.some((t) => {
            const ct = _cleanArtistName(_promptPartName(t)).toLowerCase().replace(/\s+/g, '_');
            return ct && ct === key;
        });
    }

    function _setLeadingArtists(names) {
        const cleanNames = (Array.isArray(names) ? names : [])
            .map((n) => _cleanArtistName(n))
            .filter(Boolean);
        if (!cleanNames.length || !dom.txtPositive) return [];
        const tokens = cleanNames.map(_formatRandomArtistToken).filter(Boolean);
        const rows = _parsePromptParts(dom.txtPositive.value);
        let i = 0;
        while (i < rows.length && _isArtistStylePart(rows[i])) i += 1;
        const rest = rows.slice(i);
        dom.txtPositive.value = tokens.concat(rest).join(', ');
        dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
        _lastRandomArtists = cleanNames.slice();
        _lastRandomTokens = tokens.slice();
        return tokens;
    }

    function _getLeadingArtistNamesFromPrompt() {
        if (!dom.txtPositive) return [];
        const rows = _parsePromptParts(dom.txtPositive.value);
        const names = [];
        for (const part of rows) {
            if (!_isArtistStylePart(part)) break;
            const name = _cleanArtistName(_promptPartName(part));
            if (name) names.push(name);
        }
        return names;
    }

    function _resolveStyleArtists() {
        if (_lastRandomArtists.length) return _lastRandomArtists.slice();
        return _getLeadingArtistNamesFromPrompt();
    }

    function _updateFavoriteStyleBtn() {
        const btn = document.getElementById('btn-favorite-style');
        if (!btn) return;
        const artists = _resolveStyleArtists();
        btn.disabled = artists.length === 0;
        btn.title = artists.length
            ? `自动用当前生成图收藏 ${artists.length} 个画师串到「画师 → 画师串」`
            : '请先随机画师串，或在正向开头保留画师串';
    }

    async function randomArtistMix() {
        if (_randomArtistBusy) return;
        const countSel = document.getElementById('random-artist-count');
        const count = Math.min(5, Math.max(2, Math.floor(Number(countSel?.value) || 3)));
        const btn = document.getElementById('btn-random-artists');
        _randomArtistBusy = true;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '抽取中…';
        }
        try {
            const first = await _fetchArtists('score', 'desc', 1, 'all');
            const pages = Math.max(1, Number(first?.pages) || 1);
            const page = 1 + Math.floor(Math.random() * pages);
            const data = page === 1 ? first : await _fetchArtists('score', 'desc', page, 'all');
            const pool = (data?.tags || [])
                .map((row) => String(row?.t || row?.d || '').trim())
                .filter(Boolean);
            if (pool.length < 2) throw new Error('画师库不足，请稍后重试');
            const n = Math.min(count, pool.length);
            const bag = pool.slice();
            const picked = [];
            for (let i = 0; i < n; i += 1) {
                const idx = Math.floor(Math.random() * bag.length);
                picked.push(bag.splice(idx, 1)[0]);
            }
            const clean = picked.map(_cleanArtistName).filter(Boolean);
            _setLeadingArtists(clean);
            _updateFavoriteStyleBtn();
            showToast(`已随机填入 ${clean.length} 个画师`);
        } catch (err) {
            showToast(err?.message || '随机画师串失败');
        } finally {
            _randomArtistBusy = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🎲 随机画师串';
            }
        }
    }

    function _getCurrentResultImageEl() {
        const resultImg = document.getElementById('result-image');
        if (!resultImg || resultImg.classList.contains('hidden')) return null;
        const src = String(resultImg.currentSrc || resultImg.src || '').trim();
        if (!src || !resultImg.naturalWidth) return null;
        return resultImg;
    }

    function _drawImgElToJpeg(el, maxSide = 480, quality = 0.85) {
        if (!el?.naturalWidth) return '';
        try {
            let w = el.naturalWidth;
            let h = el.naturalHeight;
            if (w > maxSide || h > maxSide) {
                const ratio = Math.min(maxSide / w, maxSide / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(el, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', quality);
        } catch {
            return '';
        }
    }

    function _collectStyleCoverCandidates(limit = 12) {
        const seen = new Set();
        const out = [];
        const push = (src) => {
            const u = String(src || '').trim();
            if (!u || seen.has(u)) return;
            seen.add(u);
            out.push(u);
        };
        const resultImg = _getCurrentResultImageEl();
        if (resultImg) push(resultImg.currentSrc || resultImg.src);
        try {
            const hist = typeof getHistory === 'function' ? getHistory() : [];
            for (const item of hist) {
                if (out.length >= limit) break;
                push(item?.fullUrl || item?.url);
            }
        } catch { /* ignore */ }
        return out.slice(0, limit);
    }

    function _escapeStyleAttr(value) {
        return String(value || '').replace(/[&<>"'`]/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;',
        }[c]));
    }

    function _compressDataUrlThumb(dataUrl, maxSide = 480, quality = 0.85) {
        return new Promise((resolve) => {
            if (!dataUrl) return resolve('');
            const img = new Image();
            img.onload = () => {
                try {
                    let w = img.naturalWidth || img.width;
                    let h = img.naturalHeight || img.height;
                    if (!w || !h) return resolve('');
                    if (w > maxSide || h > maxSide) {
                        const ratio = Math.min(maxSide / w, maxSide / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch {
                    resolve('');
                }
            };
            img.onerror = () => resolve('');
            img.src = dataUrl;
        });
    }

    async function _imageSrcToChainThumb(src, maxSide = 480) {
        const raw = String(src || '').trim();
        if (!raw) return '';
        if (raw.startsWith('data:')) {
            return (await _compressDataUrlThumb(raw, maxSide)) || raw;
        }
        // 当前结果图：直接从 DOM 截，保证带进画师串
        const resultImg = _getCurrentResultImageEl();
        if (resultImg) {
            const rsrc = String(resultImg.currentSrc || resultImg.src || '');
            if (rsrc === raw || !raw) {
                const shot = _drawImgElToJpeg(resultImg, maxSide);
                if (shot) return shot;
            }
        }
        try {
            const imgs = document.querySelectorAll('#result-image, #history-grid img, .history-item img');
            for (const el of imgs) {
                const esrc = String(el?.currentSrc || el?.src || '');
                if (esrc === raw && el.naturalWidth) {
                    const shot = _drawImgElToJpeg(el, maxSide);
                    if (shot) return shot;
                }
            }
        } catch { /* fall through */ }
        try {
            const res = await fetch(raw);
            if (!res.ok) throw new Error('fetch failed');
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            });
            return (await _compressDataUrlThumb(dataUrl, maxSide)) || '';
        } catch {
            return '';
        }
    }

    /** 优先截当前生成图；没有再退历史第一张 */
    async function _autoCaptureStyleCover(maxSide = 480) {
        const resultImg = _getCurrentResultImageEl();
        if (resultImg) {
            const shot = _drawImgElToJpeg(resultImg, maxSide);
            if (shot) return shot;
            const fromSrc = await _imageSrcToChainThumb(resultImg.currentSrc || resultImg.src, maxSide);
            if (fromSrc) return fromSrc;
        }
        try {
            const hist = typeof getHistory === 'function' ? getHistory() : [];
            for (const item of hist) {
                const src = item?.fullUrl || item?.url;
                if (!src) continue;
                const thumb = await _imageSrcToChainThumb(src, maxSide);
                if (thumb) return thumb;
            }
        } catch { /* ignore */ }
        return '';
    }

    let _styleCoverResolver = null;

    function _ensureStyleCoverPicker() {
        let overlay = document.getElementById('style-cover-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'style-cover-overlay';
        overlay.className = 'modal hidden';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="modal-content style-cover-card" role="dialog" aria-modal="true" aria-labelledby="style-cover-title">
                <h3 id="style-cover-title">收藏画师串</h3>
                <p id="style-cover-trigger" class="style-cover-trigger"></p>
                <p class="style-cover-hint">当前没有生成图，请上传一张封面（永久存本机）</p>
                <div id="style-cover-grid" class="style-cover-grid"></div>
                <div class="style-cover-upload-row">
                    <input type="file" id="style-cover-file" accept="image/*" class="hidden">
                    <button type="button" class="btn-secondary" id="style-cover-upload">上传封面</button>
                    <span id="style-cover-upload-name" class="style-cover-upload-name"></span>
                </div>
                <div class="modal-actions style-cover-actions">
                    <button type="button" class="btn-secondary" id="style-cover-cancel">取消</button>
                    <button type="button" class="btn-primary" id="style-cover-ok">收藏</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const close = (result) => {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            const resolver = _styleCoverResolver;
            _styleCoverResolver = null;
            if (resolver) resolver(result);
        };
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(null);
        });
        overlay.querySelector('#style-cover-cancel').addEventListener('click', () => close(null));
        overlay.querySelector('#style-cover-ok').addEventListener('click', () => {
            const picked = overlay.querySelector('input[name="style-cover"]:checked');
            const uploadData = overlay._uploadDataUrl || '';
            const cover = uploadData || (picked ? String(picked.value || '') : '');
            if (!cover) {
                showToast('请上传一张封面图');
                return;
            }
            close({ cover });
        });
        overlay.querySelector('#style-cover-upload').addEventListener('click', () => {
            overlay.querySelector('#style-cover-file').click();
        });
        overlay.querySelector('#style-cover-file').addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
                const dataUrl = await _compressChainImageFile(file, 480);
                overlay._uploadDataUrl = dataUrl;
                const nameEl = overlay.querySelector('#style-cover-upload-name');
                if (nameEl) nameEl.textContent = file.name || '已选本地图';
                overlay.querySelectorAll('.style-cover-option').forEach((el) => el.classList.remove('is-selected'));
                overlay.querySelectorAll('input[name="style-cover"]').forEach((inp) => { inp.checked = false; });
            } catch (err) {
                showToast(err?.message || '封面读取失败');
            }
        });
        return overlay;
    }

    function _openStyleCoverPicker(artists, images) {
        return new Promise((resolve) => {
            const overlay = _ensureStyleCoverPicker();
            if (_styleCoverResolver) _styleCoverResolver(null);
            _styleCoverResolver = resolve;
            overlay._uploadDataUrl = '';
            const triggerEl = overlay.querySelector('#style-cover-trigger');
            const grid = overlay.querySelector('#style-cover-grid');
            const nameEl = overlay.querySelector('#style-cover-upload-name');
            if (triggerEl) triggerEl.textContent = artists.join(', ');
            if (nameEl) nameEl.textContent = '';
            grid.innerHTML = images.map((src, index) => {
                const id = `style-cover-img-${index}`;
                const checked = index === 0 ? ' checked' : '';
                const selected = index === 0 ? ' is-selected' : '';
                return `<label class="style-cover-option${selected}" for="${id}">
                    <input type="radio" name="style-cover" id="${id}" value="${_escapeStyleAttr(src)}"${checked}>
                    <img src="${_escapeStyleAttr(src)}" alt="封面${index + 1}" loading="lazy" decoding="async">
                </label>`;
            }).join('');
            grid.querySelectorAll('input[name="style-cover"]').forEach((input) => {
                input.addEventListener('change', () => {
                    overlay._uploadDataUrl = '';
                    if (nameEl) nameEl.textContent = '';
                    grid.querySelectorAll('.style-cover-option').forEach((el) => el.classList.remove('is-selected'));
                    input.closest('.style-cover-option')?.classList.add('is-selected');
                });
            });
            overlay.classList.remove('hidden');
            overlay.setAttribute('aria-hidden', 'false');
        });
    }

    async function favoriteCurrentStyle() {
        const artists = _resolveStyleArtists();
        if (!artists.length) {
            showToast('请先随机画师串，或在正向开头保留画师串');
            _updateFavoriteStyleBtn();
            return;
        }
        const btn = document.getElementById('btn-favorite-style');
        if (btn) btn.disabled = true;
        try {
            // 有当前生成图：直接截图写入，不再弹窗选图
            let cover = await _autoCaptureStyleCover(480);
            if (!cover) {
                const pick = await _openStyleCoverPicker(artists, _collectStyleCoverCandidates(12));
                if (!pick) return;
                cover = String(pick.cover || '').trim();
                if (cover && !cover.startsWith('data:')) {
                    cover = await _imageSrcToChainThumb(cover, 480);
                } else if (cover.startsWith('data:')) {
                    cover = (await _compressDataUrlThumb(cover, 480)) || cover;
                }
            }
            if (!cover) {
                showToast('没有可用封面：请先生成一张图，或上传封面');
                return;
            }
            await ArtistChainManager.add({
                name: `随机风格 · ${artists.length}画师`,
                prompt: artists.join(', '),
                imageData: cover,
            });
            if (posTagPicker && typeof _isArtistChainsMode === 'function' && _isArtistChainsMode(posTagPicker)) {
                posTagPicker.renderGrid?.();
            }
            showToast('已收藏当前图到画师串');
        } catch (err) {
            showToast(err?.message || '收藏失败');
        } finally {
            _updateFavoriteStyleBtn();
        }
    }

    function setupRandomArtists() {
        document.getElementById('btn-random-artists')?.addEventListener('click', () => {
            randomArtistMix();
        });
        document.getElementById('btn-favorite-style')?.addEventListener('click', () => {
            favoriteCurrentStyle();
        });
        document.getElementById('random-artist-count')?.addEventListener('change', (e) => {
            try { localStorage.setItem('comfyui_random_artist_count', e.target.value); } catch { /* ignore */ }
        });
        const savedCount = localStorage.getItem('comfyui_random_artist_count');
        const countSel = document.getElementById('random-artist-count');
        if (countSel && savedCount && ['2', '3', '4', '5'].includes(savedCount)) {
            countSel.value = savedCount;
        }
        dom.txtPositive?.addEventListener('input', () => _updateFavoriteStyleBtn());
        // 架构切换时若已有随机串，按新格式重写头部
        dom.selArch?.addEventListener('change', () => {
            if (_lastRandomArtists.length) {
                _setLeadingArtists(_lastRandomArtists);
            }
            _updateFavoriteStyleBtn();
        });
        _updateFavoriteStyleBtn();
    }

    function _bindLoraRowEvents(row) {
        const sel = row.querySelector('.lora-select');
        const removeBtn = row.querySelector('.lora-remove');
        if (sel) {
            sel.addEventListener('change', () => {
                const oldTriggers = JSON.parse(row.dataset.loraTriggers || '[]');
                _removeTriggersFromPrompt(oldTriggers);
                const name = resolveLoraNameForComfy(sel.value);
                const newTriggers = _getLoraTriggerWords(name);
                row.dataset.loraTriggers = JSON.stringify(newTriggers);
                _appendTriggersToPrompt(newTriggers);
            });
        }
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const triggers = JSON.parse(row.dataset.loraTriggers || '[]');
                _removeTriggersFromPrompt(triggers);
                row.remove();
            });
        }
    }

    function clearLoraRows(removeTriggers = false) {
        if (removeTriggers) {
            dom.loraList.querySelectorAll('.lora-row').forEach((row) => {
                _removeTriggersFromPrompt(JSON.parse(row.dataset.loraTriggers || '[]'));
            });
        }
        dom.loraList.innerHTML = '';
        loraCount = 0;
    }

    function addLoraRow(presetName, presetStrength, presetTriggers, syncTriggers = true) {
        // 作为 click 回调时第一个参数是 Event，不能当成 LoRA 名
        if (presetName && typeof presetName === 'object' && (presetName instanceof Event || typeof presetName.preventDefault === 'function')) {
            presetName = undefined;
            presetStrength = undefined;
            presetTriggers = undefined;
        }
        const resolvedName = presetName ? resolveLoraNameForComfy(presetName) : presetName;
        const triggers = presetTriggers?.length
            ? presetTriggers.filter(Boolean)
            : (resolvedName ? _getLoraTriggerWords(resolvedName) : []);
        loraCount++;
        const row = document.createElement('div');
        row.className = 'lora-row';
        row.dataset.id = loraCount;
        row.dataset.loraTriggers = JSON.stringify(syncTriggers ? triggers : []);
        let options = loraOptions.map(l => `<option value="${l}">${l}</option>`).join('');
        if (resolvedName && !loraOptions.includes(resolvedName)) {
            options = `<option value="${resolvedName}">${resolvedName}</option>` + options;
        }
        row.innerHTML = `
            <select class="lora-select">${options}</select>
            <input type="number" class="lora-strength" value="${presetStrength ?? 1}" min="0" max="2" step="0.05" title="强度">
            <button class="btn-icon lora-remove" title="移除">✕</button>
        `;
        if (resolvedName) {
            const sel = row.querySelector('.lora-select');
            if (sel) sel.value = resolvedName;
        }
        _bindLoraRowEvents(row);
        dom.loraList.appendChild(row);
        if (syncTriggers && triggers.length) {
            _appendTriggersToPrompt(triggers);
        }
    }

    function getLoraSelections() {
        const rows = dom.loraList.querySelectorAll('.lora-row');
        return Array.from(rows).map(row => ({
            name: resolveLoraNameForComfy(row.querySelector('.lora-select').value),
            strength: parseFloat(row.querySelector('.lora-strength').value),
        })).filter(l => l.name);
    }

    // ==================== 用作参考图 ====================
    let refImageUrl = null;

    async function useImageAsRef(imageUrl) {
        refImageUrl = imageUrl;
        dom.chkImg2img.checked = true;
        dom.chkImg2img.dispatchEvent(new Event('change'));
        dom.refPreview.src = imageUrl;
        dom.refPreviewContainer.classList.remove('hidden');
        dom.modalPreview.classList.add('hidden');
    }

    // ==================== 区域提示词管理 ====================
    let regionCount = 0;
    const REGION_COLORS = [
        'rgba(233,69,96,0.35)', 'rgba(69,170,233,0.35)',
        'rgba(96,233,69,0.35)', 'rgba(233,180,69,0.35)',
        'rgba(180,69,233,0.35)', 'rgba(69,233,200,0.35)',
    ];
    const REGION_BORDERS = [
        '#e94560', '#45aae9', '#60e945', '#e9b445', '#b445e9', '#45e9c8',
    ];

    function addRegionRow(x, y, w, h) {
        regionCount++;
        const colorIdx = (regionCount - 1) % REGION_COLORS.length;
        const row = document.createElement('div');
        row.className = 'region-row';
        row.dataset.id = regionCount;
        row.style.borderLeftColor = REGION_BORDERS[colorIdx];
        row.innerHTML = `
            <div class="region-header">
                <span style="color:${REGION_BORDERS[colorIdx]}">■ 区域 ${regionCount}</span>
                <button class="btn-icon region-remove" title="移除">✕</button>
            </div>
            <div class="region-pos">
                <label>X% <input type="number" class="region-x" value="${x ?? 0}" min="0" max="100" step="5"></label>
                <label>Y% <input type="number" class="region-y" value="${y ?? 0}" min="0" max="100" step="5"></label>
                <label>宽% <input type="number" class="region-w" value="${w ?? 50}" min="5" max="100" step="5"></label>
                <label>高% <input type="number" class="region-h" value="${h ?? 50}" min="5" max="100" step="5"></label>
            </div>
            <textarea class="region-prompt" rows="2" placeholder="该区域的提示词..."></textarea>
        `;
        row.querySelector('.region-remove').addEventListener('click', () => {
            row.remove();
            drawRegionCanvas();
        });
        row.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('input', drawRegionCanvas);
        });
        dom.regionalList.appendChild(row);
        drawRegionCanvas();
    }

    function getRegions() {
        const rows = dom.regionalList.querySelectorAll('.region-row');
        return Array.from(rows).map(row => ({
            x: parseFloat(row.querySelector('.region-x').value) / 100,
            y: parseFloat(row.querySelector('.region-y').value) / 100,
            w: parseFloat(row.querySelector('.region-w').value) / 100,
            h: parseFloat(row.querySelector('.region-h').value) / 100,
            strength: 1,
            prompt: row.querySelector('.region-prompt').value || '',
        }));
    }

    function drawRegionCanvas() {
        const canvas = document.getElementById('regional-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cw = canvas.width;
        const ch = canvas.height;

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cw * i / 4, 0);
            ctx.lineTo(cw * i / 4, ch);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, ch * i / 4);
            ctx.lineTo(cw, ch * i / 4);
            ctx.stroke();
        }

        const rows = dom.regionalList.querySelectorAll('.region-row');
        rows.forEach((row, i) => {
            const x = parseFloat(row.querySelector('.region-x').value) / 100 * cw;
            const y = parseFloat(row.querySelector('.region-y').value) / 100 * ch;
            const w = parseFloat(row.querySelector('.region-w').value) / 100 * cw;
            const h = parseFloat(row.querySelector('.region-h').value) / 100 * ch;
            const colorIdx = i % REGION_COLORS.length;

            ctx.fillStyle = REGION_COLORS[colorIdx];
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = REGION_BORDERS[colorIdx];
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = REGION_BORDERS[colorIdx];
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${i + 1}`, x + 4, y + 14);
        });
    }

    function applyPreset(type) {
        dom.regionalList.innerHTML = '';
        regionCount = 0;
        if (type === 'lr') {
            addRegionRow(0, 0, 50, 100);
            addRegionRow(50, 0, 50, 100);
        } else if (type === 'tb') {
            addRegionRow(0, 0, 100, 50);
            addRegionRow(0, 50, 100, 50);
        } else if (type === 'quad') {
            addRegionRow(0, 0, 50, 50);
            addRegionRow(50, 0, 50, 50);
            addRegionRow(0, 50, 50, 50);
            addRegionRow(50, 50, 50, 50);
        } else if (type === 'center') {
            addRegionRow(0, 0, 100, 100);
            addRegionRow(20, 15, 60, 70);
        } else if (type === 'clear') {
            drawRegionCanvas();
        }
    }

    // ==================== 图片上传预览 ====================
    function setupFilePreview(input, preview, container) {
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    container.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                container.classList.add('hidden');
            }
        });
    }

    // ==================== ComfyUI API ====================
    async function apiGet(path) {
        const res = await fetch(`${getServer()}${path}`);
        if (!res.ok) throw new Error(`API ${path} 返回 ${res.status}`);
        return res.json();
    }

    async function apiPost(path, body) {
        console.log('[POST]', path, JSON.stringify(body).substring(0, 500));
        const res = await fetch(`${getServer()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        console.log('[Response]', res.status, text.substring(0, 500));
        if (!res.ok) {
            let detail;
            try { detail = JSON.parse(text); } catch { detail = text; }
            const msg = detail?.error?.message || detail?.error || text || `HTTP ${res.status}`;
            throw new Error(`${path} 错误(${res.status}): ${msg}`);
        }
        return JSON.parse(text);
    }

    async function uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('overwrite', 'true');
        const res = await fetch(`${getServer()}/upload/image`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('图片上传失败');
        return res.json();
    }

    function comfyImageViewUrl(imgMeta) {
        const filename = imgMeta?.filename || '';
        const subfolder = imgMeta?.subfolder || '';
        const type = imgMeta?.type || 'output';
        return `${getServer()}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
    }

    async function fetchComfyImageBlob(viewUrl, retries = 6) {
        let lastErr;
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(viewUrl);
                if (res.ok) {
                    const blob = await res.blob();
                    if (blob.size > 64) return blob;
                    lastErr = new Error(`底图为空 (${blob.size} bytes)`);
                } else {
                    lastErr = new Error(`读取底图 HTTP ${res.status}`);
                }
            } catch (e) {
                lastErr = e;
            }
            await new Promise(r => setTimeout(r, 350 * (i + 1)));
        }
        throw lastErr || new Error('无法读取底图');
    }

    async function downloadComfyImageAsFile(viewUrl, filenameBase = `comfyui_${Date.now()}`) {
        // 通过 fetch->Blob->ObjectURL 强制触发下载，避免浏览器因 CORS/Content-Disposition 导致“打开新窗口/新标签”。
        const blob = await fetchComfyImageBlob(viewUrl, 3);
        const objectUrl = URL.createObjectURL(blob);
        try {
            const mime = blob.type || '';
            const ext = mime.includes('png') ? 'png' : (mime.includes('jpeg') ? 'jpg' : (mime.includes('webp') ? 'webp' : 'png'));
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = `${filenameBase}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
        }
    }

    async function blobFromImageElement(viewUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    c.toBlob(blob => {
                        if (blob) resolve(blob);
                        else reject(new Error('canvas 导出失败'));
                    }, 'image/png');
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('底图图片元素加载失败'));
            img.src = viewUrl;
        });
    }

    function isComfyOutputBaseName(name) {
        // ComfyUI SaveImage 输出: CW_Base_00007_.png（非我们上传的 cw_base_<ts>.png）
        return /^CW_Base_\d+_/.test(name || '');
    }

    /** ComfyUI LoadImage 只认 input 目录；底图预览保存在 output，后处理前需重新上传 */
    async function uploadBaseImageForPost(baseResult) {
        const meta = baseResult?.meta || {};
        const viewUrl = baseResult?.url || comfyImageViewUrl(meta);
        const uploadName = `cw_base_${Date.now()}.png`;

        let blob;
        try {
            blob = await fetchComfyImageBlob(viewUrl);
        } catch (e1) {
            console.warn('[Post] fetch 底图失败，尝试 canvas 回退', e1);
            try {
                blob = await blobFromImageElement(viewUrl);
            } catch (e2) {
                const httpsPageHttpComfy = window.location.protocol === 'https:' && /^http:/i.test(getServer());
                const hint = httpsPageHttpComfy
                    ? '请 Ctrl+F5 强刷到最新版；若仍失败，请用本地打开页面或给 ComfyUI 配 HTTPS。'
                    : '请确认 ComfyUI 启动时加了 --enable-cors-header。';
                throw new Error(`底图上传到 input 失败。${hint}`);
            }
        }

        const uploaded = await uploadImage(new File([blob], uploadName, { type: 'image/png' }));
        const name = uploaded?.name || uploadName;
        if (isComfyOutputBaseName(name)) {
            throw new Error('底图上传异常（仍为 output 文件名），请强刷页面后重试');
        }
        console.log('[Post] 底图已上传到 input:', name);
        return name;
    }

    async function uploadImageFromUrl(imageUrl, filename) {
        const blob = await fetchComfyImageBlob(imageUrl, 3);
        const file = new File([blob], filename || `ref_${Date.now()}.png`, { type: blob.type || 'image/png' });
        return uploadImage(file);
    }

    const ANIMA_DEFAULTS = {
        positive: 'masterpiece, best quality, score_7, safe',
        negative: 'worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, bad hands, bad arm, bad knees, missing fingers, extra fingers, anatomical nonsense, bad perspective',
        width: 832,
        height: 1216,
        steps: 30,
        cfg: 4,
        sampler: 'euler',
        // 2.9B 作者推荐 sgm_uniform；原版 Anima 也可用 simple
        scheduler: 'sgm_uniform',
        clipSkip: '1',
    };

    const SDXL_DEFAULTS = {
        positive: '',
        negative: '',
        width: 1024,
        height: 1536,
        steps: 30,
        cfg: 6,
        sampler: 'euler',
        scheduler: 'normal',
        clipSkip: '2',
    };

    const _archState = { sdxl: null, anima: null };
    const _archModules = { sdxl: null, anima: null };

    /** SDXL 专用：Anima 下 UI 隐藏，且不得进入 buildWorkflow */
    const SDXL_ONLY_CHECKBOX_IDS = [
        'chk-speedup', 'chk-vae', 'chk-freeu', 'chk-controlnet', 'chk-ipadapter',
    ];

    /** FaceDetailer 的 bbox_detector 必须用检测模型，不能用 segm 分割模型 */
    const ADETAILER_DEFAULT_MODEL = 'bbox/face_yolov8m.pt';

    const ARCH_MODULE_CHECKBOX_IDS = [
        'chk-speedup', 'chk-vae', 'chk-lora', 'chk-hires', 'chk-freeu',
        'chk-controlnet', 'chk-img2img', 'chk-regional', 'chk-post-preview', 'chk-adetailer', 'chk-ipadapter',
    ];
    const ARCH_MODULE_SELECT_IDS = [
        'sel-checkpoint', 'sel-unet', 'sel-clip', 'sel-anima-vae',
        'sel-vae', 'sel-upscale-method', 'sel-controlnet', 'sel-adetailer-model',
        'sel-ipadapter-model', 'sel-ipa-weight-type',
    ];
    const ARCH_MODULE_INPUT_IDS = [
        'inp-hires-scale', 'inp-hires-steps', 'inp-hires-denoise',
        'inp-cn-strength', 'inp-cn-start', 'inp-cn-end',
        'inp-denoise', 'inp-ipa-weight', 'inp-ipa-start', 'inp-ipa-end',
        'inp-adetailer-steps', 'inp-adetailer-denoise', 'inp-adetailer-threshold',
        'inp-adetailer-dilation', 'inp-adetailer-feather', 'inp-adetailer-cycle',
        'inp-freeu-b1', 'inp-freeu-b2', 'inp-freeu-s1', 'inp-freeu-s2',
    ];

    function isAnimaMode() {
        return dom.selArch.value === 'anima';
    }

    function stripSdxlOnlyCheckboxes(checkboxes) {
        if (!checkboxes) return;
        SDXL_ONLY_CHECKBOX_IDS.forEach(id => { checkboxes[id] = false; });
    }

    function resolveAdetailerModelName(raw) {
        const val = String(raw || '').trim();
        if (!val) return ADETAILER_DEFAULT_MODEL;
        // 分割模型不能作为 FaceDetailer 的 bbox 检测器
        if (val.startsWith('segm/')) return ADETAILER_DEFAULT_MODEL;
        return val;
    }

    function ensureAdetailerDefaultModel() {
        if (!dom.selAdetailerModel) return;
        const fixed = resolveAdetailerModelName(dom.selAdetailerModel.value);
        if (dom.selAdetailerModel.value !== fixed) {
            setSelectIfExists(dom.selAdetailerModel, fixed);
        }
    }

    function syncArchIsolation(opts = {}) {
        if (!isAnimaMode()) return;

        let changed = false;
        SDXL_ONLY_CHECKBOX_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el?.checked) {
                el.checked = false;
                changed = true;
            }
        });
        syncControlnetSpeedupGuard({ silent: true });
        if (changed && !opts.silent) {
            showToast('Anima 模式已自动关闭 SDXL 专用模块（ControlNet / FreeU / IP-Adapter 等）');
        }
    }

    function captureArchState() {
        return {
            positive: dom.txtPositive.value,
            negative: dom.txtNegative.value,
            sampler: dom.selSampler.value,
            scheduler: dom.selScheduler.value,
            steps: dom.inpSteps.value,
            cfg: dom.inpCfg.value,
            width: dom.inpWidth.value,
            height: dom.inpHeight.value,
            clipSkip: document.getElementById('inp-clip-skip')?.value ?? '2',
        };
    }

    function setSelectIfExists(sel, value) {
        if (!value || !sel) return;
        if ([...sel.options].some(o => o.value === value)) sel.value = value;
    }

    function applyArchState(state) {
        if (!state) return;
        if (state.positive !== undefined) {
            dom.txtPositive.value = state.positive;
            dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (state.negative !== undefined) {
            dom.txtNegative.value = state.negative;
            dom.txtNegative.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (state.steps !== undefined) dom.inpSteps.value = state.steps;
        if (state.cfg !== undefined) dom.inpCfg.value = state.cfg;
        if (state.width !== undefined) dom.inpWidth.value = state.width;
        if (state.height !== undefined) dom.inpHeight.value = state.height;
        const clipSkip = document.getElementById('inp-clip-skip');
        if (clipSkip && state.clipSkip !== undefined) clipSkip.value = state.clipSkip;
        setSelectIfExists(dom.selSampler, state.sampler);
        setSelectIfExists(dom.selScheduler, state.scheduler);
    }

    function swapCurrentSize() {
        if (!dom.inpWidth || !dom.inpHeight) return;
        const width = dom.inpWidth.value;
        const height = dom.inpHeight.value;
        dom.inpWidth.value = height;
        dom.inpHeight.value = width;
        dom.inpWidth.dispatchEvent(new Event('input', { bubbles: true }));
        dom.inpHeight.dispatchEvent(new Event('input', { bubbles: true }));
        const arch = dom.selArch?.value || 'sdxl';
        _archState[arch] = captureArchState();
        ProfileManager.scheduleAutosave();
    }

    function formatAnimaArtistTag(tag) {
        let name = tag.replace(/_/g, ' ');
        if (!name.startsWith('@')) name = '@' + name;
        return name;
    }

    function formatAnimaTag(tag) {
        return tag.replace(/_/g, ' ');
    }

    function setupArchSwitch() {
        dom.selArch.addEventListener('change', () => {
            const newArch = dom.selArch.value;
            const prevArch = newArch === 'anima' ? 'sdxl' : 'anima';
            _archState[prevArch] = captureArchState();
            _archModules[prevArch] = captureArchModules();

            const isAnima = newArch === 'anima';
            dom.panelSdxlModel.classList.toggle('hidden', isAnima);
            dom.panelAnimaModel.classList.toggle('hidden', !isAnima);

            const defaults = isAnima ? ANIMA_DEFAULTS : SDXL_DEFAULTS;
            applyArchState(_archState[newArch] || defaults);
            applyArchModules(_archModules[newArch]);

            updateArchAwarePanels();
            if (!dom.modalInpaint?.classList.contains('hidden')) {
                updateInpaintModelNote();
                updateInpaintEngineUI();
            }
            ProfileManager.scheduleAutosave();
        });

        dom.btnSwapSize?.addEventListener('click', swapCurrentSize);
    }

    function createEmptyArchModules() {
        const checkboxes = {};
        ARCH_MODULE_CHECKBOX_IDS.forEach(id => {
            const el = document.getElementById(id);
            checkboxes[id] = el?.type === 'checkbox' ? el.defaultChecked : false;
        });
        const inputs = {};
        ARCH_MODULE_INPUT_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) inputs[id] = el.value;
        });
        return { loras: [], regions: [], checkboxes, selects: { 'sel-adetailer-model': ADETAILER_DEFAULT_MODEL }, inputs };
    }

    function captureArchModules() {
        return {
            loras: getLoraSelections(),
            regions: Array.from(dom.regionalList.querySelectorAll('.region-row')).map(row => ({
                x: parseFloat(row.querySelector('.region-x')?.value || 0),
                y: parseFloat(row.querySelector('.region-y')?.value || 0),
                w: parseFloat(row.querySelector('.region-w')?.value || 50),
                h: parseFloat(row.querySelector('.region-h')?.value || 50),
                prompt: row.querySelector('.region-prompt')?.value || '',
            })),
            checkboxes: _profileReadMap(ARCH_MODULE_CHECKBOX_IDS),
            selects: _profileReadMap(ARCH_MODULE_SELECT_IDS),
            inputs: _profileReadMap(ARCH_MODULE_INPUT_IDS),
        };
    }

    function applyArchModules(modules) {
        const data = modules || createEmptyArchModules();
        if (isAnimaMode()) stripSdxlOnlyCheckboxes(data.checkboxes);
        _profileWriteMap(data.checkboxes);
        _profileWriteMap(data.selects);
        _profileWriteMap(data.inputs);
        if (!data.selects?.['sel-adetailer-model']) {
            setSelectIfExists(dom.selAdetailerModel, ADETAILER_DEFAULT_MODEL);
        }
        ensureAdetailerDefaultModel();
        clearLoraRows(false);
        (data.loras || []).forEach(l => {
            addLoraRow(l.name, l.strength, undefined, false);
        });
        dom.regionalList.innerHTML = '';
        regionCount = 0;
        (data.regions || []).forEach(r => {
            addRegionRow(r.x, r.y, r.w, r.h);
            const row = dom.regionalList.lastElementChild;
            const prompt = row?.querySelector('.region-prompt');
            if (prompt) prompt.value = r.prompt || '';
        });
        drawRegionCanvas();
        syncArchIsolation({ silent: true });
        _profileRefreshTogglePanels();
    }

    function migrateSnapshotToV2(data) {
        if (!data || (data.v >= 2 && data.archModules)) return data;
        const arch = data.arch || data.selects?.['sel-arch'] || 'sdxl';
        const other = arch === 'anima' ? 'sdxl' : 'anima';
        const modules = createEmptyArchModules();
        ARCH_MODULE_CHECKBOX_IDS.forEach(id => {
            if (data.checkboxes?.[id] !== undefined) modules.checkboxes[id] = data.checkboxes[id];
        });
        ARCH_MODULE_SELECT_IDS.forEach(id => {
            if (data.selects?.[id] !== undefined) modules.selects[id] = data.selects[id];
        });
        ARCH_MODULE_INPUT_IDS.forEach(id => {
            if (data.inputs?.[id] !== undefined) modules.inputs[id] = data.inputs[id];
        });
        modules.loras = data.loras || [];
        modules.regions = data.regions || [];
        const otherModules = createEmptyArchModules();
        if (other === 'anima') stripSdxlOnlyCheckboxes(otherModules.checkboxes);
        data.archModules = {
            [arch]: modules,
            [other]: otherModules,
        };
        if (arch === 'anima') stripSdxlOnlyCheckboxes(data.archModules.anima.checkboxes);
        data.v = 2;
        return data;
    }

    // ==================== 配置方案（本地持久化） ====================
    const PROFILE_STORE_KEY = 'comfyui_profiles_v1';
    const PROFILE_AUTOSAVE_MS = 600;
    let _profileApplying = false;
    let _profileAutosaveTimer = null;

    const PROFILE_INPUT_IDS = [
        'inp-nai-apikey', 'inp-nai-seed', 'inp-nai-strength', 'inp-nai-noise',
        'inp-nai-videocode', 'inp-nai-video-seed',
    ];
    const PROFILE_SELECT_IDS = [
        'sel-arch', 'sel-workflow', 'sel-translate-provider',
        'sel-nai-model', 'sel-nai-sampler', 'sel-nai-noise-schedule', 'sel-nai-fps', 'sel-nai-uc-preset',
    ];
    const PROFILE_CHECKBOX_IDS = [
        'chk-nai-upscale', 'chk-nai-smea', 'chk-nai-dyn', 'chk-nai-variety', 'chk-nai-decrisp',
        'chk-nai-use-coords', 'chk-nai-legacy', 'chk-nai-legacy-uc', 'chk-nai-legacy-v3',
        'chk-nai-auto-smea', 'chk-nai-brownian', 'chk-nai-euler-bug',
    ];
    const PROFILE_RANGE_IDS = [
        'rng-nai-steps', 'rng-nai-cfg', 'rng-nai-rescale',
        'rng-nai-duration', 'rng-nai-video-steps', 'rng-nai-video-guidance',
    ];

    function _profileEl(id) {
        return document.getElementById(id);
    }

    function _profileReadEl(el) {
        if (!el) return undefined;
        if (el.type === 'checkbox') return el.checked;
        return el.value;
    }

    function _profileWriteEl(el, val) {
        if (!el || val === undefined) return;
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val;
    }

    function _profileReadMap(ids) {
        const out = {};
        ids.forEach(id => {
            const el = _profileEl(id);
            if (el) out[id] = _profileReadEl(el);
        });
        return out;
    }

    function _profileWriteMap(map) {
        if (!map) return;
        Object.entries(map).forEach(([id, val]) => _profileWriteEl(_profileEl(id), val));
    }

    function _profileCaptureNaiCharacters() {
        return Array.from(document.querySelectorAll('#nai-character-list .nai-character-item')).map(item => ({
            prompt: item.querySelector('.nai-char-prompt')?.value || '',
            uc: item.querySelector('.nai-char-uc')?.value || '',
            x: item.querySelector('.nai-char-x')?.value ?? '0.5',
            y: item.querySelector('.nai-char-y')?.value ?? '0.5',
        }));
    }

    function _profileApplyNaiCharacters(chars) {
        const list = document.getElementById('nai-character-list');
        if (!list) return;
        list.innerHTML = '';
        (chars || []).forEach((c, i) => {
            const item = document.createElement('div');
            item.className = 'nai-character-item';
            item.innerHTML = `<h3>角色 ${i + 1} <button class="btn-icon btn-sm nai-remove-char" title="删除">🗑️</button></h3>
                <textarea placeholder="角色正向提示词..." class="nai-char-prompt" rows="2"></textarea>
                <textarea placeholder="角色反向提示词..." class="nai-char-uc" rows="1" style="margin-top:4px"></textarea>
                <div class="compact-row" style="margin-top:4px">
                    <label>X <input type="number" class="nai-char-x" value="0.5" min="0" max="1" step="0.1"></label>
                    <label>Y <input type="number" class="nai-char-y" value="0.5" min="0" max="1" step="0.1"></label>
                </div>`;
            item.querySelector('.nai-char-prompt').value = c.prompt || '';
            item.querySelector('.nai-char-uc').value = c.uc || '';
            item.querySelector('.nai-char-x').value = c.x ?? '0.5';
            item.querySelector('.nai-char-y').value = c.y ?? '0.5';
            item.querySelector('.nai-remove-char').addEventListener('click', () => {
                item.remove();
                if (typeof updateNaiCharInfo === 'function') updateNaiCharInfo();
            });
            list.appendChild(item);
        });
        if (typeof updateNaiCharInfo === 'function') updateNaiCharInfo();
    }

    function _profileCaptureWfInputs() {
        const out = {};
        document.querySelectorAll('#wf-params .wf-input').forEach(el => {
            const nodeId = el.dataset.node;
            const key = el.dataset.key;
            if (!nodeId || !key) return;
            out[`${nodeId}:${key}`] = el.type === 'checkbox' ? el.checked : el.value;
        });
        return out;
    }

    function _profileApplyWfInputs(map) {
        if (!map) return;
        document.querySelectorAll('#wf-params .wf-input').forEach(el => {
            const nodeId = el.dataset.node;
            const key = el.dataset.key;
            if (!nodeId || !key) return;
            const val = map[`${nodeId}:${key}`];
            if (val === undefined) return;
            if (el.type === 'checkbox') el.checked = !!val;
            else el.value = val;
        });
    }

    function _profileGetActiveMode() {
        const tab = document.querySelector('.mode-tab.active');
        return tab?.dataset.mode || 'simple';
    }

    function _profileApplyActiveMode(mode) {
        const m = mode || 'simple';
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
        const modeSimple = document.getElementById('mode-simple');
        const modeWorkflow = document.getElementById('mode-workflow');
        const modeNai = document.getElementById('mode-nai');
        const btnGenerate = document.getElementById('btn-generate');
        const btnNaiGenerate = document.getElementById('btn-nai-generate');
        const btnDzmm = document.getElementById('btn-dzmm');
        if (modeSimple) modeSimple.classList.toggle('hidden', m !== 'simple');
        if (modeWorkflow) modeWorkflow.classList.toggle('hidden', m !== 'workflow');
        if (modeNai) modeNai.classList.toggle('hidden', m !== 'nai');
        if (btnGenerate) btnGenerate.classList.toggle('hidden', m === 'nai');
        if (btnNaiGenerate) btnNaiGenerate.classList.toggle('hidden', m !== 'nai');
        if (btnDzmm) btnDzmm.classList.toggle('hidden', m === 'nai');
    }

    function _profileRefreshTogglePanels() {
        [
            dom.chkVae, dom.chkLora, dom.chkHires, dom.chkControlnet, dom.chkImg2img,
            dom.chkAdetailer, dom.chkRegional, $('#chk-freeu'), dom.chkIpadapter,
        ].forEach(chk => chk?.dispatchEvent(new Event('change')));
        syncControlnetSpeedupGuard({ silent: true });
    }

    function _profileCaptureLoras() {
        return getLoraSelections();
    }

    function _profileApplyLoras(loras) {
        clearLoraRows(false);
        (loras || []).forEach(l => {
            addLoraRow(l.name, l.strength, undefined, false);
        });
    }

    function _profileCaptureRegions() {
        return Array.from(dom.regionalList.querySelectorAll('.region-row')).map(row => ({
            x: parseFloat(row.querySelector('.region-x')?.value || 0),
            y: parseFloat(row.querySelector('.region-y')?.value || 0),
            w: parseFloat(row.querySelector('.region-w')?.value || 50),
            h: parseFloat(row.querySelector('.region-h')?.value || 50),
            prompt: row.querySelector('.region-prompt')?.value || '',
        }));
    }

    function _profileApplyRegions(regions) {
        dom.regionalList.innerHTML = '';
        regionCount = 0;
        (regions || []).forEach(r => {
            addRegionRow(r.x, r.y, r.w, r.h);
            const row = dom.regionalList.lastElementChild;
            const prompt = row?.querySelector('.region-prompt');
            if (prompt) prompt.value = r.prompt || '';
        });
        drawRegionCanvas();
    }

    function captureProfileSnapshot() {
        const arch = dom.selArch.value;
        _archState[arch] = captureArchState();
        _archModules[arch] = captureArchModules();
        const activeSize = document.querySelector('.nai-size-btn.active');
        return {
            v: 2,
            activeMode: _profileGetActiveMode(),
            server: getComfyUIAddress(),
            theme: localStorage.getItem('comfyui_theme') || 'default',
            tagShowChinese: TagTranslator?.showChinese !== false,
            arch,
            archState: {
                sdxl: _archState.sdxl,
                anima: _archState.anima,
            },
            archModules: {
                sdxl: _archModules.sdxl,
                anima: _archModules.anima,
            },
            inputs: _profileReadMap(PROFILE_INPUT_IDS),
            selects: _profileReadMap(PROFILE_SELECT_IDS),
            checkboxes: _profileReadMap(PROFILE_CHECKBOX_IDS),
            ranges: _profileReadMap(PROFILE_RANGE_IDS),
            naiSize: activeSize ? { w: activeSize.dataset.w, h: activeSize.dataset.h } : null,
            naiCharacters: _profileCaptureNaiCharacters(),
            wfInputs: _profileCaptureWfInputs(),
        };
    }

    async function applyProfileSnapshot(data) {
        if (!data) return;
        _profileApplying = true;
        try {
            data = migrateSnapshotToV2({ ...data });

            if (data.server) {
                setComfyUIAddress(data.server);
                if (dom.inpServer) dom.inpServer.value = data.server;
            }
            if (data.theme) {
                applyTheme(data.theme);
                localStorage.setItem('comfyui_theme', data.theme);
            }
            if (data.tagShowChinese !== undefined && TagTranslator) {
                TagTranslator.showChinese = !!data.tagShowChinese;
                localStorage.setItem('tag_show_chinese', TagTranslator.showChinese);
                const toggleBtn = document.getElementById('btn-translate-toggle');
                if (toggleBtn) toggleBtn.classList.toggle('active', TagTranslator.showChinese);
            }
            if (data.archState) {
                _archState.sdxl = data.archState.sdxl || null;
                _archState.anima = data.archState.anima || null;
            }
            if (data.archModules) {
                _archModules.sdxl = data.archModules.sdxl || null;
                _archModules.anima = data.archModules.anima || null;
            }

            _profileWriteMap(data.inputs);
            _profileWriteMap(data.selects);
            _profileWriteMap(data.checkboxes);
            _profileWriteMap(data.ranges);

            PROFILE_RANGE_IDS.forEach(id => {
                const el = _profileEl(id);
                if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
            });

            const arch = data.arch || data.selects?.['sel-arch'] || dom.selArch.value;
            if (arch && arch !== dom.selArch.value) {
                dom.selArch.value = arch;
            }
            const isAnima = arch === 'anima';
            dom.panelSdxlModel.classList.toggle('hidden', isAnima);
            dom.panelAnimaModel.classList.toggle('hidden', !isAnima);
            applyArchState(_archState[arch] || (isAnima ? ANIMA_DEFAULTS : SDXL_DEFAULTS));
            applyArchModules(_archModules[arch]);
            updateArchAwarePanels();

            _profileApplyNaiCharacters(data.naiCharacters);

            if (data.naiSize?.w && data.naiSize?.h) {
                document.querySelectorAll('.nai-size-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.w === data.naiSize.w && btn.dataset.h === data.naiSize.h);
                });
            }

            const naiKey = data.inputs?.['inp-nai-apikey'];
            if (naiKey !== undefined) {
                localStorage.setItem(NAI_STORAGE_KEY, String(naiKey || '').trim());
            }

            if (data.selects?.['sel-translate-provider']) {
                TagTranslator.provider = data.selects['sel-translate-provider'];
                localStorage.setItem('tag_translate_provider', TagTranslator.provider);
            }

            const wfName = data.selects?.['sel-workflow'] || '';
            const wfSel = document.getElementById('sel-workflow');
            if (wfSel) {
                setSelectIfExists(wfSel, wfName);
                if (wfName) {
                    const workflows = loadWorkflows();
                    currentWorkflowData = workflows[wfName] || null;
                    await renderWorkflowParams(currentWorkflowData);
                    _profileApplyWfInputs(data.wfInputs);
                } else {
                    currentWorkflowData = null;
                    await renderWorkflowParams(null);
                }
            }

            _profileApplyActiveMode(data.activeMode);
        } finally {
            _profileApplying = false;
        }
    }

    const ProfileManager = {
        store: { activeId: 'default', profiles: {} },

        loadStore() {
            try {
                const raw = localStorage.getItem(PROFILE_STORE_KEY);
                if (raw) this.store = JSON.parse(raw);
            } catch { /* ignore */ }
            if (!this.store.profiles || !Object.keys(this.store.profiles).length) {
                this.store = {
                    activeId: 'default',
                    profiles: {
                        default: {
                            id: 'default',
                            name: '默认',
                            updatedAt: Date.now(),
                            data: null,
                        },
                    },
                };
            }
            if (!this.store.activeId || !this.store.profiles[this.store.activeId]) {
                this.store.activeId = Object.keys(this.store.profiles)[0];
            }
            return this.store;
        },

        saveStore() {
            localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(this.store));
        },

        getActiveProfile() {
            return this.store.profiles[this.store.activeId];
        },

        listProfiles() {
            return Object.values(this.store.profiles).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
        },

        refreshSelects() {
            const selects = [dom.selProfile, dom.selProfileQuick].filter(Boolean);
            const activeId = this.store.activeId;
            selects.forEach(sel => {
                sel.innerHTML = '';
                this.listProfiles().forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    sel.appendChild(opt);
                });
                sel.value = activeId;
            });
        },

        saveActiveFromUI(silent) {
            const profile = this.getActiveProfile();
            if (!profile) return;
            profile.data = captureProfileSnapshot();
            profile.updatedAt = Date.now();
            this.saveSessionFromUI(true);
            this.saveStore();
            if (!silent) showToast(`已保存到「${profile.name}」`);
        },

        saveSessionFromUI() {
            this.store.session = {
                activeId: this.store.activeId,
                data: captureProfileSnapshot(),
                updatedAt: Date.now(),
            };
            this.saveStore();
        },

        async switchTo(id, silent) {
            if (!id || !this.store.profiles[id]) return;
            this.store.activeId = id;
            this.saveStore();
            this.refreshSelects();
            const profile = this.store.profiles[id];
            if (profile?.data) {
                await applyProfileSnapshot(profile.data);
            }
            this.saveSessionFromUI();
            if (!silent) showToast(`已切换至「${profile.name}」`);
        },

        createProfile(name) {
            const trimmed = (name || '').trim();
            if (!trimmed) return null;
            const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
            this.store.profiles[id] = {
                id,
                name: trimmed,
                updatedAt: Date.now(),
                data: captureProfileSnapshot(),
            };
            this.store.activeId = id;
            this.saveSessionFromUI();
            this.saveStore();
            this.refreshSelects();
            return id;
        },

        renameActive(name) {
            const trimmed = (name || '').trim();
            const profile = this.getActiveProfile();
            if (!profile || !trimmed) return;
            profile.name = trimmed;
            profile.updatedAt = Date.now();
            this.saveStore();
            this.refreshSelects();
            showToast(`已重命名为「${trimmed}」`);
        },

        deleteActive() {
            const keys = Object.keys(this.store.profiles);
            if (keys.length <= 1) {
                showToast('至少保留一个配置方案');
                return;
            }
            const id = this.store.activeId;
            const name = this.store.profiles[id]?.name || '方案';
            delete this.store.profiles[id];
            this.store.activeId = Object.keys(this.store.profiles)[0];
            this.saveStore();
            this.refreshSelects();
            this.switchTo(this.store.activeId, true);
            showToast(`已删除「${name}」`);
        },

        scheduleAutosave() {
            if (_profileApplying) return;
            clearTimeout(_profileAutosaveTimer);
            _profileAutosaveTimer = setTimeout(() => this.saveSessionFromUI(), PROFILE_AUTOSAVE_MS);
        },

        async restoreActiveProfile() {
            this.loadStore();
            const session = this.store.session;
            if (session?.data) {
                if (session.activeId && this.store.profiles[session.activeId]) {
                    this.store.activeId = session.activeId;
                }
                await applyProfileSnapshot(session.data);
            } else {
                const profile = this.getActiveProfile();
                if (profile?.data) {
                    await applyProfileSnapshot(profile.data);
                }
                this.saveSessionFromUI();
            }
            this.refreshSelects();
        },

        setup() {
            this.loadStore();
            this.refreshSelects();

            const onSwitch = async (id) => {
                if (!id || id === this.store.activeId) return;
                await this.switchTo(id);
            };

            dom.selProfile?.addEventListener('change', (e) => onSwitch(e.target.value));
            dom.selProfileQuick?.addEventListener('change', (e) => {
                onSwitch(e.target.value);
                if (dom.selProfile) dom.selProfile.value = e.target.value;
            });

            dom.btnProfileSave?.addEventListener('click', () => this.saveActiveFromUI(false));
            dom.btnProfileSaveAs?.addEventListener('click', () => {
                const name = prompt('新配置方案名称', `方案 ${Object.keys(this.store.profiles).length + 1}`);
                if (!name) return;
                const id = this.createProfile(name);
                if (id) showToast(`已创建「${name}」`);
            });
            dom.btnProfileRename?.addEventListener('click', () => {
                const cur = this.getActiveProfile();
                const name = prompt('重命名配置方案', cur?.name || '');
                if (name) this.renameActive(name);
            });
            dom.btnProfileDelete?.addEventListener('click', () => {
                const cur = this.getActiveProfile();
                if (confirm(`确定删除配置方案「${cur?.name || ''}」？`)) this.deleteActive();
            });

            dom.selArch?.addEventListener('change', () => this.scheduleAutosave());

            const autosaveRoot = document.querySelector('.app');
            if (autosaveRoot) {
                autosaveRoot.addEventListener('input', (e) => {
                    if (_profileApplying) return;
                    const t = e.target;
                    if (!t || t.closest('#history-grid, #tag-picker, .char-browser-overlay, #modal-settings')) return;
                    if (t.matches('input, select, textarea')) this.scheduleAutosave();
                });
                autosaveRoot.addEventListener('change', (e) => {
                    if (_profileApplying) return;
                    const t = e.target;
                    if (!t || t.closest('#history-grid, #tag-picker, .char-browser-overlay')) return;
                    if (t.matches('input, select, textarea')) this.scheduleAutosave();
                });
            }

            document.querySelectorAll('.mode-tab').forEach(tab => {
                tab.addEventListener('click', () => this.scheduleAutosave());
            });
            document.getElementById('theme-panel')?.addEventListener('click', () => this.scheduleAutosave());
        },
    };

    async function loadAnimaModels() {
        try {
            const unetData = await apiGet('/object_info/UNETLoader');
            const unets = unetData.UNETLoader.input.required.unet_name[0];
            const prevUnet = dom.selUnet.value;
            dom.selUnet.innerHTML = '';
            unets.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selUnet.appendChild(o); });
            // 优先还原已选；否则若有 Anima-2.9B 则默认选它
            if (prevUnet && unets.includes(prevUnet)) {
                dom.selUnet.value = prevUnet;
            } else {
                const prefer29 = unets.find(m => /Anima-2\.9B/i.test(m));
                if (prefer29) dom.selUnet.value = prefer29;
            }
        } catch (e) { dom.selUnet.innerHTML = '<option>无可用模型</option>'; }

        try {
            const clipData = await apiGet('/object_info/CLIPLoader');
            const clips = clipData.CLIPLoader.input.required.clip_name[0];
            const prevClip = dom.selClip.value;
            dom.selClip.innerHTML = '';
            clips.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selClip.appendChild(o); });
            if (prevClip && clips.includes(prevClip)) {
                dom.selClip.value = prevClip;
            } else {
                const preferQwen = clips.find(m => /qwen_3_06b/i.test(m));
                if (preferQwen) dom.selClip.value = preferQwen;
            }
        } catch (e) { dom.selClip.innerHTML = '<option>无可用编码器</option>'; }

        try {
            const vaeData = await apiGet('/object_info/VAELoader');
            const vaes = vaeData.VAELoader.input.required.vae_name[0];
            const prevVae = dom.selAnimaVae.value;
            dom.selAnimaVae.innerHTML = '';
            vaes.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selAnimaVae.appendChild(o); });
            if (prevVae && vaes.includes(prevVae)) {
                dom.selAnimaVae.value = prevVae;
            } else {
                const preferQwenVae = vaes.find(m => /qwen_image_vae/i.test(m));
                if (preferQwenVae) dom.selAnimaVae.value = preferQwenVae;
            }
        } catch (e) { dom.selAnimaVae.innerHTML = '<option>无可用VAE</option>'; }
    }

    async function loadCheckpoints() {
        try {
            const data = await apiGet('/object_info/CheckpointLoaderSimple');
            const models = data.CheckpointLoaderSimple.input.required.ckpt_name[0];
            dom.selCheckpoint.innerHTML = '';
            models.forEach((m) => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                dom.selCheckpoint.appendChild(opt);
            });
            syncInpaintModelOptions();
            _inpaintPreferCheckpoint(dom.selInpaintCheckpoint);
            updateInpaintEngineUI();
        } catch (e) {
            dom.selCheckpoint.innerHTML = '<option>加载失败 - 检查连接</option>';
            console.error('加载模型列表失败:', e);
        }
    }

    async function loadSamplers() {
        try {
            const data = await apiGet('/object_info/KSampler');
            const info = data.KSampler.input.required;
            const samplers = info.sampler_name[0];
            const schedulers = info.scheduler[0];

            dom.selSampler.innerHTML = '';
            samplers.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                dom.selSampler.appendChild(opt);
            });

            dom.selScheduler.innerHTML = '';
            schedulers.forEach((s) => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                dom.selScheduler.appendChild(opt);
            });
            syncInpaintModelOptions();
        } catch (e) {
            console.error('加载采样器列表失败:', e);
        }
    }

    async function loadVAEs() {
        try {
            const data = await apiGet('/object_info/VAELoader');
            const vaes = data.VAELoader.input.required.vae_name[0];
            dom.selVae.innerHTML = '';
            vaes.forEach((v) => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                dom.selVae.appendChild(opt);
            });
            syncInpaintModelOptions();
        } catch (e) {
            dom.selVae.innerHTML = '<option>无可用 VAE</option>';
        }
    }

    async function loadLoRAs() {
        try {
            const data = await apiGet('/object_info/LoraLoader');
            loraOptions = data.LoraLoader.input.required.lora_name[0];
        } catch (e) {
            loraOptions = [];
        }
    }

    async function loadControlNets() {
        try {
            const data = await apiGet('/object_info/ControlNetLoader');
            const nets = data.ControlNetLoader.input.required.control_net_name[0];
            dom.selControlnet.innerHTML = '';
            nets.forEach((n) => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                dom.selControlnet.appendChild(opt);
            });
        } catch (e) {
            dom.selControlnet.innerHTML = '<option>无可用 ControlNet</option>';
        }
    }

    // ==================== IP-Adapter 模型管理 ====================
    let ipaPluginInstalled = false;
    let ipaModels = [];
    let ipaLoaderNode = '';
    let ipaApplyNode = '';
    let ipaWeightTypes = [];
    let ipaClipVisionModels = [];
    let hasComfyUIManager = false;

    async function loadIPAdapterModels() {
        const loaderNodes = ['IPAdapterModelLoader', 'IPAdapterUnifiedLoader', 'IPAdapterSimple', 'IPAdapter'];
        ipaPluginInstalled = false;
        ipaModels = [];
        ipaLoaderNode = '';
        ipaApplyNode = '';

        for (const nodeName of loaderNodes) {
            try {
                const data = await apiGet('/object_info/' + nodeName);
                if (!data[nodeName] || !data[nodeName].input) continue;
                ipaPluginInstalled = true;
                const nodeInfo = data[nodeName].input.required;
                const models = nodeInfo?.ipadapter_file?.[0] || nodeInfo?.model_name?.[0] || [];
                ipaModels = models;
                ipaLoaderNode = nodeName;
                console.log('[IPA] Loader node:', nodeName, 'models:', models.length);
                break;
            } catch (_) {}
        }

        if (ipaPluginInstalled) {
            const applyNodes = ['IPAdapterApply', 'IPAdapterSimple', 'IPAdapter', 'IPAdapterAdvanced',
                                'IPAdapterTiled', 'IPAdapterBatch', 'IPAdapterEmbeds'];
            for (const nodeName of applyNodes) {
                try {
                    const data = await apiGet('/object_info/' + nodeName);
                    if (data[nodeName] && data[nodeName].input) {
                        ipaApplyNode = nodeName;
                        const req = data[nodeName].input.required || {};
                        if (req.weight_type) ipaWeightTypes = req.weight_type[0] || [];
                        console.log('[IPA] Apply node:', nodeName, 'weight_types:', ipaWeightTypes);
                        break;
                    }
                } catch (_) {}
            }
            if (!ipaApplyNode) {
                console.warn('[IPA] No apply node found, trying unified loader as apply');
                if (ipaLoaderNode === 'IPAdapterUnifiedLoader') {
                    ipaApplyNode = 'IPAdapterUnifiedLoader';
                }
            }
        }

        try {
            const cvData = await apiGet('/object_info/CLIPVisionLoader');
            if (cvData.CLIPVisionLoader?.input?.required) {
                ipaClipVisionModels = cvData.CLIPVisionLoader.input.required.clip_name[0] || [];
                console.log('[IPA] CLIP Vision models:', ipaClipVisionModels.length);
            }
        } catch (_) {}

        updateIPAdapterUI();

        try {
            await apiGet('/api/extensions');
            hasComfyUIManager = true;
        } catch (e) {
            try {
                const info = await apiGet('/object_info');
                hasComfyUIManager = !!info['ManagerButton'] || !!info['CLIPTextEncodeAdvanced'];
            } catch (_) {
                hasComfyUIManager = false;
            }
        }
    }

    function updateIPAdapterUI() {
        if (!dom.selIpadapterModel) return;

        dom.selIpadapterModel.innerHTML = '';

        if (!ipaPluginInstalled) {
            dom.ipaStatus.classList.remove('hidden', 'ipa-ok');
            dom.ipaStatus.classList.add('ipa-warn');
            dom.ipaStatus.textContent = '⚠️ 未检测到 IP-Adapter 插件，请先安装 ComfyUI_IPAdapter_plus';
            dom.selIpadapterModel.innerHTML = '<option value="">需安装插件</option>';
            dom.ipaDownloadArea.classList.add('hidden');
            return;
        }

        if (ipaModels.length === 0) {
            dom.ipaStatus.classList.remove('hidden', 'ipa-ok');
            dom.ipaStatus.classList.add('ipa-warn');
            dom.ipaStatus.textContent = '⚠️ 已安装插件但未检测到 IPA 模型';
            dom.selIpadapterModel.innerHTML = '<option value="">无可用模型</option>';
            dom.ipaDownloadArea.classList.remove('hidden');
            const hint = dom.ipaDownloadArea.querySelector('.ipa-download-hint');
            if (hint) hint.textContent = '需要下载 IP-Adapter 模型和 CLIP Vision 模型';
            if (dom.btnIpaDownload) dom.btnIpaDownload.textContent = '📥 一键下载全部所需模型';
            return;
        }

        if (!ipaApplyNode) {
            dom.ipaStatus.classList.remove('hidden', 'ipa-ok');
            dom.ipaStatus.classList.add('ipa-warn');
            dom.ipaStatus.textContent = `⚠️ 检测到 ${ipaModels.length} 个模型但未找到兼容的应用节点 (Loader: ${ipaLoaderNode})`;
            dom.selIpadapterModel.innerHTML = '<option value="">节点不兼容</option>';
            dom.ipaDownloadArea.classList.add('hidden');
            return;
        }

        dom.ipaStatus.classList.remove('hidden', 'ipa-warn');
        dom.ipaStatus.classList.add('ipa-ok');
        let statusMsg = `✓ ${ipaModels.length} 个 IPA 模型`;
        if (ipaClipVisionModels.length > 0) {
            statusMsg += ` · ${ipaClipVisionModels.length} 个 CLIP Vision`;
        } else {
            dom.ipaStatus.classList.remove('ipa-ok');
            dom.ipaStatus.classList.add('ipa-warn');
            statusMsg += ' · ⚠️ 缺少 CLIP Vision 模型';
        }
        dom.ipaStatus.textContent = statusMsg;

        if (ipaClipVisionModels.length === 0) {
            dom.ipaDownloadArea.classList.remove('hidden');
            const hint = dom.ipaDownloadArea.querySelector('.ipa-download-hint');
            if (hint) hint.textContent = '⚠️ 缺少 CLIP Vision 模型（IP-Adapter 必需）';
            if (dom.btnIpaDownload) dom.btnIpaDownload.textContent = '📥 一键下载 CLIP Vision 模型';
            const manualHint = dom.ipaDownloadArea.querySelector('.ipa-manual-hint');
            if (manualHint) manualHint.innerHTML = '手动下载: <a href="https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors" target="_blank" rel="noopener">CLIP-ViT-H model.safetensors</a> → 放入 <code>models/clip_vision/</code>';
        } else {
            dom.ipaDownloadArea.classList.add('hidden');
        }

        ipaModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            dom.selIpadapterModel.appendChild(opt);
        });

        const wtSel = document.getElementById('sel-ipa-weight-type');
        if (wtSel && ipaWeightTypes.length > 0) {
            const wtLabels = {
                'standard': '标准 — 均衡混合参考图和提示词',
                'linear': '线性 — 均匀混合（通用）',
                'prompt is more important': '提示词优先 — 参考图影响较弱',
                'style transfer': '风格迁移 — 只提取风格，不复制内容',
                'composition': '构图迁移 — 保留参考图布局',
                'original': '原始算法 — 最初的混合方式',
                'ease in': '渐入 — 前期弱后期强',
                'ease out': '渐出 — 前期强后期弱',
                'ease in-out': '渐入渐出 — 中段最强',
                'reverse in-out': '反向渐入渐出',
                'weak input': '弱输入 — 参考图影响极弱',
                'weak output': '弱输出',
                'strong style transfer': '强风格迁移 — 更强的风格提取',
            };
            wtSel.innerHTML = '';
            ipaWeightTypes.forEach(wt => {
                const opt = document.createElement('option');
                opt.value = wt;
                opt.textContent = wtLabels[wt] || wt;
                wtSel.appendChild(opt);
            });
        }
    }

    function setupIPAdapter() {
        if (!dom.inpIpaImage) return;

        dom.inpIpaImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                dom.ipaPreview.src = url;
                dom.ipaPreviewContainer.classList.remove('hidden');
            } else {
                dom.ipaPreviewContainer.classList.add('hidden');
            }
        });

        if (dom.btnIpaDownload) {
            dom.btnIpaDownload.addEventListener('click', downloadIPAdapterModel);
        }
    }

    async function downloadIPAdapterModel() {
        const needsIPA = ipaModels.length === 0;
        const needsCLIP = ipaClipVisionModels.length === 0;
        const downloads = [];
        if (needsIPA) {
            downloads.push({
                url: 'https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors',
                filename: 'ip-adapter-plus_sdxl_vit-h.safetensors',
                save_path: 'ipadapter',
                size: '~850MB',
            });
        }
        if (needsCLIP) {
            downloads.push({
                url: 'https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors',
                filename: 'model.safetensors',
                save_path: 'clip_vision',
                size: '~2.5GB',
            });
        }
        if (downloads.length === 0) return;

        dom.btnIpaDownload.disabled = true;
        dom.ipaDownloadProgress.classList.remove('hidden');
        const totalLabel = downloads.map(d => `${d.filename} (${d.size})`).join(' + ');
        dom.ipaProgressText.textContent = `正在下载 ${totalLabel}...`;
        dom.ipaProgressBar.style.width = '10%';

        try {
            for (const dl of downloads) {
                const res = await fetch(`${getServer()}/api/install-model`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: dl.url, filename: dl.filename, save_path: dl.save_path }),
                });
                if (!res.ok) throw new Error(`Manager API failed for ${dl.filename}`);
            }

            dom.ipaProgressBar.style.width = '30%';
            dom.ipaProgressText.textContent = `下载中，请稍候（${totalLabel}）...`;

            let attempts = 0;
            const checkInterval = setInterval(async () => {
                attempts++;
                dom.ipaProgressBar.style.width = Math.min(90, 30 + attempts * 2) + '%';
                try {
                    await loadIPAdapterModels();
                    const ipaOk = !needsIPA || ipaModels.length > 0;
                    const clipOk = !needsCLIP || ipaClipVisionModels.length > 0;
                    if (ipaOk && clipOk) {
                        clearInterval(checkInterval);
                        dom.ipaProgressBar.style.width = '100%';
                        dom.ipaProgressText.textContent = '全部下载完成！';
                        setTimeout(() => {
                            dom.ipaDownloadProgress.classList.add('hidden');
                            dom.btnIpaDownload.disabled = false;
                        }, 2000);
                    }
                } catch (_) {}
                if (attempts > 180) {
                    clearInterval(checkInterval);
                    dom.ipaProgressText.textContent = '下载超时，请手动下载';
                    dom.btnIpaDownload.disabled = false;
                }
            }, 5000);
        } catch (e) {
            console.warn('下载失败:', e);
            dom.ipaProgressText.textContent = '自动下载失败，请手动下载';
            dom.btnIpaDownload.disabled = false;
            setTimeout(() => dom.ipaDownloadProgress.classList.add('hidden'), 3000);
        }
    }

    // ==================== 教程资源下载 ====================
    function triggerBrowserDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url.includes('?') ? url : `${url}?download=true`;
        a.download = filename;
        a.rel = 'noopener';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function tryInstallToComfyUI(url, filename, savePath) {
        try {
            const res = await fetch(`${getServer()}/api/install-model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, filename, save_path: savePath }),
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    function setupTutorialDownloads() {
        document.querySelectorAll('.btn-dl-resource').forEach(btn => {
            btn.addEventListener('click', async () => {
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                const savePath = btn.dataset.savePath || '';
                if (!url || !filename) return;

                const orig = btn.textContent;
                btn.disabled = true;
                btn.textContent = '…';

                try {
                    const installed = await tryInstallToComfyUI(url, filename, savePath);
                    if (installed) {
                        showToast(`已通过 Manager 安装: ${filename}`);
                    } else {
                        triggerBrowserDownload(url, filename);
                        showToast(savePath
                            ? `正在下载 ${filename} → 放入 models/${savePath}/`
                            : `正在下载 ${filename}`);
                    }
                } catch {
                    triggerBrowserDownload(url, filename);
                    showToast(`正在下载 ${filename}`);
                } finally {
                    btn.disabled = false;
                    btn.textContent = orig;
                }
            });
        });
    }

    // ==================== 架构感知面板管理 ====================
    function updateArchAwarePanels() {
        const isAnima = isAnimaMode();

        const sdxlOnlyEls = [
            document.querySelector('#section-ipadapter'),
            document.querySelector('#chk-freeu')?.closest('.optional-panel'),
            document.querySelector('#chk-controlnet')?.closest('.optional-panel'),
        ];

        sdxlOnlyEls.forEach(el => {
            if (!el) return;
            el.classList.toggle('arch-hidden', isAnima);
        });

        const speedupCheckbox = document.getElementById('chk-speedup');
        const speedupLabel = speedupCheckbox?.closest('label');
        if (speedupCheckbox && speedupLabel) {
            speedupLabel.classList.toggle('arch-hidden', isAnima);
        }
        syncArchIsolation({ silent: true });
        _inpaintUpdateArchPanels();
    }

    // ==================== 动态工作流构建 ====================
    function buildWorkflow(uploadedImages, opts = {}) {
        const stage = opts.stage || 'full'; // 'full' | 'base' | 'post'
        const baseImageName = opts.baseImageName || null;
        const seed = parseInt(dom.inpSeed.value);
        let actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 32) : seed;
        if (opts.seedOverride !== undefined && opts.seedOverride !== null) {
            actualSeed = opts.seedOverride;
        }
        const nodes = {};
        let nextId = 10;
        const id = () => String(nextId++);

        const isAnima = isAnimaMode();
        const useVae = dom.chkVae.checked && !isAnima;
        const useLora = dom.chkLora.checked;
        const useHires = dom.chkHires.checked && stage !== 'base';
        const useControlnet = dom.chkControlnet.checked && uploadedImages.controlnet && !isAnima;
        const useImg2img = dom.chkImg2img.checked && (uploadedImages.img2img || refImageUrl) && stage !== 'post';
        const useAdetailer = dom.chkAdetailer.checked && stage !== 'base';
        const useRegional = dom.chkRegional.checked;
        const useIpadapter = dom.chkIpadapter?.checked && uploadedImages.ipadapter && !isAnima;

        let modelOut, clipOut, vaeOut;

        if (isAnima) {
            const unetId = id();
            nodes[unetId] = {
                class_type: "UNETLoader",
                inputs: { unet_name: dom.selUnet.value, weight_dtype: "default" },
            };
            modelOut = [unetId, 0];

            const clipId = id();
            nodes[clipId] = {
                class_type: "CLIPLoader",
                inputs: { clip_name: dom.selClip.value, type: "qwen_image" },
            };
            clipOut = [clipId, 0];

            const vaeId = id();
            nodes[vaeId] = {
                class_type: "VAELoader",
                inputs: { vae_name: dom.selAnimaVae.value },
            };
            vaeOut = [vaeId, 0];
        } else {
            const ckptId = id();
            nodes[ckptId] = {
                class_type: "CheckpointLoaderSimple",
                inputs: { ckpt_name: dom.selCheckpoint.value },
            };
            modelOut = [ckptId, 0];
            clipOut = [ckptId, 1];
            vaeOut = [ckptId, 2];
        }

        // VAE (optional)
        if (useVae) {
            const vaeId = id();
            nodes[vaeId] = {
                class_type: "VAELoader",
                inputs: { vae_name: dom.selVae.value },
            };
            vaeOut = [vaeId, 0];
        }

        // LoRA (optional, supports multiple)
        if (useLora) {
            const loras = getLoraSelections();
            for (const lora of loras) {
                const loraId = id();
                nodes[loraId] = {
                    class_type: "LoraLoader",
                    inputs: {
                        lora_name: lora.name,
                        strength_model: lora.strength,
                        strength_clip: lora.strength,
                        model: modelOut,
                        clip: clipOut,
                    },
                };
                modelOut = [loraId, 0];
                clipOut = [loraId, 1];
            }
        }

        // IP-Adapter (optional) - style/character transfer from reference image
        if (useIpadapter && ipaApplyNode && ipaLoaderNode) {
            const ipaLoadId = id();
            nodes[ipaLoadId] = {
                class_type: ipaLoaderNode,
                inputs: { ipadapter_file: dom.selIpadapterModel.value },
            };

            const clipVisionId = id();
            const cvModel = ipaClipVisionModels.length > 0 ? ipaClipVisionModels[0] : 'sd1.5/model.safetensors';
            nodes[clipVisionId] = {
                class_type: "CLIPVisionLoader",
                inputs: { clip_name: cvModel },
            };

            const ipaImgId = id();
            nodes[ipaImgId] = {
                class_type: "LoadImage",
                inputs: { image: uploadedImages.ipadapter },
            };

            const ipaApplyId = id();
            const weightType = document.getElementById('sel-ipa-weight-type')?.value || 'linear';
            const applyInputs = {
                model: modelOut,
                ipadapter: [ipaLoadId, 0],
                image: [ipaImgId, 0],
                weight: parseFloat(dom.inpIpaWeight.value),
                start_at: parseFloat(dom.inpIpaStart.value),
                end_at: parseFloat(dom.inpIpaEnd.value),
            };
            if (ipaApplyNode !== 'IPAdapterSimple') {
                applyInputs.weight_type = weightType;
                applyInputs.clip_vision = [clipVisionId, 0];
            }
            nodes[ipaApplyId] = {
                class_type: ipaApplyNode,
                inputs: applyInputs,
            };
            modelOut = [ipaApplyId, 0];
        }

        // Clip Skip
        const clipSkip = parseInt(document.getElementById('inp-clip-skip')?.value || '1');
        if (clipSkip > 1) {
            const csId = id();
            nodes[csId] = {
                class_type: "CLIPSetLastLayer",
                inputs: { clip: clipOut, stop_at_clip_layer: -clipSkip },
            };
            clipOut = [csId, 0];
        }

        // CLIP Text Encode - Positive (with wildcard resolution)
        const resolvedPositive = resolveWildcards(dom.txtPositive.value || '');
        const posId = id();
        nodes[posId] = {
            class_type: "CLIPTextEncode",
            inputs: { text: resolvedPositive, clip: clipOut },
        };

        // CLIP Text Encode - Negative
        const resolvedNegative = resolveWildcards(dom.txtNegative.value || '');
        const negId = id();
        nodes[negId] = {
            class_type: "CLIPTextEncode",
            inputs: { text: resolvedNegative, clip: clipOut },
        };

        let positiveOut = [posId, 0];
        let negativeOut = [negId, 0];

        // ControlNet (optional) - with auto-preprocessing
        if (useControlnet) {
            const cnLoadId = id();
            nodes[cnLoadId] = {
                class_type: "ControlNetLoader",
                inputs: { control_net_name: dom.selControlnet.value },
            };

            const cnImgId = id();
            nodes[cnImgId] = {
                class_type: "LoadImage",
                inputs: { image: uploadedImages.controlnet },
            };

            // Auto-detect preprocessor based on model name
            const cnName = dom.selControlnet.value.toLowerCase();
            let preprocessedImage = [cnImgId, 0];

            if (cnName.includes('canny')) {
                const prepId = id();
                nodes[prepId] = {
                    class_type: "CannyEdgePreprocessor",
                    inputs: { image: [cnImgId, 0] },
                };
                preprocessedImage = [prepId, 0];
            } else if (cnName.includes('openpose')) {
                const prepId = id();
                nodes[prepId] = {
                    class_type: "OpenposePreprocessor",
                    inputs: { image: [cnImgId, 0] },
                };
                preprocessedImage = [prepId, 0];
            } else if (cnName.includes('depth')) {
                const prepId = id();
                nodes[prepId] = {
                    class_type: "DepthAnythingV2Preprocessor",
                    inputs: { image: [cnImgId, 0] },
                };
                preprocessedImage = [prepId, 0];
            } else if (cnName.includes('scribble') || cnName.includes('lineart')) {
                const prepId = id();
                nodes[prepId] = {
                    class_type: "LineArtPreprocessor",
                    inputs: { image: [cnImgId, 0] },
                };
                preprocessedImage = [prepId, 0];
            }

            // Save preprocessed image for preview
            if (preprocessedImage !== [cnImgId, 0]) {
                const previewSaveId = id();
                nodes[previewSaveId] = {
                    class_type: "SaveImage",
                    inputs: { filename_prefix: getSaveImagePrefix("CN_Preview"), images: preprocessedImage },
                };
            }

            const cnApplyId = id();
            nodes[cnApplyId] = {
                class_type: "ControlNetApplyAdvanced",
                inputs: {
                    positive: positiveOut,
                    negative: negativeOut,
                    control_net: [cnLoadId, 0],
                    image: preprocessedImage,
                    strength: parseFloat(dom.inpCnStrength.value),
                    start_percent: parseFloat(dom.inpCnStart.value),
                    end_percent: parseFloat(dom.inpCnEnd.value),
                },
            };
            positiveOut = [cnApplyId, 0];
            negativeOut = [cnApplyId, 1];
        }

        // Regional Prompt (optional)
        if (useRegional) {
            const regions = getRegions();
            if (regions.length > 0) {
                const width = parseInt(dom.inpWidth.value);
                const height = parseInt(dom.inpHeight.value);

                for (const region of regions) {
                    if (!region.prompt) continue;
                    const regionEncId = id();
                    nodes[regionEncId] = {
                        class_type: "CLIPTextEncode",
                        inputs: { text: region.prompt, clip: clipOut },
                    };
                    const condAreaId = id();
                    nodes[condAreaId] = {
                        class_type: "ConditioningSetArea",
                        inputs: {
                            conditioning: [regionEncId, 0],
                            x: Math.round(region.x * width),
                            y: Math.round(region.y * height),
                            width: Math.round(region.w * width),
                            height: Math.round(region.h * height),
                            strength: region.strength,
                        },
                    };
                    const combineId = id();
                    nodes[combineId] = {
                        class_type: "ConditioningCombine",
                        inputs: {
                            conditioning_1: positiveOut,
                            conditioning_2: [condAreaId, 0],
                        },
                    };
                    positiveOut = [combineId, 0];
                }
            }
        }

        // FreeU (quality enhancement, SDXL only)
        const useFreeu = document.getElementById('chk-freeu')?.checked && !isAnima;
        if (useFreeu) {
            const freeuId = id();
            nodes[freeuId] = {
                class_type: "FreeU_V2",
                inputs: {
                    model: modelOut,
                    b1: parseFloat(document.getElementById('inp-freeu-b1')?.value || 1.3),
                    b2: parseFloat(document.getElementById('inp-freeu-b2')?.value || 1.4),
                    s1: parseFloat(document.getElementById('inp-freeu-s1')?.value || 0.9),
                    s2: parseFloat(document.getElementById('inp-freeu-s2')?.value || 0.2),
                },
            };
            modelOut = [freeuId, 0];
        }

        // PatchModelAddDownscale (speed boost, SDXL only) — 与 ControlNet 不兼容
        const useSpeedup = document.getElementById('chk-speedup')?.checked && !dom.chkControlnet.checked && !isAnima;
        if (useSpeedup) {
            const downscaleId = id();
            nodes[downscaleId] = {
                class_type: "PatchModelAddDownscale",
                inputs: {
                    model: modelOut,
                    block_number: 3,
                    downscale_factor: 2.0,
                    start_percent: 0.0,
                    end_percent: 0.35,
                    downscale_after_skip: true,
                    downscale_method: "bicubic",
                    upscale_method: "bicubic",
                },
            };
            modelOut = [downscaleId, 0];
        }

        let finalImage;

        if (stage === 'post' && baseImageName) {
            const baseLoadId = id();
            nodes[baseLoadId] = {
                class_type: "LoadImage",
                inputs: { image: baseImageName },
            };

            if (useHires) {
                const vaeEncId = id();
                nodes[vaeEncId] = {
                    class_type: "VAEEncode",
                    inputs: { pixels: [baseLoadId, 0], vae: vaeOut },
                };

                const scale = parseFloat(dom.inpHiresScale.value);
                const upscaleId = id();
                nodes[upscaleId] = {
                    class_type: "LatentUpscale",
                    inputs: {
                        samples: [vaeEncId, 0],
                        upscale_method: dom.selUpscaleMethod.value,
                        width: Math.round(parseInt(dom.inpWidth.value) * scale),
                        height: Math.round(parseInt(dom.inpHeight.value) * scale),
                        crop: "disabled",
                    },
                };

                const hiresSamplerId = id();
                nodes[hiresSamplerId] = {
                    class_type: "KSampler",
                    inputs: {
                        seed: actualSeed,
                        steps: parseInt(dom.inpHiresSteps.value),
                        cfg: parseFloat(dom.inpCfg.value),
                        sampler_name: dom.selSampler.value,
                        scheduler: dom.selScheduler.value,
                        denoise: parseFloat(dom.inpHiresDenoise.value),
                        model: modelOut,
                        positive: positiveOut,
                        negative: negativeOut,
                        latent_image: [upscaleId, 0],
                    },
                };

                const decodeId = id();
                nodes[decodeId] = {
                    class_type: "VAEDecode",
                    inputs: { samples: [hiresSamplerId, 0], vae: vaeOut },
                };
                finalImage = [decodeId, 0];
            } else {
                finalImage = [baseLoadId, 0];
            }
        } else {
            // Latent Image source
            let latentOut;
            let denoise = 1;

            if (useImg2img) {
                const imgLoadId = id();
                nodes[imgLoadId] = {
                    class_type: "LoadImage",
                    inputs: { image: uploadedImages.img2img },
                };
                const vaeEncId = id();
                nodes[vaeEncId] = {
                    class_type: "VAEEncode",
                    inputs: { pixels: [imgLoadId, 0], vae: vaeOut },
                };
                latentOut = [vaeEncId, 0];
                denoise = parseFloat(dom.inpDenoise.value);
            } else {
                const emptyId = id();
                nodes[emptyId] = {
                    class_type: "EmptyLatentImage",
                    inputs: {
                        width: parseInt(dom.inpWidth.value),
                        height: parseInt(dom.inpHeight.value),
                        batch_size: 1,
                    },
                };
                latentOut = [emptyId, 0];
            }

            // KSampler
            const samplerId = id();
            nodes[samplerId] = {
                class_type: "KSampler",
                inputs: {
                    seed: actualSeed,
                    steps: parseInt(dom.inpSteps.value),
                    cfg: parseFloat(dom.inpCfg.value),
                    sampler_name: dom.selSampler.value,
                    scheduler: dom.selScheduler.value,
                    denoise: denoise,
                    model: modelOut,
                    positive: positiveOut,
                    negative: negativeOut,
                    latent_image: latentOut,
                },
            };

            let finalLatent = [samplerId, 0];

            // Hires Fix (optional)
            if (useHires) {
                const scale = parseFloat(dom.inpHiresScale.value);
                const upscaleId = id();
                nodes[upscaleId] = {
                    class_type: "LatentUpscale",
                    inputs: {
                        samples: finalLatent,
                        upscale_method: dom.selUpscaleMethod.value,
                        width: Math.round(parseInt(dom.inpWidth.value) * scale),
                        height: Math.round(parseInt(dom.inpHeight.value) * scale),
                        crop: "disabled",
                    },
                };

                const hiresSamplerId = id();
                nodes[hiresSamplerId] = {
                    class_type: "KSampler",
                    inputs: {
                        seed: actualSeed,
                        steps: parseInt(dom.inpHiresSteps.value),
                        cfg: parseFloat(dom.inpCfg.value),
                        sampler_name: dom.selSampler.value,
                        scheduler: dom.selScheduler.value,
                        denoise: parseFloat(dom.inpHiresDenoise.value),
                        model: modelOut,
                        positive: positiveOut,
                        negative: negativeOut,
                        latent_image: [upscaleId, 0],
                    },
                };
                finalLatent = [hiresSamplerId, 0];
            }

            // VAE Decode
            const decodeId = id();
            nodes[decodeId] = {
                class_type: "VAEDecode",
                inputs: { samples: finalLatent, vae: vaeOut },
            };

            finalImage = [decodeId, 0];
        }

        // Save intermediate "before" image for comparison (only if hires or adetailer is on)
        if (useHires || useAdetailer) {
            const beforeSaveId = id();
            nodes[beforeSaveId] = {
                class_type: "SaveImage",
                inputs: { filename_prefix: getSaveImagePrefix("CW_Before"), images: finalImage },
            };
        }

        // ADetailer - face/hand detection + redraw
        if (useAdetailer) {
            const detectorId = id();
            nodes[detectorId] = {
                class_type: "UltralyticsDetectorProvider",
                inputs: { model_name: resolveAdetailerModelName(dom.selAdetailerModel?.value) },
            };

            const detailerId = id();
            nodes[detailerId] = {
                class_type: "FaceDetailer",
                inputs: {
                    image: finalImage,
                    model: modelOut,
                    clip: clipOut,
                    vae: vaeOut,
                    positive: positiveOut,
                    negative: negativeOut,
                    bbox_detector: [detectorId, 0],
                    seed: actualSeed,
                    steps: parseInt(document.getElementById('inp-adetailer-steps')?.value || 16),
                    cfg: parseFloat(dom.inpCfg.value),
                    sampler_name: dom.selSampler.value,
                    scheduler: dom.selScheduler.value,
                    denoise: parseFloat(dom.inpAdetailerDenoise.value),
                    guide_size: 384,
                    guide_size_for: true,
                    max_size: 1024,
                    feather: parseInt(document.getElementById('inp-adetailer-feather')?.value || 16),
                    noise_mask: true,
                    force_inpaint: true,
                    bbox_threshold: parseFloat(dom.inpAdetailerThreshold.value),
                    bbox_dilation: parseInt(dom.inpAdetailerDilation.value),
                    bbox_crop_factor: 3,
                    sam_detection_hint: "none",
                    sam_dilation: 4,
                    sam_threshold: 0.90,
                    sam_bbox_expansion: 0,
                    sam_mask_hint_threshold: 0.70,
                    sam_mask_hint_use_negative: "False",
                    drop_size: 16,
                    wildcard: "",
                    cycle: parseInt(document.getElementById('inp-adetailer-cycle')?.value || 1),
                },
            };
            finalImage = [detailerId, 0];
        }

        // Save Image
        const saveId = id();
        nodes[saveId] = {
            class_type: "SaveImage",
            inputs: {
                filename_prefix: getSaveImagePrefix(stage === 'base' ? 'CW_Base' : 'ComfyUI_Web'),
                images: finalImage,
            },
        };

        return { prompt: nodes, actualSeed };
    }

    const INPAINT_MODEL_DEFAULTS = {
        steps: 30,
        cfg: 5.0,
        sampler: 'euler',
        scheduler: 'normal',
        clipSkip: 2,
        useVae: false,
    };
    const INPAINT_ANIMA_LLLITE = {
        filename: 'anima-lllite-inpainting-v2.safetensors',
        url: 'https://huggingface.co/kohya-ss/Anima-LLLite/resolve/main/anima-lllite-inpainting-v2.safetensors',
        save_path: 'controlnet',
        strength: 0.8,
        startPercent: 0,
        endPercent: 0.8,
    };
    const INPAINT_ANIMA_V22 = {
        defaultDenoise: 1,
        foveaStrength: 3,
        sharpness: 0.5,
        maskInertia: 0.55,
    };
    // 参数来源：D:\TOM\Unsaved Workflow (2).json（小范围）/ D:\TOM\大范围.json（大范围）
    const INPAINT_ANIMA_V22_MODES = {
        small: {
            key: 'small',
            label: '强化小范围',
            engine: 'lllite-crop',
            steps: 10,
            cfg: 1,
            sampler: 'euler_ancestral',
            scheduler: 'simple',
            denoise: 1,
            foveaStrength: 3,
            sharpness: 0.5,
            maskInertia: 0.55,
        },
        large: {
            key: 'large',
            label: '大范围重绘',
            engine: 'lllite-full',
            steps: 10,
            cfg: 1,
            sampler: 'euler_ancestral',
            scheduler: 'simple',
            denoise: 1,
            foveaStrength: 3,
            sharpness: 0.5,
            maskInertia: 0.55,
        },
    };
    const INPAINT_ANIMA_MASK_FIX = {
        erode_dilate: 0,
        fill_holes: 0,
        remove_isolated_pixels: 0,
        smooth: 0,
        blur: 0,
    };
    const INPAINT_ANIMA_CROP_DEFAULTS = {
        downscale_algorithm: 'bilinear',
        upscale_algorithm: 'bicubic',
        preresize: false,
        preresize_mode: 'ensure minimum resolution',
        preresize_min_width: 1024,
        preresize_min_height: 1024,
        preresize_max_width: 16384,
        preresize_max_height: 16384,
        mask_fill_holes: true,
        mask_expand_pixels: 0,
        mask_invert: false,
        mask_blend_pixels: 32,
        mask_hipass_filter: 0.1,
        extend_for_outpainting: false,
        extend_up_factor: 1,
        extend_down_factor: 1,
        extend_left_factor: 1,
        extend_right_factor: 1,
        context_from_mask_extend_factor: 1.2,
        output_resize_to_target_size: true,
        output_target_width: 1536,
        output_target_height: 1536,
        output_padding: '32',
        device_mode: 'gpu (much faster)',
    };
    const INPAINT_ANIMA_NEGATIVE_FIXED = 'worst quality, low quality, score_1, score_2, score_3, bad quality, worst detail, sketch, censor, extra limbs, deformed fingers, bad anatomy, mutated body, lowres, low score, bad score, blurry, text, ugly, hooded eyes, watermark, pale, bad hands, bad proportions, poorly drawn face, poorly drawn hand, missing finger, pixelated, distorted, jpeg artifacts, signature, (deformed:1.5), (bad hand:1.3), overexposed, underexposed, censored, mutated, extra finger, cloned face, bad eyes, red sleeves, red sleeve cuffs';
    const INPAINT_PRESETS_SIMPLE = {
        detail: {
            hint: '修复细节：建议小范围涂抹眼睛/手部/边缘崩坏处。',
            positive: 'detailed skin, detailed eyes, detailed hands, sharp details',
            denoise: 0.55,
        },
        clothes: {
            hint: '换衣服：填写想要的服装效果。',
            positive: 'detailed clothing, fabric texture, clean outfit',
            denoise: 0.55,
        },
        background: {
            hint: '换背景：建议只涂背景区域。',
            positive: 'detailed background, clean scene, depth',
            denoise: 0.55,
        },
        hair: {
            hint: '改头发：建议只涂头发区域。',
            positive: 'detailed hair, natural hair strands, clean hairline',
            denoise: 0.55,
        },
        breasts: {
            hint: '重画胸部：建议只涂目标区域。',
            positive: 'natural breasts, detailed skin, anatomically correct',
            denoise: 0.55,
        },
        pussy: {
            hint: '重画私处：建议小范围精确涂抹。',
            positive: 'detailed skin, natural anatomy, realistic texture',
            denoise: 0.55,
        },
        panties: {
            hint: '重画内裤：建议只涂内裤区域。',
            positive: 'panties, detailed fabric, clean folds',
            denoise: 0.55,
        },
        bra: {
            hint: '重画胸罩：建议只涂胸罩区域。',
            positive: 'bra, detailed fabric, clean straps',
            denoise: 0.55,
        },
        bikini: {
            hint: '重画比基尼：建议只涂泳装区域。',
            positive: 'bikini, detailed fabric, clean stitching',
            denoise: 0.55,
        },
        erase: {
            hint: '擦除重填：用于移除杂物/水印等。',
            positive: 'clean background, seamless, high quality',
            denoise: 0.55,
        },
        custom: {
            hint: '自定义：只写蒙版内你想出现的内容。',
            positive: '',
            denoise: 0.55,
        },
    };

    function _applyAnimaInpaintModeToUI(modeKey) {
        const mode = INPAINT_ANIMA_V22_MODES[String(modeKey || 'small')] || INPAINT_ANIMA_V22_MODES.small;
        if (dom.inpInpaintSteps) dom.inpInpaintSteps.value = String(mode.steps);
        if (dom.inpInpaintCfg) dom.inpInpaintCfg.value = String(mode.cfg);
        if (dom.selInpaintSampler) dom.selInpaintSampler.value = mode.sampler;
        if (dom.selInpaintScheduler) dom.selInpaintScheduler.value = mode.scheduler;
        if (dom.inpInpaintDenoise) dom.inpInpaintDenoise.value = String(mode.denoise);
    }
    function _normalizeInpaintMode(rawMode, anima) {
        const mode = String(rawMode || '').trim().toLowerCase();
        if (anima) {
            if (mode === 'large') return 'large';
            return 'small';
        }
        return 'small';
    }

    const INPAINT_SETTINGS_KEY = 'comfyui_inpaint_settings';
    const INPAINT_SIDEBAR_KEY = 'comfyui_inpaint_sidebar_collapsed';
    let _inpaintNodes = null;

    function _inpaintListFromObjectInfo(entry) {
        if (!entry) return [];
        const raw = Array.isArray(entry) ? entry[0] : entry;
        return Array.isArray(raw) ? raw.map(String) : [];
    }

    function _inpaintResolveCropInputDefault(inputName, spec) {
        if (Object.prototype.hasOwnProperty.call(INPAINT_ANIMA_CROP_DEFAULTS, inputName)) {
            return INPAINT_ANIMA_CROP_DEFAULTS[inputName];
        }
        const meta = Array.isArray(spec) ? (spec[1] || {}) : {};
        if (meta && Object.prototype.hasOwnProperty.call(meta, 'default')) {
            return meta.default;
        }
        const typeRaw = Array.isArray(spec) ? spec[0] : null;
        if (Array.isArray(typeRaw) && typeRaw.length) return typeRaw[0];
        return undefined;
    }

    function _inpaintComboMeta(spec) {
        return Array.isArray(spec) ? (spec[1] || {}) : {};
    }

    function _inpaintResolveFlsScheduler(preferred, nodes) {
        const want = String(preferred || '');
        const allowed = nodes.flsSchedulers || [];
        if (!allowed.length) return nodes.flsSchedulerDefault || want || 'simple';
        if (want && allowed.includes(want)) return want;
        if (nodes.flsSchedulerDefault && allowed.includes(nodes.flsSchedulerDefault)) {
            return nodes.flsSchedulerDefault;
        }
        return allowed[0] || 'simple';
    }

    async function _checkInpaintNodes(force) {
        if (_inpaintNodes && !force) return _inpaintNodes;
        const nodes = {
            loadImageMask: false,
            inpaintCropRequired: {},
        };
        const checks = [
            ['loadImageMask', 'LoadImageMask'],
            ['animaLLLite', 'AnimaLLLiteApply'],
            ['inpaintPreprocessor', 'InpaintPreprocessor'],
            ['inpaintCrop', 'InpaintCropImproved'],
            ['inpaintStitch', 'InpaintStitchImproved'],
            ['maskFix', 'MaskFix+'],
            ['flsSampler', 'FLS_SamplerV4'],
        ];
        await Promise.all(checks.map(async ([key, nodeName]) => {
            try {
                const data = await apiGet('/object_info/' + nodeName);
                nodes[key] = !!data?.[nodeName];
            } catch {
                nodes[key] = false;
            }
        }));
        nodes.llliteInpaintFile = INPAINT_ANIMA_LLLITE.filename;
        nodes.llliteFileReady = false;
        if (nodes.animaLLLite) {
            try {
                const data = await apiGet('/object_info/AnimaLLLiteApply');
                const req = data?.AnimaLLLiteApply?.input?.required || {};
                const opt = data?.AnimaLLLiteApply?.input?.optional || {};
                const llliteKey = Object.keys(req).find(k => /lllite/i.test(k)) || 'lllite_name';
                const all = [
                    ..._inpaintListFromObjectInfo(req[llliteKey]),
                    ..._inpaintListFromObjectInfo(opt[llliteKey]),
                    ..._inpaintListFromObjectInfo(req.lllite_name),
                    ..._inpaintListFromObjectInfo(opt.lllite_name),
                ];
                const file = all.find(f => /lllite-inpainting-v2/i.test(f))
                    || all.find(f => /lllite-inpainting/i.test(f))
                    || all.find(f => /inpainting/i.test(f));
                if (file) nodes.llliteInpaintFile = file;
                nodes.llliteFileReady = all.some(f => /lllite-inpainting/i.test(f));
            } catch { /* ignore */ }
        }
        if (nodes.inpaintCrop) {
            try {
                const data = await apiGet('/object_info/InpaintCropImproved');
                nodes.inpaintCropRequired = data?.InpaintCropImproved?.input?.required || {};
            } catch { /* ignore */ }
        }
        nodes.flsSchedulers = [];
        nodes.flsSchedulerDefault = 'simple';
        if (nodes.flsSampler) {
            try {
                const data = await apiGet('/object_info/FLS_SamplerV4');
                const inputs = data?.FLS_SamplerV4?.input || {};
                const req = inputs.required || {};
                const opt = inputs.optional || {};
                const schedSpec = req.scheduler || opt.scheduler;
                nodes.flsSchedulers = _inpaintListFromObjectInfo(schedSpec);
                const schedMeta = _inpaintComboMeta(schedSpec);
                if (schedMeta.default !== undefined && schedMeta.default !== null) {
                    nodes.flsSchedulerDefault = String(schedMeta.default);
                } else if (nodes.flsSchedulers.length) {
                    nodes.flsSchedulerDefault = nodes.flsSchedulers[0];
                }
            } catch { /* ignore */ }
        }
        _inpaintNodes = nodes;
        return nodes;
    }

    function _inpaintResolveAnimaEngine(nodes, inpaintMode) {
        if (!nodes.animaLLLite || !nodes.inpaintPreprocessor) return null;
        const mode = INPAINT_ANIMA_V22_MODES[_normalizeInpaintMode(inpaintMode, true)] || INPAINT_ANIMA_V22_MODES.small;
        if (mode.engine === 'lllite-full') return 'lllite-full';
        if (nodes.inpaintCrop && nodes.inpaintStitch) return 'lllite-crop';
        return null;
    }

    function _inpaintResolveAnimaDenoise(inpaintMode, _userDenoise) {
        const mode = INPAINT_ANIMA_V22_MODES[_normalizeInpaintMode(inpaintMode, true)] || INPAINT_ANIMA_V22_MODES.small;
        return mode.denoise;
    }

    function _inpaintResolveAnimaCfg(inpaintMode, _userCfg) {
        const mode = INPAINT_ANIMA_V22_MODES[_normalizeInpaintMode(inpaintMode, true)] || INPAINT_ANIMA_V22_MODES.small;
        return mode.cfg;
    }

    function _inpaintUpdateArchPanels() {
        const anima = isAnimaMode();
        dom.inpaintSdxlPanel?.classList.add('hidden');
        dom.inpaintAnimaPanel?.classList.remove('hidden');
        dom.inpaintAnimaPanel?.classList.add('hidden');
        dom.inpaintModelNote?.classList.add('hidden');
        dom.inpaintRowFixed?.classList.add('hidden');
        dom.inpaintDenoiseWrap?.classList.add('hidden');
        if (dom.inpInpaintSteps) dom.inpInpaintSteps.disabled = true;
        if (dom.inpInpaintCfg) dom.inpInpaintCfg.disabled = true;
        if (dom.selInpaintScheduler) dom.selInpaintScheduler.disabled = false;
        if (dom.inpInpaintDenoise) dom.inpInpaintDenoise.disabled = true;
        if (dom.selInpaintSampler) dom.selInpaintSampler.disabled = false;
    }

    function _inpaintPreferCheckpoint(selectEl) {
        if (!selectEl || selectEl.options.length < 1) return;
        const opts = [...selectEl.options].map(o => o.value);
        const prefer = opts.find(n => /inpaint/i.test(n))
            || opts.find(n => /juggernaut|pony|illustrious|noob|xl/i.test(n))
            || opts[0];
        if (prefer && selectEl.value !== prefer) selectEl.value = prefer;
    }

    async function updateInpaintEngineUI() {
        const nodes = await _checkInpaintNodes();
        _inpaintUpdateArchPanels();
        await updateInpaintYoloStatus();
        await updateInpaintSamStatus();

        if (isAnimaMode()) {
            const modeKey = _normalizeInpaintMode(dom.selInpaintMode?.value, true);
            const engine = _inpaintResolveAnimaEngine(nodes, modeKey);
            const labels = {
                'lllite-crop': '强化小范围 · 裁剪拼接',
                'lllite-full': '大范围重绘 · 全图',
            };
            if (dom.inpaintEngineStatus) {
                if (!engine) {
                    const mode = INPAINT_ANIMA_V22_MODES[modeKey] || INPAINT_ANIMA_V22_MODES.small;
                    if (mode.engine === 'lllite-crop' && (!nodes.inpaintCrop || !nodes.inpaintStitch)) {
                        dom.inpaintEngineStatus.textContent = '引擎：强化小范围需 InpaintCropImproved + InpaintStitchImproved';
                    } else {
                        dom.inpaintEngineStatus.textContent = '引擎：需安装 ComfyUI-Anima-LLLite + controlnet_aux';
                    }
                } else {
                    let status = `引擎：${labels[engine] || engine}`;
                    status += nodes.llliteFileReady ? ' · 已就绪' : ' · 需下载 LLLite 权重';
                    dom.inpaintEngineStatus.textContent = status;
                }
            }
            const needSetup = !nodes.animaLLLite || !nodes.llliteFileReady;
            dom.inpaintDownloadArea?.classList.toggle('hidden', !needSetup);
            if (needSetup && dom.inpaintDownloadArea) {
                const hint = dom.inpaintDownloadArea.querySelector('.inpaint-download-hint');
                if (hint) {
                    if (!nodes.animaLLLite) {
                        hint.textContent = '在 Manager 安装 ComfyUI-Anima-LLLite 与 comfyui_controlnet_aux';
                    } else {
                        hint.textContent = '点击下载 anima-lllite-inpainting-v2 到 models/controlnet/';
                    }
                }
                const manual = dom.inpaintDownloadArea.querySelector('.inpaint-download-manual');
                if (manual) {
                    manual.innerHTML = '必装插件：<code>ComfyUI-Anima-LLLite</code>、<code>comfyui_controlnet_aux</code>、<code>ComfyUI-BSS_FLSampler</code>、<code>ComfyUI-Inpaint-CropAndStitch</code>（小范围）、<code>ComfyUI_essentials</code>（大范围 MaskFix+）';
                }
                const btn = dom.btnInpaintDownload;
                if (btn) btn.textContent = '📥 下载 Anima LLLite Inpaint';
            }
            return;
        }
    }

    const _inpaintStatusEndpoint = { yolo: null, sam: null }; // null=未知 true=可用 false=404/无此接口

    async function updateInpaintSamStatus() {
        const el = dom.inpaintSamStatus;
        if (!el) return;
        const txt = el.querySelector('.inpaint-sam-text');
        el.classList.remove('inpaint-sam-on', 'inpaint-sam-mid');
        el.classList.add('inpaint-sam-off');
        if (_inpaintStatusEndpoint.sam === false) {
            if (txt) txt.textContent = 'SAM 模型：本机无检测接口（可忽略）';
            return;
        }
        if (txt) txt.textContent = 'SAM 模型：检测中…';
        try {
            const res = await fetch(`${getServer()}/api/sam-status`);
            if (res.status === 404) {
                _inpaintStatusEndpoint.sam = false;
                if (txt) txt.textContent = 'SAM 模型：本机无检测接口（可忽略）';
                return;
            }
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                if (txt) txt.textContent = 'SAM 模型：检测失败';
                return;
            }
            _inpaintStatusEndpoint.sam = true;
            if (!data.deps_ok) {
                if (txt) txt.textContent = 'SAM 模型：依赖缺失（红灯）';
                return;
            }
            if (data.model_ready) {
                el.classList.remove('inpaint-sam-off');
                el.classList.add('inpaint-sam-on');
                if (txt) txt.textContent = `SAM 模型：已就绪（绿灯 · ${data.device || 'cpu'}）`;
                return;
            }
            if (data.model_exists) {
                el.classList.remove('inpaint-sam-off');
                el.classList.add('inpaint-sam-mid');
                if (txt) txt.textContent = 'SAM 模型：文件不完整（黄灯）';
                return;
            }
            if (txt) txt.textContent = 'SAM 模型：未安装（红灯）';
        } catch {
            if (txt) txt.textContent = 'SAM 模型：离线/不可用（红灯）';
        }
    }

    async function updateInpaintYoloStatus() {
        const el = dom.inpaintYoloStatus;
        if (!el) return;
        const txt = el.querySelector('.inpaint-sam-text');
        el.classList.remove('inpaint-sam-on', 'inpaint-sam-mid');
        el.classList.add('inpaint-sam-off');
        if (_inpaintStatusEndpoint.yolo === false) {
            if (txt) txt.textContent = 'YOLO 模型：本机无检测接口（可忽略）';
            return;
        }
        if (txt) txt.textContent = 'YOLO 模型：检测中…';
        try {
            const res = await fetch(`${getServer()}/api/yolo-status`);
            if (res.status === 404) {
                _inpaintStatusEndpoint.yolo = false;
                if (txt) txt.textContent = 'YOLO 模型：本机无检测接口（可忽略）';
                return;
            }
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
                if (txt) txt.textContent = 'YOLO 模型：检测失败';
                return;
            }
            _inpaintStatusEndpoint.yolo = true;
            if (!data.deps_ok) {
                if (txt) txt.textContent = 'YOLO 模型：依赖缺失（红灯）';
                return;
            }
            if (data.model_ready) {
                el.classList.remove('inpaint-sam-off');
                el.classList.add('inpaint-sam-on');
                if (txt) txt.textContent = `YOLO 模型：已就绪（绿灯 · ${data.device || 'cpu'}）`;
                return;
            }
            if (data.model_exists) {
                el.classList.remove('inpaint-sam-off');
                el.classList.add('inpaint-sam-mid');
                if (txt) txt.textContent = 'YOLO 模型：文件不完整（黄灯）';
                return;
            }
            if (txt) txt.textContent = 'YOLO 模型：未安装（红灯）';
        } catch {
            if (txt) txt.textContent = 'YOLO 模型：离线/不可用（红灯）';
        }
    }

    async function downloadInpaintAssets() {
        if (!dom.btnInpaintDownload) return;
        dom.btnInpaintDownload.disabled = true;
        dom.inpaintDownloadProgress?.classList.remove('hidden');
        if (dom.inpaintProgressText) {
            dom.inpaintProgressText.textContent = '正在下载 Anima LLLite Inpaint 权重...';
        }
        if (dom.inpaintProgressBar) dom.inpaintProgressBar.style.width = '8%';
        try {
            const downloads = [{
                url: INPAINT_ANIMA_LLLITE.url,
                filename: INPAINT_ANIMA_LLLITE.filename,
                save_path: INPAINT_ANIMA_LLLITE.save_path,
            }];
            for (const dl of downloads) {
                const res = await fetch(`${getServer()}/api/install-model`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: dl.url, filename: dl.filename, save_path: dl.save_path }),
                });
                if (!res.ok) throw new Error(`下载失败: ${dl.filename}`);
            }
            if (dom.inpaintProgressBar) dom.inpaintProgressBar.style.width = '35%';
            let attempts = 0;
            await new Promise((resolve, reject) => {
                const timer = setInterval(async () => {
                    attempts++;
                    if (dom.inpaintProgressBar) {
                        dom.inpaintProgressBar.style.width = `${Math.min(92, 35 + attempts * 3)}%`;
                    }
                    try {
                        await _checkInpaintNodes(true);
                        const ready = _inpaintNodes?.llliteFileReady;
                        if (ready) {
                            clearInterval(timer);
                            resolve();
                        }
                    } catch { /* retry */ }
                    if (attempts > 120) {
                        clearInterval(timer);
                        reject(new Error('下载超时'));
                    }
                }, 5000);
            });
            if (dom.inpaintProgressBar) dom.inpaintProgressBar.style.width = '100%';
            if (dom.inpaintProgressText) {
                dom.inpaintProgressText.textContent = 'LLLite 权重就绪！请重启 ComfyUI 后使用';
            }
            await updateInpaintEngineUI();
            setTimeout(() => dom.inpaintDownloadProgress?.classList.add('hidden'), 2500);
        } catch (e) {
            console.warn('[Inpaint] download failed:', e);
            if (dom.inpaintProgressText) {
                dom.inpaintProgressText.textContent = '下载失败：请安装 ComfyUI-Anima-LLLite，并手动将权重放到 models/controlnet/';
            }
            setTimeout(() => dom.inpaintDownloadProgress?.classList.add('hidden'), 5000);
        } finally {
            dom.btnInpaintDownload.disabled = false;
        }
    }

    function _inpaintSetSidebarCollapsed(collapsed) {
        if (!dom.inpaintSidebar) return;
        dom.inpaintSidebar.classList.toggle('collapsed', collapsed);
        const btn = dom.btnInpaintSidebarToggle;
        const icon = btn?.querySelector('.inpaint-sidebar-rail-icon');
        if (btn) {
            btn.title = collapsed ? '展开设置' : '收起设置';
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
        if (icon) icon.textContent = collapsed ? '▶' : '◀';
        try {
            localStorage.setItem(INPAINT_SIDEBAR_KEY, collapsed ? '1' : '0');
        } catch { /* ignore */ }
    }

    function _inpaintToggleSidebar() {
        _inpaintSetSidebarCollapsed(!dom.inpaintSidebar?.classList.contains('collapsed'));
    }

    function _inpaintRestoreSidebar() {
        try {
            _inpaintSetSidebarCollapsed(localStorage.getItem(INPAINT_SIDEBAR_KEY) === '1');
        } catch {
            _inpaintSetSidebarCollapsed(false);
        }
    }

    function _cloneSelectOptions(src, dest) {
        if (!src || !dest) return;
        dest.innerHTML = '';
        [...src.options].forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.textContent;
            dest.appendChild(o);
        });
    }

    function syncInpaintModelOptions() {
        _cloneSelectOptions(dom.selCheckpoint, dom.selInpaintCheckpoint);
        _cloneSelectOptions(dom.selVae, dom.selInpaintVae);
        _cloneSelectOptions(dom.selSampler, dom.selInpaintSampler);
        _cloneSelectOptions(dom.selScheduler, dom.selInpaintScheduler);
    }

    function captureInpaintSettings() {
        return {
            checkpoint: dom.selInpaintCheckpoint?.value || '',
            useVae: !!dom.chkInpaintVae?.checked,
            vae: dom.selInpaintVae?.value || '',
            steps: parseInt(dom.inpInpaintSteps?.value || INPAINT_MODEL_DEFAULTS.steps, 10),
            cfg: parseFloat(dom.inpInpaintCfg?.value || INPAINT_MODEL_DEFAULTS.cfg),
            sampler: dom.selInpaintSampler?.value || INPAINT_MODEL_DEFAULTS.sampler,
            scheduler: dom.selInpaintScheduler?.value || INPAINT_MODEL_DEFAULTS.scheduler,
            denoise: parseFloat(dom.inpInpaintDenoise?.value || '0.45'),
            inpaintMode: _normalizeInpaintMode(dom.selInpaintMode?.value, isAnimaMode()),
        };
    }

    function applyInpaintSettings(data) {
        if (!data) return;
        syncInpaintModelOptions();
        if (data.checkpoint && dom.selInpaintCheckpoint) {
            dom.selInpaintCheckpoint.value = data.checkpoint;
            if (dom.selInpaintCheckpoint.value !== data.checkpoint && dom.selInpaintCheckpoint.options.length) {
                dom.selInpaintCheckpoint.selectedIndex = 0;
            }
        }
        if (dom.chkInpaintVae) dom.chkInpaintVae.checked = !!data.useVae;
        if (data.vae && dom.selInpaintVae) dom.selInpaintVae.value = data.vae;
        if (dom.selInpaintVae) dom.selInpaintVae.disabled = !dom.chkInpaintVae?.checked;
        if (dom.inpInpaintSteps && data.steps) dom.inpInpaintSteps.value = String(data.steps);
        if (dom.inpInpaintCfg && data.cfg) dom.inpInpaintCfg.value = String(data.cfg);
        if (data.sampler && dom.selInpaintSampler) dom.selInpaintSampler.value = data.sampler;
        if (data.scheduler && dom.selInpaintScheduler) dom.selInpaintScheduler.value = data.scheduler;
        if (data.denoise && dom.inpInpaintDenoise) dom.inpInpaintDenoise.value = String(data.denoise);
        if (dom.selInpaintMode) dom.selInpaintMode.value = _normalizeInpaintMode(data.inpaintMode, isAnimaMode());
    }

    function saveInpaintSettings() {
        // Disabled by design: inpaint UI should always boot with workflow defaults.
    }

    function loadInpaintSettings() {
        syncInpaintModelOptions();
        if (dom.selCheckpoint?.value && dom.selInpaintCheckpoint) {
            dom.selInpaintCheckpoint.value = dom.selCheckpoint.value;
        }
        _inpaintPreferCheckpoint(dom.selInpaintCheckpoint);
        const isAnima = isAnimaMode();
        const animaMode = INPAINT_ANIMA_V22_MODES.small;
        const defs = isAnima
            ? {
                steps: animaMode.steps,
                cfg: animaMode.cfg,
                sampler: animaMode.sampler,
                scheduler: animaMode.scheduler,
                denoise: animaMode.denoise,
            }
            : INPAINT_MODEL_DEFAULTS;
        if (dom.inpInpaintSteps) dom.inpInpaintSteps.value = String(defs.steps);
        if (dom.inpInpaintCfg) dom.inpInpaintCfg.value = String(defs.cfg);
        if (dom.selInpaintSampler) dom.selInpaintSampler.value = defs.sampler;
        if (dom.selInpaintScheduler) dom.selInpaintScheduler.value = defs.scheduler;
        if (dom.inpInpaintDenoise) dom.inpInpaintDenoise.value = String(defs.denoise ?? 0.55);
        if (dom.selInpaintMode) dom.selInpaintMode.value = 'small';
        _inpaintUpdateArchPanels();
    }

    function updateInpaintModelNote() {
        if (!dom.inpaintModelNote) return;
        dom.inpaintModelNote.textContent = '局部重绘仅支持 Anima 工作流：使用主界面 UNET / CLIP / VAE 与 LLLite Inpaint 引擎。';
        dom.inpaintModelNote.classList.remove('hidden');
    }

    const INPAINT_PRESETS = {
        clothes: {
            hint: '只涂衣物区域，勿盖住脸和四肢。正向须写明想换成的服装，例如：red dress / school uniform / black hoodie。',
            positive: 'detailed clothing, fabric texture, natural folds, fitted outfit, clean stitching',
            negative: 'face, head, new person, duplicate person, extra limbs, deformed, blurry, bad anatomy, nude, exposed skin',
            denoise: 0.55,
        },
        background: {
            hint: '涂抹人物以外的背景。正向写场景即可，如：sunset beach / city street at night / classroom interior。',
            positive: 'detailed background, scenic environment, depth of field, atmospheric lighting, high quality',
            negative: 'person, character, face, body, duplicate subject, foreground character, low quality',
            denoise: 0.72,
        },
        erase: {
            hint: '涂抹要去掉的区域。正向写希望出现的纹理/内容，如：wooden wall / green grass / smooth skin。',
            positive: 'seamless texture, natural continuation, clean surface, high detail',
            negative: 'person, object, text, watermark, logo, artifact, blurry patch, duplicate',
            denoise: 0.58,
        },
        detail: {
            hint: '小范围涂抹模糊、崩坏处（眼睛、手指等）。强度宜低，提示词偏画质词。',
            positive: 'detailed, sharp focus, high quality, fine texture, anatomically correct',
            negative: 'blurry, jpeg artifacts, deformed, low quality, extra fingers, bad hands',
            denoise: 0.35,
        },
        hair: {
            hint: '只涂头发，避开脸部。正向写明发型/发色，如：long silver hair / short bob cut / twin tails。',
            positive: 'detailed hair, natural hair strands, hair texture, shiny hair',
            negative: 'face change, different face, helmet hair, bald, duplicate head, deformed',
            denoise: 0.50,
        },
        nude: {
            hint: '只涂衣物区域。建议选「强化小范围」；强度过高容易偏离原图。',
            positive: 'bare skin, nude, natural skin texture, nipples, anatomically correct, seamless skin',
            negative: 'clothes, clothing, underwear, bra, panties, bikini, swimsuit, fabric, strap, censored, mosaic, deformed',
            denoise: 0.62,
        },
        pubic_hairless: {
            hint: '只涂耻骨/下体毛发区域。用于去阴毛、修整体毛，范围尽量贴毛发边缘。',
            positive: 'hairless, shaved, smooth skin, clean skin, detailed skin texture, natural skin tone, anatomically correct',
            negative: 'pubic hair, body hair, stubble, hair strands, deformed, bad anatomy, blurry, censored',
            denoise: 0.48,
        },
        nipples: {
            hint: '只涂乳头/乳晕区域。适合修正画崩、补画或改大小，勿涂整胸除非需要。',
            positive: 'nipples, areola, detailed nipples, pink areola, erect nipples, anatomically correct, high detail',
            negative: 'deformed, bad anatomy, blurry, extra nipples, asymmetric, censored, mosaic, clothing',
            denoise: 0.42,
        },
        breasts: {
            hint: '涂抹整个乳房区域（可含乳晕）。用于整体重画胸型、大小或质感。',
            positive: 'breasts, detailed breasts, nipples, areola, soft breasts, natural breast shape, cleavage, smooth skin, anatomically correct, high detail',
            negative: 'deformed, bad anatomy, asymmetric breasts, extra breasts, blurry, censored, mosaic, clothing, bra',
            denoise: 0.55,
        },
        pussy: {
            hint: '只涂阴部区域。用于重画阴唇/私处细节，范围贴轮廓，勿涂到大腿或腹部。',
            positive: 'pussy, vulva, labia, detailed pussy, pink pussy, spread pussy, anatomically correct, high detail, moist',
            negative: 'deformed, bad anatomy, blurry, extra genitals, censored, mosaic, bar censor, clothing, panties',
            denoise: 0.52,
        },
        anus: {
            hint: '只涂肛门区域。小范围涂抹，用于补画或修正细节。',
            positive: 'anus, detailed anus, pink anus, anatomically correct, high detail',
            negative: 'deformed, bad anatomy, blurry, censored, mosaic, extra holes, clothing',
            denoise: 0.45,
        },
        panties: {
            hint: '涂抹内裤/底裤区域。可整片涂内裤范围，用于换款式或补画。',
            positive: 'panties, underwear, white panties, lace panties, detailed fabric, fabric folds, fitted, high detail',
            negative: 'nude, pussy, nipples, exposed genitals, deformed, bad anatomy, blurry, torn clothes',
            denoise: 0.55,
        },
        bra: {
            hint: '涂抹胸罩/内衣上衣区域。用于换款式、补画肩带与罩杯。',
            positive: 'bra, lace bra, underwear, detailed fabric, cleavage, fabric folds, fitted bra, high detail',
            negative: 'nude, bare breasts, nipples, exposed chest, deformed, bad anatomy, blurry, torn clothes',
            denoise: 0.55,
        },
        bikini: {
            hint: '涂抹比基尼/泳装区域。可只涂上装或下装，用于换泳装款式。',
            positive: 'bikini, swimsuit, detailed fabric, fabric texture, fitted, string bikini, high detail',
            negative: 'nude, nipples, pussy, deformed, bad anatomy, blurry, torn swimsuit',
            denoise: 0.55,
        },
        custom: {
            hint: '自行填写。只描述蒙版内要出现的内容，强度建议 0.35–0.65。',
            positive: '',
            negative: '',
            denoise: 0.55,
        },
    };

    function buildAnimaInpaintWorkflow(inpaintOpts) {
        const { baseImageName, maskImageName, denoise } = inpaintOpts;
        const inpaintMode = _normalizeInpaintMode(inpaintOpts.inpaintMode, true);
        const modePreset = INPAINT_ANIMA_V22_MODES[inpaintMode] || INPAINT_ANIMA_V22_MODES.small;
        const nodes = _inpaintNodes || {};
        const animaEngine = _inpaintResolveAnimaEngine(nodes, inpaintMode);
        if (!animaEngine) {
            const mode = INPAINT_ANIMA_V22_MODES[inpaintMode] || INPAINT_ANIMA_V22_MODES.small;
            if (mode.engine === 'lllite-crop') {
                throw new Error('强化小范围需要安装 ComfyUI-Inpaint-CropAndStitch（InpaintCropImproved + InpaintStitchImproved）');
            }
            throw new Error('Anima 重绘需要 ComfyUI-Anima-LLLite 与 InpaintPreprocessor 节点');
        }
        if (!nodes.llliteFileReady) {
            throw new Error('请下载 anima-lllite-inpainting-v2 到 models/controlnet/');
        }

        const positive = inpaintOpts.positive || '';
        const negative = INPAINT_ANIMA_NEGATIVE_FIXED;

        const useFlsSampler = !!nodes.flsSampler;
        const effectiveDenoise = _inpaintResolveAnimaDenoise(inpaintMode, denoise);
        const effectiveCfg = _inpaintResolveAnimaCfg(inpaintMode);
        const inpaintUi = captureInpaintSettings();
        const steps = modePreset.steps;
        const samplerName = inpaintUi.sampler || modePreset.sampler;
        const schedulerRaw = inpaintUi.scheduler || modePreset.scheduler;
        const scheduler = useFlsSampler
            ? _inpaintResolveFlsScheduler(schedulerRaw, nodes)
            : schedulerRaw;

        const seed = parseInt(dom.inpSeed.value);
        let actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 32) : seed;
        if (inpaintOpts.seedOverride !== undefined && inpaintOpts.seedOverride !== null) {
            actualSeed = inpaintOpts.seedOverride;
        }

        const unetName = dom.selUnet?.value;
        const clipName = dom.selClip?.value;
        const vaeName = dom.selAnimaVae?.value;
        if (!unetName) throw new Error('请先选择 Anima UNET 模型');
        if (!clipName) throw new Error('请先选择 Anima CLIP 模型');
        if (!vaeName) throw new Error('请先选择 Anima VAE');

        const wf = {};
        let nextId = 10;
        const id = () => String(nextId++);

        const unetId = id();
        wf[unetId] = { class_type: 'UNETLoader', inputs: { unet_name: unetName, weight_dtype: 'default' } };
        let modelOut = [unetId, 0];

        const clipId = id();
        wf[clipId] = { class_type: 'CLIPLoader', inputs: { clip_name: clipName, type: 'stable_diffusion', device: 'default' } };
        const clipOut = [clipId, 0];

        const vaeId = id();
        wf[vaeId] = { class_type: 'VAELoader', inputs: { vae_name: vaeName } };
        const vaeOut = [vaeId, 0];

        const posId = id();
        wf[posId] = { class_type: 'CLIPTextEncode', inputs: { text: resolveWildcards(positive || ''), clip: clipOut } };
        const negId = id();
        wf[negId] = { class_type: 'CLIPTextEncode', inputs: { text: resolveWildcards(negative || ''), clip: clipOut } };

        const baseLoadId = id();
        wf[baseLoadId] = { class_type: 'LoadImage', inputs: { image: baseImageName } };

        let maskSource;
        if (nodes.loadImageMask) {
            const maskLoadId = id();
            wf[maskLoadId] = { class_type: 'LoadImageMask', inputs: { image: maskImageName, channel: 'red' } };
            maskSource = [maskLoadId, 0];
        } else {
            const maskLoadId = id();
            wf[maskLoadId] = { class_type: 'LoadImage', inputs: { image: maskImageName } };
            const maskConvertId = id();
            wf[maskConvertId] = { class_type: 'ImageToMask', inputs: { image: [maskLoadId, 0], channel: 'red' } };
            maskSource = [maskConvertId, 0];
        }

        let maskProcessed = maskSource;
        const useMaskFix = inpaintMode === 'large' && nodes.maskFix;
        if (useMaskFix) {
            const fixId = id();
            wf[fixId] = {
                class_type: 'MaskFix+',
                inputs: {
                    mask: maskSource,
                    ...INPAINT_ANIMA_MASK_FIX,
                },
            };
            maskProcessed = [fixId, 0];
        }

        const useCrop = animaEngine === 'lllite-crop';
        let workImage;
        let workMask;
        let stitcherRef = null;

        if (useCrop) {
            const cropId = id();
            const cropInputs = {
                image: [baseLoadId, 0],
                mask: maskProcessed,
                ...INPAINT_ANIMA_CROP_DEFAULTS,
            };
            const required = nodes.inpaintCropRequired || {};
            for (const [inputName, spec] of Object.entries(required)) {
                if (inputName === 'image' || inputName === 'mask') continue;
                if (Object.prototype.hasOwnProperty.call(cropInputs, inputName)) continue;
                const resolved = _inpaintResolveCropInputDefault(inputName, spec);
                if (resolved !== undefined) cropInputs[inputName] = resolved;
            }
            wf[cropId] = {
                class_type: 'InpaintCropImproved',
                inputs: cropInputs,
            };
            workImage = [cropId, 1];
            workMask = [cropId, 2];
            stitcherRef = [cropId, 0];
        } else {
            workImage = [baseLoadId, 0];
            workMask = maskProcessed;
        }

        const vaeEncId = id();
        wf[vaeEncId] = { class_type: 'VAEEncode', inputs: { pixels: workImage, vae: vaeOut } };
        const latentMaskId = id();
        wf[latentMaskId] = { class_type: 'SetLatentNoiseMask', inputs: { samples: [vaeEncId, 0], mask: workMask } };

        const preprocId = id();
        wf[preprocId] = {
            class_type: 'InpaintPreprocessor',
            inputs: {
                image: workImage,
                mask: workMask,
                black_pixel_for_xinsir_cn: true,
            },
        };

        const llliteId = id();
        wf[llliteId] = {
            class_type: 'AnimaLLLiteApply',
            inputs: {
                model: modelOut,
                lllite_name: nodes.llliteInpaintFile,
                image: [preprocId, 0],
                strength: INPAINT_ANIMA_LLLITE.strength,
                start_percent: INPAINT_ANIMA_LLLITE.startPercent,
                end_percent: INPAINT_ANIMA_LLLITE.endPercent,
                preserve_wrapper: true,
                mask: workMask,
            },
        };
        modelOut = [llliteId, 0];

        const samplerId = id();
        if (useFlsSampler) {
            wf[samplerId] = {
                class_type: 'FLS_SamplerV4',
                inputs: {
                    seed: actualSeed,
                    steps,
                    cfg: effectiveCfg,
                    sampler_name: samplerName,
                    scheduler,
                    denoise: modePreset.denoise,
                    fovea_strength: modePreset.foveaStrength,
                    sharpness: modePreset.sharpness,
                    mask_inertia: modePreset.maskInertia,
                    model: modelOut,
                    positive: [posId, 0],
                    negative: [negId, 0],
                    latent_image: [latentMaskId, 0],
                },
            };
        } else {
            wf[samplerId] = {
                class_type: 'KSampler',
                inputs: {
                    seed: actualSeed,
                    steps,
                    cfg: effectiveCfg,
                    sampler_name: samplerName,
                    scheduler,
                    denoise: effectiveDenoise,
                    model: modelOut,
                    positive: [posId, 0],
                    negative: [negId, 0],
                    latent_image: [latentMaskId, 0],
                },
            };
        }

        const decodeId = id();
        wf[decodeId] = { class_type: 'VAEDecode', inputs: { samples: [samplerId, 0], vae: vaeOut } };

        let finalImage = [decodeId, 0];
        if (useCrop && stitcherRef) {
            const stitchId = id();
            wf[stitchId] = {
                class_type: 'InpaintStitchImproved',
                inputs: {
                    stitcher: stitcherRef,
                    inpainted_image: [decodeId, 0],
                },
            };
            finalImage = [stitchId, 0];
        }

        const saveId = id();
        wf[saveId] = { class_type: 'SaveImage', inputs: { filename_prefix: getSaveImagePrefix('ComfyUI_Web'), images: finalImage } };

        return {
            prompt: wf,
            actualSeed,
            effectiveDenoise,
            effectiveCfg,
            engine: animaEngine,
            sampler: useFlsSampler ? 'FLS_SamplerV4' : 'KSampler',
            inpaintMode,
        };
    }

    function buildInpaintWorkflow(inpaintOpts) {
        return buildAnimaInpaintWorkflow(inpaintOpts);
    }

    const _inpaint = {
        sourceUrl: '',
        naturalW: 0,
        naturalH: 0,
        scale: 1,
        panX: 0,
        panY: 0,
        tool: 'brush',
        spacePan: false,
        drawing: false,
        panning: false,
        panStartX: 0,
        panStartY: 0,
        panOriginX: 0,
        panOriginY: 0,
        pinchDist: 0,
        pinchScale: 1,
        readyGen: 0,
        lastClientX: 0,
        lastClientY: 0,
        _maskNative: null,
        _maskCtx: null,
        _imgData: null,
        autoPickArmed: false,
        autoPickMode: 'sam',
    };

    function applyInpaintPreset(key) {
        const preset = INPAINT_PRESETS_SIMPLE[key] || INPAINT_PRESETS[key] || INPAINT_PRESETS_SIMPLE.custom;
        if (dom.inpaintHint) {
            dom.inpaintHint.textContent = preset.hint + '  空格+拖动平移，滚轮缩放，魔棒点选相似区域。';
        }
        if (dom.txtInpaintPos) dom.txtInpaintPos.value = preset.positive;
        if (dom.inpInpaintDenoise) dom.inpInpaintDenoise.value = String(preset.denoise);
    }

    function _inpaintLayoutStage() {
        const w = _inpaint.naturalW;
        const h = _inpaint.naturalH;
        if (!w || !h) return;
        if (dom.inpaintStage) {
            dom.inpaintStage.style.width = `${w}px`;
            dom.inpaintStage.style.height = `${h}px`;
        }
    }

    function _inpaintApplyTransform() {
        if (!dom.inpaintTransform) return;
        dom.inpaintTransform.style.transform = `translate(${_inpaint.panX}px, ${_inpaint.panY}px) scale(${_inpaint.scale})`;
        _inpaintUpdateZoomLabel();
        if (_inpaint.lastClientX || _inpaint.lastClientY) {
            _inpaintUpdateBrushRing(_inpaint.lastClientX, _inpaint.lastClientY);
        }
    }

    function _inpaintUpdateZoomLabel() {
        if (dom.inpaintZoomLabel) {
            dom.inpaintZoomLabel.textContent = `${Math.round(_inpaint.scale * 100)}%`;
        }
    }

    function _inpaintFitToView() {
        const vp = dom.inpaintViewport;
        if (!vp || !_inpaint.naturalW) return;
        const margin = 24;
        const vw = Math.max(vp.clientWidth - margin, 80);
        const vh = Math.max(vp.clientHeight - margin, 80);
        const scale = Math.min(vw / _inpaint.naturalW, vh / _inpaint.naturalH, 1);
        _inpaint.scale = scale;
        _inpaint.panX = (vp.clientWidth - _inpaint.naturalW * scale) / 2;
        _inpaint.panY = (vp.clientHeight - _inpaint.naturalH * scale) / 2;
        _inpaintApplyTransform();
    }

    function _inpaintZoomTo100() {
        const vp = dom.inpaintViewport;
        if (!vp || !_inpaint.naturalW) return;
        _inpaint.scale = 1;
        _inpaint.panX = (vp.clientWidth - _inpaint.naturalW) / 2;
        _inpaint.panY = (vp.clientHeight - _inpaint.naturalH) / 2;
        _inpaintApplyTransform();
    }

    function _inpaintZoomAt(clientX, clientY, factor) {
        const vp = dom.inpaintViewport;
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const oldScale = _inpaint.scale;
        const newScale = Math.min(16, Math.max(0.08, oldScale * factor));
        const wx = (px - _inpaint.panX) / oldScale;
        const wy = (py - _inpaint.panY) / oldScale;
        _inpaint.scale = newScale;
        _inpaint.panX = px - wx * newScale;
        _inpaint.panY = py - wy * newScale;
        _inpaintApplyTransform();
    }

    function _inpaintCacheImageData() {
        if (!_inpaint.naturalW || !dom.inpaintImage) return;
        try {
            const c = document.createElement('canvas');
            c.width = _inpaint.naturalW;
            c.height = _inpaint.naturalH;
            const ctx = c.getContext('2d');
            ctx.drawImage(dom.inpaintImage, 0, 0);
            _inpaint._imgData = ctx.getImageData(0, 0, c.width, c.height);
        } catch (e) {
            console.warn('[Inpaint] 无法缓存底图像素（魔棒不可用）', e);
            _inpaint._imgData = null;
        }
    }

    function _inpaintEnsureMask() {
        if (_inpaint._maskCtx && _inpaint._maskNative) return;
        if (_inpaint.naturalW > 0 && _inpaint.naturalH > 0) _inpaintInitMask();
    }

    function _inpaintIsOverStage(clientX, clientY) {
        const rect = dom.inpaintStage?.getBoundingClientRect();
        if (!rect || rect.width < 1 || rect.height < 1) return false;
        return clientX >= rect.left && clientX <= rect.right
            && clientY >= rect.top && clientY <= rect.bottom;
    }

    function _inpaintClientToNative(clientX, clientY) {
        const vp = dom.inpaintViewport?.getBoundingClientRect();
        if (!vp || _inpaint.naturalW < 1 || _inpaint.scale < 0.001) {
            return { nx: 0, ny: 0, brush: 1 };
        }
        const px = clientX - vp.left;
        const py = clientY - vp.top;
        const nx = (px - _inpaint.panX) / _inpaint.scale;
        const ny = (py - _inpaint.panY) / _inpaint.scale;
        const screenBrush = dom.chkInpaintPixel?.checked
            ? 1
            : parseFloat(dom.inpaintBrush?.value || 28);
        const brush = dom.chkInpaintPixel?.checked
            ? 1
            : screenBrush / _inpaint.scale;
        return {
            nx: Math.max(0, Math.min(_inpaint.naturalW, nx)),
            ny: Math.max(0, Math.min(_inpaint.naturalH, ny)),
            brush: Math.max(brush, 0.5),
        };
    }

    function _inpaintInitMask() {
        _inpaint._maskNative = document.createElement('canvas');
        _inpaint._maskNative.width = _inpaint.naturalW;
        _inpaint._maskNative.height = _inpaint.naturalH;
        _inpaint._maskCtx = _inpaint._maskNative.getContext('2d');
        _inpaint._maskCtx.fillStyle = '#000';
        _inpaint._maskCtx.fillRect(0, 0, _inpaint.naturalW, _inpaint.naturalH);
        _inpaintRedrawOverlay();
    }

    function _inpaintRedrawOverlay() {
        if (!dom.inpaintCanvas || !_inpaint._maskNative || !_inpaint.naturalW) return;
        const w = _inpaint.naturalW;
        const h = _inpaint.naturalH;
        dom.inpaintCanvas.width = w;
        dom.inpaintCanvas.height = h;
        const ctx = dom.inpaintCanvas.getContext('2d');
        const maskData = _inpaint._maskCtx.getImageData(0, 0, w, h);
        const overlay = ctx.createImageData(w, h);
        for (let i = 0; i < maskData.data.length; i += 4) {
            const lum = maskData.data[i];
            if (lum < 4) continue;
            overlay.data[i] = 233;
            overlay.data[i + 1] = 69;
            overlay.data[i + 2] = 96;
            overlay.data[i + 3] = Math.min(255, Math.round(lum * 0.55));
        }
        ctx.putImageData(overlay, 0, 0);
    }

    function _inpaintHideBrushRing() {
        dom.inpaintCursor?.classList.add('hidden');
        dom.inpaintViewport?.classList.remove('inpaint-on-stage', 'draw-tool');
    }

    function _inpaintUpdateBrushRing(clientX, clientY) {
        const ring = dom.inpaintCursor;
        const vp = dom.inpaintViewport;
        if (!ring || !vp) return;

        _inpaint.lastClientX = clientX;
        _inpaint.lastClientY = clientY;

        if (_inpaint.tool === 'pan' || _inpaint.spacePan) {
            ring.classList.add('hidden');
            vp.classList.remove('inpaint-on-stage', 'draw-tool');
            return;
        }

        const overStage = _inpaintIsOverStage(clientX, clientY);
        vp.classList.toggle('inpaint-on-stage', overStage);
        vp.classList.toggle('draw-tool', overStage && ['brush', 'eraser', 'wand'].includes(_inpaint.tool));

        if (!overStage) {
            ring.classList.add('hidden');
            return;
        }

        const vpRect = vp.getBoundingClientRect();
        const screenBrush = dom.chkInpaintPixel?.checked
            ? Math.max(1, _inpaint.scale)
            : parseFloat(dom.inpaintBrush?.value || 28);

        ring.style.left = `${clientX - vpRect.left}px`;
        ring.style.top = `${clientY - vpRect.top}px`;
        ring.style.width = `${screenBrush}px`;
        ring.style.height = `${screenBrush}px`;
        ring.classList.toggle('eraser', _inpaint.tool === 'eraser');
        ring.classList.toggle('wand', _inpaint.tool === 'wand');
        ring.classList.remove('hidden');
    }

    function _inpaintSetTool(tool) {
        _inpaintDisarmAutoPick();
        _inpaint.tool = tool;
        const tools = ['brush', 'eraser', 'wand', 'pan'];
        const btnMap = {
            brush: dom.btnInpaintBrush,
            eraser: dom.btnInpaintEraser,
            wand: dom.btnInpaintWand,
            pan: dom.btnInpaintPan,
        };
        tools.forEach(t => btnMap[t]?.classList.toggle('active', t === tool));
        dom.inpaintWandWrap?.classList.toggle('hidden', tool !== 'wand');
        dom.inpaintStage?.classList.toggle('eraser-mode', tool === 'eraser');
        dom.inpaintStage?.classList.toggle('brush-mode', tool === 'brush' || tool === 'wand');
        dom.inpaintStage?.classList.toggle('wand-mode', tool === 'wand');
        dom.inpaintStage?.classList.toggle('pan-mode', tool === 'pan' || _inpaint.spacePan);
        dom.inpaintViewport?.classList.toggle('pan-mode', tool === 'pan' || _inpaint.spacePan);
        if (tool === 'pan' || _inpaint.spacePan) {
            _inpaintHideBrushRing();
        } else if (_inpaint.lastClientX || _inpaint.lastClientY) {
            _inpaintUpdateBrushRing(_inpaint.lastClientX, _inpaint.lastClientY);
        }
    }

    function _inpaintGetSamRangeScale() {
        const raw = parseInt(dom.inpInpaintSamRange?.value || '110', 10);
        const pct = Number.isFinite(raw) ? raw : 110;
        return Math.max(0.7, Math.min(1.6, pct / 100));
    }

    function _inpaintUpdateSamRangeLabel() {
        if (dom.inpaintSamRangeValue) {
            dom.inpaintSamRangeValue.textContent = `${parseInt(dom.inpInpaintSamRange?.value || '110', 10)}%`;
        }
    }

    function _inpaintArmAutoPick() {
        _inpaintArmAutoPickMode('sam');
    }

    function _inpaintArmAutoPickMode(mode) {
        _inpaint.autoPickArmed = true;
        _inpaint.autoPickMode = mode || 'sam';
        if (dom.inpaintHint) {
            dom.inpaintHint.textContent = _inpaint.autoPickMode === 'yolo-sam'
                ? 'YOLO + SAM 自动分割已启用：请在目标区域点一下。'
                : 'SAM 自动分割已启用：请在目标区域点一下。首次使用会自动下载模型。';
        }
        dom.btnInpaintAuto?.classList.toggle('active', _inpaint.autoPickMode === 'sam');
        dom.btnInpaintAutoYolo?.classList.toggle('active', _inpaint.autoPickMode === 'yolo-sam');
    }

    function _inpaintDisarmAutoPick() {
        _inpaint.autoPickArmed = false;
        _inpaint.autoPickMode = 'sam';
        dom.btnInpaintAuto?.classList.remove('active');
        dom.btnInpaintAutoYolo?.classList.remove('active');
    }

    function _inpaintAutoMaskFromPoint(clientX, clientY) {
        return _inpaint.autoPickMode === 'yolo-sam'
            ? _inpaintAutoMaskFromPointWithYoloSam(clientX, clientY)
            : _inpaintAutoMaskFromPointWithSam(clientX, clientY);
    }

    async function _inpaintExportBaseDataUrl() {
        if (!_inpaint.naturalW || !dom.inpaintImage) {
            throw new Error('底图未就绪');
        }
        try {
            const c = document.createElement('canvas');
            c.width = _inpaint.naturalW;
            c.height = _inpaint.naturalH;
            c.getContext('2d').drawImage(dom.inpaintImage, 0, 0, _inpaint.naturalW, _inpaint.naturalH);
            const dataUrl = c.toDataURL('image/png');
            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                throw new Error('invalid image data');
            }
            return dataUrl;
        } catch (e) {
            throw new Error('底图像素导出失败，请确认当前图片可被浏览器读取（建议用本地服务地址打开）');
        }
    }

    function _inpaintApplyMaskDataUrl(maskDataUrl) {
        return new Promise((resolve, reject) => {
            _inpaintEnsureMask();
            if (!_inpaint._maskCtx || !_inpaint.naturalW) {
                reject(new Error('蒙版画布未就绪'));
                return;
            }
            const img = new Image();
            img.onload = () => {
                try {
                    const w = _inpaint.naturalW;
                    const h = _inpaint.naturalH;
                    const c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const m = ctx.getImageData(0, 0, w, h).data;
                    const out = _inpaint._maskCtx.createImageData(w, h);
                    for (let i = 0; i < m.length; i += 4) {
                        const v = m[i];
                        out.data[i] = v;
                        out.data[i + 1] = v;
                        out.data[i + 2] = v;
                        out.data[i + 3] = 255;
                    }
                    _inpaint._maskCtx.putImageData(out, 0, 0);
                    _inpaintRedrawOverlay();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('SAM 蒙版加载失败'));
            img.src = maskDataUrl;
        });
    }

    async function _inpaintAutoMaskFromPointWithSam(clientX, clientY) {
        if (!_inpaintIsOverStage(clientX, clientY)) return false;
        const { nx, ny } = _inpaintPointerToNative(clientX, clientY);
        const samScale = _inpaintGetSamRangeScale();
        const shortEdge = Math.max(1, Math.min(_inpaint.naturalW, _inpaint.naturalH));
        const brushRadius = Math.max(24, parseFloat(dom.inpaintBrush?.value || 28) / Math.max(_inpaint.scale, 0.2));
        const focusRadius = Math.max(56, Math.min(shortEdge * 0.28, brushRadius * 4.6)) * samScale;
        const focusBox = [
            Math.max(0, nx - focusRadius),
            Math.max(0, ny - focusRadius),
            Math.min(_inpaint.naturalW - 1, nx + focusRadius),
            Math.min(_inpaint.naturalH - 1, ny + focusRadius),
        ];
        const ring = Math.max(40, focusRadius * (1.18 - (samScale - 1) * 0.35));
        const negativePoints = [
            [nx - ring, ny],
            [nx + ring, ny],
            [nx, ny - ring],
            [nx, ny + ring],
            [nx - ring * 0.72, ny - ring * 0.72],
            [nx + ring * 0.72, ny - ring * 0.72],
            [nx - ring * 0.72, ny + ring * 0.72],
            [nx + ring * 0.72, ny + ring * 0.72],
        ].map(([x, y]) => [
            Math.max(0, Math.min(_inpaint.naturalW - 1, x)),
            Math.max(0, Math.min(_inpaint.naturalH - 1, y)),
        ]);
        const imageDataUrl = await _inpaintExportBaseDataUrl();
        const res = await fetch(`${getServer()}/api/auto-mask-sam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_data_url: imageDataUrl,
                point_x: nx,
                point_y: ny,
                negative_points: negativePoints,
                focus_box: focusBox,
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.mask_data_url) {
            throw new Error(data?.error || 'SAM 自动分割失败');
        }
        await _inpaintApplyMaskDataUrl(data.mask_data_url);
        return true;
    }

    async function _inpaintAutoMaskFromPointWithYoloSam(clientX, clientY) {
        if (!_inpaintIsOverStage(clientX, clientY)) return false;
        const { nx, ny } = _inpaintPointerToNative(clientX, clientY);
        const imageDataUrl = await _inpaintExportBaseDataUrl();
        const res = await fetch(`${getServer()}/api/auto-mask-yolo-sam`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_data_url: imageDataUrl,
                point_x: nx,
                point_y: ny,
                range_scale: _inpaintGetSamRangeScale(),
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.mask_data_url) {
            throw new Error(data?.error || 'YOLO + SAM 自动分割失败');
        }
        await _inpaintApplyMaskDataUrl(data.mask_data_url);
        return true;
    }

    function _inpaintPointerToNative(clientX, clientY) {
        return _inpaintClientToNative(clientX, clientY);
    }

    function _inpaintPaintAt(clientX, clientY) {
        _inpaintEnsureMask();
        if (!_inpaint._maskCtx || _inpaint.naturalW < 1) return;
        if (!_inpaintIsOverStage(clientX, clientY)) return;
        const { nx, ny, brush } = _inpaintPointerToNative(clientX, clientY);
        _inpaint._maskCtx.fillStyle = _inpaint.tool === 'eraser' ? '#000' : '#fff';
        _inpaint._maskCtx.beginPath();
        _inpaint._maskCtx.arc(nx, ny, Math.max(brush / 2, 0.5), 0, Math.PI * 2);
        _inpaint._maskCtx.fill();
        _inpaintRedrawOverlay();
    }

    function _inpaintMagicWand(clientX, clientY) {
        _inpaintEnsureMask();
        if (!_inpaint._maskCtx || _inpaint.naturalW < 1) return;
        if (!_inpaintIsOverStage(clientX, clientY)) return;
        if (!_inpaint._imgData) {
            _inpaintCacheImageData();
            if (!_inpaint._imgData) {
                alert('魔棒需要读取底图颜色，请确认 ComfyUI 已加 --enable-cors-header');
                return;
            }
        }
        const { nx, ny } = _inpaintPointerToNative(clientX, clientY);
        const w = _inpaint.naturalW;
        const h = _inpaint.naturalH;
        const sx = Math.max(0, Math.min(w - 1, Math.floor(nx)));
        const sy = Math.max(0, Math.min(h - 1, Math.floor(ny)));
        const src = _inpaint._imgData.data;
        const si = (sy * w + sx) * 4;
        const sr = src[si];
        const sg = src[si + 1];
        const sb = src[si + 2];
        const tol = parseInt(dom.inpaintWandTol?.value || 32, 10);
        const tolSq = tol * tol;
        const visited = new Uint8Array(w * h);
        const stack = [sx + sy * w];
        const selected = [];
        const fillWhite = _inpaint.tool === 'wand' || _inpaint.tool === 'brush';

        while (stack.length) {
            const pi = stack.pop();
            if (visited[pi]) continue;
            visited[pi] = 1;
            const i = pi * 4;
            const dr = src[i] - sr;
            const dg = src[i + 1] - sg;
            const db = src[i + 2] - sb;
            if (dr * dr + dg * dg + db * db > tolSq) continue;
            selected.push(pi);
            const x = pi % w;
            const y = (pi / w) | 0;
            if (x > 0) stack.push(pi - 1);
            if (x < w - 1) stack.push(pi + 1);
            if (y > 0) stack.push(pi - w);
            if (y < h - 1) stack.push(pi + w);
        }

        const maskData = _inpaint._maskCtx.getImageData(0, 0, w, h);
        const val = fillWhite ? 255 : 0;
        for (const pi of selected) {
            const i = pi * 4;
            maskData.data[i] = val;
            maskData.data[i + 1] = val;
            maskData.data[i + 2] = val;
            maskData.data[i + 3] = 255;
        }
        _inpaint._maskCtx.putImageData(maskData, 0, 0);
        _inpaintRedrawOverlay();
    }

    function _inpaintInvertMask() {
        if (!_inpaint._maskCtx || _inpaint.naturalW < 1) return;
        const w = _inpaint.naturalW;
        const h = _inpaint.naturalH;
        const data = _inpaint._maskCtx.getImageData(0, 0, w, h);
        for (let i = 0; i < data.data.length; i += 4) {
            const v = 255 - data.data[i];
            data.data[i] = v;
            data.data[i + 1] = v;
            data.data[i + 2] = v;
        }
        _inpaint._maskCtx.putImageData(data, 0, 0);
        _inpaintRedrawOverlay();
    }

    function _inpaintHasMask() {
        if (!_inpaint._maskCtx) return false;
        const data = _inpaint._maskCtx.getImageData(0, 0, _inpaint.naturalW, _inpaint.naturalH).data;
        for (let i = 0; i < data.length; i += 16) {
            if (data[i] > 20) return true;
        }
        return false;
    }

    function _inpaintCountMaskPixels() {
        if (!_inpaint._maskCtx || !_inpaint.naturalW) return 0;
        const data = _inpaint._maskCtx.getImageData(0, 0, _inpaint.naturalW, _inpaint.naturalH).data;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 127) count++;
        }
        return count;
    }

    function _inpaintExportBaseFile() {
        return new Promise((resolve, reject) => {
            if (!_inpaint.naturalW || !dom.inpaintImage) {
                reject(new Error('底图未就绪'));
                return;
            }
            try {
                const c = document.createElement('canvas');
                c.width = _inpaint.naturalW;
                c.height = _inpaint.naturalH;
                c.getContext('2d').drawImage(dom.inpaintImage, 0, 0, _inpaint.naturalW, _inpaint.naturalH);
                c.toBlob(blob => {
                    if (!blob) reject(new Error('底图导出失败'));
                    else resolve(new File([blob], `cw_inpaint_base_${Date.now()}.png`, { type: 'image/png' }));
                }, 'image/png');
            } catch (e) {
                reject(new Error('底图导出失败，请确认 ComfyUI 已加 --enable-cors-header'));
            }
        });
    }

    function _inpaintExportMaskFile() {
        return new Promise((resolve, reject) => {
            const w = _inpaint.naturalW;
            const h = _inpaint.naturalH;
            if (!w || !_inpaint._maskCtx) {
                reject(new Error('蒙版未就绪'));
                return;
            }
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            const src = _inpaint._maskCtx.getImageData(0, 0, w, h);
            const out = ctx.createImageData(w, h);
            for (let i = 0; i < src.data.length; i += 4) {
                const v = src.data[i] > 127 ? 255 : 0;
                out.data[i] = v;
                out.data[i + 1] = v;
                out.data[i + 2] = v;
                out.data[i + 3] = 255;
            }
            ctx.putImageData(out, 0, 0);
            c.toBlob(blob => {
                if (!blob) reject(new Error('蒙版导出失败'));
                else resolve(new File([blob], `cw_mask_${Date.now()}.png`, { type: 'image/png' }));
            }, 'image/png');
        });
    }

    function _inpaintIsPanMode(e) {
        return _inpaint.tool === 'pan' || _inpaint.spacePan || e.button === 1;
    }

    function _inpaintSetImageCrossOrigin(imageUrl) {
        if (!dom.inpaintImage) return;
        if (/^https?:\/\//i.test(imageUrl)) {
            dom.inpaintImage.crossOrigin = 'anonymous';
        } else {
            dom.inpaintImage.removeAttribute('crossorigin');
        }
    }

    function openInpaintModal(imageUrl) {
        if (!imageUrl || !dom.modalInpaint) return;
        const gen = ++_inpaint.readyGen;
        _inpaint.sourceUrl = imageUrl;
        _inpaint.drawing = false;
        _inpaint.panning = false;
        _inpaint.spacePan = false;
        _inpaint._maskNative = null;
        _inpaint._maskCtx = null;
        _inpaint._imgData = null;
        _inpaintDisarmAutoPick();
        _inpaint.lastClientX = 0;
        _inpaint.lastClientY = 0;
        _inpaintSetTool('brush');
        applyInpaintPreset(dom.selInpaintPreset?.value || 'clothes');
        loadInpaintSettings();
        updateInpaintModelNote();
        updateInpaintEngineUI();
        _inpaintRestoreSidebar();
        dom.modalInpaint.classList.remove('hidden');
        document.body.classList.add('inpaint-open');
        _inpaintHideBrushRing();
        dom.inpaintViewport?.classList.remove('inpaint-on-stage', 'draw-tool');

        const onReady = () => {
            if (gen !== _inpaint.readyGen) return;
            _inpaint.naturalW = dom.inpaintImage.naturalWidth;
            _inpaint.naturalH = dom.inpaintImage.naturalHeight;
            if (_inpaint.naturalW > 0) {
                requestAnimationFrame(() => {
                    if (gen !== _inpaint.readyGen) return;
                    _inpaintLayoutStage();
                    _inpaintInitMask();
                    _inpaintCacheImageData();
                    _inpaintFitToView();
                    requestAnimationFrame(() => {
                        if (gen !== _inpaint.readyGen) return;
                        _inpaintRedrawOverlay();
                    });
                });
            }
        };

        dom.inpaintImage.onload = onReady;
        dom.inpaintImage.onerror = () => {
            if (gen !== _inpaint.readyGen) return;
            alert('底图加载失败。上传图请重新选择；历史/结果图请确认 ComfyUI 可访问且已加 --enable-cors-header');
        };
        _inpaintSetImageCrossOrigin(imageUrl);
        if (dom.inpaintImage.src !== imageUrl) {
            dom.inpaintImage.src = imageUrl;
        } else {
            onReady();
        }
    }

    function closeInpaintModal() {
        dom.modalInpaint?.classList.add('hidden');
        document.body.classList.remove('inpaint-open');
        _inpaint.drawing = false;
        _inpaint.panning = false;
        _inpaintHideBrushRing();
        dom.inpaintViewport?.classList.remove('inpaint-on-stage', 'draw-tool', 'pan-mode');
    }

    async function runInpaintGeneration() {
        if (!_inpaint.sourceUrl) return;
        if (!_inpaintHasMask()) {
            alert('请先用画笔涂抹要重绘的区域');
            return;
        }

        const positive = dom.txtInpaintPos?.value.trim() || '';
        const denoise = parseFloat(dom.inpInpaintDenoise?.value || '0.45');
        const inpaintMode = _normalizeInpaintMode(dom.selInpaintMode?.value, isAnimaMode());
        if (!positive) {
            alert('请填写蒙版内正向提示词');
            return;
        }
        if (!isAnimaMode()) {
            alert('局部重绘现仅支持 Anima 架构，请先切换到 Anima 后再重试。');
            return;
        }
        if (!dom.selUnet?.value || !dom.selClip?.value || !dom.selAnimaVae?.value) {
            alert('请先在主界面选择 Anima UNET / CLIP / VAE 模型');
            return;
        }

        saveInpaintSettings();
        const modelCfg = captureInpaintSettings();

        const maskPixels = _inpaintCountMaskPixels();
        if (maskPixels < 16) {
            alert('蒙版区域过小，请重新涂抹要重绘的区域');
            return;
        }

        beginGenerationUI();
        dom.btnGenerate.textContent = '局部重绘中...';

        try {
            await _checkInpaintNodes();
            const baseFile = await _inpaintExportBaseFile();
            const maskFile = await _inpaintExportMaskFile();
            closeInpaintModal();
            const baseUpload = await uploadImage(baseFile);
            const maskUpload = await uploadImage(maskFile);

            const workflow = buildInpaintWorkflow({
                baseImageName: baseUpload.name,
                maskImageName: maskUpload.name,
                positive,
                denoise,
                inpaintMode,
                modelCfg,
            });
            const modeLabels = { small: '强化小范围', large: '大范围重绘' };
            console.info('[Inpaint]', {
                engine: workflow.engine,
                inpaintMode: workflow.inpaintMode,
                maskPixels,
                denoise: workflow.effectiveDenoise,
                cfg: workflow.effectiveCfg,
            });
            dom.btnGenerate.textContent = `局部重绘中…(${workflow.engine} · ${modeLabels[workflow.inpaintMode] || workflow.inpaintMode} · ${workflow.effectiveDenoise})`;
            await runPromptWorkflow(workflow);
        } catch (e) {
            alert('局部重绘失败: ' + e.message);
            console.error(e);
        } finally {
            endGenerationUI();
        }
    }

    function setupInpaint() {
        if (!dom.modalInpaint) return;

        const wireInpaint = (btn, getUrl, closePreview) => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = typeof getUrl === 'function' ? getUrl() : getUrl;
                if (!url) {
                    alert('请先选择或生成一张图片');
                    return;
                }
                if (closePreview) dom.modalPreview?.classList.add('hidden');
                openInpaintModal(url);
            });
        };

        wireInpaint(dom.btnInpaint, () => dom.resultImage?.src);
        wireInpaint(dom.btnPreviewInpaint, () => dom.previewImage?.src, true);
        wireInpaint(dom.btnRefInpaint, () => dom.refPreview?.src);
        wireInpaint(dom.btnCnInpaint, () => dom.cnUploadImg?.src);
        wireInpaint(dom.btnIpaInpaint, () => dom.ipaPreview?.src);

        dom.selInpaintPreset?.addEventListener('change', (e) => applyInpaintPreset(e.target.value));
        dom.btnInpaintSidebarToggle?.addEventListener('click', _inpaintToggleSidebar);
        dom.chkInpaintVae?.addEventListener('change', () => {
            if (dom.selInpaintVae) dom.selInpaintVae.disabled = !dom.chkInpaintVae.checked;
            saveInpaintSettings();
        });
        dom.selInpaintMode?.addEventListener('change', () => {
            if (isAnimaMode()) {
                _applyAnimaInpaintModeToUI(_normalizeInpaintMode(dom.selInpaintMode?.value, true));
            }
            updateInpaintEngineUI();
        });
        dom.btnInpaintDownload?.addEventListener('click', downloadInpaintAssets);
        dom.inpInpaintSamRange?.addEventListener('input', _inpaintUpdateSamRangeLabel);
        ['sel-inpaint-checkpoint', 'sel-inpaint-vae', 'inp-inpaint-steps', 'inp-inpaint-cfg',
            'sel-inpaint-sampler', 'sel-inpaint-scheduler', 'inp-inpaint-denoise'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', saveInpaintSettings);
            document.getElementById(id)?.addEventListener('input', saveInpaintSettings);
        });
        dom.btnInpaintBrush?.addEventListener('click', () => _inpaintSetTool('brush'));
        dom.btnInpaintEraser?.addEventListener('click', () => _inpaintSetTool('eraser'));
        dom.btnInpaintWand?.addEventListener('click', () => _inpaintSetTool('wand'));
        dom.btnInpaintAuto?.addEventListener('click', () => _inpaintArmAutoPick());
        dom.btnInpaintAutoYolo?.addEventListener('click', () => _inpaintArmAutoPickMode('yolo-sam'));
        dom.btnInpaintPan?.addEventListener('click', () => _inpaintSetTool('pan'));
        dom.btnInpaintInvert?.addEventListener('click', () => _inpaintInvertMask());
        dom.btnInpaintFit?.addEventListener('click', () => _inpaintFitToView());
        dom.btnInpaint100?.addEventListener('click', () => _inpaintZoomTo100());
        dom.btnInpaintClear?.addEventListener('click', () => _inpaintInitMask());
        dom.btnInpaintCancel?.addEventListener('click', closeInpaintModal);
        dom.btnInpaintRun?.addEventListener('click', runInpaintGeneration);

        dom.inpaintBrush?.addEventListener('input', () => {
            if (_inpaint.lastClientX || _inpaint.lastClientY) {
                _inpaintUpdateBrushRing(_inpaint.lastClientX, _inpaint.lastClientY);
            }
        });

        window.addEventListener('keydown', (e) => {
            if (dom.modalInpaint?.classList.contains('hidden')) return;
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                _inpaint.spacePan = true;
                dom.inpaintStage?.classList.add('pan-mode');
                dom.inpaintViewport?.classList.add('pan-mode');
                _inpaintHideBrushRing();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                _inpaint.spacePan = false;
                if (_inpaint.tool !== 'pan') {
                    dom.inpaintStage?.classList.remove('pan-mode');
                    dom.inpaintViewport?.classList.remove('pan-mode');
                }
            }
        });

        const onPointerDown = async (e) => {
            if (dom.modalInpaint?.classList.contains('hidden')) return;
            if (e.touches && e.touches.length === 2) {
                _inpaint.pinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                _inpaint.pinchScale = _inpaint.scale;
                return;
            }
            if (e.button !== undefined && e.button !== 0 && e.button !== 1) return;
            const pt = e.touches ? e.touches[0] : e;
            if (_inpaintIsPanMode(e)) {
                _inpaint.panning = true;
                _inpaint.panStartX = pt.clientX;
                _inpaint.panStartY = pt.clientY;
                _inpaint.panOriginX = _inpaint.panX;
                _inpaint.panOriginY = _inpaint.panY;
                e.preventDefault();
                return;
            }
            if (_inpaint.autoPickArmed) {
                let ok = false;
                const autoMode = _inpaint.autoPickMode;
                dom.btnInpaintAuto && (dom.btnInpaintAuto.disabled = true);
                dom.btnInpaintAutoYolo && (dom.btnInpaintAutoYolo.disabled = true);
                if (dom.inpaintHint) {
                    dom.inpaintHint.textContent = autoMode === 'yolo-sam'
                        ? 'YOLO + SAM 分割中，请稍候...'
                        : 'SAM 分割中，请稍候...';
                }
                try {
                    ok = await _inpaintAutoMaskFromPoint(pt.clientX, pt.clientY);
                } catch (err) {
                    const label = autoMode === 'yolo-sam' ? 'YOLO + SAM' : 'SAM';
                    alert(`${label} 自动分割失败: ${err.message}`);
                } finally {
                    dom.btnInpaintAuto && (dom.btnInpaintAuto.disabled = false);
                    dom.btnInpaintAutoYolo && (dom.btnInpaintAutoYolo.disabled = false);
                }
                _inpaintDisarmAutoPick();
                if (ok) {
                    if (dom.inpaintHint) {
                        dom.inpaintHint.textContent = autoMode === 'yolo-sam'
                            ? 'YOLO + SAM 自动分割完成，可继续修补后开始重绘。'
                            : 'SAM 自动分割完成，可继续修补后开始重绘。';
                    }
                }
                e.preventDefault();
                return;
            }
            if (!_inpaintIsOverStage(pt.clientX, pt.clientY)) return;
            _inpaint.drawing = true;
            if (_inpaint.tool === 'wand') {
                _inpaintMagicWand(pt.clientX, pt.clientY);
            } else {
                _inpaintPaintAt(pt.clientX, pt.clientY);
            }
            _inpaintUpdateBrushRing(pt.clientX, pt.clientY);
            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (dom.modalInpaint?.classList.contains('hidden')) return;
            if (e.touches && e.touches.length === 2 && _inpaint.pinchDist > 0) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const factor = dist / _inpaint.pinchDist;
                _inpaint.scale = Math.min(16, Math.max(0.08, _inpaint.pinchScale * factor));
                const vp = dom.inpaintViewport?.getBoundingClientRect();
                if (vp) {
                    const px = cx - vp.left;
                    const py = cy - vp.top;
                    const wx = (px - _inpaint.panX) / _inpaint.pinchScale;
                    const wy = (py - _inpaint.panY) / _inpaint.pinchScale;
                    _inpaint.panX = px - wx * _inpaint.scale;
                    _inpaint.panY = py - wy * _inpaint.scale;
                }
                _inpaintApplyTransform();
                e.preventDefault();
                return;
            }
            const pt = e.touches ? e.touches[0] : e;
            if (_inpaint.panning) {
                _inpaint.panX = _inpaint.panOriginX + (pt.clientX - _inpaint.panStartX);
                _inpaint.panY = _inpaint.panOriginY + (pt.clientY - _inpaint.panStartY);
                _inpaintApplyTransform();
                e.preventDefault();
                return;
            }
            _inpaintUpdateBrushRing(pt.clientX, pt.clientY);
            if (!_inpaint.drawing || _inpaint.tool === 'wand') return;
            _inpaintPaintAt(pt.clientX, pt.clientY);
            e.preventDefault();
        };

        const onPointerUp = () => {
            _inpaint.drawing = false;
            _inpaint.panning = false;
            _inpaint.pinchDist = 0;
        };

        const paintTarget = dom.inpaintViewport;
        paintTarget?.addEventListener('mousedown', onPointerDown);
        paintTarget?.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        paintTarget?.addEventListener('touchstart', onPointerDown, { passive: false });
        paintTarget?.addEventListener('touchmove', onPointerMove, { passive: false });
        paintTarget?.addEventListener('touchend', onPointerUp);
        paintTarget?.addEventListener('touchcancel', onPointerUp);

        dom.inpaintViewport?.addEventListener('wheel', (e) => {
            if (dom.modalInpaint?.classList.contains('hidden')) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            _inpaintZoomAt(e.clientX, e.clientY, factor);
        }, { passive: false });

        window.addEventListener('resize', () => {
            if (!dom.modalInpaint?.classList.contains('hidden')) _inpaintFitToView();
        });

        _inpaintSetTool('brush');
        _inpaintUpdateSamRangeLabel();
    }

    // ==================== 图层合成 ====================
    const _composite = {
        baseImg: null,
        baseW: 0,
        baseH: 0,
        overlayImg: null,
        overlay: { x: 0, y: 0, w: 0, h: 0, rotation: 0, opacity: 1 },
        scale: 1,
        panX: 0,
        panY: 0,
        showGuides: true,
        drag: null,
        panning: false,
        panStartX: 0,
        panStartY: 0,
        panOriginX: 0,
        panOriginY: 0,
        spaceHeld: false,
        _objectUrls: [],
        _raf: 0,
    };

    function _compositeRevokeUrls() {
        _composite._objectUrls.forEach((u) => URL.revokeObjectURL(u));
        _composite._objectUrls = [];
    }

    function _compositeImageFromSrc(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = src;
        });
    }

    async function _compositeFetchImage(url) {
        if (!url) throw new Error('无图片地址');
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return _compositeImageFromSrc(url);
        }
        try {
            const res = await fetch(url);
            if (res.ok) {
                const blob = await res.blob();
                if (blob.size > 64) {
                    const objUrl = URL.createObjectURL(blob);
                    _composite._objectUrls.push(objUrl);
                    return _compositeImageFromSrc(objUrl);
                }
            }
        } catch (_) { /* fall through */ }
        return _compositeImageFromSrc(url);
    }

    function _compositeGetResultUrl() {
        const url = dom.resultImage?.src;
        if (!url || dom.resultImage?.classList.contains('hidden')) return '';
        return url;
    }

    function _compositeUpdateThumbs() {
        if (dom.compositeBaseThumb) {
            const has = !!_composite.baseImg;
            dom.compositeBaseThumb.classList.toggle('hidden', !has);
            dom.compositeBaseEmpty?.classList.toggle('hidden', has);
            if (has) dom.compositeBaseThumb.src = _composite.baseImg.src;
        }
        if (dom.compositeOverlayThumb) {
            const has = !!_composite.overlayImg;
            dom.compositeOverlayThumb.classList.toggle('hidden', !has);
            dom.compositeOverlayEmpty?.classList.toggle('hidden', has);
            if (has) dom.compositeOverlayThumb.src = _composite.overlayImg.src;
        }
    }

    function _compositeSyncSlidersFromOverlay() {
        const o = _composite.overlay;
        if (dom.compositeOpacity) {
            dom.compositeOpacity.value = String(Math.round((o.opacity ?? 1) * 100));
            if (dom.compositeOpacityVal) dom.compositeOpacityVal.textContent = `${dom.compositeOpacity.value}%`;
        }
        if (dom.compositeRotation) {
            dom.compositeRotation.value = String(Math.round(o.rotation || 0));
            if (dom.compositeRotationVal) dom.compositeRotationVal.textContent = `${dom.compositeRotation.value}°`;
        }
    }

    function _compositeSyncOverlayFromSliders() {
        if (!_composite.overlay) return;
        if (dom.compositeOpacity) {
            _composite.overlay.opacity = Number(dom.compositeOpacity.value) / 100;
            if (dom.compositeOpacityVal) dom.compositeOpacityVal.textContent = `${dom.compositeOpacity.value}%`;
        }
        if (dom.compositeRotation) {
            _composite.overlay.rotation = Number(dom.compositeRotation.value);
            if (dom.compositeRotationVal) dom.compositeRotationVal.textContent = `${dom.compositeRotation.value}°`;
        }
    }

    function _compositeSetBase(img) {
        _composite.baseImg = img;
        _composite.baseW = img.naturalWidth;
        _composite.baseH = img.naturalHeight;
        _compositeUpdateThumbs();
        _compositeFitView();
        _compositeScheduleRender();
    }

    function _compositeSetOverlay(img, autoPlace = true) {
        _composite.overlayImg = img;
        if (autoPlace && _composite.baseImg) {
            _compositeFitOverlayHalf();
        }
        _compositeUpdateThumbs();
        _compositeSyncSlidersFromOverlay();
        _compositeScheduleRender();
    }

    function _compositeFitOverlayHalf() {
        if (!_composite.baseImg || !_composite.overlayImg) return;
        const bw = _composite.baseW;
        const bh = _composite.baseH;
        const iw = _composite.overlayImg.naturalWidth;
        const ih = _composite.overlayImg.naturalHeight;
        const target = Math.min(bw, bh) * 0.5;
        const s = target / Math.max(iw, ih);
        const w = iw * s;
        const h = ih * s;
        _composite.overlay = {
            x: (bw - w) / 2,
            y: (bh - h) / 2,
            w,
            h,
            rotation: _composite.overlay?.rotation || 0,
            opacity: _composite.overlay?.opacity ?? 1,
        };
        _compositeSyncSlidersFromOverlay();
    }

    function _compositeFitOverlayWidth() {
        if (!_composite.baseImg || !_composite.overlayImg) return;
        const bw = _composite.baseW;
        const bh = _composite.baseH;
        const iw = _composite.overlayImg.naturalWidth;
        const ih = _composite.overlayImg.naturalHeight;
        const w = bw;
        const h = ih * (w / iw);
        _composite.overlay = {
            x: 0,
            y: (bh - h) / 2,
            w,
            h,
            rotation: _composite.overlay?.rotation || 0,
            opacity: _composite.overlay?.opacity ?? 1,
        };
        _compositeSyncSlidersFromOverlay();
    }

    function _compositeAlign(mode) {
        if (!_composite.overlayImg || !_composite.baseImg) return;
        const o = _composite.overlay;
        const bw = _composite.baseW;
        const bh = _composite.baseH;
        switch (mode) {
            case 'left': o.x = 0; break;
            case 'right': o.x = bw - o.w; break;
            case 'top': o.y = 0; break;
            case 'bottom': o.y = bh - o.h; break;
            case 'hcenter': o.x = (bw - o.w) / 2; break;
            case 'vcenter': o.y = (bh - o.h) / 2; break;
            case 'center':
                o.x = (bw - o.w) / 2;
                o.y = (bh - o.h) / 2;
                break;
            default: break;
        }
        _compositeScheduleRender();
    }

    function _compositeSwapLayers() {
        if (!_composite.baseImg && !_composite.overlayImg) return;
        const tmpImg = _composite.baseImg;
        _composite.baseImg = _composite.overlayImg;
        _composite.overlayImg = tmpImg;
        if (_composite.baseImg) {
            _composite.baseW = _composite.baseImg.naturalWidth;
            _composite.baseH = _composite.baseImg.naturalHeight;
        } else {
            _composite.baseW = 0;
            _composite.baseH = 0;
        }
        if (_composite.overlayImg && _composite.baseImg) {
            _compositeFitOverlayHalf();
        } else if (_composite.overlayImg && !_composite.baseImg) {
            _composite.baseImg = _composite.overlayImg;
            _composite.overlayImg = null;
            _composite.baseW = _composite.baseImg.naturalWidth;
            _composite.baseH = _composite.baseImg.naturalHeight;
            _composite.overlay = { x: 0, y: 0, w: 0, h: 0, rotation: 0, opacity: 1 };
        }
        _compositeUpdateThumbs();
        _compositeFitView();
        _compositeScheduleRender();
    }

    function _compositeFitView() {
        const vp = dom.compositeViewport;
        if (!vp || !_composite.baseW || !_composite.baseH) return;
        const pad = 24;
        const vw = Math.max(1, vp.clientWidth - pad * 2);
        const vh = Math.max(1, vp.clientHeight - pad * 2);
        const s = Math.min(vw / _composite.baseW, vh / _composite.baseH, 1);
        _composite.scale = s;
        _composite.panX = (vp.clientWidth - _composite.baseW * s) / 2;
        _composite.panY = (vp.clientHeight - _composite.baseH * s) / 2;
        _compositeScheduleRender();
    }

    function _compositeZoomAt(clientX, clientY, factor) {
        const vp = dom.compositeViewport;
        if (!vp) return;
        const rect = vp.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const oldScale = _composite.scale;
        const newScale = Math.min(8, Math.max(0.05, oldScale * factor));
        const wx = (px - _composite.panX) / oldScale;
        const wy = (py - _composite.panY) / oldScale;
        _composite.scale = newScale;
        _composite.panX = px - wx * newScale;
        _composite.panY = py - wy * newScale;
        _compositeScheduleRender();
    }

    function _compositeClientToBase(clientX, clientY) {
        const vp = dom.compositeViewport?.getBoundingClientRect();
        if (!vp || _composite.scale < 0.001) return { x: 0, y: 0 };
        const px = clientX - vp.left;
        const py = clientY - vp.top;
        return {
            x: (px - _composite.panX) / _composite.scale,
            y: (py - _composite.panY) / _composite.scale,
        };
    }

    function _compositeWorldToLocal(nx, ny) {
        const o = _composite.overlay;
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const rad = -(o.rotation || 0) * Math.PI / 180;
        const dx = nx - cx;
        const dy = ny - cy;
        return {
            lx: dx * Math.cos(rad) - dy * Math.sin(rad),
            ly: dx * Math.sin(rad) + dy * Math.cos(rad),
        };
    }

    function _compositeGetOverlayCorners() {
        const o = _composite.overlay;
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const rad = (o.rotation || 0) * Math.PI / 180;
        const locals = [
            { x: -o.w / 2, y: -o.h / 2 },
            { x: o.w / 2, y: -o.h / 2 },
            { x: o.w / 2, y: o.h / 2 },
            { x: -o.w / 2, y: o.h / 2 },
        ];
        return locals.map((p) => ({
            x: cx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
            y: cy + p.x * Math.sin(rad) + p.y * Math.cos(rad),
        }));
    }

    function _compositeHitHandle(nx, ny) {
        const names = ['nw', 'ne', 'se', 'sw'];
        const corners = _compositeGetOverlayCorners();
        const threshold = 12 / _composite.scale;
        for (let i = 0; i < corners.length; i++) {
            const c = corners[i];
            if (Math.hypot(nx - c.x, ny - c.y) <= threshold) return names[i];
        }
        return null;
    }

    function _compositePointInOverlay(nx, ny) {
        const o = _composite.overlay;
        if (!o || o.w < 1 || o.h < 1) return false;
        const { lx, ly } = _compositeWorldToLocal(nx, ny);
        return Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.h / 2;
    }

    function _compositeIsPanMode(e) {
        return e.button === 1 || _composite.spaceHeld || (e.button === 0 && e.altKey);
    }

    function _compositeScheduleRender() {
        if (_composite._raf) return;
        _composite._raf = requestAnimationFrame(() => {
            _composite._raf = 0;
            _compositeRender();
        });
    }

    function _compositeDrawChecker(ctx, w, h) {
        const size = 16;
        for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
                const odd = ((x / size) + (y / size)) % 2;
                ctx.fillStyle = odd ? '#2a2a36' : '#1e1e28';
                ctx.fillRect(x, y, size, size);
            }
        }
    }

    function _compositeRender() {
        const canvas = dom.compositeCanvas;
        const vp = dom.compositeViewport;
        if (!canvas || !vp) return;

        const dpr = window.devicePixelRatio || 1;
        const vw = vp.clientWidth;
        const vh = vp.clientHeight;
        if (vw < 1 || vh < 1) return;

        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, vw, vh);
        ctx.fillStyle = '#0c0c14';
        ctx.fillRect(0, 0, vw, vh);

        if (!_composite.baseImg) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('请加载底图 B', vw / 2, vh / 2);
            return;
        }

        ctx.save();
        ctx.translate(_composite.panX, _composite.panY);
        ctx.scale(_composite.scale, _composite.scale);

        _compositeDrawChecker(ctx, _composite.baseW, _composite.baseH);
        ctx.drawImage(_composite.baseImg, 0, 0, _composite.baseW, _composite.baseH);

        if (_composite.showGuides) {
            ctx.save();
            ctx.strokeStyle = 'rgba(99, 179, 237, 0.55)';
            ctx.lineWidth = 1 / _composite.scale;
            ctx.setLineDash([6 / _composite.scale, 6 / _composite.scale]);
            ctx.beginPath();
            ctx.moveTo(_composite.baseW / 2, 0);
            ctx.lineTo(_composite.baseW / 2, _composite.baseH);
            ctx.moveTo(0, _composite.baseH / 2);
            ctx.lineTo(_composite.baseW, _composite.baseH / 2);
            ctx.stroke();
            ctx.restore();
        }

        if (_composite.overlayImg && _composite.overlay.w > 0 && _composite.overlay.h > 0) {
            const o = _composite.overlay;
            ctx.save();
            ctx.globalAlpha = o.opacity ?? 1;
            ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
            ctx.rotate((o.rotation || 0) * Math.PI / 180);
            ctx.drawImage(_composite.overlayImg, -o.w / 2, -o.h / 2, o.w, o.h);
            ctx.restore();

            const corners = _compositeGetOverlayCorners();
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 200, 80, 0.95)';
            ctx.lineWidth = 2 / _composite.scale;
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
            ctx.closePath();
            ctx.stroke();
            const r = 5 / _composite.scale;
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = 'rgba(255, 160, 40, 0.95)';
            corners.forEach((c) => {
                ctx.beginPath();
                ctx.rect(c.x - r, c.y - r, r * 2, r * 2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.restore();
        }

        ctx.restore();
    }

    async function _compositeRenderToCanvas() {
        if (!_composite.baseImg) throw new Error('请先加载底图');
        const c = document.createElement('canvas');
        c.width = _composite.baseW;
        c.height = _composite.baseH;
        const ctx = c.getContext('2d');
        ctx.drawImage(_composite.baseImg, 0, 0);
        if (_composite.overlayImg && _composite.overlay.w > 0 && _composite.overlay.h > 0) {
            const o = _composite.overlay;
            ctx.save();
            ctx.globalAlpha = o.opacity ?? 1;
            ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
            ctx.rotate((o.rotation || 0) * Math.PI / 180);
            ctx.drawImage(_composite.overlayImg, -o.w / 2, -o.h / 2, o.w, o.h);
            ctx.restore();
        }
        return c;
    }

    async function _compositeExportPng() {
        const c = await _compositeRenderToCanvas();
        const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('导出失败');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `composite_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('已导出合成图');
    }

    async function _compositeSaveToHistory() {
        const c = await _compositeRenderToCanvas();
        const dataUrl = c.toDataURL('image/png');
        saveToHistory(dataUrl);
        showToast('已保存到历史');
    }

    async function _compositeLoadBaseFromUrl(url) {
        const img = await _compositeFetchImage(url);
        _compositeSetBase(img);
    }

    async function _compositeLoadOverlayFromUrl(url, autoPlace = true) {
        const img = await _compositeFetchImage(url);
        _compositeSetOverlay(img, autoPlace);
    }

    async function _compositeLoadBaseFromFile(file) {
        const objUrl = URL.createObjectURL(file);
        _composite._objectUrls.push(objUrl);
        const img = await _compositeImageFromSrc(objUrl);
        _compositeSetBase(img);
    }

    async function _compositeLoadOverlayFromFile(file) {
        const objUrl = URL.createObjectURL(file);
        _composite._objectUrls.push(objUrl);
        const img = await _compositeImageFromSrc(objUrl);
        _compositeSetOverlay(img, true);
    }

    function _compositeClose() {
        dom.modalComposite?.classList.add('hidden');
        document.body.classList.remove('composite-open');
        _composite.drag = null;
        _composite.panning = false;
        dom.compositeViewport?.classList.remove('is-pan', 'is-move');
    }

    async function openCompositorModal(opts = {}) {
        if (!dom.modalComposite) return;
        dom.modalComposite.classList.remove('hidden');
        document.body.classList.add('composite-open');
        requestAnimationFrame(() => {
            _compositeFitView();
            _compositeScheduleRender();
        });

        if (opts.baseUrl) {
            try {
                await _compositeLoadBaseFromUrl(opts.baseUrl);
            } catch (e) {
                showToast(`底图加载失败: ${e.message}`);
            }
        }
        if (opts.overlayUrl) {
            try {
                await _compositeLoadOverlayFromUrl(opts.overlayUrl, true);
            } catch (e) {
                showToast(`叠加图加载失败: ${e.message}`);
            }
        }
    }

    function _compositeOnResizeDrag(nx, ny) {
        const start = _composite.drag.startOverlay;
        const o = _composite.overlay;
        const cx = start.x + start.w / 2;
        const cy = start.y + start.h / 2;
        const rad = -(start.rotation || 0) * Math.PI / 180;
        const dx = nx - cx;
        const dy = ny - cy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        let nw = Math.max(20, Math.abs(lx) * 2);
        let nh = Math.max(20, Math.abs(ly) * 2);
        if (_composite.drag.lockRatio) {
            const ratio = start.w / start.h;
            if (nw / nh > ratio) nw = nh * ratio;
            else nh = nw / ratio;
        }
        o.w = nw;
        o.h = nh;
        o.x = cx - nw / 2;
        o.y = cy - nh / 2;
        o.rotation = start.rotation;
    }

    function setupCompositor() {
        if (!dom.modalComposite) return;

        const wireOpen = (btn, factory) => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const opts = typeof factory === 'function' ? factory() : factory;
                if (opts === null) return;
                openCompositorModal(opts);
            });
        };

        dom.btnComposite?.addEventListener('click', () => openCompositorModal());

        wireOpen(dom.btnCompositeResult, () => {
            const url = _compositeGetResultUrl();
            if (!url) { alert('请先生成或选择一张结果图'); return null; }
            return { baseUrl: url };
        });

        wireOpen(dom.btnPreviewCompositeBase, () => {
            const url = dom.previewImage?.src;
            if (!url) return null;
            dom.modalPreview?.classList.add('hidden');
            return { baseUrl: url };
        });

        wireOpen(dom.btnPreviewCompositeOverlay, () => {
            const url = dom.previewImage?.src;
            if (!url) return null;
            dom.modalPreview?.classList.add('hidden');
            const open = dom.modalComposite?.classList.contains('hidden');
            if (open) return { overlayUrl: url };
            return { overlayUrl: url };
        });

        dom.btnCompositeClose?.addEventListener('click', _compositeClose);

        dom.btnCompositeFitView?.addEventListener('click', () => {
            _compositeFitView();
            _compositeScheduleRender();
        });

        dom.btnCompositeToggleGuides?.addEventListener('click', () => {
            _composite.showGuides = !_composite.showGuides;
            dom.btnCompositeToggleGuides?.classList.toggle('active', _composite.showGuides);
            _compositeScheduleRender();
        });

        dom.btnCompositeExport?.addEventListener('click', async () => {
            try {
                await _compositeExportPng();
            } catch (e) {
                alert(e.message);
            }
        });

        dom.btnCompositeSaveHistory?.addEventListener('click', async () => {
            try {
                await _compositeSaveToHistory();
            } catch (e) {
                alert(e.message);
            }
        });

        dom.btnCompositeLoadBase?.addEventListener('click', () => dom.inpCompositeBase?.click());
        dom.btnCompositeLoadOverlay?.addEventListener('click', () => dom.inpCompositeOverlay?.click());

        dom.btnCompositeBaseResult?.addEventListener('click', async () => {
            const url = _compositeGetResultUrl();
            if (!url) { alert('当前没有可用的生成结果'); return; }
            try {
                await _compositeLoadBaseFromUrl(url);
            } catch (e) {
                alert(e.message);
            }
        });

        dom.btnCompositeOverlayResult?.addEventListener('click', async () => {
            const url = _compositeGetResultUrl();
            if (!url) { alert('当前没有可用的生成结果'); return; }
            try {
                await _compositeLoadOverlayFromUrl(url, true);
            } catch (e) {
                alert(e.message);
            }
        });

        dom.inpCompositeBase?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
                await _compositeLoadBaseFromFile(file);
            } catch (err) {
                alert(err.message);
            }
        });

        dom.inpCompositeOverlay?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
                await _compositeLoadOverlayFromFile(file);
            } catch (err) {
                alert(err.message);
            }
        });

        dom.btnCompositeFitHalf?.addEventListener('click', () => {
            _compositeFitOverlayHalf();
            _compositeScheduleRender();
        });

        dom.btnCompositeFitWidth?.addEventListener('click', () => {
            _compositeFitOverlayWidth();
            _compositeScheduleRender();
        });

        dom.btnCompositeSwap?.addEventListener('click', () => _compositeSwapLayers());

        dom.compositeOpacity?.addEventListener('input', () => {
            _compositeSyncOverlayFromSliders();
            _compositeScheduleRender();
        });

        dom.compositeRotation?.addEventListener('input', () => {
            _compositeSyncOverlayFromSliders();
            _compositeScheduleRender();
        });

        document.querySelectorAll('.composite-align').forEach((btn) => {
            btn.addEventListener('click', () => {
                _compositeAlign(btn.dataset.align);
            });
        });

        window.addEventListener('keydown', (e) => {
            if (dom.modalComposite?.classList.contains('hidden')) return;
            if (e.code === 'Space' && !e.repeat) {
                _composite.spaceHeld = true;
                dom.compositeViewport?.classList.add('is-pan');
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                _composite.spaceHeld = false;
                dom.compositeViewport?.classList.remove('is-pan');
            }
        });

        const onPointerDown = (e) => {
            if (dom.modalComposite?.classList.contains('hidden')) return;
            const pt = e.touches ? e.touches[0] : e;
            if (_compositeIsPanMode(e)) {
                _composite.panning = true;
                _composite.panStartX = pt.clientX;
                _composite.panStartY = pt.clientY;
                _composite.panOriginX = _composite.panX;
                _composite.panOriginY = _composite.panY;
                dom.compositeViewport?.classList.add('is-pan');
                e.preventDefault();
                return;
            }
            if (!_composite.overlayImg || !_composite.baseImg) return;
            const { x, y } = _compositeClientToBase(pt.clientX, pt.clientY);
            const handle = _compositeHitHandle(x, y);
            if (handle) {
                _composite.drag = {
                    mode: `resize-${handle}`,
                    startX: x,
                    startY: y,
                    startOverlay: { ..._composite.overlay },
                    lockRatio: e.shiftKey,
                };
                e.preventDefault();
                return;
            }
            if (_compositePointInOverlay(x, y)) {
                _composite.drag = {
                    mode: 'move',
                    startX: x,
                    startY: y,
                    startOverlay: { ..._composite.overlay },
                };
                dom.compositeViewport?.classList.add('is-move');
                e.preventDefault();
            }
        };

        const onPointerMove = (e) => {
            if (dom.modalComposite?.classList.contains('hidden')) return;
            const pt = e.touches ? e.touches[0] : e;
            if (_composite.panning) {
                _composite.panX = _composite.panOriginX + (pt.clientX - _composite.panStartX);
                _composite.panY = _composite.panOriginY + (pt.clientY - _composite.panStartY);
                _compositeScheduleRender();
                e.preventDefault();
                return;
            }
            if (!_composite.drag) return;
            const { x, y } = _compositeClientToBase(pt.clientX, pt.clientY);
            const d = _composite.drag;
            if (d.mode === 'move') {
                const o = _composite.overlay;
                o.x = d.startOverlay.x + (x - d.startX);
                o.y = d.startOverlay.y + (y - d.startY);
                _compositeScheduleRender();
            } else if (d.mode.startsWith('resize-')) {
                _compositeOnResizeDrag(x, y);
                _compositeScheduleRender();
            }
            e.preventDefault();
        };

        const onPointerUp = () => {
            _composite.drag = null;
            _composite.panning = false;
            dom.compositeViewport?.classList.remove('is-move');
            if (!_composite.spaceHeld) dom.compositeViewport?.classList.remove('is-pan');
        };

        const vp = dom.compositeViewport;
        vp?.addEventListener('mousedown', onPointerDown);
        vp?.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        vp?.addEventListener('touchstart', onPointerDown, { passive: false });
        vp?.addEventListener('touchmove', onPointerMove, { passive: false });
        vp?.addEventListener('touchend', onPointerUp);
        vp?.addEventListener('touchcancel', onPointerUp);

        vp?.addEventListener('wheel', (e) => {
            if (dom.modalComposite?.classList.contains('hidden')) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            _compositeZoomAt(e.clientX, e.clientY, factor);
        }, { passive: false });

        window.addEventListener('resize', () => {
            if (!dom.modalComposite?.classList.contains('hidden')) {
                _compositeScheduleRender();
            }
        });
    }

    // ==================== 抠图（浏览器端） ====================
    const CUTOUT_LIB_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
    const CUTOUT_ADJUST_DEFAULTS = { shrink: 0, threshold: 12, feather: 0 };
    const _cutout = {
        lib: null,
        srcBlob: null,
        srcPreviewUrl: '',
        rawResultBlob: null,
        resultBlob: null,
        resultUrl: '',
        running: false,
        _revoke: [],
        _adjustTimer: 0,
    };

    function _cutoutRevoke() {
        _cutout._revoke.forEach((u) => URL.revokeObjectURL(u));
        _cutout._revoke = [];
    }

    function _cutoutTrackUrl(url) {
        if (url && url.startsWith('blob:')) _cutout._revoke.push(url);
        return url;
    }

    function _cutoutSetResultEnabled(on) {
        dom.btnCutoutComposite && (dom.btnCutoutComposite.disabled = !on);
        dom.btnCutoutDownload && (dom.btnCutoutDownload.disabled = !on);
        dom.btnCutoutHistory && (dom.btnCutoutHistory.disabled = !on);
    }

    function _cutoutResetResult() {
        if (_cutout.resultUrl) {
            URL.revokeObjectURL(_cutout.resultUrl);
        }
        _cutout.rawResultBlob = null;
        _cutout.resultBlob = null;
        _cutout.resultUrl = '';
        dom.cutoutResultPreview?.classList.add('hidden');
        dom.cutoutResultEmpty?.classList.remove('hidden');
        if (dom.cutoutResultPreview) dom.cutoutResultPreview.removeAttribute('src');
        dom.cutoutAdjustPanel?.classList.add('hidden');
        _cutoutSetResultEnabled(false);
    }

    function _cutoutGetSettings() {
        return {
            shrink: Number(dom.cutoutShrink?.value || 0),
            threshold: Number(dom.cutoutThreshold?.value || CUTOUT_ADJUST_DEFAULTS.threshold),
            feather: Number(dom.cutoutFeather?.value || 0),
        };
    }

    function _cutoutSyncAdjustLabels() {
        const s = _cutoutGetSettings();
        if (dom.cutoutShrinkVal) dom.cutoutShrinkVal.textContent = `${s.shrink}px`;
        if (dom.cutoutThresholdVal) dom.cutoutThresholdVal.textContent = String(s.threshold);
        if (dom.cutoutFeatherVal) dom.cutoutFeatherVal.textContent = `${s.feather}px`;
    }

    function _cutoutResetAdjustSliders() {
        if (dom.cutoutShrink) dom.cutoutShrink.value = String(CUTOUT_ADJUST_DEFAULTS.shrink);
        if (dom.cutoutThreshold) dom.cutoutThreshold.value = String(CUTOUT_ADJUST_DEFAULTS.threshold);
        if (dom.cutoutFeather) dom.cutoutFeather.value = String(CUTOUT_ADJUST_DEFAULTS.feather);
        _cutoutSyncAdjustLabels();
    }

    function _cutoutErodeAlpha(alpha, w, h, radius) {
        if (radius <= 0) return alpha;
        let src = alpha;
        for (let iter = 0; iter < radius; iter++) {
            const dst = new Uint8ClampedArray(src.length);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let minA = 255;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                minA = Math.min(minA, src[ny * w + nx]);
                            }
                        }
                    }
                    dst[y * w + x] = minA;
                }
            }
            src = dst;
        }
        return src;
    }

    function _cutoutBlurAlpha(alpha, w, h, radius) {
        if (radius <= 0) return alpha;
        let src = alpha;
        for (let pass = 0; pass < 2; pass++) {
            const dst = new Uint8ClampedArray(src.length);
            const r = Math.max(1, radius);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let sum = 0;
                    let count = 0;
                    for (let dx = -r; dx <= r; dx++) {
                        const nx = x + dx;
                        if (nx >= 0 && nx < w) {
                            sum += src[y * w + nx];
                            count++;
                        }
                    }
                    dst[y * w + x] = Math.round(sum / count);
                }
            }
            src = dst;
            const dst2 = new Uint8ClampedArray(src.length);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    let sum = 0;
                    let count = 0;
                    for (let dy = -r; dy <= r; dy++) {
                        const ny = y + dy;
                        if (ny >= 0 && ny < h) {
                            sum += src[ny * w + x];
                            count++;
                        }
                    }
                    dst2[y * w + x] = Math.round(sum / count);
                }
            }
            src = dst2;
        }
        return src;
    }

    async function _cutoutRefineBlob(blob, settings = _cutoutGetSettings()) {
        const bitmap = await createImageBitmap(blob);
        const w = bitmap.width;
        const h = bitmap.height;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const alpha = new Uint8ClampedArray(w * h);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];

        const cutoff = Math.round((settings.threshold / 80) * 255);
        for (let i = 0; i < alpha.length; i++) {
            if (alpha[i] < cutoff) alpha[i] = 0;
        }

        let refined = _cutoutErodeAlpha(alpha, w, h, settings.shrink);
        refined = _cutoutBlurAlpha(refined, w, h, settings.feather);

        for (let i = 0; i < alpha.length; i++) {
            data[i * 4 + 3] = refined[i];
        }
        ctx.putImageData(imageData, 0, 0);
        return new Promise((resolve, reject) => {
            c.toBlob((b) => (b ? resolve(b) : reject(new Error('边缘调节失败'))), 'image/png');
        });
    }

    async function _cutoutApplyAdjustments() {
        if (!_cutout.rawResultBlob) return;
        const refined = await _cutoutRefineBlob(_cutout.rawResultBlob);
        if (_cutout.resultUrl) URL.revokeObjectURL(_cutout.resultUrl);
        _cutout.resultBlob = refined;
        _cutout.resultUrl = URL.createObjectURL(refined);
        if (dom.cutoutResultPreview) {
            dom.cutoutResultPreview.src = _cutout.resultUrl;
            dom.cutoutResultPreview.classList.remove('hidden');
        }
        dom.cutoutResultEmpty?.classList.add('hidden');
        dom.cutoutAdjustPanel?.classList.remove('hidden');
        _cutoutSetResultEnabled(true);
    }

    function _cutoutScheduleAdjust() {
        if (!_cutout.rawResultBlob) return;
        clearTimeout(_cutout._adjustTimer);
        _cutout._adjustTimer = setTimeout(() => {
            _cutoutApplyAdjustments().catch((e) => console.warn('[Cutout] adjust failed', e));
        }, 60);
    }

    async function _cutoutFinalizeResult(rawBlob) {
        _cutout.rawResultBlob = rawBlob;
        await _cutoutApplyAdjustments();
        return _cutout.resultBlob;
    }

    function _cutoutShowProgress(show, text, pct) {
        dom.cutoutProgress?.classList.toggle('hidden', !show);
        if (typeof pct === 'number' && dom.cutoutProgressBar) {
            dom.cutoutProgressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        }
        if (text && dom.cutoutProgressText) dom.cutoutProgressText.textContent = text;
    }

    async function _cutoutEnsureLib() {
        if (_cutout.lib) return _cutout.lib;
        _cutoutShowProgress(true, '正在加载抠图引擎…', 5);
        const mod = await import(/* @vite-ignore */ CUTOUT_LIB_URL);
        const fn = mod.removeBackground || mod.default;
        if (typeof fn !== 'function') throw new Error('抠图引擎加载失败');
        _cutout.lib = fn;
        return fn;
    }

    async function _cutoutUrlToBlob(url) {
        if (!url) throw new Error('无图片地址');
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            const res = await fetch(url);
            return res.blob();
        }
        try {
            const res = await fetch(url);
            if (res.ok) {
                const blob = await res.blob();
                if (blob.size > 64) return blob;
            }
        } catch (_) { /* fall through */ }
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    c.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('图片读取失败'));
                    }, 'image/png');
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('图片加载失败（可能跨域）'));
            img.src = url;
        });
    }

    async function _cutoutLoadSource(urlOrFile) {
        _cutoutResetResult();
        let blob;
        let previewUrl;
        if (urlOrFile instanceof File || urlOrFile instanceof Blob) {
            blob = urlOrFile instanceof File ? urlOrFile : urlOrFile;
            previewUrl = _cutoutTrackUrl(URL.createObjectURL(blob));
        } else {
            blob = await _cutoutUrlToBlob(urlOrFile);
            previewUrl = _cutoutTrackUrl(URL.createObjectURL(blob));
        }
        _cutout.srcBlob = blob;
        _cutout.srcPreviewUrl = previewUrl;
        if (dom.cutoutSrcPreview) {
            dom.cutoutSrcPreview.src = previewUrl;
            dom.cutoutSrcPreview.classList.remove('hidden');
        }
        dom.cutoutSrcEmpty?.classList.add('hidden');
    }

    async function _cutoutProcessBlob(blob) {
        const removeBackground = await _cutoutEnsureLib();
        _cutoutShowProgress(true, '正在抠图…', 10);
        const result = await removeBackground(blob, {
            progress: (key, current, total) => {
                const pct = total > 0 ? Math.round((current / total) * 100) : 0;
                const label = key === 'fetch' || key === 'fetch:wasm'
                    ? `下载模型资源 ${pct}%`
                    : `AI 处理中 ${pct}%`;
                _cutoutShowProgress(true, label, pct);
            },
        });
        if (!(result instanceof Blob) || result.size < 64) {
            throw new Error('抠图结果无效');
        }
        return result;
    }

    async function _cutoutRun() {
        if (_cutout.running) return;
        if (!_cutout.srcBlob) {
            alert('请先选择一张图片');
            return;
        }
        _cutout.running = true;
        _cutoutResetResult();
        if (dom.btnCutoutRun) {
            dom.btnCutoutRun.disabled = true;
            dom.btnCutoutRun.textContent = '处理中…';
        }
        try {
            const result = await _cutoutProcessBlob(_cutout.srcBlob);
            await _cutoutFinalizeResult(result);
            _cutoutShowProgress(false);
            showToast('抠图完成，可拖动滑块微调边缘');
        } catch (e) {
            console.error('[Cutout]', e);
            _cutoutShowProgress(false);
            alert(`抠图失败: ${e.message}`);
        } finally {
            _cutout.running = false;
            if (dom.btnCutoutRun) {
                dom.btnCutoutRun.disabled = false;
                dom.btnCutoutRun.textContent = '开始抠图';
            }
        }
    }

    function _cutoutClose() {
        dom.modalCutout?.classList.add('hidden');
        _cutoutShowProgress(false);
    }

    async function openCutoutModal(opts = {}) {
        if (!dom.modalCutout) return;
        dom.modalCutout.classList.remove('hidden');
        _cutoutShowProgress(false);
        if (opts.imageUrl) {
            try {
                await _cutoutLoadSource(opts.imageUrl);
            } catch (e) {
                showToast(`图片加载失败: ${e.message}`);
            }
        }
        if (opts.autoRun && _cutout.srcBlob) {
            await _cutoutRun();
        }
    }

    async function _compositeCutoutOverlay() {
        if (!_composite.overlayImg) {
            alert('请先加载叠加图 A');
            return;
        }
        if (_cutout.running) return;
        const btn = dom.btnCompositeCutoutOverlay;
        const oldText = btn?.textContent;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '抠图中…';
        }
        try {
            const c = document.createElement('canvas');
            c.width = _composite.overlayImg.naturalWidth;
            c.height = _composite.overlayImg.naturalHeight;
            c.getContext('2d').drawImage(_composite.overlayImg, 0, 0);
            const blob = await new Promise((resolve, reject) => {
                c.toBlob((b) => (b ? resolve(b) : reject(new Error('读取叠加图失败'))), 'image/png');
            });
            showToast('正在抠图，请稍候…');
            const raw = await _cutoutProcessBlob(blob);
            const result = await _cutoutRefineBlob(raw, _cutoutGetSettings());
            const objUrl = URL.createObjectURL(result);
            _composite._objectUrls.push(objUrl);
            const img = await _compositeImageFromSrc(objUrl);
            const prev = { ..._composite.overlay };
            _composite.overlayImg = img;
            _composite.overlay = { ...prev };
            _compositeUpdateThumbs();
            _compositeScheduleRender();
            showToast('叠加图 A 已去背景');
        } catch (e) {
            console.error('[Cutout][Composite]', e);
            alert(`抠图失败: ${e.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = oldText || '抠图 A（去背景）';
            }
        }
    }

    function setupCutout() {
        if (!dom.modalCutout) return;

        const wireOpen = (btn, factory) => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const opts = typeof factory === 'function' ? factory() : factory;
                if (opts === null) return;
                openCutoutModal(opts);
            });
        };

        dom.btnCutout?.addEventListener('click', () => openCutoutModal());

        wireOpen(dom.btnCutoutResult, () => {
            const url = _compositeGetResultUrl();
            if (!url) { alert('请先生成或选择一张结果图'); return null; }
            return { imageUrl: url };
        });

        wireOpen(dom.btnPreviewCutout, () => {
            const url = dom.previewImage?.src;
            if (!url) return null;
            dom.modalPreview?.classList.add('hidden');
            return { imageUrl: url };
        });

        dom.btnCutoutClose?.addEventListener('click', _cutoutClose);
        dom.modalCutout?.addEventListener('click', (e) => {
            if (e.target === dom.modalCutout) _cutoutClose();
        });

        dom.btnCutoutLoad?.addEventListener('click', () => dom.inpCutout?.click());
        dom.inpCutout?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
                await _cutoutLoadSource(file);
            } catch (err) {
                alert(err.message);
            }
        });

        dom.btnCutoutFromResult?.addEventListener('click', async () => {
            const url = _compositeGetResultUrl();
            if (!url) { alert('当前没有可用的生成结果'); return; }
            try {
                await _cutoutLoadSource(url);
            } catch (e) {
                alert(e.message);
            }
        });

        dom.btnCutoutRun?.addEventListener('click', () => _cutoutRun());

        ['cutout-shrink', 'cutout-threshold', 'cutout-feather'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => {
                _cutoutSyncAdjustLabels();
                _cutoutScheduleAdjust();
            });
        });

        dom.btnCutoutResetAdjust?.addEventListener('click', () => {
            _cutoutResetAdjustSliders();
            _cutoutScheduleAdjust();
        });

        _cutoutSyncAdjustLabels();

        dom.btnCutoutDownload?.addEventListener('click', () => {
            if (!_cutout.resultUrl) return;
            const a = document.createElement('a');
            a.href = _cutout.resultUrl;
            a.download = `cutout_${Date.now()}.png`;
            a.click();
        });

        dom.btnCutoutHistory?.addEventListener('click', async () => {
            if (!_cutout.resultBlob) return;
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('读取失败'));
                reader.readAsDataURL(_cutout.resultBlob);
            });
            saveToHistory(dataUrl);
            showToast('已保存到历史');
        });

        dom.btnCutoutComposite?.addEventListener('click', () => {
            if (!_cutout.resultUrl) return;
            _cutoutClose();
            openCompositorModal({ overlayUrl: _cutout.resultUrl });
            showToast('已送入图层合成（作为叠加 A）');
        });

        dom.btnCompositeCutoutOverlay?.addEventListener('click', () => _compositeCutoutOverlay());
    }

    // ==================== 生图流程 ====================
    let _postPreviewResolver = null;

    function needsPostPreviewGate() {
        return !!(dom.chkPostPreview?.checked && (dom.chkHires.checked || dom.chkAdetailer.checked));
    }

    function showPostPreviewModal(imageUrl) {
        return new Promise((resolve) => {
            if (!dom.modalPostPreview || !dom.postPreviewImg) {
                resolve('continue');
                return;
            }
            dom.postPreviewImg.src = imageUrl;
            dom.modalPostPreview.classList.remove('hidden');
            dom.btnGenerate.textContent = '等待确认底图...';
            setProgress(100);
            _postPreviewResolver = resolve;
        });
    }

    function resolvePostPreview(decision) {
        dom.modalPostPreview?.classList.add('hidden');
        if (_postPreviewResolver) {
            _postPreviewResolver(decision);
            _postPreviewResolver = null;
        }
    }

    function beginGenerationUI() {
        _gen.active = true;
        _gen.startAt = Date.now();
        _gen.runningAt = 0;
        _gen.lastPct = 0;
        _gen.hasRealtimeProgress = false;
        _hideLivePreview();
        _syncFab(0);
        dom.btnGenerate.disabled = true;
        dom.btnGenerate.textContent = '生成中...';
        dom.progressContainer.classList.remove('hidden');
        dom.resultPlaceholder.classList.remove('hidden');
        dom.resultPlaceholder.textContent = '正在生成中，预览将显示在这里';
        dom.resultImage.classList.add('hidden');
        dom.resultActions.classList.add('hidden');
        // 点击生成后立即进入“结果界面”大小，方便在预览过程中也能看到同样的区域
        updateMobileResultUI(true);
        // 在已切换结果界面尺寸/expanded 状态之后，再次滚动到目标位置，确保“点生成立刻到底”
        try { scrollToResultBottom(); } catch { /* ignore */ }
        setProgress(0);
    }

    function endGenerationUI() {
        _gen.active = false;
        _gen.promptId = null;
        _gen.hasRealtimeProgress = false;
        _closePreviewWS();
        _hideLivePreview();
        _syncFab(0);
        _setTitleProgress(0, '');
        dom.btnGenerate.disabled = false;
        dom.btnGenerate.textContent = '生成图片';
        dom.progressContainer.classList.add('hidden');
    }

    function resetStageProgress(label) {
        _gen.lastPct = 0;
        _gen.hasRealtimeProgress = false;
        _gen.runningAt = 0;
        _hideLivePreview();
        setProgress(0);
        dom.btnGenerate.textContent = label;
    }

    async function collectUploadedImages() {
        const uploadedImages = {};

        if (dom.chkControlnet.checked && !isAnimaMode() && dom.inpCnImage.files[0]) {
            const res = await uploadImage(dom.inpCnImage.files[0]);
            uploadedImages.controlnet = res.name;
        }

        if (dom.chkImg2img.checked) {
            if (dom.inpRefImage.files[0]) {
                const res = await uploadImage(dom.inpRefImage.files[0]);
                uploadedImages.img2img = res.name;
            } else if (refImageUrl) {
                const res = await uploadImageFromUrl(refImageUrl);
                uploadedImages.img2img = res.name;
            }
        }

        if (dom.chkIpadapter?.checked && dom.inpIpaImage.files[0] && !isAnimaMode()) {
            const res = await uploadImage(dom.inpIpaImage.files[0]);
            uploadedImages.ipadapter = res.name;
        }

        return uploadedImages;
    }

    async function runPromptWorkflow(workflowBuilt, fetchOpts = {}) {
        const payload = {
            prompt: workflowBuilt.prompt,
            client_id: _gen.wsClientId || (`cw_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`),
            extra_data: _promptExtraData(),
        };
        _gen.wsClientId = payload.client_id;
        _connectPreviewWS();
        const result = await apiPost('/prompt', payload);
        _gen.promptId = result.prompt_id;
        return await pollProgress(result.prompt_id, fetchOpts);
    }

    async function runGatedGeneration(uploadedImages) {
        let seedOverride;

        while (true) {
            resetStageProgress('生成底图中...');
            const baseWorkflow = buildWorkflow(uploadedImages, { stage: 'base', seedOverride });
            const baseResult = await runPromptWorkflow(baseWorkflow, { expectBase: true });
            if (!baseResult?.url) throw new Error('未能获取底图预览');

            const decision = await showPostPreviewModal(baseResult.url);
            if (decision === 'cancel') return;

            if (decision === 'regenerate') {
                if (parseInt(dom.inpSeed.value) === -1) {
                    seedOverride = undefined;
                } else {
                    seedOverride = ((baseWorkflow.actualSeed + 1) >>> 0);
                    dom.inpSeed.value = String(seedOverride);
                }
                continue;
            }

            if (decision === 'continue') {
                resetStageProgress('上传底图中...');
                const inputImageName = await uploadBaseImageForPost(baseResult);
                resetStageProgress('后处理中...');
                const postWorkflow = buildWorkflow(uploadedImages, {
                    stage: 'post',
                    baseImageName: inputImageName,
                    seedOverride: baseWorkflow.actualSeed,
                });
                await runPromptWorkflow(postWorkflow);
                return;
            }
        }
    }

    async function generate() {
        beginGenerationUI();

        try {
            const uploadedImages = await collectUploadedImages();

            if (needsPostPreviewGate()) {
                await runGatedGeneration(uploadedImages);
            } else {
                const workflow = buildWorkflow(uploadedImages);
                await runPromptWorkflow(workflow);
            }
        } catch (e) {
            let msg = e.message || String(e);
            if (/Invalid image file|CW_Base_/i.test(msg)) {
                msg += '（底图需先上传到 input；请 Ctrl+F5 强刷到 v3.75+）';
            }
            alert('生图失败: ' + msg);
            console.error(e);
        } finally {
            resolvePostPreview('cancel');
            endGenerationUI();
        }
    }

    async function pollProgress(promptId, fetchOpts = {}) {
        const startTime = Date.now();
        const TIMEOUT = 300000;

        while (Date.now() - startTime < TIMEOUT) {
            try {
                const res = await fetch(`${getServer()}/history/${promptId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data[promptId] && data[promptId].outputs) {
                        setProgress(100);
                        return await fetchResult(promptId, fetchOpts);
                    }
                }

                const queueRes = await fetch(`${getServer()}/queue`);
                if (queueRes.ok) {
                    const queue = await queueRes.json();
                    const running = queue.queue_running || [];
                    const current = running.find(item => item[1] === promptId);
                    if (current) {
                        if (!_gen.runningAt) _gen.runningAt = Date.now();
                        if (!_gen.hasRealtimeProgress) {
                            const elapsed = Date.now() - (_gen.runningAt || _gen.startAt || Date.now());
                            const fallbackPct = Math.min(92, 8 + Math.floor(elapsed / 1500) * 3);
                            setProgress(Math.max(_gen.lastPct, fallbackPct));
                        }
                    }
                }
            } catch (e) {
                // network hiccup, retry
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        throw new Error('生图超时（5分钟）');
    }

    let lastBeforeImage = null;
    let lastAfterImage = null;

    async function fetchResult(promptId, opts = {}) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const history = await apiGet(`/history/${promptId}`);
            const outputs = history[promptId]?.outputs;
            if (!outputs) { await new Promise(r => setTimeout(r, 1000)); continue; }

            let mainImage = null;
            let beforeImage = null;
            let previewImage = null;
            let baseGateImage = null;
            let baseGateMeta = null;

            for (const nodeId of Object.keys(outputs)) {
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                    for (const img of nodeOutput.images) {
                        const url = `${getServer()}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                        if (img.filename.startsWith('CN_Preview')) {
                            previewImage = url;
                        } else if (img.filename.startsWith('CW_Base')) {
                            baseGateImage = url;
                            baseGateMeta = img;
                        } else if (img.filename.startsWith('CW_Before')) {
                            beforeImage = url;
                        } else if (!img.filename.startsWith('CW_Base')) {
                            mainImage = url;
                        }
                    }
                }
            }

            if (previewImage && dom.cnProcessedImg) {
                dom.cnProcessedImg.src = previewImage;
                dom.cnProcessedPreview.classList.remove('hidden');
            }

            if (opts.expectBase) {
                if (baseGateImage) {
                    return {
                        url: baseGateImage,
                        filename: baseGateMeta.filename,
                        meta: baseGateMeta,
                    };
                }
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            lastBeforeImage = beforeImage;
            lastAfterImage = mainImage;

            if (mainImage) {
                showResult(mainImage, !!beforeImage);
                return { url: mainImage, hasCompare: !!beforeImage };
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    function scrollToResultBottom() {
        // “点击生成立刻跳到结果界面”：这里优先定位到结果区本体，而不是等待出图后再滚。
        const wrapper = dom.resultWrapper;
        const content = dom.content;
        const resultArea = dom.resultArea;

        const doNow = () => {
            if (content && resultArea) {
                const next = Math.max(0, resultArea.offsetTop - 8);
                content.scrollTop = next;
            } else if (resultArea) {
                resultArea.scrollIntoView({ block: 'start', behavior: 'auto' });
            }

            if (wrapper) {
                wrapper.scrollTop = 0;
            }
        };

        doNow();
        requestAnimationFrame(doNow);
        setTimeout(doNow, 180);
    }

    function showResult(url, hasCompare) {
        dom.resultImage.src = url;
        dom.resultImage.classList.remove('hidden');
        dom.resultPlaceholder.classList.add('hidden');
        dom.resultActions.classList.remove('hidden');
        dom.btnCompare.classList.toggle('hidden', !hasCompare);
        updateMobileResultUI(true);
    }

    // ==================== 图片对比滑块 ====================
    function openCompare() {
        if (!lastBeforeImage || !lastAfterImage) return;
        dom.compareBefore.src = lastBeforeImage;
        dom.compareAfter.src = lastAfterImage;
        dom.modalCompare.classList.remove('hidden');
        setComparePosition(50);
    }

    function setComparePosition(pct) {
        pct = Math.max(0, Math.min(100, pct));
        dom.compareBefore.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        dom.compareSlider.style.left = pct + '%';
    }

    function setupCompareSlider() {
        function getPercent(e) {
            const rect = dom.compareContainer.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            return ((clientX - rect.left) / rect.width) * 100;
        }

        dom.compareContainer.addEventListener('mousemove', (e) => {
            setComparePosition(getPercent(e));
        });
        dom.compareContainer.addEventListener('touchmove', (e) => {
            setComparePosition(getPercent(e));
        }, { passive: true });
    }

    function setProgress(pct) {
        const v = Math.max(0, Math.min(100, Math.round(pct || 0)));
        const next = _gen.active ? Math.max(_gen.lastPct || 0, v) : v;
        if (_gen.active) _gen.lastPct = next;
        dom.progressBar.style.width = next + '%';

        let suffix = '';
        if (_gen.active && _gen.startAt) {
            const now = Date.now();
            const total = now - _gen.startAt;
            if (_gen.runningAt) {
                const queueMs = Math.max(0, _gen.runningAt - _gen.startAt);
                const genMs = Math.max(0, now - _gen.runningAt);
                suffix = ` · 排队${_fmtMs(queueMs)} 生成${_fmtMs(genMs)}`;
            } else {
                suffix = ` · 已用${_fmtMs(total)}`;
            }
        }
        dom.progressText.textContent = `${next}%${suffix}`;

        if (_gen.active) {
            _syncFab(next);
            _setTitleProgress(next, _gen.runningAt ? '生成中' : '排队中');
        }
    }

    // ==================== 历史管理 ====================
    const HISTORY_BATCH = 40;
    const HISTORY_IDB_KEY = 'comfyui_history';
    let historyRenderedCount = 0;
    let historyScrollObserver = null;
    let _historyMem = null;
    let _historyLoadPromise = null;

    function ensureHistoryLoaded() {
        if (_historyLoadPromise) return _historyLoadPromise;
        _historyLoadPromise = (async () => {
            if (_historyMem) return _historyMem;
            const fromIdb = typeof _bigCacheGet === 'function'
                ? await _bigCacheGet(HISTORY_IDB_KEY)
                : null;
            if (Array.isArray(fromIdb)) {
                _historyMem = fromIdb;
                return _historyMem;
            }
            try {
                const legacy = JSON.parse(localStorage.getItem('comfyui_history') || '[]');
                _historyMem = Array.isArray(legacy) ? legacy : [];
                if (_historyMem.length && typeof _bigCacheSet === 'function') {
                    await _bigCacheSet(HISTORY_IDB_KEY, _historyMem);
                }
                if (_historyMem.length) {
                    try { localStorage.removeItem('comfyui_history'); } catch { /* ignore */ }
                }
            } catch {
                _historyMem = [];
            }
            if (!_historyMem) _historyMem = [];
            return _historyMem;
        })();
        return _historyLoadPromise;
    }

    function getHistory() {
        return _historyMem || [];
    }

    async function persistHistory(history) {
        _historyMem = history;
        if (typeof _bigCacheSet !== 'function') {
            try {
                localStorage.setItem('comfyui_history', JSON.stringify(history));
                return true;
            } catch (e) {
                console.warn('[History] localStorage full:', e.message);
                return false;
            }
        }
        let trimmed = history;
        let ok = await _bigCacheSet(HISTORY_IDB_KEY, trimmed);
        while (!ok && trimmed.length > 1) {
            trimmed = trimmed.slice(0, -1);
            _historyMem = trimmed;
            ok = await _bigCacheSet(HISTORY_IDB_KEY, trimmed);
        }
        if (!ok) return false;
        try { localStorage.removeItem('comfyui_history'); } catch { /* ignore */ }
        return true;
    }

    function pickHistoryUrl(url, meta = {}) {
        const candidates = [meta.persistUrl, meta.remoteUrl, url].filter(Boolean);
        for (const u of candidates) {
            if (typeof u === 'string' && !u.startsWith('data:') && u.length < 4000) return u;
        }
        return url;
    }

    function prependHistoryUI(entry, historyLength) {
        if (!dom.historyGrid) return;
        if (historyRenderedCount > 0) {
            dom.historyGrid.insertBefore(createHistoryItemElement(entry), dom.historyGrid.firstChild);
            historyRenderedCount += 1;
            ensureHistorySentinel(historyLength);
        } else {
            renderHistory({ reset: true });
        }
    }

    function createHistoryItemElement(item) {
        const displayUrl = item.fullUrl || item.url;
        const div = document.createElement('div');
        div.className = 'history-item';
        const img = document.createElement('img');
        img.src = displayUrl;
        img.alt = '历史图片';
        img.loading = 'lazy';
        div.appendChild(img);
        const overlay = document.createElement('div');
        overlay.className = 'history-overlay';
        overlay.innerHTML = '<button class="btn-history-ref" title="用作参考图">📌</button><button class="btn-history-inpaint" title="局部重绘">🖌</button><button class="btn-history-composite" title="图层合成">🧩</button><button class="btn-history-cutout" title="抠图">✂️</button>';
        overlay.querySelector('.btn-history-ref').addEventListener('click', (e) => {
            e.stopPropagation();
            useImageAsRef(displayUrl);
        });
        overlay.querySelector('.btn-history-inpaint').addEventListener('click', (e) => {
            e.stopPropagation();
            openInpaintModal(displayUrl);
        });
        overlay.querySelector('.btn-history-composite').addEventListener('click', (e) => {
            e.stopPropagation();
            openCompositorModal({ baseUrl: displayUrl });
        });
        overlay.querySelector('.btn-history-cutout').addEventListener('click', (e) => {
            e.stopPropagation();
            openCutoutModal({ imageUrl: displayUrl });
        });
        div.appendChild(overlay);
        div.addEventListener('click', () => {
            dom.previewImage.src = displayUrl;
            dom.modalPreview.classList.remove('hidden');
        });
        return div;
    }

    function removeHistorySentinel() {
        dom.historyGrid?.querySelector('.history-sentinel')?.remove();
    }

    function ensureHistorySentinel(historyLength) {
        if (!dom.historyGrid) return;
        removeHistorySentinel();
        if (historyRenderedCount >= historyLength) return;
        const sentinel = document.createElement('div');
        sentinel.className = 'history-sentinel';
        sentinel.setAttribute('aria-hidden', 'true');
        dom.historyGrid.appendChild(sentinel);
        if (!historyScrollObserver) {
            historyScrollObserver = new IntersectionObserver((entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    renderHistory({ append: true });
                }
            }, { root: dom.historyGrid, rootMargin: '120px' });
        }
        historyScrollObserver.observe(sentinel);
    }

    function saveToHistory(url, meta = {}) {
        const storeUrl = pickHistoryUrl(url, meta);
        const entry = { url: storeUrl, time: Date.now(), ...meta };
        if (storeUrl !== url) entry.fullUrl = url;
        (async () => {
            await ensureHistoryLoaded();
            const history = [...getHistory()];
            history.unshift(entry);
            const ok = await persistHistory(history);
            if (!ok) {
                showToast('历史保存失败（存储空间不足）', 2200);
                return;
            }
            prependHistoryUI(entry, history.length);
        })().catch((e) => {
            console.warn('[History] save failed:', e);
            showToast('历史保存失败', 2000);
        });
    }

    function clearHistory() {
        (async () => {
            await ensureHistoryLoaded();
            await persistHistory([]);
            renderHistory({ reset: true });
        })().catch((e) => console.warn('[History] clear failed:', e));
    }

    function renderHistory({ reset = false, append = false } = {}) {
        if (!dom.historyGrid) return;
        const history = getHistory();
        if (reset || (!append && historyRenderedCount === 0)) {
            historyScrollObserver?.disconnect();
            historyScrollObserver = null;
            dom.historyGrid.innerHTML = '';
            historyRenderedCount = 0;
        }
        if (!history.length) return;
        const nextEnd = Math.min(historyRenderedCount + HISTORY_BATCH, history.length);
        const frag = document.createDocumentFragment();
        for (let i = historyRenderedCount; i < nextEnd; i++) {
            frag.appendChild(createHistoryItemElement(history[i]));
        }
        dom.historyGrid.appendChild(frag);
        historyRenderedCount = nextEnd;
        ensureHistorySentinel(history.length);
    }

    // ==================== ControlNet 预览 ====================
    async function previewControlNet() {
        if (!dom.inpCnImage.files[0]) {
            alert('请先上传控制图片');
            return;
        }

        dom.btnCnPreview.disabled = true;
        dom.btnCnPreview.textContent = '处理中...';

        try {
            const uploaded = await uploadImage(dom.inpCnImage.files[0]);
            const cnName = dom.selControlnet.value.toLowerCase();

            let prepClass = 'CannyEdgePreprocessor';
            let prepInputs = { image: ['1', 0] };

            if (cnName.includes('openpose')) {
                prepClass = 'OpenposePreprocessor';
                prepInputs = { image: ['1', 0] };
            } else if (cnName.includes('depth')) {
                prepClass = 'DepthAnythingV2Preprocessor';
                prepInputs = { image: ['1', 0] };
            } else if (cnName.includes('scribble') || cnName.includes('lineart')) {
                prepClass = 'LineArtPreprocessor';
                prepInputs = { image: ['1', 0] };
            }

            const workflow = {
                prompt: {
                    '1': { class_type: 'LoadImage', inputs: { image: uploaded.name } },
                    '2': { class_type: prepClass, inputs: prepInputs },
                    '3': { class_type: 'SaveImage', inputs: { filename_prefix: getSaveImagePrefix('CN_Preview'), images: ['2', 0] } },
                },
            };

            const result = await apiPost('/prompt', workflow);
            const promptId = result.prompt_id;

            // Poll until done
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 500));
                const hist = await apiGet(`/history/${promptId}`);
                if (hist[promptId]?.outputs) {
                    const outputs = hist[promptId].outputs;
                    for (const nid of Object.keys(outputs)) {
                        if (outputs[nid].images?.length > 0) {
                            const img = outputs[nid].images[0];
                            const url = `${getServer()}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                            dom.cnProcessedImg.src = url;
                            dom.cnProcessedPreview.classList.remove('hidden');
                            return;
                        }
                    }
                }
            }
            alert('预览超时');
        } catch (e) {
            alert('预览失败: ' + e.message);
        } finally {
            dom.btnCnPreview.disabled = false;
            dom.btnCnPreview.textContent = '🔍 预览底图';
        }
    }

    // ==================== 事件绑定 ====================
    function bindEvents() {
        dom.btnGenerate.addEventListener('click', generateDispatch);

        dom.btnRandomSeed.addEventListener('click', () => {
            dom.inpSeed.value = Math.floor(Math.random() * 2 ** 32);
        });

        dom.btnDownload.addEventListener('click', async () => {
            const url = dom.resultImage?.src;
            if (!url) return;
            try {
                dom.btnDownload.disabled = true;
                dom.btnDownload.textContent = '下载中...';
                await downloadComfyImageAsFile(url, `comfyui_${Date.now()}`);
            } catch (e) {
                console.warn('[Download] failed:', e);
                showToast('下载失败，请稍后重试或右键另存为。');
                // 兜底：尝试使用 <a download> 直链下载（若浏览器不支持 download，则可能在当前页打开）
                try {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `comfyui_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch { /* ignore */ }
            } finally {
                dom.btnDownload.disabled = false;
                dom.btnDownload.textContent = '下载图片';
            }
        });

        dom.btnSendToHistory.addEventListener('click', () => {
            const url = dom.resultImage.src;
            if (url) saveToHistory(url);
        });

        dom.btnClearHistory.addEventListener('click', () => {
            if (confirm('确定清空所有历史记录？')) clearHistory();
        });

        // Tutorial modal
        dom.btnTutorial.addEventListener('click', () => {
            dom.modalTutorial.classList.remove('hidden');
        });
        dom.btnCloseTutorial.addEventListener('click', () => {
            dom.modalTutorial.classList.add('hidden');
        });
        dom.modalTutorial.addEventListener('click', (e) => {
            if (e.target === dom.modalTutorial) dom.modalTutorial.classList.add('hidden');
        });

        setupTutorialDownloads();

        dom.btnComfyNative?.addEventListener('click', openComfyUINative);

        // Settings modal
        dom.btnSettings.addEventListener('click', () => {
            dom.inpServer.value = getComfyUIAddress();
            if (dom.selProfile) dom.selProfile.value = ProfileManager.store.activeId;
            const admInput = document.getElementById('inp-admin-key');
            const admStatus = document.getElementById('admin-status');
            if (admInput) admInput.value = sessionStorage.getItem('_adm') || '';
            if (admStatus) admStatus.style.display = sessionStorage.getItem('_adm') ? 'block' : 'none';
            const civHost = document.getElementById('inp-civitai-host');
            const civKey = document.getElementById('inp-civitai-key');
            if (civHost) civHost.value = localStorage.getItem('lora_civitai_host') || 'civitai.red';
            if (civKey) civKey.value = localStorage.getItem('lora_civitai_key') || '';
            const dzmmInp = document.getElementById('inp-dzmm-cookie');
            if (dzmmInp) {
                const saved = localStorage.getItem('dzmm_cookie') || '';
                if (!dzmmInp.value.trim() && saved) dzmmInp.value = saved;
            }
            const rotateChk = document.getElementById('chk-dzmm-auto-rotate');
            if (rotateChk) {
                const v = localStorage.getItem('dzmm_auto_rotate');
                rotateChk.checked = v === null ? true : v !== '0';
            }
            const dewmarkChk = document.getElementById('chk-dzmm-dewmark');
            if (dewmarkChk && window.DzmmDewmark) {
                dewmarkChk.checked = DzmmDewmark.enabled();
            }
            dom.modalSettings.classList.remove('hidden');
        });

        dom.btnSaveSettings.addEventListener('click', async () => {
            const url = dom.inpServer.value.trim();
            if (!url) return;
            setComfyUIAddress(url);
            ProfileManager.saveSessionFromUI();
            const civHost = document.getElementById('inp-civitai-host')?.value.trim();
            const civKey = document.getElementById('inp-civitai-key')?.value.trim();
            if (window.LoraLibrary?.saveCivitaiConfig) {
                try {
                    await LoraLibrary.saveCivitaiConfig(civKey || '', civHost || 'civitai.red');
                } catch (e) {
                    console.warn('[LoRA] civitai config save:', e);
                }
            }
            const dzmmCookie = document.getElementById('inp-dzmm-cookie')?.value.trim();
            if (dzmmCookie) {
                try {
                    localStorage.setItem('dzmm_cookie', dzmmCookie);
                    // 写入账号池（去重）
                    const idHash = (() => {
                        let h = 0;
                        for (let i = 0; i < dzmmCookie.length; i++) h = ((h << 5) - h + dzmmCookie.charCodeAt(i)) | 0;
                        return `a_${Math.abs(h).toString(36)}_${dzmmCookie.length}`;
                    })();
                    let accounts = [];
                    try { accounts = JSON.parse(localStorage.getItem('dzmm_accounts') || '[]'); } catch { accounts = []; }
                    if (!Array.isArray(accounts)) accounts = [];
                    const idx = accounts.findIndex((a) => a && a.id === idHash);
                    const row = {
                        id: idHash,
                        cookie: dzmmCookie,
                        label: (idx >= 0 && accounts[idx].label) || `账号 ${accounts.length + (idx >= 0 ? 0 : 1)}`,
                        email: idx >= 0 ? accounts[idx].email : '',
                        fullName: idx >= 0 ? accounts[idx].fullName : '',
                        quotas: idx >= 0 ? accounts[idx].quotas : null,
                        updatedAt: Date.now(),
                    };
                    if (idx >= 0) accounts[idx] = { ...accounts[idx], ...row };
                    else accounts.push(row);
                    localStorage.setItem('dzmm_accounts', JSON.stringify(accounts));
                    localStorage.setItem('dzmm_active_id', idHash);
                } catch (e) {
                    console.warn('[DZMM] localStorage cookie:', e);
                }
                try {
                    const r = await fetch('/api/dzmm/cookie', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cookie: dzmmCookie }),
                    });
                    const d = await r.json().catch(() => ({}));
                    if (!r.ok) throw new Error(d.error || r.statusText);
                } catch (e) {
                    console.warn('[DZMM] cookie save (local API):', e.message || e);
                }
            }
            const rotateChkSave = document.getElementById('chk-dzmm-auto-rotate');
            if (rotateChkSave) {
                localStorage.setItem('dzmm_auto_rotate', rotateChkSave.checked ? '1' : '0');
            }
            const dewmarkChk = document.getElementById('chk-dzmm-dewmark');
            if (dewmarkChk && window.DzmmDewmark) {
                DzmmDewmark.setEnabled(!!dewmarkChk.checked);
            }
            const admKey = document.getElementById('inp-admin-key')?.value.trim();
            if (admKey) {
                sessionStorage.setItem('_adm', admKey);
                showToast('管理员模式已激活');
                const vcRow = document.getElementById('nai-videocode-row');
                if (vcRow) vcRow.style.display = 'none';
            } else {
                sessionStorage.removeItem('_adm');
            }
            dom.modalSettings.classList.add('hidden');
            init();
        });

        dom.btnCancelSettings.addEventListener('click', () => {
            dom.modalSettings.classList.add('hidden');
        });

        // Preview modal
        dom.btnClosePreview.addEventListener('click', () => {
            dom.modalPreview.classList.add('hidden');
        });

        dom.modalPreview.addEventListener('click', (e) => {
            if (e.target === dom.modalPreview) dom.modalPreview.classList.add('hidden');
        });

        dom.modalSettings.addEventListener('click', (e) => {
            if (e.target === dom.modalSettings) dom.modalSettings.classList.add('hidden');
        });

        // Compare slider
        dom.btnCompare.addEventListener('click', openCompare);
        dom.btnCloseCompare.addEventListener('click', () => {
            dom.modalCompare.classList.add('hidden');
        });
        dom.modalCompare.addEventListener('click', (e) => {
            if (e.target === dom.modalCompare) dom.modalCompare.classList.add('hidden');
        });
        setupCompareSlider();

        if (dom.btnPostContinue) {
            dom.btnPostContinue.addEventListener('click', () => resolvePostPreview('continue'));
            dom.btnPostRegenerate.addEventListener('click', () => resolvePostPreview('regenerate'));
            dom.btnPostCancel.addEventListener('click', () => resolvePostPreview('cancel'));
            dom.modalPostPreview?.addEventListener('click', (e) => {
                if (e.target === dom.modalPostPreview) resolvePostPreview('cancel');
            });
        }

        // Use as reference image
        dom.btnUseAsRef.addEventListener('click', () => {
            const url = dom.resultImage.src;
            if (url) useImageAsRef(url);
        });

        dom.btnPreviewRef.addEventListener('click', () => {
            const url = dom.previewImage.src;
            if (url) useImageAsRef(url);
        });

        dom.btnPreviewDownload.addEventListener('click', async () => {
            const url = dom.previewImage?.src;
            if (!url) return;
            try {
                dom.btnPreviewDownload.disabled = true;
                dom.btnPreviewDownload.textContent = '下载中...';
                await downloadComfyImageAsFile(url, `comfyui_${Date.now()}`);
            } catch (e) {
                console.warn('[Preview Download] failed:', e);
                showToast('下载失败，请稍后重试或右键另存为。');
                try {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `comfyui_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch { /* ignore */ }
            } finally {
                dom.btnPreviewDownload.disabled = false;
                dom.btnPreviewDownload.textContent = '下载';
            }
        });

        // Regional prompt
        dom.btnAddRegion.addEventListener('click', () => addRegionRow());
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        // LoRA add button
        dom.btnAddLora.addEventListener('click', () => addLoraRow());

        // ControlNet model description
        dom.selControlnet.addEventListener('change', updateCnDesc);
        function updateCnDesc() {
            const name = dom.selControlnet.value.toLowerCase();
            const descs = {
                'canny': '🖊️ Canny: 提取图片边缘轮廓，精确控制线条走向',
                'openpose': '🤸 OpenPose: 检测人体骨架姿势，控制人物动作',
                'depth': '🏔️ Depth: 生成深度图，控制画面前后远近关系',
                'scribble': '✏️ Scribble: 把涂鸦/草图转为精细图片',
                'lineart': '📐 Lineart: 把线稿转为上色成品',
                'tile': '🔍 Tile: 保持细节增强/放大修复',
            };
            let desc = '';
            for (const [key, val] of Object.entries(descs)) {
                if (name.includes(key)) { desc = val; break; }
            }
            dom.cnModelDesc.textContent = desc;
        }

        // File previews
        setupFilePreview(dom.inpCnImage, dom.cnUploadImg, dom.cnUploadPreview);
        setupFilePreview(dom.inpRefImage, dom.refPreview, dom.refPreviewContainer);

        // ControlNet preview button
        dom.btnCnPreview.addEventListener('click', previewControlNet);

        // Ctrl+Enter shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!dom.btnGenerate.disabled) generateDispatch();
            }
        });
    }

    // ==================== 通配符系统 ====================
    function getWildcardCategories() {
        const cats = [];
        tagData.forEach(group => {
            group.subgroups.forEach(sub => {
                if (sub.tags.length > 0) {
                    cats.push({
                        group: group.name,
                        name: sub.name,
                        tags: sub.tags.map(t => t.t),
                    });
                }
            });
        });
        return cats;
    }

    function renderWildcardPanel() {
        const list = document.getElementById('wildcard-list');
        const search = document.getElementById('wildcard-search');
        if (!list) return;

        const cats = getWildcardCategories();
        const query = (search?.value || '').toLowerCase();

        list.innerHTML = '';
        let lastGroup = '';
        cats.forEach(cat => {
            if (query && !cat.name.toLowerCase().includes(query) && !cat.group.toLowerCase().includes(query)) return;

            if (cat.group !== lastGroup) {
                lastGroup = cat.group;
                const label = document.createElement('div');
                label.className = 'wildcard-group-label';
                label.textContent = cat.group;
                list.appendChild(label);
            }

            const item = document.createElement('span');
            item.className = 'wildcard-item';
            item.textContent = cat.name;
            item.title = `${cat.tags.length} 个选项 — 点击插入 __${cat.name}__`;
            item.addEventListener('click', () => {
                insertWildcard(cat.name);
            });
            list.appendChild(item);
        });
    }

    function insertWildcard(name) {
        const textarea = dom.txtPositive;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const insert = `__${name}__`;

        const before = text.substring(0, start);
        const after = text.substring(end);
        const needComma = before.length > 0 && !before.endsWith(', ') && !before.endsWith(',');
        textarea.value = before + (needComma ? ', ' : '') + insert + after;
        textarea.focus();

        const newPos = start + (needComma ? 2 : 0) + insert.length;
        textarea.setSelectionRange(newPos, newPos);

        updateWildcardHint();
    }

    function resolveWildcards(text) {
        const cats = getWildcardCategories();
        const custom = getCustomWildcards();
        const anima = isAnimaMode();
        return text.replace(/__(.+?)__/g, (match, name) => {
            const customCat = custom.find(c => c.name === name);
            if (customCat && customCat.values.length > 0) {
                const val = customCat.values[Math.floor(Math.random() * customCat.values.length)];
                return anima ? formatAnimaTag(val) : val;
            }
            const cat = cats.find(c => c.name === name);
            if (!cat || cat.tags.length === 0) return match;
            const tag = cat.tags[Math.floor(Math.random() * cat.tags.length)];
            if (anima) {
                const isArtist = cat.group?.includes('画师');
                return isArtist ? formatAnimaArtistTag(tag) : formatAnimaTag(tag);
            }
            return tag;
        });
    }

    function updateWildcardHint() {
        const hint = document.getElementById('wildcard-hint');
        if (!hint) return;
        const text = dom.txtPositive.value;
        const matches = text.match(/__(.+?)__/g);
        if (matches && matches.length > 0) {
            hint.textContent = `🎲 检测到 ${matches.length} 个通配符: ${matches.join(', ')} — 生成时自动随机替换`;
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }

    // Custom wildcards (stored in localStorage)
    function getCustomWildcards() {
        try {
            return JSON.parse(localStorage.getItem('custom_wildcards') || '[]');
        } catch { return []; }
    }

    function saveCustomWildcards(list) {
        localStorage.setItem('custom_wildcards', JSON.stringify(list));
    }

    function addCustomWildcard(name, values) {
        if (!name || values.length === 0) return;
        const list = getCustomWildcards();
        const existing = list.findIndex(w => w.name === name);
        if (existing >= 0) {
            list[existing].values = values;
        } else {
            list.push({ name, values });
        }
        saveCustomWildcards(list);
        renderCustomWildcardList();
    }

    function removeCustomWildcard(name) {
        const list = getCustomWildcards().filter(w => w.name !== name);
        saveCustomWildcards(list);
        renderCustomWildcardList();
    }

    function renderCustomWildcardList() {
        const container = document.getElementById('wc-custom-list');
        if (!container) return;
        const list = getCustomWildcards();
        container.innerHTML = '';
        list.forEach(wc => {
            const item = document.createElement('div');
            item.className = 'wc-custom-item';
            item.innerHTML = `
                <span class="wc-name" title="点击插入 __${wc.name}__">${wc.name}</span>
                <span class="wc-count">${wc.values.length} 项</span>
                <button class="wc-remove" title="删除">✕</button>
            `;
            item.querySelector('.wc-name').addEventListener('click', () => insertWildcard(wc.name));
            item.querySelector('.wc-remove').addEventListener('click', () => removeCustomWildcard(wc.name));
            container.appendChild(item);
        });
    }

    function setupWildcard() {
        const btn = document.getElementById('btn-wildcard');
        const panel = document.getElementById('wildcard-panel');
        const search = document.getElementById('wildcard-search');
        const wcTabs = panel?.querySelectorAll('.wildcard-tabs .tab');
        const listEl = document.getElementById('wildcard-list');
        const customEl = document.getElementById('wildcard-custom');
        if (!btn || !panel) return;

        btn.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                renderWildcardPanel();
                renderCustomWildcardList();
            }
        });

        wcTabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                wcTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isBuiltin = tab.dataset.wcTab === 'builtin';
                listEl?.classList.toggle('hidden', !isBuiltin);
                customEl?.classList.toggle('hidden', isBuiltin);
                if (isBuiltin) renderWildcardPanel();
                else renderCustomWildcardList();
            });
        });

        if (search) {
            let debounce;
            search.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(renderWildcardPanel, 200);
            });
        }

        // Add custom wildcard
        document.getElementById('btn-wc-add')?.addEventListener('click', () => {
            const nameEl = document.getElementById('wc-custom-name');
            const valEl = document.getElementById('wc-custom-values');
            const name = nameEl.value.trim();
            const values = valEl.value.split('\n').map(s => s.trim()).filter(Boolean);
            if (name && values.length > 0) {
                addCustomWildcard(name, values);
                nameEl.value = '';
                valEl.value = '';
            }
        });

        // Import txt file
        document.getElementById('inp-wc-import')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const name = file.name.replace(/\.txt$/i, '');
            const reader = new FileReader();
            reader.onload = (ev) => {
                const values = ev.target.result.split('\n').map(s => s.trim()).filter(Boolean);
                if (values.length > 0) {
                    addCustomWildcard(name, values);
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        dom.txtPositive.addEventListener('input', updateWildcardHint);
    }

    // ==================== 收藏 & 使用记忆系统 ====================
    const FavManager = {
        _KEY: 'comfyui_fav_tags',
        _list: null,
        _load() { if (!this._list) this._list = JSON.parse(localStorage.getItem(this._KEY) || '[]'); return this._list; },
        _save() { localStorage.setItem(this._KEY, JSON.stringify(this._list)); },
        getAll() { return this._load(); },
        has(tagText) { return this._load().some(f => f.t === tagText); },
        add(tag) {
            const list = this._load();
            if (list.some(f => f.t === tag.t)) return;
            list.unshift({ t: tag.t, d: tag.d || '', th: tag.th || '', tags: tag.tags || [], lora: tag.lora || '', type: tag.th ? (tag.img ? 'artist' : 'character') : 'tag', addedAt: Date.now() });
            if (list.length > 500) list.length = 500;
            this._save();
        },
        remove(tagText) {
            const list = this._load();
            const idx = list.findIndex(f => f.t === tagText);
            if (idx >= 0) { list.splice(idx, 1); this._save(); }
        },
        toggle(tag) { this.has(tag.t) ? this.remove(tag.t) : this.add(tag); },
        clear() { this._list = []; this._save(); },
    };

    const UsageTracker = {
        _KEY: 'comfyui_tag_usage',
        _data: null,
        _load() { if (!this._data) this._data = JSON.parse(localStorage.getItem(this._KEY) || '{}'); return this._data; },
        _save() { localStorage.setItem(this._KEY, JSON.stringify(this._data)); },
        record(tagText, desc, thumb, type) {
            const data = this._load();
            if (!data[tagText]) data[tagText] = { d: desc || '', th: thumb || '', count: 0, last: 0 };
            data[tagText].count++;
            data[tagText].last = Date.now();
            if (desc) data[tagText].d = desc;
            if (thumb) data[tagText].th = thumb;
            if (type) data[tagText].type = type;
            const keys = Object.keys(data);
            if (keys.length > 1000) {
                keys.sort((a, b) => data[a].last - data[b].last);
                keys.slice(0, keys.length - 800).forEach(k => delete data[k]);
            }
            this._save();
        },
        getRecent(limit = 100) {
            const data = this._load();
            return Object.entries(data)
                .sort((a, b) => b[1].last - a[1].last)
                .slice(0, limit)
                .map(([t, v]) => ({ t, d: v.d, th: v.th, type: v.type || 'tag', _count: v.count, _last: v.last }));
        },
        getFrequent(limit = 100) {
            const data = this._load();
            return Object.entries(data)
                .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
                .slice(0, limit)
                .map(([t, v]) => ({ t, d: v.d, th: v.th, type: v.type || 'tag', _count: v.count, _last: v.last }));
        },
        getCount(tagText) { return (this._load()[tagText] || {}).count || 0; },
        clear() { this._data = {}; this._save(); },
    };

    const _VIRTUAL_TABS = [
        { name: '⭐ 收藏', _virtual: 'fav' },
        { name: '🕐 最近', _virtual: 'recent' },
        { name: '🔥 常用', _virtual: 'frequent' },
    ];

    // ==================== 标签选择器（双面板） ====================
    const _SERIES_CN = {"Fate":"命运","Honkai":"崩坏","LoveLive":"LoveLive!","Nijisanji":"彩虹社","Jojo No Kimyou Na Bouken":"JOJO的奇妙冒险","Precure":"光之美少女","Fate/grand Order":"命运-冠位指定","Kemono Friends":"兽娘动物园","Gundam":"高达","Splatoon":"喷射战士","Lyrical Nanoha":"魔法少女奈叶","The Legend Of Zelda":"塞尔达传说","Boku No Hero Academia":"我的英雄学院","Suzumiya Haruhi No Yuuutsu":"凉宫春日的忧郁","Toaru Majutsu No Index":"魔法禁书目录","Mario":"马力欧","Bishoujo Senshi Sailor Moon":"美少女战士","Touken Ranbu":"刀剑乱舞","Xenoblade Chronicles":"异度神剑","Street Fighter":"街头霸王","BanG Dream":"BanG Dream!","World Witches Series":"强袭魔女","Tales Of":"传说系列","Project Moon":"月亮计划","Omori":"奥日","Guilty Gear":"罪恶装备","Overwatch":"守望先锋","Indie Virtual Youtuber":"独立虚拟主播","Umineko No Naku Koro Ni":"海猫鸣泣之时","Gochuumon Wa Usagi Desu Ka?":"请问您今天要来点兔子吗？","Shingeki No Kyojin":"进击的巨人","Ragnarok Online":"仙境传说","Project Sekai":"世界计划 缤纷舞台！","Re:Zero":"Re:从零开始的异世界生活","Voiceroid":"VOICEROID","Monogatari":"物语系列","Marvel":"漫威","Dragon Quest":"勇者斗恶龙","Kirby":"星之卡比","Code Geass":"反叛的鲁路修","Lucky Star":"幸运星","Mega Man":"洛克人","Sonic":"索尼克","Tengen Toppa Gurren Lagann":"天元突破红莲螺岩","Higurashi No Naku Koro Ni":"寒蝉鸣泣之时","Neptune":"海王星","Digimon":"数码宝贝","Saibou Shinkyoku":"细胞神曲","Inazuma Eleven":"闪电十一人","Blazblue":"苍翼默示录","Bleach":"境·界","Tokyo Afterschool Summoners":"东京放课后召唤师","Macross":"超时空要塞","Rwby":"RWBY","Tiger & Bunny":"老虎和兔子","Tsukihime":"月姬","Rozen Maiden":"蔷薇少女","Go-toubun No Hanayome":"五等分的新娘","Osomatsu-san":"阿松","Assault Lily":"突击莉莉","Yuru Yuri":"摇曳百合","Onii-chan Wa Oshimai!":"别当欧尼酱了！","Axis Powers Hetalia":"黑塔利亚","Utau":"UTAU","Apex Legends":"Apex英雄","Saki":"天才麻将少女","Elsword":"艾尔之光","The King Of Fighters":"拳皇","Vampire (game)":"恶魔战士","Watashi Ga Motenai No Wa Dou Kangaetemo Omaera Ga Warui!":"我不受欢迎，怎么想都是你们的错！","Cardcaptor Sakura":"魔卡少女樱","Kamen Rider":"假面骑士","Dc Comics":"DC漫画","Senran Kagura":"闪乱神乐","Ensemble Stars!":"偶像梦幻祭","Little Busters!":"小小克星！","Punishing: Gray Raven":"战双帕弥什","Queen's Blade":"女王之刃","Helltaker":"地狱把妹王","Kagerou Project":"阳炎计划","Atelier":"工作室系列","Ace Attorney":"逆转裁判","Hibike! Euphonium":"吹响！上低音号","Pretty Series":"美妙系列","Gridman Universe":"古立特宇宙","Eiyuu Densetsu":"英雄传说","Girls Band Cry":"GIRLS BAND CRY","Monster Hunter":"怪物猎人","Disgaea":"魔界战记","Ore No Imouto Ga Konna Ni Kawaii Wake Ga Nai":"我的妹妹哪有这么可爱！","Aikatsu!":"偶像活动！","To Heart":"同班同学","Nanashi Inc.":"ななしinc.","Clannad":"CLANNAD","Resident Evil":"生化危机","To Love-ru":"出包王女","Fullmetal Alchemist":"钢之炼金术师","Panty & Stocking With Garterbelt":"吊带袜天使","Ranma 1/2":"乱马1/2","Kingdom Hearts":"王国之心","Skullgirls":"骷髅女孩","One-punch Man":"一拳超人","Undertale":"传说之下","Last Origin":"最后生还者","Hunter X Hunter":"全职猎人","Vshojo":"VShojo","Gintama":"银魂","Len'en":"连缘","Vspo!":"VSPO!","Metroid":"银河战士","Twisted Wonderland":"扭曲仙境","Yuri!!! On Ice":"冰上的尤里","Puyopuyo":"噗よ噗よ","Houseki No Kuni":"宝石之国","Golden Kamuy":"黄金神威","Sekaiju No Meikyuu":"世界树的迷宫","Little Witch Academia":"小魔女学园","Dead Or Alive":"死或生","Kaguya-sama Wa Kokurasetai ~tensai-tachi No Renai Zunousen~":"辉夜大小姐想让我告白","Black Rock Shooter":"黑岩射手","Machikado Mazoku":"街角魔族","Zombie Land Saga":"佐贺偶像是传奇","Tekken":"铁拳","Touqi Guaitan":"头七怪谈","Pikmin":"皮克敏","Gakuen Idolmaster":"学园偶像大师","Yurucamp":"摇曳露营","Amagami":"圣诞之吻","Warship Girls R":"战舰少女R","Transformers":"变形金刚","Mahou Sensei Negima!":"魔法老师","Sono Bisque Doll Wa Koi Wo Suru":"更衣人偶坠入爱河","Gegege No Kitarou":"鬼太郎","Yahari Ore No Seishun Lovecome Wa Machigatteiru.":"我的青春恋爱物语果然有问题。","Maria-sama Ga Miteru":"圣母在上","Alice In Wonderland":"爱丽丝梦游仙境","Os-tan":"OS娘","Toradora!":"龙与虎","Hyouka":"冰菓","Dungeon Ni Deai Wo Motomeru No Wa Machigatteiru Darou Ka":"在地下城寻求邂逅是否搞错了什么","Fatal Fury":"饿狼传说","Needy Girl Overdose":"主播女孩重度依赖","Luo Xiaohei Zhanji":"罗小黑战记","Shoujo Kageki Revue Starlight":"少女☆歌剧 Revue Starlight","Dokidoki! Precure":"心跳！光之美少女","Sayonara Zetsubou Sensei":"再见！绝望先生","Zero No Tsukaima":"零之使魔","Infinite Stratos":"IS〈Infinite Stratos〉","Monster Musume No Iru Nichijou":"魔物娘的同居日常","Meitantei Conan":"名侦探柯南","Aria (manga)":"水星领航员","Puzzle & Dragons":"智龙迷城","Chuunibyou Demo Koi Ga Shitai!":"中二病也要谈恋爱！","Star Ocean":"星之海洋","Fairy Tail":"妖精的尾巴","Doki Doki Literature Club":"心跳文学部","Haikyuu!!":"排球少年！！","Senpai Ga Uzai Kouhai No Hanashi":"关于前辈很烦人的事","Dark Souls":"黑暗之魂","Animal Crossing":"动物森友会","Boku Wa Tomodachi Ga Sukunai":"我的朋友很少","Working!!":"迷糊餐厅","Sanrio":"三丽鸥","Path To Nowhere":"无期迷途","Durarara!!":"无头骑士异闻录","Happinesscharge Precure!":"Happinesscharge光之美少女！","Shakugan No Shana":"灼眼的夏娜","Nitroplus":"Nitro+","Hidamari Sketch":"向阳素描","Kid Icarus":"光神话 帕尔提娜之镜","Eromanga Sensei":"埃罗芒阿老师","Nichijou":"日常","Phantasy Star":"梦幻之星","Yume Nikki":"梦日记","Devil May Cry":"鬼泣","Metal Gear":"合金装备","Azumanga Daioh":"阿滋漫画大王","Dungeon And Fighter":"地下城与勇士","Tokyo Ghoul":"东京喰种","Kamitsubaki Studio":"神椿工作室","Yuuki Bakuhatsu Bang Bravern":"勇气爆发Bang Bravern","Cyberpunk":"赛博朋克","Spice And Wolf":"狼与香辛料","Super Robot Wars":"超级机器人大战","Cookie (touhou)":"Cookie☆","Little Nuns (diva)":"小修女(diva)","Mahou Shoujo No Majo Saiban":"魔法少女的魔女审判","Kirakira Precure A La Mode":"光之美少女：食尚甜心","Promare":"普罗米亚","Kara No Kyoukai":"空之境界","My Little Pony":"小马宝莉","Urusei Yatsura":"福星小子","Mob Psycho 100":"灵能百分百","Mahjong Soul":"雀魂","Kill Me Baby":"爱杀宝贝","Hayate No Gotoku!":"旋风管家！","Mahou Shoujo Ni Akogarete":"憧憬成为魔法少女","Baldur's Gate":"博德之门","Breath Of Fire":"火焰之息","Monster Girl Encyclopedia":"魔物娘图鉴","Youkai Watch":"妖怪手表","New Game!":"NEW GAME!","Samurai Spirits":"侍魂","Mahou Girls Precure!":"魔法使光之美少女！","Star Wars":"星球大战","Warhammer 40k":"战锤40K","Delicious Party Precure":"美味派对♡光之美少女","Among Us":"在我们之中","Sakura Taisen":"樱花大战","Soul Eater":"噬魂师","Bloodborne":"血源诅咒","Overlord (maruyama)":"Overlord","Watashi Ni Tenshi Ga Maiorita!":"天使降临到了我身边！","Muv-luv":"Muv-Luv","Wild Arms":"荒野兵器","Utawarerumono":"传颂之物","Saenai Heroine No Sodatekata":"路人女主的养成方法","Inuyasha":"犬夜叉","Hataraku Saibou":"工作细胞","Team Fortress 2":"军团要塞2","Mawaru Penguindrum":"回转企鹅罐","Go! Princess Precure":"Go! Princess光之美少女","Berserk":"剑风传奇","Darker Than Black":"黑之契约者","Avatar Legends":"降世神通：传奇","Aldnoah.zero":"ALDNOAH.ZERO","Ano Hi Mita Hana No Namae Wo Bokutachi Wa Mada Shiranai.":"我们仍未知道那天所看见的花的名字。","Shinryaku! Ikamusume":"侵略！乌贼娘","Komi-san Wa Komyushou Desu":"古见同学有交流障碍症","Seiken Densetsu":"圣剑传说","Taimanin":"对魔忍","Kin-iro Mosaic":"黄金拼图","Heaven Burns Red":"绯染天空","Sengoku Basara":"战国BASARA","Ikkitousen":"一骑当千","Aoki Hagane No Arpeggio":"苍蓝钢铁的琶音","Pani Poni Dash!":"不可思议的教室","Lord Of The Mysteries":"诡秘之主","Magi The Labyrinth Of Magic":"魔奇少年","Air (visual Novel)":"AIR","Tamako Market":"玉子市场","Poptepipic":"POP TEAM EPIC","Dorohedoro":"异兽魔都","Frozen (disney)":"冰雪奇缘","Slam Dunk":"灌篮高手","Godzilla":"哥斯拉","Soulcalibur":"灵魂能力","Tate No Yuusha No Nariagari":"盾之勇者成名录","Closers":"封印者","My-hime":"舞-HiME","Minecraft":"我的世界","Call Of Duty":"使命召唤","Sekai Seifuku: Bouryaku No Zvezda":"世界征服：谋略之星","World Trigger":"境界触发者","Yuusha De Aru":"结城友奈是勇者","Gensou Suikoden":"幻想水浒传","Real Life":"现实生活","Nekopara":"巧克力与香子兰","Dragon's Crown":"龙之皇冠","Galaxy Angel":"银河天使","Tears Of Themis":"未定事件簿","Amagi Brilliant Park":"甘城光辉游乐园","Cinderella Series":"灰姑娘系列","Hazbin Hotel":"地狱客栈","Gekkan Shoujo Nozaki-kun":"月刊少女野崎君","Katekyo Hitman Reborn!":"家庭教师HITMAN REBORN!","Pangya":"魔法飞球","Chrono Trigger":"时空之轮","Chrono Cross":"穿越时空","Uzaki-chan Wa Asobitai!":"宇崎学妹想要玩！","Guilty Crown":"罪恶王冠","Nagi No Asukara":"来自风平浪静的明天","Nu Carnival":"新世界狂欢","Scott Pilgrim":"斯科特·皮尔格林","Identity V":"第五人格","Ryuuou No Oshigoto!":"龙王的工作！","Keroro Gunsou":"Keroro军曹","Alice Gear Aegis":"机战少女Alice","God Eater":"噬神者","Heartcatch Precure!":"Heartcatch光之美少女！","Xenosaga":"异度传说","Little Red Riding Hood":"小红帽","Voicevox":"VOICEVOX","Ijiranaide Nagatoro-san":"不要欺负我，长瀞同学","Healin' Good Precure":"Healin' Good♥光之美少女","Black Lagoon":"黑礁","Koihime Musou":"恋姬†无双","Va-11 Hall-a":"VA-11 HALL-A","Trigun":"枪神","Warioware":"瓦力欧制造","Katawa Shoujo":"残疾少女","Shantae":"桑塔","My-otome":"舞-乙HiME","Ichigo Mashimaro":"草莓棉花糖","Adventure Time":"探险活宝","Shin Megami Tensei":"真·女神转生","Mahou Tsukai No Yoru":"魔法使之夜","Sinoalice":"死亡爱丽丝","Cowboy Bebop":"星际牛仔","Kuroko No Basuke":"黑子的篮球","South Park":"南方公园","Goblin Slayer!":"哥布林杀手！","Karakai Jouzu No Takagi-san":"擅长捉弄的高木同学","Doraemon":"哆啦A梦","Shoujo Shuumatsu Ryokou":"少女终末旅行","Slayers":"秀逗魔导士","Gabriel Dropout":"珈百璃的堕落","Mother 2":"地球冒险2","Kyoukaisenjou No Horizon":"境界线上的地平线","Death Note":"死亡笔记","Boku No Kokoro No Yabai Yatsu":"我心里危险的东西","Mega Man (classic)":"洛克人元祖","Kaiji":"赌博默示录","Gyee":"盖伊传说","Tokyo 7th Sisters":"东京 7th Sisters","Kannagi":"神薙","Warcraft":"魔兽","Under Night In-birth":"夜下降生","Journey To The West":"西游记",".live":".LIVE","Yama No Susume":"向山进发","Dog Days":"DOG DAYS","Love Plus":"爱相随","Re:stage!":"Re:Stage!","Denonbu":"电音部","Bayonetta":"猎天使魔女","Kimi No Na Wa.":"你的名字。","Jashin-chan Dropkick":"邪神与厨二病少女","Blue Lock":"蓝色监狱","Hollow Knight":"空洞骑士","Shoujo Kakumei Utena":"少女革命","Shokugeki No Souma":"食戟之灵","Eureka Seven":"交响诗篇","Shirobako":"白箱","Minecraft Youtube":"我的世界YouTube","Nier:automata":"尼尔：自动人形","Dagashi Kashi":"粗点心战争","Hellsing":"皇家国教骑士团","Tera Online":"TERA","Tokyo Revengers":"东京复仇者","Kami Nomi Zo Shiru Sekai":"只有神知道的世界","Shuffle!":"SHUFFLE!","Mother (game)":"地球冒险","Lupin Iii":"鲁邦三世","Miraculous Ladybug":"瓢虫雷迪","Ghost In The Shell":"攻壳机动队","Castlevania":"恶魔城","Sakura No Sekai":"樱之世界","Seishun Buta Yarou":"青春猪头少年","Silent Hill":"寂静岭","Tenchi Muyou!":"天地无用！","Gakkou Gurashi!":"学园孤岛！","Onmyoji":"阴阳师","Minami-ke":"南家三姐妹","Mon-musu Quest!":"魔物娘☆后宫","Idolish7":"IDOLiSH7","The Amazing Digital Circus":"神奇数字马戏团","Ar Tonelico":"魔塔大陆","Saint Seiya":"圣斗士星矢","Live A Hero":"LIVE A HERO","Powerpuff Girls Z":"飞天小女警Z","Zannen Onna-kanbu Black General-san":"残念女干部布莱克将军","Harry Potter":"哈利·波特","Flower Knight Girl":"美少女花骑士","Ao No Exorcist":"青之驱魔师","Haiyore! Nyaruko-san":"潛行吧！奈亞子","Master Detective Archives: Rain Code":"超侦探事件簿 雾雨谜宫","Nanatsu No Taizai":"七大罪","Sono Hanabira Ni Kuchizuke Wo":"花吻在上","Alchemy Stars":"白夜极光","Idoly Pride":"IDOLY PRIDE","Tensei Oujo To Tensai Reijou No Mahou Kakumei":"转生王女与天才千金的魔法革命","Girlfriend (kari)":"临时女友","Fushigi No Umi No Nadia":"蓝宝石之谜","Hirogaru Sky! Precure":"开阔天空！光之美少女","High School Fleet":"高校舰队","Dolphin Wave":"海豚波潮","Shugo Chara!":"守护甜心！","Arcana Heart":"圣灵之心","Yotsubato!":"四叶妹妹！","Uta No Prince-sama":"歌之☆王子殿下♪","Ryuu Ga Gotoku":"如龙","Octopath Traveler":"八方旅人","No Game No Life":"NO GAME NO LIFE 游戏人生","Shinrabanshou":"神罗万象","Cookie Run":"跑跑姜饼人","Agent Aika":"AIKa","Tokyo Mew Mew":"东京猫猫","Ganbare Douki-chan":"加油吧同期酱","Majo No Takkyuubin":"魔女宅急便","Tantei Opera Milky Holmes":"侦探歌剧 少女福尔摩斯","Kourin Tenshi En Ciel Rena":"光临天使En Ciel Rena","Aa Megami-sama":"我的女神","Non Non Biyori":"悠哉日常大王","Sennen Sensou Aigis":"千年战争Aigis","Senjou No Valkyria":"战场女武神","Nisekoi":"伪恋","School Rumble":"校园迷糊大王","Xenogears":"异度装甲","Yu Yu Hakusho":"幽游白书","Getsuyoubi No Tawawa":"星期一的丰满","Strawberry Panic!":"惊爆草莓","Ado (utaite)":"Ado","Aquarion":"创圣的大天使","7th Dragon":"七龙传说","Yagate Kimi Ni Naru":"终将成为你","Hades":"哈迪斯","Flcl":"FLCL","Da Capo":"初音岛","Blend S":"调教咖啡厅","Powerpuff Girls":"飞天小女警","Kimi Kiss":"君吻","Dispatch":"派勤","Mitsudomoe":"超元气三姐妹","Dennou Coil":"电脑线圈","Senren Banka":"千恋＊万花","Brave Witches":"勇气魔女","Kanojo Okarishimasu":"租借女友","Mabinogi":"洛奇","Juusan Kihei Bouei Ken":"十三机兵防卫圈","Odin Sphere":"奥丁领域","Gnosia":"GNOSIA","Genshiken":"现视研","Grandia":"格兰蒂亚","Ojamajo Doremi":"小魔女DoReMi","Tsurezure Children":"徒然喜欢你","Simoun":"西蒙","Kino No Tabi":"奇诺之旅","Mononoke Hime":"幽灵公主","Magic Knight Rayearth":"魔法骑士","Tokidoki Bosotto Roshia-go De Dereru Tonari No Alya-san":"时而孤独的俄语废材邻家艾莉同学","Majo No Tabitabi":"魔女之旅","Howl No Ugoku Shiro":"哈尔的移动城堡","Akuma No Riddle":"恶魔之谜","Mahou Shoujo Ikusei Keikaku":"魔法少女育成计划","Shin Sangoku Musou":"真·三国无双","Fatal Frame":"零系列","Shingeki No Bahamut":"巴哈姆特之怒","Love Hina":"纯情房东俏房客","Saga":"沙加","Sen To Chihiro No Kamikakushi":"千与千寻","Youkoso Jitsuryoku Shijou Shugi No Kyoushitsu E":"欢迎来到实力至上主义的教室","Lovebrush Chronicles":"时空中的绘旅人","Pretty Rhythm":"美妙旋律","Maoyuu Maou Yuusha":"魔王勇者","Sister Princess":"妹妹公主","Signalis":"信号","Nige Jouzu No Wakagimi":"擅长逃跑的殿下","Douluo Dalu":"斗罗大陆","Highschool Of The Dead":"学园默示录","Himouto! Umaru-chan":"干物妹！小埋","Make Heroine Ga Oo Sugiru!":"败犬女主太多了！","Voms":"VOMS","Hypnosis Mic":"催眠麦克风","Suigetsu":"水月","Rosario+vampire":"十字架与吸血鬼","The Owl House":"猫头鹰魔法社","Hataraku Maou-sama!":"打工吧！魔王大人","Tenka Hyakken":"天华百剑","Library Of Ruina":"废墟图书馆","D.gray-man":"驱魔少年","Ousama Ranking":"国王排名","Mcdonald's":"麦当劳","Tokimeki Memorial":"心跳回忆","Super Real Mahjong":"写真麻雀","Ano Natsu De Matteru":"在那个夏天等待","Funamusea":"海底囚人","Log Horizon":"记录的地平线","Brand New Animal":"BNA","Arms (game)":"ARMS","Tenshi Souzou Re-boot!":"天使创造Re-boot!","Charlotte (anime)":"Charlotte","Mirai Nikki":"未来日记","Inu X Boku Ss":"妖狐×仆SS","Fear & Hunger":"恐惧 & 饥饿","Yoru No Kurage Wa Oyogenai":"夜晚的水母不会游泳","Omniscient Reader's Viewpoint":"全知读者视角","Sword Girls":"剑之少女","Bombergirl":"炸弹女孩","Drag-on Dragoon":"龙背上的骑兵","Kage No Jitsuryokusha Ni Naritakute!":"想要成为影之实力者！","Magic Kaito":"魔术快斗","Tonari No Totoro":"龙猫","Kuroshitsuji":"黑执事","Shining":"光明系列","Super Heroine Boy":"超级女主角男孩","Violet Evergarden":"紫罗兰永恒花园","Ookami (game)":"大神","Quiz Magic Academy":"问答魔法学院","Beatmania Iidx":"狂热节拍IIDX","Accel World":"加速世界","Youjo Senki":"幼女战记","Strike The Blood":"噬血狂袭","Disney":"迪士尼","Uchuu Senkan Yamato":"宇宙战舰大和号","Eizouken Ni Wa Te Wo Dasu Na!":"别对映像研出手！","Baka To Test To Shoukanjuu":"笨蛋、测验、召唤兽","Given":"GIVEN","Metal Slug":"合金弹头","Dandadan":"DAN DA DAN","Super Smash Bros.":"任天堂明星大乱斗","Summon Night":"召唤之夜","Mermaid Melody Pichi Pichi Pitch":"人鱼的旋律","Full Metal Panic!":"全金属狂潮！","Hoozuki No Reitetsu":"鬼灯的冷彻","Valorant":"无畏契约","Soulworker":"灵魂武器","Rance":"兰斯","Hacka Doll":"骇客娃娃","Sora No Otoshimono":"天降之物","Danna Ga Nani Wo Itte Iru Ka Wakaranai Ken":"关于完全听不懂老公在说什么的事","Gravity Falls":"怪诞小镇","Star Fox":"星际火狐","Kodomo No Jikan":"萌少女的恋爱时光","Owari No Seraph":"终结的炽天使","Kidou Senkan Nadesico":"机动战舰抚子号","Final Fight":"快打旋风","Little Witch Nobeta":"小魔女诺贝塔","Musaigen No Phantom World":"无彩限的怪灵世界","Shadows House":"影宅","Gravity Daze":"重力异想世界","Magical Mirai (vocaloid)":"魔法未来","Black Survival":"黑色幸存者","Hokuto No Ken":"北斗神拳","Cafe Stella To Shinigami No Chou":"星光咖啡馆与死神之蝶","Hanasaku Iroha":"花开伊吕波","Kaze No Tani No Nausicaa":"风之谷","Bougyoryoku Zero No Yome":"防御力为0的新娘","Sanoba Witch":"魔女的夜宴","Princess Tutu":"彩梦芭蕾","Rurouni Kenshin":"浪客剑心","Denpa Onna To Seishun Otoko":"电波女与青春男","Justice Gakuen":"正义学园","Love And Deepspace":"恋与深空","Donkey Kong":"大金刚","Bungou Stray Dogs":"文豪野犬","Rou-kyuu-bu!":"萝球社！","Otome Game No Hametsu Flag Shika Nai Akuyaku Reijou Ni Tensei Shite Shimatta":"转生成为了只有乙女游戏破灭Flag的邪恶大小姐","Koutetsujou No Kabaneri":"甲铁城的卡巴内瑞","Akame Ga Kill!":"斩·赤红之瞳！","Toji No Miko":"刀使之巫女","Futaba Channel":"双叶频道","Shadowverse":"影之诗","Renkin San-kyuu Magical Pokaan":"炼金三级魔法少女","Suisei No Gargantia":"翠星之加尔刚蒂亚","Busou Shinki":"武装神姬","Yakusoku No Neverland":"约定的梦幻岛","86 -eightysix-":"86-不存在的战区-","Hentai Ouji To Warawanai Neko.":"变态王子与不笑猫。","Sakura Trick":"樱Trick","Gate - Jieitai Ka No Chi Nite Kaku Tatakaeri":"GATE 奇幻自卫队","Fresh Precure!":"Fresh光之美少女！","Ultra Series":"奥特曼系列","Arc The Lad":"亚克传承","Fushigiboshi No Futago Hime":"双子星公主","Ojisan To Marshmallow":"大叔与棉花糖","Oshiete! Galko-chan":"告诉我！辣妹子酱","Rinne No Lagrange":"轮回的拉格朗日","Shironeko Project":"白猫Project","Baccano!":"永生之酒！","Sengoku Musou":"战国无双","Sewayaki Kitsune No Senko-san":"贤惠幼妻仙狐小姐","Dirty Pair":"搞怪拍档","En'en No Shouboutai":"炎炎消防队","Bravely Default":"勇气默示录","Mikakunin De Shinkoukei":"未确认进行式","Kakegurui":"狂赌之渊","Indie Utaite":"独立唱见","Bilibili":"哔哩哔哩","Dream C Club":"梦幻俱乐部","Yosuga No Sora":"缘之空","Grisaia":"灰色的果实","Infinity Nikki":"无限暖暖","Rune Factory":"符文工房","Tianguan Cifu":"天官赐福","The Coffin Of Andy And Leyley":"安迪和莱莉的棺材","Oboro Muramasa":"胧村正","Getter Robo":"盖塔机器人","Re:creators":"Re:CREATORS","Psycho-pass":"心理测量者","Kyoukai No Kanata":"境界的彼方","Kekkai Sensen":"血界战线","Soukou Akki Muramasa":"装甲恶鬼村正","Amphibia":"奇幻沼泽","Dramatical Murder":"DRAMAtical Murder","Mother 3":"地球冒险3","Sekirei":"鹡鸰女神","Claymore":"大剑","Mazinger":"魔神","Ansatsu Kyoushitsu":"暗杀教室","Ef":"悠久之翼","Zoids":"索斯机械兽","Doom":"毁灭战士","Shinmai Maou No Testament":"新妹魔王的契约者","Sekiro: Shadows Die Twice":"只狼：影逝二度","Bamboo Blade":"竹刀少女","Fukumoto Mahjong":"福本麻将","Ys":"伊苏","Star Driver":"STAR DRIVER","Kiratto Pri Chan":"闪跃吧！星梦频道","Mass Effect":"质量效应","Mahouka Koukou No Rettousei":"魔法科高中的劣等生","Summertime Render":"夏日重现","Master Of Eternity":"战略冲撞","Jigokuraku":"地狱乐","Sk8 The Infinity":"无限滑板","Zettai Karen Children":"绝对可怜小孩","Yuusha To Maou":"勇者与魔王","Doukutsu Monogatari":"洞窟物语","Ishuzoku Reviewers":"异种族风俗娘评鉴指南","Assassin's Creed":"刺客信条","Kimi Ga Shine":"你已藏起","Orenchi No Meidosan":"我家的女仆小姐","D4dj":"D4DJ","Devil Survivor":"恶魔幸存者","Shaman King":"通灵王","La Pucelle":"光之圣女传说","Kimi Ga Nozomu Eien":"愿此刻永恒","Soukyuu No Fafner":"苍穹之法芙娜","Kimi No Koto Ga Dai Dai Dai Dai Daisuki Na 100-nin No Kanojo":"超超超超喜欢你的100个女孩子","Pandora Hearts":"潘多拉之心","Dragalia Lost":"失落的龙约","Counter:side":"未来战","Ore Twintail Ni Narimasu":"我，要成为双马尾。","Teenage Mutant Ninja Turtles":"忍者神龟","Coppelion":"核爆默示录","Azure Striker Gunvolt":"苍蓝雷霆","Fate/extra":"Fate/EXTRA","Kemurikusa":"烟草","Danshi Koukousei No Nichijou":"男子高中生的日常","Soredemo Ayumu Wa Yosetekuru":"即使如此依旧步步紧逼","Shadow Slave":"影子奴隶","Top Wo Nerae 2!":"飞越巅峰2！","Dracu-riot!":"DRACU-RIOT!","Steven Universe":"宇宙小子","Devilman":"恶魔人","Unicorn Overlord":"圣兽之王","Gj-bu":"GJ部","Sayonara Wo Oshiete":"对你说再见","Jibaku Shounen Hanako-kun":"地缚少年花子君","Maplestory":"冒险岛","Citrus (saburouta)":"citrus～柑橘味香气～","Valkyrie Profile":"北欧女神","Rainbow Six Siege":"彩虹六号：围攻","Scooby-doo":"史酷比","New Horizon":"新视野","Fate/samurai Remnant":"Fate/Samurai Remnant","Honzuki No Gekokujou":"小书痴的下克上","Ouran High School Host Club":"樱兰高校男公关部","Pacific Rim":"环太平洋","Pac-man (game)":"吃豆人","Phantom Of The Kill":"杀戮魅影","Yume 2kki":"梦2记","Haibane Renmei":"灰羽联盟","Marl Kingdom":"马尔王国","Dumbbell Nan Kilo Moteru?":"流汗吧！健身少女","Epic Seven":"第七史诗","Shy":"SHY","Wakfu":"沃土","Big Hero 6":"超能陆战队","Wind Breaker (nii Satoru)":"WIND BREAKER","Eoduun Badaui Deungbul-i Doeeo":"成为昏暗大海的灯塔","Medaka Box":"最强会长黑神","Five Nights At Freddy's":"玩具熊的五夜后宫","Armored Core":"装甲核心","Fate/zero":"Fate/Zero","Top Wo Nerae!":"飞越巅峰！","Yofukashi No Uta":"彻夜之歌","Ookami-san":"大神同学","Valkyrie Drive":"女武神驱动","Kore Wa Zombie Desu Ka?":"这样算是僵尸吗？","Gunslinger Girl":"神枪少女","Brown Dust 2":"棕色尘埃2","Katanagatari":"刀语","Urara Meirochou":"乌らら迷路帖","Yoake Mae Yori Ruri Iro Na":"夜明前的琉璃色","Black Jack":"怪医黑杰克","Voltron":"战神金刚","Pui Pui Molcar":"天竺鼠车车","Majutsushi Orphen":"魔术士奥芬","Hori-san To Miyamura-kun":"堀与宫村","Koe No Katachi":"声之形","Nikki":"暖暖","Record Of Lodoss War":"罗德斯岛战记","Kouyoku Senki Exs-tia Concert":"钢翼战姬Exs-tia Concert","Shirokami Project":"城姬Quest","Subarashiki Kono Sekai":"美妙世界","Sousai Shoujo Teien":"创彩少女庭园","Maji De Watashi Ni Koi Shinasai!":"认真和我谈恋爱！","Shikanoko Nokonoko Koshitantan":"我家的鹿乃子乃子虎视眈眈","Yatterman":"小双侠","Subarashiki Hibi":"美好的每一天","Sora Wo Kakeru Shoujo":"穿越宇宙的少女","The Witcher":"巫师","Collar X Malice":"Collar×Malice","Milgram":"MILGRAM","Demonbane":"斩魔大圣","Tenkuu No Shiro Laputa":"天空之城","Seto No Hanayome":"濑户的花嫁","Mortal Kombat":"真人快打","Dororo (tezuka)":"多罗罗","Cthulhu Mythos":"克苏鲁神话","Kamichu!":"神是中学生！","Frame Arms Girl":"机甲少女","Drifters":"漂流武士","Onegai Teacher":"拜托了，老师","Maou-jou De Oyasumi":"在魔王城说晚安","Goho Mafia! Kajita-kun":"Goho Mafia!梶田君","Witchblade":"魔女之刃","Tsugumomo":"怪怪守护神","Hitsugi No Chaika":"棺姬嘉依卡","Manatsu No Yo No Inmu":"真夏夜之淫梦","Mashle":"物理魔法使马修","Sasayaku You Ni Koi Wo Utau":"恰似细语般的恋歌","Ao No Kanata No Four Rhythm":"苍之彼方的四重奏","Sound Voltex":"SOUND VOLTEX","Enjo Kouhai":"援交后辈","Spongebob Squarepants":"海绵宝宝","Gake No Ue No Ponyo":"悬崖上的金鱼姬","Sora Yori Mo Tooi Basho":"比宇宙更遥远的地方","Hyakko":"白虎","Mashiroiro Symphony":"纯白交响曲","Hinako Note":"雏子的笔记","Addams Family":"亚当斯一家","Galaxy Angel Rune":"银河天使2","White Album":"白色相簿","Ninin Ga Shinobuden":"忍者乱太郎","Kidou Keisatsu Patlabor":"机动警察","The Little Mermaid":"小美人鱼","Portal":"传送门","Jewelpet":"宝石宠物","Baby Princess":"宝贝公主","Chaos Zero Nightmare":"混沌零噩梦","Ochame Na Okusan To No Nichijou Chabangoto":"与淘气妻子的日常茶饭事","Houkago No Pleiades":"放学后的昴星团","Ayakashi Triangle":"妖三角","Coco (disney)":"寻梦环游记","Kunio-kun Series":"热血系列","Kakumeiki Valvrave":"革命机Valvrave","Hitoribocchi No Marumaru Seikatsu":"一个人的○○小日子","Ga-rei":"喰灵","Mairimashita! Iruma-kun":"入间同学入魔了！","Musuko Ga Kawaikute Shikatanai Mazoku No Hahaoya":"儿子可爱过头的魔族母亲","Girl Cafe Gun":"少女咖啡枪","Futari Wa Precure":"光之美少女","Omamori Himari":"守护猫娘绯鞠","Bishoujo Mangekyou":"美少女万华镜","Blame!":"BLAME!","Cosmic Break":"宇宙突击队","Nerawareta Megami Tenshi Angel Tear":"被狙击的女神天使Angel Tear","Yami To Boushi To Hon No Tabibito":"暗与帽子与书之旅人"};
    let tagData = [];
    const _charCache = {};
    const _CACHE_MAX = 50;
    let _charGroupIdx = -1;
    let _seriesCharCounts = null;
    const CHAR_BASE_SUBS = 1;
    let _charPage = 1;
    const CHARS_PER_PAGE = 100;
    const CHAR_BROWSER_PER_PAGE = 40;
    let posTagPicker = null;
    let negTagPicker = null;

    const _artistCache = {};
    let _artistGroupIdx = -1;
    let _artistPage = 1;
    let _artistTotalPages = 1;
    let _artistHasMore = false;
    let _artistCurrentSort = 'score';
    let _artistCurrentLetter = 'all';
    const _ARTIST_SORT_MODES = [
        { name: '精选', sort: 'score', order: 'desc', icon: '🏆' },
        { name: '热门', sort: 'count', order: 'desc', icon: '🔥' },
        { name: '收藏', sort: 'fav', order: 'desc', icon: '❤️' },
        { name: '字母', sort: 'name', order: 'asc', icon: '🔤' },
        { name: '画师串', sort: 'chains', order: 'desc', icon: '📎' },
    ];

    const ARTIST_CHAIN_STORAGE_KEY = 'comfyui_artist_chains';
    const ARTIST_CHAIN_IMG_PREFIX = 'artist_chain_img_';

    function formatArtistChainPrompt(prompt) {
        if (!prompt) return '';
        if (!isAnimaMode()) return prompt.trim();
        return prompt.split(',').map(s => s.trim()).filter(Boolean)
            .map(part => formatAnimaArtistTag(part))
            .join(', ');
    }

    function _isArtistChainPromptInTextarea(textareaValue, rawPrompt) {
        const formatted = formatArtistChainPrompt(rawPrompt);
        const parts = textareaValue.split(',').map(s => s.trim()).filter(Boolean);
        const formattedParts = formatted.split(',').map(s => s.trim()).filter(Boolean);
        if (!formattedParts.length) return false;
        return formattedParts.every(fp => parts.some(p => {
            const m = p.match(/^\((.+?):([\d.]+)\)$/);
            return (m ? m[1] : p) === fp;
        }));
    }

    const ArtistChainManager = {
        _chains: null,
        async load() {
            if (this._chains) return this._chains;
            try {
                const raw = localStorage.getItem(ARTIST_CHAIN_STORAGE_KEY);
                const meta = raw ? JSON.parse(raw) : [];
                this._chains = await Promise.all(meta.map(async (m) => {
                    const img = await _bigCacheGet(ARTIST_CHAIN_IMG_PREFIX + m.id);
                    return { ...m, th: img || m.th || '' };
                }));
            } catch {
                this._chains = [];
            }
            return this._chains;
        },
        async _persistMeta() {
            const meta = this._chains.map(({ id, name, prompt, createdAt, updatedAt }) => ({
                id, name, prompt, createdAt, updatedAt,
            }));
            localStorage.setItem(ARTIST_CHAIN_STORAGE_KEY, JSON.stringify(meta));
        },
        async getAll() {
            await this.load();
            return [...this._chains];
        },
        toTagItem(chain) {
            return {
                t: chain.prompt,
                d: chain.name,
                th: chain.th || '',
                img: chain.th || '',
                _chainId: chain.id,
                _isArtistChain: true,
                type: 'artist',
            };
        },
        async add({ name, prompt, imageData }) {
            await this.load();
            const id = 'ac_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            const chain = {
                id,
                name: (name || '未命名画师串').trim(),
                prompt: (prompt || '').trim(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                th: '',
            };
            if (imageData) {
                await _bigCacheSet(ARTIST_CHAIN_IMG_PREFIX + id, imageData);
                chain.th = imageData;
            }
            this._chains.unshift(chain);
            await this._persistMeta();
            return chain;
        },
        async update(id, { name, prompt, imageData, removeImage }) {
            await this.load();
            const chain = this._chains.find(c => c.id === id);
            if (!chain) return null;
            if (name != null) chain.name = name.trim() || chain.name;
            if (prompt != null) chain.prompt = prompt.trim();
            if (removeImage) {
                try {
                    const db = await _openBigCacheDb();
                    await new Promise((resolve, reject) => {
                        const tx = db.transaction('kv', 'readwrite');
                        tx.objectStore('kv').delete(ARTIST_CHAIN_IMG_PREFIX + id);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error);
                    });
                } catch { /* ignore */ }
                chain.th = '';
            } else if (imageData) {
                await _bigCacheSet(ARTIST_CHAIN_IMG_PREFIX + id, imageData);
                chain.th = imageData;
            }
            chain.updatedAt = Date.now();
            await this._persistMeta();
            return chain;
        },
        async remove(id) {
            await this.load();
            this._chains = this._chains.filter(c => c.id !== id);
            try {
                const db = await _openBigCacheDb();
                await new Promise((resolve, reject) => {
                    const tx = db.transaction('kv', 'readwrite');
                    tx.objectStore('kv').delete(ARTIST_CHAIN_IMG_PREFIX + id);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error);
                });
            } catch { /* ignore */ }
            await this._persistMeta();
        },
    };

    async function _compressChainImageFile(file, maxSize = 480) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    if (w > maxSize || h > maxSize) {
                        const ratio = Math.min(maxSize / w, maxSize / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.onerror = () => reject(new Error('图片读取失败'));
                img.src = reader.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    function _isArtistChainsMode(picker) {
        const sub = tagData[_artistGroupIdx]?.subgroups[picker?.subIdx];
        return sub?._artistSort === 'chains';
    }

    function _isArtistGroupIndex(groupIdx) {
        const g = tagData[groupIdx];
        if (!g) return false;
        return groupIdx === _artistGroupIdx || g._isArtistGroup === true;
    }

    function _isArtistGroupHiddenOnTags(groupIdx) {
        const g = tagData[groupIdx];
        if (!g) return false;
        return _isArtistGroupIndex(groupIdx) || g.name === '画师风格';
    }

    function _prepareArtistTab(picker, subIdx = 0) {
        if (!picker || _artistGroupIdx < 0) return false;
        const maxSub = tagData[_artistGroupIdx]?.subgroups?.length || 0;
        picker.groupIdx = _artistGroupIdx;
        picker.subIdx = Math.max(0, Math.min(subIdx, maxSub - 1));
        picker._virtualMode = null;
        picker._searchMode = 'tag';
        picker.searchEl.value = '';
        if (picker.searchModeBtn) {
            picker.searchModeBtn.textContent = '标签';
            picker.searchModeBtn.classList.remove('mode-category');
        }
        const sub = tagData[_artistGroupIdx]?.subgroups[picker.subIdx];
        picker.searchEl.placeholder = sub?._artistSort === 'chains' ? '搜索画师串...' : '搜索画师...';
        _artistPage = 1;
        if (sub?._artistSort) {
            _artistCurrentSort = sub._artistSort;
            _artistCurrentLetter = 'all';
        }
        return true;
    }

    // ==================== 大文件缓存 (IndexedDB，避免 localStorage 5MB 上限) ====================
    const _BIG_CACHE_DB = 'comfyui-web-cache';
    let _bigCacheDbPromise = null;

    function _openBigCacheDb() {
        if (!_bigCacheDbPromise) {
            _bigCacheDbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(_BIG_CACHE_DB, 1);
                req.onupgradeneeded = (e) => { e.target.result.createObjectStore('kv'); };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        return _bigCacheDbPromise;
    }

    async function _bigCacheGet(key) {
        try {
            const db = await _openBigCacheDb();
            return await new Promise((resolve, reject) => {
                const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
                req.onsuccess = () => resolve(req.result ?? null);
                req.onerror = () => reject(req.error);
            });
        } catch { return null; }
    }

    async function _bigCacheSet(key, val) {
        try {
            const db = await _openBigCacheDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction('kv', 'readwrite');
                tx.objectStore('kv').put(val, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            return true;
        } catch (e) {
            console.warn('[Cache] IndexedDB save failed:', key, e.message);
            return false;
        }
    }

    async function _migrateLargeCacheToIdb() {
        const keys = ['_tags_cache', '_tags_ver', '_series_cache', '_series_cache_ts'];
        for (const key of keys) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const val = (key === '_tags_cache' || key === '_series_cache')
                    ? JSON.parse(raw)
                    : (key === '_series_cache_ts' ? parseInt(raw, 10) || 0 : raw);
                await _bigCacheSet(key, val);
                localStorage.removeItem(key);
            } catch { /* ignore */ }
        }
    }

    function _injectArtistGroup() {
        // 去掉 tags.json 里的旧「画师风格」静态词表，以及上次注入的虚拟组，避免桌面标签栏出现双 Tab / 作品数分段
        tagData = tagData.filter(g => !g._isArtistGroup && g.name !== '画师风格');
        const artistGroup = {
            name: '画师风格',
            _isArtistGroup: true,
            subgroups: _ARTIST_SORT_MODES.map(mode => ({
                name: `${mode.icon} ${mode.name}`,
                _artistSort: mode.sort,
                _artistOrder: mode.order,
                tags: [],
            }))
        };
        tagData.push(artistGroup);
        _artistGroupIdx = tagData.length - 1;
    }

    function _resolveSeriesCharCount(seriesId) {
        if (_seriesCharCounts && Object.prototype.hasOwnProperty.call(_seriesCharCounts, seriesId)) {
            return _seriesCharCounts[seriesId];
        }
        return 0;
    }

    /** 作品栏：角色数降序（同数再按中文名）；对象/身份等基础分类固定在前 */
    function _sortSeriesSubgroupsByCharCount(group) {
        if (!group?.subgroups?.length) return;
        const base = [];
        const series = [];
        group.subgroups.forEach((sub) => {
            if (!sub) return;
            if (sub._seriesId) series.push(sub);
            else base.push(sub);
        });
        series.sort((a, b) => {
            const ca = Number(a._seriesCount) || _resolveSeriesCharCount(a._seriesId) || 0;
            const cb = Number(b._seriesCount) || _resolveSeriesCharCount(b._seriesId) || 0;
            if (cb !== ca) return cb - ca;
            return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
        });
        group.subgroups = [...base, ...series];
    }

    function _patchSeriesCountsOnTagData() {
        if (_charGroupIdx < 0 || !_seriesCharCounts) return;
        const group = tagData[_charGroupIdx];
        if (!group?.subgroups) return;
        group.subgroups.forEach(sub => {
            if (sub?._seriesId) sub._seriesCount = _resolveSeriesCharCount(sub._seriesId);
        });
        _sortSeriesSubgroupsByCharCount(group);
    }

    async function _loadSeriesCharCounts() {
        const cached = await _bigCacheGet('_series_char_counts');
        if (cached && typeof cached === 'object') {
            _seriesCharCounts = cached;
            _patchSeriesCountsOnTagData();
        }
        try {
            const res = await fetch('/series_char_counts.json');
            if (!res.ok) return false;
            const currentVer = res.headers.get('etag') || res.headers.get('last-modified') || '';
            const cachedVer = (await _bigCacheGet('_series_char_counts_ver')) || '';
            if (currentVer && currentVer === cachedVer && _seriesCharCounts) return false;
            const data = await res.json();
            _seriesCharCounts = data;
            await _bigCacheSet('_series_char_counts', data);
            if (currentVer) await _bigCacheSet('_series_char_counts_ver', currentVer);
            _patchSeriesCountsOnTagData();
            return true;
        } catch {
            return false;
        }
    }

    // tags.json「人物」基础分类快照（对象/身份/年龄…），用于修复旧缓存只剩「对象」的问题
    let _personBaseSubsFresh = null;

    async function _ensurePersonBaseSubsFresh() {
        if (_personBaseSubsFresh?.length) return;
        const idx = tagData.findIndex(g => g && g.name === '人物');
        const current = idx >= 0 ? (tagData[idx].subgroups || []) : [];
        const currentBase = current.filter(s => s && !s._seriesId);
        // 仍含「身份」说明基础分类完整，可直接快照
        if (currentBase.some(s => s.name === '身份') && currentBase.some(s => s.name === '对象')) {
            _personBaseSubsFresh = currentBase.map(s => ({
                name: s.name,
                tags: Array.isArray(s.tags) ? s.tags.slice() : [],
            }));
            return;
        }
        try {
            const res = await fetch('/tags.json');
            if (!res.ok) return;
            const data = await res.json();
            const person = Array.isArray(data) ? data.find(g => g && g.name === '人物') : null;
            if (!person?.subgroups?.length) return;
            _personBaseSubsFresh = person.subgroups
                .filter(s => s && !s._seriesId)
                .map(s => ({
                    name: s.name,
                    tags: Array.isArray(s.tags) ? s.tags.slice() : [],
                }));
        } catch { /* ignore */ }
    }

    function _buildSeriesNameSet(seriesList) {
        const seriesNameSet = new Set();
        seriesList.forEach((s) => {
            if (!s) return;
            if (s.name) seriesNameSet.add(s.name);
            const cn = _SERIES_CN[s.name] || s.name;
            if (cn) seriesNameSet.add(cn);
        });
        return seriesNameSet;
    }

    function _collectPersonBaseSubs(group, seriesNameSet) {
        let baseSubs = (group.subgroups || []).filter((s) => {
            if (!s || s._seriesId) return false;
            return !seriesNameSet.has(s.name);
        });
        // 旧逻辑曾只保留「对象/属性」，导致「身份」等分类丢失 → 用 tags.json 快照恢复
        if (!baseSubs.some(s => s.name === '身份') && _personBaseSubsFresh?.length) {
            baseSubs = _personBaseSubsFresh.filter(s => s && !seriesNameSet.has(s.name));
        }
        return baseSubs;
    }

    function _applySeriesListToTagData(seriesList) {
        if (_charGroupIdx < 0) {
            _charGroupIdx = tagData.findIndex(g => g.name === '人物');
        }
        if (_charGroupIdx < 0 || !Array.isArray(seriesList) || !seriesList.length) return false;
        const group = tagData[_charGroupIdx];
        if (!group) return false;
        if (!group.subgroups) group.subgroups = [];

        const seriesNameSet = _buildSeriesNameSet(seriesList);
        const baseSubs = _collectPersonBaseSubs(group, seriesNameSet);
        const needBaseRestore = !group.subgroups.some(s => s && !s._seriesId && s.name === '身份');

        const existingById = {};
        for (const s of group.subgroups) {
            if (s && s._seriesId) existingById[s._seriesId] = s;
        }

        const hasDbSeries = group.subgroups.some(s => s && s._seriesId);
        // 已有 D1 系列且基础分类完整 → 只更新封面/计数，保护本地角色 tags 缓存
        if (hasDbSeries && !needBaseRestore) {
            const seriesMap = Object.fromEntries(seriesList.map(s => [s.id, s]));
            group.subgroups.forEach(sub => {
                if (!sub?._seriesId) return;
                const row = seriesMap[sub._seriesId];
                if (row) {
                    sub._coverUrl = row.cover_url || '';
                    sub._seriesCount = _resolveSeriesCharCount(sub._seriesId);
                }
            });
            _sortSeriesSubgroupsByCharCount(group);
            return true;
        }

        // 首次注入，或修复旧缓存：基础分类 + D1 系列（保留已加载的系列角色 tags）
        const dbSubs = seriesList.map(s => {
            const prev = s.id ? existingById[s.id] : null;
            return {
                name: _SERIES_CN[s.name] || s.name,
                _seriesId: s.id,
                _seriesCount: _resolveSeriesCharCount(s.id),
                _coverUrl: s.cover_url || prev?._coverUrl || '',
                tags: Array.isArray(prev?.tags) ? prev.tags : [],
            };
        });
        group.subgroups = [...baseSubs, ...dbSubs];
        _sortSeriesSubgroupsByCharCount(group);
        return true;
    }

    async function _loadSeriesFromLocalCache() {
        const seriesList = await _bigCacheGet('_series_cache');
        if (!seriesList || !Array.isArray(seriesList) || !seriesList.length) return false;
        await _ensurePersonBaseSubsFresh();
        return _applySeriesListToTagData(seriesList);
    }

    async function _saveSeriesLocalCache(seriesList) {
        const compact = seriesList.map(s => ({
            id: s.id,
            name: s.name,
            count: s.count,
            cover_url: s.cover_url || null,
        }));
        await _bigCacheSet('_series_cache', compact);
        await _bigCacheSet('_series_cache_ts', Date.now());
    }

    async function _loadSeriesFromApi(forceRefresh = false) {
        if (_charGroupIdx < 0) {
            _charGroupIdx = tagData.findIndex(g => g.name === '人物');
        }
        if (_charGroupIdx < 0) return false;
        const group = tagData[_charGroupIdx];
        if (!group) return false;

        const seriesSubs = group.subgroups.filter(s => s && s._seriesId);
        const hasDbSeries = seriesSubs.length > 0;
        const hasPersonBase = group.subgroups.some(s => s && !s._seriesId && s.name === '身份');
        if (!forceRefresh && hasDbSeries && hasPersonBase && seriesSubs.every(s => s._coverUrl !== undefined)) {
            return false;
        }

        try {
            const res = await fetch('/api/characters/series');
            if (!res.ok) return false;
            const seriesList = await res.json();
            await _ensurePersonBaseSubsFresh();
            const changed = _applySeriesListToTagData(seriesList);
            await _saveSeriesLocalCache(seriesList);
            // 基础分类被恢复后写回标签缓存，避免下次冷启动仍缺「身份」等 Tab
            if (changed) {
                try { await _bigCacheSet('_tags_cache', tagData); } catch { /* ignore */ }
            }
            console.log(`[D1] Loaded ${seriesList.length} series from database`);
            return true;
        } catch (e) {
            console.warn('[D1] 角色系列加载失败:', e.message);
            return false;
        }
    }

    const SERIES_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

    async function _refreshTagsAndSeriesInBackground() {
        let tagsChanged = false;
        try {
            const res = await fetch('/tags.json');
            if (res.ok) {
                const currentVer = res.headers.get('etag') || res.headers.get('last-modified') || '';
                const cachedVer = (await _bigCacheGet('_tags_ver')) || '';
                if (currentVer && currentVer !== cachedVer) {
                    const newData = await res.json();
                    tagData = newData;
                    await _bigCacheSet('_tags_cache', tagData);
                    await _bigCacheSet('_tags_ver', currentVer);
                    _charGroupIdx = tagData.findIndex(g => g.name === '人物');
                    await _loadSeriesCharCounts();
                    await _loadSeriesFromLocalCache();
                    _injectArtistGroup();
                    tagsChanged = true;
                }
            }
        } catch { /* offline — keep cache */ }

        const cacheTs = (await _bigCacheGet('_series_cache_ts')) || 0;
        const seriesStale = !cacheTs || Date.now() - cacheTs > SERIES_CACHE_MAX_AGE;
        const seriesChanged = seriesStale ? await _loadSeriesFromApi(true) : false;
        const charCountsChanged = await _loadSeriesCharCounts();
        if (tagsChanged || seriesChanged || charCountsChanged) {
            posTagPicker?.render();
            negTagPicker?.render();
            if (document.querySelector('.main')?.classList.contains('mobile-tab-characters')) {
                renderMobileSeriesList(_seriesListState.filter || '');
            }
        }
    }

    async function loadTags() {
        await _migrateLargeCacheToIdb();

        const cached = await _bigCacheGet('_tags_cache');
        if (cached && Array.isArray(cached) && cached.length) {
            tagData = cached;
        }

        if (!tagData.length) {
            try {
                const res = await fetch('/tags.json');
                tagData = await res.json();
                const currentVer = res.headers.get('etag') || res.headers.get('last-modified') || '';
                await _bigCacheSet('_tags_cache', tagData);
                if (currentVer) await _bigCacheSet('_tags_ver', currentVer);
            } catch (e) {
                console.warn('标签数据加载失败:', e);
                tagData = tagData || [];
            }
        }

        _charGroupIdx = tagData.findIndex(g => g.name === '人物');
        await _loadSeriesCharCounts();
        await _loadSeriesFromLocalCache();
        _injectArtistGroup();

        _refreshTagsAndSeriesInBackground();
    }

    function _ssGet(key) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } }
    function _ssSet(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { } }

    async function _fetchSeriesChars(seriesId) {
        const expected = Number(_resolveSeriesCharCount(seriesId) || 0);
        if (_charCache[seriesId]) {
            if (!expected || _charCache[seriesId].length === expected) return _charCache[seriesId];
            delete _charCache[seriesId];
        }
        const ssKey = '_ch_' + seriesId;
        const ss = _ssGet(ssKey);
        if (ss && Array.isArray(ss) && (!expected || ss.length === expected)) {
            _charCache[seriesId] = ss;
            return ss;
        }
        try { sessionStorage.removeItem(ssKey); } catch { }
        const res = await fetch(`/api/characters/${encodeURIComponent(seriesId)}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (Object.keys(_charCache).length >= _CACHE_MAX) {
            delete _charCache[Object.keys(_charCache)[0]];
        }
        _charCache[seriesId] = data;
        _ssSet(ssKey, data);
        return data;
    }

    async function _searchCharsFromDb(query) {
        try {
            const res = await fetch(`/api/characters/search?q=${encodeURIComponent(query)}&limit=100`);
            if (!res.ok) { console.warn('[API] Character search failed:', res.status); return []; }
            return await res.json();
        } catch (e) { console.warn('[API] Character search error:', e.message); return []; }
    }

    async function _fetchArtists(sort = 'score', order = 'desc', page = 1, letter = 'all') {
        const key = `${sort}_${order}_${page}_${letter}`;
        if (_artistCache[key]) return _artistCache[key];
        const ssKey = '_ar_' + key;
        const ss = _ssGet(ssKey);
        if (ss) { _artistCache[key] = ss; return ss; }
        try {
            let url = `/api/artists/list?sort=${sort}&order=${order}&page=${page}&limit=100`;
            if (letter && letter !== 'all') url += `&letter=${letter}`;
            const res = await fetch(url);
            if (!res.ok) return { tags: [], pages: 1 };
            const data = await res.json();
            const tags = data.results.map(a => ({
                t: a.trigger_text,
                d: a.name,
                th: a.thumb_url,
                img: a.img_url,
                count: a.count,
                score: a.score,
                fav: a.fav_count,
            }));
            const result = { tags, pages: data.pages, total: data.total, hasMore: !!data.hasMore };
            if (page > 1 && (result.pages == null || result.total == null)) {
                const headKey = `${sort}_${order}_1_${letter}`;
                const head = _artistCache[headKey] || _ssGet('_ar_' + headKey);
                if (head) {
                    if (result.pages == null) result.pages = head.pages;
                    if (result.total == null) result.total = head.total;
                }
            }
            if (result.pages == null) {
                if (result.total != null && result.total > 0) {
                    result.pages = Math.max(1, Math.ceil(result.total / 100));
                } else {
                    result.pages = result.hasMore ? page + 1 : Math.max(page, 1);
                }
            } else if (result.hasMore) {
                result.pages = Math.max(result.pages, page + 1);
            }
            if (Object.keys(_artistCache).length >= _CACHE_MAX) {
                delete _artistCache[Object.keys(_artistCache)[0]];
            }
            _artistCache[key] = result;
            _ssSet(ssKey, result);
            return result;
        } catch (e) { console.warn('[API] Artist list error:', e.message); return { tags: [], pages: 1 }; }
    }

    async function _searchArtistsFromDb(query) {
        try {
            const res = await fetch(`/api/artists/search?q=${encodeURIComponent(query)}&limit=100`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.map(a => ({
                t: a.trigger_text,
                d: a.name,
                th: a.thumb_url,
                img: a.img_url,
                count: a.count,
            }));
        } catch (e) { console.warn('[API] Artist search error:', e.message); return []; }
    }

    // ==================== 懒加载与骨架屏 ====================
    let _imgObserver = null;
    function _getImgObserver() {
        if (_imgObserver) return _imgObserver;
        _imgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const src = img.dataset.src;
                if (!src) return;
                _imgObserver.unobserve(img);
                img.onload = () => {
                    img.classList.remove('img-loading');
                    img.classList.add('img-loaded');
                    const skel = img.parentElement?.querySelector('.thumb-skeleton');
                    if (skel) skel.classList.add('hide');
                };
                img.onerror = () => {
                    img.style.display = 'none';
                    const skel = img.parentElement?.querySelector('.thumb-skeleton');
                    if (skel) skel.classList.add('hide');
                };
                img.src = src;
            });
        }, { rootMargin: '200px' });
        return _imgObserver;
    }

    let _charGridImgObserver = null;
    function _observeCharBrowserImages(imgList) {
        const root = document.getElementById('char-browser-grid');
        if (!root || !imgList.length) return;
        if (!_charGridImgObserver) {
            _charGridImgObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (!src) return;
                    _charGridImgObserver.unobserve(img);
                    img.onload = () => {
                        img.classList.remove('img-loading');
                        img.classList.add('img-loaded');
                        img.parentElement?.querySelector('.thumb-skeleton')?.classList.add('hide');
                    };
                    img.onerror = () => {
                        img.style.display = 'none';
                        img.parentElement?.querySelector('.thumb-skeleton')?.classList.add('hide');
                    };
                    img.src = src;
                });
            }, { root, rootMargin: '160px' });
        }
        imgList.forEach(img => { if (img) _charGridImgObserver.observe(img); });
    }

    function _observeLazyImages(imgList) {
        const obs = _getImgObserver();
        imgList.forEach(img => { if (img) obs.observe(img); });
    }

    function _buildSkeletonGrid(count) {
        let html = '<div class="skeleton-row">';
        for (let i = 0; i < count; i++) {
            html += '<div class="skeleton-card"></div>';
        }
        html += '</div>';
        return html;
    }

    class TagPicker {
        constructor(pickerId, textarea) {
            this.id = pickerId;
            this.textarea = textarea;
            this.groupIdx = 0;
            this.subIdx = 0;
            this._virtualMode = null;
            this._virtualSub = 0;
            this.tabsEl = document.querySelector(`.tag-tabs[data-picker="${pickerId}"]`);
            this.subTabsEl = document.querySelector(`.tag-subtabs[data-picker="${pickerId}"]`);
            this.gridEl = document.querySelector(`.tag-grid[data-picker="${pickerId}"]`);
            this.searchEl = document.querySelector(`.tag-search[data-picker="${pickerId}"]`);
            this.searchModeBtn = document.querySelector(`.search-mode-btn[data-picker="${pickerId}"]`);
            this._searchMode = 'tag';

            if (this.searchModeBtn) {
                this.searchModeBtn.addEventListener('click', () => {
                    this._searchMode = this._searchMode === 'tag' ? 'category' : 'tag';
                    this.searchModeBtn.textContent = this._searchMode === 'tag' ? '标签' : '分类';
                    this.searchModeBtn.classList.toggle('mode-category', this._searchMode === 'category');
                    this.searchEl.placeholder = this._searchMode === 'tag' ? '搜索标签...' : '搜索分类/作品名...';
                    this.searchEl.value = '';
                    this.renderGrid();
                });
            }

            this._acDropdown = null;

            let debounce;
            this.searchEl.addEventListener('input', () => {
                clearTimeout(debounce);
                if (this._searchMode === 'category') {
                    debounce = setTimeout(() => this._showCategoryAutocomplete(), 200);
                } else {
                    this._hideAutocomplete();
                    debounce = setTimeout(() => this.renderGrid(), 350);
                }
            });
            this.searchEl.addEventListener('focus', () => {
                if (this._searchMode === 'category' && this.searchEl.value.trim()) {
                    this._showCategoryAutocomplete();
                }
            });
            document.addEventListener('click', (e) => {
                if (this._acDropdown && !this._acDropdown.contains(e.target) && e.target !== this.searchEl) {
                    this._hideAutocomplete();
                }
            });

            this.textarea.addEventListener('input', () => this.refreshHighlights());

            this.render();
        }

        refreshHighlights() {
            const selected = this.getSelectedTags();
            this.gridEl.querySelectorAll('.tag-item').forEach(el => {
                const tagName = el.dataset.tag;
                if (!tagName) return;
                el.classList.toggle('selected', selected.has(tagName));
            });
        }

        _isMobilePicker() {
            return window.matchMedia('(max-width: 640px)').matches;
        }

        _isCharSeriesActive() {
            if (this._virtualMode || _charGroupIdx < 0 || this.groupIdx !== _charGroupIdx) return false;
            const sub = tagData[this.groupIdx]?.subgroups[this.subIdx];
            return !!(sub && sub._seriesId);
        }

        _getMobileTabContext() {
            const main = document.querySelector('.main');
            if (!main) return null;
            if (main.classList.contains('mobile-tab-tags')) return 'tags';
            if (main.classList.contains('mobile-tab-artists')) return 'artists';
            return null;
        }

        _isOnArtistTab() {
            return this.id === 'tag-picker-pos' && document.querySelector('.main')?.classList.contains('mobile-tab-artists');
        }

        _shouldHideGroup(groupIdx) {
            const ctx = this._getMobileTabContext();
            if (!ctx) return false;
            if (ctx === 'tags' && _isArtistGroupHiddenOnTags(groupIdx)) return true;
            if (ctx === 'artists' && !_isArtistGroupIndex(groupIdx)) return true;
            return false;
        }

        _shouldHideSubgroup(groupIdx, subIdx) {
            const ctx = this._getMobileTabContext();
            if (ctx !== 'tags' || groupIdx !== _charGroupIdx) return false;
            const sub = tagData[groupIdx]?.subgroups[subIdx];
            return !!(sub && sub._seriesId);
        }

        _ensureValidGroupForMobile() {
            const ctx = this._getMobileTabContext();
            if (!ctx) return;
            if (ctx === 'artists' && this.id !== 'tag-picker-pos') return;

            if (this._shouldHideGroup(this.groupIdx)) {
                if (ctx === 'tags') {
                    this.groupIdx = _charGroupIdx >= 0 ? _charGroupIdx : 0;
                    this.subIdx = 0;
                } else if (ctx === 'artists' && _artistGroupIdx >= 0) {
                    this.groupIdx = _artistGroupIdx;
                    this.subIdx = 0;
                }
                this._virtualMode = null;
                this.searchEl.value = '';
                _charPage = 1;
            }

            if (ctx === 'tags' && this.groupIdx === _charGroupIdx && this._shouldHideSubgroup(this.groupIdx, this.subIdx)) {
                this.subIdx = 0;
            }

            if (ctx === 'artists' && _artistGroupIdx >= 0) {
                this.groupIdx = _artistGroupIdx;
                const maxSub = tagData[_artistGroupIdx]?.subgroups?.length || 0;
                if (this.subIdx < 0 || this.subIdx >= maxSub) this.subIdx = 0;
                this._virtualMode = null;
                this._searchMode = 'tag';
                this.searchEl.value = '';
                if (this.searchModeBtn) {
                    this.searchModeBtn.textContent = '标签';
                    this.searchModeBtn.classList.remove('mode-category');
                }
                this.searchEl.placeholder = '搜索标签...';
                _artistPage = 1;
            }
        }

        _updateMobileCharLayout() {
            const picker = this.gridEl?.closest('.tag-picker');
            if (!picker) return;
            picker.classList.remove('mobile-char-view');
            const bar = picker.querySelector('.char-series-bar');
            if (bar) bar.remove();
        }

        render() {
            this._ensureValidGroupForMobile();
            this.renderTabs();
            this.renderSubTabs();
            this.renderGrid();
        }

        renderTabs() {
            this.tabsEl.innerHTML = '';
            tagData.forEach((g, i) => {
                if (this._shouldHideGroup(i)) return;
                const tab = document.createElement('span');
                tab.className = 'tab' + (i === this.groupIdx && !this._virtualMode ? ' active' : '');
                tab.textContent = g.name;
                tab.addEventListener('click', () => {
                    this.groupIdx = i;
                    this.subIdx = 0;
                    this._virtualMode = null;
                    this.searchEl.value = '';
                    _charPage = 1;
                    if (i === _charGroupIdx && this._getMobileTabContext() === 'tags') {
                        this.subIdx = 0;
                    }
                    if (i === _artistGroupIdx) {
                        _artistPage = 1;
                        _artistCurrentSort = 'score';
                        _artistCurrentLetter = 'all';
                    }
                    this._removePagination();
                    this.render();
                    if (this._getMobileTabContext() === 'artists') syncMobileArtistNav(this.subIdx);
                });
                this.tabsEl.appendChild(tab);
            });
            _VIRTUAL_TABS.forEach(vt => {
                const tab = document.createElement('span');
                tab.className = 'tab tab-virtual' + (this._virtualMode === vt._virtual ? ' active' : '');
                tab.textContent = vt.name;
                tab.addEventListener('click', () => {
                    this._virtualMode = vt._virtual;
                    this.searchEl.value = '';
                    this._removePagination();
                    this.render();
                });
                this.tabsEl.appendChild(tab);
            });
        }

        renderSubTabs() {
            this.subTabsEl.innerHTML = '';
            if (this._virtualMode) {
                if (this._virtualMode === 'fav') {
                    ['全部', '标签', '角色', '画师'].forEach((name, i) => {
                        const tab = document.createElement('span');
                        tab.className = 'tab' + (i === (this._virtualSub || 0) ? ' active' : '');
                        tab.textContent = name;
                        tab.addEventListener('click', () => { this._virtualSub = i; this.renderSubTabs(); this.renderGrid(); });
                        this.subTabsEl.appendChild(tab);
                    });
                    const clearBtn = document.createElement('span');
                    clearBtn.className = 'tab';
                    clearBtn.textContent = '🗑️ 清空收藏';
                    clearBtn.style.marginLeft = 'auto';
                    clearBtn.addEventListener('click', () => { if (confirm('确定清空所有收藏？')) { FavManager.clear(); this.renderGrid(); } });
                    this.subTabsEl.appendChild(clearBtn);
                } else {
                    const clearBtn = document.createElement('span');
                    clearBtn.className = 'tab';
                    clearBtn.textContent = '🗑️ 清空记录';
                    clearBtn.addEventListener('click', () => { if (confirm('确定清空使用记录？')) { UsageTracker.clear(); this.renderGrid(); } });
                    this.subTabsEl.appendChild(clearBtn);
                }
                return;
            }
            const subs = (tagData[this.groupIdx]?.subgroups || []).filter(Boolean);
            const ctx = this._getMobileTabContext();
            const visibleEntries = subs.map((s, i) => ({ s, i })).filter(({ i }) => !this._shouldHideSubgroup(this.groupIdx, i));

            if (ctx === 'artists' && this.groupIdx === _artistGroupIdx) {
                return;
            }

            if (ctx === 'tags' && this.groupIdx === _charGroupIdx && visibleEntries.length <= 1) {
                if (visibleEntries.length) this.subIdx = visibleEntries[0].i;
                return;
            }

            visibleEntries.forEach(({ s, i }) => {
                const tab = document.createElement('span');
                tab.className = 'tab' + (i === this.subIdx ? ' active' : '');
                tab.textContent = s.name;
                tab.addEventListener('click', () => {
                    this.subIdx = i;
                    if (this.groupIdx === _artistGroupIdx && s._artistSort) {
                        _artistPage = 1;
                        _artistCurrentSort = s._artistSort;
                        _artistCurrentLetter = 'all';
                        syncMobileArtistNav(i);
                    }
                    if (this.groupIdx === _charGroupIdx && s._seriesId) {
                        _charPage = 1;
                        if (this._isMobilePicker() && ctx !== 'tags') {
                            openCharBrowser(s._seriesId, s.name);
                            return;
                        }
                    }
                    this.renderSubTabs();
                    if (this.groupIdx === _charGroupIdx && i >= CHAR_BASE_SUBS && s._seriesId && s.tags.length === 0) {
                        this.gridEl.innerHTML = _buildSkeletonGrid(8);
                        _fetchSeriesChars(s._seriesId).then(tags => {
                            s.tags = tags;
                            this.renderGrid();
                        });
                    } else {
                        this.renderGrid();
                    }
                });
                this.subTabsEl.appendChild(tab);
            });
            if (this.groupIdx === _artistGroupIdx) {
                this._renderArtistLetterBar();
            }
            this._updateMobileCharLayout();
        }

        _renderArtistLetterBar() {
            const sub = tagData[_artistGroupIdx]?.subgroups[this.subIdx];
            if (!sub || sub._artistSort !== 'name') return;
            let bar = this.subTabsEl.parentElement.querySelector('.artist-letter-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'artist-letter-bar';
                this.subTabsEl.parentElement.insertBefore(bar, this.gridEl);
            }
            bar.innerHTML = '';
            const letters = ['all', ...'abcdefghijklmnopqrstuvwxyz'.split(''), 'other'];
            const labels = { all: '全部', other: '#' };
            letters.forEach(l => {
                const btn = document.createElement('span');
                btn.className = 'letter-btn' + (l === _artistCurrentLetter ? ' active' : '');
                btn.textContent = labels[l] || l.toUpperCase();
                btn.addEventListener('click', () => {
                    _artistCurrentLetter = l;
                    _artistPage = 1;
                    this.renderGrid();
                    bar.querySelectorAll('.letter-btn').forEach(b => b.classList.toggle('active', b.textContent === (labels[l] || l.toUpperCase())));
                });
                bar.appendChild(btn);
            });
        }

        renderGrid() {
            if (!this.gridEl || !this.subTabsEl) { console.error('Missing elements!'); return; }
            this.gridEl.innerHTML = '';
            this._removePagination();
            this._hideAutocomplete();

            if (this._virtualMode) {
                let items = [];
                if (this._virtualMode === 'fav') {
                    const typeFilter = ['all', 'tag', 'character', 'artist'][this._virtualSub || 0];
                    items = FavManager.getAll();
                    if (typeFilter !== 'all') items = items.filter(f => f.type === typeFilter);
                } else if (this._virtualMode === 'recent') {
                    items = UsageTracker.getRecent(100);
                } else if (this._virtualMode === 'frequent') {
                    items = UsageTracker.getFrequent(100);
                }
                const search = this.searchEl.value.toLowerCase();
                if (search) items = items.filter(t => t.t.toLowerCase().includes(search) || (t.d || '').toLowerCase().includes(search));
                if (items.length === 0) {
                    const msg = this._virtualMode === 'fav' ? '还没有收藏任何标签，在标签卡片上点击 ⭐ 来收藏' : '还没有使用记录，使用标签后会自动记录';
                    this.gridEl.innerHTML = `<div style="padding:30px;color:var(--text-secondary);text-align:center;width:100%;font-size:0.85rem">${msg}</div>`;
                    this._updateMobileCharLayout();
                    return;
                }
                const useGrouped = (this._virtualMode === 'fav' && (this._virtualSub || 0) === 0) || this._virtualMode === 'recent' || this._virtualMode === 'frequent';
                if (useGrouped && items.length > 0) {
                    const emptyMsg = this._virtualMode === 'fav' ? '还没有收藏任何标签，在标签卡片上点击 ⭐ 来收藏' : '还没有使用记录';
                    this._renderGroupedFavItems(items, emptyMsg);
                } else {
                    this._renderItems(items);
                }
                this._updateMobileCharLayout();
                return;
            }

            const mobileCtx = this._getMobileTabContext();
            const onArtistTab = this._isOnArtistTab();
            if (onArtistTab && _artistGroupIdx >= 0) {
                this.groupIdx = _artistGroupIdx;
            }
            const search = (mobileCtx === 'artists' || onArtistTab || this._searchMode === 'category') ? '' : this.searchEl.value.toLowerCase();
            let items;
            if (search) {
                if (this.groupIdx === _artistGroupIdx || onArtistTab) {
                    const sub = tagData[_artistGroupIdx]?.subgroups[this.subIdx];
                    if (sub?._artistSort === 'chains') {
                        this.gridEl.innerHTML = _buildSkeletonGrid(4);
                        ArtistChainManager.getAll().then(chains => {
                            const q = search.toLowerCase();
                            const filtered = chains
                                .filter(c => c.name.toLowerCase().includes(q) || c.prompt.toLowerCase().includes(q))
                                .map(c => ArtistChainManager.toTagItem(c));
                            this._renderArtistChains(filtered);
                        });
                        return;
                    }
                    this.gridEl.innerHTML = _buildSkeletonGrid(4);
                    _searchArtistsFromDb(search).then(dbItems => {
                        this._renderItems(dbItems);
                    });
                    return;
                }
                items = [];
                tagData.forEach(g => g.subgroups.forEach(s => (s.tags || []).forEach(t => {
                    if (t.t.toLowerCase().includes(search) || t.d.includes(search)) items.push(t);
                })));
                items = items.slice(0, 100);
                if (this.groupIdx === _charGroupIdx && items.length < 20) {
                    _searchCharsFromDb(search).then(dbItems => {
                        const existing = new Set(items.map(i => i.t));
                        const extra = dbItems.filter(d => !existing.has(d.t));
                        if (extra.length > 0) {
                            this._renderItems([...items, ...extra.slice(0, 100 - items.length)]);
                        }
                    });
                }
            } else if (this.groupIdx === _artistGroupIdx || onArtistTab) {
                if (_artistGroupIdx < 0) {
                    this.gridEl.innerHTML = '<div style="padding:30px;color:var(--text-secondary);text-align:center;width:100%">画师数据加载中…</div>';
                    return;
                }
                const sub = tagData[_artistGroupIdx]?.subgroups[this.subIdx];
                if (!sub || !sub._artistSort) return;
                if (sub._artistSort === 'chains') {
                    this.gridEl.innerHTML = _buildSkeletonGrid(4);
                    ArtistChainManager.getAll().then(chains => {
                        this._renderArtistChains(chains.map(c => ArtistChainManager.toTagItem(c)));
                    });
                    return;
                }
                this.gridEl.innerHTML = _buildSkeletonGrid(6);
                const letter = sub._artistSort === 'name' ? _artistCurrentLetter : 'all';
                _fetchArtists(sub._artistSort, sub._artistOrder, _artistPage, letter).then(result => {
                    _artistTotalPages = result.pages || 1;
                    _artistHasMore = !!result.hasMore;
                    this._renderItems(result.tags);
                    this._renderPagination(result.total);
                });
                return;
            } else {
                const sub = tagData[this.groupIdx]?.subgroups[this.subIdx];
                if (sub && sub._seriesId && sub.tags.length === 0) {
                    this.gridEl.innerHTML = _buildSkeletonGrid(8);
                    _fetchSeriesChars(sub._seriesId).then(tags => {
                        sub.tags = tags;
                        this._renderCharPage(tags);
                    });
                    return;
                }
                items = sub?.tags || [];
                if (sub && sub._seriesId && items.length > CHARS_PER_PAGE) {
                    this._renderCharPage(items);
                    return;
                }
            }

            this._renderItems(items);
            this._updateMobileCharLayout();
        }

        _renderPagination(total) {
            this._removePagination();
            if (_artistTotalPages <= 1) return;
            const mobile = window.matchMedia('(max-width: 640px)').matches;
            const nav = document.createElement('div');
            nav.className = 'artist-pagination';
            const prevBtn = document.createElement('button');
            prevBtn.textContent = mobile ? '←' : '← 上一页';
            prevBtn.disabled = _artistPage <= 1;
            prevBtn.addEventListener('click', () => { _artistPage--; this.renderGrid(); });

            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = mobile
                ? `第 ${_artistPage}/${_artistTotalPages} 页 · ${total || '?'}`
                : `第 ${_artistPage} / ${_artistTotalPages} 页（共 ${total || '?'} 位画师）`;

            const nextBtn = document.createElement('button');
            nextBtn.textContent = mobile ? '→' : '下一页 →';
            nextBtn.disabled = _artistPage >= _artistTotalPages && !_artistHasMore;
            nextBtn.addEventListener('click', () => { _artistPage++; this.renderGrid(); });

            nav.append(prevBtn, info, nextBtn);

            if (!mobile) {
                const jumpWrap = document.createElement('span');
                jumpWrap.className = 'page-jump';
                const jumpInput = document.createElement('input');
                jumpInput.type = 'number';
                jumpInput.min = 1;
                jumpInput.max = _artistTotalPages;
                jumpInput.placeholder = '跳转';
                jumpInput.style.width = '50px';
                const jumpBtn = document.createElement('button');
                jumpBtn.textContent = 'Go';
                jumpBtn.addEventListener('click', () => {
                    const p = parseInt(jumpInput.value);
                    if (p >= 1 && p <= _artistTotalPages) { _artistPage = p; this.renderGrid(); }
                });
                jumpWrap.append(jumpInput, jumpBtn);
                nav.append(jumpWrap);
            }

            this.gridEl.parentElement.insertBefore(nav, this.gridEl.nextSibling);
        }

        _renderArtistChains(items) {
            this.gridEl.innerHTML = '';
            const toolbar = document.createElement('div');
            toolbar.className = 'artist-chain-toolbar';
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'artist-chain-add-btn';
            addBtn.textContent = '+ 新建画师串';
            addBtn.addEventListener('click', () => openArtistChainEditor(null, () => this.renderGrid()));
            toolbar.appendChild(addBtn);
            this.gridEl.appendChild(toolbar);

            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'artist-chain-empty';
                empty.textContent = '还没有自定义画师串，点击上方按钮创建并上传示例图';
                this.gridEl.appendChild(empty);
                this._updateMobileCharLayout();
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'artist-chain-grid';
            const taVal = this.textarea.value;
            const lazyImages = [];

            items.forEach(tag => {
                const div = document.createElement('div');
                const isSelected = _isArtistChainPromptInTextarea(taVal, tag.t);
                const hasThumb = !!tag.th;
                div.className = 'tag-item tag-char artist-chain-card' + (isSelected ? ' selected' : '');
                div.dataset.chainId = tag._chainId;

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'artist-chain-edit-btn';
                editBtn.title = '编辑';
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openArtistChainEditor(tag._chainId, () => this.renderGrid());
                });

                if (hasThumb) {
                    div.innerHTML = `<div class="thumb-skeleton"></div><img class="tag-thumb img-loading" data-src="${tag.th}" alt="${tag.d}"><span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t.split(',')[0]}</span>`;
                    lazyImages.push(div.querySelector('img.tag-thumb'));
                } else {
                    div.innerHTML = `<div class="artist-chain-no-thumb">🎨</div><span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t.split(',')[0]}</span>`;
                }
                div.appendChild(editBtn);

                div.addEventListener('click', (e) => {
                    if (e.target.closest('.artist-chain-edit-btn')) return;
                    if (hasThumb) {
                        showArtistChainPreview(tag, () => this.renderGrid());
                    } else {
                        this.toggleArtistChain(tag.t, tag.d);
                        this.renderGrid();
                    }
                });
                div.title = hasThumb ? '点击查看预览并填入' : '点击填入画师串 | ✎ 编辑';
                grid.appendChild(div);
            });

            this.gridEl.appendChild(grid);
            if (lazyImages.length) _observeLazyImages(lazyImages);
            this._updateMobileCharLayout();
        }

        toggleArtistChain(rawPrompt, chainName) {
            const formatted = formatArtistChainPrompt(rawPrompt);
            const formattedParts = formatted.split(',').map(s => s.trim()).filter(Boolean);
            let parts = this.textarea.value.split(',').map(s => s.trim()).filter(Boolean);
            const allPresent = formattedParts.length > 0 && formattedParts.every(fp => parts.some(p => {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                return (m ? m[1] : p) === fp;
            }));

            if (allPresent) {
                parts = parts.filter(p => {
                    const m = p.match(/^\((.+?):([\d.]+)\)$/);
                    const name = m ? m[1] : p;
                    return !formattedParts.includes(name);
                });
            } else {
                parts.push(...formattedParts);
                UsageTracker.record(rawPrompt, chainName || '', '', 'artist');
            }
            this.textarea.value = parts.join(', ');
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        _renderCharPage(allTags) {
            const total = allTags.length;
            const totalPages = Math.ceil(total / CHARS_PER_PAGE);
            if (_charPage > totalPages) _charPage = totalPages;
            if (_charPage < 1) _charPage = 1;
            const start = (_charPage - 1) * CHARS_PER_PAGE;
            const pageItems = allTags.slice(start, start + CHARS_PER_PAGE);
            this._renderItems(pageItems);
            if (totalPages > 1) this._renderCharPagination(total, totalPages);
        }

        _renderCharPagination(total, totalPages) {
            const nav = document.createElement('div');
            nav.className = 'artist-pagination';
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← 上一页';
            prevBtn.disabled = _charPage <= 1;
            prevBtn.addEventListener('click', () => { _charPage--; this.renderGrid(); });

            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = `第 ${_charPage} / ${totalPages} 页（共 ${total} 个角色）`;

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '下一页 →';
            nextBtn.disabled = _charPage >= totalPages;
            nextBtn.addEventListener('click', () => { _charPage++; this.renderGrid(); });

            const jumpWrap = document.createElement('span');
            jumpWrap.className = 'page-jump';
            const jumpInput = document.createElement('input');
            jumpInput.type = 'number';
            jumpInput.min = 1;
            jumpInput.max = totalPages;
            jumpInput.placeholder = '跳转';
            jumpInput.style.width = '50px';
            const jumpBtn = document.createElement('button');
            jumpBtn.textContent = 'Go';
            jumpBtn.addEventListener('click', () => {
                const p = parseInt(jumpInput.value);
                if (p >= 1 && p <= totalPages) { _charPage = p; this.renderGrid(); }
            });
            jumpWrap.append(jumpInput, jumpBtn);

            nav.append(prevBtn, info, nextBtn, jumpWrap);
            this.gridEl.parentElement.insertBefore(nav, this.gridEl.nextSibling);
        }

        _removePagination() {
            const existing = this.gridEl.parentElement?.querySelector('.artist-pagination');
            if (existing) existing.remove();
            const letterBar = this.gridEl.parentElement?.querySelector('.artist-letter-bar');
            if (letterBar && this.groupIdx !== _artistGroupIdx) letterBar.remove();
        }

        _showCategoryAutocomplete() {
            const query = this.searchEl.value.toLowerCase().trim();
            this._hideAutocomplete();
            if (!query) return;

            const results = [];
            tagData.forEach((group, gi) => {
                (group.subgroups || []).forEach((sub, si) => {
                    if (!sub || !sub.name) return;
                    if (sub.name.toLowerCase().includes(query)) {
                        results.push({ groupIdx: gi, subIdx: si, groupName: group.name, subName: sub.name, tagCount: sub.tags?.length || 0 });
                    }
                });
            });

            if (results.length === 0) return;

            const dropdown = document.createElement('div');
            dropdown.className = 'ac-dropdown';
            const rect = this.searchEl.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 2) + 'px';
            dropdown.style.left = rect.left + 'px';
            dropdown.style.width = Math.max(rect.width + 60, 280) + 'px';

            results.slice(0, 15).forEach(r => {
                const item = document.createElement('div');
                item.className = 'ac-item';
                const highlighted = r.subName.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
                item.innerHTML = `<span class="ac-group">${r.groupName}</span><span class="ac-name">${highlighted}</span><span class="ac-count">${r.tagCount > 0 ? r.tagCount + '个' : '...'}</span>`;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.groupIdx = r.groupIdx;
                    this.subIdx = r.subIdx;
                    _charPage = 1;
                    this.searchEl.value = '';
                    this._hideAutocomplete();
                    this.render();
                });
                dropdown.appendChild(item);
            });

            if (results.length > 15) {
                const more = document.createElement('div');
                more.className = 'ac-more';
                more.textContent = `还有 ${results.length - 15} 个结果...`;
                dropdown.appendChild(more);
            }

            document.body.appendChild(dropdown);
            this._acDropdown = dropdown;
        }

        _hideAutocomplete() {
            if (this._acDropdown) {
                this._acDropdown.remove();
                this._acDropdown = null;
            }
        }

        _renderGroupedFavItems(items) {
            this.gridEl.innerHTML = '';
            const groups = [
                { type: 'character', label: '👤 角色', items: [] },
                { type: 'artist', label: '🎨 画师', items: [] },
                { type: 'tag', label: '🏷️ 标签', items: [] },
            ];
            const typeMap = { character: 0, artist: 1, tag: 2 };
            items.forEach(it => groups[typeMap[it.type] ?? 2].items.push(it));
            const nonEmpty = groups.filter(g => g.items.length > 0);
            if (nonEmpty.length <= 1) { this._renderItems(items); return; }
            const allLazy = [];
            nonEmpty.forEach(group => {
                const section = document.createElement('div');
                section.className = 'fav-section';
                const header = document.createElement('div');
                header.className = 'fav-section-header';
                header.innerHTML = `<span class="fav-section-label">${group.label}</span><span class="fav-section-count">${group.items.length}</span>`;
                section.appendChild(header);
                const grid = document.createElement('div');
                grid.className = 'fav-section-grid';
                const lazy = this._renderItemsInto(grid, group.items, group.type === 'artist');
                allLazy.push(...lazy);
                section.appendChild(grid);
                this.gridEl.appendChild(section);
            });
            if (allLazy.length) _observeLazyImages(allLazy);
        }

        _renderItemsInto(container, items, forceArtist) {
            const selected = this.getSelectedTags();
            const showUsageBadge = this._virtualMode === 'recent' || this._virtualMode === 'frequent';
            const lazyImages = [];
            items.forEach(tag => {
                const div = document.createElement('div');
                const isSelected = selected.has(tag.t);
                const weight = this.getTagWeight(tag.t);
                const hasThumb = !!tag.th;
                const isFav = FavManager.has(tag.t);
                const useCount = tag._count || UsageTracker.getCount(tag.t);
                const isArtistItem = forceArtist || tag.type === 'artist';
                div.className = 'tag-item' + (isSelected ? ' selected' : '') + (hasThumb ? ' tag-char' : '') + (!hasThumb && isArtistItem ? ' tag-artist' : '');
                div.dataset.tag = tag.t;
                const favStar = `<span class="tag-fav-star ${isFav ? 'fav-active' : ''}" title="${isFav ? '取消收藏' : '收藏'}">★</span>`;
                const useBadge = showUsageBadge && useCount > 0 ? `<span class="tag-use-count" title="使用${useCount}次">${useCount}次</span>` : '';
                if (hasThumb) {
                    div.innerHTML = `<div class="thumb-skeleton"></div><img class="tag-thumb img-loading" data-src="${tag.th}" alt="${tag.d}">${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t.split(',')[0]}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                    lazyImages.push(div.querySelector('img.tag-thumb'));
                    div.addEventListener('click', (e) => {
                        if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                        e.stopPropagation();
                        if (isArtistItem) { showArtistPreview(tag); } else { showCharPreview(tag); }
                    });
                } else if (isArtistItem) {
                    const displayName = tag.t.replace(/_/g, ' ');
                    const desc = tag.d && !tag.d.match(/^\d+作品$/) ? tag.d : '';
                    div.innerHTML = `${favStar}<span class="tag-text">${displayName}</span>${desc ? `<span class="tag-desc">${desc}</span>` : ''}${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                } else {
                    div.innerHTML = `${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                }
                if (!hasThumb) {
                    div.addEventListener('click', (e) => {
                        if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                        if (e.shiftKey && isSelected) { this.adjustWeight(tag.t, 0.1); }
                        else if (e.ctrlKey && isSelected) { this.adjustWeight(tag.t, -0.1); }
                        else { this.toggleTag(tag.t, tag.d, tag.th); }
                        this.renderGrid();
                    });
                }
                div.title = hasThumb ? '点击查看详情 | 点⭐收藏' : '点击添加/移除 | 点⭐收藏 | Shift+点击加权重 | Ctrl+点击减权重';
                container.appendChild(div);
            });
            return lazyImages;
        }

        _renderItems(items) {
            this.gridEl.innerHTML = '';
            const frag = document.createDocumentFragment();
            const selected = this.getSelectedTags();
            const isArtistGroup = !this._virtualMode && tagData[this.groupIdx]?.name?.includes('画师');
            const showUsageBadge = this._virtualMode === 'recent' || this._virtualMode === 'frequent';
            const lazyImages = [];

            items.forEach(tag => {
                const div = document.createElement('div');
                const isSelected = selected.has(tag.t);
                const weight = this.getTagWeight(tag.t);
                const hasThumb = !!tag.th;
                const isFav = FavManager.has(tag.t);
                const useCount = tag._count || UsageTracker.getCount(tag.t);
                div.className = 'tag-item' + (isSelected ? ' selected' : '') + (hasThumb ? ' tag-char' : '') + (!hasThumb && isArtistGroup ? ' tag-artist' : '');
                div.dataset.tag = tag.t;

                const favStar = `<span class="tag-fav-star ${isFav ? 'fav-active' : ''}" title="${isFav ? '取消收藏' : '收藏'}">★</span>`;
                const useBadge = showUsageBadge && useCount > 0 ? `<span class="tag-use-count" title="使用${useCount}次">${useCount}次</span>` : '';

                if (hasThumb) {
                    div.innerHTML = `<div class="thumb-skeleton"></div><img class="tag-thumb img-loading" data-src="${tag.th}" alt="${tag.d}">${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t.split(',')[0]}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                    lazyImages.push(div.querySelector('img.tag-thumb'));
                    div.addEventListener('click', (e) => {
                        if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                        e.stopPropagation();
                        if (isArtistGroup || tag.type === 'artist') {
                            showArtistPreview(tag);
                        } else {
                            showCharPreview(tag);
                        }
                    });
                } else if (isArtistGroup) {
                    const displayName = tag.t.replace(/_/g, ' ');
                    const desc = tag.d && !tag.d.match(/^\d+作品$/) ? tag.d : '';
                    div.innerHTML = `${favStar}<span class="tag-text">${displayName}</span>${desc ? `<span class="tag-desc">${desc}</span>` : ''}${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                } else {
                    div.innerHTML = `${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                }
                if (!hasThumb) {
                div.addEventListener('click', (e) => {
                    if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                    if (e.shiftKey && isSelected) {
                        this.adjustWeight(tag.t, 0.1);
                    } else if (e.ctrlKey && isSelected) {
                        this.adjustWeight(tag.t, -0.1);
                    } else {
                        this.toggleTag(tag.t, tag.d, tag.th);
                    }
                    this.renderGrid();
                });
                }
                div.title = hasThumb
                    ? '点击查看详情 | 点⭐收藏'
                    : '点击添加/移除 | 点⭐收藏 | Shift+点击加权重 | Ctrl+点击减权重';
                frag.appendChild(div);
            });
            this.gridEl.appendChild(frag);
            if (lazyImages.length) _observeLazyImages(lazyImages);
            this._updateMobileCharLayout();
        }

        _renderGroupedFavItems(items, emptyMsg) {
            this.gridEl.innerHTML = '';
            const groups = { artist: [], character: [], tag: [] };
            const showUsageBadge = this._virtualMode === 'recent' || this._virtualMode === 'frequent';
            items.forEach(item => {
                const type = item.type || (item.th ? (item.img ? 'artist' : 'character') : 'tag');
                if (groups[type]) groups[type].push(item);
                else groups.tag.push(item);
            });
            const labels = { artist: '🎨 画师', character: '👤 角色', tag: '🏷️ 标签' };
            const order = ['artist', 'character', 'tag'];
            const selected = this.getSelectedTags();
            const hasAny = order.some(t => groups[t].length > 0);
            if (!hasAny) {
                this.gridEl.innerHTML = `<div style="padding:30px;color:var(--text-secondary);text-align:center;width:100%;font-size:0.85rem">${emptyMsg || '暂无内容'}</div>`;
                return;
            }
            const container = document.createElement('div');
            container.className = 'fav-columns';
            order.forEach(type => {
                const arr = groups[type];
                const col = document.createElement('div');
                col.className = 'fav-col fav-col-' + type;
                const header = document.createElement('div');
                header.className = 'fav-col-header';
                header.innerHTML = `<span>${labels[type]}</span><span class="fav-group-count">${arr.length}</span>`;
                col.appendChild(header);
                if (!arr.length) {
                    const empty = document.createElement('div');
                    empty.className = 'fav-col-empty';
                    empty.textContent = '暂无';
                    col.appendChild(empty);
                } else {
                    const grid = document.createElement('div');
                    grid.className = 'fav-col-grid fav-col-grid-' + type;
                    arr.forEach(tag => {
                        const div = document.createElement('div');
                        const isSelected = selected.has(tag.t);
                        const weight = this.getTagWeight(tag.t);
                        const hasThumb = !!tag.th;
                        const isFav = FavManager.has(tag.t);
                        const useCount = tag._count || UsageTracker.getCount(tag.t);
                        const isArtist = type === 'artist';
                        div.className = 'tag-item fav-mini' + (isSelected ? ' selected' : '') + (hasThumb ? ' tag-char' : '') + (!hasThumb && isArtist ? ' tag-artist' : '');
                        div.dataset.tag = tag.t;
                        const favStar = `<span class="tag-fav-star ${isFav ? 'fav-active' : ''}" title="${isFav ? '取消收藏' : '收藏'}">★</span>`;
                        const useBadge = showUsageBadge && useCount > 0 ? `<span class="tag-use-count" title="使用${useCount}次">${useCount}次</span>` : '';
                        if (hasThumb) {
                            div.innerHTML = `<img class="tag-thumb" src="${tag.th}" alt="${tag.d}" loading="lazy" onerror="this.style.display='none'">${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t.split(',')[0]}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                            div.addEventListener('click', (e) => {
                                if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                                e.stopPropagation();
                                if (isArtist) showArtistPreview(tag);
                                else showCharPreview(tag);
                            });
                        } else if (isArtist) {
                            const displayName = tag.t.replace(/_/g, ' ');
                            div.innerHTML = `${favStar}<span class="tag-text">${displayName}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                        } else {
                            div.innerHTML = `${favStar}<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t}</span>${useBadge}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                        }
                        if (!hasThumb) {
                            div.addEventListener('click', (e) => {
                                if (e.target.classList.contains('tag-fav-star')) { e.stopPropagation(); FavManager.toggle(tag); this.renderGrid(); return; }
                                if (e.shiftKey && isSelected) this.adjustWeight(tag.t, 0.1);
                                else if (e.ctrlKey && isSelected) this.adjustWeight(tag.t, -0.1);
                                else this.toggleTag(tag.t, tag.d, tag.th);
                                this.renderGrid();
                            });
                        }
                        div.title = hasThumb ? '点击查看详情' : '点击添加/移除';
                        grid.appendChild(div);
                    });
                    col.appendChild(grid);
                }
                container.appendChild(col);
            });
            this.gridEl.appendChild(container);
            this._updateMobileCharLayout();
        }

        getSelectedTags() {
            const parts = this.textarea.value.split(',').map(s => s.trim()).filter(Boolean);
            const set = new Set();
            parts.forEach(p => {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                const name = m ? m[1] : p;
                set.add(name);
                if (name.startsWith('@')) set.add(name.slice(1).replace(/ /g, '_'));
                if (!name.startsWith('@')) {
                    set.add(name.replace(/ /g, '_'));
                    set.add(name.replace(/_/g, ' '));
                }
            });
            return set;
        }

        getTagWeight(tagText) {
            const parts = this.textarea.value.split(',').map(s => s.trim());
            for (const p of parts) {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                if (m && m[1] === tagText) return parseFloat(m[2]);
                if (p === tagText) return 1.0;
            }
            return 1.0;
        }

        toggleTag(tagText, tagDesc, tagThumb, tagType) {
            const isArtist = !this._virtualMode && tagData[this.groupIdx]?.name?.includes('画师');
            let formatted = tagText;
            if (isAnimaMode()) {
                formatted = isArtist ? formatAnimaArtistTag(tagText) : formatAnimaTag(tagText);
            }
            const resolvedType = tagType || (isArtist ? 'artist' : (tagThumb ? 'character' : 'tag'));

            let parts = this.textarea.value.split(',').map(s => s.trim()).filter(Boolean);
            const idx = parts.findIndex(p => {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                const name = m ? m[1] : p;
                return name === tagText || name === formatted;
            });
            if (idx >= 0) {
                parts.splice(idx, 1);
            } else {
                parts.push(formatted);
                UsageTracker.record(tagText, tagDesc, tagThumb, resolvedType);
            }
            this.textarea.value = parts.join(', ');
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        adjustWeight(tagText, delta) {
            let parts = this.textarea.value.split(',').map(s => s.trim()).filter(Boolean);
            parts = parts.map(p => {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                const name = m ? m[1] : p;
                if (name !== tagText) return p;
                let w = m ? parseFloat(m[2]) : 1.0;
                w = Math.max(0.1, Math.min(2.0, +(w + delta).toFixed(1)));
                return w === 1.0 ? tagText : `(${tagText}:${w.toFixed(1)})`;
            });
            this.textarea.value = parts.join(', ');
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function loadImageWithFade(imgEl, url, fallbackUrl) {
        const primary = url || '';
        const fallback = fallbackUrl && fallbackUrl !== primary ? fallbackUrl : '';
        imgEl.style.opacity = '0.3';
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
        imgEl.onerror = () => {
            if (fallback && imgEl.dataset.fallbackTried !== '1') {
                imgEl.dataset.fallbackTried = '1';
                imgEl.src = fallback;
                return;
            }
            imgEl.style.opacity = '1';
        };
        delete imgEl.dataset.fallbackTried;
        imgEl.src = primary;
    }

    /** Animadex 列表 thumb → 全图 png；自托管封面（Pages assets）保持原 URL */
    function resolveCharPreviewUrl(thumbUrl) {
        const thumb = String(thumbUrl || '').trim();
        if (!thumb) return '';
        if (thumb.includes('blobs.animadex.net') && thumb.includes('/thumbs/')) {
            return thumb
                .replace(/%2F/gi, '_')
                .replace(/%3A/gi, '_')
                .replace(/%3F/gi, '_')
                .replace(/%22/gi, '_')
                .replace(/\.+(?=\.webp(?:\?|$))/i, '')
                .replace('/thumbs/', '/')
                .replace(/\.webp(\?|$)/i, '.png$1');
        }
        return thumb;
    }

    function showCharPreview(tag) {
        const imgUrl = resolveCharPreviewUrl(tag.th);
        if (!imgUrl && !tag.th) return;
        let overlay = document.getElementById('char-preview-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'char-preview-overlay';
            overlay.className = 'char-preview-overlay';
            overlay.innerHTML = `
                <div class="char-preview-card">
                    <img class="char-preview-img" alt="">
                    <div class="char-preview-info">
                        <div class="char-preview-name"></div>
                        <div class="char-preview-trigger"></div>
                        <div class="char-preview-tags"></div>
                        <div class="char-preview-lora"></div>
                        <div class="char-preview-actions">
                            <button class="char-preview-btn" data-action="trigger">填入触发词</button>
                            <button class="char-preview-btn" data-action="trigger-tags">触发词 + 特征标签</button>
                            <button class="char-preview-btn char-preview-btn-fav" data-action="fav">☆ 收藏</button>
                        </div>
                    </div>
                    <button class="char-preview-close">✕</button>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('char-preview-close')) {
                    overlay.classList.add('hidden');
                }
                if (e.target.dataset.action === 'fav') {
                    const storedTag = overlay._currentTag;
                    if (!storedTag) return;
                    FavManager.toggle(storedTag);
                    const btn = e.target;
                    const isFav = FavManager.has(storedTag.t);
                    btn.textContent = isFav ? '★ 已收藏' : '☆ 收藏';
                    btn.classList.toggle('char-preview-btn-fav-active', isFav);
                    return;
                }
                if (e.target.dataset.action) {
                    const storedTag = overlay._currentTag;
                    if (!storedTag) return;
                    const mode = e.target.dataset.action === 'trigger-tags' ? 'trigger-tags' : 'trigger';
                    UsageTracker.record(storedTag.t, storedTag.d, storedTag.th, 'character');
                    InsertedCharacters.add(storedTag, mode);
                    overlay.classList.add('hidden');
                }
            });
        }
        overlay._currentTag = tag;
        const previewImg = overlay.querySelector('.char-preview-img');
        previewImg.alt = tag.d;
        loadImageWithFade(previewImg, imgUrl || tag.th, tag.th);
        overlay.querySelector('.char-preview-name').textContent = tag.d;
        overlay.querySelector('.char-preview-trigger').innerHTML = `<span style="color:var(--text-secondary);font-size:0.7rem">触发词：</span>${tag.t}`;
        const tagsEl = overlay.querySelector('.char-preview-tags');
        if (tag.tags && tag.tags.length > 0) {
            tagsEl.innerHTML = tag.tags.map(t => `<span class="char-tag-pill">${t}</span>`).join('');
            tagsEl.classList.remove('hidden');
        } else {
            tagsEl.innerHTML = '';
            tagsEl.classList.add('hidden');
        }
        const loraEl = overlay.querySelector('.char-preview-lora');
        if (tag.lora) {
            loraEl.innerHTML = `<a href="${tag.lora}" target="_blank" rel="noopener">CivitAI LoRA 模型下载</a>`;
            loraEl.classList.remove('hidden');
        } else {
            loraEl.classList.add('hidden');
        }
        const favBtn = overlay.querySelector('[data-action="fav"]');
        if (favBtn) {
            const isFav = FavManager.has(tag.t);
            favBtn.textContent = isFav ? '★ 已收藏' : '☆ 收藏';
            favBtn.classList.toggle('char-preview-btn-fav-active', isFav);
        }
        overlay.classList.remove('hidden');
    }

    function showArtistPreview(tag) {
        const imgUrl = tag.img || (tag.th
            ? String(tag.th).replace(/%2F/gi, '_').replace(/%3A/gi, '_').replace(/%3F/gi, '_').replace(/%22/gi, '_').replace(/\.+(?=\.webp(?:\?|$))/i, '').replace('/thumbs/', '/').replace('.webp', '.png')
            : '');
        if (!imgUrl) return;
        let overlay = document.getElementById('artist-preview-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'artist-preview-overlay';
            overlay.className = 'char-preview-overlay';
            overlay.innerHTML = `
                <div class="char-preview-card">
                    <img class="char-preview-img" alt="">
                    <div class="char-preview-info">
                        <div class="char-preview-name"></div>
                        <div class="char-preview-trigger"></div>
                        <div class="char-preview-tags"></div>
                        <div class="char-preview-actions">
                            <button class="char-preview-btn" data-action="trigger">填入画师触发词</button>
                            <button class="char-preview-btn char-preview-btn-fav" data-action="fav">☆ 收藏</button>
                        </div>
                    </div>
                    <button class="char-preview-close">✕</button>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.classList.contains('char-preview-close')) {
                    overlay.classList.add('hidden');
                }
                if (e.target.dataset.action === 'fav') {
                    const storedTag = overlay._currentTag;
                    if (!storedTag) return;
                    const artTag = { ...storedTag, type: 'artist' };
                    if (storedTag.img) artTag.img = storedTag.img;
                    FavManager.toggle(artTag);
                    const isFav = FavManager.has(storedTag.t);
                    e.target.textContent = isFav ? '★ 已收藏' : '☆ 收藏';
                    e.target.classList.toggle('char-preview-btn-fav-active', isFav);
                    return;
                }
                if (e.target.dataset.action === 'trigger') {
                    const storedTag = overlay._currentTag;
                    if (!storedTag) return;
                    UsageTracker.record(storedTag.t, storedTag.d, storedTag.th, 'artist');
                    const formatted = isAnimaMode() ? formatAnimaArtistTag(storedTag.t) : storedTag.t;
                    const ta = dom.txtPositive;
                    const cur = ta.value.trim();
                    ta.value = cur ? cur + ', ' + formatted : formatted;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    overlay.classList.add('hidden');
                }
            });
        }
        overlay._currentTag = tag;
        const previewImg2 = overlay.querySelector('.char-preview-img');
        previewImg2.alt = tag.d;
        loadImageWithFade(previewImg2, imgUrl);
        overlay.querySelector('.char-preview-name').textContent = tag.d;
        overlay.querySelector('.char-preview-trigger').innerHTML = `<span style="color:var(--text-secondary);font-size:0.7rem">触发词：</span>${tag.t}`;
        const tagsEl = overlay.querySelector('.char-preview-tags');
        if (tag.count) {
            tagsEl.innerHTML = `<span class="char-tag-pill">Danbooru ${tag.count.toLocaleString()} 作品</span>`;
            tagsEl.classList.remove('hidden');
        } else {
            tagsEl.classList.add('hidden');
        }
        const favBtn = overlay.querySelector('[data-action="fav"]');
        if (favBtn) {
            const isFav = FavManager.has(tag.t);
            favBtn.textContent = isFav ? '★ 已收藏' : '☆ 收藏';
            favBtn.classList.toggle('char-preview-btn-fav-active', isFav);
        }
        overlay.classList.remove('hidden');
    }

    function showArtistChainPreview(tag, onUpdate) {
        const imgUrl = tag.img || tag.th || '';
        let overlay = document.getElementById('artist-chain-preview-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'artist-chain-preview-overlay';
            overlay.className = 'char-preview-overlay';
            overlay.innerHTML = `
                <div class="char-preview-card">
                    <img class="char-preview-img" alt="">
                    <div class="char-preview-info">
                        <div class="char-preview-name"></div>
                        <div class="char-preview-trigger"></div>
                        <div class="char-preview-tags"></div>
                        <div class="char-preview-actions">
                            <button class="char-preview-btn" data-action="trigger">填入画师串</button>
                            <button class="char-preview-btn" data-action="edit">编辑</button>
                            <button class="char-preview-btn char-preview-btn-danger" data-action="delete">删除</button>
                        </div>
                    </div>
                    <button class="char-preview-close">✕</button>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', async (e) => {
                if (e.target === overlay || e.target.classList.contains('char-preview-close')) {
                    overlay.classList.add('hidden');
                    return;
                }
                const storedTag = overlay._currentTag;
                if (!storedTag) return;
                if (e.target.dataset.action === 'trigger') {
                    UsageTracker.record(storedTag.t, storedTag.d, storedTag.th, 'artist');
                    const formatted = formatArtistChainPrompt(storedTag.t);
                    const ta = dom.txtPositive;
                    const cur = ta.value.trim();
                    ta.value = cur ? cur + ', ' + formatted : formatted;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    overlay.classList.add('hidden');
                    overlay._onUpdate?.();
                    return;
                }
                if (e.target.dataset.action === 'edit') {
                    overlay.classList.add('hidden');
                    openArtistChainEditor(storedTag._chainId, overlay._onUpdate);
                    return;
                }
                if (e.target.dataset.action === 'delete') {
                    if (!confirm(`确定删除画师串「${storedTag.d}」？`)) return;
                    await ArtistChainManager.remove(storedTag._chainId);
                    overlay.classList.add('hidden');
                    overlay._onUpdate?.();
                }
            });
        }
        overlay._currentTag = tag;
        overlay._onUpdate = onUpdate;
        const previewImg = overlay.querySelector('.char-preview-img');
        previewImg.alt = tag.d;
        if (imgUrl) {
            previewImg.classList.remove('hidden');
            loadImageWithFade(previewImg, imgUrl);
        } else {
            previewImg.classList.add('hidden');
            previewImg.removeAttribute('src');
        }
        overlay.querySelector('.char-preview-name').textContent = tag.d;
        overlay.querySelector('.char-preview-trigger').innerHTML =
            `<span style="color:var(--text-secondary);font-size:0.7rem">画师串：</span>${tag.t}`;
        const tagsEl = overlay.querySelector('.char-preview-tags');
        tagsEl.innerHTML = `<span class="char-tag-pill">自定义画师串</span>`;
        tagsEl.classList.remove('hidden');
        overlay.classList.remove('hidden');
    }

    function openArtistChainEditor(chainId, onSaved) {
        let modal = document.getElementById('artist-chain-editor-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'artist-chain-editor-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal artist-chain-editor">
                    <h3 class="artist-chain-editor-title">新建画师串</h3>
                    <label class="artist-chain-field">名称<input type="text" id="artist-chain-name" placeholder="例：厚涂双人组合"></label>
                    <label class="artist-chain-field">画师串（英文触发词，逗号分隔）<textarea id="artist-chain-prompt" rows="3" placeholder="artist:xxx, artist:yyy"></textarea></label>
                    <div class="artist-chain-upload">
                        <div class="artist-chain-preview-wrap">
                            <img id="artist-chain-preview-img" class="artist-chain-preview-img hidden" alt="">
                            <div id="artist-chain-preview-placeholder" class="artist-chain-preview-placeholder">示例图预览</div>
                        </div>
                        <div class="artist-chain-upload-actions">
                            <input type="file" id="artist-chain-file" accept="image/*" class="hidden">
                            <button type="button" class="btn-secondary" id="artist-chain-upload-btn">上传示例图</button>
                            <button type="button" class="btn-secondary hidden" id="artist-chain-clear-img">清除图片</button>
                        </div>
                    </div>
                    <div class="artist-chain-editor-actions">
                        <button type="button" class="btn-secondary" id="artist-chain-cancel">取消</button>
                        <button type="button" class="btn-primary" id="artist-chain-save">保存</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
            modal.querySelector('#artist-chain-cancel').addEventListener('click', () => modal.classList.add('hidden'));
            modal.querySelector('#artist-chain-upload-btn').addEventListener('click', () => {
                modal.querySelector('#artist-chain-file').click();
            });
            modal.querySelector('#artist-chain-file').addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    const dataUrl = await _compressChainImageFile(file);
                    modal._pendingImage = dataUrl;
                    modal._removeImage = false;
                    const img = modal.querySelector('#artist-chain-preview-img');
                    img.src = dataUrl;
                    img.classList.remove('hidden');
                    modal.querySelector('#artist-chain-preview-placeholder').classList.add('hidden');
                    modal.querySelector('#artist-chain-clear-img').classList.remove('hidden');
                } catch (err) {
                    alert('图片处理失败: ' + err.message);
                }
                e.target.value = '';
            });
            modal.querySelector('#artist-chain-clear-img').addEventListener('click', () => {
                modal._pendingImage = null;
                modal._removeImage = true;
                const img = modal.querySelector('#artist-chain-preview-img');
                img.classList.add('hidden');
                img.removeAttribute('src');
                modal.querySelector('#artist-chain-preview-placeholder').classList.remove('hidden');
                modal.querySelector('#artist-chain-clear-img').classList.add('hidden');
            });
            modal.querySelector('#artist-chain-save').addEventListener('click', async () => {
                const name = modal.querySelector('#artist-chain-name').value.trim();
                const prompt = modal.querySelector('#artist-chain-prompt').value.trim();
                if (!name) { alert('请填写名称'); return; }
                if (!prompt) { alert('请填写画师串内容'); return; }
                const saveBtn = modal.querySelector('#artist-chain-save');
                saveBtn.disabled = true;
                try {
                    if (modal._editId) {
                        await ArtistChainManager.update(modal._editId, {
                            name,
                            prompt,
                            imageData: modal._pendingImage,
                            removeImage: modal._removeImage,
                        });
                    } else {
                        await ArtistChainManager.add({
                            name,
                            prompt,
                            imageData: modal._pendingImage,
                        });
                    }
                    ArtistChainManager._chains = null;
                    modal.classList.add('hidden');
                    modal._onSaved?.();
                } catch (err) {
                    alert('保存失败: ' + err.message);
                } finally {
                    saveBtn.disabled = false;
                }
            });
        }

        modal._editId = chainId || null;
        modal._onSaved = onSaved;
        modal._pendingImage = null;
        modal._removeImage = false;
        modal.querySelector('.artist-chain-editor-title').textContent = chainId ? '编辑画师串' : '新建画师串';
        modal.querySelector('#artist-chain-name').value = '';
        modal.querySelector('#artist-chain-prompt').value = '';
        const img = modal.querySelector('#artist-chain-preview-img');
        img.classList.add('hidden');
        img.removeAttribute('src');
        modal.querySelector('#artist-chain-preview-placeholder').classList.remove('hidden');
        modal.querySelector('#artist-chain-clear-img').classList.add('hidden');

        if (chainId) {
            ArtistChainManager.getAll().then(chains => {
                const chain = chains.find(c => c.id === chainId);
                if (!chain) return;
                modal.querySelector('#artist-chain-name').value = chain.name;
                modal.querySelector('#artist-chain-prompt').value = chain.prompt;
                if (chain.th) {
                    img.src = chain.th;
                    img.classList.remove('hidden');
                    modal.querySelector('#artist-chain-preview-placeholder').classList.add('hidden');
                    modal.querySelector('#artist-chain-clear-img').classList.remove('hidden');
                }
            });
        }

        modal.classList.remove('hidden');
        modal.querySelector('#artist-chain-name').focus();
    }

    function setupTagPickers() {
        if (tagData.length === 0) return;
        posTagPicker = new TagPicker('pos', dom.txtPositive);
        negTagPicker = new TagPicker('neg', dom.txtNegative);

        // Collapse toggle for positive
        const posToggle = document.getElementById('pos-collapse-toggle');
        const posBody = document.getElementById('tag-picker-pos');
        posToggle.addEventListener('click', () => {
            const hidden = posBody.classList.toggle('hidden');
            posToggle.textContent = hidden ? '▶ 展开标签选择器' : '▼ 收起标签选择器';
            posToggle.classList.toggle('expanded', !hidden);
        });

        // Collapse toggle for negative
        const toggle = document.getElementById('neg-collapse-toggle');
        const body = document.getElementById('tag-picker-neg');
        toggle.addEventListener('click', () => {
            const hidden = body.classList.toggle('hidden');
            toggle.textContent = hidden ? '▶ 展开标签选择器' : '▼ 收起标签选择器';
            toggle.classList.toggle('expanded', !hidden);
        });

        // Clear buttons
        document.querySelectorAll('.btn-clear-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const textarea = document.getElementById(btn.dataset.target);
                if (!textarea) return;
                textarea.value = '';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                btn.textContent = '✓ 已清空';
                setTimeout(() => btn.textContent = '🗑️ 清空', 1500);
            });
        });

        // Copy buttons
        document.querySelectorAll('.btn-copy-prompt:not(.btn-clear-prompt)').forEach(btn => {
            if (!btn.dataset.target) return;
            btn.addEventListener('click', () => {
                const textarea = document.getElementById(btn.dataset.target);
                if (!textarea) return;
                navigator.clipboard.writeText(textarea.value).then(() => {
                    btn.textContent = '✓ 已复制';
                    setTimeout(() => btn.textContent = '📋 复制', 1500);
                });
            });
        });
    }

    // ==================== 深链跳转 ====================
    let _appliedDeepLinkKey = '';
    let _portalArtistSubIdx = 0;
    let _portalArtistPage = 1;
    let _portalArtistTotalPages = 1;

    function _isMobileAppLayout() {
        const nav = document.getElementById('mobile-nav');
        if (nav && getComputedStyle(nav).display !== 'none') return true;
        return window.matchMedia('(max-width: 640px)').matches;
    }

    function _parseDeepLinkParams() {
        const params = new URLSearchParams(location.search);
        const hashRaw = location.hash.replace(/^#/, '').trim();
        const hashParams = new URLSearchParams(hashRaw.includes('=') ? hashRaw : '');
        if (hashRaw === 'settings') hashParams.set('tab', 'settings');
        const get = (k) => params.get(k) || hashParams.get(k);
        return {
            tag: get('tag'),
            arch: get('arch'),
            mode: get('mode'),
            tab: get('tab'),
            action: get('action'),
            focus: get('focus'),
        };
    }

    function _makeDeepLinkIntentKey(dl) {
        return [dl.tag, dl.arch, dl.mode, dl.tab, dl.action, dl.focus].map(v => v || '').join('|');
    }

    function _hasDeepLinkIntent(dl) {
        return !!(dl.tag || dl.arch || dl.mode || dl.tab || dl.focus);
    }

    function _closePortalOverlays() {
        ['portal-char-overlay', 'portal-artist-overlay', 'portal-lora-overlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                el.setAttribute('aria-hidden', 'true');
            }
        });
        document.body.classList.remove('portal-overlay-open');
    }

    function _openPortalCharOverlay() {
        _closePortalOverlays();
        const overlay = document.getElementById('portal-char-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('portal-overlay-open');
        _seriesListState.page = 1;
        _seriesListState.filter = '';
        const search = document.getElementById('portal-char-search');
        if (search) search.value = '';
        renderMobileSeriesList('', { context: 'portal' });
    }

    function _renderPortalArtistPagination(total) {
        const nav = document.getElementById('portal-artist-pagination');
        if (!nav) return;
        nav.innerHTML = '';
        if (_portalArtistTotalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = '← 上一页';
        prevBtn.disabled = _portalArtistPage <= 1;
        prevBtn.addEventListener('click', () => {
            _portalArtistPage--;
            renderPortalArtistGrid();
        });

        const info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = `第 ${_portalArtistPage} / ${_portalArtistTotalPages} 页（共 ${total || '?'} 位画师）`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = '下一页 →';
        nextBtn.disabled = _portalArtistPage >= _portalArtistTotalPages && !_artistHasMore;
        nextBtn.addEventListener('click', () => {
            _portalArtistPage++;
            renderPortalArtistGrid();
        });

        nav.append(prevBtn, info, nextBtn);
    }

    function renderPortalArtistGrid() {
        const grid = document.getElementById('portal-artist-grid');
        if (!grid) return;
        if (_artistGroupIdx < 0) _injectArtistGroup();

        const mode = _ARTIST_SORT_MODES[_portalArtistSubIdx];
        if (!mode) return;

        document.querySelectorAll('#portal-artist-nav .portal-artist-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === _portalArtistSubIdx);
        });

        grid.innerHTML = '<div class="portal-artist-empty">加载中…</div>';

        if (mode.sort === 'chains') {
            ArtistChainManager.getAll().then(chains => {
                grid.innerHTML = '';
                if (!chains.length) {
                    grid.innerHTML = '<div class="portal-artist-empty">暂无自定义画师串<br><small>可在工具内「画师串」分类创建</small></div>';
                    _renderPortalArtistPagination(0);
                    return;
                }
                const items = chains.map(c => ArtistChainManager.toTagItem(c));
                const selected = posTagPicker ? posTagPicker.getSelectedTags() : new Set();
                const lazyImages = [];
                items.forEach(tag => {
                    const card = document.createElement('button');
                    card.type = 'button';
                    card.className = 'portal-artist-card' + (selected.has(tag.t) ? ' selected' : '');
                    if (tag.th) {
                        const img = document.createElement('img');
                        img.className = 'tag-thumb img-loading';
                        img.dataset.src = tag.th;
                        img.alt = tag.d;
                        card.appendChild(img);
                        lazyImages.push(img);
                    } else {
                        const ph = document.createElement('div');
                        ph.className = 'tag-thumb';
                        ph.textContent = '🎨';
                        ph.style.display = 'flex';
                        ph.style.alignItems = 'center';
                        ph.style.justifyContent = 'center';
                        card.appendChild(ph);
                    }
                    const desc = document.createElement('span');
                    desc.className = 'tag-desc';
                    desc.textContent = tag.d;
                    card.appendChild(desc);
                    card.addEventListener('click', () => {
                        if (posTagPicker) {
                            posTagPicker.toggleArtistChain(tag.t, tag.d);
                            renderPortalArtistGrid();
                        }
                    });
                    grid.appendChild(card);
                });
                if (lazyImages.length) _observeLazyImages(lazyImages);
                _renderPortalArtistPagination(items.length);
            });
            return;
        }

        const letter = mode.sort === 'name' ? _artistCurrentLetter : 'all';
        _fetchArtists(mode.sort, mode.order, _portalArtistPage, letter).then(result => {
            grid.innerHTML = '';
            _portalArtistTotalPages = result.pages || 1;
            _artistHasMore = !!result.hasMore;
            if (!result.tags?.length) {
                grid.innerHTML = '<div class="portal-artist-empty">暂无画师数据</div>';
                _renderPortalArtistPagination(0);
                return;
            }
            const selected = posTagPicker ? posTagPicker.getSelectedTags() : new Set();
            const lazyImages = [];
            result.tags.forEach(tag => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'portal-artist-card' + (selected.has(tag.t) ? ' selected' : '');
                if (tag.th) {
                    const img = document.createElement('img');
                    img.className = 'tag-thumb img-loading';
                    img.dataset.src = tag.th;
                    img.alt = tag.d;
                    card.appendChild(img);
                    lazyImages.push(img);
                } else {
                    const ph = document.createElement('div');
                    ph.className = 'tag-thumb';
                    ph.textContent = '🎨';
                    ph.style.display = 'flex';
                    ph.style.alignItems = 'center';
                    ph.style.justifyContent = 'center';
                    card.appendChild(ph);
                }
                const desc = document.createElement('span');
                desc.className = 'tag-desc';
                desc.textContent = tag.d || tag.t.split(',')[0];
                card.appendChild(desc);
                card.addEventListener('click', () => {
                    if (posTagPicker) {
                        posTagPicker.toggleTag(tag.t, tag.d, tag.th, 'artist');
                        renderPortalArtistGrid();
                    }
                });
                grid.appendChild(card);
            });
            if (lazyImages.length) _observeLazyImages(lazyImages);
            _renderPortalArtistPagination(result.total);
        });
    }

    function _openPortalArtistOverlay() {
        _closePortalOverlays();
        const overlay = document.getElementById('portal-artist-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('portal-overlay-open');
        _portalArtistSubIdx = 0;
        _portalArtistPage = 1;
        renderPortalArtistGrid();
    }

    function _applyModeDeepLink(mode) {
        if (!mode || !['nai', 'simple', 'workflow'].includes(mode)) return;
        const tab = document.querySelector(`.mode-tab[data-mode="${mode}"]`);
        if (tab) tab.click();
        else _profileApplyActiveMode(mode);
    }

    function _focusCharacterLibrary() {
        if (_isMobileAppLayout()) {
            switchMobileTab('characters');
            renderMobileSeriesList(document.getElementById('char-series-search')?.value || '');
            return;
        }
        _openPortalCharOverlay();
    }

    function _focusArtistLibrary() {
        if (_isMobileAppLayout()) {
            switchMobileTab('artists');
            return;
        }
        _openPortalArtistOverlay();
    }

    function _openSettingsFocus(focus) {
        _closePortalOverlays();
        if (!dom.btnSettings || !dom.modalSettings) return;
        dom.inpServer.value = getComfyUIAddress();
        if (dom.selProfile) dom.selProfile.value = ProfileManager.store.activeId;
        dom.modalSettings.classList.remove('hidden');
        if (focus === 'profile') {
            requestAnimationFrame(() => {
                document.getElementById('sel-profile')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }

    function setupPortalOverlays() {
        const closeChar = () => {
            _closePortalOverlays();
            history.replaceState(null, '', location.pathname);
        };
        document.getElementById('portal-char-close')?.addEventListener('click', closeChar);
        document.getElementById('portal-artist-close')?.addEventListener('click', closeChar);

        const portalCharSearch = document.getElementById('portal-char-search');
        if (portalCharSearch) {
            let debounce;
            portalCharSearch.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    _seriesListState.page = 1;
                    renderMobileSeriesList(portalCharSearch.value, { context: 'portal' });
                }, 200);
            });
        }

        document.querySelectorAll('#portal-artist-nav .portal-artist-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = parseInt(btn.dataset.artistMode, 10);
                if (Number.isNaN(mode)) return;
                _portalArtistSubIdx = mode;
                _portalArtistPage = 1;
                renderPortalArtistGrid();
            });
        });
    }

    function applyDeepLinks() {
        const dl = _parseDeepLinkParams();
        if (!_hasDeepLinkIntent(dl)) {
            _appliedDeepLinkKey = '';
            return;
        }

        const key = _makeDeepLinkIntentKey(dl);

        if (dl.tag && dom.txtPositive) {
            const cur = dom.txtPositive.value.trim();
            dom.txtPositive.value = cur ? `${cur}, ${dl.tag}` : dl.tag;
            dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (dl.arch && dom.selArch) {
            dom.selArch.value = dl.arch;
            dom.selArch.dispatchEvent(new Event('change'));
        }

        if (dl.mode) _applyModeDeepLink(dl.mode);

        if (dl.tab === 'characters') _focusCharacterLibrary();
        else if (dl.tab === 'artists') _focusArtistLibrary();
        else if (dl.tab === 'settings') _openSettingsFocus(dl.focus || 'profile');
        else _closePortalOverlays();

        if (dl.focus === 'profile' && dl.tab !== 'settings') _openSettingsFocus('profile');

        _appliedDeepLinkKey = key;
    }

    function scheduleDeepLinks() {
        try { applyDeepLinks(); } catch (e) { console.warn('[DeepLink]', e); }
        requestAnimationFrame(() => {
            try { applyDeepLinks(); } catch (e) { console.warn('[DeepLink]', e); }
        });
        setTimeout(() => { try { applyDeepLinks(); } catch (e) { /* ignore */ } }, 350);
        setTimeout(() => { try { applyDeepLinks(); } catch (e) { /* ignore */ } }, 1200);
    }

    window.addEventListener('hashchange', () => {
        _appliedDeepLinkKey = '';
        scheduleDeepLinks();
    });
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            _appliedDeepLinkKey = '';
            scheduleDeepLinks();
        }
    });

    function setupLoraLibrary() {
        if (!window.LoraLibraryUI) return;
        LoraLibraryUI.onUseLora = async (name, strength, triggers) => {
            await loadLoRAs();
            const resolved = resolveLoraNameForComfy(name);
            if (resolved !== name && normalizeLoraKey(resolved) === normalizeLoraKey(name)) {
                console.log('[LoRA] 路径已对齐 ComfyUI:', name, '→', resolved);
            }
            if (dom.chkLora && !dom.chkLora.checked) {
                dom.chkLora.checked = true;
                dom.chkLora.dispatchEvent(new Event('change'));
            }
            const words = triggers?.length ? triggers : _getLoraTriggerWords(resolved);
            addLoraRow(resolved, strength, words, true);
        };
        LoraLibraryUI.bind();
    }

    async function init() {
        console.log('[ComfyUI Web] v5.15');
        await loadTags();
        await ensureHistoryLoaded();
        renderHistory();
        setupTagPickers();
        setupPortalOverlays();
        setupLoraLibrary();
        setupMobileTagsMount();
        setupMobileArtistNav();
        setupMobileCharBrowser();
        renderMobileSeriesList('');

        scheduleDeepLinks();

        Promise.all([
            loadCheckpoints(),
            loadSamplers(),
            loadVAEs(),
            loadLoRAs(),
            loadControlNets(),
            loadIPAdapterModels(),
            loadAnimaModels(),
            _checkInpaintNodes(),
        ]).finally(async () => {
            loadInpaintSettings();
            updateInpaintEngineUI();
            updateArchAwarePanels();
            try {
                await ProfileManager.restoreActiveProfile();
            } catch (e) {
                console.warn('[Profile] restore failed:', e);
            }
            ensureAdetailerDefaultModel();
            scheduleDeepLinks();
        });
    }

    // ==================== 手机端角色全屏浏览 ====================
    const _charBrowserState = { seriesId: null, seriesName: '', page: 1, query: '', allTags: [] };
    const _seriesListState = { page: 1, filter: '' };
    const _SERIES_PAGE_SIZE = 120;
    const _SERIES_RECENT_MAX = 8;

    function _rememberRecentSeries(seriesId) {
        try {
            const key = 'comfyui_recent_series';
            let list = JSON.parse(localStorage.getItem(key) || '[]');
            list = list.filter(id => id !== seriesId);
            list.unshift(seriesId);
            if (list.length > _SERIES_RECENT_MAX) list.length = _SERIES_RECENT_MAX;
            localStorage.setItem(key, JSON.stringify(list));
        } catch { /* ignore */ }
    }

    function openCharBrowser(seriesId, seriesName) {
        if (!seriesId) return;
        _charBrowserState.seriesId = seriesId;
        _charBrowserState.seriesName = seriesName || seriesId;
        _charBrowserState.page = 1;
        _charBrowserState.query = '';
        _rememberRecentSeries(seriesId);

        const overlay = document.getElementById('char-browser-overlay');
        const title = document.getElementById('char-browser-title');
        const search = document.getElementById('char-browser-search');
        if (!overlay) return;

        if (title) title.textContent = _charBrowserState.seriesName;
        if (search) search.value = '';
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('char-browser-open');
        _renderCharBrowserGrid(true);
    }

    function closeCharBrowser() {
        const overlay = document.getElementById('char-browser-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('char-browser-open');
    }

    function _getCharBrowserPageItems() {
        const q = _charBrowserState.query.toLowerCase().trim();
        let items = _charBrowserState.allTags;
        if (q) {
            items = items.filter(t =>
                t.t.toLowerCase().includes(q) || (t.d || '').toLowerCase().includes(q)
            );
        }
        const totalPages = Math.max(1, Math.ceil(items.length / CHAR_BROWSER_PER_PAGE));
        if (_charBrowserState.page > totalPages) _charBrowserState.page = totalPages;
        if (_charBrowserState.page < 1) _charBrowserState.page = 1;
        const start = (_charBrowserState.page - 1) * CHAR_BROWSER_PER_PAGE;
        return { items: items.slice(start, start + CHAR_BROWSER_PER_PAGE), total: items.length, totalPages };
    }

    function _renderCharBrowserPagination(total, totalPages) {
        const nav = document.getElementById('char-browser-pagination');
        if (!nav) return;
        nav.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = '← 上一页';
        prevBtn.disabled = _charBrowserState.page <= 1;
        prevBtn.addEventListener('click', () => { _charBrowserState.page--; _renderCharBrowserGrid(false); });

        const info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = `第 ${_charBrowserState.page} / ${totalPages} 页（共 ${total} 个角色）`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = '下一页 →';
        nextBtn.disabled = _charBrowserState.page >= totalPages;
        nextBtn.addEventListener('click', () => { _charBrowserState.page++; _renderCharBrowserGrid(false); });

        nav.append(prevBtn, info, nextBtn);
    }

    function _createCharBrowserCard(tag, isSelected, isFav) {
        const div = document.createElement('div');
        div.className = 'char-browser-card' + (isSelected ? ' selected' : '');
        div.dataset.tag = tag.t;

        const thumb = document.createElement('div');
        thumb.className = 'char-browser-thumb';

        const skel = document.createElement('div');
        skel.className = 'thumb-skeleton';
        thumb.appendChild(skel);

        const img = document.createElement('img');
        img.className = 'char-browser-img img-loading';
        if (tag.th) img.dataset.src = String(tag.th).replace(/%2F/gi, '_').replace(/%3A/gi, '_').replace(/%3F/gi, '_').replace(/%22/gi, '_').replace(/\.+(?=\.webp(?:\?|$))/i, '');
        img.alt = tag.d || tag.t.split(',')[0];
        img.referrerPolicy = 'no-referrer';
        thumb.appendChild(img);

        const star = document.createElement('span');
        star.className = 'char-browser-fav' + (isFav ? ' fav-active' : '');
        star.title = '收藏';
        star.textContent = '★';
        thumb.appendChild(star);

        const info = document.createElement('div');
        info.className = 'char-browser-info';

        const desc = document.createElement('span');
        desc.className = 'char-browser-name';
        desc.textContent = tag.d || tag.t.split(',')[0];

        const text = document.createElement('span');
        text.className = 'char-browser-trigger';
        text.textContent = tag.t.split(',')[0];

        info.append(desc, text);
        div.append(thumb, info);
        return div;
    }

    async function _renderCharBrowserGrid(showLoading) {
        const grid = document.getElementById('char-browser-grid');
        if (!grid) return;
        if (showLoading) {
            grid.innerHTML = Array(6).fill('<div class="char-browser-card char-browser-skeleton"><div class="char-browser-thumb"></div><div class="char-browser-info"><span class="char-browser-name">&nbsp;</span><span class="char-browser-trigger">&nbsp;</span></div></div>').join('');
        }

        const tags = await _fetchSeriesChars(_charBrowserState.seriesId);
        _charBrowserState.allTags = tags;

        const { items, total, totalPages } = _getCharBrowserPageItems();
        grid.innerHTML = '';
        if (!items.length) {
            grid.innerHTML = '<div class="char-browser-empty">暂无匹配角色</div>';
            _renderCharBrowserPagination(0, 1);
            return;
        }

        const selected = posTagPicker ? posTagPicker.getSelectedTags() : new Set();
        const lazyImages = [];
        items.forEach(tag => {
            const isSelected = selected.has(tag.t);
            const isFav = FavManager.has(tag.t);
            const div = _createCharBrowserCard(tag, isSelected, isFav);
            const img = div.querySelector('img.char-browser-img');
            if (img) lazyImages.push(img);
            div.addEventListener('click', (e) => {
                if (e.target.classList.contains('char-browser-fav')) {
                    e.stopPropagation();
                    FavManager.toggle(tag);
                    _renderCharBrowserGrid(false);
                    return;
                }
                showCharPreview(tag);
            });
            grid.appendChild(div);
        });
        if (lazyImages.length) _observeCharBrowserImages(lazyImages);
        _renderCharBrowserPagination(total, totalPages);
    }

    let _seriesCoverObserver = null;
    function _observeSeriesCoverImages(imgList) {
        if (!imgList.length) return;
        if (!_seriesCoverObserver) {
            _seriesCoverObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (!src) return;
                    _seriesCoverObserver.unobserve(img);
                    img.onload = () => {
                        img.classList.remove('img-loading');
                        img.classList.add('img-loaded');
                        img.parentElement?.querySelector('.char-series-cover-skel')?.classList.add('hide');
                    };
                    img.onerror = () => {
                        img.style.display = 'none';
                        const fb = img.parentElement?.querySelector('.char-series-cover-fallback');
                        if (fb) fb.style.display = 'flex';
                        img.parentElement?.querySelector('.char-series-cover-skel')?.classList.add('hide');
                    };
                    img.src = src;
                });
            }, { root: null, rootMargin: '200px' });
        }
        imgList.forEach(img => { if (img) _seriesCoverObserver.observe(img); });
    }

    function _renderSeriesPagination(total, totalPages, paginationId, rerender) {
        const nav = document.getElementById(paginationId || 'char-series-pagination');
        if (!nav) return;
        nav.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.textContent = '← 上一页';
        prevBtn.disabled = _seriesListState.page <= 1;
        prevBtn.addEventListener('click', () => {
            _seriesListState.page--;
            rerender();
        });

        const info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = `第 ${_seriesListState.page} / ${totalPages} 页（共 ${total} 个作品）`;

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.textContent = '下一页 →';
        nextBtn.disabled = _seriesListState.page >= totalPages;
        nextBtn.addEventListener('click', () => {
            _seriesListState.page++;
            rerender();
        });

        nav.append(prevBtn, info, nextBtn);
    }

    function _createSeriesCard(series) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'char-series-card';
        const count = series._seriesCount || 0;
        const countText = count > 0 ? `${count} 角色` : '';
        const cover = series._coverUrl || '';

        const coverEl = document.createElement('div');
        coverEl.className = 'char-series-cover';
        coverEl.innerHTML = '<div class="char-series-cover-skel"></div>';
        if (cover) {
            const img = document.createElement('img');
            img.className = 'char-series-cover-img img-loading';
            img.dataset.src = cover;
            img.alt = series.name;
            coverEl.appendChild(img);
        } else {
            const fb = document.createElement('div');
            fb.className = 'char-series-cover-fallback';
            fb.style.display = 'flex';
            fb.textContent = '📁';
            coverEl.appendChild(fb);
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'char-series-name';
        nameEl.textContent = series.name;

        const countEl = document.createElement('span');
        countEl.className = 'char-series-count';
        countEl.textContent = countText;

        btn.append(coverEl, nameEl, countEl);
        btn.addEventListener('click', () => openCharBrowser(series._seriesId, series.name));
        return btn;
    }

    function _appendSeriesGrid(container, seriesList, lazyImages) {
        const grid = document.createElement('div');
        grid.className = 'char-series-grid';
        seriesList.forEach(s => {
            const card = _createSeriesCard(s);
            const img = card.querySelector('img.char-series-cover-img');
            if (img) lazyImages.push(img);
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }

    function renderMobileSeriesList(filter, options = {}) {
        const isPortal = options.context === 'portal';
        const scrollId = options.scrollId || (isPortal ? 'portal-char-scroll' : 'char-series-scroll');
        const paginationId = options.paginationId || (isPortal ? 'portal-char-pagination' : 'char-series-pagination');
        const scroll = document.getElementById(scrollId);
        if (!scroll) return;

        const rerender = () => renderMobileSeriesList(_seriesListState.filter, { ...options, keepPage: true });

        if (_charGroupIdx < 0) {
            _charGroupIdx = tagData.findIndex(g => g.name === '人物');
        }

        const q = (filter ?? _seriesListState.filter ?? '').toLowerCase().trim();
        if (!options.keepPage && q !== _seriesListState.filter) {
            _seriesListState.page = 1;
        }
        _seriesListState.filter = q;

        let subs = (_charGroupIdx >= 0 ? tagData[_charGroupIdx]?.subgroups : []) || [];
        subs = subs.filter(s => s && s._seriesId);

        if (!subs.length) {
            scroll.innerHTML = '<div class="char-browser-empty">正在加载作品列表…<br><small>共 800+ 个作品，请稍候</small></div>';
            _renderSeriesPagination(0, 1, paginationId, rerender);
            _loadSeriesFromApi().then(ok => {
                if (ok) renderMobileSeriesList(q, options);
                else scroll.innerHTML = '<div class="char-browser-empty">作品列表加载失败<br><small>请检查网络后刷新页面</small></div>';
            });
            return;
        }

        if (!subs.every(s => s._coverUrl !== undefined)) {
            scroll.innerHTML = '<div class="char-browser-empty">正在加载作品封面…</div>';
            _renderSeriesPagination(0, 1, paginationId, rerender);
            _loadSeriesFromApi().then(ok => {
                if (ok) renderMobileSeriesList(q, options);
            });
            return;
        }

        let list = subs.slice();
        if (q) list = list.filter(s => s.name.toLowerCase().includes(q));
        // 展示序：角色数降序（与历史「按作品角色数量」一致；API 仅返回名称序以秒开）
        list.sort((a, b) => {
            const ca = Number(a._seriesCount) || _resolveSeriesCharCount(a._seriesId) || 0;
            const cb = Number(b._seriesCount) || _resolveSeriesCharCount(b._seriesId) || 0;
            if (cb !== ca) return cb - ca;
            return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
        });

        const totalPages = Math.max(1, Math.ceil(list.length / _SERIES_PAGE_SIZE));
        if (_seriesListState.page > totalPages) _seriesListState.page = totalPages;
        if (_seriesListState.page < 1) _seriesListState.page = 1;
        const pageStart = (_seriesListState.page - 1) * _SERIES_PAGE_SIZE;
        const pageList = list.slice(pageStart, pageStart + _SERIES_PAGE_SIZE);

        scroll.innerHTML = '';
        const lazyImages = [];

        if (!isPortal && !q && _seriesListState.page === 1) {
            let recentIds = [];
            try { recentIds = JSON.parse(localStorage.getItem('comfyui_recent_series') || '[]'); } catch { /* ignore */ }
            recentIds = recentIds.slice(0, _SERIES_RECENT_MAX);
            if (recentIds.length) {
                const recentLabel = document.createElement('div');
                recentLabel.className = 'char-series-section-label';
                recentLabel.textContent = '最近浏览';
                scroll.appendChild(recentLabel);
                const recentList = [];
                recentIds.forEach(id => {
                    const s = subs.find(x => x._seriesId === id);
                    if (s) recentList.push(s);
                });
                if (recentList.length) {
                    const recentWrap = document.createElement('div');
                    recentWrap.className = 'char-series-recent-scroll';
                    const recentGrid = document.createElement('div');
                    recentGrid.className = 'char-series-grid char-series-grid-recent';
                    recentList.forEach(s => {
                        const card = _createSeriesCard(s);
                        const img = card.querySelector('img.char-series-cover-img');
                        if (img) lazyImages.push(img);
                        recentGrid.appendChild(card);
                    });
                    recentWrap.appendChild(recentGrid);
                    scroll.appendChild(recentWrap);
                }
            }
        }

        const allLabel = document.createElement('div');
        allLabel.className = 'char-series-section-label';
        allLabel.textContent = q
            ? `搜索结果（${list.length}）`
            : `全部作品（${list.length}）· 第 ${_seriesListState.page}/${totalPages} 页`;
        scroll.appendChild(allLabel);

        if (!pageList.length) {
            const empty = document.createElement('div');
            empty.className = 'char-browser-empty';
            empty.textContent = '未找到匹配作品';
            scroll.appendChild(empty);
            _renderSeriesPagination(list.length, totalPages, paginationId, rerender);
            if (lazyImages.length) _observeSeriesCoverImages(lazyImages);
            return;
        }

        _appendSeriesGrid(scroll, pageList, lazyImages);
        if (lazyImages.length) _observeSeriesCoverImages(lazyImages);
        _renderSeriesPagination(list.length, totalPages, paginationId, rerender);

        if (options.keepPage) scroll.scrollTop = 0;
    }

    function setupMobileCharBrowser() {
        document.getElementById('char-browser-back')?.addEventListener('click', closeCharBrowser);
        document.getElementById('char-browser-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'char-browser-overlay') closeCharBrowser();
        });

        const search = document.getElementById('char-browser-search');
        if (search) {
            let debounce;
            search.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    _charBrowserState.query = search.value;
                    _charBrowserState.page = 1;
                    _renderCharBrowserGrid(false);
                }, 250);
            });
        }

        const seriesSearch = document.getElementById('char-series-search');
        if (seriesSearch) {
            let debounce;
            seriesSearch.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => renderMobileSeriesList(seriesSearch.value, { keepPage: false }), 200);
            });
        }
    }

    function setupMobileTagsMount() {
        document.getElementById('tag-picker-neg')?.closest('.tag-picker-collapse')?.classList.add('mobile-tags-hidden');

        document.querySelectorAll('.mobile-tags-switch-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pane = btn.dataset.tagsPane;
                document.querySelectorAll('.mobile-tags-switch-btn').forEach(b => {
                    b.classList.toggle('active', b === btn);
                });
                const posCollapse = document.getElementById('tag-picker-pos')?.closest('.tag-picker-collapse');
                const negCollapse = document.getElementById('tag-picker-neg')?.closest('.tag-picker-collapse');
                posCollapse?.classList.toggle('mobile-tags-hidden', pane !== 'pos');
                negCollapse?.classList.toggle('mobile-tags-hidden', pane !== 'neg');
                document.getElementById('tag-picker-pos')?.classList.remove('hidden');
                document.getElementById('tag-picker-neg')?.classList.remove('hidden');
                if (pane === 'pos') posTagPicker?.render();
                if (pane === 'neg') negTagPicker?.render();
            });
        });
    }

    function syncMobileArtistNav(subIdx) {
        document.querySelectorAll('#mobile-artist-nav .mobile-artist-nav-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === subIdx);
        });
    }

    function setupMobileArtistNav() {
        const nav = document.getElementById('mobile-artist-nav');
        if (!nav) return;
        nav.querySelectorAll('.mobile-artist-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = parseInt(btn.dataset.artistMode, 10);
                if (!posTagPicker || _artistGroupIdx < 0 || Number.isNaN(mode)) return;
                _prepareArtistTab(posTagPicker, mode);
                syncMobileArtistNav(mode);
                posTagPicker.render();
            });
        });
    }

    function switchMobileTab(tab, options = {}) {
        const nav = document.getElementById('mobile-nav');
        const main = document.querySelector('.main');
        if (!nav || !main) return;

        const tabs = ['create', 'characters', 'tags', 'artists', 'settings', 'history'];
        main.classList.remove(...tabs.map(t => 'mobile-tab-' + t));
        main.classList.add('mobile-tab-' + tab);
        nav.querySelectorAll('.mobile-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mobileTab === tab);
        });

        document.body.classList.toggle('mobile-artist-nav-visible', tab === 'artists');

        const fab = document.getElementById('btn-generate-fab');
        if (fab) fab.classList.toggle('hidden', tab !== 'create');

        if (tab === 'characters') renderMobileSeriesList(document.getElementById('char-series-search')?.value || '');
        if (tab === 'tags') {
            const focus = options.tagsFocus || 'pos';
            document.querySelectorAll('.mobile-tags-switch-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.tagsPane === focus);
            });
            const posCollapse = document.getElementById('tag-picker-pos')?.closest('.tag-picker-collapse');
            const negCollapse = document.getElementById('tag-picker-neg')?.closest('.tag-picker-collapse');
            posCollapse?.classList.toggle('mobile-tags-hidden', focus !== 'pos');
            negCollapse?.classList.toggle('mobile-tags-hidden', focus !== 'neg');
            document.getElementById('tag-picker-pos')?.classList.remove('hidden');
            document.getElementById('tag-picker-neg')?.classList.remove('hidden');
            posTagPicker?._ensureValidGroupForMobile();
            negTagPicker?._ensureValidGroupForMobile();
            if (focus === 'pos') posTagPicker?.render();
            if (focus === 'neg') negTagPicker?.render();
        }
        if (tab === 'artists') {
            const posCollapse = document.getElementById('tag-picker-pos')?.closest('.tag-picker-collapse');
            const negCollapse = document.getElementById('tag-picker-neg')?.closest('.tag-picker-collapse');
            posCollapse?.classList.remove('mobile-tags-hidden');
            negCollapse?.classList.add('mobile-tags-hidden');
            document.getElementById('tag-picker-pos')?.classList.remove('hidden');
            if (posTagPicker) {
                _prepareArtistTab(posTagPicker, 0);
            }
            syncMobileArtistNav(0);
            posTagPicker?.render();
        }
        if (tab !== 'tags' && tab !== 'artists') {
            posTagPicker?.render();
            negTagPicker?.render();
        }
        MobilePromptTagSheet.close();
    }

    const MobilePromptTagSheet = {
        sheet: null,
        editor: null,
        idx: -1,
        _inited: false,

        isMobile() {
            const nav = document.getElementById('mobile-nav');
            if (nav && getComputedStyle(nav).display !== 'none') return true;
            return window.matchMedia('(max-width: 640px)').matches;
        },

        init() {
            if (this._inited) return;
            this.sheet = document.getElementById('prompt-tag-mobile-sheet');
            if (!this.sheet) return;
            this._inited = true;

            document.getElementById('prompt-tag-sheet-close')?.addEventListener('click', () => this.close());
            document.getElementById('prompt-tag-sheet-w-up')?.addEventListener('click', () => this.changeWeight(0.1));
            document.getElementById('prompt-tag-sheet-w-down')?.addEventListener('click', () => this.changeWeight(-0.1));
            document.getElementById('prompt-tag-sheet-move-left')?.addEventListener('click', () => this.moveTag(-1));
            document.getElementById('prompt-tag-sheet-move-right')?.addEventListener('click', () => this.moveTag(1));
            document.getElementById('prompt-tag-sheet-copy')?.addEventListener('click', () => this.copyTag());
            document.getElementById('prompt-tag-sheet-delete')?.addEventListener('click', () => this.deleteTag());

            const slider = document.getElementById('prompt-tag-sheet-weight-range');
            slider?.addEventListener('input', () => {
                if (!this.editor || this.idx < 0) return;
                const tag = this.editor.tags[this.idx];
                if (!tag) return;
                tag.weight = Math.max(0.1, Math.round(parseFloat(slider.value) * 10) / 10);
                this.editor.syncToTextarea();
                this.editor.render();
                this.updateUI();
            });
        },

        scrollActiveIntoView() {
            if (!this.editor || this.idx < 0) return;
            requestAnimationFrame(() => {
                const el = this.editor.container.querySelector(`.prompt-tag[data-idx="${this.idx}"]`);
                el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },

        open(editor, idx) {
            this.init();
            if (!this.sheet) return;
            this.editor = editor;
            this.idx = idx;
            document.body.classList.add('prompt-tag-sheet-open');
            this.sheet.classList.remove('hidden');
            this.sheet.setAttribute('aria-hidden', 'false');
            editor.render();
            this.updateUI();
            this.scrollActiveIntoView();
        },

        close() {
            if (!this.sheet) return;
            const hadOpen = this.idx >= 0;
            this.idx = -1;
            this.editor = null;
            document.body.classList.remove('prompt-tag-sheet-open');
            this.sheet.classList.add('hidden');
            this.sheet.setAttribute('aria-hidden', 'true');
            if (hadOpen) {
                [dom.txtPositive, dom.txtNegative].forEach(ta => ta?._tagEditor?.render());
            }
        },

        updateUI() {
            const tag = this.editor?.tags[this.idx];
            if (!tag) return;
            const title = document.getElementById('prompt-tag-sheet-title');
            const weightVal = document.getElementById('prompt-tag-sheet-weight-val');
            const slider = document.getElementById('prompt-tag-sheet-weight-range');
            const zh = TagTranslator.getSync(tag.name);
            if (title) {
                title.textContent = TagTranslator.showChinese && zh
                    ? `${tag.name} · ${zh}`
                    : tag.name;
            }
            if (weightVal) weightVal.textContent = tag.weight.toFixed(1);
            if (slider) slider.value = String(tag.weight);
        },

        changeWeight(delta) {
            if (!this.editor || this.idx < 0) return;
            this.editor.changeWeight(this.idx, delta);
            this.updateUI();
            this.scrollActiveIntoView();
        },

        moveTag(delta) {
            if (!this.editor || this.idx < 0) return;
            const oldIdx = this.idx;
            const newIdx = oldIdx + delta;
            if (newIdx < 0 || newIdx >= this.editor.tags.length) return;
            this.idx = newIdx;
            this.editor.moveTag(oldIdx, delta);
            this.updateUI();
            this.scrollActiveIntoView();
        },

        copyTag() {
            if (!this.editor || this.idx < 0) return;
            const tag = this.editor.tags[this.idx];
            if (!tag) return;
            const text = tag.weight !== 1.0
                ? `(${tag.name}:${tag.weight.toFixed(1)})`
                : tag.name;
            navigator.clipboard.writeText(text);
        },

        deleteTag() {
            if (!this.editor || this.idx < 0) return;
            const removedIdx = this.idx;
            this.editor.tags.splice(removedIdx, 1);
            if (this.editor.tags.length === 0) {
                this.editor.syncToTextarea();
                this.editor.render();
                this.close();
                return;
            }
            this.idx = Math.min(removedIdx, this.editor.tags.length - 1);
            this.editor.syncToTextarea();
            this.editor.render();
            this.updateUI();
            this.scrollActiveIntoView();
        },

        syncAfterRender(editor) {
            if (this.editor !== editor || this.idx < 0) return;
            if (this.idx >= editor.tags.length) {
                this.close();
                return;
            }
            this.updateUI();
            this.scrollActiveIntoView();
        }
    };

    function setupGenerateFab() {
        const fab = document.getElementById('btn-generate-fab');
        if (!fab) return;

        const STORAGE_KEY = 'comfyui_fab_pos_v1';
        let fabDragMoved = false;
        let fabDragging = false;
        let startX = 0;
        let startY = 0;
        let origLeft = 0;
        let origTop = 0;

        function isMobileFab() {
            return window.matchMedia('(max-width: 640px)').matches;
        }

        function applySavedFabPos() {
            if (!isMobileFab()) return;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const pos = JSON.parse(raw);
                if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                    fab.classList.add('is-custom-pos');
                    fab.style.left = `${pos.x}px`;
                    fab.style.top = `${pos.y}px`;
                    fab.style.right = 'auto';
                    fab.style.bottom = 'auto';
                }
            } catch (_) { /* ignore */ }
        }

        applySavedFabPos();

        fab.addEventListener('pointerdown', (e) => {
            if (!isMobileFab() || e.button !== 0) return;
            fabDragMoved = false;
            fabDragging = true;
            fab.classList.add('is-dragging');
            fab.setPointerCapture(e.pointerId);
            const rect = fab.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            origLeft = rect.left;
            origTop = rect.top;
            fab.classList.add('is-custom-pos');
            fab.style.right = 'auto';
            fab.style.bottom = 'auto';
            fab.style.left = `${origLeft}px`;
            fab.style.top = `${origTop}px`;
        });

        fab.addEventListener('pointermove', (e) => {
            if (!fabDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) + Math.abs(dy) > 5) fabDragMoved = true;
            const w = fab.offsetWidth;
            const h = fab.offsetHeight;
            let nx = origLeft + dx;
            let ny = origTop + dy;
            nx = Math.max(8, Math.min(window.innerWidth - w - 8, nx));
            ny = Math.max(8, Math.min(window.innerHeight - h - 8, ny));
            fab.style.left = `${nx}px`;
            fab.style.top = `${ny}px`;
        });

        function endFabDrag(e) {
            if (!fabDragging) return;
            fabDragging = false;
            fab.classList.remove('is-dragging');
            try { fab.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            if (fabDragMoved) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    x: parseInt(fab.style.left, 10),
                    y: parseInt(fab.style.top, 10)
                }));
            }
        }

        fab.addEventListener('pointerup', endFabDrag);
        fab.addEventListener('pointercancel', endFabDrag);

        fab.addEventListener('click', (e) => {
            if (fabDragMoved) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
            const modeNai = document.querySelector('.mode-tab[data-mode="nai"]')?.classList.contains('active');
            if (modeNai) {
                document.getElementById('btn-nai-generate')?.click();
            } else {
                document.getElementById('btn-generate')?.click();
            }
        });
    }

    // ==================== 手机端导航 & 结果区 ====================
    function updateMobileResultUI(hasResult) {
        const btn = document.getElementById('btn-result-expand');
        const wrapper = document.getElementById('result-wrapper');
        if (!btn || !wrapper) return;
        if (!window.matchMedia('(max-width: 640px)').matches) {
            btn.classList.add('hidden');
            wrapper.classList.remove('expanded');
            return;
        }
        if (hasResult) {
            btn.classList.remove('hidden');
            wrapper.classList.add('expanded');
            btn.textContent = '收起结果 ▲';
            btn.setAttribute('aria-expanded', 'true');
        } else {
            btn.classList.add('hidden');
            wrapper.classList.remove('expanded');
            btn.textContent = '展开结果 ▼';
            btn.setAttribute('aria-expanded', 'false');
        }
    }

    function setupMobileResultExpand() {
        const btn = document.getElementById('btn-result-expand');
        const wrapper = document.getElementById('result-wrapper');
        if (!btn || !wrapper) return;

        btn.addEventListener('click', () => {
            const expanded = wrapper.classList.toggle('expanded');
            btn.textContent = expanded ? '收起结果 ▲' : '展开结果 ▼';
            btn.setAttribute('aria-expanded', String(expanded));
        });
    }

    function setupMobileNav() {
        const nav = document.getElementById('mobile-nav');
        if (!nav) return;

        nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => switchMobileTab(btn.dataset.mobileTab));
        });

        document.querySelectorAll('.mobile-shortcut-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.mobileTab;
                const tagsFocus = btn.dataset.tagsFocus || 'pos';
                switchMobileTab(tab, { tagsFocus });
            });
        });
    }

    // ==================== 折叠组 ====================
    function setupPanelGroups() {
        document.querySelectorAll('.panel-group-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('open');
            });
        });
    }

    // ==================== 面板宽度拖拽 ====================
    function setupSidebarResize() {
        const resizer = document.getElementById('sidebar-resizer');
        const sidebar = document.querySelector('.sidebar');
        if (!resizer || !sidebar) return;

        let startX, startW;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startW = sidebar.getBoundingClientRect().width;
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = (ev) => {
                const w = Math.max(240, Math.min(600, startW + (ev.clientX - startX)));
                sidebar.style.width = w + 'px';
            };
            const onUp = () => {
                resizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // ==================== 历史面板：折叠 + 可拖拽宽度 ====================
    function setupHistoryPanel() {
        const panel = dom.historyPanel;
        const resizer = dom.historyResizer;
        const toggleBtn = dom.btnHistoryToggle;
        if (!panel || !resizer || !toggleBtn) return;

        // 移动端布局已做了独立的“历史Tab”处理，这里不强行接管折叠/拖拽。
        if (window.matchMedia('(max-width: 1000px)').matches) return;

        const LS_COLLAPSED = 'comfyui_web_history_collapsed';
        const LS_WIDTH = 'comfyui_web_history_width';

        const savedW = parseInt(localStorage.getItem(LS_WIDTH) || '0', 10);
        const collapsed = localStorage.getItem(LS_COLLAPSED) === '1';

        if (panel && !Number.isNaN(savedW) && savedW > 0 && !collapsed) {
            panel.style.width = `${savedW}px`;
        }

        function applyCollapsed(nextCollapsed) {
            panel.classList.toggle('collapsed', nextCollapsed);
            toggleBtn.textContent = nextCollapsed ? '▶' : '◀';
            resizer.style.display = nextCollapsed ? 'none' : '';
            localStorage.setItem(LS_COLLAPSED, nextCollapsed ? '1' : '0');
        }

        applyCollapsed(collapsed);

        toggleBtn.addEventListener('click', () => {
            const next = !panel.classList.contains('collapsed');
            // 展开时恢复宽度（如果之前有保存）
            if (!next) {
                const w = parseInt(localStorage.getItem(LS_WIDTH) || '0', 10);
                if (w > 0) panel.style.width = `${w}px`;
            }
            applyCollapsed(next);
        });

        let startX = 0;
        let startW = 0;
        resizer.addEventListener('mousedown', (e) => {
            if (panel.classList.contains('collapsed')) return;
            e.preventDefault();

            startX = e.clientX;
            startW = panel.getBoundingClientRect().width;
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = (ev) => {
                // 拖拽方向：向右拖拽应增大宽度（避免与拖拽手势相反）
                const w = Math.max(140, Math.min(420, startW - (ev.clientX - startX)));
                panel.style.width = `${w}px`;
            };

            const onUp = () => {
                resizer.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                const w = Math.round(panel.getBoundingClientRect().width);
                if (w > 0) localStorage.setItem(LS_WIDTH, String(w));
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // ==================== 自定义工作流模式 ====================
    const WF_STORAGE_KEY = 'comfyui_web_workflows';
    let currentWorkflowData = null;
    let objectInfoCache = null;

    function setupWorkflowMode() {
        const tabs = document.querySelectorAll('.mode-tab');
        const modeSimple = document.getElementById('mode-simple');
        const modeWorkflow = document.getElementById('mode-workflow');
        const modeNai = document.getElementById('mode-nai');
        const btnGenerate = document.getElementById('btn-generate');
        const btnNaiGenerate = document.getElementById('btn-nai-generate');
        const btnDzmm = document.getElementById('btn-dzmm');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.dataset.mode;
                modeSimple.classList.toggle('hidden', mode !== 'simple');
                modeWorkflow.classList.toggle('hidden', mode !== 'workflow');
                if (modeNai) modeNai.classList.toggle('hidden', mode !== 'nai');
                if (btnGenerate) btnGenerate.classList.toggle('hidden', mode === 'nai');
                if (btnNaiGenerate) btnNaiGenerate.classList.toggle('hidden', mode !== 'nai');
                if (btnDzmm) btnDzmm.classList.toggle('hidden', mode === 'nai');
            });
        });

        document.getElementById('btn-wf-import').addEventListener('click', () => {
            document.getElementById('inp-wf-file').click();
        });

        document.getElementById('inp-wf-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const name = file.name.replace(/\.json$/i, '');
                importWorkflow(ev.target.result, name);
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        document.getElementById('btn-wf-paste').addEventListener('click', () => {
            document.getElementById('modal-wf-paste').classList.remove('hidden');
            document.getElementById('txt-wf-paste').value = '';
            document.getElementById('inp-wf-name').value = '';
        });

        document.getElementById('btn-wf-paste-ok').addEventListener('click', () => {
            const json = document.getElementById('txt-wf-paste').value.trim();
            const name = document.getElementById('inp-wf-name').value.trim() || '未命名工作流';
            if (!json) return alert('请粘贴工作流 JSON');
            importWorkflow(json, name);
            document.getElementById('modal-wf-paste').classList.add('hidden');
        });

        document.getElementById('btn-wf-paste-cancel').addEventListener('click', () => {
            document.getElementById('modal-wf-paste').classList.add('hidden');
        });

        document.getElementById('sel-workflow').addEventListener('change', (e) => {
            const name = e.target.value;
            if (!name) {
                currentWorkflowData = null;
                renderWorkflowParams(null);
                return;
            }
            const workflows = loadWorkflows();
            const wf = workflows[name];
            if (wf) {
                currentWorkflowData = wf;
                renderWorkflowParams(wf);
            }
        });

        document.getElementById('btn-wf-delete').addEventListener('click', () => {
            const sel = document.getElementById('sel-workflow');
            const name = sel.value;
            if (!name) return;
            if (!confirm(`确定删除工作流「${name}」？`)) return;
            const workflows = loadWorkflows();
            delete workflows[name];
            saveWorkflows(workflows);
            refreshWorkflowList();
            currentWorkflowData = null;
            renderWorkflowParams(null);
        });

        refreshWorkflowList();
    }

    function loadWorkflows() {
        try {
            return JSON.parse(localStorage.getItem(WF_STORAGE_KEY) || '{}');
        } catch { return {}; }
    }

    function saveWorkflows(data) {
        localStorage.setItem(WF_STORAGE_KEY, JSON.stringify(data));
    }

    function refreshWorkflowList() {
        const sel = document.getElementById('sel-workflow');
        const workflows = loadWorkflows();
        sel.innerHTML = '<option value="">-- 选择已保存的工作流 --</option>';
        Object.keys(workflows).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
    }

    function importWorkflow(jsonStr, name) {
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e) {
            alert('JSON 解析失败: ' + e.message);
            return;
        }

        // Detect format: API format has { "id": { class_type, inputs } }
        // UI format has { nodes: [...], links: [...] } or { workflow: { nodes, links }, prompt: {...} }
        let apiFormat;
        if (data.prompt && typeof data.prompt === 'object' && !Array.isArray(data.prompt)) {
            apiFormat = data.prompt;
        } else if (data.nodes && Array.isArray(data.nodes)) {
            apiFormat = convertUIToAPI(data);
        } else if (data.last_node_id || data.last_link_id) {
            apiFormat = convertUIToAPI(data);
        } else {
            // Assume it's already API format
            const firstVal = Object.values(data)[0];
            if (firstVal && firstVal.class_type) {
                apiFormat = data;
            } else {
                alert('无法识别的工作流格式');
                return;
            }
        }

        const workflows = loadWorkflows();
        workflows[name] = apiFormat;
        saveWorkflows(workflows);
        refreshWorkflowList();

        document.getElementById('sel-workflow').value = name;
        currentWorkflowData = apiFormat;
        renderWorkflowParams(apiFormat);
    }

    function convertUIToAPI(uiData) {
        const nodes = uiData.nodes || [];
        const links = uiData.links || [];
        const linkMap = {};
        links.forEach(link => {
            const [linkId, srcNode, srcSlot] = link;
            linkMap[linkId] = [String(srcNode), srcSlot];
        });

        const api = {};
        nodes.forEach(node => {
            if (!node.type || node.type === 'Reroute') return;
            const entry = { class_type: node.type, inputs: {} };

            if (node.widgets_values && node.inputs) {
                let widgetIdx = 0;
                const inputNames = (node.inputs || []).map(i => i.name);
                // This is a simplified conversion - may not work for all nodes
                if (node.widgets_values) {
                    // We'll store widget values as-is for now
                    // Full conversion would require object_info
                }
            }

            // Map linked inputs
            if (node.inputs) {
                node.inputs.forEach(input => {
                    if (input.link != null && linkMap[input.link]) {
                        entry.inputs[input.name] = linkMap[input.link];
                    }
                });
            }

            // Widget values - try to map using properties or title
            if (node.widgets_values && Array.isArray(node.widgets_values)) {
                entry._widget_values = node.widgets_values;
            }

            api[String(node.id)] = entry;
        });

        return api;
    }

    async function fetchObjectInfo() {
        if (objectInfoCache) return objectInfoCache;
        try {
            objectInfoCache = await apiGet('/object_info');
            return objectInfoCache;
        } catch (e) {
            console.warn('无法获取 object_info:', e);
            return null;
        }
    }

    // Node classification for smart grouping
    const PROMPT_NODES = ['CLIPTextEncode', 'CLIPTextEncodeSDXL', 'ShowText', 'StringFunction',
        'WeiLinPromptUI', 'WeiLinPromptUIWithoutLora', 'PromptSelector'];
    const SAMPLER_NODES = ['KSampler', 'KSamplerAdvanced', 'SamplerCustom', 'SamplerCustomAdvanced',
        'KSampler (Efficient)', 'KSamplerSelect'];
    const LOADER_NODES = ['CheckpointLoaderSimple', 'UNETLoader', 'CLIPLoader', 'VAELoader',
        'LoraLoader', 'LoraLoaderModelOnly', 'Lora Loader (LoraManager)'];
    const SIZE_NODES = ['EmptyLatentImage', 'EmptySD3LatentImage', 'ResolutionMasterSimplify'];
    const IMAGE_INPUT_NODES = ['LoadImage', 'LoadImageMask'];

    const HIDDEN_FIELDS = new Set([
        '__lm_autocomplete_meta_text', '打开提示词编辑器',
        'orinalMessage', 'random_template', '_meta',
        'loras', 'toggle_trigger_words', 'allow_strength_adjustment',
        'text', 'trigger_words'
    ]);

    const WEILIN_REDUNDANT_FIELDS = new Set([
        'positive', 'negative', 'selected_prompts', 'selected_loras'
    ]);

    const SPECIAL_WIDGET_NODES = new Set([
        'Lora Loader (LoraManager)', 'TriggerWord Toggle (LoraManager)',
        'PromptSelector'
    ]);

    function classifyNode(classType) {
        if (PROMPT_NODES.includes(classType)) return 'prompt';
        if (SAMPLER_NODES.includes(classType)) return 'sampler';
        if (LOADER_NODES.includes(classType)) return 'loader';
        if (SIZE_NODES.includes(classType)) return 'size';
        if (IMAGE_INPUT_NODES.includes(classType)) return 'image';
        return 'other';
    }

    function tryParseWeiLinTokens(val) {
        if (typeof val !== 'string' || val.length < 10) return null;
        const trimmed = val.trim();
        if (!trimmed.startsWith('[{') || !trimmed.endsWith('}]')) return null;
        try {
            const arr = JSON.parse(trimmed);
            if (!Array.isArray(arr) || arr.length === 0) return null;
            if (arr[0].text !== undefined && arr[0].id !== undefined) return arr;
            return null;
        } catch { return null; }
    }

    function weiLinTokensToText(tokens) {
        return tokens
            .filter(t => !t.isPunctuation && !t.isHidden)
            .map(t => t.text)
            .join(', ');
    }

    function textToWeiLinTokens(text, originalTokens) {
        const newTexts = text.split(',').map(s => s.trim()).filter(Boolean);
        const result = [];
        const reusable = originalTokens ? [...originalTokens.filter(t => !t.isPunctuation)] : [];
        newTexts.forEach((txt, i) => {
            if (i < reusable.length) {
                result.push({ ...reusable[i], text: txt, translate: txt });
            } else {
                result.push({
                    id: `token_${i + 1}_${Date.now()}`,
                    text: txt, translate: txt,
                    isPunctuation: false, isEditing: false,
                    isHidden: false, color: 'rgba(255, 123, 2, .4)',
                    isLoraTag: false
                });
            }
        });
        return result;
    }

    function isEditableValue(val, key) {
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) return false;
        if (typeof val === 'object') return false;
        if (HIDDEN_FIELDS.has(key)) return false;
        if (typeof val === 'string' && val === '' && key !== 'text' && key !== 'positive' && key !== 'negative') {
            return false;
        }
        if (typeof val === 'string' && tryParseWeiLinTokens(val)) return true;
        if (typeof val === 'string' && val.length > 500) {
            const trimmed = val.trim();
            if ((trimmed.startsWith('[{') || trimmed.startsWith('{"')) && (trimmed.endsWith('}]') || trimmed.endsWith('}'))) {
                return false;
            }
        }
        return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
    }

    let wfPromptMap = { positiveNodeId: null, negativeNodeId: null };

    function findPromptNodeIds(workflow) {
        const result = { positiveNodeId: null, negativeNodeId: null };
        for (const [nodeId, node] of Object.entries(workflow)) {
            if (!SAMPLER_NODES.includes(node.class_type)) continue;
            const posRef = node.inputs.positive;
            const negRef = node.inputs.negative;
            if (Array.isArray(posRef)) result.positiveNodeId = tracePromptSource(workflow, posRef[0]);
            if (Array.isArray(negRef)) result.negativeNodeId = tracePromptSource(workflow, negRef[0]);
            break;
        }
        return result;
    }

    function tracePromptSource(workflow, nodeId, depth) {
        if ((depth || 0) > 10) return nodeId;
        const node = workflow[nodeId];
        if (!node) return nodeId;
        if (PROMPT_NODES.includes(node.class_type)) return nodeId;
        if (node.class_type === 'CLIPTextEncode') return nodeId;
        for (const val of Object.values(node.inputs || {})) {
            if (Array.isArray(val) && workflow[val[0]]) {
                const found = tracePromptSource(workflow, val[0], (depth || 0) + 1);
                if (found && PROMPT_NODES.includes(workflow[found]?.class_type)) return found;
            }
        }
        return nodeId;
    }

    function extractNodePromptText(node) {
        if (!node) return '';
        const inputs = node.inputs || {};
        for (const [key, val] of Object.entries(inputs)) {
            if (key === 'temp_str') {
                const tokens = tryParseWeiLinTokens(val);
                if (tokens) return weiLinTokensToText(tokens);
            }
        }
        if (inputs.positive && typeof inputs.positive === 'string') return inputs.positive;
        if (inputs.text && typeof inputs.text === 'string') return inputs.text;
        return '';
    }

    function setupPromptBinding(workflow) {
        if (!workflow) return;
        if (!wfPromptMap.positiveNodeId && !wfPromptMap.negativeNodeId) {
            wfPromptMap = findPromptNodeIds(workflow);
        }

        if (wfPromptMap.positiveNodeId) {
            const posText = extractNodePromptText(workflow[wfPromptMap.positiveNodeId]);
            if (posText) dom.txtPositive.value = posText;
        }
        if (wfPromptMap.negativeNodeId) {
            const negText = extractNodePromptText(workflow[wfPromptMap.negativeNodeId]);
            if (negText) dom.txtNegative.value = negText;
        }

        const container = document.getElementById('wf-params');
        if (!container) return;
        container.querySelectorAll('.wf-prompt-bind').forEach(el => {
            const nodeId = el.dataset.node;
            const isPositive = nodeId === wfPromptMap.positiveNodeId;
            const mainTa = isPositive ? dom.txtPositive : dom.txtNegative;
            let syncing = false;
            mainTa.addEventListener('input', () => {
                if (syncing) return;
                syncing = true;
                el.value = mainTa.value;
                syncing = false;
            });
            el.addEventListener('input', () => {
                if (syncing) return;
                syncing = true;
                mainTa.value = el.value;
                syncing = false;
            });
        });
    }

    async function renderWorkflowParams(workflow) {
        const container = document.getElementById('wf-params');
        const infoEl = document.getElementById('wf-info');

        if (!workflow) {
            container.innerHTML = '<div class="wf-placeholder">导入或选择一个工作流以开始</div>';
            infoEl.classList.add('hidden');
            return;
        }

        const nodeCount = Object.keys(workflow).length;
        document.getElementById('wf-node-count').textContent = `${nodeCount} 个节点`;
        infoEl.classList.remove('hidden');

        const objInfo = await fetchObjectInfo();

        wfPromptMap = findPromptNodeIds(workflow);

        const groups = { prompt: [], sampler: [], loader: [], size: [], image: [], other: [] };
        const specialNodes = [];
        for (const [nodeId, node] of Object.entries(workflow)) {
            if (!node.class_type) continue;

            if (SPECIAL_WIDGET_NODES.has(node.class_type)) {
                specialNodes.push({ nodeId, node });
                continue;
            }

            const category = classifyNode(node.class_type);
            const inputs = node.inputs || {};
            const hasWeiLinTokens = Object.values(inputs).some(v => tryParseWeiLinTokens(v));
            const editableParams = [];
            for (const [key, val] of Object.entries(inputs)) {
                if (hasWeiLinTokens && WEILIN_REDUNDANT_FIELDS.has(key)) continue;
                if (isEditableValue(val, key)) {
                    editableParams.push({ key, value: val, nodeId });
                }
            }
            if (editableParams.length > 0) {
                groups[category].push({ nodeId, classType: node.class_type, params: editableParams });
            }
        }

        let html = '';

        if (groups.prompt.length > 0) {
            const posNodes = [];
            const negNodes = [];
            const otherPromptNodes = [];
            groups.prompt.forEach(nodeInfo => {
                if (nodeInfo.nodeId === wfPromptMap.positiveNodeId) posNodes.push(nodeInfo);
                else if (nodeInfo.nodeId === wfPromptMap.negativeNodeId) negNodes.push(nodeInfo);
                else otherPromptNodes.push(nodeInfo);
            });
            const sortedPrompt = [...posNodes, ...negNodes, ...otherPromptNodes];
            html += buildGroup('📝 提示词', sortedPrompt, objInfo, true);
        }

        if (groups.sampler.length > 0) {
            html += buildGroup('🎛️ 采样参数', groups.sampler, objInfo, true);
        }

        if (groups.size.length > 0) {
            html += buildGroup('📐 图片尺寸', groups.size, objInfo, true);
        }

        // Special nodes: PromptSelector, LoRA Manager, TriggerWord Toggle
        for (const { nodeId, node } of specialNodes) {
            if (node.class_type === 'PromptSelector') {
                const title = node._meta?.title || '固定提示词';
                const sp = node.inputs?.selected_prompts;
                if (typeof sp === 'string') {
                    html += `<div class="wf-group open">
                        <div class="wf-group-header"><span>📌 ${escapeHtml(title)}</span><span class="wf-group-toggle">▶</span></div>
                        <div class="wf-group-body">
                            <div class="wf-field">
                                <label>已选提示词</label>
                                <textarea data-node="${nodeId}" data-key="selected_prompts" class="wf-input" rows="2">${escapeHtml(sp)}</textarea>
                            </div>
                        </div>
                    </div>`;
                }
            } else if (node.class_type === 'Lora Loader (LoraManager)') {
                const widget = buildLoraManagerWidget(nodeId, node);
                if (widget) {
                    html += `<div class="wf-group open">
                        <div class="wf-group-header"><span>🎨 LoRA 管理</span><span class="wf-group-toggle">▶</span></div>
                        <div class="wf-group-body">${widget}</div>
                    </div>`;
                }
            } else if (node.class_type === 'TriggerWord Toggle (LoraManager)') {
                const widget = buildTriggerWordWidget(nodeId, node);
                if (widget) {
                    html += `<div class="wf-group open">
                        <div class="wf-group-header"><span>🏷️ 触发词</span><span class="wf-group-toggle">▶</span></div>
                        <div class="wf-group-body">${widget}</div>
                    </div>`;
                }
            }
        }

        if (groups.loader.length > 0) {
            html += buildGroup('📦 模型加载', groups.loader, objInfo, false);
        }

        if (groups.image.length > 0) {
            html += buildGroup('🖼️ 图片输入', groups.image, objInfo, true);
        }

        if (groups.other.length > 0) {
            groups.other.forEach(nodeInfo => {
                const displayName = getNodeDisplayName(nodeInfo.classType, objInfo);
                html += buildGroup(`📦 ${displayName}`, [nodeInfo], objInfo, false);
            });
        }

        if (!html) {
            html = '<div class="wf-placeholder">此工作流没有可编辑的参数（所有值都是节点连接）</div>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.wf-group-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('open');
            });
        });

        setupPromptBinding(workflow);

        container.querySelectorAll('.tw-tag').forEach(tag => {
            tag.addEventListener('click', () => tag.classList.toggle('active'));
        });
    }

    function getNodeDisplayName(classType, objInfo) {
        if (objInfo && objInfo[classType] && objInfo[classType].display_name) {
            return objInfo[classType].display_name;
        }
        return classType;
    }

    function buildLoraManagerWidget(nodeId, node) {
        const loras = node.inputs?.loras?.__value__;
        if (!loras || !Array.isArray(loras)) return '';
        let html = '<div class="wf-lora-list">';
        loras.forEach((lora, i) => {
            const name = lora.name.split('/').pop();
            html += `<div class="lora-manager-item" data-node="${nodeId}" data-lora-idx="${i}">
                <label class="lora-active-label">
                    <input type="checkbox" class="lora-active-chk" ${lora.active ? 'checked' : ''}>
                    <span class="lora-name" title="${lora.name}">${name}</span>
                </label>
                <input type="number" class="lora-strength-inp" value="${lora.strength}" min="0" max="2" step="0.05" title="强度">
            </div>`;
        });
        html += '</div>';
        return html;
    }

    function buildTriggerWordWidget(nodeId, node) {
        const tw = node.inputs?.toggle_trigger_words?.__value__;
        if (!tw || !Array.isArray(tw)) return '';
        let html = '<div class="wf-trigger-words">';
        tw.forEach((word, i) => {
            html += `<span class="tw-tag ${word.active ? 'active' : ''}" data-node="${nodeId}" data-tw-idx="${i}" title="点击切换">${word.text}</span>`;
        });
        html += '</div>';
        return html;
    }

    function buildGroup(title, nodes, objInfo, defaultOpen) {
        let fieldsHtml = '';
        const warnings = [];

        nodes.forEach(nodeInfo => {
            const nodeObjInfo = objInfo ? objInfo[nodeInfo.classType] : null;
            if (!nodeObjInfo && objInfo) {
                warnings.push(nodeInfo.classType);
            }

            nodeInfo.params.forEach(param => {
                fieldsHtml += buildField(param, nodeInfo, nodeObjInfo);
            });
        });

        let warningHtml = '';
        if (warnings.length > 0) {
            warningHtml = `<div class="wf-warning">⚠️ 节点未安装: ${warnings.join(', ')}（参数类型为推测值）</div>`;
        }

        return `<div class="wf-group ${defaultOpen ? 'open' : ''}">
            <div class="wf-group-header">
                <span>${title}</span>
                <span class="wf-group-toggle">▶</span>
            </div>
            <div class="wf-group-body">
                ${warningHtml}
                ${fieldsHtml}
            </div>
        </div>`;
    }

    function buildField(param, nodeInfo, nodeObjInfo) {
        const { key, value, nodeId } = param;
        const dataAttr = `data-node="${nodeId}" data-key="${key}"`;
        let inputHtml = '';
        let label = key;

        // WeiLin token array → editable prompt textarea
        const tokens = typeof value === 'string' ? tryParseWeiLinTokens(value) : null;
        if (tokens) {
            const readable = weiLinTokensToText(tokens);
            const isPos = nodeId === wfPromptMap.positiveNodeId;
            const isNeg = nodeId === wfPromptMap.negativeNodeId;
            const direction = isPos ? '正向' : isNeg ? '反向' : '';
            label = direction ? `${direction}提示词 (WeiLin)` : (key === 'temp_str' ? '提示词 (WeiLin)' : key);
            inputHtml = `<textarea ${dataAttr} data-weilin="1" class="wf-input wf-prompt-bind" rows="3"
                placeholder="逗号分隔提示词，如: 1girl, smile, outdoors">${escapeHtml(readable)}</textarea>`;
            if (label) return `<div class="wf-field"><label>${label}</label>${inputHtml}</div>`;
            return `<div class="wf-field">${inputHtml}</div>`;
        }

        let typeInfo = null;
        if (nodeObjInfo) {
            const req = nodeObjInfo.input?.required?.[key];
            const opt = nodeObjInfo.input?.optional?.[key];
            typeInfo = req || opt;
        }

        if (typeInfo) {
            if (Array.isArray(typeInfo[0]) && !Array.isArray(typeInfo[0][0])) {
                const options = typeInfo[0].map(v =>
                    `<option value="${v}" ${v === value ? 'selected' : ''}>${v}</option>`
                ).join('');
                inputHtml = `<select ${dataAttr} class="wf-input">${options}</select>`;
            } else if (typeInfo[0] === 'INT') {
                const meta = typeInfo[1] || {};
                inputHtml = `<input type="number" ${dataAttr} class="wf-input" value="${value}" 
                    ${meta.min != null ? `min="${meta.min}"` : ''} 
                    ${meta.max != null ? `max="${meta.max}"` : ''} 
                    step="1">`;
            } else if (typeInfo[0] === 'FLOAT') {
                const meta = typeInfo[1] || {};
                inputHtml = `<input type="number" ${dataAttr} class="wf-input" value="${value}" 
                    ${meta.min != null ? `min="${meta.min}"` : ''} 
                    ${meta.max != null ? `max="${meta.max}"` : ''} 
                    step="${meta.step || 0.01}">`;
            } else if (typeInfo[0] === 'STRING') {
                const meta = typeInfo[1] || {};
                const isPromptField = key === 'text' || key === 'positive' || key === 'negative';
                const promptBindClass = isPromptField && PROMPT_NODES.includes(nodeInfo.classType) ? ' wf-prompt-bind' : '';
                if (meta.multiline || isPromptField) {
                    inputHtml = `<textarea ${dataAttr} class="wf-input${promptBindClass}" rows="3">${escapeHtml(String(value))}</textarea>`;
                } else {
                    inputHtml = `<input type="text" ${dataAttr} class="wf-input" value="${escapeAttr(String(value))}">`;
                }
            } else if (typeInfo[0] === 'BOOLEAN') {
                inputHtml = `<label style="display:flex;align-items:center;gap:6px">
                    <input type="checkbox" ${dataAttr} class="wf-input" ${value ? 'checked' : ''}>
                    <span>${label}</span>
                </label>`;
                label = '';
            } else {
                inputHtml = buildFallbackInput(key, value, dataAttr, nodeInfo);
            }
        } else {
            inputHtml = buildFallbackInput(key, value, dataAttr, nodeInfo);
        }

        if (label) {
            return `<div class="wf-field"><label>${label}</label>${inputHtml}</div>`;
        }
        return `<div class="wf-field">${inputHtml}</div>`;
    }

    function buildFallbackInput(key, value, dataAttr, nodeInfo) {
        if (typeof value === 'boolean') {
            return `<label style="display:flex;align-items:center;gap:6px">
                <input type="checkbox" ${dataAttr} class="wf-input" ${value ? 'checked' : ''}>
                <span>${key}</span>
            </label>`;
        }
        if (typeof value === 'number') {
            const isFloat = value % 1 !== 0;
            return `<input type="number" ${dataAttr} class="wf-input" value="${value}" step="${isFloat ? 0.01 : 1}">`;
        }
        const str = String(value);
        const isPromptField = key === 'text' || key === 'positive' || key === 'negative';
        const promptBindClass = isPromptField && nodeInfo && PROMPT_NODES.includes(nodeInfo.classType) ? ' wf-prompt-bind' : '';
        if (str.length > 50 || str.includes('\n') || key.toLowerCase().includes('text') || key.toLowerCase().includes('prompt')) {
            return `<textarea ${dataAttr} class="wf-input${promptBindClass}" rows="3">${escapeHtml(str)}</textarea>`;
        }
        return `<input type="text" ${dataAttr} class="wf-input" value="${escapeAttr(str)}">`;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function collectWorkflowFormValues() {
        if (!currentWorkflowData) return null;
        const workflow = JSON.parse(JSON.stringify(currentWorkflowData));

        // Collect LoRA manager toggle states
        document.querySelectorAll('#wf-params .lora-manager-item').forEach(el => {
            const nodeId = el.dataset.node;
            const idx = parseInt(el.dataset.loraIdx);
            if (!nodeId || !workflow[nodeId]) return;
            const loras = workflow[nodeId].inputs.loras?.__value__;
            if (!loras || !loras[idx]) return;
            loras[idx].active = el.querySelector('.lora-active-chk').checked;
            loras[idx].strength = el.querySelector('.lora-strength-inp').value;
            loras[idx].clipStrength = el.querySelector('.lora-strength-inp').value;
        });

        // Rebuild LoRA text from active loras
        for (const node of Object.values(workflow)) {
            if (node.class_type === 'Lora Loader (LoraManager)' && node.inputs.loras?.__value__) {
                const activeLoras = node.inputs.loras.__value__
                    .filter(l => l.active)
                    .map(l => `<lora:${l.name}:${parseFloat(l.strength).toFixed(2)}>`)
                    .join(' ');
                node.inputs.text = activeLoras;
            }
        }

        // Collect trigger word toggle states
        document.querySelectorAll('#wf-params .tw-tag').forEach(el => {
            const nodeId = el.dataset.node;
            const idx = parseInt(el.dataset.twIdx);
            if (!nodeId || !workflow[nodeId]) return;
            const tw = workflow[nodeId].inputs.toggle_trigger_words?.__value__;
            if (!tw || !tw[idx]) return;
            tw[idx].active = el.classList.contains('active');
            if (tw[idx].items?.[0]) tw[idx].items[0].active = tw[idx].active;
        });

        // Rebuild orinalMessage from active trigger words
        for (const node of Object.values(workflow)) {
            if (node.class_type === 'TriggerWord Toggle (LoraManager)' && node.inputs.toggle_trigger_words?.__value__) {
                node.inputs.orinalMessage = node.inputs.toggle_trigger_words.__value__
                    .filter(tw => tw.active)
                    .map(tw => tw.text)
                    .join(',, ');
            }
        }

        // Collect standard form inputs
        document.querySelectorAll('#wf-params .wf-input').forEach(el => {
            const nodeId = el.dataset.node;
            const key = el.dataset.key;
            if (!nodeId || !key || !workflow[nodeId]) return;

            let val;
            if (el.dataset.weilin === '1') {
                const originalTokens = tryParseWeiLinTokens(currentWorkflowData[nodeId]?.inputs?.[key]);
                const newText = el.value;
                val = JSON.stringify(textToWeiLinTokens(newText, originalTokens));
                // Sync the positive/negative field to match edited text
                if (workflow[nodeId].inputs.positive !== undefined) {
                    workflow[nodeId].inputs.positive = newText;
                }
            } else if (el.type === 'checkbox') {
                val = el.checked;
            } else if (el.type === 'number') {
                val = el.value.includes('.') ? parseFloat(el.value) : parseInt(el.value);
            } else {
                val = el.value;
            }
            workflow[nodeId].inputs[key] = val;
        });

        // Inject main area prompts into the correct prompt nodes
        if (wfPromptMap.positiveNodeId && workflow[wfPromptMap.positiveNodeId]) {
            const posNode = workflow[wfPromptMap.positiveNodeId];
            const mainPos = dom.txtPositive.value;
            if (posNode.inputs.positive !== undefined) posNode.inputs.positive = mainPos;
            if (posNode.inputs.text !== undefined && typeof posNode.inputs.text === 'string') posNode.inputs.text = mainPos;
            const origTempStr = currentWorkflowData[wfPromptMap.positiveNodeId]?.inputs?.temp_str;
            if (origTempStr && tryParseWeiLinTokens(origTempStr)) {
                posNode.inputs.temp_str = JSON.stringify(textToWeiLinTokens(mainPos, tryParseWeiLinTokens(origTempStr)));
            }
        }
        if (wfPromptMap.negativeNodeId && workflow[wfPromptMap.negativeNodeId]) {
            const negNode = workflow[wfPromptMap.negativeNodeId];
            const mainNeg = dom.txtNegative.value;
            if (negNode.inputs.positive !== undefined) negNode.inputs.positive = mainNeg;
            if (negNode.inputs.text !== undefined && typeof negNode.inputs.text === 'string') negNode.inputs.text = mainNeg;
            const origTempStr = currentWorkflowData[wfPromptMap.negativeNodeId]?.inputs?.temp_str;
            if (origTempStr && tryParseWeiLinTokens(origTempStr)) {
                negNode.inputs.temp_str = JSON.stringify(textToWeiLinTokens(mainNeg, tryParseWeiLinTokens(origTempStr)));
            }
        }

        for (const node of Object.values(workflow)) {
            if (SAMPLER_NODES.includes(node.class_type) && node.inputs.seed === -1) {
                node.inputs.seed = Math.floor(Math.random() * 2 ** 32);
            }
        }

        return workflow;
    }

    async function generateFromWorkflow() {
        const workflow = collectWorkflowFormValues();
        if (!workflow) {
            alert('请先导入或选择一个工作流');
            return;
        }

        _gen.active = true;
        _gen.startAt = Date.now();
        _gen.runningAt = 0;
        _gen.lastPct = 0;
        _gen.hasRealtimeProgress = false;
        _hideLivePreview();
        _syncFab(0);
        dom.btnGenerate.disabled = true;
        dom.btnGenerate.textContent = '生成中...';
        dom.progressContainer.classList.remove('hidden');
        dom.resultPlaceholder.classList.remove('hidden');
        dom.resultPlaceholder.textContent = '正在生成中，预览将显示在这里';
        dom.resultImage.classList.add('hidden');
        dom.resultActions.classList.add('hidden');
        // 工作流模式同样：点击生成后立刻进入固定结果界面
        updateMobileResultUI(true);
        // 尺寸/expanded 状态已切换：再滚一次，确保滚到底
        try { scrollToResultBottom(); } catch { /* ignore */ }
        setProgress(0);

        try {
            // Handle image uploads for LoadImage nodes
            for (const [nodeId, node] of Object.entries(workflow)) {
                if (IMAGE_INPUT_NODES.includes(node.class_type)) {
                    const fileInput = document.querySelector(`.wf-input[data-node="${nodeId}"][data-key="image"]`);
                    if (fileInput && fileInput.files && fileInput.files[0]) {
                        const res = await uploadImage(fileInput.files[0]);
                        workflow[nodeId].inputs.image = res.name;
                    }
                }
            }

            const clientId = _gen.wsClientId || (`cw_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`);
            _gen.wsClientId = clientId;
            _connectPreviewWS();
            const result = await apiPost('/prompt', { prompt: workflow, client_id: clientId, extra_data: _promptExtraData() });
            _gen.promptId = result.prompt_id;
            await pollProgress(result.prompt_id);
        } catch (e) {
            alert('生图失败: ' + e.message);
            console.error(e);
        } finally {
            _gen.active = false;
            _gen.promptId = null;
            _gen.hasRealtimeProgress = false;
            _closePreviewWS();
            _hideLivePreview();
            _syncFab(0);
            _setTitleProgress(0, '');
            dom.btnGenerate.disabled = false;
            dom.btnGenerate.textContent = '生成图片';
            dom.progressContainer.classList.add('hidden');
        }
    }

    // Override generate to check mode
    const originalGenerate = generate;
    async function generateDispatch() {
        // 点击生成立刻滚到底：让用户可在预览区等待新图出现
        try { scrollToResultBottom(); } catch { /* ignore */ }
        const activeMode = document.querySelector('.mode-tab.active');
        if (activeMode && activeMode.dataset.mode === 'workflow') {
            await generateFromWorkflow();
        } else {
            await originalGenerate();
        }
    }

    // ==================== 界面皮肤（新版 v2 / 旧版 classic）====================
    const UI_SKIN_KEY = 'comfyui_ui_skin';

    function getUiSkin() {
        const v = localStorage.getItem(UI_SKIN_KEY);
        return v === 'classic' ? 'classic' : 'v2';
    }

    function syncClassicThemeSettingsVisibility() {
        const row = document.getElementById('classic-theme-settings');
        if (!row) return;
        row.classList.toggle('hidden', getUiSkin() !== 'classic');
    }

    function applyUiSkin(skin) {
        const next = skin === 'classic' ? 'classic' : 'v2';
        if (next === 'v2') {
            document.documentElement.setAttribute('data-ui', 'v2');
        } else {
            document.documentElement.removeAttribute('data-ui');
        }
        localStorage.setItem(UI_SKIN_KEY, next);

        const sel = document.getElementById('sel-ui-skin');
        if (sel && sel.value !== next) sel.value = next;

        // 旧版恢复配色主题；新版不套 data-theme，避免冲突
        const panel = document.getElementById('theme-panel');
        if (next === 'classic') {
            applyTheme(localStorage.getItem('comfyui_theme') || 'default');
        } else {
            document.documentElement.removeAttribute('data-theme');
            panel?.classList.add('hidden');
        }
        syncClassicThemeSettingsVisibility();
    }

    function setupUiSkin() {
        applyUiSkin(getUiSkin());
        const sel = document.getElementById('sel-ui-skin');
        if (!sel) return;
        sel.value = getUiSkin();
        sel.addEventListener('change', () => applyUiSkin(sel.value));
    }

    // ==================== 主题系统（仅旧版界面） ====================
    function positionThemePanel() {
        const btn = document.getElementById('btn-theme');
        const panel = document.getElementById('theme-panel');
        if (!btn || !panel) return;
        const rect = btn.getBoundingClientRect();
        const panelWidth = panel.offsetWidth || 200;
        const left = Math.min(
            Math.max(8, rect.right - panelWidth),
            window.innerWidth - panelWidth - 8
        );
        panel.style.top = `${Math.round(rect.bottom + 8)}px`;
        panel.style.left = `${Math.round(left)}px`;
        panel.style.right = 'auto';
    }

    function setTheme(theme) {
        if (getUiSkin() === 'v2') return;
        applyTheme(theme);
        localStorage.setItem('comfyui_theme', theme);
    }

    function setupTheme() {
        const saved = localStorage.getItem('comfyui_theme') || 'default';
        if (getUiSkin() === 'classic') applyTheme(saved);
        syncClassicThemeSettingsVisibility();

        const btn = document.getElementById('btn-theme');
        const panel = document.getElementById('theme-panel');
        if (!btn || !panel) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (getUiSkin() === 'v2') return;
            const willOpen = panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            if (willOpen) positionThemePanel();
        });

        document.addEventListener('click', (e) => {
            if (panel.classList.contains('hidden')) return;
            if (panel.contains(e.target) || btn.contains(e.target)) return;
            panel.classList.add('hidden');
        });

        window.addEventListener('resize', () => {
            if (!panel.classList.contains('hidden')) positionThemePanel();
        });

        const onDotClick = (dot) => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (getUiSkin() === 'v2') return;
                setTheme(dot.dataset.theme);
            });
        };
        panel.querySelectorAll('.theme-dot').forEach(onDotClick);
        document.getElementById('settings-theme-dots')?.querySelectorAll('.theme-dot').forEach(onDotClick);
    }

    function applyTheme(theme) {
        const name = theme || 'default';
        if (name === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', name);
        }
        document.querySelectorAll('.theme-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.theme === name);
        });
    }

    // ==================== 标签翻译服务 ====================
    const TagTranslator = {
        localMap: null,
        cache: JSON.parse(localStorage.getItem('tag_translate_cache') || '{}'),
        showChinese: localStorage.getItem('tag_show_chinese') !== 'false',
        provider: localStorage.getItem('tag_translate_provider') || 'google',
        pendingBatch: [],
        batchTimer: null,

        buildLocalMap() {
            if (this.localMap) return;
            this.localMap = {};
            tagData.forEach(group => {
                (group.subgroups || []).forEach(sub => {
                    if (!sub) return;
                    (sub.tags || []).forEach(tag => {
                        if (tag.t && tag.d) {
                            this.localMap[tag.t.toLowerCase()] = tag.d;
                        }
                    });
                });
            });
        },

        getLocal(tagName) {
            this.buildLocalMap();
            return this.localMap[tagName.toLowerCase()] || this.localMap[tagName.replace(/ /g, '_').toLowerCase()] || null;
        },

        getCached(tagName) {
            return this.cache[tagName.toLowerCase()] || null;
        },

        async translate(tagName) {
            const local = this.getLocal(tagName);
            if (local) return local;

            const cached = this.getCached(tagName);
            if (cached) return cached;

            if (this.provider === 'local') return null;

            return new Promise(resolve => {
                this.pendingBatch.push({ tag: tagName, resolve });
                clearTimeout(this.batchTimer);
                this.batchTimer = setTimeout(() => this.flushBatch(), 300);
            });
        },

        async flushBatch() {
            const batch = this.pendingBatch.splice(0);
            if (batch.length === 0) return;

            const needTranslate = batch.filter(b => !this.getLocal(b.tag) && !this.getCached(b.tag));
            const text = needTranslate.map(b => b.tag.replace(/_/g, ' ')).join('\n');

            if (text && needTranslate.length > 0) {
                try {
                    const results = await this.callAPI(text);
                    const lines = results.split('\n');
                    needTranslate.forEach((b, i) => {
                        const zh = (lines[i] || '').trim();
                        if (zh && zh !== b.tag) {
                            this.cache[b.tag.toLowerCase()] = zh;
                        }
                    });
                    this.saveCache();
                } catch (e) {
                    console.warn('Translation failed:', e);
                }
            }

            batch.forEach(b => {
                const result = this.getLocal(b.tag) || this.getCached(b.tag) || null;
                b.resolve(result);
            });
        },

        async callAPI(text) {
            const payload = {
                text,
                provider: this.provider === 'mymemory' ? 'mymemory' : 'google',
            };

            // 同域边缘代理：避免浏览器直连 Google 被 CORS 拦截（tomkk.xyz / pages.dev）
            try {
                const resp = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data?.ok && typeof data.text === 'string') return data.text;
                }
            } catch { /* fall through */ }

            // 浏览器回退：MyMemory 通常允许跨域（Google 直连会被 CORS 拦）
            const lines = text.split('\n');
            const results = [];
            for (const line of lines.slice(0, 10)) {
                try {
                    const resp = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(line)}&langpair=en|zh-CN`);
                    const data = await resp.json();
                    results.push(data.responseData?.translatedText || line);
                } catch { results.push(line); }
            }
            return results.join('\n');
        },

        saveCache() {
            try {
                const entries = Object.entries(this.cache);
                const trimmed = Object.fromEntries(entries.slice(-500));
                localStorage.setItem('tag_translate_cache', JSON.stringify(trimmed));
            } catch {}
        },

        getSync(tagName) {
            return this.getLocal(tagName) || this.getCached(tagName) || null;
        }
    };

    // ==================== 提示词标签可视化编辑器 ====================
    function setupPromptTagEditor() {
        const allEditors = [];
        const editors = [
            { textarea: dom.txtPositive, container: document.getElementById('prompt-tags-pos') },
            { textarea: dom.txtNegative, container: document.getElementById('prompt-tags-neg') },
        ];

        editors.forEach(({ textarea, container }) => {
            if (!textarea || !container) return;
            const editor = new PromptTagEditor(textarea, container);
            textarea._tagEditor = editor;
            allEditors.push(editor);
        });

        window.addEventListener('resize', () => {
            allEditors.forEach(ed => ed.render());
        });

        MobilePromptTagSheet.init();

        const toggleBtn = document.getElementById('btn-translate-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', TagTranslator.showChinese);
            toggleBtn.addEventListener('click', () => {
                TagTranslator.showChinese = !TagTranslator.showChinese;
                localStorage.setItem('tag_show_chinese', TagTranslator.showChinese);
                toggleBtn.classList.toggle('active', TagTranslator.showChinese);
                allEditors.forEach(ed => ed.render());
            });
        }

        const providerSel = document.getElementById('sel-translate-provider');
        if (providerSel) {
            providerSel.value = TagTranslator.provider;
            providerSel.addEventListener('change', () => {
                TagTranslator.provider = providerSel.value;
                localStorage.setItem('tag_translate_provider', providerSel.value);
                allEditors.forEach(ed => ed.parseAndRender());
            });
        }
    }

    class PromptTagEditor {
        constructor(textarea, container) {
            this.textarea = textarea;
            this.container = container;
            this.tags = [];
            this.dragIdx = -1;
            this.suppressSync = false;

            this.textarea.addEventListener('blur', (e) => {
                if (this.container.contains(e.relatedTarget)) return;
                // 手机点标签时 blur 会抢先触发并重绘 DOM，导致点击丢失
                if (MobilePromptTagSheet.isMobile()) return;
                this.parseAndRender();
            });

            this.textarea.addEventListener('input', () => {
                if (!this.suppressSync) this.parseAndRender();
            });

            this._onTagPointerDown = (e) => {
                if (!MobilePromptTagSheet.isMobile()) return;
                const tagEl = e.target.closest('.prompt-tag');
                if (!tagEl || !this.container.contains(tagEl)) return;
                if (e.target.closest('.prompt-tag-btn')) return;
                const idx = parseInt(tagEl.dataset.idx, 10);
                if (Number.isNaN(idx)) return;
                e.preventDefault();
                MobilePromptTagSheet.open(this, idx);
            };
            this.container.addEventListener('pointerdown', this._onTagPointerDown);

            this.container.addEventListener('dragover', (e) => e.preventDefault());
            this.container.addEventListener('drop', (e) => e.preventDefault());

            this.parseAndRender();
        }

        parsePrompt(text) {
            if (!text.trim()) return [];
            return text.split(',').map(s => s.trim()).filter(Boolean).map(raw => {
                const wm = raw.match(/^\((.+?):([\d.]+)\)$/);
                if (wm) return { name: wm[1], weight: parseFloat(wm[2]) };
                return { name: raw, weight: 1.0 };
            });
        }

        tagsToText() {
            return this.tags.map(t => {
                if (t.weight !== 1.0) return `(${t.name}:${t.weight.toFixed(1)})`;
                return t.name;
            }).join(', ');
        }

        syncToTextarea() {
            this.suppressSync = true;
            this.textarea.value = this.tagsToText();
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
            this.suppressSync = false;
        }

        parseAndRender() {
            this.tags = this.parsePrompt(this.textarea.value);
            this.render();
        }

        render() {
            this.container.innerHTML = '';
            this.tags.forEach((tag, idx) => {
                const el = this.createTagElement(tag, idx);
                this.container.appendChild(el);
            });
            MobilePromptTagSheet.syncAfterRender(this);
        }

        createTagElement(tag, idx) {
            const el = document.createElement('div');
            const isMobileTap = MobilePromptTagSheet.isMobile();
            el.className = 'prompt-tag' + (isMobileTap ? ' prompt-tag-tap' : '');
            el.draggable = !isMobileTap;
            el.dataset.idx = idx;

            if (isMobileTap && MobilePromptTagSheet.editor === this && MobilePromptTagSheet.idx === idx) {
                el.classList.add('active');
            }

            const textCol = document.createElement('span');
            textCol.className = 'prompt-tag-text-col';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'prompt-tag-name';
            nameSpan.textContent = tag.name;
            nameSpan.title = tag.name;
            nameSpan.addEventListener('dblclick', () => this.startEdit(el, tag, idx));
            textCol.appendChild(nameSpan);

            if (TagTranslator.showChinese) {
                const zh = TagTranslator.getSync(tag.name);
                if (zh) {
                    const zhSpan = document.createElement('span');
                    zhSpan.className = 'prompt-tag-zh';
                    zhSpan.textContent = zh;
                    textCol.appendChild(zhSpan);
                } else if (TagTranslator.provider !== 'local') {
                    TagTranslator.translate(tag.name).then(zh => {
                        if (zh && el.isConnected) {
                            const zhSpan = document.createElement('span');
                            zhSpan.className = 'prompt-tag-zh';
                            zhSpan.textContent = zh;
                            textCol.appendChild(zhSpan);
                        }
                    });
                }
            }

            el.appendChild(textCol);

            if (tag.weight !== 1.0) {
                const wSpan = document.createElement('span');
                wSpan.className = 'prompt-tag-weight';
                wSpan.textContent = tag.weight.toFixed(1);
                el.appendChild(wSpan);
            }

            const actions = document.createElement('span');
            actions.className = 'prompt-tag-actions';

            const btnUp = this.makeBtn('▲', 'btn-weight-up', () => this.changeWeight(idx, 0.1));
            const btnDown = this.makeBtn('▼', 'btn-weight-down', () => this.changeWeight(idx, -0.1));
            const btnCopy = this.makeBtn('📋', 'btn-tag-copy', () => {
                navigator.clipboard.writeText(tag.weight !== 1.0 ? `(${tag.name}:${tag.weight.toFixed(1)})` : tag.name);
            });
            const btnDel = this.makeBtn('✕', 'btn-tag-delete', () => this.removeTag(idx));

            actions.append(btnUp, btnDown, btnCopy, btnDel);
            el.appendChild(actions);

            if (!isMobileTap) {
                el.addEventListener('dragstart', (e) => {
                    this.dragIdx = idx;
                    el.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });

                el.addEventListener('dragend', () => {
                    el.classList.remove('dragging');
                    this.container.querySelectorAll('.prompt-tag').forEach(t => t.classList.remove('drag-over'));
                });

                el.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const dragging = this.container.querySelector('.dragging');
                    if (dragging && dragging !== el) {
                        el.classList.add('drag-over');
                    }
                });

                el.addEventListener('dragleave', () => el.classList.remove('drag-over'));

                el.addEventListener('drop', (e) => {
                    e.preventDefault();
                    el.classList.remove('drag-over');
                    const fromIdx = this.dragIdx;
                    const toIdx = idx;
                    if (fromIdx === toIdx || fromIdx < 0) return;
                    const [moved] = this.tags.splice(fromIdx, 1);
                    this.tags.splice(toIdx, 0, moved);
                    this.syncToTextarea();
                    this.render();
                });
            }

            return el;
        }

        makeBtn(label, cls, onClick) {
            const btn = document.createElement('button');
            btn.className = `prompt-tag-btn ${cls}`;
            btn.textContent = label;
            btn.tabIndex = -1;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick();
            });
            return btn;
        }

        changeWeight(idx, delta) {
            const tag = this.tags[idx];
            if (!tag) return;
            tag.weight = Math.max(0.1, Math.round((tag.weight + delta) * 10) / 10);
            this.syncToTextarea();
            this.render();
        }

        moveTag(idx, delta) {
            const newIdx = idx + delta;
            if (newIdx < 0 || newIdx >= this.tags.length) return;
            const [moved] = this.tags.splice(idx, 1);
            this.tags.splice(newIdx, 0, moved);
            this.syncToTextarea();
            this.render();
        }

        removeTag(idx) {
            this.tags.splice(idx, 1);
            this.syncToTextarea();
            this.render();
        }

        startEdit(el, tag, idx) {
            const nameSpan = el.querySelector('.prompt-tag-name');
            const input = document.createElement('input');
            input.className = 'prompt-tag-input';
            input.value = tag.name;

            const finish = () => {
                const newName = input.value.trim();
                if (newName && newName !== tag.name) {
                    this.tags[idx].name = newName;
                    this.syncToTextarea();
                }
                this.render();
            };

            input.addEventListener('blur', finish);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); finish(); }
                if (e.key === 'Escape') { this.render(); }
            });

            nameSpan.replaceWith(input);
            input.focus();
            input.select();
        }
    }

    // ==================== 图片元数据解析 ====================
    const MetaParser = {
        async _inflate(data) {
            try {
                const ds = new DecompressionStream('deflate');
                const writer = ds.writable.getWriter();
                writer.write(data);
                writer.close();
                const reader = ds.readable.getReader();
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                const totalLen = chunks.reduce((s, c) => s + c.length, 0);
                const result = new Uint8Array(totalLen);
                let pos = 0;
                for (const c of chunks) { result.set(c, pos); pos += c.length; }
                return new TextDecoder('utf-8').decode(result);
            } catch { return null; }
        },

        async _decompressToBytes(data, format) {
            try {
                const ds = new DecompressionStream(format);
                const writer = ds.writable.getWriter();
                writer.write(data instanceof Uint8Array ? data : new Uint8Array(data));
                writer.close();
                const reader = ds.readable.getReader();
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                const totalLen = chunks.reduce((s, c) => s + c.length, 0);
                const result = new Uint8Array(totalLen);
                let pos = 0;
                for (const c of chunks) { result.set(c, pos); pos += c.length; }
                return result;
            } catch { return null; }
        },

        async _gunzipToString(data) {
            const bytes = await this._decompressToBytes(data, 'gzip');
            if (!bytes) return null;
            return new TextDecoder('utf-8').decode(bytes);
        },

        /**
         * NovelAI / stealth PNG Info：从 alpha LSB 提取元数据。
         * 像素遍历顺序与官方一致：先 x 后 y（列优先）。
         * 魔数 stealth_pngcomp = gzip JSON；stealth_pnginfo = 明文。
         */
        async extractStealthMetadata(source) {
            try {
                const blob = source instanceof Blob
                    ? source
                    : new Blob([source], { type: 'image/png' });
                let bitmap;
                try {
                    bitmap = await createImageBitmap(blob);
                } catch {
                    return null;
                }
                const w = bitmap.width;
                const h = bitmap.height;
                if (w < 1 || h < 1) {
                    bitmap.close?.();
                    return null;
                }

                const canvas = typeof OffscreenCanvas !== 'undefined'
                    ? new OffscreenCanvas(w, h)
                    : Object.assign(document.createElement('canvas'), { width: w, height: h });
                const ctx = canvas.getContext('2d', {
                    willReadFrequently: true,
                    alpha: true,
                    colorSpace: 'srgb',
                });
                if (!ctx) {
                    bitmap.close?.();
                    return null;
                }
                ctx.drawImage(bitmap, 0, 0);
                bitmap.close?.();
                const pixels = ctx.getImageData(0, 0, w, h).data;
                const totalPixels = w * h;

                const readBytes = (startPixel, nBytes) => {
                    const out = new Uint8Array(nBytes);
                    let p = startPixel;
                    for (let i = 0; i < nBytes; i++) {
                        let byte = 0;
                        for (let b = 0; b < 8; b++) {
                            if (p >= totalPixels) return null;
                            const x = Math.floor(p / h);
                            const y = p % h;
                            const alpha = pixels[(y * w + x) * 4 + 3];
                            byte = (byte << 1) | (alpha & 1);
                            p++;
                        }
                        out[i] = byte;
                    }
                    return { bytes: out, nextPixel: p };
                };

                const sigResult = readBytes(0, 15);
                if (!sigResult) return null;
                const sig = new TextDecoder('utf-8').decode(sigResult.bytes);
                let compressed = false;
                if (sig === 'stealth_pngcomp') compressed = true;
                else if (sig === 'stealth_pnginfo') compressed = false;
                else return null;

                const lenResult = readBytes(sigResult.nextPixel, 4);
                if (!lenResult) return null;
                const bitLen = ((lenResult.bytes[0] << 24) | (lenResult.bytes[1] << 16) |
                    (lenResult.bytes[2] << 8) | lenResult.bytes[3]) >>> 0;
                const byteLen = Math.floor(bitLen / 8);
                if (byteLen <= 0 || byteLen > totalPixels) return null;

                const dataResult = readBytes(lenResult.nextPixel, byteLen);
                if (!dataResult) return null;

                let payloadStr;
                if (compressed) {
                    payloadStr = await this._gunzipToString(dataResult.bytes);
                } else {
                    payloadStr = new TextDecoder('utf-8').decode(dataResult.bytes);
                }
                if (!payloadStr) return null;

                try {
                    const data = JSON.parse(payloadStr);
                    if (typeof data.Comment === 'string') {
                        try { data.Comment = JSON.parse(data.Comment); } catch { /* keep string */ }
                    }
                    data._stealthSig = sig;
                    return data;
                } catch {
                    return { _stealthRaw: payloadStr, _stealthSig: sig };
                }
            } catch {
                return null;
            }
        },

        _stealthToResult(stealth) {
            if (!stealth) return null;
            if (stealth._stealthRaw) {
                const raw = stealth._stealthRaw;
                if (raw.includes('Steps:') || raw.includes('Negative prompt:')) {
                    const r = this.parseA1111(raw);
                    r.source = 'Stealth PNG Info';
                    return r;
                }
                return { source: 'Stealth PNG Info', positive: raw };
            }
            const r = this.parseNovelAI(stealth);
            if (stealth._stealthSig) r.stealth = stealth._stealthSig;
            return r;
        },

        async parsePNG(buffer) {
            const view = new DataView(buffer);
            if (view.getUint32(0) !== 0x89504E47) return null;
            const texts = {};
            let offset = 8;
            while (offset < buffer.byteLength - 4) {
                const len = view.getUint32(offset);
                const typeBytes = new Uint8Array(buffer, offset + 4, 4);
                const type = String.fromCharCode(...typeBytes);
                if (type === 'tEXt') {
                    const data = new Uint8Array(buffer, offset + 8, len);
                    const nullIdx = data.indexOf(0);
                    if (nullIdx > 0) {
                        const key = new TextDecoder().decode(data.slice(0, nullIdx));
                        const val = new TextDecoder().decode(data.slice(nullIdx + 1));
                        texts[key] = val;
                    }
                } else if (type === 'zTXt') {
                    const data = new Uint8Array(buffer, offset + 8, len);
                    const nullIdx = data.indexOf(0);
                    if (nullIdx > 0) {
                        const key = new TextDecoder().decode(data.slice(0, nullIdx));
                        const compMethod = data[nullIdx + 1];
                        const compressed = data.slice(nullIdx + 2);
                        if (compMethod === 0) {
                            const val = await this._inflate(compressed);
                            if (val) texts[key] = val;
                        }
                    }
                } else if (type === 'iTXt') {
                    const data = new Uint8Array(buffer, offset + 8, len);
                    const nullIdx = data.indexOf(0);
                    if (nullIdx > 0) {
                        const key = new TextDecoder().decode(data.slice(0, nullIdx));
                        let rest = nullIdx + 1;
                        const compressionFlag = data[rest]; rest++;
                        rest++;
                        const langEnd = data.indexOf(0, rest); rest = langEnd + 1;
                        const kwEnd = data.indexOf(0, rest); rest = kwEnd + 1;
                        let val;
                        if (compressionFlag === 0) {
                            val = new TextDecoder('utf-8').decode(data.slice(rest));
                        } else {
                            val = await this._inflate(data.slice(rest));
                            if (!val) val = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(rest));
                        }
                        texts[key] = val;
                    }
                } else if (type === 'IEND') {
                    break;
                }
                offset += 12 + len;
            }
            return Object.keys(texts).length ? texts : null;
        },

        parseWebP(buffer) {
            const view = new DataView(buffer);
            if (view.getUint32(0) !== 0x52494646) return null; // 'RIFF'
            if (view.getUint32(8) !== 0x57454250) return null; // 'WEBP'
            const texts = {};
            let offset = 12;
            while (offset < buffer.byteLength - 8) {
                const chunkId = String.fromCharCode(
                    view.getUint8(offset), view.getUint8(offset + 1),
                    view.getUint8(offset + 2), view.getUint8(offset + 3)
                );
                const chunkLen = view.getUint32(offset + 4, true);
                if (chunkId === 'EXIF') {
                    const exifData = new Uint8Array(buffer, offset + 8, chunkLen);
                    const str = new TextDecoder('utf-8', { fatal: false }).decode(exifData);
                    this._extractExifStrings(str, texts, true);
                } else if (chunkId === 'XMP ') {
                    const xmpData = new Uint8Array(buffer, offset + 8, chunkLen);
                    const xmpStr = new TextDecoder('utf-8', { fatal: false }).decode(xmpData);
                    this._extractXmpStrings(xmpStr, texts);
                }
                offset += 8 + chunkLen + (chunkLen % 2);
            }
            return Object.keys(texts).length ? texts : null;
        },

        _extractExifStrings(str, texts, rawBytes) {
            if (rawBytes) {
                const ucMarker = 'UNICODE';
                const markerIdx = str.indexOf(ucMarker);
                if (markerIdx >= 0) {
                    const start = markerIdx + ucMarker.length;
                    const filtered = [];
                    for (let i = start; i < str.length; i++) {
                        const code = str.charCodeAt(i);
                        if (code > 0 && code < 128) filtered.push(String.fromCharCode(code));
                        else if (code === 0x0A) filtered.push('\n');
                    }
                    const decodedText = filtered.join('').trim();
                    if (decodedText.length > 5) {
                        if (decodedText.includes('Steps:') || decodedText.includes('Negative prompt:')) {
                            texts['parameters'] = decodedText;
                        } else {
                            texts['UserComment'] = decodedText;
                        }
                    }
                }
            }
            if (!texts['parameters'] && str.includes('parameters')) {
                const pIdx = str.indexOf('parameters');
                if (pIdx >= 0) texts['parameters'] = str.substring(pIdx + 10).replace(/^\0+/, '').trim();
            }
            if (!texts['UserComment'] && str.includes('UserComment')) {
                const ucIdx = str.indexOf('UserComment');
                if (ucIdx >= 0) {
                    let val = str.substring(ucIdx + 11).replace(/^\0+/, '').trim();
                    if (val.startsWith('UNICODE')) val = val.substring(7).replace(/^\0+/, '');
                    texts['UserComment'] = val;
                }
            }
            const jsonPatterns = [/"prompt"\s*:/, /"uc"\s*:/, /"steps"\s*:/];
            const searchStr = texts['UserComment'] || str;
            if (jsonPatterns.some(p => p.test(searchStr))) {
                const target = jsonPatterns.some(p => p.test(texts['UserComment'] || '')) ? texts['UserComment'] : str;
                const braceStart = target.indexOf('{');
                if (braceStart >= 0) {
                    let depth = 0, end = braceStart;
                    for (let i = braceStart; i < target.length; i++) {
                        if (target[i] === '{') depth++;
                        else if (target[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
                    }
                    const jsonStr = target.substring(braceStart, end);
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.prompt || parsed.uc) texts['Comment'] = jsonStr;
                    } catch {}
                }
            }
        },

        _extractXmpStrings(xmpStr, texts) {
            const descMatch = xmpStr.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/);
            if (descMatch) texts['Description'] = descMatch[1].trim();
            const paramMatch = xmpStr.match(/parameters="([^"]*)"/);
            if (paramMatch) texts['parameters'] = paramMatch[1];
            const commentMatch = xmpStr.match(/UserComment="([^"]*)"/);
            if (commentMatch) texts['UserComment'] = commentMatch[1];
        },

        parseJPEG(buffer) {
            const view = new DataView(buffer);
            if (view.getUint16(0) !== 0xFFD8) return null;
            const texts = {};
            let offset = 2;
            while (offset < buffer.byteLength - 2) {
                const marker = view.getUint16(offset);
                if (marker === 0xFFE1) {
                    const segLen = view.getUint16(offset + 2);
                    const segData = new Uint8Array(buffer, offset + 4, segLen - 2);
                    const str = new TextDecoder('utf-8', { fatal: false }).decode(segData);
                    if (str.startsWith('Exif\0\0') || str.includes('parameters') || str.includes('UserComment') || str.includes('UNICODE')) {
                        this._extractExifStrings(str, texts, true);
                    }
                    if (str.startsWith('http://ns.adobe.com/xap/') || str.includes('<x:xmpmeta')) {
                        this._extractXmpStrings(str, texts);
                    }
                    offset += 2 + segLen;
                    continue;
                } else if (marker === 0xFFE0) {
                    const segLen = view.getUint16(offset + 2);
                    offset += 2 + segLen;
                    continue;
                } else if (marker === 0xFFFE) {
                    const segLen = view.getUint16(offset + 2);
                    const data = new Uint8Array(buffer, offset + 4, segLen - 2);
                    const comment = new TextDecoder('utf-8', { fatal: false }).decode(data);
                    if (comment.trim()) texts['Comment'] = comment.trim();
                    offset += 2 + segLen;
                    continue;
                } else if (marker === 0xFFDA) {
                    break;
                } else if ((marker & 0xFF00) === 0xFF00) {
                    const segLen = view.getUint16(offset + 2);
                    offset += 2 + segLen;
                } else {
                    break;
                }
            }
            return Object.keys(texts).length ? texts : null;
        },

        parseA1111(text) {
            const result = { source: 'A1111/Forge' };
            const negIdx = text.indexOf('Negative prompt:');
            const stepsIdx = text.search(/\nSteps:/);
            const paramsStart = stepsIdx >= 0 ? stepsIdx : text.search(/\n[A-Z][a-z]+ *:/);

            if (negIdx >= 0) {
                result.positive = text.substring(0, negIdx).trim();
                const afterNeg = text.substring(negIdx + 16);
                const paramLineIdx = afterNeg.search(/\nSteps:|^Steps:/m);
                if (paramLineIdx >= 0) {
                    result.negative = afterNeg.substring(0, paramLineIdx).trim();
                    const paramStr = afterNeg.substring(paramLineIdx).replace(/^\n/, '');
                    Object.assign(result, this.parseParamLine(paramStr));
                } else {
                    result.negative = afterNeg.trim();
                }
            } else if (paramsStart >= 0) {
                result.positive = text.substring(0, paramsStart).trim();
                const paramStr = text.substring(paramsStart).replace(/^\n/, '');
                Object.assign(result, this.parseParamLine(paramStr));
            } else {
                result.positive = text.trim();
            }

            this.extractLoras(result);
            return result;
        },

        parseParamLine(str) {
            const r = {};
            const extract = (key) => {
                const re = new RegExp(key + '\\s*:\\s*([^,]+)', 'i');
                const m = str.match(re);
                return m ? m[1].trim() : null;
            };
            const steps = extract('Steps'); if (steps) r.steps = parseInt(steps);
            const sampler = extract('Sampler'); if (sampler) r.sampler = sampler;
            const cfg = extract('CFG scale'); if (cfg) r.cfg = parseFloat(cfg);
            const seed = extract('Seed'); if (seed) r.seed = seed;
            const size = extract('Size');
            if (size) { const [w, h] = size.split('x'); r.width = parseInt(w); r.height = parseInt(h); }
            const model = extract('Model'); if (model) r.model = model;
            const modelHash = extract('Model hash'); if (modelHash) r.modelHash = modelHash;
            const clipSkip = extract('Clip skip'); if (clipSkip) r.clipSkip = parseInt(clipSkip);
            const denoise = extract('Denoising strength'); if (denoise) r.denoise = parseFloat(denoise);
            const scheduler = extract('Schedule type'); if (scheduler) r.scheduler = scheduler;
            const refinerModel = extract('Refiner'); if (refinerModel) r.refinerModel = refinerModel;
            const refinerSwitch = extract('Refiner switch at'); if (refinerSwitch) r.refinerSwitch = parseFloat(refinerSwitch);
            const adModel = extract('ADetailer model'); if (adModel) r.adetailerModel = adModel;
            const adPrompt = extract('ADetailer prompt'); if (adPrompt) r.adetailerPrompt = adPrompt;
            const hiresUpscaler = extract('Hires upscaler'); if (hiresUpscaler) r.hiresUpscaler = hiresUpscaler;
            const hiresSteps = extract('Hires steps'); if (hiresSteps) r.hiresSteps = parseInt(hiresSteps);
            const hiresScale = extract('Hires upscale'); if (hiresScale) r.hiresScale = parseFloat(hiresScale);
            return r;
        },

        extractLoras(result) {
            const loraRegex = /<lora:([^:>]+):([\d.]+)>/gi;
            const loras = result.loras ? [...result.loras] : [];
            const seen = new Set(loras.map(l => (l.fullName || l.name).toLowerCase()));

            const addLora = (name, weight, fullName) => {
                if (!name) return;
                const key = (fullName || name).toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                loras.push({
                    name: name.split('/').pop() || name,
                    fullName: fullName || name,
                    weight: Number.isFinite(weight) ? weight : 1,
                });
            };

            for (const field of ['positive', 'negative']) {
                const text = result[field];
                if (!text) continue;
                let match;
                while ((match = loraRegex.exec(text)) !== null) {
                    addLora(match[1], parseFloat(match[2]), match[1]);
                }
                loraRegex.lastIndex = 0;
            }

            if (loras.length > 0) result.loras = loras;
        },

        extractComfyLoras(prompt, wfMap) {
            return this.extractUsedComfyLoras(prompt, wfMap);
        },

        dedupeLoras(loras) {
            const deduped = [];
            const seen = new Set();
            for (const l of loras) {
                const key = (l.fullName || l.name).toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                deduped.push(l);
            }
            return deduped;
        },

        loraEntryFromName(fullName, weight) {
            const w = parseFloat(weight);
            return {
                name: fullName.split('/').pop() || fullName,
                fullName,
                weight: Number.isFinite(w) ? w : 1,
            };
        },

        extractLorasFromTextField(text, out) {
            if (typeof text !== 'string' || !text.includes('<lora:')) return;
            const loraRegex = /<lora:([^:>]+):([^>]+)>/gi;
            let match;
            while ((match = loraRegex.exec(text)) !== null) {
                out.push(this.loraEntryFromName(match[1].trim(), match[2]));
            }
        },

        countLoraTags(text) {
            if (typeof text !== 'string') return 0;
            return (text.match(/<lora:[^>]+>/gi) || []).length;
        },

        extractLorasFromManagerNode(inputs, out) {
            const list = inputs?.loras?.__value__;
            const activeList = Array.isArray(list)
                ? list.filter(l => l?.name && l.active !== false)
                : [];
            const textCount = this.countLoraTags(inputs?.text);

            // text 常含作者整库；若明显多于 active 条目，以 active 为准
            if (activeList.length > 0 && textCount > 20 && textCount > activeList.length) {
                activeList.forEach(l => {
                    out.push(this.loraEntryFromName(
                        l.name,
                        l.strength ?? l.strength_model ?? l.clipStrength ?? 1
                    ));
                });
                return;
            }

            if (typeof inputs?.text === 'string' && inputs.text.includes('<lora:')) {
                this.extractLorasFromTextField(inputs.text, out);
                return;
            }

            activeList.forEach(l => {
                out.push(this.loraEntryFromName(
                    l.name,
                    l.strength ?? l.strength_model ?? l.clipStrength ?? 1
                ));
            });
        },

        extractUsedComfyLoras(prompt, wfMap) {
            const loras = [];

            for (const node of Object.values(prompt)) {
                const ct = node.class_type || '';
                const inputs = node.inputs || {};

                if (ct === 'LoraLoader' || ct === 'LoraLoaderModelOnly') {
                    const loraName = inputs.lora_name;
                    const strength = parseFloat(inputs.strength_model ?? inputs.strength ?? 1);
                    if (typeof loraName === 'string' && loraName) {
                        loras.push(this.loraEntryFromName(loraName, strength));
                    }
                }

                if (ct === 'Lora Loader (LoraManager)') {
                    this.extractLorasFromManagerNode(inputs, loras);
                }

                if (ct === 'WeiLinPromptUI' || ct === 'WeiLinPromptUIWithoutLora') {
                    const loraStr = inputs.lora_str || inputs.temp_lora_str || '';
                    this.extractLorasFromTextField(loraStr, loras);
                }
            }

            for (const node of Object.values(prompt)) {
                if (node.class_type === 'Lora Loader (LoraManager)') continue;
                const scanVal = (val) => {
                    if (typeof val === 'string' && val.includes('<lora:')) {
                        const tc = this.countLoraTags(val);
                        if (tc > 0 && tc <= 30) this.extractLorasFromTextField(val, loras);
                    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
                        for (const v of Object.values(val)) scanVal(v);
                    }
                };
                scanVal(node.inputs);
            }

            return this.dedupeLoras(loras);
        },

        extractLibraryComfyLoras(prompt, wfMap) {
            const loras = [];
            const addFromManager = (list) => {
                if (!Array.isArray(list)) return;
                list.forEach(l => {
                    if (!l?.name) return;
                    loras.push(this.loraEntryFromName(
                        l.name,
                        l.strength ?? l.strength_model ?? l.clipStrength ?? 1
                    ));
                });
            };

            for (const node of Object.values(prompt)) {
                if (node.class_type === 'Lora Loader (LoraManager)') {
                    addFromManager(node.inputs?.loras?.__value__);
                }
            }

            if (wfMap) {
                for (const wfNode of Object.values(wfMap)) {
                    if (wfNode?.type !== 'Lora Loader (LoraManager)') continue;
                    const wv = wfNode.widgets_values;
                    if (!Array.isArray(wv) || !wv[0]?.__value__) continue;
                    addFromManager(wv[0].__value__);
                }
            }

            return this.dedupeLoras(loras);
        },

        tokenJsonToText(val) {
            if (typeof val !== 'string') return String(val || '');
            const trimmed = val.trim();
            if (!trimmed.startsWith('[')) return val;
            try {
                const arr = JSON.parse(trimmed);
                if (!Array.isArray(arr) || !arr[0]?.text) return val;
                return arr
                    .filter(t => !t.isPunctuation && t.text && t.text !== '\n')
                    .map(t => t.text)
                    .join(', ');
            } catch { return val; }
        },

        isNodeRef(val) {
            return Array.isArray(val) && val.length === 2 && typeof val[0] === 'string';
        },

        parseComfyJson(str) {
            if (!str || typeof str !== 'string') return null;
            try {
                return JSON.parse(str);
            } catch {
                try {
                    const sanitized = str
                        .replace(/\b-Infinity\b/g, 'null')
                        .replace(/\bInfinity\b/g, 'null')
                        .replace(/\bNaN\b/g, 'null');
                    return JSON.parse(sanitized);
                } catch { return null; }
            }
        },

        buildWorkflowMap(workflowStr) {
            if (!workflowStr) return null;
            const wf = this.parseComfyJson(workflowStr);
            if (!wf) return null;
            const map = {};
            for (const n of (wf.nodes || [])) map[String(n.id)] = n;
            return map;
        },

        getWorkflowNode(wfMap, nodeId) {
            if (!wfMap || !nodeId) return null;
            return wfMap[nodeId]
                || wfMap[String(Number(nodeId))]
                || wfMap[nodeId.split(':').pop()]
                || null;
        },

        getWidgetValue(wfMap, nodeId, slot) {
            const wfNode = this.getWorkflowNode(wfMap, nodeId);
            const wv = wfNode?.widgets_values;
            if (!Array.isArray(wv)) return null;
            if (slot == null) return wv;
            return slot < wv.length ? wv[slot] : null;
        },

        resolvePromptValue(val, prompt, wfMap, ctx = {}) {
            const visited = ctx.visited || new Set();
            const wantSlot = ctx.wantSlot;

            if (val == null) return null;
            if (!this.isNodeRef(val)) {
                if (typeof val === 'string') return this.tokenJsonToText(val);
                return val;
            }

            const [nodeId, slot] = val;
            const effSlot = wantSlot != null ? wantSlot : slot;
            const visitKey = `${nodeId}#${effSlot}`;
            if (visited.has(visitKey)) return null;
            visited.add(visitKey);

            const node = prompt[nodeId] || prompt[nodeId.split(':').pop()];
            if (!node) return this.getWidgetValue(wfMap, nodeId, effSlot);

            const ct = node.class_type || '';
            const inputs = node.inputs || {};

            if (ct === 'KSampler Config (rgthree)') {
                const keys = ['steps_total', 'refiner_step', 'cfg', 'sampler_name', 'scheduler'];
                const key = keys[effSlot];
                if (key && inputs[key] != null) {
                    return this.resolvePromptValue(inputs[key], prompt, wfMap, { visited });
                }
            }

            if (ct === 'ParameterBreak') {
                if (inputs.parameters != null) {
                    return this.resolvePromptValue(inputs.parameters, prompt, wfMap, { visited, wantSlot: effSlot });
                }
            }

            if (ct === 'ParameterControlPanel') {
                const wv = this.getWidgetValue(wfMap, nodeId, effSlot);
                if (wv != null && wv !== '') return wv;
            }

            if (ct === 'Context (rgthree)') {
                const ctxKeys = ['base_ctx', 'model', 'clip', 'vae', 'positive', 'negative', 'latent', 'images'];
                const key = ctxKeys[effSlot];
                if (key && inputs[key] != null) {
                    const v = inputs[key];
                    if (key === 'base_ctx') {
                        return this.resolvePromptValue(v, prompt, wfMap, { visited, wantSlot: effSlot });
                    }
                    return this.resolvePromptValue(v, prompt, wfMap, { visited });
                }
                if (inputs.base_ctx != null) {
                    return this.resolvePromptValue(inputs.base_ctx, prompt, wfMap, { visited, wantSlot: effSlot });
                }
            }

            if (ct === 'Context Switch (rgthree)') {
                for (const [k, v] of Object.entries(inputs)) {
                    if (k.startsWith('ctx_')) {
                        const r = this.resolvePromptValue(v, prompt, wfMap, { visited: new Set(visited), wantSlot: effSlot });
                        if (this._looksLikePrompt(r)) return r;
                    }
                }
            }

            if (ct === 'WeiLinPromptUI' || ct === 'WeiLinPromptUIWithoutLora') {
                for (const k of ['temp_str', 'positive', 'negative']) {
                    const t = inputs[k];
                    if (typeof t === 'string' && t.trim()) return this.tokenJsonToText(t);
                }
            }

            if (ct === 'CLIPTextEncode') {
                if (inputs.text != null) {
                    return this.resolvePromptValue(inputs.text, prompt, wfMap, { visited });
                }
            }

            if (ct === 'easy promptConcat' || ct === 'PromptConcat') {
                const p1 = this.resolvePromptValue(inputs.prompt1 || inputs.a, prompt, wfMap, { visited: new Set(visited) });
                const p2 = this.resolvePromptValue(inputs.prompt2 || inputs.b, prompt, wfMap, { visited: new Set(visited) });
                const sep = inputs.separator || ', ';
                return [p1, p2].filter(v => v != null && v !== '').map(String).join(typeof sep === 'string' ? sep : ', ');
            }

            if (ct === 'easy ifElse') {
                for (const k of ['on_true', 'on_false', 'true', 'false']) {
                    if (inputs[k] != null) {
                        const r = this.resolvePromptValue(inputs[k], prompt, wfMap, { visited: new Set(visited) });
                        if (typeof r === 'string' && r.trim()) return r;
                    }
                }
            }

            if (ct === 'Any Switch (rgthree)') {
                for (const [k, v] of Object.entries(inputs)) {
                    if (k.startsWith('any_')) {
                        const r = this.resolvePromptValue(v, prompt, wfMap, { visited: new Set(visited) });
                        if (typeof r === 'string' && r.trim()) return r;
                        if (typeof r === 'number') return r;
                    }
                }
            }

            if (ct === 'easy cleanGpuUsed' && inputs.anything != null) {
                return this.resolvePromptValue(inputs.anything, prompt, wfMap, { visited });
            }

            if (ct === 'StringReplace' && inputs.replace != null) {
                const r = this.resolvePromptValue(inputs.replace, prompt, wfMap, { visited: new Set(visited) });
                if (typeof r === 'string' && r.trim()) return r;
            }

            if (ct.includes('PromptCleaning') && inputs.string != null) {
                return this.resolvePromptValue(inputs.string, prompt, wfMap, { visited });
            }

            if (ct.includes('TriggerWord') || ct.includes('LoraManager')) {
                const msg = inputs.orinalMessage || inputs.originalMessage;
                if (typeof msg === 'string' && msg.trim()) return this.tokenJsonToText(msg);
            }

            if (ct === 'ResolutionMasterSimplify') {
                if (effSlot === 0) return inputs.width;
                if (effSlot === 1) return inputs.height;
            }

            if (ct.includes('String') || ct === 'Text' || ct.includes('Primitive')) {
                for (const k of ['value', 'string', 'text']) {
                    if (typeof inputs[k] === 'string' && inputs[k].trim()) return this.tokenJsonToText(inputs[k]);
                }
            }

            for (const k of ['orinalMessage', 'originalMessage', 'text', 'string', 'value', 'positive', 'negative', 'temp_str', 'width', 'height', 'steps_total', 'cfg', 'sampler_name', 'scheduler']) {
                if (inputs[k] != null && !this.isNodeRef(inputs[k])) {
                    const v = inputs[k];
                    if (typeof v === 'string') return this.tokenJsonToText(v);
                    return v;
                }
            }

            const wv = this.getWidgetValue(wfMap, nodeId, effSlot);
            if (wv != null && wv !== '') return wv;

            for (const v of Object.values(inputs)) {
                if (this.isNodeRef(v)) {
                    const resolved = this.resolvePromptValue(v, prompt, wfMap, { visited: new Set(visited) });
                    if (resolved != null && resolved !== '' && !this.isNodeRef(resolved)) return resolved;
                }
            }

            return null;
        },

        coerceNumber(val) {
            if (typeof val === 'number' && Number.isFinite(val)) return val;
            if (typeof val === 'string' && val.trim() && !isNaN(Number(val))) return Number(val);
            return null;
        },

        _looksLikePrompt(val) {
            if (typeof val !== 'string') return false;
            const s = val.trim();
            if (s.length < 8) return false;
            if (/\.(safetensors|ckpt|pt)$/i.test(s)) return false;
            if (s.includes(',') || s.includes('\n') || s.split(/\s+/).length >= 3) return true;
            return s.length >= 20;
        },

        _samplerScore(data) {
            let score = 0;
            if (this._looksLikePrompt(data.positive)) score += 20;
            if (this._looksLikePrompt(data.negative)) score += 8;
            if (data.steps != null) score += 5;
            if (data.cfg != null) score += 3;
            if (data.sampler) score += 2;
            if (data.seed) score += 1;
            return score;
        },

        applyComfyLiteralFallback(prompt, result) {
            for (const node of Object.values(prompt)) {
                const ct = node.class_type || '';
                const inputs = node.inputs || {};

                if (ct === 'KSampler' || ct === 'KSampler (Efficient)' || ct === 'KSamplerAdvanced') {
                    if (!result.seed && inputs.seed != null && !this.isNodeRef(inputs.seed)) {
                        result.seed = String(inputs.seed);
                    }
                    if (result.steps == null && typeof inputs.steps === 'number') result.steps = inputs.steps;
                    if (result.cfg == null && typeof inputs.cfg === 'number') result.cfg = inputs.cfg;
                    if (!result.sampler && typeof inputs.sampler_name === 'string') result.sampler = inputs.sampler_name;
                    if (!result.scheduler && typeof inputs.scheduler === 'string') result.scheduler = inputs.scheduler;
                    if (result.denoise == null && typeof inputs.denoise === 'number') result.denoise = inputs.denoise;
                }

                if (ct === 'CheckpointLoaderSimple' && !result.model && typeof inputs.ckpt_name === 'string') {
                    result.model = inputs.ckpt_name;
                }

                if (ct === 'ResolutionMasterSimplify') {
                    if (!result.width && typeof inputs.width === 'number') result.width = inputs.width;
                    if (!result.height && typeof inputs.height === 'number') result.height = inputs.height;
                }

                if (ct === 'EmptyLatentImage') {
                    if (!result.width && typeof inputs.width === 'number') result.width = inputs.width;
                    if (!result.height && typeof inputs.height === 'number') result.height = inputs.height;
                }

                if (ct === 'PromptSelector' && typeof inputs.selected_prompts === 'string') {
                    const extra = inputs.selected_prompts.trim();
                    if (extra) {
                        if (!result.positive) result.positive = extra;
                        else if (!result.positive.includes(extra.slice(0, 32))) {
                            result.positive = `${result.positive}, ${extra}`;
                        }
                    }
                }

                if (ct === 'WeiLinPromptUI' || ct === 'WeiLinPromptUIWithoutLora') {
                    for (const k of ['positive', 'negative', 'temp_str']) {
                        const raw = inputs[k];
                        if (typeof raw !== 'string' || !raw.trim()) continue;
                        const t = this.tokenJsonToText(raw).trim();
                        if (/bad quality|worst quality|anatomical nonsense|bad_hands/i.test(t)) {
                            if (!result.negative) result.negative = t;
                        } else if (!result.positive || t.length > result.positive.length) {
                            result.positive = t;
                        }
                    }
                }
            }
        },

        UNIVERSAL_SAMPLER_FIELDS: {
            seed: ['seed', 'noise_seed', 'rand_seed', 'random_seed'],
            steps: ['steps', 'steps_total', 'step', 'sample_steps'],
            cfg: ['cfg', 'cfg_scale', 'guidance', 'guidance_scale'],
            sampler: ['sampler_name', 'sampler'],
            scheduler: ['scheduler', 'scheduler_name', 'schedule_type'],
            denoise: ['denoise', 'denoising_strength', 'strength'],
        },

        UNIVERSAL_MODEL_KEYS: [
            'ckpt_name', 'unet_name', 'model_name', 'checkpoint_name',
            'ckpt', 'model', 'model_path', 'diffusion_model', 'checkpoint',
        ],

        UNIVERSAL_POSITIVE_KEYS: [
            'positive', 'prompt', 'text', 'string', 'value', 'selected_prompts',
            'temp_str', 'positive_prompt', 'prompt_positive', 'orinalMessage', 'originalMessage',
        ],

        UNIVERSAL_NEGATIVE_KEYS: [
            'negative', 'negative_prompt', 'prompt_negative', 'uc', 'bad_prompt',
        ],

        _isSamplerLikeNode(ct) {
            if (!ct || typeof ct !== 'string') return false;
            if (/^KSampler/i.test(ct)) return true;
            if (/Sampler/i.test(ct) && !/Config|Select|Create|Preview|Cycle|Schedule|Switch|Input/i.test(ct)) {
                return true;
            }
            return false;
        },

        _isNegativePromptText(text, key = '') {
            if (/negative|neg_prompt|bad_prompt|\buc\b/i.test(key)) return true;
            return /bad quality|worst quality|low quality|bad_hands|bad_anatomy|anatomical nonsense|jpeg artifacts/i.test(text);
        },

        _looksLikeModelName(val) {
            if (typeof val !== 'string') return false;
            const s = val.trim();
            return /\.(safetensors|ckpt|pt|gguf|sft)$/i.test(s) || /^[\w.-]+\/[\w.-]+\.(safetensors|ckpt)$/i.test(s);
        },

        _promptCandidateScore(text, key, classType) {
            if (!this._looksLikePrompt(text)) return -1;
            if (this._looksLikeModelName(text)) return -1;
            if (/<lora:/i.test(text) && this.countLoraTags(text) > 20) return -1;

            let score = Math.min(text.length, 5000);
            if (this.UNIVERSAL_POSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) score += 800;
            if (this.UNIVERSAL_NEGATIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) score -= 900;
            if (classType === 'CLIPTextEncode') score += 400;
            if (/PromptSelector|WeiLin|CLIP|Text|Prompt/i.test(classType || '')) score += 250;
            if (this._isNegativePromptText(text, key)) score -= 1200;
            if (/^[\d\s.,:;+-]+$/.test(text)) score -= 500;
            return score;
        },

        _collectUniversalStrings(prompt, wfMap) {
            const items = [];
            const seenText = new Set();

            const addString = (text, key, nodeId, classType) => {
                const normalized = this.tokenJsonToText(text).trim();
                if (normalized.length < 8) return;
                if (this._looksLikeModelName(normalized)) return;
                const sig = normalized.slice(0, 120);
                if (seenText.has(sig)) return;
                seenText.add(sig);
                items.push({ text: normalized, key, nodeId, classType });
            };

            const walk = (nodeId, val, key, classType, depth = 0) => {
                if (val == null || depth > 10) return;
                if (key === 'loras' || key.startsWith('__')) return;

                if (typeof val === 'string') {
                    addString(val, key, nodeId, classType);
                    return;
                }

                if (this.isNodeRef(val)) {
                    const resolved = this.resolvePromptValue(val, prompt, wfMap, { visited: new Set() });
                    if (typeof resolved === 'string') addString(resolved, key, nodeId, classType);
                    return;
                }

                if (Array.isArray(val)) return;

                if (typeof val === 'object') {
                    for (const [k, v] of Object.entries(val)) walk(nodeId, v, k, classType, depth + 1);
                }
            };

            for (const [nodeId, node] of Object.entries(prompt)) {
                walk(nodeId, node.inputs || {}, '', node.class_type || '', 0);
            }

            if (wfMap) {
                for (const wfNode of Object.values(wfMap)) {
                    const wv = wfNode?.widgets_values;
                    if (!Array.isArray(wv)) continue;
                    wv.forEach((v, idx) => {
                        if (typeof v === 'string') addString(v, `widget_${idx}`, String(wfNode.id), wfNode.type || '');
                    });
                }
            }

            return items;
        },

        _extractUniversalSampler(prompt, wfMap) {
            const candidates = [];

            for (const [nodeId, node] of Object.entries(prompt)) {
                const inputs = node.inputs || {};
                const candidate = { nodeId, classType: node.class_type || '' };
                let hits = 0;

                for (const [field, aliases] of Object.entries(this.UNIVERSAL_SAMPLER_FIELDS)) {
                    for (const alias of aliases) {
                        if (inputs[alias] == null) continue;
                        const raw = inputs[alias];
                        const val = this.isNodeRef(raw)
                            ? this.resolvePromptValue(raw, prompt, wfMap)
                            : raw;
                        if (val == null || val === '' || this.isNodeRef(val)) continue;
                        if (field === 'seed') candidate.seed = String(val);
                        else if (field === 'steps') candidate.steps = this.coerceNumber(val);
                        else if (field === 'cfg') candidate.cfg = this.coerceNumber(val);
                        else if (field === 'sampler' && typeof val === 'string') candidate.sampler = val.trim();
                        else if (field === 'scheduler' && typeof val === 'string') candidate.scheduler = val.trim();
                        else if (field === 'denoise') candidate.denoise = this.coerceNumber(val);
                        hits++;
                        break;
                    }
                }

                if (hits > 0 || this._isSamplerLikeNode(candidate.classType)) {
                    candidates.push(candidate);
                }
            }

            candidates.sort((a, b) => this._samplerScore(b) - this._samplerScore(a));
            return candidates[0] || null;
        },

        _extractUniversalModel(prompt) {
            const models = [];
            for (const node of Object.values(prompt)) {
                const inputs = node.inputs || {};
                for (const key of this.UNIVERSAL_MODEL_KEYS) {
                    const val = inputs[key];
                    if (typeof val === 'string' && val.trim()) models.push(val.trim());
                }
                for (const val of Object.values(inputs)) {
                    if (typeof val === 'string' && this._looksLikeModelName(val)) models.push(val.trim());
                }
            }
            if (!models.length) return null;
            return models.find(m => !/branch|refiner|vae|lora/i.test(m)) || models[0];
        },

        _extractUniversalSize(prompt, wfMap) {
            let width = null;
            let height = null;

            for (const node of Object.values(prompt)) {
                const inputs = node.inputs || {};
                const w = this.coerceNumber(this.resolvePromptValue(inputs.width ?? inputs.image_width ?? inputs.w, prompt, wfMap));
                const h = this.coerceNumber(this.resolvePromptValue(inputs.height ?? inputs.image_height ?? inputs.h, prompt, wfMap));
                if (w && h && w >= 64 && h >= 64 && w <= 8192 && h <= 8192) {
                    width = w;
                    height = h;
                }
            }

            return width && height ? { width, height } : null;
        },

        applyUniversalComfyInference(prompt, wfMap, result) {
            let touched = false;

            const strings = this._collectUniversalStrings(prompt, wfMap);
            const posCands = [];
            const negCands = [];

            for (const item of strings) {
                const score = this._promptCandidateScore(item.text, item.key, item.classType);
                if (score < 0) continue;
                if (this._isNegativePromptText(item.text, item.key)) {
                    negCands.push({ text: item.text, score: score + item.text.length });
                } else {
                    posCands.push({ text: item.text, score });
                }
            }

            posCands.sort((a, b) => b.score - a.score);
            negCands.sort((a, b) => b.score - a.score);

            if (posCands[0] && (!result.positive || result.positive.length < posCands[0].text.length * 0.75)) {
                result.positive = posCands[0].text;
                touched = true;
            }
            if (negCands[0] && (!result.negative || result.negative.length < negCands[0].text.length * 0.75)) {
                result.negative = negCands[0].text;
                touched = true;
            }

            const sampler = this._extractUniversalSampler(prompt, wfMap);
            if (sampler) {
                if (!result.seed && sampler.seed) { result.seed = sampler.seed; touched = true; }
                if (result.steps == null && sampler.steps != null) { result.steps = sampler.steps; touched = true; }
                if (result.cfg == null && sampler.cfg != null) { result.cfg = sampler.cfg; touched = true; }
                if (!result.sampler && sampler.sampler) { result.sampler = sampler.sampler; touched = true; }
                if (!result.scheduler && sampler.scheduler) { result.scheduler = sampler.scheduler; touched = true; }
                if (result.denoise == null && sampler.denoise != null) { result.denoise = sampler.denoise; touched = true; }
                if (!result.positive && sampler.positive) { result.positive = sampler.positive; touched = true; }
                if (!result.negative && sampler.negative) { result.negative = sampler.negative; touched = true; }
            }

            if (!result.model) {
                const model = this._extractUniversalModel(prompt);
                if (model) { result.model = model; touched = true; }
            }

            if (!result.width || !result.height) {
                const size = this._extractUniversalSize(prompt, wfMap);
                if (size) {
                    if (!result.width) result.width = size.width;
                    if (!result.height) result.height = size.height;
                    touched = true;
                }
            }

            if (result.positive && result.negative && result.positive === result.negative) {
                result.negative = '';
            }

            if (touched) result.universalParse = true;
            return touched;
        },

        parseComfyUI(promptStr, workflowStr) {
            const result = { source: 'ComfyUI · 通用解析' };
            try {
                const prompt = this.parseComfyJson(promptStr);
                if (!prompt) return { source: 'ComfyUI', noData: true };
                const wfMap = this.buildWorkflowMap(workflowStr);
                result.comfyPrompt = prompt;

                if (workflowStr) {
                    const wf = this.parseComfyJson(workflowStr);
                    if (wf) {
                        result.comfyWorkflow = wf;
                        result.workflowNodeCount = wf.nodes?.length || 0;
                    }
                }

                const samplerNodes = [];
                const textCandidates = [];

                for (const [nodeId, node] of Object.entries(prompt)) {
                    const ct = node.class_type;
                    const inputs = node.inputs || {};

                    if (ct === 'WeiLinPromptUI' || ct === 'WeiLinPromptUIWithoutLora') {
                        for (const [k, kind] of [['temp_str', 'pos'], ['positive', 'pos'], ['negative', 'neg']]) {
                            const t = inputs[k];
                            if (typeof t === 'string' && t.trim()) {
                                const text = this.tokenJsonToText(t);
                                const isNeg = kind === 'neg' || /bad quality|worst quality|anatomical nonsense|bad_hands/i.test(text);
                                textCandidates.push({ text, kind: isNeg ? 'neg' : 'pos', len: text.length });
                            }
                        }
                    }

                    if (ct === 'PromptSelector' && typeof inputs.selected_prompts === 'string' && inputs.selected_prompts.trim()) {
                        const text = inputs.selected_prompts.trim();
                        textCandidates.push({ text, kind: 'pos', len: text.length });
                    }

                    if (ct === 'CLIPTextEncode' && typeof inputs.text === 'string' && inputs.text.trim()) {
                        textCandidates.push({ text: this.tokenJsonToText(inputs.text), kind: 'clip', len: inputs.text.length });
                    }

                    if (ct.includes('TriggerWord') || ct.includes('LoraManager')) {
                        const msg = inputs.orinalMessage || inputs.originalMessage;
                        if (typeof msg === 'string' && msg.trim()) {
                            textCandidates.push({ text: this.tokenJsonToText(msg), kind: 'pos', len: msg.length });
                        }
                    }

                    if (ct === 'KSampler' || ct === 'KSampler (Efficient)' || ct === 'KSamplerAdvanced' || this._isSamplerLikeNode(ct)) {
                        samplerNodes.push({ nodeId, node });
                    }

                    if (ct === 'EmptyLatentImage') {
                        const w = this.coerceNumber(this.resolvePromptValue(inputs.width, prompt, wfMap));
                        const h = this.coerceNumber(this.resolvePromptValue(inputs.height, prompt, wfMap));
                        if (w) result.width = w;
                        if (h) result.height = h;
                    }
                }

                samplerNodes.sort((a, b) => {
                    const na = parseInt(String(a.nodeId).split(':').pop(), 10) || 0;
                    const nb = parseInt(String(b.nodeId).split(':').pop(), 10) || 0;
                    return nb - na;
                });

                let bestSampler = null;
                let bestScore = -1;

                for (const { node } of samplerNodes) {
                    const inputs = node.inputs || {};
                    const candidate = {};

                    const seedVal = this.resolvePromptValue(inputs.seed ?? inputs.noise_seed, prompt, wfMap);
                    if (seedVal != null && !this.isNodeRef(seedVal)) candidate.seed = String(seedVal);

                    candidate.steps = this.coerceNumber(this.resolvePromptValue(inputs.steps, prompt, wfMap));
                    candidate.cfg = this.coerceNumber(this.resolvePromptValue(inputs.cfg, prompt, wfMap));
                    const sampler = this.resolvePromptValue(inputs.sampler_name, prompt, wfMap);
                    const scheduler = this.resolvePromptValue(inputs.scheduler, prompt, wfMap);
                    candidate.denoise = this.coerceNumber(this.resolvePromptValue(inputs.denoise, prompt, wfMap));

                    if (typeof sampler === 'string' && sampler.trim() && !this.isNodeRef(sampler)) candidate.sampler = sampler.trim();
                    if (typeof scheduler === 'string' && scheduler.trim() && !this.isNodeRef(scheduler)) candidate.scheduler = scheduler.trim();

                    const pos = this.resolvePromptValue(inputs.positive, prompt, wfMap);
                    const neg = this.resolvePromptValue(inputs.negative, prompt, wfMap);
                    if (this._looksLikePrompt(pos)) candidate.positive = pos.trim();
                    if (this._looksLikePrompt(neg)) candidate.negative = neg.trim();

                    const score = this._samplerScore(candidate);
                    if (score > bestScore) {
                        bestScore = score;
                        bestSampler = candidate;
                    }
                }

                if (bestSampler) {
                    if (bestSampler.seed) result.seed = bestSampler.seed;
                    if (bestSampler.steps != null) result.steps = bestSampler.steps;
                    if (bestSampler.cfg != null) result.cfg = bestSampler.cfg;
                    if (bestSampler.sampler) result.sampler = bestSampler.sampler;
                    if (bestSampler.scheduler) result.scheduler = bestSampler.scheduler;
                    if (bestSampler.denoise != null) result.denoise = bestSampler.denoise;
                    if (bestSampler.positive) result.positive = bestSampler.positive;
                    if (bestSampler.negative) result.negative = bestSampler.negative;
                }

                if (!result.positive && textCandidates.length) {
                    const posCands = textCandidates.filter(t => this._looksLikePrompt(t.text));
                    posCands.sort((a, b) => b.len - a.len);
                    if (posCands[0]) result.positive = posCands[0].text;
                }
                if (!result.negative && textCandidates.length) {
                    const negCands = textCandidates.filter(t => t.kind === 'neg' && this._looksLikePrompt(t.text));
                    negCands.sort((a, b) => b.len - a.len);
                    if (negCands[0]) result.negative = negCands[0].text;
                }

                if (result.positive && result.negative && result.positive === result.negative) {
                    result.negative = '';
                }
                if (!result.negative && textCandidates.length) {
                    const badQuality = textCandidates.filter(t =>
                        /bad quality|worst quality|low quality/i.test(t.text)
                    );
                    badQuality.sort((a, b) => b.len - a.len);
                    if (badQuality[0]) result.negative = badQuality[0].text;
                }

                if (!result.model) {
                    const checkpoints = [];
                    for (const node of Object.values(prompt)) {
                        const ct = node.class_type;
                        if (ct === 'CheckpointLoaderSimple' || ct === 'UNETLoader') {
                            const m = node.inputs?.ckpt_name || node.inputs?.unet_name;
                            if (typeof m === 'string' && m) checkpoints.push(m);
                        }
                    }
                    if (checkpoints.length) {
                        result.model = checkpoints.find(m => !/branch/i.test(m)) || checkpoints[0];
                    }
                }

                this.applyComfyLiteralFallback(prompt, result);
                this.applyUniversalComfyInference(prompt, wfMap, result);

                result.loras = this.extractUsedComfyLoras(prompt, wfMap);
                result.lorasLibrary = this.extractLibraryComfyLoras(prompt, wfMap);
            } catch {}
            if (!result.positive && !result.seed && !result.model && !result.loras?.length) {
                result.source = 'ComfyUI';
            }
            return result;
        },

        parseNovelAI(input) {
            const result = { source: 'NovelAI' };
            let commentObj = null;
            let description = '';

            const takeComment = (c) => {
                if (!c) return;
                if (typeof c === 'object') {
                    commentObj = c;
                    return;
                }
                if (typeof c === 'string') {
                    try { commentObj = JSON.parse(c); } catch { /* ignore */ }
                }
            };

            if (input && typeof input === 'object') {
                if (typeof input.Description === 'string') description = input.Description;
                if (input.Comment !== undefined) takeComment(input.Comment);
                else if (input.prompt !== undefined || input.uc !== undefined || input.steps !== undefined) {
                    commentObj = input;
                }
                if (typeof input.Source === 'string' && input.Source.trim()) {
                    result.model = input.Source.trim();
                }
            } else if (typeof input === 'string') {
                try {
                    const data = JSON.parse(input);
                    if (data && typeof data === 'object') {
                        if (data.Description || data.Comment || data.Software === 'NovelAI') {
                            return this.parseNovelAI(data);
                        }
                        commentObj = data;
                    }
                } catch {
                    description = input;
                }
            }

            if (commentObj) {
                result.positive = commentObj.prompt || description || '';
                result.negative = commentObj.uc || '';
                if (commentObj.steps) result.steps = commentObj.steps;
                if (commentObj.scale != null) result.cfg = commentObj.scale;
                if (commentObj.seed != null) result.seed = String(commentObj.seed);
                if (commentObj.sampler) result.sampler = commentObj.sampler;
                if (commentObj.width) result.width = commentObj.width;
                if (commentObj.height) result.height = commentObj.height;
                if (commentObj.noise_schedule) result.scheduler = commentObj.noise_schedule;
                if (commentObj.sm !== undefined) result.smea = commentObj.sm;
                if (commentObj.sm_dyn !== undefined) result.smeaDyn = commentObj.sm_dyn;
                if (commentObj.strength != null) result.denoise = commentObj.strength;
            } else {
                result.positive = description || '';
            }
            return result;
        },

        parseNovelAIFromTexts(texts) {
            if (!texts) return null;
            const payload = {
                Description: texts.Description || '',
                Comment: texts.Comment,
                Source: texts.Source,
                Software: texts.Software,
            };
            if (texts.UserComment && !payload.Comment) payload.Comment = texts.UserComment;
            const result = this.parseNovelAI(payload);
            if (!result.positive && !result.negative && !result.seed && !result.steps) return null;
            return result;
        },

        parseInvokeAI(text) {
            const result = { source: 'InvokeAI' };
            try {
                const data = JSON.parse(text);
                result.positive = data.positive_prompt || data.prompt || '';
                result.negative = data.negative_prompt || '';
                if (data.steps) result.steps = data.steps;
                if (data.cfg_scale) result.cfg = data.cfg_scale;
                if (data.seed) result.seed = String(data.seed);
                if (data.scheduler) result.sampler = data.scheduler;
                if (data.width) result.width = data.width;
                if (data.height) result.height = data.height;
                if (data.model?.model_name) result.model = data.model.model_name;
                if (data.strength) result.denoise = data.strength;
            } catch {
                result.positive = text;
            }
            return result;
        },

        parseSwarmUI(text) {
            const result = { source: 'SwarmUI' };
            try {
                const data = JSON.parse(text);
                result.positive = data.prompt || '';
                result.negative = data.negativeprompt || data.negative_prompt || '';
                if (data.steps) result.steps = data.steps;
                if (data.cfgscale) result.cfg = data.cfgscale;
                if (data.seed) result.seed = String(data.seed);
                if (data.sampler) result.sampler = data.sampler;
                if (data.width) result.width = data.width;
                if (data.height) result.height = data.height;
                if (data.model) result.model = data.model;
                if (data.scheduler) result.scheduler = data.scheduler;
            } catch {
                result.positive = text;
            }
            return result;
        },

        _detectFormat(buffer) {
            const view = new DataView(buffer);
            const b0 = view.getUint32(0);
            if (b0 === 0x89504E47) return 'png';
            if (b0 === 0x52494646 && view.getUint32(8) === 0x57454250) return 'webp';
            if (view.getUint16(0) === 0xFFD8) return 'jpeg';
            return null;
        },

        async parseFile(file) {
            const buffer = await file.arrayBuffer();
            let texts = null;

            const format = this._detectFormat(buffer);
            if (format === 'png') {
                texts = await this.parsePNG(buffer);
            } else if (format === 'webp') {
                texts = this.parseWebP(buffer);
            } else if (format === 'jpeg') {
                texts = this.parseJPEG(buffer);
            } else if (file.type === 'image/png') {
                texts = await this.parsePNG(buffer);
            } else if (file.type === 'image/webp') {
                texts = this.parseWebP(buffer);
            } else {
                texts = this.parseJPEG(buffer);
            }

            const tryStealth = async () => {
                if (format === 'jpeg') return null;
                const stealth = await this.extractStealthMetadata(
                    new Blob([buffer], { type: file.type || (format === 'webp' ? 'image/webp' : 'image/png') })
                );
                return this._stealthToResult(stealth);
            };

            if (!texts) {
                const stealthResult = await tryStealth();
                if (stealthResult) return stealthResult;
                return { source: '未检测到元数据', noData: true };
            }

            // ComfyUI: has "prompt" key with JSON
            if (texts.prompt) {
                if (this.parseComfyJson(texts.prompt)) {
                    return this.parseComfyUI(texts.prompt, texts.workflow);
                }
            }

            // A1111/Forge: has "parameters" key
            if (texts.parameters) {
                return this.parseA1111(texts.parameters);
            }

            // InvokeAI: has "invokeai_metadata" key
            if (texts.invokeai_metadata) {
                return this.parseInvokeAI(texts.invokeai_metadata);
            }
            if (texts['sd-metadata']) {
                return this.parseInvokeAI(texts['sd-metadata']);
            }

            // SwarmUI: has "sui_image_params" key
            if (texts.sui_image_params) {
                return this.parseSwarmUI(texts.sui_image_params);
            }

            // NovelAI: Comment / Description / Software，并在缺字段时回退 alpha 隐写
            const looksNai = !!(texts.Comment || texts.Description ||
                (texts.Software && String(texts.Software).includes('NovelAI')));
            if (looksNai) {
                let nai = this.parseNovelAIFromTexts(texts);
                const needStealth = !nai || !nai.positive || (nai.seed == null && nai.steps == null);
                if (needStealth) {
                    const stealthResult = await tryStealth();
                    if (stealthResult && !stealthResult.noData) {
                        if (!nai) return stealthResult;
                        if (!nai.positive && stealthResult.positive) nai.positive = stealthResult.positive;
                        if (!nai.negative && stealthResult.negative) nai.negative = stealthResult.negative;
                        if (nai.seed == null && stealthResult.seed != null) nai.seed = stealthResult.seed;
                        if (nai.steps == null && stealthResult.steps != null) nai.steps = stealthResult.steps;
                        if (nai.cfg == null && stealthResult.cfg != null) nai.cfg = stealthResult.cfg;
                        if (!nai.sampler && stealthResult.sampler) nai.sampler = stealthResult.sampler;
                        if (!nai.width && stealthResult.width) nai.width = stealthResult.width;
                        if (!nai.height && stealthResult.height) nai.height = stealthResult.height;
                        if (stealthResult.stealth) nai.stealth = stealthResult.stealth;
                    }
                }
                if (nai) return nai;
            }

            // UserComment fallback
            if (texts.UserComment) {
                try {
                    const parsed = JSON.parse(texts.UserComment);
                    if (parsed.prompt || parsed.uc) return this.parseNovelAI(texts.UserComment);
                } catch {}
                if (texts.UserComment.includes('Steps:')) return this.parseA1111(texts.UserComment);
            }

            // Unknown format: try stealth before giving up
            const stealthResult = await tryStealth();
            if (stealthResult) return stealthResult;

            const firstVal = Object.values(texts)[0] || '';
            if (firstVal.includes('Steps:') || firstVal.includes('Negative prompt:')) {
                return this.parseA1111(firstVal);
            }

            return { source: '未知格式', positive: firstVal, raw: texts };
        }
    };

    function civitaiSearchUrl(name, modelType = 'LORA') {
        const q = String(name || '')
            .replace(/\.(safetensors|ckpt|pt)$/i, '')
            .replace(/_/g, ' ')
            .trim();
        return `https://civitai.com/search/models?modelType=${modelType}&query=${encodeURIComponent(q)}`;
    }

    function downloadJsonFile(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function renderMetaLoraRows(container, loras, usedKeys, showingAll) {
        container.innerHTML = '';
        loras.forEach((lora, idx) => {
            const key = (lora.fullName || lora.name).toLowerCase();
            const row = document.createElement('div');
            row.className = 'meta-field meta-field-lora-item';
            if (showingAll && !usedKeys.has(key)) row.classList.add('meta-field-lora-inactive');

            const lbl = document.createElement('span');
            lbl.className = 'meta-field-label';
            lbl.textContent = `#${idx + 1}`;

            const val = document.createElement('span');
            val.className = 'meta-field-value';
            let label = `${lora.name} (${lora.weight})`;
            if (showingAll && usedKeys.has(key)) label += ' · 使用中';
            val.textContent = label;
            val.title = lora.fullName || lora.name;

            const link = document.createElement('a');
            link.className = 'meta-civitai-link';
            link.href = civitaiSearchUrl(lora.fullName || lora.name, 'LORA');
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'C站下载';
            link.title = `在 Civitai 搜索 ${lora.name}`;

            row.append(lbl, val, link);
            container.appendChild(row);
        });
    }

    function setupMetaImport() {
        const btn = document.getElementById('btn-import-meta');
        const inp = document.getElementById('inp-import-meta');
        const modal = document.getElementById('modal-meta');
        if (!btn || !inp || !modal) return;

        let parsedData = null;
        let previewUrl = null;
        let sourceFileName = 'image';

        btn.addEventListener('click', () => {
            inp.value = '';
            inp.click();
        });

        inp.addEventListener('change', async () => {
            const file = inp.files[0];
            if (!file) return;
            sourceFileName = file.name.replace(/\.[^.]+$/, '') || 'image';

            const buffer = await file.arrayBuffer();
            const blob = new Blob([buffer], { type: file.type });
            const parseFile = new File([blob], file.name, { type: file.type });
            inp.value = '';

            parsedData = await MetaParser.parseFile(parseFile);
            previewUrl = URL.createObjectURL(file);

            const img = document.getElementById('meta-preview-img');
            img.src = previewUrl;

            const source = document.getElementById('meta-source');
            source.textContent = parsedData.noData
                ? '⚠️ 该图片未检测到生成参数元数据'
                : `来源: ${parsedData.source || '未知'}${parsedData.stealth ? ` (${parsedData.stealth})` : ''}`;
            source.className = 'meta-source' + (parsedData.noData ? ' meta-no-data' : '');

            const fields = document.getElementById('meta-fields');
            const downloads = document.getElementById('meta-downloads');
            fields.innerHTML = '';
            if (downloads) downloads.innerHTML = '';

            if (!parsedData.noData) {
                const rows = [
                    ['正面提示词', parsedData.positive, 'positive'],
                    ['负面提示词', parsedData.negative, 'negative'],
                    ['模型', parsedData.model, 'model', 'Checkpoint'],
                    ['采样器', parsedData.sampler, 'sampler'],
                    ['调度器', parsedData.scheduler, 'scheduler'],
                    ['步数', parsedData.steps, 'steps'],
                    ['CFG', parsedData.cfg, 'cfg'],
                    ['种子', parsedData.seed, 'seed'],
                    ['尺寸', parsedData.width && parsedData.height ? `${parsedData.width}×${parsedData.height}` : null, 'size'],
                    ['重绘强度', parsedData.denoise, 'denoise'],
                    ['Clip Skip', parsedData.clipSkip, 'clipSkip'],
                    ['工作流', parsedData.comfyPrompt
                        ? `${Object.keys(parsedData.comfyPrompt).length} 个执行节点` +
                          (parsedData.workflowNodeCount ? ` / UI ${parsedData.workflowNodeCount} 节点` : '')
                        : null, 'workflow'],
                    ['Refiner', parsedData.refinerModel, 'refiner'],
                    ['Refiner 切换', parsedData.refinerSwitch, 'refinerSwitch'],
                    ['ADetailer 模型', parsedData.adetailerModel, 'adetailer'],
                    ['ADetailer 提示词', parsedData.adetailerPrompt, 'adetailerPrompt'],
                    ['Hires 放大器', parsedData.hiresUpscaler, 'hiresUpscaler'],
                    ['Hires 步数', parsedData.hiresSteps, 'hiresSteps'],
                    ['Hires 缩放', parsedData.hiresScale, 'hiresScale'],
                    ['SMEA', parsedData.smea !== undefined ? (parsedData.smea ? '开' : '关') : null, 'smea'],
                    ['SMEA Dyn', parsedData.smeaDyn !== undefined ? (parsedData.smeaDyn ? '开' : '关') : null, 'smeaDyn'],
                ];
                rows.forEach(([label, value, key, civitaiType]) => {
                    if (value == null || value === '') return;
                    const row = document.createElement('div');
                    row.className = 'meta-field';
                    const lbl = document.createElement('span');
                    lbl.className = 'meta-field-label';
                    lbl.textContent = label;
                    const val = document.createElement('span');
                    val.className = 'meta-field-value';
                    const text = String(value);
                    val.textContent = text.length > 200 ? text.substring(0, 200) + '...' : text;
                    val.title = text;
                    row.append(lbl, val);
                    if (key === 'model' && parsedData.model) {
                        const link = document.createElement('a');
                        link.className = 'meta-civitai-link';
                        link.href = civitaiSearchUrl(parsedData.model, civitaiType || 'Checkpoint');
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.textContent = 'C站';
                        link.title = '在 Civitai 搜索此模型';
                        row.appendChild(link);
                    }
                    fields.appendChild(row);
                });

                const usedLoras = parsedData.loras || [];
                const libraryLoras = parsedData.lorasLibrary || [];
                const usedKeys = new Set(usedLoras.map(l => (l.fullName || l.name).toLowerCase()));
                const hasLibraryExtra = libraryLoras.some(l => !usedKeys.has((l.fullName || l.name).toLowerCase()));

                if (usedLoras.length || libraryLoras.length) {
                    let showingAll = false;
                    const loraHeader = document.createElement('div');
                    loraHeader.className = 'meta-field meta-field-lora-header';
                    const loraListHost = document.createElement('div');
                    loraListHost.className = 'meta-lora-list';

                    const syncLoraView = () => {
                        const list = showingAll ? libraryLoras : usedLoras;
                        const title = showingAll ? 'LoRA 库（作者全部）' : 'LoRA（当前图使用）';
                        loraHeader.innerHTML = `<span class="meta-field-label">${title}</span><span class="meta-field-value">共 ${list.length} 个</span>`;
                        renderMetaLoraRows(loraListHost, list, usedKeys, showingAll);
                    };

                    syncLoraView();
                    fields.appendChild(loraHeader);
                    fields.appendChild(loraListHost);

                    if (libraryLoras.length > 0 && hasLibraryExtra) {
                        const toggleBtn = document.createElement('button');
                        toggleBtn.type = 'button';
                        toggleBtn.className = 'btn-secondary btn-meta-lora-toggle';
                        toggleBtn.textContent = `查看该作者所有 LoRA (${libraryLoras.length})`;
                        toggleBtn.addEventListener('click', () => {
                            showingAll = !showingAll;
                            toggleBtn.textContent = showingAll
                                ? `仅看当前图使用的 LoRA (${usedLoras.length})`
                                : `查看该作者所有 LoRA (${libraryLoras.length})`;
                            syncLoraView();
                        });
                        fields.appendChild(toggleBtn);
                    }
                }

                if (downloads && (parsedData.comfyWorkflow || parsedData.comfyPrompt)) {
                    const hasUiWorkflow = parsedData.comfyWorkflow?.nodes?.length > 0;

                    if (hasUiWorkflow) {
                        const wfBtn = document.createElement('button');
                        wfBtn.type = 'button';
                        wfBtn.className = 'btn-secondary btn-meta-dl';
                        wfBtn.textContent = '⬇ 下载 ComfyUI 工作流';
                        wfBtn.title = 'UI 格式，可在 ComfyUI 官方界面「加载」或拖入画布';
                        wfBtn.addEventListener('click', () => {
                            downloadJsonFile(`${sourceFileName}-comfyui-workflow.json`, parsedData.comfyWorkflow);
                            showToast('已下载 UI 工作流，可在 ComfyUI 加载或拖入导入');
                        });
                        downloads.appendChild(wfBtn);
                    }

                    if (parsedData.comfyPrompt) {
                        const apiBtn = document.createElement('button');
                        apiBtn.type = 'button';
                        apiBtn.className = 'btn-secondary btn-meta-dl';
                        apiBtn.textContent = '⬇ 下载 API Prompt';
                        apiBtn.title = '仅供 /prompt 接口调用，ComfyUI 界面无法直接打开';
                        apiBtn.addEventListener('click', () => {
                            downloadJsonFile(`${sourceFileName}-comfyui-api.json`, parsedData.comfyPrompt);
                            showToast('已下载 API Prompt（接口用，不能拖进 ComfyUI 界面）');
                        });
                        downloads.appendChild(apiBtn);
                    }

                    const hint = document.createElement('p');
                    hint.className = 'meta-hint';
                    hint.textContent = hasUiWorkflow
                        ? '导入 ComfyUI 请用「ComfyUI 工作流」，或直接拖原始 PNG 到 ComfyUI 画布。之前的 { prompt, workflow } 合并包界面打不开。'
                        : '该图未嵌入 UI 布局，只有 API Prompt；请直接拖原始 PNG 到 ComfyUI，或用 API 提交。';
                    downloads.appendChild(hint);
                }
            }

            const rawToggle = document.getElementById('meta-raw-toggle');
            const rawContent = document.getElementById('meta-raw-content');
            const rawSection = document.getElementById('meta-raw');
            rawContent.classList.add('hidden');
            rawToggle.textContent = '▶ 原始数据';
            if (parsedData.raw || parsedData.comfyPrompt || parsedData.comfyWorkflow) {
                rawSection.classList.remove('hidden');
                const rawPayload = parsedData.comfyPrompt || parsedData.comfyWorkflow
                    ? {
                        prompt: parsedData.comfyPrompt || null,
                        workflow: parsedData.comfyWorkflow || null,
                    }
                    : (parsedData.raw || parsedData);
                rawContent.textContent = JSON.stringify(rawPayload, null, 2);
            } else {
                rawSection.classList.add('hidden');
            }

            modal.classList.remove('hidden');
        });

        document.getElementById('meta-raw-toggle').addEventListener('click', () => {
            const content = document.getElementById('meta-raw-content');
            const toggle = document.getElementById('meta-raw-toggle');
            const isHidden = content.classList.toggle('hidden');
            toggle.textContent = isHidden ? '▶ 原始数据' : '▼ 原始数据';
        });

        document.getElementById('btn-meta-apply').addEventListener('click', () => {
            if (!parsedData || parsedData.noData) { modal.classList.add('hidden'); return; }

            if (parsedData.positive) {
                dom.txtPositive.value = parsedData.positive;
                dom.txtPositive.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (parsedData.negative) {
                dom.txtNegative.value = parsedData.negative;
                dom.txtNegative.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (parsedData.seed) {
                const seedVal = String(parsedData.seed).split(',')[0].trim();
                if (/^\d+$/.test(seedVal)) dom.inpSeed.value = seedVal;
            }
            if (parsedData.steps && Number.isFinite(parsedData.steps)) dom.inpSteps.value = parsedData.steps;
            if (parsedData.cfg && Number.isFinite(parsedData.cfg)) dom.inpCfg.value = parsedData.cfg;
            if (parsedData.width && Number.isFinite(parsedData.width)) dom.inpWidth.value = parsedData.width;
            if (parsedData.height && Number.isFinite(parsedData.height)) dom.inpHeight.value = parsedData.height;
            if (parsedData.sampler) {
                const opt = [...dom.selSampler.options].find(o => o.value.toLowerCase() === parsedData.sampler.toLowerCase());
                if (opt) dom.selSampler.value = opt.value;
            }
            if (parsedData.scheduler) {
                const opt = [...dom.selScheduler.options].find(o => o.value.toLowerCase() === parsedData.scheduler.toLowerCase());
                if (opt) dom.selScheduler.value = opt.value;
            }

            modal.classList.add('hidden');
            if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
            showToast('已填入生成参数（LoRA / 工作流请自行下载）');
        });

        document.getElementById('btn-meta-cancel').addEventListener('click', () => {
            modal.classList.add('hidden');
            if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
        });
    }

    function showToast(msg, duration = 3000) {
        let el = document.getElementById('toast-msg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast-msg';
            Object.assign(el.style, {
                position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 24px',
                borderRadius: '8px', fontSize: '14px', zIndex: '99999',
                transition: 'opacity .3s', pointerEvents: 'none'
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._timer);
        el._timer = setTimeout(() => { el.style.opacity = '0'; }, duration);
    }

    function setupDzmm() {
        // DZMM 生图已下线（官网跨域/机房验证码，无稳定线上路径）
        return;
    }

    // ==================== NAI 在线生图 ====================
    const NAI_API_BASE = 'https://api.idlecloud.cc/api';
    const NAI_STORAGE_KEY = 'nai_api_key';

    function setupNai() {
        const apiKeyInput = document.getElementById('inp-nai-apikey');
        const toggleBtn = document.getElementById('btn-nai-apikey-toggle');
        if (!apiKeyInput) return;

        // Load saved API key
        const savedKey = localStorage.getItem(NAI_STORAGE_KEY);
        if (savedKey) apiKeyInput.value = savedKey;

        apiKeyInput.addEventListener('change', () => {
            localStorage.setItem(NAI_STORAGE_KEY, apiKeyInput.value.trim());
        });

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            });
        }

        // Size presets
        document.querySelectorAll('.nai-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nai-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Upscale premium gate
        const chkUpscale = document.getElementById('chk-nai-upscale');
        if (chkUpscale) {
            chkUpscale.addEventListener('change', () => {
                if (chkUpscale.checked) {
                    showToast('大图模式需要高级权限，请加入 Discord 群获取资格');
                    chkUpscale.checked = false;
                }
            });
        }

        // Sliders
        const sliders = [
            ['rng-nai-steps', 'nai-steps-val', v => v],
            ['rng-nai-cfg', 'nai-cfg-val', v => parseFloat(v).toFixed(1)],
            ['rng-nai-rescale', 'nai-rescale-val', v => parseFloat(v).toFixed(2)],
            ['rng-nai-duration', 'nai-duration-val', v => parseFloat(v).toFixed(1)],
            ['rng-nai-video-steps', 'nai-video-steps-val', v => v],
            ['rng-nai-video-guidance', 'nai-video-guidance-val', v => parseFloat(v).toFixed(1)],
        ];
        sliders.forEach(([sliderId, valId, fmt]) => {
            const slider = document.getElementById(sliderId);
            const valEl = document.getElementById(valId);
            if (slider && valEl) {
                slider.addEventListener('input', () => { valEl.textContent = fmt(slider.value); });
            }
        });

        // Random seed
        const btnSeed = document.getElementById('btn-nai-random-seed');
        if (btnSeed) {
            btnSeed.addEventListener('click', () => {
                document.getElementById('inp-nai-seed').value = Math.floor(Math.random() * 4294967295);
            });
        }

        // Video random seed
        const btnVideoSeed = document.getElementById('btn-nai-video-random-seed');
        if (btnVideoSeed) {
            btnVideoSeed.addEventListener('click', () => {
                document.getElementById('inp-nai-video-seed').value = Math.floor(Math.random() * 4294967295);
            });
        }

        // Model switch: show/hide video panel vs image panels
        const selModel = document.getElementById('sel-nai-model');
        if (selModel) {
            const imageOnlyGroups = ['nai-basic', 'nai-img2img', 'nai-vibe', 'nai-director-ref', 'nai-character', 'nai-extra'];
            selModel.addEventListener('change', () => {
                const isVideo = selModel.value.startsWith('wan2');
                const videoPanel = document.getElementById('nai-video-panel');
                if (videoPanel) videoPanel.classList.toggle('hidden', !isVideo);
                // Hide image-specific panels that don't apply to video
                const imageSizePanels = document.querySelectorAll('#mode-nai [data-group="nai-basic"] .panel');
                const sizePanel = imageSizePanels[2]; // image size panel
                const samplingPanel = imageSizePanels[3]; // sampling panel
                const specialPanel = imageSizePanels[4]; // special features panel
                if (sizePanel) sizePanel.style.display = isVideo ? 'none' : '';
                if (samplingPanel) samplingPanel.style.display = isVideo ? 'none' : '';
                if (specialPanel) specialPanel.style.display = isVideo ? 'none' : '';
                // Hide image-only groups for video mode
                ['nai-img2img', 'nai-vibe', 'nai-director-ref', 'nai-character', 'nai-extra'].forEach(g => {
                    const el = document.querySelector(`#mode-nai [data-group="${g}"]`);
                    if (el) el.style.display = isVideo ? 'none' : '';
                });
            });
        }

        // Video frame upload helpers
        setupNaiFrameUpload('nai-start-frame');
        setupNaiFrameUpload('nai-end-frame');

        if (sessionStorage.getItem('_adm')) {
            const vcRow = document.getElementById('nai-videocode-row');
            if (vcRow) vcRow.style.display = 'none';
        }

        // img2img upload
        const img2imgZone = document.getElementById('nai-img2img-zone');
        const img2imgInput = document.getElementById('inp-nai-img2img');
        if (img2imgZone && img2imgInput) {
            img2imgZone.addEventListener('click', () => img2imgInput.click());
            img2imgZone.addEventListener('dragover', e => { e.preventDefault(); img2imgZone.style.borderColor = '#14b8a6'; });
            img2imgZone.addEventListener('dragleave', () => { img2imgZone.style.borderColor = ''; });
            img2imgZone.addEventListener('drop', e => {
                e.preventDefault();
                img2imgZone.style.borderColor = '';
                if (e.dataTransfer.files.length) handleNaiImg2imgFile(e.dataTransfer.files[0]);
            });
            img2imgInput.addEventListener('change', () => {
                if (img2imgInput.files[0]) handleNaiImg2imgFile(img2imgInput.files[0]);
            });
        }

        // Premium zones
        document.querySelectorAll('.nai-premium-zone').forEach(zone => {
            zone.addEventListener('click', () => {
                showToast('该功能需要高级权限，请加入 Discord 群获取资格');
            });
        });

        // Character control
        const btnAddChar = document.getElementById('btn-nai-add-character');
        if (btnAddChar) {
            btnAddChar.addEventListener('click', () => {
                const list = document.getElementById('nai-character-list');
                const count = list.querySelectorAll('.nai-character-item').length;
                if (count >= 6) { showToast('最多支持 6 个角色'); return; }
                const idx = count + 1;
                const item = document.createElement('div');
                item.className = 'nai-character-item';
                item.innerHTML = `<h3>角色 ${idx} <button class="btn-icon btn-sm nai-remove-char" title="删除">🗑️</button></h3>
                    <textarea placeholder="角色正向提示词..." class="nai-char-prompt" rows="2"></textarea>
                    <textarea placeholder="角色反向提示词..." class="nai-char-uc" rows="1" style="margin-top:4px"></textarea>
                    <div class="compact-row" style="margin-top:4px">
                        <label>X <input type="number" class="nai-char-x" value="0.5" min="0" max="1" step="0.1"></label>
                        <label>Y <input type="number" class="nai-char-y" value="0.5" min="0" max="1" step="0.1"></label>
                    </div>`;
                item.querySelector('.nai-remove-char').addEventListener('click', () => {
                    item.remove();
                    updateNaiCharInfo();
                });
                list.appendChild(item);
                updateNaiCharInfo();
            });
        }

        // Reset
        const btnReset = document.getElementById('btn-nai-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                document.getElementById('sel-nai-model').value = 'nai-diffusion-4-5-full';
                document.querySelectorAll('.nai-size-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.nai-size-btn[data-w="832"]').classList.add('active');
                document.getElementById('inp-nai-seed').value = '-1';
                document.getElementById('sel-nai-sampler').value = 'k_euler';
                const resetSliders = { 'rng-nai-steps': '23', 'rng-nai-cfg': '5', 'rng-nai-rescale': '0' };
                Object.entries(resetSliders).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
                });
                document.getElementById('sel-nai-noise-schedule').value = 'karras';
                ['chk-nai-smea','chk-nai-dyn','chk-nai-variety','chk-nai-decrisp','chk-nai-legacy','chk-nai-legacy-uc','chk-nai-legacy-v3','chk-nai-auto-smea','chk-nai-euler-bug'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.checked = false;
                });
                document.getElementById('chk-nai-brownian').checked = true;
                document.getElementById('sel-nai-uc-preset').value = '1';
                document.getElementById('nai-character-list').innerHTML = '';
                updateNaiCharInfo();
                showToast('已重置所有参数');
            });
        }

        // Generate button
        const btnNaiGen = document.getElementById('btn-nai-generate');
        if (btnNaiGen) {
            btnNaiGen.addEventListener('click', () => naiGenerate());
        }
    }

    let _naiImg2imgBase64 = null;
    let _naiStartFrameBase64 = null;
    let _naiEndFrameBase64 = null;

    function setupNaiFrameUpload(prefix) {
        const zone = document.getElementById(`${prefix}-zone`);
        const input = document.getElementById(`inp-${prefix}`);
        if (!zone || !input) return;

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = '#14b8a6'; });
        zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.style.borderColor = '';
            if (e.dataTransfer.files.length) handleNaiFrameFile(prefix, e.dataTransfer.files[0]);
        });
        input.addEventListener('change', () => {
            if (input.files[0]) handleNaiFrameFile(prefix, input.files[0]);
        });

        const removeBtn = document.querySelector(`.nai-remove-img[data-target="${prefix}"]`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (prefix === 'nai-start-frame') _naiStartFrameBase64 = null;
                else _naiEndFrameBase64 = null;
                document.getElementById(`${prefix}-preview`).classList.add('hidden');
                zone.classList.remove('hidden');
                document.getElementById(`inp-${prefix}`).value = '';
            });
        }
    }

    function handleNaiFrameFile(prefix, file) {
        if (!file.type.startsWith('image/')) { showToast('请上传图片文件'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result.split(',')[1];
            if (prefix === 'nai-start-frame') _naiStartFrameBase64 = b64;
            else _naiEndFrameBase64 = b64;
            const preview = document.getElementById(`${prefix}-preview`);
            const img = document.getElementById(`${prefix}-img`);
            img.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById(`${prefix}-zone`).classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }

    function handleNaiImg2imgFile(file) {
        if (!file.type.startsWith('image/')) { showToast('请上传图片文件'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            _naiImg2imgBase64 = e.target.result.split(',')[1];
            const preview = document.getElementById('nai-img2img-preview');
            const img = document.getElementById('nai-img2img-img');
            img.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById('nai-img2img-zone').classList.add('hidden');
        };
        reader.readAsDataURL(file);

        const removeBtn = document.querySelector('.nai-remove-img[data-target="nai-img2img"]');
        if (removeBtn) {
            removeBtn.onclick = () => {
                _naiImg2imgBase64 = null;
                document.getElementById('nai-img2img-preview').classList.add('hidden');
                document.getElementById('nai-img2img-zone').classList.remove('hidden');
                document.getElementById('inp-nai-img2img').value = '';
            };
        }
    }

    function updateNaiCharInfo() {
        const list = document.getElementById('nai-character-list');
        const info = document.getElementById('nai-character-info');
        if (!list || !info) return;
        const count = list.querySelectorAll('.nai-character-item').length;
        info.textContent = `已配置 ${count}/6 个角色，当前启用 ${count} 个。`;
    }

    function getNaiPayload() {
        const activeSize = document.querySelector('.nai-size-btn.active');
        const w = activeSize ? parseInt(activeSize.dataset.w) : 1024;
        const h = activeSize ? parseInt(activeSize.dataset.h) : 1536;
        let seed = parseInt(document.getElementById('inp-nai-seed').value);
        if (seed < 0) seed = Math.floor(Math.random() * 4294967295);

        const payload = {
            model: document.getElementById('sel-nai-model').value,
            positivePrompt: document.getElementById('txt-positive').value.trim(),
            negativePrompt: document.getElementById('txt-negative').value.trim(),
            width: w,
            height: h,
            steps: parseInt(document.getElementById('rng-nai-steps').value),
            scale: parseFloat(document.getElementById('rng-nai-cfg').value),
            sampler: document.getElementById('sel-nai-sampler').value,
            seed: seed,
            noise_schedule: document.getElementById('sel-nai-noise-schedule').value,
            promptGuidanceRescale: parseFloat(document.getElementById('rng-nai-rescale').value),
            sm: document.getElementById('chk-nai-smea').checked,
            sm_dyn: document.getElementById('chk-nai-dyn').checked,
            decrisp: document.getElementById('chk-nai-decrisp').checked,
            variety: document.getElementById('chk-nai-variety').checked,
            prefer_brownian: document.getElementById('chk-nai-brownian').checked,
            deliberate_euler_ancestral_bug: document.getElementById('chk-nai-euler-bug').checked,
            legacy: document.getElementById('chk-nai-legacy').checked,
            legacy_uc: document.getElementById('chk-nai-legacy-uc').checked,
            legacy_v3_extend: document.getElementById('chk-nai-legacy-v3').checked,
            ucPreset: parseInt(document.getElementById('sel-nai-uc-preset').value),
            autoSmea: document.getElementById('chk-nai-auto-smea').checked,
            use_coords: !(document.getElementById('chk-nai-use-coords')?.checked),
            use_upscale_credits: false,
        };

        // img2img
        if (_naiImg2imgBase64) {
            payload.action = true;
            payload.image = _naiImg2imgBase64;
            payload.strength = parseFloat(document.getElementById('inp-nai-strength').value);
            payload.noise = parseFloat(document.getElementById('inp-nai-noise').value);
        }

        // Character prompts (V4)
        const charItems = document.querySelectorAll('.nai-character-item');
        if (charItems.length > 0) {
            const characterPrompts = [];
            const v4Captions = [];
            const v4NegCaptions = [];
            charItems.forEach(item => {
                const prompt = item.querySelector('.nai-char-prompt').value.trim();
                const uc = item.querySelector('.nai-char-uc').value.trim();
                const x = parseFloat(item.querySelector('.nai-char-x').value) || 0.5;
                const y = parseFloat(item.querySelector('.nai-char-y').value) || 0.5;
                characterPrompts.push({ prompt, uc, center: { x, y } });
                v4Captions.push({ char_caption: prompt, centers: [{ x, y }] });
                v4NegCaptions.push({ char_caption: uc, centers: [{ x, y }] });
            });
            payload.characterPrompts = characterPrompts;
            payload.v4_prompt_char_captions = v4Captions;
            payload.v4_negative_prompt_char_captions = v4NegCaptions;
        }

        return payload;
    }

    function getNaiVideoPayload() {
        let seed = parseInt(document.getElementById('inp-nai-video-seed').value);
        if (seed < 0) seed = Math.floor(Math.random() * 4294967295);

        const images = [];
        if (_naiStartFrameBase64) images.push(_naiStartFrameBase64);
        if (_naiEndFrameBase64) images.push(_naiEndFrameBase64);

        const payload = {
            model: document.getElementById('sel-nai-model').value,
            positivePrompt: document.getElementById('txt-positive').value.trim(),
            negativePrompt: document.getElementById('txt-negative').value.trim(),
            seed: seed,
            inferenceSteps: parseInt(document.getElementById('rng-nai-video-steps').value),
            guidance_scale_high: parseFloat(document.getElementById('rng-nai-video-guidance').value),
            seconds: parseFloat(document.getElementById('rng-nai-duration').value),
            videoFluidity: parseInt(document.getElementById('sel-nai-fps').value),
            image: images,
        };

        const videoCode = document.getElementById('inp-nai-videocode')?.value?.trim();
        if (videoCode) payload.videoCode = videoCode.toUpperCase();

        return payload;
    }

    function getNaiEndpoints(customApiKey, isVideo) {
        if (customApiKey) {
            const apiPath = isVideo ? 'generate_video' : 'generate_image';
            return {
                useProxy: false,
                submitUrl: `${NAI_API_BASE}/${apiPath}`,
                resultUrl: (jobId) => `${NAI_API_BASE}/get_result/${encodeURIComponent(jobId)}`,
                headers: {
                    'Authorization': `Bearer ${customApiKey}`,
                    'Content-Type': 'application/json'
                }
            };
        }
        const proxyBase = '/api/nai';
        const hdrs = { 'Content-Type': 'application/json' };
        const admKey = sessionStorage.getItem('_adm');
        if (admKey) hdrs['X-Admin-Key'] = admKey;
        return {
            useProxy: true,
            submitUrl: `${proxyBase}/generate`,
            resultUrl: (jobId) => `${proxyBase}/status?id=${encodeURIComponent(jobId)}`,
            headers: hdrs
        };
    }

    async function naiGenerate() {
        const customApiKey = document.getElementById('inp-nai-apikey').value.trim();

        const model = document.getElementById('sel-nai-model').value;
        const isVideo = model.startsWith('wan2');
        const endpoints = getNaiEndpoints(customApiKey, isVideo);

        const _log = (tag, ...args) => console.log(`[NAI-${isVideo ? 'Video' : 'Image'}] [${tag}]`, ...args);
        const _startTime = Date.now();
        _log('INIT', 'model:', model, 'isVideo:', isVideo, 'hasApiKey:', !!customApiKey);

        if (isVideo && !_naiStartFrameBase64) {
            showToast('视频生成需要上传首帧图片');
            return;
        }

        const btnGen = document.getElementById('btn-nai-generate');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        btnGen.disabled = true;
        btnGen.textContent = '生成中...';
        progressContainer.classList.remove('hidden');

        try {
            progressBar.style.width = '10%';

            const payload = isVideo ? getNaiVideoPayload() : getNaiPayload();
            _log('PAYLOAD', JSON.stringify({
                model: payload.model,
                seed: payload.seed,
                ...(isVideo ? {
                    seconds: payload.seconds,
                    videoFluidity: payload.videoFluidity,
                    inferenceSteps: payload.inferenceSteps,
                    guidance_scale_high: payload.guidance_scale_high,
                    hasStartFrame: !!(payload.image && payload.image[0]),
                    hasEndFrame: !!(payload.image && payload.image[1]),
                    promptLength: payload.positivePrompt?.length || 0,
                } : {
                    width: payload.width,
                    height: payload.height,
                    steps: payload.steps,
                    cfg: payload.cfg_scale,
                })
            }));

            // Submit with auto-retry queue
            let job_id;
            const maxRetries = 60;
            let queueStartTime = null;
            for (let retry = 0; retry <= maxRetries; retry++) {
                const submitRes = await fetch(endpoints.submitUrl, {
                    method: 'POST',
                    headers: endpoints.headers,
                    body: JSON.stringify(payload)
                });

                _log('SUBMIT', `attempt ${retry}/${maxRetries}, status: ${submitRes.status}, elapsed: ${Date.now() - _startTime}ms`);

                if (submitRes.status === 429) {
                    if (!queueStartTime) queueStartTime = Date.now();
                    const errData = await submitRes.json().catch(() => ({}));
                    _log('QUEUE', 'position:', errData.queue_position, 'total:', errData.queue_total, 'retry_after:', errData.retry_after, 'rate_limited:', errData.rate_limited, 'queue_full:', errData.queue_full);
                    if (errData._debug) console.log('Admin debug:', errData._debug);
                    if (errData.rate_limited || errData.queue_full) {
                        throw new Error(errData.error);
                    }
                    const waitSec = errData.retry_after || 10;
                    if (retry >= maxRetries) {
                        throw new Error('排队超时，请稍后再试');
                    }
                    const pos = errData.queue_position || '?';
                    const total = errData.queue_total || '?';
                    progressText.textContent = `🔄 排队中（第${pos}位 / 共${total}人等待）`;
                    progressBar.style.width = `${Math.min(3 + retry, 15)}%`;
                    await new Promise(r => setTimeout(r, waitSec * 1000));
                    continue;
                }

                if (!submitRes.ok) {
                    const errData = await submitRes.json().catch(() => ({}));
                    _log('SUBMIT_ERROR', 'status:', submitRes.status, 'body:', JSON.stringify(errData));
                    throw new Error(errData.error || `提交失败 (${submitRes.status})`);
                }

                const submitData = await submitRes.json();
                job_id = submitData.job_id;
                _log('SUBMITTED', 'job_id:', job_id, 'queue_wait:', queueStartTime ? `${Date.now() - queueStartTime}ms` : 'none', 'total_elapsed:', `${Date.now() - _startTime}ms`);
                break;
            }
            progressBar.style.width = '30%';
            progressText.textContent = '排队中...';

            // Poll
            let attempts = 0;
            let pollErrors = 0;
            const maxAttempts = 120;
            const maxPollErrors = 5;
            let lastStatus = '';
            const pollStartTime = Date.now();
            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));
                attempts++;

                let resultRes;
                try {
                    resultRes = await fetch(endpoints.resultUrl(job_id), { headers: endpoints.headers });
                } catch (fetchErr) {
                    pollErrors++;
                    _log('POLL_FETCH_ERR', `attempt ${attempts}, error: ${fetchErr.message}, pollErrors: ${pollErrors}/${maxPollErrors}`);
                    if (pollErrors >= maxPollErrors) throw new Error('网络错误，查询多次失败');
                    progressText.textContent = `查询暂时失败，重试中 (${pollErrors}/${maxPollErrors})...`;
                    continue;
                }
                if (!resultRes.ok) {
                    pollErrors++;
                    _log('POLL_HTTP_ERR', `attempt ${attempts}, status: ${resultRes.status}, pollErrors: ${pollErrors}/${maxPollErrors}`);
                    if (pollErrors >= maxPollErrors) throw new Error(`查询失败 (${resultRes.status})，已重试 ${maxPollErrors} 次`);
                    progressText.textContent = `查询暂时失败 (${resultRes.status})，重试中 (${pollErrors}/${maxPollErrors})...`;
                    continue;
                }
                pollErrors = 0;

                const result = await resultRes.json();
                const pct = Math.min(30 + (attempts / maxAttempts) * 60, 90);
                progressBar.style.width = pct + '%';

                if (result._note || result._upstream_status || result._upstream_body) {
                    _log('POLL_RAW_UPSTREAM', `attempt: ${attempts}, _note: ${result._note}, _upstream_status: ${result._upstream_status}, _upstream_body: ${result._upstream_body}, _fetchDuration: ${result._fetchDuration}ms`);
                }
                if (result.status !== lastStatus) {
                    _log('POLL_STATUS_CHANGE', `${lastStatus || '(init)'} -> ${result.status}, attempt: ${attempts}, poll_elapsed: ${Date.now() - pollStartTime}ms, total_elapsed: ${Date.now() - _startTime}ms, full_response: ${JSON.stringify(result)}`);
                    lastStatus = result.status;
                }
                if (attempts % 12 === 0) {
                    _log('POLL_HEARTBEAT', `attempt: ${attempts}/${maxAttempts}, status: ${result.status}, poll_elapsed: ${Date.now() - pollStartTime}ms, total_elapsed: ${Date.now() - _startTime}ms, full_response: ${JSON.stringify(result)}`);
                }

                if (result.status === 'completed') {
                    _log('COMPLETED', `total_elapsed: ${Date.now() - _startTime}ms, poll_elapsed: ${Date.now() - pollStartTime}ms, attempts: ${attempts}, has_video_url: ${!!result.video_url}, has_image_url: ${!!result.image_url}`);
                    progressBar.style.width = '100%';
                    const mediaUrl = result.image_url || result.video_url;
                    if (mediaUrl) {
                        const resultImg = document.getElementById('result-image');
                        const placeholder = document.getElementById('result-placeholder');
                        const actions = document.getElementById('result-actions');

                        if (result.video_url) {
                            let videoEl = document.getElementById('result-video');
                            if (!videoEl) {
                                videoEl = document.createElement('video');
                                videoEl.id = 'result-video';
                                videoEl.className = 'result-image';
                                videoEl.controls = true;
                                videoEl.autoplay = true;
                                videoEl.loop = true;
                                resultImg.parentNode.insertBefore(videoEl, resultImg.nextSibling);
                            }
                            videoEl.src = result.video_url;
                            videoEl.classList.remove('hidden');
                            resultImg.classList.add('hidden');
                            showToast('视频生成完成！');
                        } else {
                            const videoEl = document.getElementById('result-video');
                            if (videoEl) videoEl.classList.add('hidden');
                            resultImg.src = mediaUrl;
                            resultImg.classList.remove('hidden');
                            showToast('图片生成完成！');
                        }
                        placeholder.classList.add('hidden');
                        if (actions) actions.classList.remove('hidden');
                        updateMobileResultUI(true);
                    }
                    break;
                } else if (result.status === 'failed') {
                    _log('FAILED', `error: ${result.error}, total_elapsed: ${Date.now() - _startTime}ms, full_result: ${JSON.stringify(result)}`);
                    throw new Error(`生成失败: ${result.error || '未知错误'}`);
                } else {
                    const statusText = result.status === 'queued' ? '排队中...' : '生成中...';
                    progressText.textContent = statusText;
                }
            }

            if (attempts >= maxAttempts) {
                _log('TIMEOUT', `maxAttempts reached (${maxAttempts}), total_elapsed: ${Date.now() - _startTime}ms, lastStatus: ${lastStatus}`);
                throw new Error('生成超时，请稍后重试');
            }
        } catch (err) {
            _log('ERROR', `message: ${err.message}, total_elapsed: ${Date.now() - _startTime}ms`);
            showToast(`错误: ${err.message}`);
            console.error('NAI generate error:', err);
        } finally {
            btnGen.disabled = false;
            btnGen.textContent = 'NAI 在线生图';
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
        }
    }

    setupUiSkin();
    setupTheme();
    setupInsertedCharacters();
    setupRandomArtists();
    setupToggles();
    setupControlnetSpeedupGuard();
    setupArchSwitch();
    setupIPAdapter();
    setupPanelGroups();
    setupMobileNav();
    setupMobileResultExpand();
    setupGenerateFab();
    setupSidebarResize();
    setupHistoryPanel();
    setupWildcard();
    setupWorkflowMode();
    bindEvents();
    setupPromptTagEditor();
    setupMetaImport();
    setupNai();
    setupConnectionStatus();
    setupInpaint();
    setupCompositor();
    setupCutout();
    ProfileManager.setup();
    init();
})();
