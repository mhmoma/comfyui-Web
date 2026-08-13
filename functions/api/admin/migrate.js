/**
 * 从正式站导入留言 / 画师串上架 / 玩家偏好到新云端库（ADMIN_KEY）
 * POST { board?, trade?, prefs?, replace? }
 */
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

const ALLOWED_PREF_KEYS = new Set([
  "seen_version",
  "mud_codes",
  "ui_theme",
  "notice_seen_at",
  "board_seen_at",
  "notice_bar_hide",
  "unlocked_series",
  "show_locked_series",
  "show_hidden_series",
  "show_adult_tags",
  "fav_tags",
  "fav_artist_data",
  "tag_usage",
  "recent_series",
  "mud_balance",
  "mud_owned",
  "mud_equip",
  "mud_ach_show",
  "mud_draw_day",
]);

const BOARD_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS board_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'guest',
    user_id TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    at INTEGER NOT NULL
  )`,
];

const PREFS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS player_prefs (
    user_id TEXT NOT NULL,
    pref_key TEXT NOT NULL,
    pref_value TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, pref_key)
  )`,
];

const TRADE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS artist_trade_listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL DEFAULT '访客',
    title TEXT NOT NULL,
    trigger_text TEXT NOT NULL,
    content_hash TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    thumb TEXT NOT NULL DEFAULT '',
    image_blocked INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS artist_trade_purchases (
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (listing_id, buyer_id)
  )`,
  `CREATE TABLE IF NOT EXISTS artist_trade_earnings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    at INTEGER NOT NULL
  )`,
];

async function ensure(db) {
  for (const stmt of [...BOARD_SCHEMA, ...TRADE_SCHEMA, ...PREFS_SCHEMA]) {
    try { await db.prepare(stmt).run(); } catch (_) {}
  }
  try { await db.prepare(`ALTER TABLE board_messages ADD COLUMN cosmetics TEXT DEFAULT ''`).run(); } catch (_) {}
  try { await db.prepare(`ALTER TABLE artist_trade_listings ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
  try { await db.prepare(`ALTER TABLE artist_trade_listings ADD COLUMN thumb TEXT NOT NULL DEFAULT ''`).run(); } catch (_) {}
  try { await db.prepare(`ALTER TABLE artist_trade_listings ADD COLUMN image_blocked INTEGER NOT NULL DEFAULT 0`).run(); } catch (_) {}
}

function cleanCosmetics(raw) {
  if (raw == null) return "";
  if (typeof raw === "object") {
    try { return JSON.stringify(raw); } catch (_) { return ""; }
  }
  return String(raw || "");
}

