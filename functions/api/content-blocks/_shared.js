const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS content_blocks (
    kind TEXT NOT NULL,
    target_id TEXT NOT NULL,
    blocked INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL DEFAULT '',
    at INTEGER NOT NULL,
    PRIMARY KEY (kind, target_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_blocks_kind ON content_blocks(kind, blocked)`,
];

let ready = false;

export async function ensureContentBlocks(db) {
  if (ready) return;
  for (const stmt of SCHEMA) {
    try {
      await db.prepare(stmt).run();
    } catch (_) {}
  }
  ready = true;
}

export function cleanKind(value) {
  const k = String(value || "").trim().toLowerCase();
  return k === "series" || k === "artist" ? k : "";
}

export function cleanTargetId(value) {
  return String(value || "").trim().slice(0, 160);
}

export async function isContentBlocked(db, kind, id) {
  await ensureContentBlocks(db);
  const k = cleanKind(kind);
  const tid = cleanTargetId(id);
  if (!k || !tid) return false;
  const row = await db.prepare(
    `SELECT blocked FROM content_blocks
     WHERE kind = ? AND target_id = ? AND blocked = 1
     LIMIT 1`
  ).bind(k, tid).first();
  if (row) return true;
  // 兼容大小写：系列 id 有时大小写不一致
  if (k === "series") {
    const row2 = await db.prepare(
      `SELECT blocked FROM content_blocks
       WHERE kind = ? AND lower(target_id) = lower(?) AND blocked = 1
       LIMIT 1`
    ).bind(k, tid).first();
    return !!row2;
  }
  return false;
}

export async function listBlockedIds(db, kind) {
  await ensureContentBlocks(db);
  const k = cleanKind(kind);
  if (!k) return [];
  const { results } = await db.prepare(
    `SELECT target_id FROM content_blocks WHERE kind = ? AND blocked = 1`
  ).bind(k).all();
  return (results || []).map((r) => String(r.target_id || "")).filter(Boolean);
}

export async function setContentBlock(db, { kind, id, blocked, reason = "" }) {
  await ensureContentBlocks(db);
  const k = cleanKind(kind);
  const tid = cleanTargetId(id);
  if (!k || !tid) throw new Error("bad_target");
  const now = Date.now();
  if (blocked) {
    await db.prepare(
      `INSERT INTO content_blocks (kind, target_id, blocked, reason, at)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(kind, target_id) DO UPDATE SET
         blocked = 1,
         reason = excluded.reason,
         at = excluded.at`
    ).bind(k, tid, String(reason || "").slice(0, 200), now).run();
  } else {
    await db.prepare(
      `INSERT INTO content_blocks (kind, target_id, blocked, reason, at)
       VALUES (?, ?, 0, ?, ?)
       ON CONFLICT(kind, target_id) DO UPDATE SET
         blocked = 0,
         reason = excluded.reason,
         at = excluded.at`
    ).bind(k, tid, String(reason || "").slice(0, 200), now).run();
  }
  return { kind: k, id: tid, blocked: !!blocked, at: now };
}

export function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

export function json(status, data, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
      ...extra,
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}
