import { NovelTemplate, TemplateType, DEFAULT_TEMPLATE_VERSION } from '../types/template';
import { enhancedIsekaiWorldSetting, isekaiWorldElements } from './isekaiWorldElements';

// 異世界轉生模板
export const isekaiTemplate: NovelTemplate = {
  id: 'isekai-default',
  name: '異世界轉生模板',
  type: 'isekai',
  description: '經典的異世界轉生設定，包含等級系統、魔法世界觀和轉生要素',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date(),
  updatedAt: new Date(),
  
  worldSetting: enhancedIsekaiWorldSetting,
  
  characterArchetypes: [
    {
      name: '轉生勇者',
      description: '從現代世界轉生而來的主角，擁有現代知識和特殊能力',
      personality: '正義感強烈，但保有現代人的常識和價值觀',
      appearance: '普通的現代人外表，但在異世界顯得特別',
      background: '原本是普通的現代人，因意外死亡而轉生到異世界',
      suggestedAge: { min: 16, max: 25 },
      suggestedGender: ['男', '女'],
      commonTraits: ['現代知識', '快速成長', '特殊技能', '語言天賦'],
      typicalRoles: ['主角', '救世主', '革新者'],
      tags: ['轉生者', '主角', '成長型', '現代知識']
    },
    {
      name: '精靈法師',
      description: '優雅的精靈族魔法師，擅長自然魔法',
      personality: '高傲但善良，對自然有深厚感情，初期對人類有偏見',
      appearance: '尖耳朵，美麗的外表，通常有金髮或銀髮',
      background: '來自精靈森林，因某種原因離開族群',
      suggestedAge: { min: 100, max: 500 },
      suggestedGender: ['女'],
      commonTraits: ['魔法天賦', '長壽', '自然親和', '美貌'],
      typicalRoles: ['女主角', '導師', '夥伴'],
      tags: ['精靈', '魔法師', '美少女', '傲嬌']
    },
    {
      name: '獸人戰士',
      description: '強壯的獸人族戰士，重視友情和榮譽',
      personality: '豪爽直率，重視友情，有強烈的戰鬥本能',
      appearance: '獸耳獸尾，肌肉發達，通常比人類高大',
      background: '來自獸人部落，可能是族長之子或流浪戰士',
      suggestedAge: { min: 18, max: 35 },
      suggestedGender: ['男', '女'],
      commonTraits: ['怪力', '敏銳嗅覺', '戰鬥本能', '忠誠'],
      typicalRoles: ['夥伴', '護衛', '戰友'],
      tags: ['獸人', '戰士', '力量型', '忠誠']
    },
    {
      name: '魔王',
      description: '統治魔族的強大存在，但動機複雜',
      personality: '威嚴強大，但並非純粹邪惡，有自己的理念和苦衷',
      appearance: '威嚴的外表，可能有角或翅膀等魔族特徵',
      background: '魔族的統治者，與人類有複雜的歷史關係',
      suggestedAge: { min: 500, max: 1000 },
      suggestedGender: ['男', '女'],
      commonTraits: ['強大魔力', '統治力', '複雜動機', '孤獨'],
      typicalRoles: ['最終BOSS', '反派', '複雜角色'],
      tags: ['魔王', '反派', '強大', '複雜']
    }
  ],
  
  plotFramework: [
    {
      phase: '轉生與適應',
      description: '主角死亡並轉生到異世界，開始適應新環境',
      keyEvents: ['死亡事件', '轉生覺醒', '能力發現', '語言習得', '基本生活'],
      characterDevelopment: '從困惑到接受現實，開始探索新世界',
      worldBuilding: '介紹異世界的基本設定和規則'
    },
    {
      phase: '能力覺醒',
      description: '發現並掌握轉生者的特殊能力',
      keyEvents: ['等級系統理解', '技能習得', '魔法學習', '戰鬥體驗'],
      characterDevelopment: '建立自信，確立目標',
      worldBuilding: '深入介紹魔法系統和等級制度'
    },
    {
      phase: '夥伴相遇',
      description: '遇見重要的夥伴，組成冒險團隊',
      keyEvents: ['關鍵角色登場', '信任建立', '團隊組成', '共同目標'],
      characterDevelopment: '學會信任他人，培養領導力',
      worldBuilding: '展現不同種族和文化'
    },
    {
      phase: '危機面對',
      description: '面對重大威脅，考驗團隊和能力',
      keyEvents: ['強敵出現', '挫折經歷', '成長突破', '犧牲與覺悟'],
      characterDevelopment: '經歷挫折後的成長和覺悟',
      worldBuilding: '揭示世界的深層問題和歷史'
    },
    {
      phase: '拯救世界',
      description: '運用所學和夥伴的力量拯救異世界',
      keyEvents: ['最終決戰', '真相揭露', '世界拯救', '新秩序建立'],
      characterDevelopment: '成為真正的英雄，找到歸屬',
      worldBuilding: '世界觀的完整呈現和未來展望'
    }
  ],
  
  writingGuidelines: {
    tone: '輕鬆幽默中帶有冒險感',
    style: '第一人稱或第三人稱，注重內心獨白',
    pacing: '前期較慢重視世界觀建構，中後期加快節奏',
    themes: ['成長', '友情', '正義', '自我實現', '文化衝突'],
    commonTropes: [
      '轉生金手指',
      '等級提升',
      '收集後宮',
      '打臉裝逼',
      '異世界美食',
      '現代知識應用',
      '魔王其實是好人'
    ],
    avoidances: [
      '過度殘酷的描寫',
      '複雜的政治鬥爭',
      '過於現實的社會問題',
      '沒有希望的黑暗劇情'
    ]
  },
  
  aiPromptTemplate: {
    context: '這是一個異世界轉生的輕小說，主角從現代世界轉生到充滿魔法和冒險的中世紀奇幻世界。',
    characterPrompts: [
      '描寫角色時要突出其種族特色和個性',
      '轉生者角色要體現現代人的思維方式',
      '魔法使用要符合設定的魔法系統規則',
      '角色成長要與等級系統相呼應'
    ],
    worldPrompts: [
      '世界觀要保持中世紀奇幻風格',
      '魔法現象要有合理的解釋',
      '社會制度要體現王國時代特色',
      '地理環境要支撐冒險劇情'
    ],
    stylePrompts: [
      '保持輕鬆幽默的語調',
      '適當加入現代梗和吐槽',
      '戰鬥場面要有張力但不過於血腥',
      '日常場景要溫馨有趣'
    ],
    continuationPrompts: [
      '繼續發展角色關係',
      '推進主線劇情',
      '加入世界觀細節',
      '保持輕小說風格'
    ]
  },
  
  sampleContent: {
    opening: '當我睜開眼睛的時候，映入眼簾的不是熟悉的天花板，而是一片陌生的藍天。「這裡是...哪裡？」我坐起身來，發現自己躺在一片草地上，周圍是從未見過的奇異植物。就在這時，腦海中突然響起了一個機械般的聲音：「歡迎來到阿爾卡迪亞大陸，轉生者。」',
    dialogue: [
      '「等等，你說轉生？我不是在上班路上被卡車撞了嗎？」',
      '「沒錯，你已經死亡並轉生到這個世界了。作為補償，你獲得了特殊的能力。」',
      '「特殊能力？該不會是那種外掛般的金手指吧？」'
    ],
    description: [
      '阿爾卡迪亞大陸的天空比地球更加湛藍，兩個太陽在空中緩緩移動，為大地灑下溫暖的光芒。',
      '遠處的森林中傳來未知魔物的叫聲，提醒著我這裡並非和平的世界。',
      '手中突然出現了一個半透明的狀態視窗，上面顯示著我的等級和能力值。'
    ]
  },
  
  isCustom: false,
  isActive: true
};

