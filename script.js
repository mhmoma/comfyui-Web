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
    };

    // ==================== 开关面板逻辑 ====================
    function setupToggles() {
        const pairs = [
            [dom.chkVae, dom.panelVae],
            [dom.chkLora, dom.panelLora],
            [dom.chkHires, dom.panelHires],
            [dom.chkControlnet, dom.panelControlnet],
            [dom.chkImg2img, dom.panelImg2img],
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

    function setupArchSwitch() {
        dom.selArch.addEventListener('change', () => {
            const isAnima = dom.selArch.value === 'anima';
            dom.panelSdxlModel.classList.toggle('hidden', isAnima);
            dom.panelAnimaModel.classList.toggle('hidden', !isAnima);
            if (isAnima) {
                dom.inpWidth.value = 832;
                dom.inpHeight.value = 1216;
                dom.inpSteps.value = 30;
                dom.inpCfg.value = 4;
            } else {
                dom.inpWidth.value = 1024;
                dom.inpHeight.value = 1536;
                dom.inpSteps.value = 30;
                dom.inpCfg.value = 6;
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
        const useImg2img = dom.chkImg2img.checked && uploadedImages.img2img;

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

        // CLIP Text Encode - Positive
        const posId = id();
        nodes[posId] = {
            class_type: "CLIPTextEncode",
            inputs: { text: dom.txtPositive.value || '', clip: clipOut },
        };

        // CLIP Text Encode - Negative
        const negId = id();
        nodes[negId] = {
            class_type: "CLIPTextEncode",
            inputs: { text: dom.txtNegative.value || '', clip: clipOut },
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

        // Save Image
        const saveId = id();
        nodes[saveId] = {
            class_type: "SaveImage",
            inputs: { filename_prefix: "ComfyUI_Web", images: [decodeId, 0] },
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

            if (dom.chkImg2img.checked && dom.inpRefImage.files[0]) {
                const res = await uploadImage(dom.inpRefImage.files[0]);
                uploadedImages.img2img = res.name;
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

    async function fetchResult(promptId) {
        // Retry a few times in case outputs are still being written
        for (let attempt = 0; attempt < 5; attempt++) {
            const history = await apiGet(`/history/${promptId}`);
            const outputs = history[promptId]?.outputs;
            if (!outputs) { await new Promise(r => setTimeout(r, 1000)); continue; }

            let mainImage = null;
            let previewImage = null;

            for (const nodeId of Object.keys(outputs)) {
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                    for (const img of nodeOutput.images) {
                        const url = `${getServer()}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${img.type || 'output'}`;
                        if (img.filename.startsWith('CN_Preview')) {
                            previewImage = url;
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

            if (mainImage) {
                showResult(mainImage);
                return;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    function showResult(url) {
        dom.resultImage.src = url;
        dom.resultImage.classList.remove('hidden');
        dom.resultPlaceholder.classList.add('hidden');
        dom.resultActions.classList.remove('hidden');
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
        dom.btnGenerate.addEventListener('click', generate);

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
                if (!dom.btnGenerate.disabled) generate();
            }
        });
    }

    // ==================== 标签选择器（双面板） ====================
    let tagData = [];

    async function loadTags() {
        try {
            const res = await fetch(`${getServer() || ''}/tags.json`);
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
            this.render();
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
            const subs = tagData[this.groupIdx]?.subgroups || [];
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

            items.forEach(tag => {
                const div = document.createElement('div');
                const isSelected = selected.has(tag.t);
                const weight = this.getTagWeight(tag.t);
                div.className = 'tag-item' + (isSelected ? ' selected' : '');
                div.innerHTML = `<span class="tag-desc">${tag.d}</span><span class="tag-text">${tag.t}</span><span class="tag-weight">${weight.toFixed(1)}</span>`;
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
                set.add(m ? m[1] : p);
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
            let parts = this.textarea.value.split(',').map(s => s.trim()).filter(Boolean);
            const idx = parts.findIndex(p => {
                const m = p.match(/^\((.+?):([\d.]+)\)$/);
                return (m ? m[1] : p) === tagText;
            });
            if (idx >= 0) {
                parts.splice(idx, 1);
            } else {
                parts.push(tagText);
            }
            this.textarea.value = parts.join(', ');
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
        }
    }

    function setupTagPickers() {
        if (tagData.length === 0) return;
        new TagPicker('pos', dom.txtPositive);
        new TagPicker('neg', dom.txtNegative);

        // Collapse toggle for negative
        const toggle = document.getElementById('neg-collapse-toggle');
        const body = document.getElementById('tag-picker-neg');
        toggle.addEventListener('click', () => {
            const hidden = body.classList.toggle('hidden');
            toggle.textContent = hidden ? '▶ 展开标签选择器' : '▼ 收起标签选择器';
            toggle.classList.toggle('expanded', !hidden);
        });

        // Copy buttons
        document.querySelectorAll('.btn-copy-prompt').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById(btn.dataset.target);
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

    setupToggles();
    setupArchSwitch();
    bindEvents();
    init();
})();
