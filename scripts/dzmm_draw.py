# -*- coding: utf-8 -*-
"""DZMM 生图本地代理（供 server.py 调用）。"""
from __future__ import annotations

import base64
import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

DZMM_BASE = "https://www.dzmm.ai"
SSL_CTX = ssl.create_default_context()
CONFIG_NAME = "dzmm_config.json"
OUTPUT_DIRNAME = "outputs_dzmm"

# 单次请求可选覆盖（来自 X-Dzmm-Cookie），不写盘
_REQUEST_COOKIE: Optional[str] = None

# 与官网 /draw/generate/create 一致（见 EPGadGF32.js modelDimensions）
MODEL_META: Dict[str, Dict[str, Any]] = {
    "anime": {
        "id": "anime",
        "label": "Anime 动漫",
        "quotaType": "draw",
        "defaultDimension": "1:1",
        "dimensions": [
            {"value": "1:1", "label": "1:1 方形", "pixels": "2048×2048"},
            {"value": "2:3", "label": "2:3 竖图", "pixels": "1664×2496"},
            {"value": "3:2", "label": "3:2 横图", "pixels": "2496×1664"},
        ],
    },
    "iroha": {
        "id": "iroha",
        "label": "Iroha",
        "quotaType": "draw",
        "defaultDimension": "9:16",
        "dimensions": [
            {"value": "9:16", "label": "9:16 竖屏", "pixels": "1440×2560"},
            {"value": "1:1", "label": "1:1 方形", "pixels": "2048×2048"},
            {"value": "2:3", "label": "2:3 竖拍", "pixels": "1664×2496"},
            {"value": "3:4", "label": "3:4 竖照", "pixels": "1728×2304"},
            {"value": "3:2", "label": "3:2 横图", "pixels": "2496×1664"},
            {"value": "4:3", "label": "4:3 传统", "pixels": "2304×1728"},
            {"value": "16:9", "label": "16:9 宽屏", "pixels": "2560×1440"},
        ],
    },
    "z-image": {
        "id": "z-image",
        "label": "Z-Image",
        "quotaType": "edit",
        "defaultDimension": "4:3",
        "dimensions": [
            {"value": "1:1", "label": "1:1 方形", "pixels": "2048×2048"},
            {"value": "4:3", "label": "4:3 传统", "pixels": "2304×1728"},
            {"value": "3:4", "label": "3:4 竖照", "pixels": "1728×2304"},
            {"value": "16:9", "label": "16:9 宽屏", "pixels": "2560×1440"},
            {"value": "9:16", "label": "9:16 竖屏", "pixels": "1440×2560"},
            {"value": "3:2", "label": "3:2 经典", "pixels": "2496×1664"},
            {"value": "2:3", "label": "2:3 竖拍", "pixels": "1664×2496"},
            {"value": "21:9", "label": "21:9 超宽", "pixels": "3024×1296"},
        ],
    },
}

# 旧模型名映射到当前可用模型
MODEL_ALIASES = {
    "realistic": "iroha",
    "anima": "iroha",
    "vivid": "iroha",
    "nalang-dream": "z-image",
    "nalang-coser-2": "z-image",
}

DIMENSION_PIXELS = {
    "1:1": (2048, 2048),
    "4:3": (2304, 1728),
    "3:4": (1728, 2304),
    "16:9": (2560, 1440),
    "9:16": (1440, 2560),
    "3:2": (2496, 1664),
    "2:3": (1664, 2496),
    "21:9": (3024, 1296),
}


def normalize_model(model: str) -> str:
    m = (model or "anime").strip()
    m = MODEL_ALIASES.get(m, m)
    if m not in MODEL_META:
        return "anime"
    return m


def ensure_dimension(model: str, dimension: str) -> str:
    meta = MODEL_META[normalize_model(model)]
    allowed = {d["value"] for d in meta["dimensions"]}
    if dimension in allowed:
        return dimension
    return meta["defaultDimension"]


def list_models() -> list:
    return [
        {
            "id": m["id"],
            "label": m["label"],
            "quotaType": m["quotaType"],
            "defaultDimension": m["defaultDimension"],
            "dimensions": m["dimensions"],
        }
        for m in MODEL_META.values()
    ]


