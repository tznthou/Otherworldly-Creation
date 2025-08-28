export const GUIDANCE_TEXTS = {
  // 工作流程相關
  workflow: {
    welcome: '🎨 歡迎使用視覺創作中心！讓 AI 為您的角色繪製精美插畫',
    stepByStep: '跟隨步驟指示，輕鬆完成插畫創作'
  },

  // 角色選擇相關
  characterSelection: {
    title: '步驟 1：選擇要繪製的角色',
    description: '💡 提示：可選擇 1-3 個角色，AI 會為每個角色生成獨立插畫',
    emptyState: '還沒有角色？先去角色管理創建您的角色吧！',
    multiSelectTip: '按住 Ctrl/Cmd 可多選角色進行批次生成',
    tooltip: '點擊選擇角色，藍色邊框表示已選中'
  },

  // 場景建構相關
  sceneBuilder: {
    title: '步驟 2：描述場景和動作',
    description: '✨ 描述越詳細，生成效果越好！試著加入環境、動作、表情等細節',
    promptPlaceholder: '例如：在櫻花飄落的公園裡，主角微笑著向前走去，陽光透過樹葉灑下...',
    examples: [
      '在古老的圖書館中，角色正專注地閱讀古籍',
      '夕陽西下的海邊，角色眺望遠方的地平線',
      '雨中的城市街道，角色撐著雨傘匆匆走過'
    ],
    tips: [
      '包含環境描述（地點、時間、天氣）',
      '描述角色的動作和表情',
      '加入情緒和氛圍營造',
      '使用生動的形容詞'
    ]
  },

  // 生成控制相關
  generation: {
    title: '步驟 3：調整風格並生成',
    styleDescription: '選擇適合您作品風格的繪畫類型',
    batchMode: '📦 批次模式：可以為不同角色設定不同場景，一次生成多張插畫',
    generateButton: '🎨 開始創作',
    generating: '正在生成中，請稍候...',
    success: '🎉 生成完成！'
  },

  // 預覽和保存相關
  preview: {
    title: '步驟 4：預覽和保存結果',
    description: '查看生成結果，選擇滿意的圖片保存到圖庫',
    variantTip: '🎨 創建變體：基於現有圖片生成相似但有變化的新版本',
    selectionTip: '點擊圖片左上角的圓圈進行選擇',
    keyboardShortcuts: [
      '← → 切換圖片',
      'Ctrl/Cmd + D 快速選擇',
      'Enter 保存選中圖片',
      'Esc 關閉預覽'
    ]
  },

  // 批次管理相關
  batchManagement: {
    title: '批次生成管理',
    description: '管理多個生成請求，可以為不同角色設定不同場景',
    addRequest: '➕ 新增請求',
    emptyRequests: '還沒有生成請求，點擊上方按鈕來添加',
    requestTemplate: '請求 {index}：{characters} - {scene}'
  },

  // 錯誤和提示
  errors: {
    noProject: '請先選擇或創建專案',
    noCharacters: '請選擇至少一個角色',
    noScene: '請描述場景和動作',
    generateFailed: '生成失敗，請重試'
  },

  // 快捷操作
  quickActions: {
    continueCreating: '繼續創作其他角色？',
    createVariant: '為此圖片創建變體',
    saveSelected: '保存選中的圖片',
    startOver: '重新開始創作'
  }
} as const;

export const getStepTitle = (step: number): string => {
  const titles = {
    1: GUIDANCE_TEXTS.characterSelection.title,
    2: GUIDANCE_TEXTS.sceneBuilder.title,
    3: GUIDANCE_TEXTS.generation.title,
    4: GUIDANCE_TEXTS.preview.title
  };
  return titles[step as keyof typeof titles] || '';
};