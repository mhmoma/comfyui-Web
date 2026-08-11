import { checkAdmin, corsPreflight, json } from "../articles/_shared.js";

async function countSafe(db, sql) {
  try {
    const row = await db.prepare(sql).first();
    return Number(row?.c ?? row?.cnt ?? 0) || 0;
  } catch (_) {
    return -1;
  }
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

  const db = env.DB;
  const [
    articlesPublished,
    articlesDraft,
    boardTotal,
    noticeActive,
    tradeActive,
    tradeOff,
    tradeBlocked,
    artistsTotal,
    seriesTotal,
    charactersTotal,
    prefsTotal,
  ] = await Promise.all([
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'published'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'draft'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM board_messages"),
    countSafe(db, "SELECT COUNT(*) AS c FROM announcements WHERE active = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'active'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'off'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE image_blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artists"),
    countSafe(db, "SELECT COUNT(*) AS c FROM series"),
    countSafe(db, "SELECT COUNT(*) AS c FROM characters"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_prefs"),
  ]);

  return json(200, {
    ok: true,
    at: Date.now(),
    modules: {
      news: {
        label: "资讯",
        published: articlesPublished,
        draft: articlesDraft,
        href: "#news",
      },
      notice: {
        label: "公告",
        active: noticeActive > 0,
        href: "#notice",
      },
      board: {
        label: "留言板",
        total: boardTotal,
        href: "#board",
      },
      trade: {
        label: "画师串交流",
        active: tradeActive,
        off: tradeOff,
        imageBlocked: tradeBlocked,
        href: "#trade",
      },
      artists: {
        label: "画师库",
        total: artistsTotal,
        href: "#artists",
      },
      characters: {
        label: "角色库",
        series: seriesTotal,
        characters: charactersTotal,
        href: "#characters",
      },
      prefs: {
        label: "玩家偏好",
        total: prefsTotal,
        href: "#prefs",
      },
    },
    notes: [
      "画泥余额在玩家本地/KV，本站无服务端账本。",
      "标签库为静态 tags.json，不在此后台 CRUD。",
      "刷新页面不会退出：密钥保存在本机 localStorage。",
    ],
  });
}
