const fs = require('fs');
const path = require('path');

const DELAY = 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SERIES = [
  // existing (expand to 15-20 chars)
  { tag: 'genshin_impact', cn: '原神', pattern: '*_(genshin_impact)', existing: true },
  { tag: 'blue_archive', cn: '蓝色档案', pattern: '*_(blue_archive)', existing: true },
  { tag: 'fate_(series)', cn: 'Fate', pattern: '*_(fate)', existing: true },
  { tag: 'azur_lane', cn: '碧蓝航线', pattern: '*_(azur_lane)', existing: true },
  { tag: 'arknights', cn: '明日方舟', pattern: '*_(arknights)', existing: true },
  { tag: 'hololive', cn: 'Hololive', related: true, existing: true },
  { tag: 'touhou', cn: '东方Project', related: true, existing: true },
  { tag: 'vocaloid', cn: 'Vocaloid', pattern: '*_(vocaloid)', existing: true },
  { tag: 'honkai:_star_rail', cn: '崩坏星穹铁道', pattern: '*_(honkai:_star_rail)', existing: true },
  { tag: 'chainsaw_man', cn: '电锯人', pattern: '*_(chainsaw_man)', existing: true },
  { tag: 'bocchi_the_rock!', cn: '孤独摇滚', related: true, existing: true },
  { tag: 'spy_x_family', cn: '间谍过家家', pattern: '*_(spy_x_family)', existing: true },
  { tag: 'oshi_no_ko', cn: '我推的孩子', related: true, existing: true },
  { tag: 'goddess_of_victory:_nikke', cn: '胜利女神:NIKKE', pattern: '*_(nikke)', existing: true },
  { tag: 'kimetsu_no_yaiba', cn: '鬼灭之刃', related: true, existing: true },
  { tag: 'jujutsu_kaisen', cn: '咒术回战', related: true, existing: true },
  { tag: 're:zero_kara_hajimeru_isekai_seikatsu', cn: 'Re:Zero', pattern: '*_(re:zero)', existing: true },
  { tag: 'sword_art_online', cn: '刀剑神域', pattern: '*_(sao)', existing: true },
  { tag: 'one_piece', cn: '海贼王', pattern: '*_(one_piece)', existing: true },
  { tag: 'naruto_(series)', cn: '火影忍者', pattern: '*_(naruto)', existing: true },
  { tag: 'pokemon_(series)', cn: '宝可梦', related: true, existing: true },
  { tag: 'love_live!', cn: 'LoveLive', related: true, existing: true },
  { tag: 'kono_subarashii_sekai_ni_shukufuku_wo!', cn: '为美好世界献上祝福', pattern: '*_(konosuba)', existing: true },

  // new series
  { tag: 'kantai_collection', cn: '舰队Collection', pattern: '*_(kancolle)' },
  { tag: 'idolmaster', cn: '偶像大师', related: true },
  { tag: 'bang_dream!', cn: 'BanG Dream!', related: true },
  { tag: 'mahou_shoujo_madoka_magica', cn: '魔法少女小圆', related: true },
  { tag: 'neon_genesis_evangelion', cn: 'EVA新世纪福音战士', related: true },
  { tag: 'dragon_ball', cn: '龙珠', related: true },
  { tag: 'shingeki_no_kyojin', cn: '进击的巨人', pattern: '*_(shingeki_no_kyojin)' },
  { tag: 'honkai_impact_3rd', cn: '崩坏3rd', pattern: '*_(honkai_impact)' },
  { tag: 'girls_frontline', cn: '少女前线', pattern: "*_(girls'_frontline)" },
  { tag: 'umamusume', cn: '赛马娘', pattern: '*_(umamusume)' },
  { tag: 'lycoris_recoil', cn: 'Lycoris Recoil 莉可丽丝', pattern: '*_(lycoris_recoil)' },
  { tag: 'boku_no_hero_academia', cn: '我的英雄学院', related: true },
  { tag: 'toaru_majutsu_no_index', cn: '魔法禁书目录', related: true },
  { tag: 'date_a_live', cn: '约会大作战', related: true },
  { tag: 'princess_connect!', cn: '公主连结', pattern: '*_(princess_connect!)' },
  { tag: 'dungeon_meshi', cn: '迷宫饭', pattern: '*_(dungeon_meshi)' },
  { tag: 'sousou_no_frieren', cn: '葬送的芙莉莲', pattern: '*_(sousou_no_frieren)' },
  { tag: 'mushoku_tensei', cn: '无职转生', pattern: '*_(mushoku_tensei)' },
  { tag: 'violet_evergarden', cn: '紫罗兰永恒花园', related: true },
  { tag: 'made_in_abyss', cn: '来自深渊', pattern: '*_(made_in_abyss)' },
  { tag: 'nier_(series)', cn: '尼尔', pattern: '*_(nier*' },
  { tag: 'final_fantasy', cn: '最终幻想', related: true },
  { tag: 'granblue_fantasy', cn: '碧蓝幻想', pattern: '*_(granblue_fantasy)' },
  { tag: 'k-on!', cn: '轻音少女', related: true },
  { tag: 'kill_la_kill', cn: '斩服少女', related: true },
  { tag: 'danganronpa_(series)', cn: '弹丸论破', related: true },
  { tag: 'go-toubun_no_hanayome', cn: '五等分的新娘', related: true },
  { tag: 'tensei_shitara_slime_datta_ken', cn: '转生史莱姆', related: true },
  { tag: 'steins;gate', cn: '命运石之门', related: true },
  { tag: 'kobayashi-san_chi_no_maidragon', cn: '小林家的龙女仆', pattern: '*_(maidragon)' },
  { tag: 'high_school_dxd', cn: '恶魔高校DxD', related: true },
  { tag: 'darling_in_the_franxx', cn: 'DARLING in the FRANXX', pattern: '*_(darling_in_the_franxx)' },
  { tag: 'zenless_zone_zero', cn: '绝区零', pattern: '*_(zenless_zone_zero)' },
  { tag: 'wuthering_waves', cn: '鸣潮', pattern: '*_(wuthering_waves)' },
  { tag: 'reverse:1999', cn: '重返未来:1999', pattern: '*_(reverse:1999)' },
  { tag: 'limbus_company', cn: 'Limbus Company', pattern: '*_(project_moon)' },
  { tag: 'persona', cn: '女神异闻录', pattern: '*_(persona_*)' },
];