def _root() -> Path:
    return Path(__file__).resolve().parent.parent


def _config_path() -> Path:
    return _root() / CONFIG_NAME


def _output_dir() -> Path:
    d = _root() / OUTPUT_DIRNAME
    d.mkdir(parents=True, exist_ok=True)
    return d


def load_config() -> Dict[str, Any]:
    path = _config_path()
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_config(cfg: Dict[str, Any]) -> None:
    _config_path().write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_cookie(raw: str) -> str:
    """Accept full Cookie header, chunked sb-rls-auth-token.N, or bare base64 token."""
    text = (raw or "").strip().strip('"').strip("'")
    if not text:
        return ""

    # Multi-line paste: either name=value per line, or bare chunk values in order
    lines = [ln.strip().strip('"').strip("'") for ln in text.splitlines() if ln.strip()]
    if len(lines) >= 2:
        kv_chunks = []
        bare_chunks = []
        for ln in lines:
            if "sb-rls-auth-token." in ln and "=" in ln:
                kv_chunks.append(ln.split(";", 1)[0].strip())
            elif ln.startswith("base64-") or ln.startswith("eyJ") or (
                len(ln) > 40 and "=" not in ln[:20]
            ):
                bare_chunks.append(ln)
        if kv_chunks:
            return "; ".join(kv_chunks)
        if bare_chunks:
            return "; ".join(f"sb-rls-auth-token.{i}={v}" for i, v in enumerate(bare_chunks))

    # Already a cookie header (incl. chunked .0/.1/.2)
    if "sb-rls-auth-token" in text or ";" in text:
        return text
    # Bare supabase session JSON / base64 token value
    if text.startswith("base64-") or text.startswith("eyJ"):
        return f"sb-rls-auth-token={text}"
    return text


def get_cookie() -> str:
    if _REQUEST_COOKIE:
        return normalize_cookie(_REQUEST_COOKIE)
    cfg = load_config()
    cookie = normalize_cookie(cfg.get("cookie") or "")
    if cookie:
        return cookie
    # 仅本机可选兜底文件（不进仓库）
    for candidate in (
        _root() / "_dzmm_cookie.txt",
        _root().parent / "_dzmm_cookie.txt",
    ):
        try:
            if candidate.is_file():
                text = normalize_cookie(candidate.read_text(encoding="utf-8"))
                if text:
                    return text
        except Exception:
            pass
    return ""


def set_cookie(cookie: str) -> Dict[str, Any]:
    cfg = load_config()
    cfg["cookie"] = normalize_cookie(cookie)
    save_config(cfg)
    return {"ok": True, "hasCookie": bool(cfg["cookie"])}


def _cookie_from_jar(jar: CookieJar) -> str:
    single = ""
    chunks: Dict[int, str] = {}
    for c in jar:
        if not c.name or not c.value:
            continue
        if c.name == "sb-rls-auth-token":
            single = c.value
            continue
        if c.name.startswith("sb-rls-auth-token."):
            suffix = c.name.split(".", 1)[-1]
            if suffix.isdigit():
                chunks[int(suffix)] = c.value
    if chunks:
        value = "".join(chunks[i] for i in sorted(chunks))
        return normalize_cookie(f"sb-rls-auth-token={value}")
    if single:
        return normalize_cookie(f"sb-rls-auth-token={single}")
    return ""


