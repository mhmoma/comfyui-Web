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
    artistsTotal,
    seriesTotal,
    charactersTotal,
    blocksSeries,
    blocksArtist,
    customTagUsers,
  ] = await Promise.all([
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'published'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM articles WHERE status = 'draft'"),
    countSafe(db, "SELECT COUNT(*) AS c FROM artists"),
    countSafe(db, "SELECT COUNT(*) AS c FROM series"),
    countSafe(db, "SELECT COUNT(*) AS c FROM characters"),
    countSafe(db, "SELECT COUNT(*) AS c FROM content_blocks WHERE kind = 'series' AND blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM content_blocks WHERE kind = 'artist' AND blocked = 1"),
    countSafe(db, "SELECT COUNT(*) AS c FROM player_custom_tags"),
  ]);

  return json(200, {
    ok: true,
    at: Date.now(),
    asset: true,
    base: "comfyui-web",
    modules: {
      news: {
        label: "资讯",
        published: articlesPublished,
        draft: articlesDraft,
        href: "#news",
      },
      artists: {
        label: "画师库",
        total: artistsTotal,
        blocked: blocksArtist,
        href: "#artists",
      },
      characters: {
        label: "角色库",
        series: seriesTotal,
        characters: charactersTotal,
        blocked: blocksSeries,
        href: "#characters",
      },
      extras: {
        customTagUsers,
      },
    },
    notes: [
      "本总览来自 comfyui-web 素材库 D1（画师 / 角色 / 资讯 / 自建词条）。",
      "偏好 / 画泥 / 留言 / 公告在 web 新 6og。",
      "交流 / 玩家画师串 / 封面文件在 tk 原；最高级屏蔽写入本站 content_blocks。",
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