const KNOWN_SERIES_SUFFIXES = [
  'genshin_impact','blue_archive','fate','azur_lane','arknights','honkai:_star_rail',
  'chainsaw_man','spy_x_family','nikke','re:zero','sao','one_piece','naruto',
  'konosuba','kancolle','umamusume','lycoris_recoil','princess_connect!',
  'dungeon_meshi','sousou_no_frieren','mushoku_tensei','made_in_abyss',
  'granblue_fantasy','maidragon','darling_in_the_franxx','zenless_zone_zero',
  'wuthering_waves','reverse:1999','project_moon','honkai_impact',
  "girls'_frontline",'shingeki_no_kyojin','vocaloid','persona'
];

async function fetchByPattern(pattern) {
  const url = `https://danbooru.donmai.us/tags.json?search[name_matches]=${encodeURIComponent(pattern)}&search[category]=4&search[order]=count&limit=25`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.filter(t => t.post_count >= 300).map(t => ({ name: t.name, count: t.post_count }));
}

async function fetchByRelated(seriesTag) {
  const url = `https://danbooru.donmai.us/related_tag.json?query=${encodeURIComponent(seriesTag)}&category=character`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  if (!data.related_tags) return [];
  return data.related_tags
    .filter(t => t.tag && t.tag.post_count >= 300)
    .map(t => ({ name: t.tag.name, count: t.tag.post_count }));
}

function filterRelatedResults(chars, seriesTag) {
  return chars.filter(c => {
    const name = c.name;
    if (name.includes('trainer_') || name.includes('producer_') ||
        name.includes('commander_') || name.includes('admiral_') ||
        name.includes('sensei_') || name.includes('doctor_')) {
      return false;
    }
    const seriesInTag = name.match(/_\(([^)]+)\)$/);
    if (seriesInTag) {
      const s = seriesInTag[1];
      const belongsToOther = KNOWN_SERIES_SUFFIXES.some(ks =>
        ks !== seriesTag && !seriesTag.includes(ks) && s.includes(ks)
      );
      if (belongsToOther) return false;
    }
    return true;
  });
}

function formatTagName(tagName) {
  return tagName
    .replace(/_\([^)]+\)$/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function main() {
  const allResults = {};

  for (let i = 0; i < SERIES.length; i++) {
    const s = SERIES[i];
    console.log(`[${i+1}/${SERIES.length}] ${s.cn} (${s.tag})...`);

    let chars = [];
    try {
      if (s.pattern && !s.related) {
        chars = await fetchByPattern(s.pattern);
        console.log(`  [pattern] ${chars.length} chars`);
      } else {
        chars = await fetchByRelated(s.tag);
        chars = filterRelatedResults(chars, s.tag);
        console.log(`  [related+filter] ${chars.length} chars`);
      }
    } catch(e) {
      console.error(`  ERROR: ${e.message}`);
    }

    const top = chars.slice(0, 20);
    allResults[s.tag] = {
      cn: s.cn,
      existing: !!s.existing,
      characters: top.map(c => ({
        danbooru: c.name,
        display: formatTagName(c.name),
        tag: c.name.replace(/_\([^)]+\)$/, ''),
        count: c.count
      }))
    };

    if (top.length > 0) {
      console.log(`  Top: ${top.slice(0,5).map(c=>formatTagName(c.name)).join(', ')}`);
    }

    if (i < SERIES.length - 1) await sleep(DELAY);
  }

  const outPath = path.join(__dirname, 'danbooru_chars_clean.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`\nSaved to ${outPath}`);

  let newSeries = 0, newChars = 0;
  for (const v of Object.values(allResults)) {
    if (!v.existing) { newSeries++; newChars += v.characters.length; }
  }
  console.log(`New: ${newSeries} series, ${newChars} characters`);
  console.log(`Existing expanded: ${Object.values(allResults).filter(v=>v.existing).length} series`);
}

main();
