const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'danbooru_chars_raw.json'), 'utf8'));
const tagsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'tags.json'), 'utf8'));

const group0 = tagsData['0'];

// Step 1: Remove bad duplicates (subgroups 46+)
const badKeys = Object.keys(group0.subgroups).filter(k => parseInt(k) >= 46);
console.log(`Removing ${badKeys.length} duplicate subgroups (46-${Math.max(...badKeys.map(Number))})`);
badKeys.forEach(k => delete group0.subgroups[k]);

// Step 2: Map existing series subgroups by name
const existingMap = {};
for (const [idx, sg] of Object.entries(group0.subgroups)) {
  const i = parseInt(idx);
  if (i >= 23) {
    existingMap[sg.name] = i;
  }
}
console.log('Existing series:', Object.keys(existingMap).join(', '));

// Step 3: Define new series to add (series NOT in existing 23-45)
const NEW_SERIES = [
  { rawKey: 'kantai_collection', cn: '舰队Collection' },
  { rawKey: 'idolmaster', cn: '偶像大师' },
  { rawKey: 'bang_dream!', cn: 'BanG Dream!' },
  { rawKey: 'mahou_shoujo_madoka_magica', cn: '魔法少女小圆' },
  { rawKey: 'neon_genesis_evangelion', cn: 'EVA新世纪福音战士' },
  { rawKey: 'dragon_ball', cn: '龙珠' },
  { rawKey: 'attack_on_titan', cn: '进击的巨人' },
  { rawKey: 'honkai_impact_3rd', cn: '崩坏3rd' },
  { rawKey: 'girls_frontline', cn: '少女前线' },
  { rawKey: 'umamusume', cn: '赛马娘' },
  { rawKey: 'lycoris_recoil', cn: 'Lycoris Recoil莉可丽丝' },
  { rawKey: 'my_hero_academia', cn: '我的英雄学院' },
  { rawKey: 'to_aru_majutsu_no_index', cn: '魔法禁书目录' },
  { rawKey: 'date_a_live', cn: '约会大作战' },
  { rawKey: 'princess_connect!', cn: '公主连结' },
  { rawKey: 'dungeon_meshi', cn: '迷宫饭' },
  { rawKey: 'frieren', cn: '葬送的芙莉莲' },
  { rawKey: 'mushoku_tensei', cn: '无职转生' },
  { rawKey: 'violet_evergarden', cn: '紫罗兰永恒花园' },
  { rawKey: 'made_in_abyss', cn: '来自深渊' },
  { rawKey: 'nier_(series)', cn: '尼尔' },
  { rawKey: 'final_fantasy', cn: '最终幻想' },
  { rawKey: 'granblue_fantasy', cn: '碧蓝幻想' },
  { rawKey: 'k-on!', cn: '轻音少女' },
  { rawKey: 'kill_la_kill', cn: '斩服少女' },
  { rawKey: 'danganronpa_(series)', cn: '弹丸论破' },
  { rawKey: 'the_quintessential_quintuplets', cn: '五等分的新娘' },
  { rawKey: 'tensei_shitara_slime_datta_ken', cn: '转生史莱姆' },
  { rawKey: 'steins;gate', cn: '命运石之门' },
  { rawKey: 'kobayashi-san_chi_no_maidragon', cn: '小林家的龙女仆' },
  { rawKey: 'high_school_dxd', cn: '恶魔高校DxD' },
  { rawKey: 'darling_in_the_franxx', cn: 'DARLING in the FRANXX' },
  { rawKey: 'zenless_zone_zero', cn: '绝区零' },
  { rawKey: 'wuthering_waves', cn: '鸣潮' },
  { rawKey: 'reverse:1999', cn: '重返未来1999' },
  { rawKey: 'limbus_company', cn: 'Limbus Company' },
  { rawKey: 'persona', cn: '女神异闻录' },
];

