#!/usr/bin/env node
/**
 * 验证 NovelAI stealth_pngcomp LSB 编解码 + Description/Comment 合并逻辑。
 * 不依赖 Canvas：直接在 RGBA 缓冲上按官方列优先顺序写入/读取。
 */
const zlib = require('zlib');
const assert = require('assert');

function embedStealth(w, h, payloadObj) {
    const json = { ...payloadObj };
    if (json.Comment && typeof json.Comment === 'object') {
        json.Comment = JSON.stringify(json.Comment);
    }
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(json), 'utf8'));
    const magic = Buffer.from('stealth_pngcomp', 'utf8');
    const bitLen = gz.length * 8;
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(bitLen, 0);
    const stream = Buffer.concat([magic, lenBuf, gz]);

    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        pixels[i * 4] = 120;
        pixels[i * 4 + 1] = 80;
        pixels[i * 4 + 2] = 200;
        pixels[i * 4 + 3] = 255;
    }

    let p = 0;
    for (let i = 0; i < stream.length; i++) {
        const byte = stream[i];
        for (let b = 7; b >= 0; b--) {
            const bit = (byte >> b) & 1;
            const x = Math.floor(p / h);
            const y = p % h;
            const idx = (y * w + x) * 4 + 3;
            pixels[idx] = (pixels[idx] & 0xfe) | bit;
            p++;
        }
    }
    return pixels;
}

function extractStealth(pixels, w, h) {
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
    assert.ok(sigResult);
    const sig = Buffer.from(sigResult.bytes).toString('utf8');
    assert.strictEqual(sig, 'stealth_pngcomp');

    const lenResult = readBytes(sigResult.nextPixel, 4);
    const bitLen = lenResult.bytes.reduce((n, b) => (n << 8) | b, 0) >>> 0;
    const byteLen = Math.floor(bitLen / 8);
    const dataResult = readBytes(lenResult.nextPixel, byteLen);
    const jsonStr = zlib.gunzipSync(Buffer.from(dataResult.bytes)).toString('utf8');
    const data = JSON.parse(jsonStr);
    if (typeof data.Comment === 'string') data.Comment = JSON.parse(data.Comment);
    return data;
}

function parseNovelAI(input) {
    const result = { source: 'NovelAI' };
    let commentObj = null;
    let description = '';
    const takeComment = (c) => {
        if (!c) return;
        if (typeof c === 'object') { commentObj = c; return; }
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
    }
    if (commentObj) {
        result.positive = commentObj.prompt || description || '';
        result.negative = commentObj.uc || '';
        if (commentObj.steps) result.steps = commentObj.steps;
        if (commentObj.scale != null) result.cfg = commentObj.scale;
        if (commentObj.seed != null) result.seed = String(commentObj.seed);
        if (commentObj.sampler) result.sampler = commentObj.sampler;
    } else {
        result.positive = description || '';
    }
    return result;
}

function main() {
    const w = 64;
    const h = 64;
    const payload = {
        Software: 'NovelAI',
        Source: 'Stable Diffusion XL NAI',
        Description: '1girl, smile, masterpiece',
        Comment: {
            uc: 'lowres, bad anatomy',
            steps: 28,
            scale: 5,
            seed: 123456789,
            sampler: 'k_euler_ancestral',
            width: 832,
            height: 1216,
            sm: true,
            sm_dyn: false,
        },
    };

    const pixels = embedStealth(w, h, payload);
    const extracted = extractStealth(pixels, w, h);
    assert.strictEqual(extracted.Software, 'NovelAI');
    assert.strictEqual(extracted.Description, payload.Description);
    assert.strictEqual(extracted.Comment.seed, 123456789);
    assert.strictEqual(extracted.Comment.uc, 'lowres, bad anatomy');

    // 旧格式：prompt 只在 Description，Comment 无 prompt 字段
    const merged = parseNovelAI(extracted);
    assert.strictEqual(merged.positive, '1girl, smile, masterpiece');
    assert.strictEqual(merged.negative, 'lowres, bad anatomy');
    assert.strictEqual(merged.seed, '123456789');
    assert.strictEqual(merged.steps, 28);
    assert.strictEqual(merged.cfg, 5);
    assert.strictEqual(merged.sampler, 'k_euler_ancestral');

    // Comment 自带 prompt 时优先 Comment
    const withPrompt = parseNovelAI({
        Description: 'fallback prompt',
        Comment: { prompt: 'from comment', uc: 'neg', seed: 1, steps: 10, scale: 3 },
    });
    assert.strictEqual(withPrompt.positive, 'from comment');

    // 伪阳性：魔数不对应返回失败路径
    const bad = new Uint8ClampedArray(w * h * 4);
    bad.fill(255);
    let threw = false;
    try {
        extractStealth(bad, w, h);
    } catch {
        threw = true;
    }
    assert.ok(threw, 'expected magic mismatch assert');

    console.log('PASS nai stealth roundtrip + Description/Comment merge');
}

main();
