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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key",
    },
  });
}

function checkAdmin(request, env) {
  const adminKey = request.headers.get("x-admin-key");
  return !!(env.ADMIN_KEY && adminKey && adminKey === env.ADMIN_KEY);
}

async function countSafe(db, sql, ...binds) {
  try {
    const row = await db.prepare(sql).bind(...binds).first();
    return Number(row?.c ?? row?.cnt ?? 0) || 0;
  } catch (_) {
    return -1;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "GET") return json(405, { ok: false, error: "method" });

  if (!env.ADMIN_KEY) {
    return json(503, { ok: false, error: "no_admin_key", message: "未配置 ADMIN_KEY（请在 tk-game-cloud 设置与正式站相同的密钥）" });
  }
  if (!checkAdmin(request, env)) {
    return json(403, { ok: false, error: "forbid", message: "管理密钥错误" });
  }
  if (!env.DB) {
    return json(500, { ok: false, error: "no_db", message: "数据库未配置" });
  }

  const db = env.DB;
  const [
    boardTotal,
    noticeActive,
    tradeActive,
    tradeOff,
    tradeBlocked,
    prefsTotal,
    playerArtists,
    userCount,
    mudHolders,
    mudSumRow,
  ] = await Promise.all([
    countSafe(db, "SELECT COUNT(*) AS c FROM board_messages"),
    countSafe(db, "SELECT COUNT(*) AS c FROM announcements WHERE active = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'active'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE status = 'off'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artist_trade_listings WHERE image_blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_prefs"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_artists"),
    countSafe(db, "SELECT COUNT(DISTINCT user_id) AS c FROM player_prefs"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_prefs WHERE pref_key = 'mud_balance' AND CAST(pref_value AS REAL) > 0"),
    (async () => {
      try {
        const row = await db.prepare(
          "SELECT SUM(CAST(pref_value AS REAL)) AS s FROM player_prefs WHERE pref_key = 'mud_balance'"
        ).first();
        return Math.floor(Number(row?.s) || 0);
      } catch (_) {
        return -1;
      }
    })(),
  ]);

  return json(200, {
    ok: true,
    at: Date.now(),
    cloud: true,
    base: "tk-game-cloud",
    modules: {
      notice: { label: "公告", active: noticeActive > 0, href: "#notice" },
      board: { label: "留言板", total: boardTotal, href: "#board" },
      trade: {
        label: "画师串交流",
        active: tradeActive,
        off: tradeOff,
        imageBlocked: tradeBlocked,
        href: "#trade",
      },
      users: { label: "用户档案", total: userCount, href: "#users" },
      economy: {
        label: "画泥经济",
        holders: mudHolders,
        mudSum: mudSumRow,
        href: "#economy",
      },
      prefs: { label: "偏好条目", total: prefsTotal, href: "#prefs" },
      playerArtists: { label: "玩家画师串", total: playerArtists, href: "#player-artists" },
    },
    notes: [
      "本总览来自 passinbox 新云端库（tk-artist-chains）。",
      "用户管理 / 经济管理 / 已读状态 均读写云端 player_prefs。",
      "画师库 / 角色库 / 资讯仍在正式站素材库。",
    ],
  });
}
