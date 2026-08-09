/**
 * DZMM draw helpers for Cloudflare Pages Functions.
 * Cookie is taken from each request only — never stored on the server.
 */
export const DZMM_BASE = 'https://www.dzmm.ai';

export const MODEL_META = {
  anime: {
    id: 'anime',
    label: 'Anime 动漫',
    quotaType: 'draw',
    defaultDimension: '1:1',
    dimensions: [
      { value: '1:1', label: '1:1 方形', pixels: '2048×2048' },
      { value: '2:3', label: '2:3 竖图', pixels: '1664×2496' },
      { value: '3:2', label: '3:2 横图', pixels: '2496×1664' },
    ],
  },
  iroha: {
    id: 'iroha',
    label: 'Iroha',
    quotaType: 'draw',
    defaultDimension: '9:16',
    dimensions: [
      { value: '9:16', label: '9:16 竖屏', pixels: '1440×2560' },
      { value: '1:1', label: '1:1 方形', pixels: '2048×2048' },
      { value: '2:3', label: '2:3 竖拍', pixels: '1664×2496' },
      { value: '3:4', label: '3:4 竖照', pixels: '1728×2304' },
      { value: '3:2', label: '3:2 横图', pixels: '2496×1664' },
      { value: '4:3', label: '4:3 传统', pixels: '2304×1728' },
      { value: '16:9', label: '16:9 宽屏', pixels: '2560×1440' },
    ],
  },
  'z-image': {
    id: 'z-image',
    label: 'Z-Image',
    quotaType: 'edit',
    defaultDimension: '4:3',
    dimensions: [
      { value: '1:1', label: '1:1 方形', pixels: '2048×2048' },
      { value: '4:3', label: '4:3 传统', pixels: '2304×1728' },
      { value: '3:4', label: '3:4 竖照', pixels: '1728×2304' },
      { value: '16:9', label: '16:9 宽屏', pixels: '2560×1440' },
      { value: '9:16', label: '9:16 竖屏', pixels: '1440×2560' },
      { value: '3:2', label: '3:2 经典', pixels: '2496×1664' },
      { value: '2:3', label: '2:3 竖拍', pixels: '1664×2496' },
      { value: '21:9', label: '21:9 超宽', pixels: '3024×1296' },
    ],
  },
};

const MODEL_ALIASES = {
  realistic: 'iroha',
  anima: 'iroha',
  vivid: 'iroha',
  'nalang-dream': 'z-image',
  'nalang-coser-2': 'z-image',
};

export function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const DZMM_COOKIE_NAME = 'sb-rls-auth-token';

