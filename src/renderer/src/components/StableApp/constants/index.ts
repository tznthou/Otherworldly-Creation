import { ProjectType, Archetype, Template } from '../types';

// 專案類型常數
export const PROJECT_TYPES: ProjectType[] = [
  { id: 'isekai', name: '異世界', icon: '🌟', description: '主角穿越或轉生到異世界的冒險故事' },
  { id: 'school', name: '校園', icon: '🏫', description: '以學校為背景的青春戀愛或成長故事' },
  { id: 'scifi', name: '科幻', icon: '🚀', description: '探索未來科技和太空冒險的故事' },
  { id: 'fantasy', name: '奇幻', icon: '⚔️', description: '充滿魔法和神秘生物的奇幻世界冒險' },
];

// 角色原型常數
export const CHARACTER_ARCHETYPES: Archetype[] = [
  { id: 'hero', name: '主角', icon: '⚔️', description: '故事的主人公' },
  { id: 'heroine', name: '女主角', icon: '👸', description: '女性主角' },
  { id: 'mentor', name: '導師', icon: '🧙‍♂️', description: '指導主角的智者' },
  { id: 'villain', name: '反派', icon: '😈', description: '故事的反面角色' },
  { id: 'sidekick', name: '夥伴', icon: '🤝', description: '主角的忠實夥伴' },
  { id: 'rival', name: '競爭對手', icon: '⚡', description: '與主角實力相當的對手' },
];

// 故事模板常數
export const STORY_TEMPLATES: Template[] = [
  {
    id: 'isekai-basic',
    name: '異世界轉生基礎模板',
    type: 'isekai',
    icon: '🌟',
    description: '主角死後轉生到異世界，獲得特殊能力開始冒險',
    outline: [
      '第一章：意外死亡與轉生',
      '第二章：異世界的覺醒',
      '第三章：初次冒險',
      '第四章：夥伴相遇',
      '第五章：真正的考驗'
    ]
  },
  {
    id: 'school-romance',
    name: '校園戀愛喜劇模板',
    type: 'school',
    icon: '🏫',
    description: '校園背景的青春戀愛故事，充滿歡笑與心動',
    outline: [
      '第一章：新學期的邂逅',
      '第二章：意外的同班同學',
      '第三章：學園祭的準備',
      '第四章：告白的勇氣',
      '第五章：青春的答案'
    ]
  },
  {
    id: 'scifi-adventure',
    name: '科幻冒險模板',
    type: 'scifi',
    icon: '🚀',
    description: '未來世界的科技冒險，探索宇宙的奧秘',
    outline: [
      '第一章：太空站的警報',
      '第二章：未知信號的發現',
      '第三章：星際航行開始',
      '第四章：外星文明接觸',
      '第五章：宇宙的真相'
    ]
  },
  {
    id: 'fantasy-magic',
    name: '奇幻魔法學院模板',
    type: 'fantasy',
    icon: '⚔️',
    description: '魔法世界的學院生活與冒險',
    outline: [
      '第一章：魔法學院入學',
      '第二章：魔法天賦的覺醒',
      '第三章：同窗好友',
      '第四章：禁忌魔法的誘惑',
      '第五章：學院的秘密'
    ]
  }
];

// 快捷鍵定義
export const SHORTCUTS = [
  { key: 'Ctrl + S', desc: '儲存' },
  { key: 'Ctrl + N', desc: '新增章節' },
  { key: 'Ctrl + F', desc: '搜尋' },
  { key: 'Ctrl + Z', desc: '復原' },
  { key: 'Ctrl + Y', desc: '重做' },
  { key: 'F11', desc: '全螢幕模式' },
  { key: 'Alt + A', desc: 'AI 續寫' },
  { key: 'Ctrl + ,', desc: '開啟設定' }
];

// 本地儲存鍵值
export const STORAGE_KEYS = {
  PROJECTS: 'novel_projects',
  CHARACTERS: 'novel_characters',
  CONTENT: 'novel_content',
  TEMPLATE: 'applied_template',
  WRITING_TIME: 'total_writing_time',
  SAVED_TIME: 'novel_saved_time'
};

// 預設值
export const DEFAULTS = {
  DAILY_GOAL: 1000, // 每日目標字數
  DEFAULT_CONTENT: '第一章：穿越的開始\n\n我叫李明，原本是一個普通的大學生。直到那個雷雨交加的夜晚，一道奇異的光芒將我包圍...\n\n（繼續你的創作吧！）'
};

// OLLAMA 設定
export const OLLAMA_CONFIG = {
  BASE_URL: 'http://localhost:11434',
  API_ENDPOINTS: {
    TAGS: '/api/tags',
    VERSION: '/api/version'
  },
  REQUEST_TIMEOUT: 5000,
  CHECK_INTERVAL: 10000 // 10 秒檢查一次連接狀態
};