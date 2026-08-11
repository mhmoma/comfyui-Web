const PAGE_SIZE = 12;
const MAX_TITLE = 40;
const MAX_TRIGGER = 800;
const MAX_IMAGE = 220_000;
const MAX_THUMB = 60_000;
const MAX_PRICE = 5;
const RATE_WINDOW_MS = 20_000;

const SCHEMA = [
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
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_at ON artist_trade_listings(at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_active_at ON artist_trade_listings(status, at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_seller ON artist_trade_listings(seller_id, at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_hash ON artist_trade_listings(content_hash)`,
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
  `CREATE INDEX IF NOT EXISTS idx_artist_trade_earn_seller ON artist_trade_earnings(seller_id, claimed, at DESC)`,
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
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS artist_trade_purchases (
        listing_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        at INTEGER NOT NULL,
        PRIMARY KEY (listing_id, buyer_id)
      )`
    ).run();
  }
  try {
    await db.prepare(`ALTER TABLE artist_trade_listings ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''`).run();
  } catch (_) {}
  try {
    await db.prepare(`ALTER TABLE artist_trade_listings ADD COLUMN thumb TEXT NOT NULL DEFAULT ''`).run();
  } catch (_) {}
  try {
    await db.prepare(
      `ALTER TABLE artist_trade_listings ADD COLUMN image_blocked INTEGER NOT NULL DEFAULT 0`
    ).run();
  } catch (_) {}
  try {
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_artist_trade_active_at ON artist_trade_listings(status, at DESC)`
    ).run();
  } catch (_) {}
  try {
    await db.prepare("SELECT 1 FROM artist_trade_earnings LIMIT 1").all();
  } catch (_) {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS artist_trade_earnings (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        claimed INTEGER NOT NULL DEFAULT 0,
        at INTEGER NOT NULL
      )`
    ).run();
    await db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_artist_trade_earn_seller ON artist_trade_earnings(seller_id, claimed, at DESC)`
    ).run();
  }
}

function json(status, data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
      ...extraHeaders,
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

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

function isImageBlocked(row) {
  return Number(row?.image_blocked) === 1;
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

function normalizeTrigger(value) {
  return cleanTrigger(value)
    .toLowerCase()
    .replace(/[，]/g, ",")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

async function contentHash(value) {
  const norm = normalizeTrigger(value);
  const data = new TextEncoder().encode(norm);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanImage(value, maxLen = MAX_IMAGE) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(text)) return "";
  if (text.length > maxLen) return "";
  return text;
}

const ALLOW_IMAGE_HOST_SUFFIXES = [
  "dzmm.ai",
  "dzmm.io",
  "aifukk.com",
  "fuckaibot.com",
  "thottai.com",
  "aicbnv.com",
  "aikda.com",
  "ainvmei.com",
  "girlloveai.com",
  "meimoaidao.com",
  "loreveil.xyz",
  "museloom.xyz",
  "echolore.xyz",
];

function cleanRemoteImageUrl(value) {
  const text = String(value || "").trim();
  if (!/^https:\/\//i.test(text) || text.length > 4000) return "";
  try {
    const u = new URL(text);
    const host = (u.hostname || "").toLowerCase();
    if (!ALLOW_IMAGE_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s))) return "";
    return text;
  } catch (_) {
    return "";
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 服务端拉取平台效果图并转成可入库的 data URL（绕过浏览器 CORS） */
async function fetchRemoteListingImage(url) {
  // 优先用 CF Image Resizing 生成列表缩略图（失败则再拉原图）
  let thumb = "";
  try {
    const thumbRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "image/jpeg,image/webp,image/*,*/*;q=0.8",
        "User-Agent": "comfyui-web-artist-trade/1.0",
      },
      cf: {
        image: {
          width: 280,
          height: 420,
          fit: "cover",
          quality: 42,
          format: "jpeg",
        },
      },
    });
    if (thumbRes.ok) {
      const buf = await thumbRes.arrayBuffer();
      if (buf.byteLength && buf.byteLength < 80_000) {
        const dataUrl = `data:image/jpeg;base64,${bytesToBase64(new Uint8Array(buf))}`;
        if (dataUrl.length <= MAX_THUMB) thumb = dataUrl;
      }
    }
  } catch (_) {}

  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": "comfyui-web-artist-trade/1.0",
    },
  });
  if (!res.ok) return { image: "", thumb, error: `拉取效果图失败 HTTP ${res.status}` };
  const ctype = String(res.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ctype.startsWith("image/")) return { image: "", thumb, error: "效果图不是图片" };
  const buf = await res.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 2_500_000) {
    if (thumb) return { image: thumb, thumb };
    return { image: "", thumb: "", error: "效果图过大或为空" };
  }
  const dataUrl = `data:${ctype};base64,${bytesToBase64(new Uint8Array(buf))}`;
  if (dataUrl.length > MAX_IMAGE) {
    if (dataUrl.length <= 900_000) {
      return { image: dataUrl, thumb: thumb || (dataUrl.length <= MAX_THUMB ? dataUrl : "") };
    }
    if (thumb) return { image: thumb, thumb };
    return { image: "", thumb: "", error: "效果图过大，请换本地压缩图上架" };
  }
  if (!thumb && dataUrl.length <= MAX_THUMB) thumb = dataUrl;
  return { image: dataUrl, thumb };
}

async function resolveListingImages(body) {
  let image = cleanImage(body.image, MAX_IMAGE);
  let thumb = cleanImage(body.thumb, MAX_THUMB);
  if (image) return { image, thumb: thumb || image };

  const remote = cleanRemoteImageUrl(body.imageUrl || body.image);
  if (!remote) return { image: "", thumb: "", error: "请上传示例图（压缩后仍过大或不支持）" };
  try {
    const fetched = await fetchRemoteListingImage(remote);
    if (!fetched.image) return { image: "", thumb: "", error: fetched.error || "效果图转存失败" };
    return { image: fetched.image, thumb: fetched.thumb || fetched.image };
  } catch (err) {
    return { image: "", thumb: "", error: err?.message || "效果图转存失败" };
  }
}

function cleanPrice(value) {
  const n = Math.floor(Number(value) || 0);
  if (n < 1 || n > MAX_PRICE) return 0;
  return n;
}

function listThumb(row) {
  if (isImageBlocked(row)) return "";
  const thumb = String(row.thumb || "").trim();
  if (thumb && thumb.length <= MAX_THUMB) return thumb;
  // 列表绝不回退到大图：否则 12 条就能把 JSON 撑到数 MB，打开极慢
  const image = String(row.image || "").trim();
  if (image && image.length <= MAX_THUMB) return image;
  return "";
}

/** list=true: 列表只带缩略图；full=true: 购买/导入带原图 */
function publicRow(row, { unlocked = false, list = false, admin = false } = {}) {
  const blocked = isImageBlocked(row);
  let image = "";
  if (admin) {
    // 管理端：未清除前仍可审图；已屏蔽则库内已清空
    image = listThumb({ ...row, image_blocked: 0 }) || String(row.thumb || row.image || "").trim();
    if (image.length > MAX_THUMB) image = String(row.thumb || "").trim().slice(0, MAX_THUMB);
  } else if (!blocked) {
    image = list ? listThumb(row) : (row.image || listThumb(row) || "");
  }
  const item = {
    id: row.id,
    title: row.title,
    sellerName: row.seller_name || "访客",
    sellerId: row.seller_id || "",
    price: Number(row.price) || 0,
    image,
    imageBlocked: blocked,
    at: Number(row.at) || 0,
    unlocked: !!unlocked,
  };
  if (admin) {
    item.status = row.status || "active";
    item.trigger = row.trigger_text || "";
    item.hasImage = !!(String(row.image || "").trim() || String(row.thumb || "").trim());
  } else if (unlocked) {
    item.trigger = row.trigger_text || "";
  } else {
    item.trigger = "";
  }
  return item;
}

async function buyerOwnsContent(db, buyerId, hash, trigger) {
  const byHash = await db.prepare(
    `SELECT 1 AS ok
     FROM artist_trade_purchases p
     JOIN artist_trade_listings l ON l.id = p.listing_id
     WHERE p.buyer_id = ? AND l.content_hash = ?
     LIMIT 1`
  ).bind(buyerId, hash).first();
  if (byHash) return true;
  const { results } = await db.prepare(
    `SELECT l.trigger_text
     FROM artist_trade_purchases p
     JOIN artist_trade_listings l ON l.id = p.listing_id
     WHERE p.buyer_id = ? AND (l.content_hash IS NULL OR l.content_hash = '')
     LIMIT 40`
  ).bind(buyerId).all();
  const norm = normalizeTrigger(trigger);
  for (const row of results || []) {
    if (normalizeTrigger(row.trigger_text) === norm) return true;
  }
  return false;
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
    const admin = checkAdmin(request, env);
    const adminView = admin && url.searchParams.get("view") === "admin";
    const listPageSize = adminView ? 20 : PAGE_SIZE;

    if (adminView) {
      const statusFilter = String(url.searchParams.get("status") || "active").trim();
      const where =
        statusFilter === "all"
          ? "1=1"
          : statusFilter === "off"
            ? "status = 'off'"
            : "status = 'active'";
      const totalRow = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM artist_trade_listings WHERE ${where}`
      ).first();
      const total = Number(totalRow?.c) || 0;
      const totalPages = Math.max(1, Math.ceil(total / listPageSize) || 1);
      let page = pageRaw < 1 ? 1 : pageRaw;
      if (page > totalPages) page = totalPages;
      const offset = (page - 1) * listPageSize;
      const { results } = await env.DB.prepare(
        `SELECT id, seller_id, seller_name, title, trigger_text, price,
                image, thumb, image_blocked, status, at
         FROM artist_trade_listings
         WHERE ${where}
         ORDER BY at DESC
         LIMIT ? OFFSET ?`
      ).bind(listPageSize, offset).all();
      const rows = (results || []).map((row) =>
        publicRow(row, { unlocked: true, list: true, admin: true })
      );
      return json(200, {
        ok: true,
        admin: true,
        rows,
        page,
        pageSize: listPageSize,
        total,
        totalPages,
        maxPrice: MAX_PRICE,
      });
    }

    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'active'"
    ).first();
    const total = Number(totalRow?.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    let page = pageRaw < 1 ? 1 : pageRaw;
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * PAGE_SIZE;
    // 列表只取 thumb；无合格缩略图时不要回退大图（length 限制）
    const { results } = await env.DB.prepare(
      `SELECT id, seller_id, seller_name, title, trigger_text, price,
              thumb,
              CASE
                WHEN image_blocked = 1 THEN ''
                WHEN thumb IS NOT NULL AND thumb != '' THEN ''
                WHEN length(image) <= ${MAX_THUMB} THEN image
                ELSE ''
              END AS image,
              image_blocked,
              at
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
      const item = publicRow(row, { unlocked, list: true });
      if (item.image && item.image.length > MAX_THUMB) item.image = "";
      return item;
    });

    return json(200, { ok: true, rows, page, pageSize: PAGE_SIZE, total, totalPages, maxPrice: MAX_PRICE });
  }

  if (request.method === "DELETE") {
    if (!checkAdmin(request, env)) {
      return json(403, { ok: false, error: "forbid", message: "需要管理员密钥" });
    }
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim().slice(0, 64);
    if (!id || id === "__admin_auth_check__") {
      return json(404, { ok: false, error: "gone", message: "商品不存在" });
    }
    const row = await env.DB.prepare(
      "SELECT id FROM artist_trade_listings WHERE id = ? LIMIT 1"
    ).bind(id).first();
    if (!row) return json(404, { ok: false, error: "gone", message: "商品不存在" });
    await env.DB.prepare("DELETE FROM artist_trade_purchases WHERE listing_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM artist_trade_earnings WHERE listing_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM artist_trade_listings WHERE id = ?").bind(id).run();
    return json(200, { ok: true, deleted: id });
  }

  if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
      return json(400, { ok: false, error: "bad_json", message: "请求体无效" });
    }
    const action = String(body.action || "").trim();

    // 管理端：删除 / 屏蔽图片（打码后对外与卖家均不可见）
    if (action === "admin_delete" || action === "admin_block_image") {
      if (!checkAdmin(request, env)) {
        return json(403, { ok: false, error: "forbid", message: "需要管理员密钥" });
      }
      const listingId = String(body.listingId || body.id || "").trim().slice(0, 64);
      if (!listingId) return json(400, { ok: false, error: "no_id", message: "缺少商品" });
      const row = await env.DB.prepare(
        "SELECT id FROM artist_trade_listings WHERE id = ? LIMIT 1"
      ).bind(listingId).first();
      if (!row) return json(404, { ok: false, error: "gone", message: "商品不存在" });

      if (action === "admin_delete") {
        await env.DB.prepare("DELETE FROM artist_trade_purchases WHERE listing_id = ?").bind(listingId).run();
        await env.DB.prepare("DELETE FROM artist_trade_earnings WHERE listing_id = ?").bind(listingId).run();
        await env.DB.prepare("DELETE FROM artist_trade_listings WHERE id = ?").bind(listingId).run();
        return json(200, { ok: true, deleted: listingId });
      }

      await env.DB.prepare(
        `UPDATE artist_trade_listings
         SET image_blocked = 1, image = '', thumb = ''
         WHERE id = ?`
      ).bind(listingId).run();
      return json(200, { ok: true, blocked: listingId, imageBlocked: true });
    }

    const userId = cleanUserId(body.userId);
    if (!userId) return json(400, { ok: false, error: "no_user", message: "请先登录后再操作" });

    if (action === "list") {
      const title = cleanTitle(body.title);
      const trigger = cleanTrigger(body.trigger);
      const price = cleanPrice(body.price);
      const sellerName = cleanName(body.sellerName || body.name);
      if (!title) return json(400, { ok: false, error: "no_title", message: "请填写标题" });
      if (!trigger) return json(400, { ok: false, error: "no_trigger", message: "请填写画师串" });
      if (!price) return json(400, { ok: false, error: "bad_price", message: `价格需为 1–${MAX_PRICE} 画泥` });

      const resolved = await resolveListingImages(body);
      const image = resolved.image || "";
      const thumb = resolved.thumb || image;
      if (!image) {
        return json(400, {
          ok: false,
          error: "no_image",
          message: resolved.error || "请上传示例图（压缩后仍过大或不支持）",
        });
      }

      const hash = await contentHash(trigger);
      if (await buyerOwnsContent(env.DB, userId, hash, trigger)) {
        return json(403, {
          ok: false,
          error: "no_resale",
          message: "购买获得的画师串不可转售上架",
        });
      }

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
         (id, seller_id, seller_name, title, trigger_text, content_hash, price, image, thumb, image_blocked, status, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?)`
      ).bind(id, userId, sellerName, title, trigger, hash, price, image, thumb, now).run();

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
          thumb,
          image_blocked: 0,
          at: now,
        }, { unlocked: true, list: true }),
      });
    }

    if (action === "buy") {
      const listingId = String(body.listingId || "").trim().slice(0, 64);
      if (!listingId) return json(400, { ok: false, error: "no_id", message: "缺少商品" });
      const row = await env.DB.prepare(
        `SELECT id, seller_id, seller_name, title, trigger_text, price, image, thumb, image_blocked, status, at
         FROM artist_trade_listings WHERE id = ? LIMIT 1`
      ).bind(listingId).first();
      if (!row || row.status !== "active") {
        return json(404, { ok: false, error: "gone", message: "商品不存在或已下架" });
      }
      if (row.seller_id === userId) {
        return json(400, { ok: false, error: "self", message: "不能购买自己的画师串" });
      }
      if ((Number(row.price) || 0) > MAX_PRICE) {
        return json(400, { ok: false, error: "bad_price", message: `价格超过上限 ${MAX_PRICE} 画泥` });
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
      const amount = Number(row.price) || 0;
      await env.DB.prepare(
        "INSERT INTO artist_trade_purchases (listing_id, buyer_id, at) VALUES (?, ?, ?)"
      ).bind(listingId, userId, now).run();
      const earnId = `ae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await env.DB.prepare(
        `INSERT INTO artist_trade_earnings
         (id, seller_id, buyer_id, listing_id, amount, claimed, at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      ).bind(earnId, row.seller_id, userId, listingId, amount, now).run();
      return json(200, {
        ok: true,
        already: false,
        price: amount,
        item: publicRow(row, { unlocked: true }),
        sellerPaid: amount,
      });
    }

    if (action === "get") {
      const listingId = String(body.listingId || "").trim().slice(0, 64);
      if (!listingId) return json(400, { ok: false, error: "no_id", message: "缺少商品" });
      const row = await env.DB.prepare(
        `SELECT id, seller_id, seller_name, title, trigger_text, price, image, thumb, image_blocked, status, at
         FROM artist_trade_listings WHERE id = ? LIMIT 1`
      ).bind(listingId).first();
      if (!row || row.status !== "active") {
        return json(404, { ok: false, error: "gone", message: "商品不存在或已下架" });
      }
      let unlocked = row.seller_id === userId;
      if (!unlocked) {
        const bought = await env.DB.prepare(
          "SELECT listing_id FROM artist_trade_purchases WHERE listing_id = ? AND buyer_id = ? LIMIT 1"
        ).bind(listingId, userId).first();
        unlocked = !!bought;
      }
      if (!unlocked) {
        return json(403, { ok: false, error: "locked", message: "购买后可查看完整内容" });
      }
      return json(200, { ok: true, item: publicRow(row, { unlocked: true }) });
    }

    if (action === "claim") {
      const { results } = await env.DB.prepare(
        `SELECT id, amount FROM artist_trade_earnings
         WHERE seller_id = ? AND claimed = 0
         ORDER BY at ASC`
      ).bind(userId).all();
      const rows = results || [];
      if (!rows.length) {
        return json(200, { ok: true, amount: 0, count: 0, ids: [] });
      }
      const ids = rows.map((r) => r.id);
      const amount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const placeholders = ids.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE artist_trade_earnings SET claimed = 1 WHERE seller_id = ? AND id IN (${placeholders})`
      ).bind(userId, ...ids).run();
      return json(200, { ok: true, amount, count: ids.length, ids });
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