// 校園戀愛模板
export const schoolTemplate: NovelTemplate = {
  id: 'school-default',
  name: '校園戀愛喜劇模板',
  type: 'school',
  description: '現代日式校園背景的戀愛喜劇，充滿青春活力和浪漫元素',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date(),
  updatedAt: new Date(),
  
  worldSetting: {
    era: '現代',
    technology: '現代科技水平',
    society: '日式高中校園環境',
    specialElements: [
      '社團活動',
      '文化祭',
      '修學旅行',
      '期末考試',
      '屋頂午餐',
      '放學後約會',
      '青春戀愛'
    ],
    geography: '日本某個城市的高中校園',
    culture: '現代日本校園文化，重視集體和禮儀'
  },
  
  characterArchetypes: [
    {
      name: '平凡男主角',
      description: '普通但善良的高中生，容易捲入各種麻煩',
      personality: '善良正直，有點遲鈍，但在關鍵時刻很可靠',
      appearance: '普通的高中生外表，不起眼但有親和力',
      background: '普通家庭出身的高中二年級學生',
      suggestedAge: { min: 16, max: 18 },
      suggestedGender: ['男'],
      commonTraits: ['善良', '遲鈍', '可靠', '普通'],
      typicalRoles: ['主角', '被動接受者', '和事佬'],
      tags: ['主角', '平凡', '善良', '高中生']
    },
    {
      name: '傲嬌女主角',
      description: '外表冷漠內心溫柔的美少女，經典雙馬尾',
      personality: '表面高傲冷淡，實際上害羞溫柔，不坦率',
      appearance: '美麗的外表，通常是雙馬尾髮型，校服很合身',
      background: '可能是富家千金或學生會成員',
      suggestedAge: { min: 15, max: 17 },
      suggestedGender: ['女'],
      commonTraits: ['傲嬌', '美貌', '不坦率', '內心溫柔'],
      typicalRoles: ['女主角', '戀愛對象', '衝突製造者'],
      tags: ['傲嬌', '女主角', '美少女', '雙馬尾']
    },
    {
      name: '青梅竹馬',
      description: '從小認識主角的活潑女孩',
      personality: '開朗活潑，直率坦誠，對主角有特殊感情',
      appearance: '可愛親切的外表，通常比較活潑的髮型',
      background: '從小和主角一起長大的鄰居',
      suggestedAge: { min: 15, max: 17 },
      suggestedGender: ['女'],
      commonTraits: ['活潑', '直率', '忠誠', '親切'],
      typicalRoles: ['青梅竹馬', '競爭對手', '支持者'],
      tags: ['青梅竹馬', '活潑', '直率', '競爭者']
    },
    {
      name: '學生會長',
      description: '完美主義的學生會長，暗藏秘密',
      personality: '表面完美無缺，實際上有可愛的一面',
      appearance: '端莊美麗，總是保持完美形象',
      background: '優秀的學生，擔任學生會長職務',
      suggestedAge: { min: 16, max: 18 },
      suggestedGender: ['女'],
      commonTraits: ['完美主義', '責任感', '隱藏弱點', '領導力'],
      typicalRoles: ['學生會長', '完美角色', '權威人物'],
      tags: ['學生會長', '完美', '權威', '秘密']
    }
  ],
  
  plotFramework: [
    {
      phase: '新學期開始',
      description: '新學期的開始，角色們的相遇',
      keyEvents: ['開學典禮', '班級分配', '自我介紹', '座位安排'],
      characterDevelopment: '建立角色的基本設定和關係',
      worldBuilding: '介紹校園環境和日常生活'
    },
    {
      phase: '意外相遇',
      description: '主角與女主角的命運性相遇',
      keyEvents: ['意外事件', '第一印象', '誤會產生', '興趣萌芽'],
      characterDevelopment: '角色間開始產生化學反應',
      worldBuilding: '展現校園生活的各個面向'
    },
    {
      phase: '誤會與衝突',
      description: '因為誤解而產生的衝突和矛盾',
      keyEvents: ['誤會加深', '關係緊張', '第三者介入', '情感困惑'],
      characterDevelopment: '角色面對內心的真實感情',
      worldBuilding: '通過衝突展現角色背景'
    },
    {
      phase: '加深了解',
      description: '通過各種事件加深彼此的了解',
      keyEvents: ['共同活動', '秘密分享', '互相幫助', '感情升溫'],
      characterDevelopment: '角色關係的深化和成長',
      worldBuilding: '展現校園活動和季節變化'
    },
    {
      phase: '戀愛成長',
      description: '確認感情並共同成長',
      keyEvents: ['告白', '交往', '克服困難', '未來展望'],
      characterDevelopment: '角色的成熟和感情的確立',
      worldBuilding: '完整的校園生活體驗'
    }
  ],
  
  writingGuidelines: {
    tone: '輕鬆甜蜜，充滿青春氣息',
    style: '第三人稱，注重對話和內心描寫',
    pacing: '日常節奏，重視情感細節',
    themes: ['青春', '戀愛', '成長', '友情', '夢想'],
    commonTropes: [
      '意外跌倒',
      '屋頂告白',
      '文化祭表演',
      '雨中共傘',
      '便當分享',
      '考試幫助',
      '畢業離別'
    ],
    avoidances: [
      '過於成人的內容',
      '複雜的社會問題',
      '暴力或黑暗元素',
      '過於現實的升學壓力'
    ]
  },
  
  aiPromptTemplate: {
    context: '這是一個現代日式校園戀愛喜劇，以高中生活為背景，充滿青春活力和浪漫元素。',
    characterPrompts: [
      '角色要符合高中生的年齡和心理',
      '對話要自然青春，符合學生用語',
      '行為要符合校園環境和規範',
      '感情發展要純真自然'
    ],
    worldPrompts: [
      '場景要以校園為主，包含教室、走廊、屋頂等',
      '季節變化要與校園活動相配合',
      '校園文化要體現日式特色',
      '日常生活要真實可信'
    ],
    stylePrompts: [
      '保持輕鬆甜蜜的氛圍',
      '重視對話和內心獨白',
      '描寫要細膩溫馨',
      '避免過於沉重的話題'
    ],
    continuationPrompts: [
      '發展角色間的感情線',
      '加入校園活動元素',
      '保持青春校園風格',
      '推進戀愛劇情'
    ]
  },
  
  sampleContent: {
    opening: '春天的陽光透過教室窗戶灑在課桌上，新學期的第一天總是讓人既期待又緊張。我叫田中一郎，是這所櫻花高中的二年級學生。正當我在座位上整理書包時，教室門突然被推開了。「不好意思，我遲到了！」一個聲音響起，我抬頭一看，一個有著雙馬尾的美少女正站在門口，臉頰微紅地喘著氣。',
    dialogue: [
      '「真是的，第一天就遲到，太丟臉了...」',
      '「沒關係啦，老師還沒來呢。」',
      '「哼，我才不需要你的安慰！」'
    ],
    description: [
      '櫻花飛舞的校園小徑上，學生們三三兩兩地走向教學樓。',
      '午休時間的屋頂，微風輕拂，可以俯瞰整個城市的風景。',
      '夕陽西下的教室裡，只剩下我們兩個人在默默地打掃。'
    ]
  },
  
  isCustom: false,
  isActive: true
};

