import { NovelTemplate, DEFAULT_TEMPLATE_VERSION } from '../../types/template';

// 奇幻冒險模板
export const fantasyTemplate: NovelTemplate = {
  id: 'fantasy-default',
  name: '奇幻冒險模板',
  type: 'fantasy',
  description: '劍與魔法的奇幻世界，多種族共存的冒險故事',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
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