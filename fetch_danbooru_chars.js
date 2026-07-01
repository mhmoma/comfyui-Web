const fs = require('fs');
const path = require('path');

const DELAY = 1200;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SERIES_MAP = [
  { tag: 'genshin_impact', cn: '原神', existing: true },
  { tag: 'blue_archive', cn: '蓝色档案', existing: true },
  { tag: 'fate_(series)', cn: 'Fate', existing: true },
  { tag: 'azur_lane', cn: '碧蓝航线', existing: true },
  { tag: 'arknights', cn: '明日方舟', existing: true },
  { tag: 'hololive', cn: 'Hololive', existing: true },
  { tag: 'touhou', cn: '东方Project', existing: true },
  { tag: 'vocaloid', cn: 'Vocaloid', existing: true },
  { tag: 'honkai:_star_rail', cn: '崩坏星穹铁道', existing: true },
  { tag: 'chainsaw_man', cn: '电锯人', existing: true },
  { tag: 'bocchi_the_rock!', cn: '孤独摇滚', existing: true },
  { tag: 'spy_x_family', cn: '间谍过家家', existing: true },
  { tag: 'oshi_no_ko', cn: '我推的孩子', existing: true },
  { tag: 'goddess_of_victory:_nikke', cn: '胜利女神:NIKKE', existing: true },
  { tag: 'kimetsu_no_yaiba', cn: '鬼灭之刃', existing: true },
  { tag: 'jujutsu_kaisen', cn: '咒术回战', existing: true },
  { tag: 're:zero_kara_hajimeru_isekai_seikatsu', cn: 'Re:Zero', existing: true },
  { tag: 'sword_art_online', cn: '刀剑神域', existing: true },
  { tag: 'one_piece', cn: '海贼王', existing: true },
  { tag: 'naruto_(series)', cn: '火影忍者', existing: true },
  { tag: 'pokemon_(series)', cn: '宝可梦', existing: true },
  { tag: 'love_live!', cn: 'LoveLive', existing: true },
  { tag: 'kono_subarashii_sekai_ni_shukufuku_wo!', cn: '为美好世界献上祝福', existing: true },

  // --- NEW SERIES ---
  { tag: 'kantai_collection', cn: '舰队Collection', existing: false },
  { tag: 'idolmaster', cn: '偶像大师', existing: false },
  { tag: 'bang_dream!', cn: 'BanG Dream!', existing: false },
  { tag: 'mahou_shoujo_madoka_magica', cn: '魔法少女小圆', existing: false },
  { tag: 'neon_genesis_evangelion', cn: 'EVA新世纪福音战士', existing: false },
  { tag: 'dragon_ball', cn: '龙珠', existing: false },
  { tag: 'attack_on_titan', cn: '进击的巨人', existing: false },
  { tag: 'honkai_impact_3rd', cn: '崩坏3rd', existing: false },
  { tag: 'girls_frontline', cn: '少女前线', existing: false },
  { tag: 'umamusume', cn: '赛马娘', existing: false },
  { tag: 'lycoris_recoil', cn: 'Lycoris Recoil 莉可丽丝', existing: false },
  { tag: 'my_hero_academia', cn: '我的英雄学院', existing: false },
  { tag: 'konosuba', cn: '素晴日(备选)', skip: true },
  { tag: 'to_aru_majutsu_no_index', cn: '魔法禁书目录', existing: false },
  { tag: 'date_a_live', cn: '约会大作战', existing: false },
  { tag: 'princess_connect!', cn: '公主连结', existing: false },
  { tag: 'dungeon_meshi', cn: '迷宫饭', existing: false },
  { tag: 'frieren', cn: '葬送的芙莉莲', existing: false },
  { tag: 'mushoku_tensei', cn: '无职转生', existing: false },
  { tag: 'violet_evergarden', cn: '紫罗兰永恒花园', existing: false },
  { tag: 'made_in_abyss', cn: '来自深渊', existing: false },
  { tag: 'nier_(series)', cn: '尼尔', existing: false },
  { tag: 'final_fantasy', cn: '最终幻想', existing: false },
  { tag: 'granblue_fantasy', cn: '碧蓝幻想', existing: false },
  { tag: 'k-on!', cn: '轻音少女', existing: false },
  { tag: 'kill_la_kill', cn: '斩服少女', existing: false },
  { tag: 'danganronpa_(series)', cn: '弹丸论破', existing: false },
  { tag: 'the_quintessential_quintuplets', cn: '五等分的新娘', existing: false },
  { tag: 'tensei_shitara_slime_datta_ken', cn: '关于我转生变成史莱姆这档事', existing: false },
  { tag: 'steins;gate', cn: '命运石之门', existing: false },
  { tag: 'kobayashi-san_chi_no_maidragon', cn: '小林家的龙女仆', existing: false },
  { tag: 'high_school_dxd', cn: '恶魔高校DxD', existing: false },
  { tag: 'darling_in_the_franxx', cn: 'DARLING in the FRANXX', existing: false },
  { tag: 'zenless_zone_zero', cn: '绝区零', existing: false },
  { tag: 'wuthering_waves', cn: '鸣潮', existing: false },
  { tag: 'reverse:1999', cn: '重返未来:1999', existing: false },
  { tag: 'limbus_company', cn: 'Limbus Company', existing: false },
  { tag: 'persona', cn: '女神异闻录', existing: false },
];

async function fetchRelatedChars(seriesTag) {
  const url = `https://danbooru.donmai.us/related_tag.json?query=${encodeURIComponent(seriesTag)}&category=character`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`  [WARN] ${seriesTag} -> HTTP ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  if (!data.related_tags) return [];
  return data.related_tags
    .filter(t => t.tag && t.tag.post_count >= 500)
    .slice(0, 30)
    .map(t => ({
      name: t.tag.name,
      count: t.tag.post_count
    }));
}

function tagToDisplay(tagName) {
  return tagName
    .replace(/_\([^)]+\)$/, '')
    .replace(/_/g, ' ');
}

async function main() {
  const results = {};
  const toFetch = SERIES_MAP.filter(s => !s.skip);

  for (let i = 0; i < toFetch.length; i++) {
    const s = toFetch[i];
    console.log(`[${i+1}/${toFetch.length}] Fetching: ${s.cn} (${s.tag})...`);
    try {
      const chars = await fetchRelatedChars(s.tag);
      results[s.tag] = {
        cn: s.cn,
        existing: s.existing,
        characters: chars
      };
      console.log(`  -> ${chars.length} characters found`);
      if (chars.length > 0) {
        console.log(`  Top 5: ${chars.slice(0,5).map(c=>c.name).join(', ')}`);
      }
    } catch(e) {
      console.error(`  [ERROR] ${s.tag}: ${e.message}`);
      results[s.tag] = { cn: s.cn, existing: s.existing, characters: [] };
    }
    if (i < toFetch.length - 1) await sleep(DELAY);
  }

  fs.writeFileSync(
    path.join(__dirname, 'danbooru_chars_raw.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log('\nDone! Saved to danbooru_chars_raw.json');

  let totalNew = 0;
  let totalSeries = 0;
  for (const [tag, data] of Object.entries(results)) {
    if (!data.existing && data.characters.length > 0) {
      totalSeries++;
      totalNew += data.characters.length;
    }
  }
  console.log(`\nNew series: ${totalSeries}, New characters total: ${totalNew}`);
}

main();
