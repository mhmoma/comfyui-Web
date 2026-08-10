const PAGE_SIZE = 20;
const MAX_LEN = 100;
const MAX_STORE = 500;
const RATE_WINDOW_MS = 15_000;
const RATE_HOUR_MS = 60 * 60 * 1000;
const RATE_HOUR_MAX = 20;

const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS board_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'guest',
    user_id TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_board_at ON board_messages(at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_board_ip_at ON board_messages(ip, at DESC)`,
];

async function ensureTable(db) {
  try {
    await db.prepare('SELECT 1 FROM board_messages LIMIT 1').all();
  } catch (_) {
    for (const stmt of SCHEMA_STMTS) {
      await db.prepare(stmt).run();
    }
  }
  try {
    await db.prepare(`ALTER TABLE board_messages ADD COLUMN badge TEXT DEFAULT ''`).run();
  } catch (_) {}
  try {
    await db.prepare(`ALTER TABLE board_messages ADD COLUMN cosmetics TEXT DEFAULT ''`).run();
  } catch (_) {}
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    },
  });
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get('x-admin-key');
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

function clientIp(request) {
  return (
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || ''
  );
}

function cleanName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24) || '访客';
}

const AUTHOR_USER_IDS = new Set([
  '03b30ae3-a2da-440b-9333-58dd490507ea',
]);

function cleanBadges(value, userId = '') {
  const allowed = new Set(['gold_collector', 'adult', 'author']);
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[,|]/);
  const list = [];
  const uid = String(userId || '').trim();
  for (const item of raw) {
    const key = String(item || '').trim();
    if (!allowed.has(key) || list.includes(key)) continue;
    if (key === 'author' && !AUTHOR_USER_IDS.has(uid)) continue;
    list.push(key);
  }
  if (AUTHOR_USER_IDS.has(uid) && !list.includes('author')) list.push('author');
  return list;
}

function badgesToStore(value, userId = '') {
  return cleanBadges(value, userId).join(',');
}

function cleanCosmetics(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw || '{}'); } catch (_) { data = {}; }
  }
  if (!data || typeof data !== 'object') data = {};
  const out = {};
  const nameBg = String(data.nameBgValue || data.nameBg || '').trim().slice(0, 120);
  const nameText = String(data.nameText || '').trim().slice(0, 32);
  const crown = String(data.crownValue || data.crown || '').trim().slice(0, 16);
  const title = String(data.titleValue || data.title || '').trim().slice(0, 16);
  const titleBg = String(data.titleBg || '').trim().slice(0, 160);
  const titleText = String(data.titleText || '').trim().slice(0, 32);
  const titleBorder = String(data.titleBorder || '').trim().slice(0, 64);
  const borderEffect = String(data.nameBorderEffect || '').trim().slice(0, 32);
  const fxEffect = String(data.nameFxEffect || '').trim().slice(0, 32);
  const borderId = String(data.nameBorder || '').trim().slice(0, 32);
  const fxId = String(data.nameFx || '').trim().slice(0, 32);
  const allowedBorder = new Set([
    'gold-shine', 'rainbow', 'neon-cyan', 'neon-pink', 'silver', 'ink', 'candy', 'double',
  ]);
  const allowedFx = new Set(['gold', 'rainbow', 'neon', 'sparkle', 'fire', 'ocean']);
  if (nameBg && !/[<>"']/.test(nameBg)) out.nameBgValue = nameBg;
  if (nameText && /^#[0-9a-fA-F]{3,8}$/.test(nameText)) out.nameText = nameText;
  if (crown && !/[<>]/.test(crown)) out.crownValue = crown;
  if (title && !/[<>]/.test(title)) out.titleValue = title;
  if (titleBg && !/[<>"']/.test(titleBg)) out.titleBg = titleBg;
  if (titleText && /^#[0-9a-fA-F]{3,8}$/.test(titleText)) out.titleText = titleText;
  if (
    titleBorder
    && (
      /^#[0-9a-fA-F]{3,8}$/.test(titleBorder)
      || titleBorder.startsWith('rgba(')
      || titleBorder.startsWith('rgb(')
    )
  ) {
    out.titleBorder = titleBorder;
  }
  if (allowedBorder.has(borderEffect)) {
    out.nameBorderEffect = borderEffect;
    if (borderId) out.nameBorder = borderId;
  }
  if (allowedFx.has(fxEffect)) {
    out.nameFxEffect = fxEffect;
    if (fxId) out.nameFx = fxId;
  }
  return out;
}

function rowToMessage(row, { admin = false } = {}) {
  const badges = cleanBadges(row.badge, row.user_id);
  const cosmetics = cleanCosmetics(row.cosmetics);
  const item = {
    id: row.id,
    text: row.text,
    name: row.name || '访客',
    badge: badges.join(','),
    badges,
    cosmetics,
    at: Number(row.at) || 0,
  };
  if (admin) {
    item.userId = row.user_id || '';
    item.ip = row.ip || '';
  }
  return item;
}

async function pagePayload(db, pageRaw, { admin = false } = {}) {
  const totalRow = await db.prepare('SELECT COUNT(*) AS c FROM board_messages').first();
  const total = Number(totalRow?.c) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  let page = Math.floor(Number(pageRaw) || 1);
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  const offset = (page - 1) * PAGE_SIZE;
  const sql = admin
    ? `SELECT id, text, name, user_id, ip, badge, cosmetics, at FROM board_messages ORDER BY at DESC LIMIT ? OFFSET ?`
    : `SELECT id, text, name, user_id, badge, cosmetics, at FROM board_messages ORDER BY at DESC LIMIT ? OFFSET ?`;
  const { results } = await db.prepare(sql).bind(PAGE_SIZE, offset).all();
  return {
    ok: true,
    rows: (results || []).map((row) => rowToMessage(row, { admin })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
  };
}

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'server', message: 'Database not configured' });

  try {
    await ensureTable(db);
    const url = new URL(request.url);
    const admin = checkAdmin(request, env);
    return json(200, await pagePayload(db, url.searchParams.get('page'), { admin }));
  } catch (e) {
    return json(500, { ok: false, error: 'server', message: String(e?.message || e) });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: 'forbidden', message: '需要管理密钥' });
  }
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'server', message: 'Database not configured' });

  try {
    await ensureTable(db);
    const url = new URL(request.url);
    const clearAll = url.searchParams.get('all') === '1';
    const id = String(url.searchParams.get('id') || '').trim();

    if (clearAll) {
      await db.prepare('DELETE FROM board_messages').run();
      return json(200, { ok: true, cleared: true, total: 0 });
    }
    if (!id) return json(400, { ok: false, error: 'missing_id', message: '缺少留言 id' });

    const result = await db.prepare('DELETE FROM board_messages WHERE id = ?').bind(id).run();
    const deleted = Number(result?.meta?.changes || 0);
    if (!deleted) return json(404, { ok: false, error: 'not_found', message: '留言不存在' });

    const page = await pagePayload(db, url.searchParams.get('page') || 1, { admin: true });
    return json(200, { ...page, deleted: id });
  } catch (e) {
    return json(500, { ok: false, error: 'server', message: String(e?.message || e) });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'server', message: 'Database not configured' });

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid_json', message: 'Invalid JSON' });
  }

  const method = String(body?.method || 'post');
  if (method === 'delete' || method === 'clear') {
    if (!checkAdmin(request, env)) {
      return json(403, { ok: false, error: 'forbidden', message: '需要管理密钥' });
    }
    try {
      await ensureTable(db);
      if (method === 'clear' || body?.all) {
        await db.prepare('DELETE FROM board_messages').run();
        return json(200, { ok: true, cleared: true, total: 0 });
      }
      const id = String(body?.id || '').trim();
      if (!id) return json(400, { ok: false, error: 'missing_id', message: '缺少留言 id' });
      const result = await db.prepare('DELETE FROM board_messages WHERE id = ?').bind(id).run();
      const deleted = Number(result?.meta?.changes || 0);
      if (!deleted) return json(404, { ok: false, error: 'not_found', message: '留言不存在' });
      const page = await pagePayload(db, body?.page || 1, { admin: true });
      return json(200, { ...page, deleted: id });
    } catch (e) {
      return json(500, { ok: false, error: 'server', message: String(e?.message || e) });
    }
  }

  const text = String(body?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN);
  if (!text) return json(400, { ok: false, error: 'empty', message: '请输入留言内容' });

  const name = cleanName(body?.name);
  const userId = String(body?.userId || '').slice(0, 64);
  const badges = cleanBadges(body?.badges ?? body?.badge, userId);
  const badge = badgesToStore(badges, userId);
  const cosmetics = cleanCosmetics(body?.cosmetics);
  const cosmeticsJson = Object.keys(cosmetics).length ? JSON.stringify(cosmetics) : '';
  const ip = clientIp(request);
  const now = Date.now();

  try {
    await ensureTable(db);

    if (ip) {
      const recent = await db.prepare(
        'SELECT at FROM board_messages WHERE ip = ? ORDER BY at DESC LIMIT 1'
      ).bind(ip).first();
      if (recent && now - Number(recent.at) < RATE_WINDOW_MS) {
        return json(429, { ok: false, error: 'rate_limit', message: '发送太快，请稍后再试' });
      }
      const hourRow = await db.prepare(
        'SELECT COUNT(*) AS c FROM board_messages WHERE ip = ? AND at >= ?'
      ).bind(ip, now - RATE_HOUR_MS).first();
      if ((Number(hourRow?.c) || 0) >= RATE_HOUR_MAX) {
        return json(429, { ok: false, error: 'rate_limit', message: '今日留言过多，请稍后再试' });
      }
    }

    const id = `${now.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare(
      'INSERT INTO board_messages (id, text, name, user_id, ip, badge, cosmetics, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, text, name, userId, ip, badge, cosmeticsJson, now).run();

    const countRow = await db.prepare('SELECT COUNT(*) AS c FROM board_messages').first();
    const overflow = (Number(countRow?.c) || 0) - MAX_STORE;
    if (overflow > 0) {
      await db.prepare(
        `DELETE FROM board_messages WHERE id IN (
           SELECT id FROM board_messages ORDER BY at ASC LIMIT ?
         )`
      ).bind(overflow).run();
    }

    const payload = await pagePayload(db, 1);
    payload.item = { id, text, name, badge, badges, cosmetics, at: now };
    return json(200, payload);
  } catch (e) {
    return json(500, { ok: false, error: 'server', message: String(e?.message || e) });
  }
}
