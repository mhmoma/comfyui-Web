const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'danbooru_chars_raw.json'), 'utf8'));
const tagsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'tags.json'), 'utf8'));

const SERIES_CN_MAP = {
  'genshin_impact': '原神',
  'blue_archive': '蓝色档案',
  'fate_(series)': 'Fate',
  'azur_lane': '碧蓝航线',
  'arknights': '明日方舟',
  'hololive': 'Hololive',
  'touhou': '东方Project',
  'vocaloid': 'Vocaloid',
  'honkai:_star_rail': '崩坏星穹铁道',
  'chainsaw_man': '电锯人',
  'bocchi_the_rock!': '孤独摇滚',
  'spy_x_family': '间谍过家家',
  'oshi_no_ko': '我推的孩子',
  'goddess_of_victory:_nikke': '胜利女神:NIKKE',
  'kimetsu_no_yaiba': '鬼灭之刃',
  'jujutsu_kaisen': '咒术回战',
  're:zero_kara_hajimeru_isekai_seikatsu': 'Re:Zero',
  'sword_art_online': '刀剑神域',
  'one_piece': '海贼王',
  'naruto_(series)': '火影忍者',
  'pokemon_(series)': '宝可梦',
  'love_live!': 'LoveLive',
  'kono_subarashii_sekai_ni_shukufuku_wo!': '为美好世界献上祝福',
  'kantai_collection': '舰队Collection',
  'idolmaster': '偶像大师',
  'bang_dream!': 'BanG Dream!',
  'mahou_shoujo_madoka_magica': '魔法少女小圆',
  'neon_genesis_evangelion': 'EVA新世纪福音战士',
  'dragon_ball': '龙珠',
  'attack_on_titan': '进击的巨人',
  'honkai_impact_3rd': '崩坏3rd',
  'girls_frontline': '少女前线',
  'umamusume': '赛马娘',
  'lycoris_recoil': 'Lycoris Recoil莉可丽丝',
  'my_hero_academia': '我的英雄学院',
  'to_aru_majutsu_no_index': '魔法禁书目录',
  'date_a_live': '约会大作战',
  'princess_connect!': '公主连结',
  'dungeon_meshi': '迷宫饭',
  'frieren': '葬送的芙莉莲',
  'mushoku_tensei': '无职转生',
  'violet_evergarden': '紫罗兰永恒花园',
  'made_in_abyss': '来自深渊',
  'nier_(series)': '尼尔',
  'final_fantasy': '最终幻想',
  'granblue_fantasy': '碧蓝幻想',
  'k-on!': '轻音少女',
  'kill_la_kill': '斩服少女',
  'danganronpa_(series)': '弹丸论破',
  'the_quintessential_quintuplets': '五等分的新娘',
  'tensei_shitara_slime_datta_ken': '转生史莱姆',
  'steins;gate': '命运石之门',
  'kobayashi-san_chi_no_maidragon': '小林家的龙女仆',
  'high_school_dxd': '恶魔高校DxD',
  'darling_in_the_franxx': 'DARLING in the FRANXX',
  'zenless_zone_zero': '绝区零',
  'wuthering_waves': '鸣潮',
  'reverse:1999': '重返未来1999',
  'limbus_company': 'Limbus Company',
  'persona': '女神异闻录',
};

const SERIES_KEYWORDS = {
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
  'sword_art_online': ['sao','sword_art'],
  'one_piece': ['one_piece'],
  'naruto_(series)': ['naruto'],
  'pokemon_(series)': ['pokemon'],
  'love_live!': [],
  'kono_subarashii_sekai_ni_shukufuku_wo!': ['konosuba'],
  'kantai_collection': ['kancolle'],
  'idolmaster': ['idolmaster'],
  'bang_dream!': [],
  'mahou_shoujo_madoka_magica': [],
  'neon_genesis_evangelion': [],
  'dragon_ball': [],
  'attack_on_titan': ['shingeki_no_kyojin'],
  'honkai_impact_3rd': ['honkai_impact'],
  'girls_frontline': ["girls'_frontline", 'girls_frontline'],
  'umamusume': ['umamusume'],
  'lycoris_recoil': ['lycoris_recoil'],
  'my_hero_academia': [],
  'to_aru_majutsu_no_index': [],
  'date_a_live': [],
  'princess_connect!': ['princess_connect'],
  'dungeon_meshi': ['dungeon_meshi'],
  'frieren': ['sousou_no_frieren'],
  'mushoku_tensei': ['mushoku_tensei'],
  'violet_evergarden': [],
  'made_in_abyss': ['made_in_abyss'],
  'nier_(series)': ['nier'],
  'final_fantasy': ['ff', 'final_fantasy'],
  'granblue_fantasy': ['granblue_fantasy'],
  'k-on!': [],
  'kill_la_kill': [],
  'danganronpa_(series)': [],
  'the_quintessential_quintuplets': [],
  'tensei_shitara_slime_datta_ken': [],
  'steins;gate': [],
  'kobayashi-san_chi_no_maidragon': ['maidragon'],
  'high_school_dxd': [],
  'darling_in_the_franxx': ['darling_in_the_franxx'],
  'zenless_zone_zero': ['zenless_zone_zero'],
  'wuthering_waves': ['wuthering_waves'],
  'reverse:1999': ['reverse:1999'],
  'limbus_company': ['project_moon'],
  'persona': ['persona'],
};