// Series keywords for filtering related tags
const SERIES_KEYWORDS = {
  'kantai_collection': ['kancolle'],
  'idolmaster': ['idolmaster'],
  'bang_dream!': ['bang_dream'],
  'mahou_shoujo_madoka_magica': ['madoka_magica'],
  'neon_genesis_evangelion': ['evangelion', 'neon_genesis'],
  'dragon_ball': ['dragon_ball'],
  'attack_on_titan': ['shingeki_no_kyojin'],
  'honkai_impact_3rd': ['honkai_impact'],
  'girls_frontline': ["girls'_frontline", 'girls_frontline'],
  'umamusume': ['umamusume'],
  'lycoris_recoil': ['lycoris_recoil'],
  'my_hero_academia': ['boku_no_hero'],
  'to_aru_majutsu_no_index': ['toaru', 'railgun'],
  'date_a_live': ['date_a_live'],
  'princess_connect!': ['princess_connect'],
  'dungeon_meshi': ['dungeon_meshi'],
  'frieren': ['sousou_no_frieren', 'frieren'],
  'mushoku_tensei': ['mushoku_tensei'],
  'violet_evergarden': ['violet_evergarden'],
  'made_in_abyss': ['made_in_abyss'],
  'nier_(series)': ['nier'],
  'final_fantasy': ['ff', 'final_fantasy'],
  'granblue_fantasy': ['granblue_fantasy'],
  'k-on!': ['k-on'],
  'kill_la_kill': ['kill_la_kill'],
  'danganronpa_(series)': ['danganronpa'],
  'the_quintessential_quintuplets': ['go-toubun', 'quintessential'],
  'tensei_shitara_slime_datta_ken': ['slime_datta_ken', 'rimuru'],
  'steins;gate': ['steins;gate'],
  'kobayashi-san_chi_no_maidragon': ['maidragon'],
  'high_school_dxd': ['highschool_dxd', 'high_school_dxd'],
  'darling_in_the_franxx': ['darling_in_the_franxx'],
  'zenless_zone_zero': ['zenless_zone_zero'],
  'wuthering_waves': ['wuthering_waves'],
  'reverse:1999': ['reverse:1999'],
  'limbus_company': ['project_moon', 'limbus'],
  'persona': ['persona'],
};

const ALL_KNOWN_SUFFIXES = new Set();
for (const kws of Object.values(SERIES_KEYWORDS)) {
  kws.forEach(k => ALL_KNOWN_SUFFIXES.add(k));
}
// add existing series keywords
['genshin_impact','blue_archive','fate','azur_lane','arknights',
 'honkai:_star_rail','chainsaw_man','spy_x_family','nikke','re:zero',
 'sao','one_piece','naruto','konosuba','vocaloid','pokemon'].forEach(k => ALL_KNOWN_SUFFIXES.add(k));

const globalUsed = new Set();
// collect already used tags from existing subgroups
for (const [idx, sg] of Object.entries(group0.subgroups)) {
  const i = parseInt(idx);
  if (i >= 23) {
    sg.tags.forEach(t => {
      if (t.t) globalUsed.add(t.t.toLowerCase());
    });
  }
}

function isGenericChar(name) {
  const generics = ['trainer_','producer_','commander_','admiral_','sensei_','doctor_','doodle_','player_'];
  return generics.some(g => name.startsWith(g));
}

function charBelongsToSeries(charName, seriesKey) {
  const keywords = SERIES_KEYWORDS[seriesKey] || [];
  if (keywords.length === 0) return true;

  const suffix = charName.match(/_\(([^)]+)\)$/);
  if (suffix) {
    const s = suffix[1];
    if (keywords.some(k => s.includes(k))) return true;
    const otherMatch = [...ALL_KNOWN_SUFFIXES].some(k => !keywords.includes(k) && s.includes(k));
    if (otherMatch) return false;
    return false;
  }
  return true;
}

function cleanTag(name) {
  return name.replace(/_\([^)]+\)$/, '').replace(/_/g, ' ');
}

function titleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

let nextIdx = Object.keys(group0.subgroups).length;
let addedCount = 0;

for (const series of NEW_SERIES) {
  const data = rawData[series.rawKey];
  if (!data || !data.characters || data.characters.length === 0) {
    console.log(`[SKIP] ${series.cn}: no raw data`);
    continue;
  }

  const filtered = data.characters
    .filter(c => {
      if (isGenericChar(c.name)) return false;
      if (!charBelongsToSeries(c.name, series.rawKey)) return false;
      if (globalUsed.has(c.name.toLowerCase())) return false;
      return true;
    })
    .slice(0, 15);

  if (filtered.length === 0) {
    console.log(`[SKIP] ${series.cn}: all characters filtered out`);
    continue;
  }

  const tags = filtered.map(c => ({
    t: c.name,
    d: titleCase(cleanTag(c.name))
  }));

  filtered.forEach(c => globalUsed.add(c.name.toLowerCase()));

  group0.subgroups[String(nextIdx)] = {
    name: series.cn,
    tags: tags
  };

  addedCount++;
  console.log(`[NEW] ${series.cn}: ${tags.length} chars (subgroup ${nextIdx}) | e.g. ${tags.slice(0,3).map(t=>t.d).join(', ')}`);
  nextIdx++;
}

