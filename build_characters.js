const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, 'animadex_raw.json');
const TAGS_FILE = path.join(__dirname, 'tags.json');
const OUTPUT_FILE = path.join(__dirname, 'characters.json');

const SERIES_CN = {
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
  'goddess_of_victory:_nikke': '胜利女神NIKKE',
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
  'bang_dream!': 'BanG Dream',
  'mahou_shoujo_madoka_magica': '魔法少女小圆',
  'neon_genesis_evangelion': 'EVA新世纪福音战士',
  'dragon_ball': '龙珠',
  'attack_on_titan': '进击的巨人',
  'honkai_impact_3rd': '崩坏3',
  "girls'_frontline": '少女前线',
  'umamusume': '赛马娘',
  'lycoris_recoil': '莉可丽丝',
  'my_hero_academia': '我的英雄学院',
  'to_aru_majutsu_no_index': '魔法禁书目录',
  'date_a_live': '约会大作战',
  'princess_connect!': '公主连结',
  'dungeon_meshi': '迷宫饭',
  'sousou_no_frieren': '葬送的芙莉莲',
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
  'original': '原创',
  'the_idolmaster_cinderella_girls': '偶像大师灰姑娘',
  'the_idolmaster_shiny_colors': '偶像大师闪耀色彩',
  'nijisanji': 'Nijisanji',
  'virtual_youtuber': 'VTuber',
  'pokemon': '宝可梦',
  'fire_emblem': '火焰纹章',
  'league_of_legends': '英雄联盟',
  'naruto': '火影忍者',
  'toaru_kagaku_no_railgun': '某科学的超电磁炮',
  'the_idolmaster_million_live!': '偶像大师百万',
  'love_live!_school_idol_project': 'LoveLive',
  'love_live!_sunshine!!': 'LoveLive Sunshine',
  'love_live!_nijigasaki_high_school_idol_club': 'LoveLive虹咲',
  'love_live!_superstar!!': 'LoveLive Superstar',
  'senki_zesshou_symphogear': '战姬绝唱',
  'girls_und_panzer': '少女与战车',
  'bang_dream!_it\'s_mygo!!!!!': 'MyGO!!!!!',
  'magia_record:_mahou_shoujo_madoka_magica_gaiden': '魔法纪录',
  'yu-gi-oh!': '游戏王',
  'danmachi': '在地下城寻求邂逅',
  'bocchi_the_rock': '孤独摇滚',
  'elden_ring': '艾尔登法环',
  'trail_(series)': '轨迹系列',
  'black_clover': '黑色五叶草',
  'demon_slayer': '鬼灭之刃',
};

const MIN_CHARS_PER_SERIES = 3;
const MAX_CHARS_PER_SERIES = 30;
const MIN_SERIES_TOTAL_COUNT = 500;

function getSeriesCN(copyright) {
  if (SERIES_CN[copyright]) return SERIES_CN[copyright];
  return copyright
    .replace(/_/g, ' ')
    .replace(/\(series\)/gi, '')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function main() {
  console.log('Loading raw data...');
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  console.log(`Loaded ${raw.length} characters`);

  const bySeries = {};
  for (const char of raw) {
    const cp = char.copyright || 'unknown';
    if (!bySeries[cp]) bySeries[cp] = [];
    bySeries[cp].push(char);
  }

  const seriesList = Object.entries(bySeries)
    .map(([cp, chars]) => ({
      copyright: cp,
      cn: getSeriesCN(cp),
      totalCount: chars.reduce((sum, c) => sum + (c.count || 0), 0),
      chars: chars
        .filter(c => c.has_image !== false)
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, MAX_CHARS_PER_SERIES),
    }))
    .filter(s => s.chars.length >= MIN_CHARS_PER_SERIES && s.totalCount >= MIN_SERIES_TOTAL_COUNT)
    .sort((a, b) => b.totalCount - a.totalCount);

  console.log(`Series with enough characters: ${seriesList.length}`);

  const output = seriesList.map(s => ({
    id: s.copyright,
    name: s.cn,
    count: s.totalCount,
    characters: s.chars.map(c => ({
      t: c.trigger || c.slug.replace(/_/g, ' '),
      n: c.name,
      th: c.thumb_url || '',
      c: c.count || 0,
      lora: (c.loras && c.loras.length > 0) ? c.loras[0].url : undefined,
      tags: (c.tags && c.tags.length > 0) ? c.tags : undefined,
    })),
  }));

  let totalChars = 0;
  for (const s of output) totalChars += s.characters.length;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output), 'utf8');
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`\nSaved characters.json: ${output.length} series, ${totalChars} characters, ${sizeKB} KB`);

  console.log('\nNow updating tags.json...');
  const tags = JSON.parse(fs.readFileSync(TAGS_FILE, 'utf8'));

  const charGroupIdx = tags.findIndex(g => {
    if (!g || !g.subgroups) return false;
    const name = g.name || '';
    return name === '人物' || name === 'Characters';
  });

  if (charGroupIdx === -1) {
    for (const g of tags) {
      if (g && g.name === '人物') {
        console.log('Found character group by name match');
        break;
      }
    }
  }

  if (Array.isArray(tags) && tags[0]) {
    const group0 = tags[0];
    const oldSubs = group0.subgroups || [];
    let oldCharCount = 0;
    for (const sg of oldSubs) {
      if (sg) oldCharCount += (sg.tags || []).length;
    }
    console.log(`Old character group: ${oldSubs.length} subgroups, ${oldCharCount} characters`);

    const nonCharSubs = oldSubs.filter(s => {
      if (!s) return false;
      const n = s.name || '';
      return n === '对象' || n === '属性';
    });

    const newSubgroups = [...nonCharSubs];
    for (const series of output) {
      newSubgroups.push({
        name: series.name,
        tags: series.characters.map(ch => ({
          t: ch.t,
          d: ch.n,
          th: ch.th,
          lora: ch.lora,
        })),
      });
    }

    group0.subgroups = newSubgroups;
    fs.writeFileSync(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf8');
    console.log(`Updated tags.json: ${newSubgroups.length} subgroups (${nonCharSubs.length} kept + ${output.length} new), ${totalChars} characters`);
  }

  console.log('\nTop 15 series:');
  output.slice(0, 15).forEach(s => {
    console.log(`  ${s.name} (${s.id}): ${s.characters.length} chars, total count ${s.count}`);
  });
}

main();
