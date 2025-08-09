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
    position: 'center',
    highlight: false
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
    position: 'center',
    highlight: false
  },
  {
    id: 'ai-features',
    title: 'AI 輔助功能',
    content: '我們的 AI 助手可以幫助您續寫故事、生成角色對話、提供劇情建議等。AI 會根據您的專案設定和已有內容提供個性化的建議。',
    position: 'center',
    highlight: false
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
    title: '多供應商AI系統',
    content: '創世紀元支援5大AI供應商，包括本地Ollama和雲端服務（OpenAI、Google Gemini、Anthropic Claude、OpenRouter）。讓我們學習如何配置和使用這個強大的AI創作系統。',
    position: 'center'
  },
  {
    id: 'ai-providers',
    title: 'AI供應商選擇',
    content: '在AI寫作面板中，您可以選擇不同的AI供應商。每個供應商都有其特色：Ollama（本地隱私）、OpenAI（GPT系列）、Google Gemini（多模態）、Claude（推理能力）、OpenRouter（多模型聚合）。',
    target: '[data-tutorial="ai-providers-select"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'ai-models',
    title: '模型搜尋與選擇',
    content: '選擇供應商後，系統會自動搜尋可用模型。您可以根據創作需求選擇合適的模型，如用於創作的大型模型或用於快速生成的小型模型。',
    target: '[data-tutorial="ai-model-select"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'ai-context',
    title: '上下文感知續寫',
    content: 'AI會分析您的專案設定、角色資訊和已寫內容，提供符合故事背景的續寫建議。將游標放在想要續寫的位置，AI會自動建立上下文。',
    target: '[data-tutorial="ai-context"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'ai-generation',
    title: '智能文本生成',
    content: 'AI支援多種生成模式：續寫故事、生成對話、描述場景等。系統會根據上下文和角色關係提供相應的內容。支援重新生成和多版本比較。',
    target: '[data-tutorial="ai-generation"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'ai-settings',
    title: 'AI參數調整',
    content: '您可以調整AI的創作風格、長度偏好和創意程度。不同供應商可能有不同的參數選項，系統會自動適配最佳參數組合。',
    target: '[data-tutorial="ai-settings"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'ai-history',
    title: 'AI歷史記錄',
    content: '系統會保存所有AI生成記錄，包括生成時間、使用的模型、參數設定等。您可以回顧之前的生成結果，或重用成功的參數配置。',
    target: '[data-tutorial="ai-history"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'ai-best-practices',
    title: 'AI使用最佳實踐',
    content: '1. 提供詳細的角色和世界觀設定 2. 在關鍵情節點添加章節筆記 3. 嘗試不同供應商找到最適合的風格 4. 將AI內容當作靈感來源 5. 重要情節建議人工創作。記住，您才是故事的真正創作者！',
    position: 'center',
    highlight: false
  }
];;
// 系統設定教學
export const settingsTutorial: TutorialStep[] = [
  {
    id: 'settings-welcome',
    title: '系統設定概覽',
    content: '在系統設定中，您可以配置AI供應商、調整應用程式偏好設定，以及管理各種功能選項。讓我們一起了解如何配置這些重要設定。',
    position: 'center'
  },
  {
    id: 'ai-providers-config',
    title: 'AI供應商配置',
    content: '這裡是配置AI供應商的地方。您可以啟用或停用不同的供應商，設定API Key，並測試連線狀態。支援本地Ollama和多種雲端服務。',
    target: '[data-tutorial="ai-providers-settings"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'api-key-setup',
    title: 'API金鑰設定',
    content: '對於雲端AI服務（OpenAI、Google、Claude、OpenRouter），您需要提供有效的API Key。請確保API Key有足夠的使用額度，並妥善保管您的金鑰。',
    target: '[data-tutorial="api-key-input"]',
    position: 'bottom',
    highlight: true
  },
  {
    id: 'provider-testing',
    title: '連線測試',
    content: '配置完成後，建議使用「測試連線」功能確認各供應商狀態。綠色表示正常，紅色表示需要檢查配置。確保至少有一個供應商可正常使用。',
    target: '[data-tutorial="test-connection"]',
    position: 'left',
    highlight: true
  },
  {
    id: 'app-preferences',
    title: '應用程式偏好設定',
    content: '您可以調整介面主題、語言設定、自動儲存間隔等。這些設定會影響整體的使用體驗，建議根據個人習慣進行調整。',
    target: '[data-tutorial="app-preferences"]',
    position: 'right',
    highlight: true
  },
  {
    id: 'settings-best-practices',
    title: '設定最佳實踐',
    content: '1. 定期檢查API Key使用額度 2. 備份重要設定配置 3. 測試不同供應商找到最適合的風格 4. 根據創作需求調整AI參數 5. 保持軟體更新以獲得最新功能。',
    position: 'center',
    highlight: false
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
    title: '多供應商AI教學',
    description: '學習如何配置和使用5大AI供應商系統',
    steps: aiTutorial,
    estimatedTime: '8-10 分鐘'
  },
  'settings': {
    id: 'settings',
    title: '系統設定教學', 
    description: '配置AI供應商和應用程式偏好設定',
    steps: settingsTutorial,
    estimatedTime: '5-7 分鐘'
  }
};;

export type TutorialId = keyof typeof tutorialIndex;