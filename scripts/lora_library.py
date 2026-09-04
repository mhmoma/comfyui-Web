"""
LoRA 库自研后端：扫描本地 models/loras、元数据缓存、Civitai 同步与下载。
供 server.py 的 /api/lora/* 路由调用。
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import struct
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

LORA_EXTS = {'.safetensors', '.pt', '.ckpt'}
PREVIEW_EXTS = ['.webp', '.jpeg', '.jpg', '.png', '.preview.png']
CACHE_DIR_NAME = '.comfyui-web-lora-cache'
CONFIG_NAME = 'lora_library_config.json'

_download_jobs: Dict[str, Dict[str, Any]] = {}
_download_lock = threading.Lock()
_scan_cache: Dict[str, Any] = {'items': [], 'ts': 0.0, 'root': ''}
_SCAN_TTL = 8.0


def _project_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _config_path() -> str:
    return os.path.join(_project_root(), CONFIG_NAME)


def _load_config() -> Dict[str, Any]:
    path = _config_path()
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_config(data: Dict[str, Any]) -> None:
    with open(_config_path(), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _cache_root(loras_root: str) -> str:
    p = os.path.join(loras_root, CACHE_DIR_NAME)
    os.makedirs(p, exist_ok=True)
    return p


def _meta_path(loras_root: str, rel_path: str) -> str:
    safe = rel_path.replace('\\', '/').strip('/')
    base = _cache_root(loras_root)
    full = os.path.join(base, 'meta', safe + '.json')
    os.makedirs(os.path.dirname(full), exist_ok=True)
    return full


def _examples_dir(loras_root: str, file_hash: str) -> str:
    d = os.path.join(_cache_root(loras_root), 'examples', file_hash[:16])
    os.makedirs(d, exist_ok=True)
    return d


def resolve_loras_root(comfyui_url: str = '') -> Optional[str]:
    cfg = _load_config()
    root = cfg.get('loras_root') or os.environ.get('COMFYUI_LORAS_PATH')
    if root and os.path.isdir(root):
        return os.path.normpath(root)

    env_root = os.environ.get('COMFYUI_ROOT')
    if env_root:
        candidate = os.path.join(env_root, 'models', 'loras')
        if os.path.isdir(candidate):
            cfg['loras_root'] = candidate
            _save_config(cfg)
            return candidate

    base = _project_root()
    candidates = [
        os.path.join(base, 'ComfyUI', 'models', 'loras'),
        os.path.join(base, '..', 'ComfyUI', 'models', 'loras'),
        os.path.join(base, '..', 'ComfyUI-aki-v2', 'ComfyUI', 'models', 'loras'),
        r'D:\ComfyUI-aki-v2\ComfyUI\models\loras',
    ]
    for c in candidates:
        c = os.path.normpath(c)
        if os.path.isdir(c):
            cfg['loras_root'] = c
            _save_config(cfg)
            return c
    return None


def set_loras_root(path: str) -> Dict[str, Any]:
    path = os.path.normpath(path)
    if not os.path.isdir(path):
        raise ValueError(f'目录不存在: {path}')
    cfg = _load_config()
    cfg['loras_root'] = path
    _save_config(cfg)
    _scan_cache['ts'] = 0
    return {'ok': True, 'loras_root': path}


def get_civitai_settings() -> Dict[str, str]:
    cfg = _load_config()
    return {
        'api_key': cfg.get('civitai_api_key') or os.environ.get('CIVITAI_API_KEY', ''),
        'host': (cfg.get('civitai_host') or 'civitai.red').strip().rstrip('/'),
    }


def set_civitai_settings(api_key: str = '', host: str = '') -> Dict[str, Any]:
    cfg = _load_config()
    if api_key is not None:
        cfg['civitai_api_key'] = api_key.strip()
    if host:
        cfg['civitai_host'] = host.strip().rstrip('/')
    _save_config(cfg)
    return {'ok': True}


def _read_json(path: str) -> Dict[str, Any]:
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _write_json(path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_safetensors_header(path: str) -> Dict[str, Any]:
    try:
        with open(path, 'rb') as f:
            header_len = struct.unpack('<Q', f.read(8))[0]
            if header_len > 32 * 1024 * 1024:
                return {}
            raw = f.read(header_len)
            header = json.loads(raw.decode('utf-8'))
            return header.get('__metadata__') or {}
    except Exception:
        return {}


def file_sha256(path: str, chunk: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            block = f.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def find_preview(full_path: str) -> Optional[str]:
    base, _ = os.path.splitext(full_path)
    for ext in PREVIEW_EXTS:
        p = base + ext
        if os.path.isfile(p):
            return p
    return None


def _rel_path(loras_root: str, full_path: str) -> str:
    return os.path.relpath(full_path, loras_root).replace('\\', '/')


def load_item_meta(loras_root: str, rel_path: str) -> Dict[str, Any]:
    return _read_json(_meta_path(loras_root, rel_path))


def save_item_meta(loras_root: str, rel_path: str, meta: Dict[str, Any]) -> None:
    _write_json(_meta_path(loras_root, rel_path), meta)


def scan_loras(loras_root: str, force: bool = False) -> List[Dict[str, Any]]:
    now = time.time()
    if (
        not force
        and _scan_cache.get('root') == loras_root
        and now - _scan_cache.get('ts', 0) < _SCAN_TTL
        and _scan_cache.get('items')
    ):
        return _scan_cache['items']

    items: List[Dict[str, Any]] = []
    if not loras_root or not os.path.isdir(loras_root):
        _scan_cache.update({'items': [], 'ts': now, 'root': loras_root})
        return items

    for dirpath, _, filenames in os.walk(loras_root):
        if CACHE_DIR_NAME in dirpath.replace('\\', '/').split('/'):
            continue
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext not in LORA_EXTS:
                continue
            full = os.path.join(dirpath, name)
            rel = _rel_path(loras_root, full)
            folder = os.path.dirname(rel).replace('\\', '/')
            if folder == '.':
                folder = ''
            stat = os.stat(full)
            cached = load_item_meta(loras_root, rel)
            preview = find_preview(full)
            items.append({
                'file_name': os.path.splitext(name)[0],
                'name': rel.replace('\\', '/'),
                'rel_path': rel,
                'folder': folder,
                'file_path': full,
                'file_size': stat.st_size,
                'modified': stat.st_mtime,
                'preview_local': preview,
                'model_name': cached.get('model_name') or os.path.splitext(name)[0],
                'base_model': cached.get('base_model') or '',
                'tags': cached.get('tags') or [],
                'trigger_words': cached.get('trigger_words') or [],
                'from_civitai': bool(cached.get('from_civitai')),
                'civitai': cached.get('civitai') or {},
                'sha256': cached.get('sha256') or '',
            })
    items.sort(key=lambda x: x['model_name'].lower())
    _scan_cache.update({'items': items, 'ts': now, 'root': loras_root})
    return items


def filter_items(
    items: List[Dict[str, Any]],
    q: str = '',
    base_model: str = '',
    folder: str = '',
) -> List[Dict[str, Any]]:
    q = (q or '').strip().lower()
    base_model = (base_model or '').strip().lower()
    folder = (folder or '').strip().replace('\\', '/').strip('/')
    out = []
    for it in items:
        if base_model and (it.get('base_model') or '').lower() != base_model:
            continue
        if folder and not (it.get('folder') or '').replace('\\', '/').startswith(folder):
            continue
        if q:
            hay = ' '.join([
                it.get('model_name', ''),
                it.get('name', ''),
                it.get('folder', ''),
                ' '.join(it.get('tags') or []),
                ' '.join(it.get('trigger_words') or []),
            ]).lower()
            if q not in hay:
                continue
        out.append(it)
    return out


def paginate(items: List[Dict[str, Any]], page: int, page_size: int) -> Dict[str, Any]:
    page = max(1, int(page or 1))
    page_size = max(1, min(200, int(page_size or 40)))
    total = len(items)
    total_pages = max(1, (total + page_size - 1) // page_size)
    if page > total_pages:
        page = total_pages
    start = (page - 1) * page_size
    chunk = items[start:start + page_size]
    return {
        'items': chunk,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
    }


def civitai_request(path: str, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    host = host.replace('https://', '').replace('http://', '').strip('/')
    url = f'https://{host}/api/v1{path}'
    headers = {'User-Agent': 'comfyui-web-lora-library/1.0'}
    if api_key:
        headers['Authorization'] = f'Bearer {api_key}'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Civitai HTTP {e.code}: {body[:300]}') from e


def civitai_by_hash(file_hash: str, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    return civitai_request(f'/model-versions/by-hash/{file_hash}', api_key, host)


def civitai_model(model_id: int, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    return civitai_request(f'/models/{model_id}', api_key, host)


def civitai_search(query: str, limit: int = 20, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    q = urllib.parse.quote(query)
    return civitai_request(f'/models?query={q}&limit={limit}&types=LORA', api_key, host)


def _extract_civitai_fields(version: Dict[str, Any], model: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    model = model or {}
    trained = version.get('trainedWords') or []
    if isinstance(trained, str):
        trained = [trained]
    tags = []
    for t in (model.get('tags') or []):
        if isinstance(t, dict):
            tags.append(t.get('name', ''))
        else:
            tags.append(str(t))
    images = version.get('images') or []
    return {
        'model_name': model.get('name') or version.get('name') or '',
        'base_model': version.get('baseModel') or '',
        'tags': [t for t in tags if t],
        'trigger_words': [w for w in trained if w],
        'from_civitai': True,
        'civitai': {
            'id': version.get('id'),
            'modelId': model.get('id') or version.get('modelId'),
            'name': version.get('name'),
            'trainedWords': trained,
            'downloadUrl': version.get('downloadUrl'),
        },
        'preview_url': images[0].get('url') if images else '',
        'example_images': [img.get('url') for img in images if img.get('url')],
    }


def sync_item_civitai(loras_root: str, rel_path: str, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    items = scan_loras(loras_root)
    item = next((x for x in items if x['rel_path'] == rel_path.replace('\\', '/')), None)
    if not item:
        raise ValueError('LoRA 文件未找到')

    full = item['file_path']
    meta = load_item_meta(loras_root, rel_path)
    file_hash = meta.get('sha256') or item.get('sha256')
    if not file_hash:
        file_hash = file_sha256(full)
        meta['sha256'] = file_hash

    ss_meta = read_safetensors_header(full)
    civitai_meta = {}
    for key in ('sshs_model_hash', 'sshs_legacy_hash', 'ss_sd_model_hash', 'civitai_model_id', 'civitai_version_id'):
        if ss_meta.get(key):
            civitai_meta[key] = ss_meta[key]

    # 优先按多种 hash 精确命中，避免文件名搜索张冠李戴
    hash_candidates: List[str] = []
    for h in (
        file_hash,
        ss_meta.get('sshs_model_hash'),
        ss_meta.get('sshs_legacy_hash'),
        ss_meta.get('ss_sd_model_hash'),
        meta.get('autov2'),
        meta.get('autov3'),
    ):
        if not h:
            continue
        h = str(h).strip().lower()
        if h and h not in hash_candidates:
            hash_candidates.append(h)

    version: Dict[str, Any] = {}
    last_err: Optional[Exception] = None
    for h in hash_candidates:
        try:
            version = civitai_by_hash(h, api_key, host)
            if version and version.get('id'):
                break
        except Exception as e:
            last_err = e
            version = {}

    if not version or not version.get('id'):
        # 可选：按「剥掉中文备注后的文件名」做严格搜索（仍无把握则失败）
        stem = os.path.splitext(os.path.basename(rel_path))[0]
        cut = None
        for i, ch in enumerate(stem):
            if '\u3040' <= ch <= '\u30ff' or '\u3400' <= ch <= '\u9fff':
                cut = i
                break
        if cut and cut > 0:
            stem = stem[:cut].rstrip('_- ')
        try:
            search = civitai_search(stem, 20, api_key, host)
            items_s = search.get('items') or []
            stem_l = stem.lower().replace(' ', '_').replace('-', '_')
            best = None
            best_score = 0
            for m in items_s:
                for v in (m.get('modelVersions') or []):
                    for f in (v.get('files') or []):
                        fn = (f.get('name') or '').lower().replace('.safetensors', '').replace('.pt', '').replace('.ckpt', '')
                        fn = fn.replace(' ', '_').replace('-', '_')
                        score = 0
                        if fn == stem_l:
                            score = 40
                        elif fn.startswith(stem_l) or stem_l.startswith(fn):
                            score = 28
                        elif stem_l in fn or fn in stem_l:
                            ratio = min(len(fn), len(stem_l)) / max(len(fn), len(stem_l), 1)
                            score = 16 if ratio >= 0.55 else 0
                        if score > best_score:
                            best_score = score
                            best = (m, v)
            if best and best_score >= 16:
                model_pre, version = best[0], best[1]
                extracted = _extract_civitai_fields(version, model_pre)
                merged = {**meta, **extracted, 'sha256': file_hash, 'synced_at': time.time(), 'match_via': 'strict_name'}
                save_item_meta(loras_root, rel_path, merged)
                _scan_cache['ts'] = 0
                return {'ok': True, 'item': {**item, **merged}}
        except Exception as e:
            last_err = e
        raise RuntimeError(
            f'无法用 hash/严格文件名匹配 C 站（请改用模型 ID）。最后错误: {last_err}'
        )

    model = {}
    model_id = version.get('modelId')
    if model_id:
        try:
            model = civitai_model(int(model_id), api_key, host)
        except Exception:
            model = {}

    extracted = _extract_civitai_fields(version, model)
    merged = {
        **meta,
        **extracted,
        **civitai_meta,
        'sha256': file_hash,
        'synced_at': time.time(),
        'match_via': 'hash',
    }
    save_item_meta(loras_root, rel_path, merged)

    preview_local = find_preview(full)
    if not preview_local and extracted.get('preview_url'):
        try:
            preview_local = _download_preview(extracted['preview_url'], full)
            merged['preview_local'] = preview_local
        except Exception:
            pass

    _scan_cache['ts'] = 0
    return {'ok': True, 'item': {**item, **merged}}


def _download_preview(url: str, lora_full_path: str) -> str:
    base, _ = os.path.splitext(lora_full_path)
    dest = base + '.webp'
    req = urllib.request.Request(url, headers={'User-Agent': 'comfyui-web/1.0'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(dest, 'wb') as f:
        f.write(data)
    return dest


def download_civitai_version(
    loras_root: str,
    version_id: int,
    subfolder: str = '',
    filename: str = '',
    api_key: str = '',
    host: str = 'civitai.com',
    job_id: str = '',
) -> Dict[str, Any]:
    version = civitai_request(f'/model-versions/{version_id}', api_key, host)
    files = version.get('files') or []
    if not files:
        raise RuntimeError('该版本没有可下载文件')
    primary = files[0]
    url = primary.get('downloadUrl')
    if not url:
        raise RuntimeError('缺少下载地址')
    if not filename:
        filename = primary.get('name') or f'lora_{version_id}.safetensors'
    filename = re.sub(r'[\\/:*?"<>|]+', '_', filename)
    dest_dir = os.path.join(loras_root, subfolder.replace('\\', '/').strip('/')) if subfolder else loras_root
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, filename)

    job_id = job_id or hashlib.md5(f'{version_id}:{time.time()}'.encode()).hexdigest()[:12]
    with _download_lock:
        _download_jobs[job_id] = {'status': 'downloading', 'progress': 0, 'dest': dest, 'error': ''}

    def worker():
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'comfyui-web/1.0'})
            if api_key:
                req.add_header('Authorization', f'Bearer {api_key}')
            with urllib.request.urlopen(req, timeout=600) as resp:
                total = int(resp.headers.get('Content-Length') or 0)
                done = 0
                chunk_size = 1024 * 256
                with open(dest, 'wb') as out:
                    while True:
                        chunk = resp.read(chunk_size)
                        if not chunk:
                            break
                        out.write(chunk)
                        done += len(chunk)
                        prog = int(done * 100 / total) if total else min(95, done // (1024 * 1024))
                        with _download_lock:
                            _download_jobs[job_id]['progress'] = prog
            rel = _rel_path(loras_root, dest)
            try:
                sync_item_civitai(loras_root, rel, api_key, host)
            except Exception:
                pass
            with _download_lock:
                _download_jobs[job_id].update({'status': 'done', 'progress': 100, 'rel_path': rel})
            _scan_cache['ts'] = 0
        except Exception as e:
            with _download_lock:
                _download_jobs[job_id].update({'status': 'error', 'error': str(e)})

    threading.Thread(target=worker, daemon=True).start()
    return {'ok': True, 'job_id': job_id, 'dest': dest}


def download_progress(job_id: str) -> Dict[str, Any]:
    with _download_lock:
        job = _download_jobs.get(job_id)
    if not job:
        return {'ok': False, 'error': 'job not found'}
    return {'ok': True, **job}


def get_detail(loras_root: str, rel_path: str) -> Dict[str, Any]:
    items = scan_loras(loras_root)
    rel_path = rel_path.replace('\\', '/')
    item = next((x for x in items if x['rel_path'] == rel_path), None)
    if not item:
        raise ValueError('未找到 LoRA')
    meta = load_item_meta(loras_root, rel_path)
    merged = {**item, **meta}
    examples = merged.get('example_images') or []
    file_hash = merged.get('sha256') or ''
    if file_hash:
        ex_dir = _examples_dir(loras_root, file_hash)
        if os.path.isdir(ex_dir):
            local_ex = []
            for fn in sorted(os.listdir(ex_dir)):
                if fn.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    local_ex.append(os.path.join(ex_dir, fn))
            if local_ex:
                merged['example_images_local'] = local_ex
    merged['example_images'] = examples
    return merged


def fetch_example_images(loras_root: str, rel_path: str, api_key: str = '', host: str = 'civitai.com') -> Dict[str, Any]:
    detail = get_detail(loras_root, rel_path)
    urls = detail.get('example_images') or []
    if not urls and detail.get('civitai', {}).get('id'):
        version = civitai_request(f'/model-versions/{detail["civitai"]["id"]}', api_key, host)
        urls = [img.get('url') for img in (version.get('images') or []) if img.get('url')]
    file_hash = detail.get('sha256') or file_sha256(detail['file_path'])
    ex_dir = _examples_dir(loras_root, file_hash)
    saved = []
    for i, url in enumerate(urls[:12]):
        ext = '.jpeg'
        if '.png' in url.lower():
            ext = '.png'
        elif '.webp' in url.lower():
            ext = '.webp'
        dest = os.path.join(ex_dir, f'{i:02d}{ext}')
        if os.path.isfile(dest):
            saved.append(dest)
            continue
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'comfyui-web/1.0'})
            with urllib.request.urlopen(req, timeout=60) as resp:
                with open(dest, 'wb') as f:
                    f.write(resp.read())
            saved.append(dest)
        except Exception:
            continue
    meta = load_item_meta(loras_root, rel_path)
    meta['sha256'] = file_hash
    meta['example_images'] = urls
    save_item_meta(loras_root, rel_path, meta)
    return {'ok': True, 'paths': saved, 'urls': urls}


def status(comfyui_url: str = '') -> Dict[str, Any]:
    root = resolve_loras_root(comfyui_url)
    civ = get_civitai_settings()
    count = len(scan_loras(root)) if root else 0
    return {
        'ok': True,
        'available': bool(root),
        'loras_root': root or '',
        'count': count,
        'civitai_configured': bool(civ.get('api_key')),
        'civitai_host': civ.get('host'),
        'bridge': 'server.py',
    }


def handle_api(method: str, path: str, query: Dict[str, str], body: Dict[str, Any], comfyui_url: str) -> Tuple[int, Dict[str, Any]]:
    root = resolve_loras_root(comfyui_url)
    civ = get_civitai_settings()

    if path == '/api/lora/status' and method == 'GET':
        return 200, status(comfyui_url)

    if path == '/api/lora/config' and method == 'GET':
        return 200, {'ok': True, 'loras_root': root or '', **civ, 'api_key_set': bool(civ.get('api_key'))}

    if path == '/api/lora/config' and method == 'POST':
        if body.get('loras_root'):
            set_loras_root(body['loras_root'])
        if 'civitai_api_key' in body or 'civitai_host' in body:
            set_civitai_settings(body.get('civitai_api_key', ''), body.get('civitai_host', ''))
        return 200, {'ok': True}

    if not root:
        return 503, {'ok': False, 'error': '未找到 LoRA 目录，请在设置中配置 loras 路径或运行 server.py 时指定 ComfyUI 路径'}

    if path == '/api/lora/list' and method == 'GET':
        force = query.get('refresh') == '1'
        items = scan_loras(root, force=force)
        filtered = filter_items(
            items,
            q=query.get('q', ''),
            base_model=query.get('base_model', ''),
            folder=query.get('folder', ''),
        )
        page = paginate(filtered, int(query.get('page', '1')), int(query.get('page_size', '40')))
        slim = []
        for it in page['items']:
            slim.append({
                'model_name': it.get('model_name'),
                'name': it.get('name'),
                'rel_path': it.get('rel_path'),
                'folder': it.get('folder'),
                'base_model': it.get('base_model'),
                'tags': it.get('tags'),
                'trigger_words': it.get('trigger_words'),
                'from_civitai': it.get('from_civitai'),
                'file_size': it.get('file_size'),
                'preview_url': f"/api/lora/preview?rel={urllib.parse.quote(it['rel_path'])}",
                'has_preview': bool(it.get('preview_local')),
            })
        return 200, {**page, 'items': slim}

    if path == '/api/lora/detail' and method == 'GET':
        rel = query.get('rel') or query.get('path') or ''
        if not rel:
            return 400, {'ok': False, 'error': 'missing rel'}
        detail = get_detail(root, rel)
        detail['preview_url'] = f"/api/lora/preview?rel={urllib.parse.quote(detail['rel_path'])}"
        return 200, {'ok': True, 'item': detail}

    if path == '/api/lora/preview' and method == 'GET':
        rel = query.get('rel') or ''
        if not rel:
            return 400, {'ok': False, 'error': 'missing rel'}
        full = os.path.join(root, rel.replace('/', os.sep))
        if not os.path.isfile(full):
            items = scan_loras(root)
            item = next((x for x in items if x['rel_path'] == rel.replace('\\', '/')), None)
            preview = item.get('preview_local') if item else None
            if preview and os.path.isfile(preview):
                full = preview
            else:
                return 404, {'ok': False, 'error': 'preview not found'}
        else:
            preview = find_preview(full)
            if preview:
                full = preview
            elif not full.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                return 404, {'ok': False, 'error': 'no preview'}
        return 0, {'__file__': full}

    if path == '/api/lora/example' and method == 'GET':
        rel = query.get('rel') or ''
        idx = int(query.get('i', '0'))
        detail = get_detail(root, rel)
        local = detail.get('example_images_local') or []
        if idx < len(local) and os.path.isfile(local[idx]):
            return 0, {'__file__': local[idx]}
        urls = detail.get('example_images') or []
        if idx < len(urls):
            return 302, {'__redirect__': urls[idx]}
        return 404, {'ok': False, 'error': 'example not found'}

    if path == '/api/lora/sync-civitai' and method == 'POST':
        rel = body.get('rel') or body.get('rel_path') or ''
        if not rel:
            return 400, {'ok': False, 'error': 'missing rel'}
        try:
            result = sync_item_civitai(root, rel, civ.get('api_key', ''), civ.get('host', 'civitai.com'))
            return 200, result
        except Exception as e:
            return 500, {'ok': False, 'error': str(e)}

    if path == '/api/lora/fetch-examples' and method == 'POST':
        rel = body.get('rel') or ''
        if not rel:
            return 400, {'ok': False, 'error': 'missing rel'}
        try:
            result = fetch_example_images(root, rel, civ.get('api_key', ''), civ.get('host', 'civitai.com'))
            return 200, result
        except Exception as e:
            return 500, {'ok': False, 'error': str(e)}

    if path == '/api/lora/download-civitai' and method == 'POST':
        version_id = int(body.get('version_id') or 0)
        if not version_id:
            return 400, {'ok': False, 'error': 'missing version_id'}
        try:
            result = download_civitai_version(
                root,
                version_id,
                subfolder=body.get('subfolder', ''),
                filename=body.get('filename', ''),
                api_key=civ.get('api_key', ''),
                host=civ.get('host', 'civitai.com'),
            )
            return 200, result
        except Exception as e:
            return 500, {'ok': False, 'error': str(e)}

    if path == '/api/lora/download-progress' and method == 'GET':
        job_id = query.get('job_id') or ''
        return 200, download_progress(job_id)

    if path == '/api/lora/civitai/search' and method == 'GET':
        q = query.get('q') or ''
        if not q:
            return 400, {'ok': False, 'error': 'missing q'}
        try:
            data = civitai_search(q, int(query.get('limit', '20')), civ.get('api_key', ''), civ.get('host', 'civitai.com'))
            return 200, {'ok': True, 'data': data}
        except Exception as e:
            return 500, {'ok': False, 'error': str(e)}

    return 404, {'ok': False, 'error': 'not found'}