def login_with_password(email: str, password: str) -> Dict[str, Any]:
    """代理 dzmm.ai 账号密码登录，返回完整 cookie（本机可写入配置）。"""
    mail = (email or "").strip()
    passwd = password or ""
    if not mail or not passwd:
        return {"ok": False, "error": "请填写邮箱和密码"}

    jar = CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.HTTPSHandler(context=SSL_CTX),
    )
    payload = json.dumps({"email": mail, "password": passwd}).encode("utf-8")
    req = urllib.request.Request(
        f"{DZMM_BASE}/api/auth/sign-in",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": DZMM_BASE,
            "Referer": f"{DZMM_BASE}/sign-in",
            "User-Agent": "Mozilla/5.0 ComfyUI-Web-DZMM",
        },
        method="POST",
    )
    try:
        with opener.open(req, timeout=60) as resp:
            status = resp.status
            raw = resp.read()
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read()
    except Exception as e:
        return {"ok": False, "error": f"登录请求失败: {e}"}

    cookie = _cookie_from_jar(jar)
    data = None
    try:
        data = json.loads(raw.decode("utf-8", errors="replace"))
    except Exception:
        data = None

    if (not cookie or "sb-rls-auth-token=" not in cookie) and isinstance(data, dict):
        session = (
            data.get("session")
            or (data.get("data") or {}).get("session")
            or data
        )
        if isinstance(session, dict) and (session.get("access_token") or session.get("refresh_token")):
            raw_b64 = (
                base64.b64encode(json.dumps(session, separators=(",", ":")).encode("utf-8"))
                .decode("ascii")
                .rstrip("=")
            )
            cookie = normalize_cookie(f"sb-rls-auth-token=base64-{raw_b64}")

    cookie = normalize_cookie(cookie)
    if not cookie or "sb-rls-auth-token=" not in cookie:
        msg = ""
        if isinstance(data, dict):
            msg = data.get("error") or data.get("message") or data.get("msg") or ""
        if not msg:
            msg = raw[:200].decode("utf-8", errors="replace") if raw else f"登录失败 HTTP {status}"
        return {"ok": False, "error": str(msg), "status": status, "code": "LOGIN_FAILED"}

    set_cookie(cookie)
    return {
        "ok": True,
        "cookie": cookie,
        "status": status,
        "storage": "local-config",
        "message": "登录成功，Cookie 已写入本机配置",
        "method": "password",
    }


def start_telegram_login() -> Dict[str, Any]:
    req = urllib.request.Request(
        f"{DZMM_BASE}/api/auth/tg-sign-in-code",
        headers={
            "Accept": "application/json",
            "Origin": DZMM_BASE,
            "Referer": f"{DZMM_BASE}/sign-in",
            "User-Agent": "Mozilla/5.0 ComfyUI-Web-DZMM",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
    except Exception as e:
        return {"ok": False, "error": f"创建 Telegram 登录码失败: {e}"}
    if not data.get("signInCode"):
        return {"ok": False, "error": data.get("error") or data.get("message") or "无法创建登录码"}
    return {
        "ok": True,
        "method": "telegram",
        "signInCode": data.get("signInCode"),
        "qrCodeUrl": data.get("qrCodeUrl") or "",
        "qrCodeSvg": data.get("qrCodeSvg") or "",
        "botUsername": data.get("botUsername") or "",
        "createdAt": data.get("createdAt") or "",
    }


def poll_telegram_login(sign_in_code: str) -> Dict[str, Any]:
    code = (sign_in_code or "").strip()
    if not code:
        return {"ok": False, "error": "缺少 Telegram 登录码"}
    jar = CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.HTTPSHandler(context=SSL_CTX),
    )
    req = urllib.request.Request(
        f"{DZMM_BASE}/api/auth/tg-sign-in-code/{urllib.parse.quote(code)}",
        headers={
            "Accept": "application/json",
            "Origin": DZMM_BASE,
            "Referer": f"{DZMM_BASE}/sign-in",
            "User-Agent": "Mozilla/5.0 ComfyUI-Web-DZMM",
        },
        method="GET",
    )
    try:
        with opener.open(req, timeout=60) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        raw = e.read()
    except Exception as e:
        return {"ok": False, "error": f"轮询失败: {e}"}

    data = {}
    try:
        data = json.loads(raw.decode("utf-8", errors="replace"))
    except Exception:
        pass
    status = data.get("status") or "waiting_confirmation"
    if status in ("pending_deletion", "account_banned"):
        return {"ok": False, "status": status, "error": data.get("message") or status}

    cookie = _cookie_from_jar(jar)
    if status == "logged_in" or (cookie and "sb-rls-auth-token=" in cookie):
        cookie = normalize_cookie(cookie)
        if not cookie or "sb-rls-auth-token=" not in cookie:
            return {
                "ok": False,
                "status": "logged_in",
                "error": "Telegram 已确认，但未拿到 Cookie，请改用粘贴 Cookie",
            }
        set_cookie(cookie)
        return {
            "ok": True,
            "status": "logged_in",
            "cookie": cookie,
            "method": "telegram",
            "message": "Telegram 登录成功",
        }
    return {
        "ok": True,
        "status": status,
        "message": data.get("message") or "等待 Telegram 确认",
        "signInCode": code,
        "method": "telegram",
    }


def handle_login_api(body: dict) -> Tuple[int, Any]:
    method = str((body or {}).get("method") or "password").strip()
    if method in ("password", "email"):
        result = login_with_password(body.get("email") or "", body.get("password") or "")
        return (200 if result.get("ok") else 400), result
    if method in ("telegram-start", "telegram_start"):
        result = start_telegram_login()
        return (200 if result.get("ok") else 400), result
    if method in ("telegram-poll", "telegram_poll"):
        result = poll_telegram_login(body.get("signInCode") or body.get("code") or "")
        code = 200 if result.get("ok") or result.get("status") == "waiting_confirmation" else 400
        return code, result
    return 400, {"ok": False, "error": f"不支持的 method: {method}"}


def _headers(referer: str = f"{DZMM_BASE}/draw/generate/create") -> Dict[str, str]:
    cookie = get_cookie()
    if not cookie:
        raise RuntimeError("未配置 DZMM Cookie，请先在设置里粘贴登录 Cookie")
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cookie": cookie,
        "Origin": DZMM_BASE,
        "Referer": referer,
    }


