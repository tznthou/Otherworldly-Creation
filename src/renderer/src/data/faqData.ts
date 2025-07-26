export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'writing' | 'ai' | 'technical' | 'troubleshooting';
  tags?: string[];
  relatedQuestions?: string[];
}

export const faqData: FAQItem[] = [
  // 一般問題
  {
    id: 'what-is-genesis',
    question: '什麼是創世紀元？',
    answer: '創世紀元是一個專為輕小說創作者設計的 AI 輔助寫作工具。它提供了專案管理、章節編輯、角色管理和 AI 續寫等功能，幫助作者更高效地創作出精彩的輕小說作品。',
    category: 'general',
    tags: ['介紹', '功能'],
    relatedQuestions: ['how-to-start', 'project-types']
  },
  {
    id: 'how-to-start',
    question: '如何開始使用？',
    answer: '首先創建一個新專案，選擇適合的小說類型（異世界、校園、科幻或奇幻）。然後添加角色、設定世界觀，就可以開始寫作了。建議先完成新手教學來熟悉各項功能。',
    category: 'general',
    tags: ['新手', '入門'],
    relatedQuestions: ['what-is-genesis', 'project-types']
  },
  {
    id: 'project-types',
    question: '支援哪些小說類型？',
    answer: '目前支援四種主要類型：異世界轉生（包含轉生設定、魔法系統）、校園戀愛（現代校園背景）、科幻冒險（未來科技設定）和奇幻冒險（魔法世界設定）。每種類型都有對應的模板和角色原型。',
    category: 'general',
    tags: ['專案', '類型'],
    relatedQuestions: ['how-to-start', 'templates']
  },
  {
    id: 'pricing',
    question: '創世紀元是免費的嗎？',
    answer: '創世紀元是一個開源專案，完全免費使用。所有功能都不需要付費，也不會收集您的創作內容。唯一的要求是需要本地安裝 Ollama 來使用 AI 功能。',
    category: 'general',
    tags: ['免費', '開源'],
    relatedQuestions: ['system-requirements', 'data-privacy']
  },
  {
    id: 'data-privacy',
    question: '我的創作內容會被上傳到雲端嗎？',
    answer: '不會。所有創作內容都儲存在您的本地電腦上，絕不會上傳到任何雲端服務。AI 功能也是透過本地的 Ollama 服務運行，確保您的創作隱私和安全。',
    category: 'general',
    tags: ['隱私', '安全', '本地'],
    relatedQuestions: ['data-backup', 'system-requirements']
  },

  // 寫作相關
  {
    id: 'auto-save',
    question: '作品會自動儲存嗎？',
    answer: '是的，系統會每 3 秒自動儲存您的寫作進度。您也可以隨時手動儲存（Ctrl+S）。所有資料都儲存在本地資料庫中，確保您的創作安全。',
    category: 'writing',
    tags: ['儲存', '自動'],
    relatedQuestions: ['data-backup', 'file-format']
  },
  {
    id: 'chapter-management',
    question: '如何管理章節？',
    answer: '在編輯器左側的章節列表中，您可以創建新章節、重新排序、編輯章節標題和添加章節筆記。支援拖拽排序，讓章節管理更加直觀。右鍵點擊章節可以進行更多操作。',
    category: 'writing',
    tags: ['章節', '管理'],
    relatedQuestions: ['editor-features', 'project-structure']
  },
  {
    id: 'character-creation',
    question: '如何創建角色？',
    answer: '在角色管理頁面點擊「創建新角色」，填寫角色的基本資訊、外貌描述、性格特點和背景故事。您也可以使用角色原型模板快速創建，系統提供主角、女主角、配角、反派等多種原型。',
    category: 'writing',
    tags: ['角色', '創建'],
    relatedQuestions: ['character-relationships', 'character-templates']
  },
  {
    id: 'character-relationships',
    question: '如何設定角色關係？',
    answer: '在角色詳情頁面中，您可以添加與其他角色的關係。支援多種關係類型：家人、朋友、戀人、敵人、師徒、同事等。關係設定會影響 AI 續寫時的角色互動。',
    category: 'writing',
    tags: ['角色', '關係'],
    relatedQuestions: ['character-creation', 'ai-context']
  },
  {
    id: 'word-count',
    question: '如何查看字數統計？',
    answer: '字數統計會即時顯示在編輯器右下角，包含當前章節字數和整個專案的總字數。您也可以在專案設定中查看更詳細的統計資訊，包含各章節的字數分布。',
    category: 'writing',
    tags: ['字數', '統計'],
    relatedQuestions: ['editor-features', 'progress-tracking']
  },
  {
    id: 'formatting',
    question: '支援哪些文字格式？',
    answer: '編輯器支援基本的富文本格式：粗體、斜體、底線、刪除線、引用、標題等。還支援自定義樣式和 Markdown 語法。您可以在設定中調整預設的字體、大小和行距。',
    category: 'writing',
    tags: ['格式', '編輯器'],
    relatedQuestions: ['editor-features', 'markdown-support']
  },

  // AI 相關
  {
    id: 'ai-how-works',
    question: 'AI 續寫是如何工作的？',
    answer: 'AI 會分析您的專案設定、角色資訊和已寫內容，理解故事的背景和風格，然後提供符合上下文的續寫建議。它會考慮角色性格、關係動態和劇情發展，確保生成內容的一致性。',
    category: 'ai',
    tags: ['AI', '續寫', '工作原理'],
    relatedQuestions: ['ai-quality', 'ai-settings']
  },
  {
    id: 'ai-quality',
    question: 'AI 生成的內容品質如何？',
    answer: 'AI 生成的內容僅供參考和靈感啟發。品質會隨著您提供的上下文資訊豐富程度而變化。建議您根據自己的創作意圖進行修改和完善。AI 是您的創作助手，但您才是故事的真正創作者。',
    category: 'ai',
    tags: ['AI', '品質', '建議'],
    relatedQuestions: ['ai-how-works', 'ai-best-practices']
  },
  {
    id: 'ai-settings',
    question: '可以調整 AI 的寫作風格嗎？',
    answer: '是的，您可以在 AI 設定中調整創作風格、內容長度和創意程度。包含：生成長度（短/中/長）、創意程度（保守/平衡/創新）、寫作風格（描述性/對話性/動作性）等參數。',
    category: 'ai',
    tags: ['AI', '設定', '風格'],
    relatedQuestions: ['ai-models', 'ai-parameters']
  },
  {
    id: 'ai-models',
    question: '支援哪些 AI 模型？',
    answer: '創世紀元透過 Ollama 支援多種開源 AI 模型，包括 Llama、CodeLlama、Mistral 等。推薦使用 llama3.2 或更新版本以獲得最佳的中文創作效果。您可以在設定中切換不同的模型。',
    category: 'ai',
    tags: ['AI', '模型', 'Ollama'],
    relatedQuestions: ['ollama-setup', 'ai-performance']
  },
  {
    id: 'ai-context',
    question: 'AI 如何理解我的故事背景？',
    answer: 'AI 會自動收集專案的世界觀設定、角色資料、角色關係和已寫章節內容作為上下文。您提供的資訊越詳細，AI 的理解就越準確。建議完善角色設定和章節筆記來提升 AI 效果。',
    category: 'ai',
    tags: ['AI', '上下文', '理解'],
    relatedQuestions: ['character-creation', 'project-setup']
  },
  {
    id: 'ai-best-practices',
    question: '如何更有效地使用 AI 功能？',
    answer: '1. 提供詳細的角色和世界觀設定 2. 在關鍵情節點添加章節筆記 3. 將游標放在合適的續寫位置 4. 調整合適的生成參數 5. 把 AI 內容當作靈感來源，而非直接採用 6. 重要情節建議人工創作。',
    category: 'ai',
    tags: ['AI', '最佳實踐', '技巧'],
    relatedQuestions: ['ai-quality', 'ai-settings']
  },

  // 技術問題
  {
    id: 'system-requirements',
    question: '系統需求是什麼？',
    answer: '最低需求：Windows 10+/macOS 10.14+/Linux Ubuntu 18.04+，4GB RAM，2GB 可用硬碟空間。推薦配置：8GB+ RAM，SSD 硬碟。AI 功能需要額外安裝 Ollama 服務，建議至少 8GB RAM 以獲得更好的 AI 效果。',
    category: 'technical',
    tags: ['系統需求', '硬體'],
    relatedQuestions: ['ollama-setup', 'performance-optimization']
  },
  {
    id: 'ollama-setup',
    question: '如何安裝和設定 Ollama？',
    answer: '1. 前往 ollama.ai 下載適合您系統的版本 2. 安裝後執行 "ollama pull llama3.2" 下載模型 3. 確保 Ollama 服務正在運行 4. 在創世紀元中檢查 AI 狀態是否為「已連線」。詳細安裝步驟請參考官方文檔。',
    category: 'technical',
    tags: ['Ollama', '安裝', '設定'],
    relatedQuestions: ['ai-models', 'ai-troubleshooting']
  },
  {
    id: 'data-backup',
    question: '如何備份我的作品？',
    answer: '系統提供多種備份方式：1. 專案匯出：在專案設定中匯出為 JSON 格式 2. 自動備份：系統會定期建立備份檔案 3. 手動備份：複製整個應用程式資料夾。建議定期匯出重要專案並存儲在不同位置。',
    category: 'technical',
    tags: ['備份', '匯出'],
    relatedQuestions: ['data-restore', 'file-format']
  },
  {
    id: 'data-restore',
    question: '如何恢復備份的作品？',
    answer: '您可以透過以下方式恢復：1. 專案匯入：在主界面選擇「匯入專案」載入 JSON 檔案 2. 自動備份恢復：在設定中選擇要恢復的備份點 3. 資料夾恢復：將備份的資料夾覆蓋到應用程式目錄。',
    category: 'technical',
    tags: ['恢復', '匯入'],
    relatedQuestions: ['data-backup', 'troubleshooting']
  },
  {
    id: 'file-format',
    question: '專案檔案是什麼格式？',
    answer: '專案資料儲存在本地 SQLite 資料庫中，匯出格式為標準 JSON。這確保了資料的可攜性和可讀性。您可以用任何文字編輯器查看匯出的 JSON 檔案內容。',
    category: 'technical',
    tags: ['檔案格式', 'JSON', 'SQLite'],
    relatedQuestions: ['data-backup', 'data-privacy']
  },
  {
    id: 'performance-optimization',
    question: '如何優化應用程式效能？',
    answer: '1. 定期清理暫存檔案和快取 2. 執行資料庫維護和最佳化 3. 關閉不必要的背景程式 4. 升級記憶體到 8GB 以上 5. 使用 SSD 硬碟 6. 選擇較小的 AI 模型以減少記憶體使用。',
    category: 'technical',
    tags: ['效能', '最佳化'],
    relatedQuestions: ['system-requirements', 'troubleshooting']
  },

  // 故障排除
  {
    id: 'troubleshooting',
    question: '遇到問題怎麼辦？',
    answer: '首先檢查系統狀態面板確認各服務是否正常。常見解決方案：1. 重新啟動應用程式 2. 檢查 Ollama 服務狀態 3. 清除快取資料 4. 查看錯誤日誌 5. 更新到最新版本。如果問題持續，請聯繫技術支援。',
    category: 'troubleshooting',
    tags: ['故障排除', '問題解決'],
    relatedQuestions: ['ai-troubleshooting', 'performance-issues']
  },
  {
    id: 'ai-troubleshooting',
    question: 'AI 功能無法正常工作怎麼辦？',
    answer: '請按順序檢查：1. Ollama 服務是否正在執行 2. 網路連線是否正常 3. 防火牆是否阻擋連線 4. 模型是否正確下載 5. 記憶體是否足夠 6. 重新啟動 Ollama 服務。如仍有問題，請檢查系統診斷報告。',
    category: 'troubleshooting',
    tags: ['AI', '故障排除'],
    relatedQuestions: ['ollama-setup', 'ai-models']
  },
  {
    id: 'performance-issues',
    question: '應用程式運行緩慢怎麼辦？',
    answer: '效能問題的解決方案：1. 檢查系統資源使用情況 2. 關閉其他高耗能應用程式 3. 清理暫存檔案 4. 執行資料庫最佳化 5. 減少 AI 生成長度 6. 使用較小的 AI 模型 7. 考慮硬體升級。',
    category: 'troubleshooting',
    tags: ['效能', '緩慢'],
    relatedQuestions: ['performance-optimization', 'system-requirements']
  },
  {
    id: 'startup-issues',
    question: '應用程式無法啟動怎麼辦？',
    answer: '啟動問題解決步驟：1. 確認系統符合最低需求 2. 以管理員權限執行 3. 檢查防毒軟體是否阻擋 4. 刪除快取檔案 5. 檢查相依套件是否完整 6. 重新安裝應用程式 7. 查看系統事件日誌。',
    category: 'troubleshooting',
    tags: ['啟動', '問題'],
    relatedQuestions: ['system-requirements', 'installation']
  },
  {
    id: 'data-loss',
    question: '資料遺失了怎麼辦？',
    answer: '資料恢復步驟：1. 檢查自動備份檔案 2. 查看最近的匯出檔案 3. 使用資料恢復功能 4. 檢查資料庫備份 5. 查看暫存檔案 6. 聯繫技術支援協助恢復。建議平時定期備份重要創作。',
    category: 'troubleshooting',
    tags: ['資料遺失', '恢復'],
    relatedQuestions: ['data-backup', 'data-restore']
  },
  {
    id: 'update-issues',
    question: '更新後出現問題怎麼辦？',
    answer: '更新問題解決：1. 重新啟動應用程式 2. 清除舊版快取檔案 3. 檢查設定是否需要重置 4. 查看更新日誌了解變更 5. 回報問題給開發團隊 6. 如有嚴重問題可暫時回退到舊版本。',
    category: 'troubleshooting',
    tags: ['更新', '問題'],
    relatedQuestions: ['troubleshooting', 'version-compatibility']
  },

  // 進階使用
  {
    id: 'templates',
    question: '如何使用和自定義模板？',
    answer: '系統提供多種專案模板，每個模板包含預設的世界觀、角色原型和劇情框架。您可以：1. 選擇現有模板快速開始 2. 修改模板內容符合需求 3. 創建自己的模板供重複使用 4. 分享模板給其他創作者。',
    category: 'writing',
    tags: ['模板', '自定義'],
    relatedQuestions: ['project-types', 'character-templates']
  },
  {
    id: 'keyboard-shortcuts',
    question: '有哪些快捷鍵可以使用？',
    answer: '常用快捷鍵：Ctrl+S (儲存)、Ctrl+N (新章節)、Ctrl+F (搜尋)、Ctrl+H (替換)、Ctrl+Z (撤銷)、Ctrl+Y (重做)、Alt+A (AI 續寫)、F11 (全螢幕)、Ctrl+, (設定)。macOS 請將 Ctrl 替換為 Cmd。',
    category: 'technical',
    tags: ['快捷鍵', '效率'],
    relatedQuestions: ['editor-features', 'productivity-tips']
  },
  {
    id: 'collaboration',
    question: '支援多人協作嗎？',
    answer: '目前創世紀元主要設計為個人創作工具，不支援即時協作。但您可以透過匯出/匯入功能與其他創作者分享專案，或使用版本控制系統管理多個版本。未來版本可能會加入協作功能。',
    category: 'general',
    tags: ['協作', '分享'],
    relatedQuestions: ['data-backup', 'future-features']
  }
];

export const categoryNames = {
  general: '一般問題',
  writing: '寫作相關',
  ai: 'AI 功能',
  technical: '技術支援',
  troubleshooting: '故障排除'
};

// 根據標籤搜尋 FAQ
export const searchFAQByTags = (tags: string[]): FAQItem[] => {
  return faqData.filter(item => 
    item.tags?.some(tag => tags.includes(tag))
  );
};

// 獲取相關問題
export const getRelatedQuestions = (questionId: string): FAQItem[] => {
  const question = faqData.find(item => item.id === questionId);
  if (!question?.relatedQuestions) return [];
  
  return faqData.filter(item => 
    question.relatedQuestions?.includes(item.id)
  );
};

// 搜尋 FAQ
export const searchFAQ = (query: string, category?: string): FAQItem[] => {
  const lowercaseQuery = query.toLowerCase();
  
  return faqData.filter(item => {
    const matchesCategory = !category || category === 'all' || item.category === category;
    const matchesQuery = !query || 
      item.question.toLowerCase().includes(lowercaseQuery) ||
      item.answer.toLowerCase().includes(lowercaseQuery) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery));
    
    return matchesCategory && matchesQuery;
  });
};