const PAGE_SIZE = 100;
const MAX_ROWS = 500;
const MAX_NAME = 80;
const MAX_TRIGGER = 1200;
const MAX_THUMB = 140_000;
const MAX_SLUG = 64;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_artists (
    user_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    trigger_text TEXT NOT NULL,
    thumb TEXT NOT NULL DEFAULT '',
    trade_id TEXT NOT NULL DEFAULT '',
    from_trade INTEGER NOT NULL DEFAULT 0,
    from_style INTEGER NOT NULL DEFAULT 0,
    artists_json TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, slug)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_player_artists_user_updated
    ON player_artists(user_id, updated_at DESC)`,
];

let ready = false;

async function ensureTable(db) {
  if (ready) return;
  for (const stmt of SCHEMA) {
    try {
      await db.prepare(stmt).run();
    } catch (_) {}
  }
  ready = true;
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key, x-user-id",
    },
  });
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

function cleanSlug(value) {
  const raw = String(value || "").trim().slice(0, MAX_SLUG);
  if (!raw) return "";
  return raw.replace(/[^\w.-]/g, "_").slice(0, MAX_SLUG);
}

function cleanThumb(value) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src.slice(0, 800);
  if (src.startsWith("data:image/")) return src.slice(0, MAX_THUMB);
  return "";
}

function rowToItem(row) {
  let artists = [];
  try {
    const parsed = JSON.parse(row.artists_json || "[]");
    if (Array.isArray(parsed)) artists = parsed.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 20);
  } catch (_) {}
  const thumb = String(row.thumb || "");
  return {
    slug: row.slug,
    name: row.name || "",
    trigger_text: row.trigger_text || "",
    thumb_url: thumb,
    img_url: thumb,
    tradeId: row.trade_id || undefined,
    fromTrade: !!Number(row.from_trade),
    fromStyle: !!Number(row.from_style),
    artists: artists.length ? artists : undefined,
    updated_at: Number(row.updated_at) || 0,
  };
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  await ensureTable(env.DB);

  const url = new URL(request.url);
  const userId = cleanUserId(
    url.searchParams.get("userId")
    || request.headers.get("x-user-id")
    || ""
  );

  if (request.method === "GET") {
    if (url.searchParams.get("view") === "admin") {
      if (!env.ADMIN_KEY) return json(503, { ok: false, error: "no_admin_key" });
      if (!checkAdmin(request, env)) return json(403, { ok: false, error: "forbid" });
      const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
      const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);
      const pageSize = 24;
      const where = [];
      const binds = [];
      if (q) {
        where.push("(user_id LIKE ? OR name LIKE ? OR slug LIKE ?)");
        binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRow = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM player_artists ${whereSql}`
      ).bind(...binds).first();
      const total = Number(totalRow?.c) || 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
      let page = pageRaw < 1 ? 1 : pageRaw;
      if (page > totalPages) page = totalPages;
      const offset = (page - 1) * pageSize;
      const { results } = await env.DB.prepare(
        `SELECT user_id, slug, name, trigger_text, thumb, trade_id, from_trade, from_style, artists_json, updated_at
         FROM player_artists ${whereSql}
         ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, pageSize, offset).all();
      return json(200, {
        ok: true,
        admin: true,
        rows: (results || []).map((row) => ({
          userId: row.user_id,
          ...rowToItem(row),
          hasThumb: !!(row.thumb && String(row.thumb).length > 8),
        })),
        page,
        total,
        totalPages,
        pageSize,
      });
    }

    if (!userId) return json(400, { ok: false, error: "need_user", message: "缺少 userId" });
    const { results } = await env.DB.prepare(
      `SELECT user_id, slug, name, trigger_text, thumb, trade_id, from_trade, from_style, artists_json, updated_at
       FROM player_artists WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`
    ).bind(userId, MAX_ROWS).all();
    const items = (results || []).map(rowToItem);
    return json(200, { ok: true, items, total: items.length });
  }

  if (request.method === "DELETE") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {}
    const uid = cleanUserId(userId || body.userId || url.searchParams.get("userId"));
    if (!uid) return json(400, { ok: false, error: "need_user", message: "缺少 userId" });

    // 管理端：删用户全部 / 按 slug
    if (url.searchParams.get("view") === "admin" || body.admin) {
      if (!checkAdmin(request, env)) return json(403, { ok: false, error: "forbid" });
      const slug = cleanSlug(body.slug || url.searchParams.get("slug") || "");
      if (slug) {
        await env.DB.prepare(`DELETE FROM player_artists WHERE user_id = ? AND slug = ?`)
          .bind(uid, slug).run();
        return json(200, { ok: true, deleted: true, userId: uid, slug });
      }
      await env.DB.prepare(`DELETE FROM player_artists WHERE user_id = ?`).bind(uid).run();
      return json(200, { ok: true, deleted: true, userId: uid, slug: "*" });
    }

    const slug = cleanSlug(body.slug || url.searchParams.get("slug") || "");
    if (!slug) return json(400, { ok: false, error: "need_slug", message: "缺少 slug" });
    await env.DB.prepare(
      `DELETE FROM player_artists WHERE user_id = ? AND slug = ?`
    ).bind(uid, slug).run();
    return json(200, { ok: true });
  }

  if (request.method === "PUT" || request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json" });
    }
    const uid = cleanUserId(userId || body.userId);
    if (!uid) return json(400, { ok: false, error: "need_user", message: "缺少 userId" });

    // 全量替换列表
    if (Array.isArray(body.items) || Array.isArray(body.artists)) {
      const list = (body.items || body.artists || []).slice(0, MAX_ROWS);
      const now = Date.now();
      const rows = [];
      for (const raw of list) {
        if (!raw || typeof raw !== "object") continue;
        const trigger = String(raw.trigger_text || raw.trigger || "").trim().slice(0, MAX_TRIGGER);
        if (!trigger) continue;
        const slug = cleanSlug(raw.slug) || `custom_${now}_${rows.length}`;
        const name = String(raw.name || trigger).trim().slice(0, MAX_NAME) || trigger.slice(0, 40);
        const thumb = cleanThumb(raw.thumb_url || raw.img_url || raw.thumb || "");
        const tradeId = String(raw.tradeId || "").trim().slice(0, 80);
        const artists = Array.isArray(raw.artists)
          ? raw.artists.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 20)
          : [];
        rows.push({
          slug,
          name,
          trigger,
          thumb,
          tradeId,
          fromTrade: raw.fromTrade ? 1 : 0,
          fromStyle: raw.fromStyle ? 1 : 0,
          artistsJson: JSON.stringify(artists),
        });
      }

      await env.DB.prepare(`DELETE FROM player_artists WHERE user_id = ?`).bind(uid).run();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const updatedAt = now - i;
        await env.DB.prepare(
          `INSERT INTO player_artists
            (user_id, slug, name, trigger_text, thumb, trade_id, from_trade, from_style, artists_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          uid,
          row.slug,
          row.name,
          row.trigger,
          row.thumb,
          row.tradeId,
          row.fromTrade,
          row.fromStyle,
          row.artistsJson,
          updatedAt
        ).run();
      }
      return json(200, { ok: true, total: rows.length });
    }

    // 单条 upsert
    const trigger = String(body.trigger_text || body.trigger || "").trim().slice(0, MAX_TRIGGER);
    if (!trigger) return json(400, { ok: false, error: "need_trigger", message: "缺少画师串" });
    const slug = cleanSlug(body.slug) || `custom_${Date.now()}`;
    const name = String(body.name || trigger).trim().slice(0, MAX_NAME) || trigger.slice(0, 40);
    const thumb = cleanThumb(body.thumb_url || body.img_url || body.thumb || "");
    const tradeId = String(body.tradeId || "").trim().slice(0, 80);
    const artists = Array.isArray(body.artists)
      ? body.artists.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 20)
      : [];
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM player_artists WHERE user_id = ?`
    ).bind(uid).first();
    const existed = await env.DB.prepare(
      `SELECT slug FROM player_artists WHERE user_id = ? AND slug = ?`
    ).bind(uid, slug).first();
    if (!existed && Number(countRow?.c || 0) >= MAX_ROWS) {
      return json(400, { ok: false, error: "full", message: `最多保存 ${MAX_ROWS} 条画师串` });
    }
    await env.DB.prepare(
      `INSERT INTO player_artists
        (user_id, slug, name, trigger_text, thumb, trade_id, from_trade, from_style, artists_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, slug) DO UPDATE SET
         name = excluded.name,
         trigger_text = excluded.trigger_text,
         thumb = excluded.thumb,
         trade_id = excluded.trade_id,
         from_trade = excluded.from_trade,
         from_style = excluded.from_style,
         artists_json = excluded.artists_json,
         updated_at = excluded.updated_at`
    ).bind(
      uid,
      slug,
      name,
      trigger,
      thumb,
      tradeId,
      body.fromTrade ? 1 : 0,
      body.fromStyle ? 1 : 0,
      JSON.stringify(artists),
      Date.now()
    ).run();
    return json(200, {
      ok: true,
      item: {
        slug,
        name,
        trigger_text: trigger,
        thumb_url: thumb,
        img_url: thumb,
        tradeId: tradeId || undefined,
        fromTrade: !!body.fromTrade,
        fromStyle: !!body.fromStyle,
        artists: artists.length ? artists : undefined,
      },
    });
  }

  return json(405, { ok: false, error: "method" });
}
