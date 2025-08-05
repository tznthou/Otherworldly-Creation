import { NovelTemplate, DEFAULT_TEMPLATE_VERSION } from '../../types/template';

// 科幻冒險模板
export const scifiTemplate: NovelTemplate = {
  id: 'scifi-default',
  name: '科幻冒險模板',
  type: 'scifi',
  description: '未來世界的科幻冒險，包含高科技、AI、太空旅行等元素',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
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