const ALL_SERIES_KEYWORDS = [];
for (const kws of Object.values(SERIES_KEYWORDS)) {
  kws.forEach(k => { if (!ALL_SERIES_KEYWORDS.includes(k)) ALL_SERIES_KEYWORDS.push(k); });
}

const GENERIC_CHARS = new Set([
  'trainer_', 'producer_', 'commander_', 'admiral_', 'sensei_', 'doctor_',
  'doodle_sensei_', 'player_character',
]);

function charBelongsToSeries(charName, seriesTag) {
  const keywords = SERIES_KEYWORDS[seriesTag] || [];
  if (keywords.length === 0) return true;

  const suffix = charName.match(/_\(([^)]+)\)$/);
  if (suffix) {
    const s = suffix[1];
    if (keywords.some(k => s.includes(k))) return true;
    if (ALL_SERIES_KEYWORDS.some(k => !keywords.includes(k) && s.includes(k))) return false;
    return false;
  }
  return true;
}

function isGenericChar(charName) {
  for (const g of GENERIC_CHARS) {
    if (charName.startsWith(g)) return true;
  }
  return false;
}

function cleanDisplayName(danbooruName) {
  let name = danbooruName.replace(/_\([^)]+\)$/, '');
  name = name.replace(/_/g, ' ');
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function cleanTag(danbooruName) {
  return danbooruName.replace(/_\([^)]+\)$/, '').replace(/_/g, ' ');
}

const globalUsed = new Set();

function processSeriesChars(seriesTag) {
  const data = rawData[seriesTag];
  if (!data || !data.characters) return [];

  const filtered = data.characters
    .filter(c => {
      if (isGenericChar(c.name)) return false;
      if (!charBelongsToSeries(c.name, seriesTag)) return false;
      if (globalUsed.has(c.name)) return false;
      return true;
    })
    .slice(0, 20);

  filtered.forEach(c => globalUsed.add(c.name));

  return filtered.map(c => ({
    danbooru: c.name,
    display: cleanDisplayName(c.name),
    tag: cleanTag(c.name),
    count: c.count
  }));
}

const group0 = tagsData['0'];
const existingSubgroupNames = {};
for (const [idx, sg] of Object.entries(group0.subgroups)) {
  existingSubgroupNames[sg.name.zh || sg.name.en] = parseInt(idx);
}

console.log('Existing character subgroups:', Object.keys(existingSubgroupNames).join(', '));

let nextIdx = Object.keys(group0.subgroups).length;
let updatedCount = 0, newCount = 0;

for (const [seriesTag, cnName] of Object.entries(SERIES_CN_MAP)) {
  if (!rawData[seriesTag]) continue;

  const chars = processSeriesChars(seriesTag);
  if (chars.length === 0) {
    console.log(`[SKIP] ${cnName}: no valid characters`);
    continue;
  }

  const existingIdx = existingSubgroupNames[cnName];

  if (existingIdx !== undefined) {
    const existingSg = group0.subgroups[String(existingIdx)];
    const existingTags = existingSg.tags.map(t =>
      typeof t === 'string' ? t : (t.tag || t.en || '')
    );

    const newTags = chars
      .filter(c => !existingTags.some(et => {
        const etLower = (typeof et === 'string' ? et : '').toLowerCase();
        return etLower === c.tag.toLowerCase() || etLower === c.danbooru.toLowerCase();
      }))
      .map(c => ({
        zh: c.display,
        en: c.display,
        tag: c.tag
      }));

    if (newTags.length > 0) {
      const maxTotal = 20;
      const canAdd = Math.max(0, maxTotal - existingSg.tags.length);
      const toAdd = newTags.slice(0, canAdd);
      if (toAdd.length > 0) {
        existingSg.tags.push(...toAdd);
        updatedCount++;
        console.log(`[UPDATE] ${cnName}: +${toAdd.length} chars (total ${existingSg.tags.length})`);
      }
    }
  } else {
    const subgroup = {
      name: { zh: cnName, en: cnName },
      tags: chars.slice(0, 15).map(c => ({
        zh: c.display,
        en: c.display,
        tag: c.tag
      }))
    };

    group0.subgroups[String(nextIdx)] = subgroup;
    nextIdx++;
    newCount++;
    console.log(`[NEW] ${cnName}: ${subgroup.tags.length} chars (subgroup ${nextIdx - 1})`);
  }
}

fs.writeFileSync(
  path.join(__dirname, 'tags.json'),
  JSON.stringify(tagsData, null, 2),
  'utf8'
);

console.log(`\nDone! Updated ${updatedCount} existing series, added ${newCount} new series.`);
console.log(`Total character subgroups: ${nextIdx}`);