function finalizeDzmmCookieValue(value) {
  let v = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (!v) return '';
  if (v.toLowerCase().startsWith('cookie=')) v = v.slice(7).trim();
  const prefix = `${DZMM_COOKIE_NAME}=`;
  while (v.startsWith(`${prefix}${prefix}`)) v = v.slice(prefix.length);
  if (v.startsWith(prefix)) v = v.slice(prefix.length);
  if (v.startsWith('eyJ') && !v.startsWith('base64-')) v = `base64-${v}`;
  return `${DZMM_COOKIE_NAME}=${v}`;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(String(str));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function sessionObjectToCookieValue(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const at = obj.access_token || obj.accessToken;
  const rt = obj.refresh_token || obj.refreshToken;
  if (!at && !rt) return '';
  return `base64-${utf8ToBase64(JSON.stringify(obj))}`;
}

/** 把单条 / 多行 / Cookie 头 / cURL / TSV / JSON session / `.0/.1` 分段拼成完整 cookie */
export function normalizeCookie(raw) {
  let text = String(raw || '').trim().replace(/^["']|["']$/g, '');
  if (!text) return '';
  if (text.toLowerCase().startsWith('cookie:')) text = text.slice(7).trim();

  // Copy as cURL / Network Request Headers
  const curlCookie =
    text.match(/-H\s+['"]Cookie:\s*([^'"]+)['"]/i) ||
    text.match(/--header\s+['"]Cookie:\s*([^'"]+)['"]/i) ||
    text.match(/(?:^|\n)\s*Cookie:\s*([^\n\r]+)/i);
  if (curlCookie && /sb-.*auth-token/i.test(curlCookie[1])) {
    text = curlCookie[1].trim();
  }

  // DevTools / 扩展可能直接复制出 session JSON
  if (text.startsWith('{')) {
    try {
      const sessionVal = sessionObjectToCookieValue(JSON.parse(text));
      if (sessionVal) return finalizeDzmmCookieValue(sessionVal);
    } catch {
      /* fall through */
    }
  }

  const parts = [];
  for (const line of text.split(/\r?\n/)) {
    let ln = line.trim().replace(/^["']|["']$/g, '');
    if (!ln) continue;
    // Chrome Application 表格：Name<TAB>Value
    if (ln.includes('\t') && !ln.includes('=')) {
      const tab = ln.indexOf('\t');
      const name = ln.slice(0, tab).trim();
      const value = ln.slice(tab + 1).trim();
      if (name) ln = `${name}=${value}`;
    } else if (ln.includes('\t') && ln.includes('=')) {
      // Name\tValue 且 Value 内可能含 =
      const tab = ln.indexOf('\t');
      const left = ln.slice(0, tab).trim();
      const right = ln.slice(tab + 1).trim();
      if (left && !left.includes('=')) ln = `${left}=${right}`;
    }
    if (ln.includes(';') && ln.includes('=')) {
      for (const p of ln.split(';')) {
        const t = p.trim();
        if (t) parts.push(t);
      }
    } else {
      parts.push(ln);
    }
  }

  let single = '';
  const chunks = {};
  const bare = [];
  for (const part of parts) {
    if (!part.includes('=')) {
      bare.push(part);
      continue;
    }
    const eq = part.indexOf('=');
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (name === DZMM_COOKIE_NAME) {
      single = value;
      continue;
    }
    let m = name.match(/^sb-rls-auth-token\.(\d+)$/);
    if (m) {
      chunks[Number(m[1])] = value;
      continue;
    }
    if (/^sb-[A-Za-z0-9_-]+-auth-token$/.test(name) && !single) {
      single = value;
      continue;
    }
    m = name.match(/^sb-[A-Za-z0-9_-]+-auth-token\.(\d+)$/);
    if (m) chunks[Number(m[1])] = value;
  }

  const indexes = Object.keys(chunks)
    .map(Number)
    .sort((a, b) => a - b);
  let value = '';
  if (indexes.length) {
    value = indexes.map((i) => chunks[i]).join('');
  } else if (single) {
    value = single;
  } else if (bare.length) {
    value = bare.join('');
  } else if (text.startsWith('base64-') || text.startsWith('eyJ')) {
    value = text;
  } else {
    return text;
  }
  return finalizeDzmmCookieValue(value);
}

/** 解析 cookie 中的 session JSON（若可解码） */
export function parseDzmmSession(cookie) {
  const c = normalizeCookie(cookie);
  if (!c.startsWith(`${DZMM_COOKIE_NAME}=`)) return null;
  let v = c.slice(DZMM_COOKIE_NAME.length + 1).trim();
  if (!v) return null;
  if (v.startsWith('base64-')) v = v.slice(7);
  try {
    const pad = v + '='.repeat((4 - (v.length % 4)) % 4);
    const bin = atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
    const json = JSON.parse(bin);
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

/**
 * 本地判定 Cookie 字段是否完整：
 * - 能拼出 sb-rls-auth-token=...
 * - 且能解出 session（含 access/refresh token），或至少是足够长的 base64-/会话串
 */
export function isCompleteDzmmCookie(cookie) {
  const c = normalizeCookie(cookie);
  if (!c.startsWith(`${DZMM_COOKIE_NAME}=`)) return false;
  const value = c.slice(DZMM_COOKIE_NAME.length + 1).trim();
  if (!value) return false;
  const session = parseDzmmSession(c);
  if (
    session &&
    (session.access_token ||
      session.refresh_token ||
      session.accessToken ||
      session.refreshToken)
  ) {
    return true;
  }
  if (value.startsWith('base64-') && value.length >= 40) return true;
  if (value.startsWith('eyJ') && value.length >= 40) return true;
  return value.length >= 80;
}

function collectSetCookieHeaders(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    try {
      const list = res.headers.getSetCookie();
      if (Array.isArray(list) && list.length) return list;
    } catch {
      /* ignore */
    }
  }
  if (typeof res.headers.getAll === 'function') {
    try {
      const list = res.headers.getAll('Set-Cookie');
      if (Array.isArray(list) && list.length) return list;
    } catch {
      /* ignore */
    }
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * 账号密码登录 dzmm.ai，从 Set-Cookie / JSON 组装完整 cookie。
 * 服务端不落盘，仅把 cookie 返回给浏览器本地保存。
 */
export async function loginWithPassword(email, password) {
  const mail = String(email || '').trim();
  const pass = String(password || '');
  if (!mail || !pass) {
    return { ok: false, error: '请填写邮箱和密码' };
  }

  let res;
  try {
    res = await fetch(`${DZMM_BASE}/api/auth/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: DZMM_BASE,
        Referer: `${DZMM_BASE}/sign-in`,
        'User-Agent': 'Mozilla/5.0 ComfyUI-Web-DZMM',
      },
      body: JSON.stringify({ email: mail, password: pass }),
      redirect: 'manual',
    });
  } catch (e) {
    return { ok: false, error: `登录请求失败: ${e.message || e}` };
  }

  const setCookies = collectSetCookieHeaders(res);
  const cookieHeader = setCookies
    .map((sc) => String(sc || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
  let cookie = normalizeCookie(cookieHeader);

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }

  if (!isCompleteDzmmCookie(cookie) && data && typeof data === 'object') {
    const candidates = [
      data.session,
      data.data?.session,
      data.user?.session,
      data.auth?.session,
      data.result?.session,
      data.data,
      data.user,
      data.auth,
      data.result,
      data.access_token || data.refresh_token ? data : null,
      data.data?.access_token || data.data?.refresh_token ? data.data : null,
    ];
    for (const session of candidates) {
      const sessionVal = sessionObjectToCookieValue(session);
      if (sessionVal) {
        cookie = finalizeDzmmCookieValue(sessionVal);
        break;
      }
    }
  }

  if (!isCompleteDzmmCookie(cookie)) {
    let msg =
      data?.error ||
      data?.message ||
      data?.msg ||
      (text ? text.slice(0, 200) : '') ||
      `登录失败 HTTP ${res.status}`;
    // 代理机房拿不到 Set-Cookie / session 时，官网本机登录仍可用
    if (res.ok && !data?.error) {
      msg =
        '登录接口已响应，但未能取得 Cookie（常见于代理出口限制）。请打开官网登录后，用书签复制并「从剪贴板导入」。';
    } else if (/邮箱|密码|错/.test(String(msg))) {
      msg = `${msg}（若官网能登，请改用官网登录 + 剪贴板导入）`;
    }
    return {
      ok: false,
      error: String(msg),
      status: res.status,
      code: 'LOGIN_FAILED',
      fallbackUrl: `${DZMM_BASE}/sign-in`,
    };
  }

  return {
    ok: true,
    cookie,
    status: res.status,
    storage: 'client-only',
    message: '登录成功，Cookie 仅保存在浏览器本地',
  };
}

/** 官网实际支持的登录方式（供前端展示） */
export function listLoginMethods() {
  return [
    { id: 'cookie', label: 'Cookie', mode: 'local', hint: '粘贴 / 剪贴板 / Network' },
    { id: 'password', label: '邮箱密码', mode: 'proxy' },
    { id: 'telegram', label: 'Telegram', mode: 'proxy' },
    {
      id: 'google',
      label: 'Google',
      mode: 'oauth',
      // 直链 /auth/oauth/* 常被 captcha / 授权页 404；官网用 app-oauth 桥接
      appOauth: 'google',
      url: `${DZMM_BASE}/sign-in`,
      hint: '浏览器调 app-oauth 后打开官网桥接页',
    },
    {
      id: 'discord',
      label: 'Discord',
      mode: 'oauth',
      appOauth: 'discord',
      url: `${DZMM_BASE}/sign-in`,
    },
    {
      id: 'twitter',
      label: 'Twitter',
      mode: 'oauth',
      appOauth: 'twitter',
      url: `${DZMM_BASE}/sign-in`,
    },
    {
      id: 'login-code',
      label: '登录码',
      mode: 'oauth',
      url: `${DZMM_BASE}/sign-in?s=signin-code`,
      hint: '官网扫码/上传登录码后，再粘贴 Cookie',
    },
    {
      id: 'otp',
      label: '邮箱验证码',
      mode: 'oauth',
      url: `${DZMM_BASE}/sign-in`,
      hint: '官网完成验证码登录后，再粘贴 Cookie',
    },
  ];
}

function cookieFromSetCookieHeaders(res) {
  const setCookies = collectSetCookieHeaders(res);
  const cookieHeader = setCookies
    .map((sc) => String(sc || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
  return normalizeCookie(cookieHeader);
}

/** 创建 Telegram 登录码 + 二维码（部分机房 IP 会被官网要求 captcha） */
export async function startTelegramLogin() {
  let res;
  try {
    res = await fetch(`${DZMM_BASE}/api/auth/tg-sign-in-code`, {
      headers: {
        Accept: 'application/json',
        Origin: DZMM_BASE,
        Referer: `${DZMM_BASE}/sign-in`,
        'User-Agent': 'Mozilla/5.0 ComfyUI-Web-DZMM',
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: `创建 Telegram 登录码失败: ${e.message || e}`,
      fallbackUrl: `${DZMM_BASE}/sign-in?s=signin-tg`,
      code: 'TG_START_FAILED',
    };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      error: `Telegram 登录接口异常 HTTP ${res.status}`,
      fallbackUrl: `${DZMM_BASE}/sign-in?s=signin-tg`,
      code: 'TG_START_FAILED',
    };
  }
  if (data?.error === 'captcha_required' || res.status === 418) {
    return {
      ok: false,
      error: '当前服务器出口被官网要求验证码，请改用浏览器直连生成二维码，或打开官网 Telegram 登录',
      status: 418,
      code: 'CAPTCHA_REQUIRED',
      fallbackUrl: `${DZMM_BASE}/sign-in?s=signin-tg`,
      clientDirect: true,
    };
  }
  if (!data?.signInCode) {
    return {
      ok: false,
      error: data?.error || data?.message || '无法创建 Telegram 登录码',
      status: res.status,
      fallbackUrl: `${DZMM_BASE}/sign-in?s=signin-tg`,
      code: 'TG_START_FAILED',
    };
  }
  return {
    ok: true,
    signInCode: data.signInCode,
    qrCodeUrl: data.qrCodeUrl || '',
    qrCodeSvg: data.qrCodeSvg || '',
    botUsername: data.botUsername || '',
    createdAt: data.createdAt || '',
  };
}

/** 轮询 Telegram 登录；确认后从 Set-Cookie 组装完整 cookie */
export async function pollTelegramLogin(signInCode) {
  const code = String(signInCode || '').trim();
  if (!code) return { ok: false, error: '缺少 Telegram 登录码' };

  let res;
  try {
    res = await fetch(
      `${DZMM_BASE}/api/auth/tg-sign-in-code/${encodeURIComponent(code)}`,
      {
        headers: {
          Accept: 'application/json',
          Origin: DZMM_BASE,
          Referer: `${DZMM_BASE}/sign-in`,
          'User-Agent': 'Mozilla/5.0 ComfyUI-Web-DZMM',
        },
      }
    );
  } catch (e) {
    return { ok: false, error: `轮询失败: ${e.message || e}` };
  }

  let cookie = cookieFromSetCookieHeaders(res);
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* ignore */
  }

  const status = data.status || (isCompleteDzmmCookie(cookie) ? 'logged_in' : 'waiting_confirmation');

  if (status === 'pending_deletion' || status === 'account_banned') {
    return {
      ok: false,
      status,
      error: data.message || status,
      code: status.toUpperCase(),
    };
  }

  if (status === 'logged_in' || isCompleteDzmmCookie(cookie)) {
    if (!isCompleteDzmmCookie(cookie)) {
      const session =
        data.session ||
        data.data?.session ||
        (data.access_token || data.refresh_token ? data : null);
      const sessionVal = sessionObjectToCookieValue(session);
      if (sessionVal) cookie = finalizeDzmmCookieValue(sessionVal);
    }
    if (!isCompleteDzmmCookie(cookie)) {
      return {
        ok: false,
        status: 'logged_in',
        error: 'Telegram 已确认，但未拿到 Cookie，请改用「粘贴 Cookie」',
        code: 'COOKIE_MISSING',
      };
    }
    return {
      ok: true,
      status: 'logged_in',
      cookie,
      storage: 'client-only',
      message: 'Telegram 登录成功',
    };
  }

  return {
    ok: true,
    status: status || 'waiting_confirmation',
    message: data.message || '等待 Telegram 确认',
    signInCode: code,
  };
}

/** Cookie from request header only — never persisted. Body cookie is for /cookie endpoint. */
export function readCookie(request) {
  const header =
    request.headers.get('x-dzmm-cookie') ||
    request.headers.get('X-Dzmm-Cookie') ||
    '';
  return normalizeCookie(header);
}

export async function readCookieFromBody(request) {
  try {
    const body = await request.json();
    return { cookie: normalizeCookie(body?.cookie || ''), body };
  } catch {
    return { cookie: '', body: {} };
  }
}

export function normalizeModel(model) {
  let m = String(model || 'anime').trim();
  m = MODEL_ALIASES[m] || m;
  return MODEL_META[m] ? m : 'anime';
}

export function ensureDimension(model, dimension) {
  const meta = MODEL_META[normalizeModel(model)];
  const allowed = new Set(meta.dimensions.map((d) => d.value));
  if (dimension && allowed.has(dimension)) return dimension;
  return meta.defaultDimension;
}

export function listModels() {
  return Object.values(MODEL_META).map((m) => ({
    id: m.id,
    label: m.label,
    quotaType: m.quotaType,
    defaultDimension: m.defaultDimension,
    dimensions: m.dimensions,
  }));
}

function headersFor(cookie, referer = `${DZMM_BASE}/draw/generate/create`) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Cookie: cookie,
    Origin: DZMM_BASE,
    Referer: referer,
  };
}

function enc(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}

export function unwrap(resp) {
  return resp?.result?.data?.json;
}

export async function trpcGet(cookie, name, payload, referer) {
  const url = `${DZMM_BASE}/api/trpc/${name}?input=${enc(payload)}`;
  const res = await fetch(url, { headers: headersFor(cookie, referer || `${DZMM_BASE}/`) });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`DZMM HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

export async function trpcPost(cookie, name, payload, referer) {
  const url = `${DZMM_BASE}/api/trpc/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headersFor(cookie, referer || `${DZMM_BASE}/`),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`DZMM HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

export function trpcErrorMessage(resp) {
  const err = resp?.error;
  if (!err || typeof err !== 'object') return '';
  const inner = err.json && typeof err.json === 'object' ? err.json : err;
  const msg = inner.message || err.message || '';
  const code = inner.data?.code || inner.code;
  if (code === 'UNAUTHORIZED' || msg === 'UNAUTHORIZED') {
    return 'Cookie 无效或已过期，请重新登录 dzmm.ai 后在设置中粘贴 Cookie';
  }
  return String(msg || code || '');
}

export function taskFailureMessage(item, model) {
  const raw = String(
    item?.errorMessage || item?.error || item?.message || item?.failReason || ''
  ).trim();
  const m = normalizeModel(model || item?.model || '');
  if (raw.includes('令牌状态不可用') || (raw.includes('令牌') && raw.includes('不可用'))) {
    if (m === 'z-image') {
      return 'Z-Image 上游暂时不可用（该令牌状态不可用）。请改用 Anime / Iroha，或稍后再试。';
    }
    return `模型上游暂时不可用：${raw}`;
  }
  if (raw) return raw;
  return `生成失败: ${item?.status || 'failed'}`;
}

async function fetchQuota(cookie, procedure) {
  const raw = await trpcGet(cookie, procedure, {
    json: null,
    meta: { values: ['undefined'], v: 1 },
  });
  if (raw?.error) return null;
  const data = unwrap(raw);
  return data && typeof data === 'object' ? data : null;
}

export async function getStatus(cookie) {
  const normalized = normalizeCookie(cookie || '');
  const complete = Boolean(normalized) && isCompleteDzmmCookie(normalized);
  const out = {
    ok: true,
    hasCookie: Boolean(normalized),
    cookieComplete: complete,
    acceptedLocally: complete,
    cookiePreview: normalized ? `${normalized.slice(0, 24)}…` : '',
    models: listModels(),
    storage: 'client-only',
  };
  if (!normalized) return out;
  if (!complete) {
    out.ok = false;
    out.error = 'Cookie 字段不完整，请粘贴完整的 sb-rls-auth-token（或全部 .0/.1/.2）';
    return out;
  }
  // 字段完整即视为可登录；官网校验仅作补充，失败不拦
  out.user = { isLoggedIn: true };
  try {
    const me =
      unwrap(
        await trpcGet(normalized, 'user.getMe', {
          json: null,
          meta: { values: ['undefined'], v: 1 },
        })
      ) || {};
    out.user = {
      id: me.id,
      fullName: me.fullName,
      email: me.email,
      isLoggedIn: true,
      remoteLoggedIn: Boolean(me.isLoggedIn),
    };
    if (me.isLoggedIn === false) {
      out.warning = '官网未返回已登录态，已按本地完整 Cookie 放行';
    }
    const drawQ = await fetchQuota(normalized, 'draw.image.quota');
    const editQ = await fetchQuota(normalized, 'draw.image.editQuota');
    out.quota = drawQ;
    out.quotas = { draw: drawQ, edit: editQ };
    if (!drawQ && !editQ) {
      out.warning = out.warning
        ? `${out.warning}；配额暂不可查`
        : '配额暂不可查（Cookie 已放行，可直接尝试生图）';
    }
  } catch (e) {
    out.warning = `在线校验跳过：${e.message || e}`;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function finalizeTaskImage(cookie, taskId, item, result, model) {
  const imgPath = item.outputImages[0];
  const remoteUrl = imgPath.startsWith('/') ? DZMM_BASE + imgPath : imgPath;
  result.remoteUrl = remoteUrl;
  result.imageUrl = remoteUrl;
  try {
    const imgRes = await fetch(remoteUrl, {
      headers: {
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0',
        Referer: `${DZMM_BASE}/`,
      },
    });
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer();
      if (buf.byteLength > 0 && buf.byteLength < 4.5 * 1024 * 1024) {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const mime = imgRes.headers.get('content-type') || 'image/webp';
        result.imageUrl = `data:${mime};base64,${btoa(binary)}`;
      }
    }
  } catch {
    /* keep remoteUrl */
  }
}

export async function pollTask(cookie, query = {}) {
  const taskId = String(query?.id || query?.taskId || '').trim();
  if (!taskId) return { ok: false, error: '缺少 taskId', code: 'MISSING_TASK_ID' };

  const model = normalizeModel(query?.model || 'anime');
  const finalize = !['0', 'false', 'no'].includes(String(query?.finalize ?? '1').toLowerCase());

  const detail = await trpcGet(cookie, 'draw.image.detail', { json: { id: taskId } });
  if (detail?.error) {
    return {
      ok: false,
      error: trpcErrorMessage(detail) || 'detail failed',
      taskId,
      detail,
    };
  }

  const item = unwrap(detail) || {};
  const status = item.status || 'pending';
  const result = { ok: true, taskId, status, detail };

  if (status === 'completed') {
    if (finalize && item.outputImages?.length) {
      await finalizeTaskImage(cookie, taskId, item, result, model);
    } else if (!item.outputImages?.length) {
      result.ok = false;
      result.error = '任务已完成但未返回图片';
      result.code = 'NO_IMAGE';
    }
  } else if (status === 'failed' || status === 'error') {
    result.ok = false;
    result.error = taskFailureMessage(item, model);
    result.errorMessage = item.errorMessage;
    result.code = 'TASK_FAILED';
  }

  return result;
}

export async function generate(cookie, body) {
  const prompt = String(body?.prompt || '').trim();
  if (!prompt) return { ok: false, error: '正向提示词不能为空' };

  const model = normalizeModel(body?.model || 'anime');
  const dimension = ensureDimension(model, body?.dimension || '');
  const negativePrompt =
    body?.negativePrompt ||
    body?.negative_prompt ||
    'low quality, blurry, deformed, text, signature, watermark, multiple limbs, extra fingers, ugly';
  const tagIds = body?.tagIds || body?.tag_ids || [];
  const poll = body?.poll !== false;
  const pollInterval = Math.max(1, Number(body?.poll_interval) || 2) * 1000;
  const pollMax = Math.min(60, Math.max(5, Number(body?.poll_max) || 45));

  const authCookie = normalizeCookie(cookie || '');
  if (!isCompleteDzmmCookie(authCookie)) {
    return {
      ok: false,
      error: 'Cookie 字段不完整，请粘贴完整的 sb-rls-auth-token（或全部 .0/.1/.2）',
      code: 'COOKIE_INCOMPLETE',
    };
  }

  const gen = await trpcPost(authCookie, 'draw.image.generate', {
    json: {
      prompt,
      tagIds,
      dimension,
      model,
      negativePrompt,
    },
  });
  if (gen?.error) {
    return {
      ok: false,
      error: trpcErrorMessage(gen) || 'generate failed',
      generate: gen,
      code: 'GENERATE_ERROR',
    };
  }

  const taskId = unwrap(gen)?.taskId;
  if (!taskId) return { ok: false, error: '未返回 taskId', generate: gen };

  const result = { ok: true, taskId, generate: gen };
  if (!poll) return result;

  let detail = null;
  let status = 'pending';
  for (let i = 0; i < pollMax; i++) {
    detail = await trpcGet(authCookie, 'draw.image.detail', { json: { id: taskId } });
    if (detail?.error) {
      return {
        ok: false,
        error: trpcErrorMessage(detail) || 'detail failed',
        taskId,
        detail,
      };
    }
    const item = unwrap(detail) || {};
    status = item.status || 'pending';
    result.pollCount = i + 1;
    result.status = status;
    if (status === 'completed' || status === 'failed' || status === 'error') break;
    await sleep(pollInterval);
  }

  result.detail = detail;
  const item = unwrap(detail || {}) || {};
  if (status === 'completed' && item.outputImages?.length) {
    await finalizeTaskImage(authCookie, taskId, item, result, model);
  } else if (status === 'failed' || status === 'error') {
    result.ok = false;
    result.error = taskFailureMessage(item, model);
    result.errorMessage = item.errorMessage;
    result.code = 'TASK_FAILED';
  } else {
    result.ok = false;
    result.error = `轮询超时，最后状态: ${status}`;
    result.code = 'POLL_TIMEOUT';
  }
  return result;
}
