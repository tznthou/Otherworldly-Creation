// 異世界模板的詳細世界觀要素定義
import { WorldSetting, MagicSystem, LevelSystem } from '../types/template';

// 等級系統詳細定義
export const isekaiLevelSystem: LevelSystem = {
  type: '數值成長系統',
  maxLevel: 100,
  attributes: [
    '力量 (STR)',
    '敏捷 (AGI)', 
    '智力 (INT)',
    '體力 (VIT)',
    '魔力 (MP)',
    '幸運 (LUK)'
  ],
  skills: [
    '劍術',
    '魔法',
    '弓術',
    '盜賊技能',
    '鍛造',
    '煉金術',
    '料理',
    '語言理解',
    '鑑定',
    '治療'
  ]
};

// 魔法系統詳細定義
export const isekaiMagicSystem: MagicSystem = {
  type: '元素魔法系統',
  rules: [
    '魔力來源於個人的魔力值 (MP)',
    '需要詠唱咒語或手勢來發動',
    '魔法有屬性相剋關係',
    '魔力會隨使用而消耗，需要休息恢復',
    '魔法威力與智力和魔力值相關',
    '高級魔法需要更長的詠唱時間'
  ],
  limitations: [
    '魔力有限，過度使用會導致魔力枯竭',
    '某些強大魔法需要特殊道具或材料',
    '魔法抗性可以減少魔法傷害',
    '詠唱時間限制了戰鬥中的應用',
    '環境因素會影響魔法效果',
    '某些魔法有使用次數限制'
  ],
  schools: [
    '火系魔法 - 攻擊性強，適合戰鬥',
    '水系魔法 - 治療和防禦為主',
    '風系魔法 - 速度和範圍攻擊',
    '土系魔法 - 防禦和建築',
    '光系魔法 - 治療和淨化',
    '暗系魔法 - 詛咒和召喚',
    '無屬性魔法 - 萬能但威力較低'
  ]
};

// 轉生設定詳細定義
export const isekaiReincarnationSettings = {
  reincarnationType: '意外死亡轉生',
  specialAbilities: [
    '語言自動翻譯',
    '狀態視窗顯示',
    '快速學習能力',
    '現代知識保留',
    '特殊技能獲得',
    '等級成長加速'
  ],
  reincarnationBenefits: [
    '保留前世記憶',
    '獲得系統輔助',
    '特殊稱號效果',
    '神明的祝福',
    '命運的眷顧',
    '隱藏能力覺醒'
  ],
  commonOrigins: [
    '交通事故死亡',
    '過勞死',
    '意外事故',
    '疾病死亡',
    '救人犧牲',
    '神明召喚'
  ]
};

// 異世界社會結構
export const isekaiSocialStructure = {
  governmentType: '王國制度',
  socialClasses: [
    '王族 - 統治階級',
    '貴族 - 領主和騎士',
    '騎士 - 戰士階級',
    '商人 - 貿易階級',
    '工匠 - 技術階級',
    '農民 - 生產階級',
    '冒險者 - 自由職業',
    '奴隸 - 最底層'
  ],
  importantOrganizations: [
    '冒險者公會 - 任務發布和管理',
    '魔法學院 - 魔法教育機構',
    '騎士團 - 王國軍事力量',
    '商會 - 貿易組織',
    '教會 - 宗教組織',
    '盜賊公會 - 地下組織'
  ],
  currency: [
    '金幣 (Gold) - 最高價值',
    '銀幣 (Silver) - 中等價值',
    '銅幣 (Copper) - 基本貨幣'
  ]
};