// 科幻冒險模板
export const scifiTemplate: NovelTemplate = {
  id: 'scifi-default',
  name: '科幻冒險模板',
  type: 'scifi',
  description: '未來世界的科幻冒險，包含高科技、AI、太空旅行等元素',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date(),
  updatedAt: new Date(),
  
  worldSetting: {
    era: '未來世界（2150年）',
    technology: '高度發達的科技，AI普及，星際旅行',
    society: '太空殖民時代，多星球聯邦制',
    specialElements: [
      '機甲戰鬥',
      'AI夥伴',
      '太空旅行',
      '賽博朋克',
      '基因改造',
      '虛擬現實',
      '星際戰爭'
    ],
    geography: '多個星球和太空站，包含地球、火星、木星衛星等',
    culture: '多元文化融合，科技與人性的平衡'
  },
  
  characterArchetypes: [
    {
      name: '機師主角',
      description: '冷靜理性的機甲駕駛員，擅長駕駛各種載具',
      personality: '冷靜理性，責任感強，但內心孤獨',
      appearance: '精幹的外表，通常穿著飛行服或戰鬥服',
      background: '軍事學院畢業，有豐富的戰鬥經驗',
      suggestedAge: { min: 20, max: 35 },
      suggestedGender: ['男', '女'],
      commonTraits: ['駕駛技術', '戰術思維', '冷靜', '責任感'],
      typicalRoles: ['主角', '隊長', '英雄'],
      tags: ['機師', '主角', '冷靜', '技術']
    },
    {
      name: '駭客天才',
      description: '精通網路技術的年輕駭客',
      personality: '聰明機智，有點叛逆，但正義感強',
      appearance: '年輕的外表，可能有特殊的髮色或裝飾',
      background: '自學成才的駭客，可能有複雜的過去',
      suggestedAge: { min: 16, max: 25 },
      suggestedGender: ['男', '女'],
      commonTraits: ['駭客技能', '聰明', '叛逆', '正義感'],
      typicalRoles: ['技術支援', '情報專家', '夥伴'],
      tags: ['駭客', '天才', '技術', '叛逆']
    },
    {
      name: 'AI助手',
      description: '高度智能的人工智慧，逐漸發展出情感',
      personality: '邏輯思維，但逐漸理解人類情感',
      appearance: '可能是全息投影或機器人形態',
      background: '先進的AI系統，被賦予特殊任務',
      suggestedAge: { min: 1, max: 10 },
      suggestedGender: ['男', '女', '其他'],
      commonTraits: ['超級智能', '邏輯思維', '學習能力', '忠誠'],
      typicalRoles: ['助手', '顧問', '夥伴'],
      tags: ['AI', '智能', '邏輯', '成長']
    },
    {
      name: '企業反派',
      description: '野心勃勃的企業領導者，利用科技控制',
      personality: '野心勃勃，冷酷無情，但有自己的理念',
      appearance: '成功人士的外表，可能有改造痕跡',
      background: '大型企業的高層，掌握先進技術',
      suggestedAge: { min: 40, max: 60 },
      suggestedGender: ['男', '女'],
      commonTraits: ['野心', '智慧', '資源', '冷酷'],
      typicalRoles: ['反派', 'BOSS', '對手'],
      tags: ['反派', '企業', '野心', '科技']
    }
  ],
  
  plotFramework: [
    {
      phase: '任務接受',
      description: '接受重要任務，開始冒險',
      keyEvents: ['任務簡報', '團隊組成', '裝備準備', '出發'],
      characterDevelopment: '建立角色動機和目標',
      worldBuilding: '介紹未來世界的基本設定'
    },
    {
      phase: '遭遇困難',
      description: '任務過程中遇到預料外的困難',
      keyEvents: ['意外事件', '敵人出現', '計劃變更', '危機應對'],
      characterDevelopment: '測試角色能力和決心',
      worldBuilding: '展現科技世界的複雜性'
    },
    {
      phase: '團隊合作',
      description: '通過團隊合作克服困難',
      keyEvents: ['策略制定', '分工合作', '技能互補', '信任建立'],
      characterDevelopment: '角色間關係的發展',
      worldBuilding: '深入展現各種科技設定'
    },
    {
      phase: '科技升級',
      description: '獲得新技術或裝備，提升能力',
      keyEvents: ['新技術獲得', '裝備升級', '能力提升', '戰術改進'],
      characterDevelopment: '角色成長和進化',
      worldBuilding: '展現科技發展的可能性'
    },
    {
      phase: '最終勝利',
      description: '運用所有資源達成最終目標',
      keyEvents: ['最終戰鬥', '真相揭露', '勝利達成', '未來展望'],
      characterDevelopment: '角色的完整成長',
      worldBuilding: '世界的未來發展方向'
    }
  ],
  
  writingGuidelines: {
    tone: '緊張刺激中帶有科幻感',
    style: '第三人稱，注重動作和技術描寫',
    pacing: '快節奏，重視動作場面',
    themes: ['科技與人性', '未來發展', '團隊合作', '正義', '進步'],
    commonTropes: [
      '機甲戰鬥',
      'AI覺醒',
      '駭客入侵',
      '太空戰鬥',
      '時間旅行',
      '基因改造',
      '虛擬世界'
    ],
    avoidances: [
      '過於複雜的科學理論',
      '過度悲觀的未來觀',
      '技術細節過多',
      '缺乏人性關懷'
    ]
  },
  
  aiPromptTemplate: {
    context: '這是一個未來科幻世界的冒險故事，充滿高科技元素和太空冒險。',
    characterPrompts: [
      '角色要體現未來人類的特點',
      '科技使用要合理可信',
      'AI角色要有獨特的思維方式',
      '人物關係要反映科技時代特色'
    ],
    worldPrompts: [
      '科技設定要前後一致',
      '未來社會要有合理的發展邏輯',
      '太空環境要真實可信',
      '科技與社會的關係要平衡'
    ],
    stylePrompts: [
      '保持科幻感和未來感',
      '動作場面要緊張刺激',
      '技術描寫要適度',
      '人性關懷不能缺失'
    ],
    continuationPrompts: [
      '推進科幻劇情',
      '發展角色關係',
      '加入新的科技元素',
      '保持冒險節奏'
    ]
  },
  
  sampleContent: {
    opening: '2150年，火星殖民地第七區。警報聲刺破了人工大氣層的寧靜，紅色的警示燈在金屬走廊中閃爍。「注意，未知機體正在接近，所有機師立即進入戰備狀態。」廣播中傳來指揮官冷靜的聲音。我快速穿上駕駛服，向機庫跑去。我的夥伴ARIA，一個高度智能的AI，已經在我的頭盔中等待著。',
    dialogue: [
      '「ARIA，敵機的數據分析如何？」',
      '「根據雷達顯示，對方使用的是未知型號的機體，建議謹慎應對。」',
      '「了解，準備出擊！」'
    ],
    description: [
      '巨大的機庫中，各式機甲整齊排列，機械臂正在進行最後的檢查。',
      '透過太空站的觀景窗，可以看到遠處木星的巨大身影和它美麗的光環。',
      '虛擬現實訓練室中，全息投影創造出逼真的戰鬥環境。'
    ]
  },
  
  isCustom: false,
  isActive: true
};

