import { NovelTemplate, DEFAULT_TEMPLATE_VERSION } from '../../types/template';
import { enhancedIsekaiWorldSetting } from '../isekaiWorldElements';

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