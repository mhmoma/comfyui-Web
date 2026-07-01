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
        inpSeed: $('#inp-seed'),
        btnRandomSeed: $('#btn-random-seed'),
        txtPositive: $('#txt-positive'),
        txtNegative: $('#txt-negative'),
        btnGenerate: $('#btn-generate'),
        progressContainer: $('#progress-container'),
        progressBar: $('#progress-bar'),
        progressText: $('#progress-text'),
        resultPlaceholder: $('#result-placeholder'),
        resultImage: $('#result-image'),
        resultActions: $('#result-actions'),
        btnDownload: $('#btn-download'),
        btnSendToHistory: $('#btn-send-to-history'),
        historyGrid: $('#history-grid'),
        btnClearHistory: $('#btn-clear-history'),
        btnTutorial: $('#btn-tutorial'),
        modalTutorial: $('#modal-tutorial'),
        btnCloseTutorial: $('#btn-close-tutorial'),
        btnSettings: $('#btn-settings'),
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
        cnProcessedPreview: $('#cn-processed-preview'),
        cnProcessedImg: $('#cn-processed-img'),
        cnPreviewContainer: $('#cn-preview-container'),
        cnPreview: $('#cn-preview'),
        chkImg2img: $('#chk-img2img'),
        panelImg2img: $('#panel-img2img'),
        inpRefImage: $('#inp-ref-image'),
        refPreviewContainer: $('#ref-preview-container'),
        refPreview: $('#ref-preview'),
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
    };

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
        ];
        pairs.forEach(([chk, panel]) => {
            const update = () => {
                panel.classList.toggle('hidden', !chk.checked);
            };
            chk.addEventListener('change', update);
            update();
        });
    }

    // ==================== LoRA 多选管理 ====================
    let loraOptions = [];
    let loraCount = 0;

    function addLoraRow() {
        loraCount++;
        const row = document.createElement('div');
        row.className = 'lora-row';
        row.dataset.id = loraCount;
        row.innerHTML = `
            <select class="lora-select">${loraOptions.map(l => `<option value="${l}">${l}</option>`).join('')}</select>
            <input type="number" class="lora-strength" value="1" min="0" max="2" step="0.05" title="强度">
            <button class="btn-icon lora-remove" title="移除">✕</button>
        `;
        row.querySelector('.lora-remove').addEventListener('click', () => row.remove());
        dom.loraList.appendChild(row);
    }

    function getLoraSelections() {
        const rows = dom.loraList.querySelectorAll('.lora-row');
        return Array.from(rows).map(row => ({
            name: row.querySelector('.lora-select').value,
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

    async function uploadImageFromUrl(imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `ref_${Date.now()}.png`, { type: blob.type || 'image/png' });
        return uploadImage(file);
    }

    const ANIMA_DEFAULTS = {
        positive: 'masterpiece, best quality, score_7, safe',
        negative: 'worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, bad hands, bad arm, bad knees, missing fingers, extra fingers, anatomical nonsense, bad perspective',
        width: 832,
        height: 1216,
        steps: 30,
        cfg: 4,
    };

    const SDXL_DEFAULTS = {
        width: 1024,
        height: 1536,
        steps: 30,
        cfg: 6,
    };

    function isAnimaMode() {
        return dom.selArch.value === 'anima';
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
            const isAnima = isAnimaMode();
            dom.panelSdxlModel.classList.toggle('hidden', isAnima);
            dom.panelAnimaModel.classList.toggle('hidden', !isAnima);
            if (isAnima) {
                dom.inpWidth.value = ANIMA_DEFAULTS.width;
                dom.inpHeight.value = ANIMA_DEFAULTS.height;
                dom.inpSteps.value = ANIMA_DEFAULTS.steps;
                dom.inpCfg.value = ANIMA_DEFAULTS.cfg;
                if (!dom.txtPositive.value.trim()) {
                    dom.txtPositive.value = ANIMA_DEFAULTS.positive;
                }
                if (!dom.txtNegative.value.trim()) {
                    dom.txtNegative.value = ANIMA_DEFAULTS.negative;
                }
            } else {
                dom.inpWidth.value = SDXL_DEFAULTS.width;
                dom.inpHeight.value = SDXL_DEFAULTS.height;
                dom.inpSteps.value = SDXL_DEFAULTS.steps;
                dom.inpCfg.value = SDXL_DEFAULTS.cfg;
            }
        });
    }

    async function loadAnimaModels() {
        try {
            const unetData = await apiGet('/object_info/UNETLoader');
            const unets = unetData.UNETLoader.input.required.unet_name[0];
            dom.selUnet.innerHTML = '';
            unets.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selUnet.appendChild(o); });
        } catch (e) { dom.selUnet.innerHTML = '<option>无可用模型</option>'; }

        try {
            const clipData = await apiGet('/object_info/CLIPLoader');
            const clips = clipData.CLIPLoader.input.required.clip_name[0];
            dom.selClip.innerHTML = '';
            clips.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selClip.appendChild(o); });
        } catch (e) { dom.selClip.innerHTML = '<option>无可用编码器</option>'; }

        try {
            const vaeData = await apiGet('/object_info/VAELoader');
            const vaes = vaeData.VAELoader.input.required.vae_name[0];
            dom.selAnimaVae.innerHTML = '';
            vaes.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; dom.selAnimaVae.appendChild(o); });
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

    // ==================== 动态工作流构建 ====================
    function buildWorkflow(uploadedImages) {
        const seed = parseInt(dom.inpSeed.value);
        const actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 32) : seed;
        const nodes = {};
        let nextId = 10;
        const id = () => String(nextId++);

        const useVae = dom.chkVae.checked;
        const useLora = dom.chkLora.checked;
        const useHires = dom.chkHires.checked;
        const useControlnet = dom.chkControlnet.checked && uploadedImages.controlnet;
        const useImg2img = dom.chkImg2img.checked && (uploadedImages.img2img || refImageUrl);
        const useAdetailer = dom.chkAdetailer.checked;
        const useRegional = dom.chkRegional.checked;

        let modelOut, clipOut, vaeOut;
        const isAnima = dom.selArch.value === 'anima';

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
                    inputs: { filename_prefix: "CN_Preview", images: preprocessedImage },
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

        let finalImage = [decodeId, 0];

        // Save intermediate "before" image for comparison (only if hires or adetailer is on)
        if (useHires || useAdetailer) {
            const beforeSaveId = id();
            nodes[beforeSaveId] = {
                class_type: "SaveImage",
                inputs: { filename_prefix: "CW_Before", images: finalImage },
            };
        }

        // ADetailer - face/hand detection + redraw
        if (useAdetailer) {
            const detectorId = id();
            nodes[detectorId] = {
                class_type: "UltralyticsDetectorProvider",
                inputs: { model_name: dom.selAdetailerModel.value },
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
            inputs: { filename_prefix: "ComfyUI_Web", images: finalImage },
        };

        return { prompt: nodes };
    }

    // ==================== 生图流程 ====================
    async function generate() {
        dom.btnGenerate.disabled = true;
        dom.btnGenerate.textContent = '生成中...';
        dom.progressContainer.classList.remove('hidden');
        dom.resultPlaceholder.classList.add('hidden');
        dom.resultImage.classList.add('hidden');
        dom.resultActions.classList.add('hidden');
        setProgress(0);

        try {
            const uploadedImages = {};

            if (dom.chkControlnet.checked && dom.inpCnImage.files[0]) {
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

            const workflow = buildWorkflow(uploadedImages);
            const result = await apiPost('/prompt', workflow);
            await pollProgress(result.prompt_id);
        } catch (e) {
            alert('生图失败: ' + e.message);
            console.error(e);
        } finally {
            dom.btnGenerate.disabled = false;
            dom.btnGenerate.textContent = '生成图片';
            dom.progressContainer.classList.add('hidden');
        }
    }

    async function pollProgress(promptId) {
        const startTime = Date.now();
        const TIMEOUT = 300000;

        while (Date.now() - startTime < TIMEOUT) {
            try {
                const res = await fetch(`${getServer()}/history/${promptId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data[promptId] && data[promptId].outputs) {
                        setProgress(100);
                        await fetchResult(promptId);
                        return;
                    }
                }

                const queueRes = await fetch(`${getServer()}/queue`);
                if (queueRes.ok) {
                    const queue = await queueRes.json();
                    const running = queue.queue_running || [];
                    const current = running.find(item => item[1] === promptId);
                    if (current) {
                        setProgress(50);
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

    async function fetchResult(promptId) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const history = await apiGet(`/history/${promptId}`);
            const outputs = history[promptId]?.outputs;
            if (!outputs) { await new Promise(r => setTimeout(r, 1000)); continue; }

            let mainImage = null;
            let beforeImage = null;
            let previewImage = null;

            for (const nodeId of Object.keys(outputs)) {
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                    for (const img of nodeOutput.images) {
                        const url = `${getServer()}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                        if (img.filename.startsWith('CN_Preview')) {
                            previewImage = url;
                        } else if (img.filename.startsWith('CW_Before')) {
                            beforeImage = url;
                        } else {
                            mainImage = url;
                        }
                    }
                }
            }

            if (previewImage && dom.cnProcessedImg) {
                dom.cnProcessedImg.src = previewImage;
                dom.cnProcessedPreview.classList.remove('hidden');
            }

            lastBeforeImage = beforeImage;
            lastAfterImage = mainImage;

            if (mainImage) {
                showResult(mainImage, !!beforeImage);
                return;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    function showResult(url, hasCompare) {
        dom.resultImage.src = url;
        dom.resultImage.classList.remove('hidden');
        dom.resultPlaceholder.classList.add('hidden');
        dom.resultActions.classList.remove('hidden');
        dom.btnCompare.classList.toggle('hidden', !hasCompare);
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
        dom.progressBar.style.width = pct + '%';
        dom.progressText.textContent = pct + '%';
    }

    // ==================== 历史管理 ====================
    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem('comfyui_history') || '[]');
        } catch {
            return [];
        }
    }

    function saveToHistory(url) {
        const history = getHistory();
        history.unshift({ url, time: Date.now() });
        if (history.length > 50) history.length = 50;
        localStorage.setItem('comfyui_history', JSON.stringify(history));
        renderHistory();
    }

    function clearHistory() {
        localStorage.removeItem('comfyui_history');
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();
        dom.historyGrid.innerHTML = '';
        history.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            const img = document.createElement('img');
            img.src = item.url;
            img.alt = '历史图片';
            img.loading = 'lazy';
            div.appendChild(img);
            const overlay = document.createElement('div');
            overlay.className = 'history-overlay';
            overlay.innerHTML = '<button class="btn-history-ref" title="用作参考图">📌</button>';
            overlay.querySelector('.btn-history-ref').addEventListener('click', (e) => {
                e.stopPropagation();
                useImageAsRef(item.url);
            });
            div.appendChild(overlay);
            div.addEventListener('click', () => {
                dom.previewImage.src = item.url;
                dom.modalPreview.classList.remove('hidden');
            });
            dom.historyGrid.appendChild(div);
        });
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
                    '3': { class_type: 'SaveImage', inputs: { filename_prefix: 'CN_Preview', images: ['2', 0] } },
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

        dom.btnDownload.addEventListener('click', () => {
            const url = dom.resultImage.src;
            if (!url) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = `comfyui_${Date.now()}.png`;
            a.click();
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

        // Settings modal
        dom.btnSettings.addEventListener('click', () => {
            dom.inpServer.value = getComfyUIAddress();
            dom.modalSettings.classList.remove('hidden');
        });

        dom.btnSaveSettings.addEventListener('click', () => {
            const url = dom.inpServer.value.trim();
            if (!url) return;
            setComfyUIAddress(url);
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

        // Use as reference image
        dom.btnUseAsRef.addEventListener('click', () => {
            const url = dom.resultImage.src;
            if (url) useImageAsRef(url);
        });

        dom.btnPreviewRef.addEventListener('click', () => {
            const url = dom.previewImage.src;
            if (url) useImageAsRef(url);
        });

        dom.btnPreviewDownload.addEventListener('click', () => {
            const url = dom.previewImage.src;
            if (!url) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = `comfyui_${Date.now()}.png`;
            a.click();
        });

        // Regional prompt
        dom.btnAddRegion.addEventListener('click', () => addRegionRow());
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
        });

        // LoRA add button
        dom.btnAddLora.addEventListener('click', addLoraRow);

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
        return text.replace(/__(.+?)__/g, (match, name) => {
            const customCat = custom.find(c => c.name === name);
            if (customCat && customCat.values.length > 0) {
                return customCat.values[Math.floor(Math.random() * customCat.values.length)];
            }
            const cat = cats.find(c => c.name === name);
            if (!cat || cat.tags.length === 0) return match;
            return cat.tags[Math.floor(Math.random() * cat.tags.length)];
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

    // ==================== 标签选择器（双面板） ====================
    let tagData = [];

    async function loadTags() {
        try {
            const res = await fetch('tags.json');
            tagData = await res.json();
        } catch (e) {
            console.warn('标签数据加载失败:', e);
        }
    }

    class TagPicker {
        constructor(pickerId, textarea) {
            this.id = pickerId;
            this.textarea = textarea;
            this.groupIdx = 0;
            this.subIdx = 0;
            this.tabsEl = document.querySelector(`.tag-tabs[data-picker="${pickerId}"]`);
            this.subTabsEl = document.querySelector(`.tag-subtabs[data-picker="${pickerId}"]`);
            this.gridEl = document.querySelector(`.tag-grid[data-picker="${pickerId}"]`);
            this.searchEl = document.querySelector(`.tag-search[data-picker="${pickerId}"]`);

            let debounce;
            this.searchEl.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => this.renderGrid(), 200);
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

        render() {
            this.renderTabs();
            this.renderSubTabs();
            this.renderGrid();
        }

        renderTabs() {
            this.tabsEl.innerHTML = '';
            tagData.forEach((g, i) => {
                const tab = document.createElement('span');
                tab.className = 'tab' + (i === this.groupIdx ? ' active' : '');
                tab.textContent = g.name;
                tab.addEventListener('click', () => {
                    this.groupIdx = i;
                    this.subIdx = 0;
                    this.searchEl.value = '';
                    this.render();
                });
                this.tabsEl.appendChild(tab);
            });
        }

        renderSubTabs() {
            this.subTabsEl.innerHTML = '';
            const subs = (tagData[this.groupIdx]?.subgroups || []).filter(Boolean);
            subs.forEach((s, i) => {
                const tab = document.createElement('span');
                tab.className = 'tab' + (i === this.subIdx ? ' active' : '');
                tab.textContent = s.name;
                tab.addEventListener('click', () => {
                    this.subIdx = i;
                    this.renderSubTabs();
                    this.renderGrid();
                });
                this.subTabsEl.appendChild(tab);
            });
        }

        renderGrid() {
            console.log(`[TagPicker ${this.id}] renderGrid, tabsEl:`, this.tabsEl, 'subTabsEl:', this.subTabsEl, 'gridEl:', this.gridEl);
            if (!this.gridEl || !this.subTabsEl) { console.error('Missing elements!'); return; }
            this.gridEl.innerHTML = '';
            const search = this.searchEl.value.toLowerCase();
            let items;
            if (search) {
                items = [];
                tagData.forEach(g => g.subgroups.forEach(s => s.tags.forEach(t => {
                    if (t.t.toLowerCase().includes(search) || t.d.includes(search)) items.push(t);
                })));
                items = items.slice(0, 100);
            } else {
                items = tagData[this.groupIdx]?.subgroups[this.subIdx]?.tags || [];
            }

            const selected = this.getSelectedTags();

            const isArtistGroup = tagData[this.groupIdx]?.name?.includes('画师');

            items.forEach(tag => {
                const div = document.createElement('div');
                const isSelected = selected.has(tag.t);
                const weight = this.getTagWeight(tag.t);
                div.className = 'tag-item' + (isSelected ? ' selected' : '') + (isArtistGroup ? ' tag-artist' : '');
                div.dataset.tag = tag.t;
                if (isArtistGroup) {
                    const displayName = tag.t.replace(/_/g, ' ');
                    const desc = tag.d && !tag.d.match(/^\d+作品$/) ? tag.d : '';
                    div.innerHTML = `<span class="tag-text">${displayName}</span>${desc ? `<span class="tag-desc">${desc}</span>` : ''}<span class="tag-weight">${weight.toFixed(1)}</span>`;
                } else {
                    div.innerHTML = `<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t}</span><span class="tag-weight">${weight.toFixed(1)}</span>`;
                }
                div.addEventListener('click', (e) => {
                    if (e.shiftKey && isSelected) {
                        this.adjustWeight(tag.t, 0.1);
                    } else if (e.ctrlKey && isSelected) {
                        this.adjustWeight(tag.t, -0.1);
                    } else {
                        this.toggleTag(tag.t);
                    }
                    this.renderGrid();
                });
                div.title = '点击添加/移除 | Shift+点击加权重 | Ctrl+点击减权重';
                this.gridEl.appendChild(div);
            });
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

        toggleTag(tagText) {
            const isArtist = tagData[this.groupIdx]?.name?.includes('画师');
            let formatted = tagText;
            if (isAnimaMode()) {
                formatted = isArtist ? formatAnimaArtistTag(tagText) : formatAnimaTag(tagText);
            }

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

    function setupTagPickers() {
        if (tagData.length === 0) return;
        new TagPicker('pos', dom.txtPositive);
        new TagPicker('neg', dom.txtNegative);

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
        const ADMIN_CODE = 'Tomkk520525';
        document.querySelectorAll('.btn-copy-prompt:not(.btn-clear-prompt)').forEach(btn => {
            if (!btn.dataset.target) return;
            btn.addEventListener('click', () => {
                const textarea = document.getElementById(btn.dataset.target);
                if (!textarea) return;
                if (textarea.value.includes(ADMIN_CODE)) {
                    textarea.value = textarea.value.replace(ADMIN_CODE, '').trim();
                    sessionStorage.setItem('_adm', ADMIN_CODE);
                    showToast('管理员权限已激活');
                    btn.textContent = '🔓 已激活';
                    setTimeout(() => btn.textContent = '📋 复制', 2000);
                    const vcRow = document.getElementById('nai-videocode-row');
                    if (vcRow) vcRow.style.display = 'none';
                    return;
                }
                navigator.clipboard.writeText(textarea.value).then(() => {
                    btn.textContent = '✓ 已复制';
                    setTimeout(() => btn.textContent = '📋 复制', 1500);
                });
            });
        });
    }

    // ==================== 初始化 ====================
    async function init() {
        await Promise.all([
            loadCheckpoints(),
            loadSamplers(),
            loadVAEs(),
            loadLoRAs(),
            loadControlNets(),
            loadTags(),
            loadAnimaModels(),
        ]);
        renderHistory();
        setupTagPickers();
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

        dom.btnGenerate.disabled = true;
        dom.btnGenerate.textContent = '生成中...';
        dom.progressContainer.classList.remove('hidden');
        dom.resultPlaceholder.classList.add('hidden');
        dom.resultImage.classList.add('hidden');
        dom.resultActions.classList.add('hidden');
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

            const result = await apiPost('/prompt', { prompt: workflow });
            await pollProgress(result.prompt_id);
        } catch (e) {
            alert('生图失败: ' + e.message);
            console.error(e);
        } finally {
            dom.btnGenerate.disabled = false;
            dom.btnGenerate.textContent = '生成图片';
            dom.progressContainer.classList.add('hidden');
        }
    }

    // Override generate to check mode
    const originalGenerate = generate;
    async function generateDispatch() {
        const activeMode = document.querySelector('.mode-tab.active');
        if (activeMode && activeMode.dataset.mode === 'workflow') {
            await generateFromWorkflow();
        } else {
            await originalGenerate();
        }
    }

    // ==================== 主题系统 ====================
    function setupTheme() {
        const saved = localStorage.getItem('comfyui_theme') || 'default';
        applyTheme(saved);

        const btn = document.getElementById('btn-theme');
        const panel = document.getElementById('theme-panel');
        if (!btn || !panel) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && e.target !== btn) {
                panel.classList.add('hidden');
            }
        });

        panel.querySelectorAll('.theme-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const theme = dot.dataset.theme;
                applyTheme(theme);
                localStorage.setItem('comfyui_theme', theme);
                panel.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
            });
        });
    }

    function applyTheme(theme) {
        if (theme === 'default') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        document.querySelectorAll('.theme-dot').forEach(d => {
            d.classList.toggle('active', d.dataset.theme === theme);
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
            if (this.provider === 'mymemory') {
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
            }

            const resp = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=${encodeURIComponent(text)}`);
            const data = await resp.json();
            return (data[0] || []).map(s => s[0]).join('');
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
                this.parseAndRender();
            });

            this.textarea.addEventListener('input', () => {
                if (!this.suppressSync) this.parseAndRender();
            });

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
        }

        createTagElement(tag, idx) {
            const el = document.createElement('div');
            el.className = 'prompt-tag';
            el.draggable = true;
            el.dataset.idx = idx;

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
        parsePNG(buffer) {
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
                } else if (type === 'iTXt') {
                    const data = new Uint8Array(buffer, offset + 8, len);
                    const nullIdx = data.indexOf(0);
                    if (nullIdx > 0) {
                        const key = new TextDecoder().decode(data.slice(0, nullIdx));
                        let rest = nullIdx + 1;
                        const compressionFlag = data[rest]; rest++;
                        rest++; // compression method
                        const langEnd = data.indexOf(0, rest); rest = langEnd + 1;
                        const kwEnd = data.indexOf(0, rest); rest = kwEnd + 1;
                        let val;
                        if (compressionFlag === 0) {
                            val = new TextDecoder('utf-8').decode(data.slice(rest));
                        } else {
                            try {
                                const ds = new DecompressionStream('deflate');
                                const readable = new Blob([data.slice(rest)]).stream().pipeThrough(ds);
                                // fallback: skip compressed iTXt if we can't decompress synchronously
                                val = new TextDecoder('utf-8').decode(data.slice(rest));
                            } catch { val = ''; }
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

        parseEXIF(buffer) {
            const view = new DataView(buffer);
            if (view.getUint16(0) !== 0xFFD8) return null;
            const texts = {};
            let offset = 2;
            while (offset < buffer.byteLength - 2) {
                const marker = view.getUint16(offset);
                if (marker === 0xFFE1) { // APP1 (EXIF)
                    const segLen = view.getUint16(offset + 2);
                    const segData = new Uint8Array(buffer, offset + 4, segLen - 2);
                    const str = new TextDecoder('utf-8', { fatal: false }).decode(segData);
                    if (str.includes('parameters')) {
                        const pIdx = str.indexOf('parameters');
                        if (pIdx >= 0) texts['parameters'] = str.substring(pIdx + 10).replace(/^\0+/, '').trim();
                    }
                    if (str.includes('UserComment')) {
                        const ucIdx = str.indexOf('UserComment');
                        if (ucIdx >= 0) {
                            let val = str.substring(ucIdx + 11).replace(/^\0+/, '').trim();
                            if (val.startsWith('UNICODE')) val = val.substring(7).replace(/^\0+/, '');
                            texts['UserComment'] = val;
                        }
                    }
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
            return r;
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

        parseComfyUI(promptStr, workflowStr) {
            const result = { source: 'ComfyUI' };
            try {
                const prompt = JSON.parse(promptStr);
                for (const [nodeId, node] of Object.entries(prompt)) {
                    const ct = node.class_type;
                    if (ct === 'CLIPTextEncode' || ct === 'WeiLinPromptUIWithoutLora') {
                        let txt = node.inputs?.text || node.inputs?.temp_str || '';
                        txt = this.tokenJsonToText(txt);
                        if (!result.positive) result.positive = txt;
                        else if (!result.negative) result.negative = txt;
                    }
                    if (ct === 'KSampler' || ct === 'KSampler (Efficient)' || ct === 'KSamplerAdvanced') {
                        const seedVal = node.inputs?.seed ?? node.inputs?.noise_seed;
                        if (seedVal != null && !Array.isArray(seedVal)) result.seed = String(seedVal);
                        if (node.inputs?.steps && typeof node.inputs.steps === 'number') result.steps = node.inputs.steps;
                        if (node.inputs?.cfg && typeof node.inputs.cfg === 'number') result.cfg = node.inputs.cfg;
                        if (typeof node.inputs?.sampler_name === 'string') result.sampler = node.inputs.sampler_name;
                        if (typeof node.inputs?.scheduler === 'string') result.scheduler = node.inputs.scheduler;
                        if (node.inputs?.denoise && typeof node.inputs.denoise === 'number') result.denoise = node.inputs.denoise;
                    }
                    if (ct === 'EmptyLatentImage') {
                        if (typeof node.inputs?.width === 'number') result.width = node.inputs.width;
                        if (typeof node.inputs?.height === 'number') result.height = node.inputs.height;
                    }
                    if (ct === 'CheckpointLoaderSimple' || ct === 'UNETLoader') {
                        result.model = node.inputs?.ckpt_name || node.inputs?.unet_name || '';
                    }
                }
            } catch {}
            if (workflowStr) {
                try { result.workflow = JSON.parse(workflowStr); } catch {}
            }
            return result;
        },

        parseNovelAI(text) {
            const result = { source: 'NovelAI' };
            try {
                const data = JSON.parse(text);
                result.positive = data.prompt || '';
                result.negative = data.uc || '';
                if (data.steps) result.steps = data.steps;
                if (data.scale) result.cfg = data.scale;
                if (data.seed) result.seed = String(data.seed);
                if (data.sampler) result.sampler = data.sampler;
                if (data.width) result.width = data.width;
                if (data.height) result.height = data.height;
            } catch {
                result.positive = text;
            }
            return result;
        },

        async parseFile(file) {
            const buffer = await file.arrayBuffer();
            let texts = null;

            if (file.type === 'image/png') {
                texts = this.parsePNG(buffer);
            } else {
                texts = this.parseEXIF(buffer);
            }

            if (!texts) return { source: '未检测到元数据', noData: true };

            // ComfyUI: has "prompt" key with JSON
            if (texts.prompt) {
                try {
                    JSON.parse(texts.prompt);
                    return this.parseComfyUI(texts.prompt, texts.workflow);
                } catch {}
            }

            // A1111/Forge: has "parameters" key
            if (texts.parameters) {
                return this.parseA1111(texts.parameters);
            }

            // NovelAI: has "Comment" or "Description"
            if (texts.Comment) return this.parseNovelAI(texts.Comment);
            if (texts.Description) return this.parseNovelAI(texts.Description);

            // Unknown format: return raw texts
            const firstVal = Object.values(texts)[0] || '';
            if (firstVal.includes('Steps:') || firstVal.includes('Negative prompt:')) {
                return this.parseA1111(firstVal);
            }

            return { source: '未知格式', positive: firstVal, raw: texts };
        }
    };

    function setupMetaImport() {
        const btn = document.getElementById('btn-import-meta');
        const inp = document.getElementById('inp-import-meta');
        const modal = document.getElementById('modal-meta');
        if (!btn || !inp || !modal) return;

        let parsedData = null;
        let previewUrl = null;

        btn.addEventListener('click', () => {
            inp.value = '';
            inp.click();
        });

        inp.addEventListener('change', async () => {
            const file = inp.files[0];
            if (!file) return;

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
                : `来源: ${parsedData.source || '未知'}`;
            source.className = 'meta-source' + (parsedData.noData ? ' meta-no-data' : '');

            const fields = document.getElementById('meta-fields');
            fields.innerHTML = '';

            if (!parsedData.noData) {
                const rows = [
                    ['正面提示词', parsedData.positive, 'positive'],
                    ['负面提示词', parsedData.negative, 'negative'],
                    ['模型', parsedData.model, 'model'],
                    ['采样器', parsedData.sampler, 'sampler'],
                    ['调度器', parsedData.scheduler, 'scheduler'],
                    ['步数', parsedData.steps, 'steps'],
                    ['CFG', parsedData.cfg, 'cfg'],
                    ['种子', parsedData.seed, 'seed'],
                    ['尺寸', parsedData.width && parsedData.height ? `${parsedData.width}×${parsedData.height}` : null, 'size'],
                    ['重绘强度', parsedData.denoise, 'denoise'],
                    ['Clip Skip', parsedData.clipSkip, 'clipSkip'],
                ];
                rows.forEach(([label, value, key]) => {
                    if (value == null || value === '') return;
                    const row = document.createElement('div');
                    row.className = 'meta-field';
                    const lbl = document.createElement('span');
                    lbl.className = 'meta-field-label';
                    lbl.textContent = label;
                    const val = document.createElement('span');
                    val.className = 'meta-field-value';
                    val.textContent = String(value).length > 200
                        ? String(value).substring(0, 200) + '...'
                        : String(value);
                    val.title = String(value);
                    row.append(lbl, val);
                    fields.appendChild(row);
                });
            }

            const rawToggle = document.getElementById('meta-raw-toggle');
            const rawContent = document.getElementById('meta-raw-content');
            const rawSection = document.getElementById('meta-raw');
            rawContent.classList.add('hidden');
            rawToggle.textContent = '▶ 原始数据';
            if (parsedData.raw || parsedData.workflow) {
                rawSection.classList.remove('hidden');
                rawContent.textContent = JSON.stringify(parsedData.raw || parsedData.workflow || parsedData, null, 2);
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
        const btn = document.getElementById('btn-dzmm');
        if (!btn) return;
        const DZMM_URL = 'https://www.dzmm.ai/draw/generate/create';
        btn.addEventListener('click', async () => {
            const positive = document.getElementById('txt-positive').value.trim();
            if (positive) {
                try {
                    await navigator.clipboard.writeText(positive);
                    showToast('正向提示词已复制到剪贴板，请在 dzmm 中粘贴');
                } catch {
                    showToast('复制失败，请手动复制提示词');
                }
            }
            window.open(DZMM_URL, 'dzmm_window', 'width=1280,height=900,menubar=no,toolbar=no,location=yes,status=no');
        });
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
            ['rng-nai-batch', 'nai-batch-val', v => v],
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
                const resetSliders = { 'rng-nai-steps': '23', 'rng-nai-cfg': '5', 'rng-nai-rescale': '0', 'rng-nai-batch': '1' };
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

        if (isVideo && !_naiStartFrameBase64) {
            showToast('视频生成需要上传首帧图片');
            return;
        }

        const batchCount = isVideo ? 1 : (parseInt(document.getElementById('rng-nai-batch').value) || 1);
        const btnGen = document.getElementById('btn-nai-generate');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        btnGen.disabled = true;
        btnGen.textContent = '生成中...';
        progressContainer.classList.remove('hidden');

        try {
            for (let batch = 0; batch < batchCount; batch++) {
                if (batchCount > 1) {
                    progressText.textContent = `第 ${batch + 1}/${batchCount} 张`;
                }
                progressBar.style.width = '10%';

                const payload = isVideo ? getNaiVideoPayload() : getNaiPayload();

                // Submit with auto-retry queue
                let job_id;
                const maxRetries = 60;
                for (let retry = 0; retry <= maxRetries; retry++) {
                    const submitRes = await fetch(endpoints.submitUrl, {
                        method: 'POST',
                        headers: endpoints.headers,
                        body: JSON.stringify(payload)
                    });

                    if (submitRes.status === 429) {
                        const errData = await submitRes.json().catch(() => ({}));
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
                        throw new Error(errData.error || `提交失败 (${submitRes.status})`);
                    }

                    const submitData = await submitRes.json();
                    job_id = submitData.job_id;
                    break;
                }
                progressBar.style.width = '30%';
                progressText.textContent = batchCount > 1 ? `第 ${batch + 1}/${batchCount} 张 - 排队中...` : '排队中...';

                // Poll
                let attempts = 0;
                let pollErrors = 0;
                const maxAttempts = 120;
                const maxPollErrors = 5;
                while (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 5000));
                    attempts++;

                    let resultRes;
                    try {
                        resultRes = await fetch(endpoints.resultUrl(job_id), { headers: endpoints.headers });
                    } catch (fetchErr) {
                        pollErrors++;
                        if (pollErrors >= maxPollErrors) throw new Error('网络错误，查询多次失败');
                        progressText.textContent = `查询暂时失败，重试中 (${pollErrors}/${maxPollErrors})...`;
                        continue;
                    }
                    if (!resultRes.ok) {
                        pollErrors++;
                        if (pollErrors >= maxPollErrors) throw new Error(`查询失败 (${resultRes.status})，已重试 ${maxPollErrors} 次`);
                        progressText.textContent = `查询暂时失败 (${resultRes.status})，重试中 (${pollErrors}/${maxPollErrors})...`;
                        continue;
                    }
                    pollErrors = 0;

                    const result = await resultRes.json();
                    const pct = Math.min(30 + (attempts / maxAttempts) * 60, 90);
                    progressBar.style.width = pct + '%';

                    if (result.status === 'completed') {
                        progressBar.style.width = '100%';
                        const mediaUrl = result.image_url || result.video_url;
                        if (mediaUrl) {
                            const resultImg = document.getElementById('result-image');
                            const placeholder = document.getElementById('result-placeholder');
                            const actions = document.getElementById('result-actions');

                            if (result.video_url) {
                                // Replace img with video element
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
                                showToast(batchCount > 1 ? `第 ${batch + 1}/${batchCount} 张生成完成！` : '图片生成完成！');
                            }
                            placeholder.classList.add('hidden');
                            if (actions) actions.classList.remove('hidden');
                        }
                        break;
                    } else if (result.status === 'failed') {
                        throw new Error(`生成失败: ${result.error || '未知错误'}`);
                    } else {
                        const statusText = result.status === 'queued' ? '排队中...' : '生成中...';
                        progressText.textContent = batchCount > 1 ? `第 ${batch + 1}/${batchCount} 张 - ${statusText}` : statusText;
                    }
                }

                if (attempts >= maxAttempts) {
                    throw new Error('生成超时，请稍后重试');
                }

                if (batch < batchCount - 1) {
                    progressText.textContent = '等待下一张...';
                    await new Promise(r => setTimeout(r, 20000));
                }
            }
        } catch (err) {
            showToast(`错误: ${err.message}`);
            console.error('NAI generate error:', err);
        } finally {
            btnGen.disabled = false;
            btnGen.textContent = 'NAI 在线生图';
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
        }
    }

    setupTheme();
    setupToggles();
    setupArchSwitch();
    setupPanelGroups();
    setupSidebarResize();
    setupWildcard();
    setupWorkflowMode();
    bindEvents();
    setupPromptTagEditor();
    setupMetaImport();
    setupDzmm();
    setupNai();
    init();
})();