def _enc(obj: Any) -> str:
    return urllib.parse.quote(json.dumps(obj, separators=(",", ":")))


def trpc_get(name: str, payload: dict, referer: Optional[str] = None) -> dict:
    url = f"{DZMM_BASE}/api/trpc/{name}?input={_enc(payload)}"
    req = urllib.request.Request(url, headers=_headers(referer or f"{DZMM_BASE}/"))
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return json.loads(body)
        except json.JSONDecodeError as err:
            raise RuntimeError(f"DZMM HTTP {e.code}: {body[:300]}") from err


def trpc_post(name: str, payload: dict, referer: Optional[str] = None) -> dict:
    url = f"{DZMM_BASE}/api/trpc/{name}"
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers=_headers(referer or f"{DZMM_BASE}/"),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return json.loads(body)
        except json.JSONDecodeError as err:
            raise RuntimeError(f"DZMM HTTP {e.code}: {body[:300]}") from err


def dzmm_download(url: str) -> bytes:
    if url.startswith("/"):
        url = DZMM_BASE + url
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Cookie": get_cookie()},
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=120) as resp:
        return resp.read()


def _unwrap(resp: dict) -> Any:
    return resp.get("result", {}).get("data", {}).get("json")


def ratio_to_dimension(width: int, height: int, model: str = "anime") -> str:
    meta = MODEL_META[normalize_model(model)]
    if not width or not height:
        return meta["defaultDimension"]
    r = float(width) / float(height)
    candidates = {}
    for d in meta["dimensions"]:
        parts = d["value"].split(":")
        if len(parts) == 2:
            try:
                candidates[d["value"]] = float(parts[0]) / float(parts[1])
            except ValueError:
                pass
    if not candidates:
        return meta["defaultDimension"]
    return min(candidates.keys(), key=lambda k: abs(candidates[k] - r))


def _fetch_quota(procedure: str) -> Optional[Dict[str, Any]]:
    raw = trpc_get(procedure, {"json": None, "meta": {"values": ["undefined"], "v": 1}})
    if "error" in raw:
        return None
    data = _unwrap(raw)
    return data if isinstance(data, dict) else None


