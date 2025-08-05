import { NovelTemplate, DEFAULT_TEMPLATE_VERSION } from '../../types/template';

// 校園戀愛模板
export const schoolTemplate: NovelTemplate = {
  id: 'school-default',
  name: '校園戀愛喜劇模板',
  type: 'school',
  description: '現代日式校園背景的戀愛喜劇，充滿青春活力和浪漫元素',
  version: DEFAULT_TEMPLATE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
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