// 奇幻冒險模板
export const fantasyTemplate: NovelTemplate = {
  id: 'fantasy-default',
  name: '奇幻冒險模板',
  type: 'fantasy',
  description: '劍與魔法的奇幻世界，多種族共存的冒險故事',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date(),
  updatedAt: new Date(),
  
  worldSetting: {
    era: '中古奇幻時代',
    technology: '劍與魔法，少量煉金術科技',
    society: '多種族共存，王國與部落並立',
    specialElements: [
      '魔法學院',
      '地下城探索',
      '龍與寶藏',
      '古老預言',
      '神器傳說',
      '種族聯盟',
      '魔法生物'
    ],
    geography: '廣闊的大陸，包含森林、山脈、沙漠、海洋',
    culture: '多元種族文化，古老傳統與魔法並存',
    magic: {
      type: '古典魔法系統',
      rules: [
        '魔法來源於自然和精神力量',
        '需要咒語、手勢或魔法道具',
        '不同學派有不同的魔法理論',
        '魔法力量與個人天賦相關'
      ],
      limitations: [
        '魔法消耗精神力',
        '某些魔法需要特殊材料',
        '魔法有施法距離限制',
        '強大魔法需要長時間準備'
      ],
      schools: ['元素魔法', '治療魔法', '幻術', '召喚術', '變化術', '預言術']
    }
  },
  
  characterArchetypes: [
    {
      name: '見習魔法師',
      description: '充滿好奇心的年輕魔法師，渴望學習強大魔法',
      personality: '好奇心強，勇敢但有時魯莽，對魔法充滿熱情',
      appearance: '年輕的外表，通常穿著魔法師袍，攜帶法杖',
      background: '魔法學院的學生或自學的魔法師',
      suggestedAge: { min: 16, max: 25 },
      suggestedGender: ['男', '女'],
      commonTraits: ['魔法天賦', '好奇心', '學習能力', '勇氣'],
      typicalRoles: ['主角', '學習者', '冒險者'],
      tags: ['魔法師', '見習', '好奇', '成長']
    },
    {
      name: '精靈弓手',
      description: '優雅敏捷的精靈族弓箭手，與自然親近',
      personality: '優雅冷靜，與自然和諧，有強烈的正義感',
      appearance: '美麗優雅，尖耳朵，通常有綠色或金色頭髮',
      background: '來自精靈森林，可能是護林者或遊俠',
      suggestedAge: { min: 100, max: 300 },
      suggestedGender: ['男', '女'],
      commonTraits: ['弓箭技巧', '自然親和', '敏捷', '長壽'],
      typicalRoles: ['遠程攻擊手', '偵察者', '自然守護者'],
      tags: ['精靈', '弓手', '自然', '優雅']
    },
    {
      name: '矮人戰士',
      description: '勇敢堅毅的矮人族戰士，重視榮譽和友情',
      personality: '勇敢堅毅，重視榮譽，忠誠可靠',
      appearance: '矮小但強壯，通常有濃密的鬍鬚，穿著重甲',
      background: '來自矮人王國，可能是鐵匠或戰士',
      suggestedAge: { min: 50, max: 200 },
      suggestedGender: ['男', '女'],
      commonTraits: ['戰鬥技巧', '鍛造技術', '堅毅', '忠誠'],
      typicalRoles: ['前線戰士', '坦克', '工匠'],
      tags: ['矮人', '戰士', '堅毅', '榮譽']
    },
    {
      name: '龍族少女',
      description: '高傲神秘的龍族，擁有強大的魔法力量',
      personality: '高傲神秘，但內心善良，擁有古老的智慧',
      appearance: '美麗神秘，可能有龍的特徵如角或鱗片',
      background: '古老龍族的後裔，守護著重要的秘密',
      suggestedAge: { min: 500, max: 1000 },
      suggestedGender: ['女'],
      commonTraits: ['強大魔力', '古老智慧', '高傲', '神秘'],
      typicalRoles: ['強力法師', '智者', '守護者'],
      tags: ['龍族', '強大', '神秘', '古老']
    }
  ],
  
  plotFramework: [
    {
      phase: '學習成長',
      description: '主角開始學習魔法和冒險技能',
      keyEvents: ['魔法啟蒙', '導師相遇', '基礎訓練', '初次冒險'],
      characterDevelopment: '從新手到有一定能力的冒險者',
      worldBuilding: '介紹奇幻世界的基本設定'
    },
    {
      phase: '冒險試煉',
      description: '接受各種冒險任務，磨練技能',
      keyEvents: ['任務接受', '地下城探索', '魔物戰鬥', '寶藏發現'],
      characterDevelopment: '通過實戰提升能力和經驗',
      worldBuilding: '展現世界的危險和機遇'
    },
    {
      phase: '遇見夥伴',
      description: '結識重要的冒險夥伴，組成團隊',
      keyEvents: ['夥伴相遇', '信任建立', '團隊合作', '友情發展'],
      characterDevelopment: '學會團隊合作和信任他人',
      worldBuilding: '通過不同種族展現世界多樣性'
    },
    {
      phase: '面對強敵',
      description: '遭遇強大的敵人，面臨重大挑戰',
      keyEvents: ['強敵出現', '危機降臨', '策略制定', '決戰準備'],
      characterDevelopment: '在危機中成長和覺醒',
      worldBuilding: '揭示世界的深層威脅'
    },
    {
      phase: '成為英雄',
      description: '克服最終挑戰，成為真正的英雄',
      keyEvents: ['最終戰鬥', '力量覺醒', '勝利達成', '和平恢復'],
      characterDevelopment: '完成英雄之旅，獲得成長',
      worldBuilding: '世界獲得和平，展望未來'
    }
  ],
  
  writingGuidelines: {
    tone: '史詩感與冒險感並重',
    style: '第三人稱，重視世界觀描寫',
    pacing: '中等節奏，平衡冒險與成長',
    themes: ['成長', '友情', '正義', '勇氣', '犧牲'],
    commonTropes: [
      '魔法學習',
      '地下城探索',
      '龍與寶藏',
      '預言實現',
      '神器收集',
      '種族聯盟',
      '邪惡復甦'
    ],
    avoidances: [
      '過於黑暗的內容',
      '複雜的政治鬥爭',
      '過度血腥的戰鬥',
      '絕望的結局'
    ]
  },
  
  aiPromptTemplate: {
    context: '這是一個劍與魔法的奇幻世界，多種族共存，充滿冒險和魔法。',
    characterPrompts: [
      '角色要體現其種族特色',
      '魔法使用要符合世界觀設定',
      '不同種族間的互動要有特色',
      '角色成長要與冒險經歷相符'
    ],
    worldPrompts: [
      '世界觀要保持奇幻風格',
      '魔法系統要前後一致',
      '不同地區要有獨特特色',
      '種族文化要豐富多樣'
    ],
    stylePrompts: [
      '保持史詩奇幻的氛圍',
      '戰鬥場面要有張力',
      '魔法描寫要神秘美麗',
      '冒險過程要刺激有趣'
    ],
    continuationPrompts: [
      '推進冒險劇情',
      '發展角色關係',
      '加入新的魔法元素',
      '保持奇幻風格'
    ]
  },
  
  sampleContent: {
    opening: '晨光透過魔法學院高塔的彩色玻璃窗灑在古老的石階上，年輕的魔法師學徒艾莉亞小心翼翼地捧著一本厚重的魔法書走向圖書館。今天是她入學的第一天，心中既興奮又緊張。「小心點，那本書可是有生命的。」一個溫和的聲音從身後傳來，艾莉亞回頭一看，一位穿著星空色長袍的老師正微笑地看著她。',
    dialogue: [
      '「有生命的書？這是什麼意思？」',
      '「在我們的世界裡，知識本身就是一種力量，而古老的魔法書更是如此。」',
      '「那我該如何與它相處呢？」'
    ],
    description: [
      '魔法學院的中庭裡，各種魔法植物在陽光下閃閃發光，空氣中瀰漫著淡淡的魔法氣息。',
      '遠處的龍脊山脈在晨霧中若隱若現，傳說中那裡住著古老的龍族。',
      '圖書館中漂浮著無數發光的書籍，它們自動翻頁，展示著神秘的魔法知識。'
    ]
  },
  
  isCustom: false,
  isActive: true
};

// 導出所有預設模板
export const defaultTemplates: NovelTemplate[] = [
  isekaiTemplate,
  schoolTemplate,
  scifiTemplate,
  fantasyTemplate
];