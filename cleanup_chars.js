const fs = require('fs');
const path = require('path');

const tagsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'tags.json'), 'utf8'));
const group0 = tagsData['0'];

const KNOWN_OTHER_SERIES_CHARS = new Set([
  'ada_wong', 'komi_shouko', 'nagatoro_hayase', 'mori_calliope',
  'my_melody', 'maizono_sayaka', 'maruyama_aya',
  'kinomoto_sakura', 'miyu_(blue_archive)',
  'princess_zelda', 'link',
  'tatsumaki', 'megumin',
  'shihouin_yoruichi', 'oyama_mahiro', 'ranni_the_witch', 'chomusuke',
  'takanashi_rikka', 'kawakami_mai', 'takagi-san', 'pipimi',
  'kirby', 'eevee', 'kaku_seiga', 'sonic_the_hedgehog',
  'chun-li', 'yuffie_kisaragi', 'shiori_novella', 'hakos_baelz',
  'isabella_valentine', 'takanashi_kiara',
  'izumi_konata', 'asahina_mikuru', 'hiiragi_kagami', 'kyon',
  'hiiragi_tsukasa', 'asakura_ryoko', 'hakurei_reimu', 'aisaka_taiga',
  'kagari_atsuko', 'kijin_seija', 'shadow_the_hedgehog', 'nia_teppelin',
  'shinomiya_kaguya', 'spider-man', 'isshiki_iroha', 'apollo_justice',
  'koiwai_yotsuba', 'kirisame_marisa', "ninomae_ina'nis",
  'c.c.', 'kobo_kanaeru',
  'sakihata_rimi', 'onoe_serika', 'narusawa_ryouka', 'senjougahara_hitagi',
  'oshino_shinobu', 'nishijou_nanami', 'gokou_ruri',
  'hong_meiling', 'izumi_sagiri',
  'inoue_orihime', 'emiya_shirou', 'lucy_heartfilia', 'dark_magician_girl',
  'maka_albarn', 'erza_scarlet', 'katsura_hinagiku', 'esdeath',
  'kitagawa_marin', 'shinjou_akane', 'lio_fotia', 'diana_cavendish', 'sakurajima_mai',
  'chitanda_eru', 'suletta_mercury', 'miorine_rembran', 'kitashirakawa_tamako', 'oumae_kumiko', 'awa_subaru',
  'yoko_littner', 'godzilla', 'suzumiya_haruhi', 'nagato_yuki', 'samus_aran', 'nadia_la_arwall',
  'pikachu', 'ikamusume', 'gekota',
  'kousaka_kirino', 'tojo_nozomi', 'lala_satalin_deviluke', 'pyukumuku',
  'rory_mercury', 'shana', 'tennouboshi_uzume', 'nana_asta_deviluke',
  'konpaku_youmu', 'holo',
  'puck_(re:zero)',
  'eva_02', 'eva_01',
  'titan_(shingeki_no_kyojin)',
]);

