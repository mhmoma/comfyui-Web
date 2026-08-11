const PAGE_SIZE = 20;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    at INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_active_at ON announcements(active, at DESC)`,
];

let ready = false;

async function ensureTable(db) {
  if (ready) return;
  for (const stmt of SCHEMA) {
    try { await db.prepare(stmt).run(); } catch (_) {}
  }
  ready = true;
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function cleanTitle(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** 公告正文：保留 HTML/换行/空白，仅截断长度 */
function cleanBody(value, max = 48000) {
  let s = String(value || "").replace(/\0/g, "");
  // 去掉可执行脚本块（管理端仍可写样式与结构）
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  await ensureTable(env.DB);
  const url = new URL(request.url);
  const admin = checkAdmin(request, env);

  if (request.method === "GET") {
    // 玩家：最新一条生效公告
    if (!admin || url.searchParams.get("view") !== "admin") {
      const row = await env.DB.prepare(
        `SELECT id, title, body, at FROM announcements
         WHERE active = 1 ORDER BY at DESC LIMIT 1`
      ).first();
      return json(200, {
        ok: true,
        item: row
          ? { id: row.id, title: row.title || "", body: row.body || "", at: Number(row.at) || 0 }
          : null,
      });
    }

    const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);
    const totalRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM announcements").first();
    const total = Number(totalRow?.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    let page = pageRaw < 1 ? 1 : pageRaw;
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * PAGE_SIZE;
    const { results } = await env.DB.prepare(
      `SELECT id, title, body, at, active FROM announcements
       ORDER BY at DESC LIMIT ? OFFSET ?`
    ).bind(PAGE_SIZE, offset).all();
    return json(200, {
      ok: true,
      admin: true,
      rows: (results || []).map((r) => ({
        id: r.id,
        title: r.title || "",
        body: r.body || "",
        at: Number(r.at) || 0,
        active: Number(r.active) === 1,
      })),
      page,
      total,
      totalPages,
    });
  }

  if (request.method === "POST") {
    if (!admin) return json(403, { ok: false, error: "forbid", message: "需要管理密钥" });
    let body = {};
    try { body = await request.json(); } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    const action = String(body.action || "create").trim();
    if (action === "create") {
      const title = cleanTitle(body.title, 80);
      const text = cleanBody(body.body || body.text, 48000);
      if (!text) return json(400, { ok: false, error: "empty", message: "请填写公告内容" });
      const id = `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      // 新公告生效时，旧的自动下线，保证玩家只看到一条
      await env.DB.prepare("UPDATE announcements SET active = 0 WHERE active = 1").run();
      await env.DB.prepare(
        `INSERT INTO announcements (id, title, body, at, active) VALUES (?, ?, ?, ?, 1)`
      ).bind(id, title, text, now).run();
      return json(200, { ok: true, item: { id, title, body: text, at: now, active: true } });
    }
    if (action === "deactivate") {
      const id = String(body.id || "").trim().slice(0, 64);
      if (!id) return json(400, { ok: false, error: "no_id", message: "缺少 id" });
      await env.DB.prepare("UPDATE announcements SET active = 0 WHERE id = ?").bind(id).run();
      return json(200, { ok: true, id });
    }
    return json(400, { ok: false, error: "bad_action", message: "未知操作" });
  }

  if (request.method === "DELETE") {
    if (!admin) return json(403, { ok: false, error: "forbid", message: "需要管理密钥" });
    const id = String(url.searchParams.get("id") || "").trim().slice(0, 64);
    if (!id) return json(400, { ok: false, error: "no_id", message: "缺少 id" });
    await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
    return json(200, { ok: true, deleted: id });
  }

  return json(405, { ok: false, error: "method", message: "不支持的方法" });
}