def get_status() -> Dict[str, Any]:
    cookie = get_cookie()
    out: Dict[str, Any] = {
        "ok": True,
        "hasCookie": bool(cookie),
        "cookiePreview": (cookie[:24] + "…") if len(cookie) > 24 else cookie,
        "models": list_models(),
    }
    if not cookie:
        return out
    try:
        me = _unwrap(trpc_get("user.getMe", {"json": None, "meta": {"values": ["undefined"], "v": 1}})) or {}
        out["user"] = {
            "id": me.get("id"),
            "fullName": me.get("fullName"),
            "email": me.get("email"),
            "isLoggedIn": bool(me.get("isLoggedIn")),
        }
        if not me.get("isLoggedIn"):
            out["ok"] = False
            out["error"] = "Cookie 无效或已过期，请重新登录 dzmm.ai 后在设置中粘贴"
            return out
        draw_q = _fetch_quota("draw.image.quota")
        edit_q = _fetch_quota("draw.image.editQuota")
        out["quota"] = draw_q  # 兼容旧前端
        out["quotas"] = {
            "draw": draw_q,  # anime / iroha
            "edit": edit_q,  # z-image
        }
        if draw_q is None and edit_q is None:
            out["ok"] = False
            out["error"] = "配额查询失败"
    except Exception as e:
        out["ok"] = False
        out["error"] = str(e)
    return out


def get_options() -> Dict[str, Any]:
    status = get_status()
    return {
        "ok": status.get("ok", True),
        "models": list_models(),
        "quotas": status.get("quotas") or {"draw": status.get("quota"), "edit": None},
        "hasCookie": status.get("hasCookie"),
        "user": status.get("user"),
        "error": status.get("error"),
    }


def _trpc_error_message(resp: dict) -> str:
    err = resp.get("error")
    if isinstance(err, str):
        if err == "captcha_required" or "captcha" in err.lower():
            return (
                "官网对当前出口要求验证码。请确认本机网络可直连 dzmm.ai，"
                "或到浏览器重新登录后更新 Cookie。"
            )
        return err
    if not isinstance(err, dict):
        if resp.get("location") and "captcha" in str(resp.get("location")):
            return "官网要求验证码，请求被拦截"
        return ""
    # tRPC shape: error.json.message
    inner = err.get("json") if isinstance(err.get("json"), dict) else err
    msg = inner.get("message") or err.get("message") or ""
    code = (inner.get("data") or {}).get("code") if isinstance(inner.get("data"), dict) else inner.get("code")
    if code == "UNAUTHORIZED" or msg == "UNAUTHORIZED":
        return "Cookie 无效或已过期，请重新登录 dzmm.ai 后在设置中粘贴 Cookie"
    if msg == "captcha_required" or "captcha" in str(msg or code or "").lower():
        return "官网要求验证码，请求被拦截"
    return str(msg or code or "")


def _finalize_task_image(task_id: str, item: dict, result: Dict[str, Any]) -> None:
    """下载完成任务的图片到本地 outputs_dzmm，并写入 result.imageUrl。"""
    img_path = item["outputImages"][0]
    img_bytes = dzmm_download(img_path)
    try:
        from dzmm_dewmark import remove_watermark_bytes

        cleaned, changed = remove_watermark_bytes(img_bytes)
        if changed:
            img_bytes = cleaned
            result["dewmark"] = True
    except Exception as e:
        result["dewmarkError"] = str(e)
    ext = ".webp" if img_bytes[:4] == b"RIFF" else ".png"
    out_file = _output_dir() / f"{task_id}{ext}"
    out_file.write_bytes(img_bytes)
    result["localPath"] = str(out_file)
    result["imageUrl"] = f"/api/dzmm/files/{out_file.name}"
    result["remoteUrl"] = DZMM_BASE + img_path if img_path.startswith("/") else img_path


def _task_failure_message(item: dict, model: str = "") -> str:
    """官网 detail 用 errorMessage，不是 error。"""
    raw = (
        item.get("errorMessage")
        or item.get("error")
        or item.get("message")
        or item.get("failReason")
        or ""
    )
    raw = str(raw).strip()
    model = normalize_model(model or item.get("model") or "")
    if "令牌状态不可用" in raw or "令牌" in raw and "不可用" in raw:
        if model == "z-image":
            return (
                "Z-Image 上游暂时不可用（该令牌状态不可用）。"
                "请改用 Anime / Iroha，或稍后再试。"
            )
        return f"模型上游暂时不可用：{raw}"
    if raw:
        return raw
    status = item.get("status") or "failed"
    return f"生成失败: {status}"