const EXTRA_CN = {
  'yuzuki_yukari': '结月缘',
  'gumi': 'GUMI',
  'yuki_miku': '雪未来',
  'kasane_teto': '重音TETO',
  'hayakawa_aki': '早川秋',
  'higashiyama_kobeni': '东山小红',
  'mitaka_asa': '三鹰朝',
  'pochita_(chainsaw_man)': '波奇塔',
  'asa_mitaka': '三鹰安莎',
  'yamada_ryo_(bocchi_the_rock!)': '山田凉',
  'ijichi_seika': '伊地知星歌',
  'pa-san': 'PA酱',
  'kawaragi_momoka': '河原木桃花',
  'iseri_nina': '伊势丽丽仁奈',
  'ruby_(oshi_no_ko)': '星野露比',
  'mem-cho_(oshi_no_ko)': 'MEM酱',
  'hoshino_ai': '星野爱',
  'memcho': 'MEM酱',
  'modernia_(nikke)': '摩德尼亚',
  'alice_(nikke)': '爱丽丝',
  'helm_(nikke)': '赫尔姆',
  'scarlet_(nikke)': '斯卡莱特',
  '2b_(nikke)': '2B',
  'viper_(nikke)': '毒蛇',
  'volume_(nikke)': '芙琉梅',
  'red_hood_(nikke)': '赤头巾',
  'nezuko_kamado': '灶门祢豆子',
  'mitsuri_kanroji': '甘露寺蜜璃',
  'shinobu_kochou': '蝴蝶忍',
  'kanao_tsuyuri': '栗花落香奈乎',
  'tsuyuri_kanao': '栗花落香奈乎',
  'shinazugawa_sanemi': '不死川实弥',
  'hashibira_inosuke': '嘴平伊之助',
  'nobara_kugisaki': '釘崎野蔷薇',
  'maki_zenin': '禅院真希',
  'miwa_kasumi': '三轮霞',
  'ryoumen_sukuna_(jujutsu_kaisen)': '两面宿傩',
  'nanami_kento': '七海建人',
  "zen'in_maki": '禅院真希',
  'fushiguro_toji': '伏黑甚尔',
  'felix_argyle': '菲利克斯',
  'sinon_(sao)': '诗乃',
  'silica': '西莉卡',
  'asuna_(sao-alo)': '亚丝娜',
  'yui_(sao)': '结衣',
  'tony_tony_chopper': '乔巴',
  'usopp': '乌索普',
  'hinata_hyuuga': '日向雏田',
  'sakura_haruno': '春野樱',
  'temari_(naruto)': '手鞠',
  'uchiha_sarada': '宇智波佐良娜',
  'yamanaka_ino': '山中井野',
  'uzumaki_boruto': '漩涡博人',
  'inazuma_(kancolle)': '电',
  'yuudachi_(kancolle)': '夕立',
  'shigure_kai_ni_(kancolle)': '时雨改二',
  'fubuki_(kancolle)': '吹雪',
  'tenryuu_(kancolle)': '天龙',
  'ikazuchi_(kancolle)': '雷',
  'nagato_(kancolle)': '长门',
  'amami_haruka': '天海春香',
  'kikuchi_makoto': '菊地真',
  'shinosawa_hiro': '篠�的宏',
  'yumemi_riamu': '梦见璃亚梦',
  'minase_iori': '水�的伊织',
  'shirasaka_koume': '白坂小梅',
  'fujita_kotone': '藤田琴音',
  'futaba_anzu': '双叶杏',
  'kanzaki_ranko': '神崎兰子',
  'mayuzumi_fuyuko': '�的墨冬子',
  'wakaba_mutsumi': '若叶睦',
  'yahata_umiri': '八幡海里',
  'takamatsu_tomori': '高松灯',
  'kaname_raana': '要乐奈',
  'mortis_(bang_dream!)': '莫尔蒂斯',
  'yuutenji_nyamu': '祐天寺喵梦',
  'oblivionis_(bang_dream!)': '欧布利维昂斯',
  'hikawa_hina': '冰川日菜',
  'akuma_homura': '恶魔焰',
  'alina_gray': '阿丽娜·格蕾',
  'oktavia_von_seckendorff': '人鱼魔女',
  'misono_karin': '御园花凛',
  'chi-chi_(dragon_ball)': '琪琪',
  'gogeta': '悟吉塔',
  'trunks_(dragon_ball)': '特兰克斯',
  'pan_(dragon_ball)': '小芳',
  'vegetto': '贝吉特',
  'majin_android_21': '魔人21号',
  'son_goten': '孙悟天',
  'bertolt_hoover': '贝尔托特·胡佛',
  'sasha_blouse': '莎夏·布劳斯',
  'jean_kirstein': '让·基尔希斯坦',
  'elysia_(miss_pink_elf)_(honkai_impact)': '爱莉希雅(粉精灵)',
  'yae_sakura': '八重樱',
  'herrscher_of_sentience': '识之律者',
  'elysia_(hi_love_elf)_(honkai_impact)': '爱莉希雅',
  'captain_(honkai_impact)': '舰长',
  "suomi_(girls'_frontline)": '索米',
  'nice_nature_(umamusume)': '好歌剧',
  'agnes_tachyon_(tach-nology)_(umamusume)': '亚克敦(科技版)',
  'todoroki_shoto': '�的冻焦冻',
  'endeavor_(boku_no_hero_academia)': '安德瓦',
  'hawks_(boku_no_hero_academia)': '霍克斯',
  'ashido_mina': '芦户三奈',
  'jiro_kyoka': '耳郎响香',
  'hado_nejire': '波动螺旋',
  'hagakure_toru': '叶隐透',
  'kirishima_eijiro': '切岛锐儿郎',
  'accelerator_(toaru_majutsu_no_index)': '一方通行',
  'index_(toaru_majutsu_no_index)': '茵蒂克丝',
  'last_order_(toaru_majutsu_no_index)': '最后之作',
  'misaka_imouto': '御坂妹妹',
  'kanzaki_kaori': '神裂火织',
  'himekawa_yoshino': '姬川艮乃',
  'yuuki_(princess_connect!)': '优树',
  'yuni_(princess_connect!)': '优妮',
  'saren_(summer)_(princess_connect!)': '沙伦(泳装)',
  'chloe_(princess_connect!)': '克罗伊',
  'karyl_(summer)_(princess_connect!)': '凯露(泳装)',
  'pecorine_(summer)_(princess_connect!)': '佩可(泳装)',
  'chieru_(princess_connect!)': '智惠留',
  'makoto_(princess_connect!)': '真琴',
  'misogi_(princess_connect!)': '禊',
  'schneider_(reverse:1999)': '施耐德',
  'kakania_(reverse:1999)': '卡卡尼亚',
  'voyager_(reverse:1999)': '旅行者',
  'apple_(reverse:1999)': '苹果',
  'matilda_bouanich': '玛蒂尔达',
  'sotheby': '苏芙比',
  'windsong_(reverse:1999)': '风吟',
  'dante_(limbus_company)': '但丁',
  'sancho_(project_moon)': '桑丘',
  'jia_xichun_(project_moon)': '贾惜春',
  'takeba_yukari': '�的场雪里',
  'kujikawa_rise': '久慈川理世',
  'shiomi_kotone': '汐见琴音',
  'aigis_(persona)': '艾基斯',
  'hanamura_yousuke': '花村阳介',
  'kirijou_mitsuru': '桐条美鹤',
  'kirigiri_kyoko': '雾切响子',
  'enoshima_junko': '江之岛盾子',
  'monokuma': '黑白熊',
  'momota_kaito': '百田解斗',
  'monomi_(danganronpa)': '小白美',
  'yumeno_himiko': '梦野秘密子',
  'nicole_demara': '妮可·德玛拉',
  'zhu_yuan': '朱鸢',
  'tsukishiro_yanagi': '月城柳',
  'vivian_banshee': '薇薇安·班希',
  'evelyn_chevalier': '伊芙琳',
  'ukinami_yuzuha': '浮波柚羽',
  'yixuan_(zenless_zone_zero)': '忆萱',
  'alice_thymefield': '爱丽丝·百里',
  'sunna_(zenless_zone_zero)': '苏娜',
  'burnice_white': '柏妮丝',
  'chisa_(wuthering_waves)': '千纱',
  'aemeath_(wuthering_waves)': '阿伊蜜斯',
  'phoebe_(wuthering_waves)': '菲碧',
  'cartethyia_(wuthering_waves)': '卡特希雅',
  'phrolova_(wuthering_waves)': '弗洛洛瓦',
  'iuno_(wuthering_waves)': '伊幽诺',
  'denia_(wuthering_waves)': '丹妮娅',
  'urushibara_luka': '漆原琉华',
  'kiryuu_moeka': '桐生萌郁',
  'vikala_(granblue_fantasy)': '维卡拉',
  'vane_(granblue_fantasy)': '维恩',
  'sandalphon_(granblue_fantasy)': '萨达尔梵',
  'clarisse_(granblue_fantasy)': '克拉莉丝',
  'andira_(granblue_fantasy)': '安琪拉',
  'galleon_(granblue_fantasy)': '盖利恩',
  'terra_branford': '蒂娜·布兰福德',
  'moogle': '莫古利',
  'adventurer_(ff11)': '冒险者',
  'vincent_valentine': '文森特·瓦伦丁',
  "g'raha_tia": '古拉哈·提亚',
  'white_mage_(final_fantasy)': '白魔法师',
  'zidane_tribal': '吉坦·特赖博尔',
  'rydia_(ff4)': '利迪亚',
  'clive_rosfield': '克莱夫',
  'lightning_farron': '雷光',
  'fujishima_megumi': '藤岛惠',
  'watanabe_you': '渡边曜',
  'momose_ginko': '百濑银子',
  'murano_sayaka': '村野清香',
  'otomune_kozue': '乙宗梢',
  'iris_(konosuba)': '爱丽丝',

  // gotoh_hitori variants
  'gotoh_hitori_(octopus)': '后藤一里(章鱼)',
  'gotoh_hitori_(tsuchinoko)': '后藤一里(土笼子)',

  // Lycoris extra (after removing bad ones)
  'kousaka_reina': '高坂丽奈',
  // DitF extra
  'kokoro_(darling_in_the_franxx)': '心',
  'miku_(darling_in_the_franxx)': '未来',
  'ikuno_(darling_in_the_franxx)': '郁乃',
  'nana_(darling_in_the_franxx)': '七七',
  'goro_(darling_in_the_franxx)': '五郎',
  'futoshi_(darling_in_the_franxx)': '太',
  // made in abyss extra
  'bondrewd': '黎明卿',
  'prushka': '普鲁修卡',
  'vueko': '薇可',
  'lyza': '莱莎',
  // Dungeon meshi
  'senshi_(dungeon_meshi)': '千歲',
  'mithrun': '米斯伦',
  'chilchuck_tims': '齐尔查克',
  'izutsumi': '出�的美',
  'kabru': '卡布吕',
  'thistle_(dungeon_meshi)': '蓟',
  'yaad_(dungeon_meshi)': '亚德',
  'marcille_donato': '玛露希尔',
  'falin_touden': '法琳',
  'laios_touden': '莱欧斯',
};

