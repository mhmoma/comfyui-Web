import {
  checkAdmin,
  cleanKind,
  cleanTargetId,
  corsPreflight,
  ensureContentBlocks,
  json,
  listBlockedIds,
  setContentBlock,
} from "./_shared.js";

const PAGE_SIZE = 30;

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  await ensureContentBlocks(env.DB);

  const url = new URL(request.url);
  const admin = checkAdmin(request, env);

  if (request.method === "GET") {
    // 玩家端轻量拉取：被屏蔽的 id 列表（最高级限制）
    if (url.searchParams.get("ids") === "1") {
      const kind = cleanKind(url.searchParams.get("kind") || "");
      if (kind) {
        const ids = await listBlockedIds(env.DB, kind);
        return json(200, { ok: true, kind, ids }, { "Cache-Control": "public, max-age=30" });
      }
      const [series, artist] = await Promise.all([
        listBlockedIds(env.DB, "series"),
        listBlockedIds(env.DB, "artist"),
      ]);
      return json(200, { ok: true, series, artist }, { "Cache-Control": "public, max-age=30" });
    }

    if (!admin || url.searchParams.get("view") !== "admin") {
      return json(403, { ok: false, error: "forbid", message: "需要管理密钥" });
    }

    const kind = cleanKind(url.searchParams.get("kind") || "series") || "series";
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
    const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);
    const filter = String(url.searchParams.get("filter") || "all").trim(); // all | blocked | open

    if (kind === "series") {
      return json(200, await adminSeriesPage(env.DB, { q, pageRaw, filter }));
    }
    return json(200, await adminArtistPage(env.DB, { q, pageRaw, filter }));
  }

  if (request.method === "POST") {
    if (!admin) return json(403, { ok: false, error: "forbid", message: "需要管理密钥" });
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    const kind = cleanKind(body.kind);
    const id = cleanTargetId(body.id || body.targetId);
    const blocked = body.blocked === true || body.blocked === 1 || body.blocked === "1";
    if (!kind || !id) {
      return json(400, { ok: false, error: "bad_target", message: "需要 kind 与 id" });
    }
    const row = await setContentBlock(env.DB, {
      kind,
      id,
      blocked,
      reason: body.reason || "",
    });
    return json(200, { ok: true, ...row });
  }

  return json(405, { ok: false, error: "method", message: "不支持的方法" });
}

async function adminSeriesPage(db, { q, pageRaw, filter }) {
  const where = [];
  const binds = [];
  if (q) {
    where.push("(s.id LIKE ? OR s.name LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (filter === "blocked") {
    where.push("COALESCE(b.blocked, 0) = 1");
  } else if (filter === "open") {
    where.push("COALESCE(b.blocked, 0) = 0");
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await db.prepare(
    `SELECT COUNT(*) AS c
     FROM series s
     LEFT JOIN content_blocks b ON b.kind = 'series' AND b.target_id = s.id
     ${whereSql}`
  ).bind(...binds).first();
  const total = Number(totalRow?.c) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  let page = pageRaw < 1 ? 1 : pageRaw;
  if (page > totalPages) page = totalPages;
  const offset = (page - 1) * PAGE_SIZE;
  const { results } = await db.prepare(
    `SELECT s.id, s.name,
            (SELECT COUNT(*) FROM characters c WHERE c.series_id = s.id) AS char_count,
            COALESCE(b.blocked, 0) AS blocked,
            COALESCE(b.reason, '') AS reason,
            COALESCE(b.at, 0) AS blocked_at
     FROM series s
     LEFT JOIN content_blocks b ON b.kind = 'series' AND b.target_id = s.id
     ${whereSql}
     ORDER BY blocked DESC, char_count DESC, s.name COLLATE NOCASE ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, PAGE_SIZE, offset).all();

  return {
    ok: true,
    kind: "series",
    rows: (results || []).map((r) => ({
      id: r.id,
      name: r.name,
      count: Number(r.char_count) || 0,
      blocked: Number(r.blocked) === 1,
      reason: r.reason || "",
      blockedAt: Number(r.blocked_at) || 0,
    })),
    page,
    total,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}

async function adminArtistPage(db, { q, pageRaw, filter }) {
  const where = [];
  const binds = [];
  if (q) {
    where.push("(a.slug LIKE ? OR a.name LIKE ? OR a.trigger_text LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (filter === "blocked") {
    where.push("COALESCE(b.blocked, 0) = 1");
  } else if (filter === "open") {
    where.push("COALESCE(b.blocked, 0) = 0");
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await db.prepare(
    `SELECT COUNT(*) AS c
     FROM artists a
     LEFT JOIN content_blocks b ON b.kind = 'artist' AND b.target_id = a.slug
     ${whereSql}`
  ).bind(...binds).first();
  const total = Number(totalRow?.c) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  let page = pageRaw < 1 ? 1 : pageRaw;
  if (page > totalPages) page = totalPages;
  const offset = (page - 1) * PAGE_SIZE;
  const { results } = await db.prepare(
    `SELECT a.slug, a.name, a.trigger_text, a.count, a.score,
            COALESCE(b.blocked, 0) AS blocked,
            COALESCE(b.reason, '') AS reason,
            COALESCE(b.at, 0) AS blocked_at
     FROM artists a
     LEFT JOIN content_blocks b ON b.kind = 'artist' AND b.target_id = a.slug
     ${whereSql}
     ORDER BY blocked DESC, a.count DESC, a.name COLLATE NOCASE ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, PAGE_SIZE, offset).all();

  return {
    ok: true,
    kind: "artist",
    rows: (results || []).map((r) => ({
      id: r.slug,
      slug: r.slug,
      name: r.name,
      trigger: r.trigger_text || "",
      count: Number(r.count) || 0,
      score: Number(r.score) || 0,
      blocked: Number(r.blocked) === 1,
      reason: r.reason || "",
      blockedAt: Number(r.blocked_at) || 0,
    })),
    page,
    total,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}