// Step 4: Expand existing series that have < 12 chars
const EXPAND_MAP = {
  '原神': 'genshin_impact',
  '蓝色档案': 'blue_archive',
  'Fate': 'fate_(series)',
  '碧蓝航线': 'azur_lane',
  '明日方舟': 'arknights',
  'Hololive': 'hololive',
  '东方Project': 'touhou',
  'Vocaloid': 'vocaloid',
  '崩坏星穹铁道': 'honkai:_star_rail',
  '电锯人': 'chainsaw_man',
  '孤独摇滚': 'bocchi_the_rock!',
  '间谍过家家': 'spy_x_family',
  '我推的孩子': 'oshi_no_ko',
  '胜利女神:NIKKE': 'goddess_of_victory:_nikke',
  '鬼灭之刃': 'kimetsu_no_yaiba',
  '咒术回战': 'jujutsu_kaisen',
  'Re:Zero': 're:zero_kara_hajimeru_isekai_seikatsu',
  '刀剑神域': 'sword_art_online',
  '海贼王': 'one_piece',
  '火影忍者': 'naruto_(series)',
  '宝可梦': 'pokemon_(series)',
  'LoveLive': 'love_live!',
  '为美好世界献上祝福': 'kono_subarashii_sekai_ni_shukufuku_wo!',
};

const EXPAND_KEYWORDS = {
  'genshin_impact': ['genshin_impact'],
  'blue_archive': ['blue_archive'],
  'fate_(series)': ['fate'],
  'azur_lane': ['azur_lane'],
  'arknights': ['arknights'],
  'hololive': [],
  'touhou': [],
  'vocaloid': ['vocaloid'],
  'honkai:_star_rail': ['honkai:_star_rail'],
  'chainsaw_man': ['chainsaw_man'],
  'bocchi_the_rock!': [],
  'spy_x_family': ['spy_x_family'],
  'oshi_no_ko': [],
  'goddess_of_victory:_nikke': ['nikke'],
  'kimetsu_no_yaiba': [],
  'jujutsu_kaisen': [],
  're:zero_kara_hajimeru_isekai_seikatsu': ['re:zero'],
  'sword_art_online': ['sao'],
  'one_piece': ['one_piece'],
  'naruto_(series)': ['naruto'],
  'pokemon_(series)': ['pokemon'],
  'love_live!': [],
  'kono_subarashii_sekai_ni_shukufuku_wo!': ['konosuba'],
};

let expandedCount = 0;
for (const [idx, sg] of Object.entries(group0.subgroups)) {
  const i = parseInt(idx);
  if (i < 23 || i >= 46) continue;
  if (sg.tags.length >= 12) continue;

  const rawKey = EXPAND_MAP[sg.name];
  if (!rawKey || !rawData[rawKey]) continue;

  const existingTags = new Set(sg.tags.map(t => t.t.toLowerCase()));
  const keywords = EXPAND_KEYWORDS[rawKey] || [];

  const candidates = rawData[rawKey].characters
    .filter(c => {
      if (isGenericChar(c.name)) return false;
      if (existingTags.has(c.name.toLowerCase())) return false;
      if (globalUsed.has(c.name.toLowerCase())) return false;
      if (keywords.length > 0) {
        const suffix = c.name.match(/_\(([^)]+)\)$/);
        if (suffix) {
          if (!keywords.some(k => suffix[1].includes(k))) return false;
        }
      }
      return true;
    })
    .slice(0, 12 - sg.tags.length);

  if (candidates.length > 0) {
    const newTags = candidates.map(c => ({
      t: c.name,
      d: titleCase(cleanTag(c.name))
    }));
    sg.tags.push(...newTags);
    candidates.forEach(c => globalUsed.add(c.name.toLowerCase()));
    expandedCount++;
    console.log(`[EXPAND] ${sg.name}: +${newTags.length} (total ${sg.tags.length})`);
  }
}

fs.writeFileSync(
  path.join(__dirname, 'tags.json'),
  JSON.stringify(tagsData, null, 2),
  'utf8'
);

const totalSubgroups = Object.keys(group0.subgroups).length;
const seriesSubgroups = Object.keys(group0.subgroups).filter(k => parseInt(k) >= 23).length;

console.log(`\nDone!`);
console.log(`- Added ${addedCount} new series`);
console.log(`- Expanded ${expandedCount} existing series`);
console.log(`- Total character subgroups: ${totalSubgroups} (${seriesSubgroups} series)`);