let removed = 0;
let translated = 0;

for (const [idx, sg] of Object.entries(group0.subgroups)) {
  const i = parseInt(idx);
  if (i < 23 || !sg || !sg.tags) continue;

  const before = sg.tags.length;
  sg.tags = sg.tags.filter(t => !KNOWN_OTHER_SERIES_CHARS.has(t.t));
  removed += before - sg.tags.length;

  for (const tag of sg.tags) {
    if (EXTRA_CN[tag.t] && tag.d !== EXTRA_CN[tag.t]) {
      tag.d = EXTRA_CN[tag.t];
      translated++;
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'tags.json'), JSON.stringify(tagsData, null, 2), 'utf8');

// Stats
let totalChars = 0, untranslatedCount = 0;
const untranslatedList = [];
for (const [idx, sg] of Object.entries(group0.subgroups)) {
  const i = parseInt(idx);
  if (i < 23 || !sg || !sg.tags) continue;
  totalChars += sg.tags.length;
  for (const tag of sg.tags) {
    const isEnglish = /^[A-Z][a-z]/.test(tag.d) && !['KAITO','MEIKO','IA','GUMI','HK416','UMP','WA2000','M4','ST ','RO635','G11','M200','AK-','AN-','Kar98k','2B','9S','Pod','A2','MEM','PA'].some(p => tag.d.startsWith(p));
    if (isEnglish) {
      untranslatedCount++;
      if (untranslatedList.length < 30) untranslatedList.push(`${sg.name}: ${tag.t} -> ${tag.d}`);
    }
  }
}

console.log(`Removed ${removed} cross-contaminated entries`);
console.log(`Translated ${translated} additional names`);
console.log(`Total characters: ${totalChars}`);
console.log(`Still untranslated: ~${untranslatedCount}`);
if (untranslatedList.length > 0) {
  console.log('\nSample untranslated:');
  untranslatedList.forEach(u => console.log('  ' + u));
}
