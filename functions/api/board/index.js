const PAGE_SIZE = 20;
const MAX_LEN = 100;
const MAX_STORE = 500;
const RATE_WINDOW_MS = 15_000;
const RATE_HOUR_MS = 60 * 60 * 1000;
const RATE_HOUR_MAX = 20;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS board_messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '访客',
  user_id TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_at ON board_messages(at DESC);
CREATE INDEX IF NOT EXISTS idx_board_ip_at ON board_messages(ip, at DESC);
`;

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    },
  });
}

async function ensureTable(db) {
  await db.exec(SCHEMA);
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

function rowToMessage(row) {
  return {
    id: row.id,
    text: row.text,
    name: row.name || '访客',
    at: Number(row.at) || 0,
  };
}

async function pagePayload(db, pageRaw) {
  const totalRow = await db.prepare('SELECT COUNT(*) AS c FROM board_messages').first();
  const total = Number(totalRow?.c) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  let page = Math.floor(Number(pageRaw) || 1);
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  const offset = (page - 1) * PAGE_SIZE;
  const { results } = await db.prepare(
    `SELECT id, text, name, at FROM board_messages ORDER BY at DESC LIMIT ? OFFSET ?`
  ).bind(PAGE_SIZE, offset).all();
  return {
    ok: true,
    rows: (results || []).map(rowToMessage),
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
    return json(200, await pagePayload(db, url.searchParams.get('page')));
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

  const text = String(body?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN);
  if (!text) return json(400, { ok: false, error: 'empty', message: '请输入留言内容' });

  const name = cleanName(body?.name);
  const userId = String(body?.userId || '').slice(0, 64);
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
      'INSERT INTO board_messages (id, text, name, user_id, ip, at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, text, name, userId, ip, now).run();

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
    payload.item = { id, text, name, at: now };
    return json(200, payload);
  } catch (e) {
    return json(500, { ok: false, error: 'server', message: String(e?.message || e) });
  }
}