def generate(
    prompt: str,
    *,
    negative_prompt: str = "",
    tag_ids: Optional[list] = None,
    dimension: str = "3:4",
    model: str = "anime",
    poll: bool = True,
    poll_interval: float = 2.0,
    poll_max: int = 60,
) -> Dict[str, Any]:
    prompt = (prompt or "").strip()
    if not prompt:
        raise ValueError("正向提示词不能为空")
    model = normalize_model(model)
    dimension = ensure_dimension(model, dimension or "")

    # 生成前先校验登录，避免只看到含糊的 generate failed
    try:
        me = _unwrap(trpc_get("user.getMe", {"json": None, "meta": {"values": ["undefined"], "v": 1}})) or {}
        if not me.get("isLoggedIn"):
            return {
                "ok": False,
                "error": "Cookie 无效或已过期，请重新登录 dzmm.ai 后在设置中粘贴 Cookie",
                "code": "UNAUTHORIZED",
            }
    except Exception as e:
        return {"ok": False, "error": f"登录校验失败: {e}", "code": "AUTH_CHECK_FAILED"}

    payload = {
        "json": {
            "prompt": prompt,
            "tagIds": tag_ids or [],
            "dimension": dimension,
            "model": model,
            "negativePrompt": negative_prompt
            or "low quality, blurry, deformed, text, signature, watermark, multiple limbs, extra fingers, ugly",
        }
    }
    gen = trpc_post("draw.image.generate", payload)
    if "error" in gen:
        msg = _trpc_error_message(gen) or "generate failed"
        return {"ok": False, "error": msg, "generate": gen, "code": "GENERATE_ERROR"}

    data = _unwrap(gen) or {}
    task_id = data.get("taskId")
    if not task_id:
        return {"ok": False, "error": "未返回 taskId", "generate": gen}

    result: Dict[str, Any] = {"ok": True, "taskId": task_id, "generate": gen}
    if not poll:
        return result

    detail = None
    status = "pending"
    for i in range(poll_max):
        detail = trpc_get("draw.image.detail", {"json": {"id": task_id}})
        if "error" in detail:
            msg = _trpc_error_message(detail) or "detail failed"
            return {"ok": False, "error": msg, "taskId": task_id, "detail": detail}
        item = _unwrap(detail) or {}
        status = item.get("status") or "pending"
        result["pollCount"] = i + 1
        result["status"] = status
        if status == "completed":
            break
        if status in ("failed", "error"):
            break
        time.sleep(poll_interval)

    result["detail"] = detail
    item = _unwrap(detail or {}) or {}
    if status == "completed" and item.get("outputImages"):
        _finalize_task_image(task_id, item, result)
    elif status in ("failed", "error"):
        result["ok"] = False
        result["error"] = _task_failure_message(item, model)
        result["errorMessage"] = item.get("errorMessage")
        result["code"] = "TASK_FAILED"
    else:
        result["ok"] = False
        result["error"] = f"轮询超时，最后状态: {status}"
        result["code"] = "POLL_TIMEOUT"
    return result


def poll_task(
    task_id: str,
    *,
    model: str = "anime",
    finalize: bool = True,
) -> Dict[str, Any]:
    """查询单次任务状态；完成时可选下载图片到本地。"""
    task_id = (task_id or "").strip()
    if not task_id:
        return {"ok": False, "error": "缺少 taskId", "code": "MISSING_TASK_ID"}

    model = normalize_model(model)
    detail = trpc_get("draw.image.detail", {"json": {"id": task_id}})
    if "error" in detail:
        msg = _trpc_error_message(detail) or "detail failed"
        return {"ok": False, "error": msg, "taskId": task_id, "detail": detail}

    item = _unwrap(detail) or {}
    status = item.get("status") or "pending"
    result: Dict[str, Any] = {
        "ok": True,
        "taskId": task_id,
        "status": status,
        "detail": detail,
    }

    if status == "completed":
        if finalize and item.get("outputImages"):
            _finalize_task_image(task_id, item, result)
        elif not item.get("outputImages"):
            result["ok"] = False
            result["error"] = "任务已完成但未返回图片"
            result["code"] = "NO_IMAGE"
    elif status in ("failed", "error"):
        result["ok"] = False
        result["error"] = _task_failure_message(item, model)
        result["errorMessage"] = item.get("errorMessage")
        result["code"] = "TASK_FAILED"

    return result


