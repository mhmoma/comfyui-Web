const PAGE_SIZE = 12;
const MAX_TITLE = 40;
const MAX_TRIGGER = 800;
const MAX_IMAGE = 220_000;
const MAX_PRICE = 50000;
const RATE_WINDOW_MS = 20_000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS artist_trade_listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL DEFAULT '访客',
    title TEXT NOT NULL,
    trigger_text TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_at ON artist_trade_listings(at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_seller ON artist_trade_listings(seller_id, at DESC)`,
  `CREATE TABLE IF NOT EXISTS artist_trade_purchases (
    listing_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (listing_id, buyer_id)
  )`,
];

async function ensureTable(db) {
  try {
    await db.prepare("SELECT 1 FROM artist_trade_listings LIMIT 1").all();
  } catch (_) {
    for (const stmt of SCHEMA) {
      await db.prepare(stmt).run();
    }
  }
  try {
    await db.prepare("SELECT 1 FROM artist_trade_purchases LIMIT 1").all();
  } catch (_) {
    for (const stmt of SCHEMA.slice(3)) {
      await db.prepare(stmt).run();
    }
  }
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function cleanUserId(value) {
  return String(value || "").trim().slice(0, 80);
}

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24) || "访客";
}

function cleanTitle(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
}

function cleanTrigger(value) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, MAX_TRIGGER);
}

function cleanImage(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(text)) return "";
  if (text.length > MAX_IMAGE) return "";
  return text;
}

function cleanPrice(value) {
  const n = Math.floor(Number(value) || 0);
  if (n < 1 || n > MAX_PRICE) return 0;
  return n;
}

function publicRow(row, { unlocked = false } = {}) {
  const item = {
    id: row.id,
    title: row.title,
    sellerName: row.seller_name || "访客",
    sellerId: row.seller_id || "",
    price: Number(row.price) || 0,
    image: row.image || "",
    at: Number(row.at) || 0,
    unlocked: !!unlocked,
  };
  if (unlocked) item.trigger = row.trigger_text || "";
  else item.trigger = "";
  return item;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.DB) return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  await ensureTable(env.DB);

  if (request.method === "GET") {
    const url = new URL(request.url);
    const userId = cleanUserId(url.searchParams.get("userId"));
    const pageRaw = Math.floor(Number(url.searchParams.get("page")) || 1);
    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'active'"
    ).first();
    const total = Number(totalRow?.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    let page = pageRaw < 1 ? 1 : pageRaw;
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * PAGE_SIZE;
    const { results } = await env.DB.prepare(
      `SELECT id, seller_id, seller_name, title, trigger_text, price, image, at
       FROM artist_trade_listings
       WHERE status = 'active'
       ORDER BY at DESC
       LIMIT ? OFFSET ?`
    ).bind(PAGE_SIZE, offset).all();

    let bought = new Set();
    if (userId && results?.length) {
      const ids = results.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const purchased = await env.DB.prepare(
        `SELECT listing_id FROM artist_trade_purchases
         WHERE buyer_id = ? AND listing_id IN (${placeholders})`
      ).bind(userId, ...ids).all();
      bought = new Set((purchased.results || []).map((r) => r.listing_id));
    }

    const rows = (results || []).map((row) => {
      const unlocked = !!(userId && (row.seller_id === userId || bought.has(row.id)));
      return publicRow(row, { unlocked });
    });

    return json(200, { ok: true, rows, page, pageSize: PAGE_SIZE, total, totalPages });
  }

  if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    const action = String(body.action || "").trim();
    const userId = cleanUserId(body.userId);
    if (!userId) return json(400, { ok: false, error: "no_user", message: "请先登录后再操作" });

    if (action === "list") {
      const title = cleanTitle(body.title);
      const trigger = cleanTrigger(body.trigger);
      const price = cleanPrice(body.price);
      const image = cleanImage(body.image);
      const sellerName = cleanName(body.sellerName || body.name);
      if (!title) return json(400, { ok: false, error: "no_title", message: "请填写标题" });
      if (!trigger) return json(400, { ok: false, error: "no_trigger", message: "请填写画师串" });
      if (!price) return json(400, { ok: false, error: "bad_price", message: "价格需为 1–50000 画泥" });
      if (!image) return json(400, { ok: false, error: "no_image", message: "请上传示例图（压缩后仍过大或不支持）" });

      const recent = await env.DB.prepare(
        "SELECT at FROM artist_trade_listings WHERE seller_id = ? ORDER BY at DESC LIMIT 1"
      ).bind(userId).first();
      if (recent && Date.now() - Number(recent.at) < RATE_WINDOW_MS) {
        return json(429, { ok: false, error: "rate_limit", message: "上架太频繁，请稍后再试" });
      }

      const id = `at-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO artist_trade_listings
         (id, seller_id, seller_name, title, trigger_text, price, image, status, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
      ).bind(id, userId, sellerName, title, trigger, price, image, now).run();

      return json(200, {
        ok: true,
        item: publicRow({
          id,
          seller_id: userId,
          seller_name: sellerName,
          title,
          trigger_text: trigger,
          price,
          image,
          at: now,
        }, { unlocked: true }),
      });
    }

    if (action === "buy") {
      const listingId = String(body.listingId || "").trim().slice(0, 64);
      if (!listingId) return json(400, { ok: false, error: "no_id", message: "缺少商品" });
      const row = await env.DB.prepare(
        `SELECT id, seller_id, seller_name, title, trigger_text, price, image, status, at
         FROM artist_trade_listings WHERE id = ? LIMIT 1`
      ).bind(listingId).first();
      if (!row || row.status !== "active") {
        return json(404, { ok: false, error: "gone", message: "商品不存在或已下架" });
      }
      if (row.seller_id === userId) {
        return json(400, { ok: false, error: "self", message: "不能购买自己的画师串" });
      }
      const existed = await env.DB.prepare(
        "SELECT listing_id FROM artist_trade_purchases WHERE listing_id = ? AND buyer_id = ? LIMIT 1"
      ).bind(listingId, userId).first();
      if (existed) {
        return json(200, {
          ok: true,
          already: true,
          item: publicRow(row, { unlocked: true }),
          message: "你已购买过，已重新解锁",
        });
      }
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO artist_trade_purchases (listing_id, buyer_id, at) VALUES (?, ?, ?)"
      ).bind(listingId, userId, now).run();
      return json(200, {
        ok: true,
        already: false,
        price: Number(row.price) || 0,
        item: publicRow(row, { unlocked: true }),
      });
    }

    if (action === "delist") {
      const listingId = String(body.listingId || "").trim().slice(0, 64);
      const row = await env.DB.prepare(
        "SELECT id, seller_id FROM artist_trade_listings WHERE id = ? LIMIT 1"
      ).bind(listingId).first();
      if (!row) return json(404, { ok: false, error: "gone", message: "商品不存在" });
      if (row.seller_id !== userId) return json(403, { ok: false, error: "forbid", message: "只能下架自己的商品" });
      await env.DB.prepare(
        "UPDATE artist_trade_listings SET status = 'off' WHERE id = ?"
      ).bind(listingId).run();
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: "bad_action", message: "未知操作" });
  }

  return json(405, { ok: false, error: "method", message: "不支持的方法" });
}