function compareVersion(a, b) {
  const pa = String(a || "0").replace(/^"|"$/g, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").replace(/^"|"$/g, "").split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function mergePrefValue(key, oldVal, newVal) {
  const a = String(oldVal ?? "");
  const b = String(newVal ?? "");
  if (!a) return b;
  if (!b) return a;
  if (key === "seen_version") {
    return compareVersion(a, b) >= 0 ? a.replace(/^"|"$/g, "") : b.replace(/^"|"$/g, "");
  }
  if (key === "mud_codes") {
    const set = new Set(
      [...a.split(","), ...b.split(",")]
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return Array.from(set).join(",");
  }
  if (key === "notice_seen_at" || key === "board_seen_at" || key === "mud_balance") {
    return String(Math.max(Number(a) || 0, Number(b) || 0));
  }
  return b || a;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "POST") return json(405, { ok: false, error: "method" });
  if (!env.ADMIN_KEY) return json(503, { ok: false, error: "no_admin_key" });
  if (!checkAdmin(request, env)) return json(403, { ok: false, error: "forbid" });
  if (!env.DB) return json(500, { ok: false, error: "no_db" });

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return json(400, { ok: false, error: "bad_json" });
  }

  await ensure(env.DB);
  const replace = !!body.replace;
  const stats = {
    boardInserted: 0,
    boardSkipped: 0,
    listingsInserted: 0,
    listingsSkipped: 0,
    purchasesInserted: 0,
    purchasesSkipped: 0,
    earningsInserted: 0,
    earningsSkipped: 0,
    prefsInserted: 0,
    prefsMerged: 0,
    prefsSkipped: 0,
  };

  if (replace) {
    if (Array.isArray(body.board)) {
      await env.DB.prepare("DELETE FROM board_messages").run();
    }
    if (body.trade && typeof body.trade === "object") {
      await env.DB.prepare("DELETE FROM artist_trade_earnings").run();
      await env.DB.prepare("DELETE FROM artist_trade_purchases").run();
      await env.DB.prepare("DELETE FROM artist_trade_listings").run();
    }
    if (Array.isArray(body.prefs) && body.replacePrefs) {
      await env.DB.prepare("DELETE FROM player_prefs").run();
    }
  }

  if (Array.isArray(body.board)) {
    for (const row of body.board) {
      const id = String(row.id || "").trim().slice(0, 80);
      if (!id) continue;
      const text = String(row.text || "").slice(0, 200);
      if (!text) continue;
      try {
        const result = await env.DB.prepare(
          `INSERT OR IGNORE INTO board_messages
           (id, text, name, user_id, ip, badge, cosmetics, at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          text,
          String(row.name || "访客").slice(0, 24),
          String(row.userId || row.user_id || "").slice(0, 80),
          String(row.ip || "").slice(0, 64),
          String(row.badge || "").slice(0, 80),
          cleanCosmetics(row.cosmetics).slice(0, 2000),
          Math.floor(Number(row.at) || Date.now())
        ).run();
        if (Number(result?.meta?.changes || 0) > 0) stats.boardInserted += 1;
        else stats.boardSkipped += 1;
      } catch (_) {
        stats.boardSkipped += 1;
      }
    }
  }

  const trade = body.trade && typeof body.trade === "object" ? body.trade : null;
  if (trade) {
    const listings = Array.isArray(trade.listings) ? trade.listings : [];
    for (const row of listings) {
      const id = String(row.id || "").trim().slice(0, 80);
      if (!id) continue;
      const trigger = String(row.trigger_text || row.trigger || "").slice(0, 1200);
      const title = String(row.title || "").slice(0, 80) || trigger.slice(0, 40) || id;
      if (!trigger) continue;
      try {
        const result = await env.DB.prepare(
          `INSERT OR IGNORE INTO artist_trade_listings
           (id, seller_id, seller_name, title, trigger_text, content_hash, price, image, thumb, image_blocked, status, at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          String(row.seller_id || row.sellerId || "").slice(0, 80) || "unknown",
          String(row.seller_name || row.sellerName || "访客").slice(0, 40),
          title,
          trigger,
          String(row.content_hash || row.contentHash || "").slice(0, 128),
          Math.max(0, Math.min(5, Math.floor(Number(row.price) || 0))),
          String(row.image || "").slice(0, 220_000),
          String(row.thumb || "").slice(0, 60_000),
          Number(row.image_blocked || row.imageBlocked) ? 1 : 0,
          String(row.status || "active") === "off" ? "off" : "active",
          Math.floor(Number(row.at) || Date.now())
        ).run();
        if (Number(result?.meta?.changes || 0) > 0) stats.listingsInserted += 1;
        else stats.listingsSkipped += 1;
      } catch (_) {
        stats.listingsSkipped += 1;
      }
    }

    const purchases = Array.isArray(trade.purchases) ? trade.purchases : [];
    for (const row of purchases) {
      const listingId = String(row.listing_id || row.listingId || "").trim().slice(0, 80);
      const buyerId = String(row.buyer_id || row.buyerId || "").trim().slice(0, 80);
      if (!listingId || !buyerId) continue;
      try {
        const result = await env.DB.prepare(
          `INSERT OR IGNORE INTO artist_trade_purchases (listing_id, buyer_id, at) VALUES (?, ?, ?)`
        ).bind(listingId, buyerId, Math.floor(Number(row.at) || Date.now())).run();
        if (Number(result?.meta?.changes || 0) > 0) stats.purchasesInserted += 1;
        else stats.purchasesSkipped += 1;
      } catch (_) {
        stats.purchasesSkipped += 1;
      }
    }

    const earnings = Array.isArray(trade.earnings) ? trade.earnings : [];
    for (const row of earnings) {
      const id = String(row.id || "").trim().slice(0, 80);
      if (!id) continue;
      try {
        const result = await env.DB.prepare(
          `INSERT OR IGNORE INTO artist_trade_earnings
           (id, seller_id, buyer_id, listing_id, amount, claimed, at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          String(row.seller_id || row.sellerId || "").slice(0, 80),
          String(row.buyer_id || row.buyerId || "").slice(0, 80),
          String(row.listing_id || row.listingId || "").slice(0, 80),
          Math.max(0, Math.floor(Number(row.amount) || 0)),
          Number(row.claimed) ? 1 : 0,
          Math.floor(Number(row.at) || Date.now())
        ).run();
        if (Number(result?.meta?.changes || 0) > 0) stats.earningsInserted += 1;
        else stats.earningsSkipped += 1;
      } catch (_) {
        stats.earningsSkipped += 1;
      }
    }
  }

  if (Array.isArray(body.prefs)) {
    for (const row of body.prefs) {
      const userId = String(row.userId || row.user_id || "").trim().slice(0, 80);
      const key = String(row.key || row.pref_key || "").trim();
      if (!userId || !ALLOWED_PREF_KEYS.has(key)) {
        stats.prefsSkipped += 1;
        continue;
      }
      let value = String(row.value ?? row.pref_value ?? "").slice(0, key === "mud_codes" ? 512 : 256);
      if (key === "seen_version") value = value.replace(/^"|"$/g, "").slice(0, 32);
      const incomingAt = Math.floor(Number(row.updatedAt || row.updated_at) || Date.now());
      try {
        const existing = await env.DB.prepare(
          "SELECT pref_value, updated_at FROM player_prefs WHERE user_id = ? AND pref_key = ? LIMIT 1"
        ).bind(userId, key).first();
        if (!existing) {
          await env.DB.prepare(
            `INSERT INTO player_prefs (user_id, pref_key, pref_value, updated_at) VALUES (?, ?, ?, ?)`
          ).bind(userId, key, value, incomingAt).run();
          stats.prefsInserted += 1;
          continue;
        }
        const merged = mergePrefValue(key, value, existing.pref_value || "");
        const nextAt = Math.max(incomingAt, Number(existing.updated_at) || 0);
        if (merged === String(existing.pref_value || "") && nextAt === Number(existing.updated_at || 0)) {
          stats.prefsSkipped += 1;
          continue;
        }
        await env.DB.prepare(
          `UPDATE player_prefs SET pref_value = ?, updated_at = ? WHERE user_id = ? AND pref_key = ?`
        ).bind(merged, nextAt, userId, key).run();
        stats.prefsMerged += 1;
      } catch (_) {
        stats.prefsSkipped += 1;
      }
    }
  }

  return json(200, { ok: true, stats, replace });
}
