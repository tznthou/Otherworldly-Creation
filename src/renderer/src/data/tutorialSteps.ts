import { TutorialStep } from '../components/Tutorial/TutorialOverlay';

// 首次使用教學
export const firstTimeTutorial: TutorialStep[] = [
  {
    id: 'welcome',
    title: '歡迎使用創世紀元',
    content: '歡迎來到創世紀元：異世界創作神器！這是一個專為輕小說創作者設計的 AI 輔助寫作工具。讓我們一起探索它的強大功能吧！',
    position: 'center',
    skipable: true,
    highlight: false
  },
  {
    id: 'dashboard',
    title: '專案儀表板',
    content: '這裡是您的專案儀表板，您可以在這裡查看所有創作專案、創建新專案，以及管理現有的作品。',
    target: '[data-tutorial="dashboard"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'create-project',
    title: '創建新專案',
    content: '點擊這個按鈕來創建您的第一個專案。您可以選擇不同的小說類型，如異世界、校園、科幻或奇幻。',
    target: '[data-tutorial="create-project-btn"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'project-templates',
    title: '專案模板',
    content: '創世紀元提供了多種專案模板，每個模板都包含了該類型小說的世界觀設定、角色原型和劇情框架，幫助您快速開始創作。',
    target: '[data-tutorial="project-templates"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'ai-features',
    title: 'AI 輔助功能',
    content: '我們的 AI 助手可以幫助您續寫故事、生成角色對話、提供劇情建議等。AI 會根據您的專案設定和已有內容提供個性化的建議。',
    target: '[data-tutorial="ai-status"]',
    position: 'top',
    highlight: true
  }
];

// 專案編輯器教學
export const editorTutorial: TutorialStep[] = [
  {
    id: 'editor-welcome',
    title: '專案編輯器',
    content: '歡迎來到專案編輯器！這裡是您創作的主要工作區域。讓我們了解一下各個功能區域。',
    position: 'center'
  },
  {
    id: 'chapter-list',
    title: '章節列表',
    content: '左側是章節列表，您可以在這裡管理所有章節、調整章節順序，以及查看寫作進度。',
    target: '[data-tutorial="chapter-list"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'editor-toolbar',
    title: '編輯器工具欄',
    content: '工具欄提供了儲存、AI 續寫、格式設定等功能。您可以隨時使用這些工具來提升寫作效率。',
    target: '[data-tutorial="editor-toolbar"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'writing-area',
    title: '寫作區域',
    content: '這裡是主要的寫作區域，支援富文本編輯。您可以專注於創作，系統會自動儲存您的進度。',
    target: '[data-tutorial="writing-area"]',
    position: 'top',
    highlight: true
  },
  {
    id: 'ai-panel',
    title: 'AI 續寫面板',
    content: '點擊 AI 續寫按鈕可以打開 AI 輔助面板，AI 會根據您的故事內容和角色設定提供續寫建議。',
    target: '[data-tutorial="ai-panel-btn"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'chapter-notes',
    title: '章節筆記',
    content: '每個章節都可以添加筆記，記錄創作靈感、劇情要點或需要修改的地方。',
    target: '[data-tutorial="chapter-notes"]',
    position: 'top',
    highlight: true
  }
];

// 角色管理教學
export const characterTutorial: TutorialStep[] = [
  {
    id: 'character-welcome',
    title: '角色管理系統',
    content: '角色是故事的靈魂！讓我們學習如何使用角色管理系統來創建和管理您的角色。',
    position: 'center'
  },
  {
    id: 'character-list',
    title: '角色列表',
    content: '這裡顯示了您專案中的所有角色。您可以查看角色資訊、編輯角色設定，以及管理角色關係。',
    target: '[data-tutorial="character-list"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'create-character',
    title: '創建新角色',
    content: '點擊這個按鈕來創建新角色。系統提供了多種角色原型模板，幫助您快速設定角色基本資訊。',
    target: '[data-tutorial="create-character-btn"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'character-details',
    title: '角色詳細資訊',
    content: '每個角色都可以設定詳細的背景資訊，包括外貌、性格、背景故事和人際關係等。',
    target: '[data-tutorial="character-details"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'character-relationships',
    title: '角色關係',
    content: '您可以設定角色之間的關係，系統會在 AI 續寫時考慮這些關係，讓故事更加連貫。',
    target: '[data-tutorial="character-relationships"]',
    position: 'top',
    highlight: true
  }
];

// AI 功能教學
export const aiTutorial: TutorialStep[] = [
  {
    id: 'ai-welcome',
    title: 'AI 輔助寫作',
    content: '創世紀元的 AI 助手是您的創作夥伴，讓我們學習如何有效使用 AI 功能來提升創作效率。',
    position: 'center'
  },
  {
    id: 'ai-context',
    title: '上下文理解',
    content: 'AI 會分析您的專案設定、角色資訊和已寫內容，提供符合故事背景的續寫建議。',
    target: '[data-tutorial="ai-context"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'ai-generation',
    title: '文本生成',
    content: '您可以選擇不同的生成模式，如續寫故事、生成對話、描述場景等。AI 會根據您的需求提供相應的內容。',
    target: '[data-tutorial="ai-generation"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'ai-settings',
    title: 'AI 設定',
    content: '您可以調整 AI 的創作風格、長度偏好和創意程度，讓 AI 的輸出更符合您的寫作風格。',
    target: '[data-tutorial="ai-settings"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'ai-review',
    title: '內容審查',
    content: 'AI 生成的內容僅供參考，請根據您的創作意圖進行修改和完善。記住，您才是故事的真正創作者！',
    target: '[data-tutorial="ai-review"]',
    position: 'top',
    highlight: true
  }
];

// 所有教學的索引
export const tutorialIndex = {
  'first-time': {
    id: 'first-time',
    title: '首次使用教學',
    description: '了解創世紀元的基本功能和使用方法',
    steps: firstTimeTutorial,
    estimatedTime: '3-5 分鐘'
  },
  'editor': {
    id: 'editor',
    title: '編輯器使用教學',
    description: '學習如何使用專案編輯器進行創作',
    steps: editorTutorial,
    estimatedTime: '5-7 分鐘'
  },
  'character': {
    id: 'character',
    title: '角色管理教學',
    description: '掌握角色創建和管理的技巧',
    steps: characterTutorial,
    estimatedTime: '4-6 分鐘'
  },
  'ai': {
    id: 'ai',
    title: 'AI 輔助教學',
    description: '學習如何有效使用 AI 輔助功能',
    steps: aiTutorial,
    estimatedTime: '6-8 分鐘'
  }
};

export type TutorialId = keyof typeof tutorialIndex;