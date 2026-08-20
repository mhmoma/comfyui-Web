import {
  json,
  corsPreflight,
  checkAdmin,
  ensureNewsAdminsTable,
  hashAdminKey,
  generateNewsAdminKey,
} from '../articles/_shared.js';

export async function onRequestOptions() {
  return corsPreflight();
}

function rowPublic(row) {
  return {
    id: row.id,
    name: row.name || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** 主管理员：列出资讯次级账号（不含密钥） */
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.ADMIN_KEY) {
    return json(503, { ok: false, error: 'no_admin_key', message: '未配置 ADMIN_KEY' });
  }
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: 'forbid', message: '仅主管理员可管理次级账号' });
  }
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'no_db' });

  try {
    await ensureNewsAdminsTable(db);
    const { results } = await db.prepare(
      'SELECT id, name, created_at, updated_at FROM news_admins ORDER BY created_at DESC'
    ).all();
    return json(200, { ok: true, admins: (results || []).map(rowPublic) });
  } catch (e) {
    return json(500, { ok: false, error: e.message || 'list_failed' });
  }
}

/** 主管理员：新建次级账号；密钥只在响应里出现一次 */
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_KEY) {
    return json(503, { ok: false, error: 'no_admin_key', message: '未配置 ADMIN_KEY' });
  }
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: 'forbid', message: '仅主管理员可管理次级账号' });
  }
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'no_db' });

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = String(body.name || '').trim().slice(0, 40) || '资讯编辑';
  let plainKey = String(body.key || '').trim();
  if (plainKey && plainKey.length < 8) {
    return json(400, { ok: false, error: 'key_too_short', message: '自定义密钥至少 8 位' });
  }
  if (env.ADMIN_KEY && plainKey && plainKey === env.ADMIN_KEY) {
    return json(400, { ok: false, error: 'key_reserved', message: '不能使用主管理员密钥' });
  }
  if (!plainKey) plainKey = generateNewsAdminKey();

  const now = Date.now();
  const id = crypto.randomUUID();
  const keyHash = await hashAdminKey(plainKey);

  try {
    await ensureNewsAdminsTable(db);
    await db.prepare(
      'INSERT INTO news_admins (id, name, key_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, keyHash, now, now).run();

    return json(201, {
      ok: true,
      admin: { id, name, created_at: now, updated_at: now },
      key: plainKey,
      hint: '请立即复制密钥发给对方；之后无法再查看明文',
    });
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) {
      return json(409, { ok: false, error: 'duplicate', message: '密钥已存在，请换一把' });
    }
    return json(500, { ok: false, error: e.message || 'create_failed' });
  }
}

/** 主管理员：改名 / 重置密钥；删账号用 DELETE?id= */
export async function onRequestPatch(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: 'forbid', message: '仅主管理员可管理次级账号' });
  }
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'no_db' });

  const id = (new URL(request.url).searchParams.get('id') || '').trim();
  if (!id) return json(400, { ok: false, error: 'missing_id' });

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    await ensureNewsAdminsTable(db);
    const row = await db.prepare('SELECT * FROM news_admins WHERE id = ?').bind(id).first();
    if (!row) return json(404, { ok: false, error: 'not_found' });

    const now = Date.now();
    const name = body.name !== undefined
      ? (String(body.name || '').trim().slice(0, 40) || row.name)
      : row.name;

    let plainKey = null;
    let keyHash = row.key_hash;
    if (body.reset_key === true || (body.key && String(body.key).trim())) {
      plainKey = body.key ? String(body.key).trim() : generateNewsAdminKey();
      if (plainKey.length < 8) {
        return json(400, { ok: false, error: 'key_too_short', message: '自定义密钥至少 8 位' });
      }
      if (env.ADMIN_KEY && plainKey === env.ADMIN_KEY) {
        return json(400, { ok: false, error: 'key_reserved', message: '不能使用主管理员密钥' });
      }
      keyHash = await hashAdminKey(plainKey);
    }

    await db.prepare(
      'UPDATE news_admins SET name = ?, key_hash = ?, updated_at = ? WHERE id = ?'
    ).bind(name, keyHash, now, id).run();

    const updated = await db.prepare(
      'SELECT id, name, created_at, updated_at FROM news_admins WHERE id = ?'
    ).bind(id).first();

    const out = { ok: true, admin: rowPublic(updated) };
    if (plainKey) {
      out.key = plainKey;
      out.hint = '请立即复制新密钥；旧密钥立即失效';
    }
    return json(200, out);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) {
      return json(409, { ok: false, error: 'duplicate', message: '密钥已存在，请换一把' });
    }
    return json(500, { ok: false, error: e.message || 'patch_failed' });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: 'forbid', message: '仅主管理员可管理次级账号' });
  }
  const db = env.DB;
  if (!db) return json(500, { ok: false, error: 'no_db' });

  const id = (new URL(request.url).searchParams.get('id') || '').trim();
  if (!id) return json(400, { ok: false, error: 'missing_id' });

  try {
    await ensureNewsAdminsTable(db);
    const result = await db.prepare('DELETE FROM news_admins WHERE id = ?').bind(id).run();
    const changes = result?.meta?.changes ?? 0;
    if (!changes) return json(404, { ok: false, error: 'not_found' });
    return json(200, { ok: true, deleted: id });
  } catch (e) {
    return json(500, { ok: false, error: e.message || 'delete_failed' });
  }
}