def resolve_file(filename: str) -> Optional[Path]:
    name = Path(filename).name
    path = _output_dir() / name
    if path.is_file() and path.resolve().parent == _output_dir().resolve():
        return path
    return None


def handle_api(method: str, path: str, query: dict, body: dict) -> Tuple[int, Any]:
    """
    Returns (status_code, data).
    Special: status 0 + {'__file__': path} to serve a file.
    """
    global _REQUEST_COOKIE
    body = body or {}
    query = query or {}
    req_cookie = body.get("_requestCookie") or query.get("_requestCookie") or ""
    _REQUEST_COOKIE = normalize_cookie(req_cookie) if req_cookie else None
    try:
        return _handle_api_inner(method, path, query, body)
    finally:
        _REQUEST_COOKIE = None


def _handle_api_inner(method: str, path: str, query: dict, body: dict) -> Tuple[int, Any]:
    if path == "/api/dzmm/status" and method == "GET":
        return 200, get_status()

    if path == "/api/dzmm/options" and method == "GET":
        return 200, get_options()

    if path == "/api/dzmm/cookie" and method == "POST":
        # 本机可落盘；线上 Cloudflare 对应接口不落盘
        return 200, set_cookie(body.get("cookie") or "")

    if path == "/api/dzmm/login" and method == "GET":
        return 200, {
            "ok": True,
            "methods": [
                {"id": "cookie", "label": "Cookie", "mode": "local"},
                {"id": "password", "label": "邮箱密码", "mode": "proxy"},
                {"id": "telegram", "label": "Telegram", "mode": "proxy"},
                {"id": "google", "label": "Google", "mode": "oauth"},
                {"id": "discord", "label": "Discord", "mode": "oauth"},
                {"id": "twitter", "label": "Twitter", "mode": "oauth"},
                {"id": "login-code", "label": "登录码", "mode": "oauth"},
                {"id": "otp", "label": "邮箱验证码", "mode": "oauth"},
            ],
        }

    if path == "/api/dzmm/login" and method == "POST":
        return handle_login_api(body)

    if path == "/api/dzmm/quota" and method == "GET":
        status = get_status()
        return 200, {
            "ok": status.get("ok", True),
            "quota": status.get("quota"),
            "quotas": status.get("quotas"),
            "error": status.get("error"),
        }

    if path == "/api/dzmm/task" and method == "GET":
        task_id = query.get("id") or query.get("taskId") or ""
        model = normalize_model(query.get("model") or "anime")
        finalize = str(query.get("finalize", "1")).lower() not in ("0", "false", "no")
        result = poll_task(task_id, model=model, finalize=finalize)
        code = 200 if result.get("ok") or result.get("status") in ("pending", "processing", "queued") else 502
        return code, result

    if path == "/api/dzmm/generate" and method == "POST":
        model = normalize_model(body.get("model") or "anime")
        width = int(body.get("width") or 0)
        height = int(body.get("height") or 0)
        dimension = body.get("dimension") or (
            ratio_to_dimension(width, height, model) if width and height else ""
        )
        result = generate(
            body.get("prompt") or "",
            negative_prompt=body.get("negativePrompt") or body.get("negative_prompt") or "",
            tag_ids=body.get("tagIds") or body.get("tag_ids") or [],
            dimension=dimension,
            model=model,
            poll=bool(body.get("poll", True)),
            poll_interval=float(body.get("poll_interval") or 2.0),
            poll_max=int(body.get("poll_max") or 60),
        )
        code = 200 if result.get("ok") else 502
        return code, result

    if path.startswith("/api/dzmm/files/") and method == "GET":
        name = path[len("/api/dzmm/files/") :]
        file_path = resolve_file(urllib.parse.unquote(name))
        if not file_path:
            return 404, {"ok": False, "error": "文件不存在"}
        return 0, {"__file__": str(file_path)}

    if path == "/api/dzmm/open" and method == "GET":
        return 200, {"ok": True, "url": f"{DZMM_BASE}/draw/generate/create"}

    return 404, {"ok": False, "error": f"unknown dzmm api: {method} {path}"}
