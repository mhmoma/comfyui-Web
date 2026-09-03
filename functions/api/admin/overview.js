import { checkAdmin, corsPreflight, json } from "../articles/_shared.js";

const META_DDL = `CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`;

const CACHE_KEY = "admin_overview_asset_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function countSafe(db, sql) {
  try {
    const row = await db.prepare(sql).first();
    return Number(row?.c ?? row?.cnt ?? 0) || 0;
  } catch (_) {
    return -1;
  }
}

async function ensureMeta(db) {
  try {
    await db.prepare(META_DDL).run();
  } catch (_) {}
}

async function readCache(db) {
  try {
    const row = await db
      .prepare("SELECT value, updated_at FROM app_meta WHERE key = ? LIMIT 1")
      .bind(CACHE_KEY)
      .first();
    if (!row?.value) return null;
    return {
      data: JSON.parse(String(row.value)),
      updatedAt: Number(row.updated_at) || 0,
    };
  } catch (_) {
    return null;
  }
}

async function writeCache(db, data) {
  const now = Date.now();
  try {
    await db
      .prepare(
        `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(CACHE_KEY, JSON.stringify(data), now)
      .run();
  } catch (_) {}
  return now;
}

/** 画师/系列/角色总数优先静态文件，避免 COUNT(*) 扫大表 */
async function staticCatalogTotals(request) {
  const origin = new URL(request.url).origin;
  const opt = { cf: { cacheEverything: true, cacheTtl: 3600 } };
  const out = { artists: -1, series: -1, characters: -1, source: "none" };
  try {
    const [seriesRes, charsRes, artistsRes] = await Promise.all([
      fetch(`${origin}/series-list-20260811.json`, opt),
      fetch(`${origin}/chars/_index.json`, opt),
      fetch(`${origin}/artists-by-score.json`, opt),
    ]);
    if (seriesRes.ok) {
      const list = await seriesRes.json().catch(() => null);
      if (Array.isArray(list)) out.series = list.length;
    }
    if (charsRes.ok) {
      const idx = await charsRes.json().catch(() => null);
      if (idx && typeof idx.chars === "number") out.characters = idx.chars;
      else if (idx?.files) out.characters = Object.keys(idx.files).length;
    }
    if (artistsRes.ok) {
      const list = await artistsRes.json().catch(() => null);
      if (Array.isArray(list)) out.artists = list.length;
    }
    if (out.artists >= 0 || out.series >= 0 || out.characters >= 0) out.source = "static";
  } catch (_) {}
  return out;
}

async function computeOverview(request, db) {
  const staticTotals = await staticCatalogTotals(request);
  const [
    articlesPublished,
    articlesDraft,
    artistsTotalDb,
    seriesTotalDb,
    charactersTotalDb,
    blocksSeries,
    blocksArtist,
    customTagUsers,
  ] = await Promise.all([
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'published'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'draft'"),
    // 静态失败才回落 D1 COUNT
    staticTotals.artists >= 0
      ? Promise.resolve(staticTotals.artists)
      : countSafe(db, "SELECT COUNT(*) AS c FROM artists"),
    staticTotals.series >= 0
      ? Promise.resolve(staticTotals.series)
      : countSafe(db, "SELECT COUNT(*) AS c FROM series"),
    staticTotals.characters >= 0
      ? Promise.resolve(staticTotals.characters)
      : countSafe(db, "SELECT COUNT(*) AS c FROM characters"),
    countSafe(db, "SELECT COUNT(*) AS c FROM content_blocks WHERE kind = 'series' AND blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM content_blocks WHERE kind = 'artist' AND blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_custom_tags"),
  ]);

  return {
    articlesPublished,
    articlesDraft,
    artistsTotal: artistsTotalDb,
    seriesTotal: seriesTotalDb,
    charactersTotal: charactersTotalDb,
    blocksSeries,
    blocksArtist,
    customTagUsers,
    catalogSource: staticTotals.source,
  };
}

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.ADMIN_KEY) {
    return json(503, { ok: false, error: "no_admin_key", message: "未配置 ADMIN_KEY" });
  }
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: "forbid", message: "管理密钥错误" });
  }
  if (!env.DB) {
    return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const db = env.DB;
  await ensureMeta(db);

  let stats = null;
  let cache = "miss";
  let cachedAt = 0;
  if (!force) {
    const hit = await readCache(db);
    if (hit?.data && Date.now() - hit.updatedAt < CACHE_TTL_MS) {
      stats = hit.data;
      cachedAt = hit.updatedAt;
      cache = "hit";
    }
  }
  if (!stats) {
    stats = await computeOverview(request, db);
    cachedAt = await writeCache(db, stats);
    cache = force ? "refresh" : "miss";
  }

  return json(200, {
    ok: true,
    at: Date.now(),
    asset: true,
    base: "comfyui-web",
    cache,
    cachedAt,
    modules: {
      news: {
        label: "资讯",
        published: stats.articlesPublished,
        draft: stats.articlesDraft,
        href: "#news",
      },
      artists: {
        label: "画师库",
        total: stats.artistsTotal,
        blocked: stats.blocksArtist,
        href: "#artists",
      },
      characters: {
        label: "角色库",
        series: stats.seriesTotal,
        characters: stats.charactersTotal,
        blocked: stats.blocksSeries,
        href: "#characters",
      },
      extras: {
        customTagUsers: stats.customTagUsers,
      },
    },
    notes: [
      "本总览来自 comfyui-web 素材库（画师/角色数优先静态；资讯/屏蔽等缓存约 6 小时）。",
      "偏好 / 画泥 / 留言 / 公告在 web 新 6og。",
      "交流 / 玩家画师串 / 封面文件在 tk 原；最高级屏蔽写入本站 content_blocks。",
      "加 ?refresh=1 强制重算。",
    ],
  });
}

/** Pages Functions 统一入口（兼容旧 onRequestGet） */
export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") return onRequestOptions();
  if (request.method === "GET") return onRequestGet(context);
  return json(405, { ok: false, error: "method" });
}