// 異世界地理環境
export const isekaiGeography = {
  continentName: '阿爾卡迪亞大陸',
  majorRegions: [
    '人類王國 - 中央平原地帶',
    '精靈森林 - 西部森林區域',
    '矮人山脈 - 北部山區',
    '獸人草原 - 東部草原',
    '魔族領域 - 南部黑暗地帶',
    '龍族聖地 - 遠古龍族居住地'
  ],
  dangerousAreas: [
    '魔境 - 魔物聚集地',
    '迷宮 - 地下城',
    '禁忌森林 - 危險的深林',
    '死亡沙漠 - 極端環境',
    '魔王城 - 最終目標地點'
  ],
  importantCities: [
    '王都 - 政治中心',
    '商業都市 - 貿易中心',
    '學園都市 - 教育中心',
    '港口都市 - 交通樞紐',
    '要塞都市 - 軍事重鎮'
  ]
};

// 異世界魔物系統
export const isekaiMonsterSystem = {
  monsterRanks: [
    'F級 - 史萊姆、哥布林',
    'E級 - 狼、熊',
    'D級 - 獸人、骷髏',
    'C級 - 巨魔、獨眼巨人',
    'B級 - 飛龍、魔法獸',
    'A級 - 古龍、惡魔',
    'S級 - 傳說級魔物',
    'SS級 - 災害級存在'
  ],
  commonMonsters: [
    '史萊姆 - 最基本的魔物',
    '哥布林 - 群體行動的小魔物',
    '獸人 - 智慧型戰鬥魔物',
    '不死族 - 骷髏和殭屍',
    '龍族 - 最強大的魔物',
    '魔法獸 - 會使用魔法的動物'
  ],
  dropItems: [
    '魔石 - 魔物核心，可用於煉金',
    '素材 - 製作裝備的材料',
    '藥草 - 製作藥水的原料',
    '稀有金屬 - 高級裝備材料',
    '魔法書 - 學習新魔法',
    '寶石 - 高價值物品'
  ]
};

// 異世界裝備系統
export const isekaiEquipmentSystem = {
  weaponTypes: [
    '劍 - 平衡型武器',
    '斧 - 高攻擊力',
    '槍 - 長距離攻擊',
    '弓 - 遠程武器',
    '法杖 - 魔法增幅',
    '匕首 - 速度型武器'
  ],
  armorTypes: [
    '重甲 - 高防禦，低機動',
    '輕甲 - 平衡型',
    '法袍 - 魔法增幅',
    '皮甲 - 高機動性'
  ],
  equipmentRanks: [
    '普通 (白色)',
    '優秀 (綠色)',
    '稀有 (藍色)',
    '史詩 (紫色)',
    '傳說 (橙色)',
    '神器 (紅色)'
  ],
  enchantments: [
    '力量增強',
    '敏捷提升',
    '魔力增幅',
    '元素抗性',
    '自動修復',
    '經驗值加成'
  ]
};

// 完整的異世界世界觀設定
export const enhancedIsekaiWorldSetting: WorldSetting = {
  era: '中世紀奇幻時代',
  technology: '魔法與劍的世界，少量煉金術科技',
  society: '王國制度，多種族共存，階級分明',
  specialElements: [
    '等級系統與數值成長',
    '元素魔法系統',
    '轉生者特權',
    '冒險者公會制度',
    '魔物討伐與迷宮探索',
    '多種族文化交流',
    '神明與信仰系統',
    '煉金術與魔法道具',
    '狀態視窗與技能樹',
    '魔王與勇者傳說'
  ],
  geography: `${isekaiGeography.continentName}是一個廣闊的大陸，包含${isekaiGeography.majorRegions.length}個主要區域。中央是人類王國，周圍分布著不同種族的領域。`,
  culture: '多元種族文化融合，以人類文化為主體，融入精靈的自然崇拜、矮人的工匠精神、獸人的戰士文化',
  magic: isekaiMagicSystem,
  levelSystem: isekaiLevelSystem
};

// 導出所有異世界相關設定
export const isekaiWorldElements = {
  worldSetting: enhancedIsekaiWorldSetting,
  levelSystem: isekaiLevelSystem,
  magicSystem: isekaiMagicSystem,
  reincarnationSettings: isekaiReincarnationSettings,
  socialStructure: isekaiSocialStructure,
  geography: isekaiGeography,
  monsterSystem: isekaiMonsterSystem,
  equipmentSystem: isekaiEquipmentSystem
};