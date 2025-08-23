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
    id: 'ai-providers-setup',
    question: '如何配置AI供應商？',
    answer: '1. 進入「系統設定」→「AI供應商配置」 2. 選擇要啟用的供應商 3. 填入相應的API Key（雲端服務需要）4. 測試連接確認配置成功 5. 在AI寫作面板中選擇供應商和模型。本地Ollama無需API Key，雲端服務需要註冊並取得API金鑰。',
    category: 'ai',
    tags: ['供應商', '配置', 'API'],
    relatedQuestions: ['ai-models', 'ai-settings']
  },
  {
    id: 'ai-provider-comparison',
    question: '不同AI供應商有什麼特色？',
    answer: 'Ollama：完全本地運行，隱私性佳，無需網路；OpenAI：創意寫作能力強，模型選擇多；Google Gemini：多模態支援，響應速度快；Anthropic Claude：邏輯推理優秀，安全性佳；OpenRouter：聚合多種模型，選擇靈活。建議根據創作需求和隱私要求選擇合適的供應商。',
    category: 'ai',
    tags: ['供應商', '特色', '比較'],
    relatedQuestions: ['ai-providers-setup', 'ai-best-practices']
  },
  {
    id: 'ai-context-writing',
    question: '上下文感知續寫如何使用？',
    answer: '1. 將游標放在想要續寫的位置 2. 點擊AI寫作面板中的「續寫」按鈕 3. 系統會自動分析前後文內容、角色關係、故事背景 4. 基於位置上下文生成符合故事情節的內容。上下文包括專案設定、角色資料、已寫章節內容，確保生成的內容保持故事一致性。',
    category: 'ai',
    tags: ['上下文', '續寫', '位置感知'],
    relatedQuestions: ['ai-how-works', 'ai-best-practices']
  },
  {
    id: 'ai-how-works',
    question: 'AI 續寫是如何工作的？',
    answer: '創世紀元支援5大AI供應商（Ollama、OpenAI、Google Gemini、Anthropic Claude、OpenRouter），每個供應商都有獨特優勢。AI會分析您的專案設定、角色資訊和已寫內容，理解故事的背景和風格，然後提供符合上下文的續寫建議。系統支援位置感知續寫，會根據游標位置智能建立上下文，確保生成內容的一致性。',
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
    answer: '是的，您可以在AI設定中調整創作風格、內容長度和創意程度。不同供應商提供不同的參數選項：溫度控制（創意程度）、最大長度、重複懲罰等。系統還支援供應商切換，每個供應商都有獨特的寫作風格：OpenAI擅長創意寫作、Claude注重邏輯推理、Gemini支援多模態、Ollama注重隱私。您可以根據創作需求選擇合適的供應商和參數組合。',
    category: 'ai',
    tags: ['AI', '設定', '風格'],
    relatedQuestions: ['ai-models', 'ai-parameters']
  },
  {
    id: 'ai-models',
    question: '支援哪些 AI 模型？',
    answer: '創世紀元支援多種AI供應商：1. Ollama（本地）：Llama、CodeLlama、Mistral等開源模型 2. OpenAI：GPT-4、GPT-3.5等 3. Google Gemini：Gemini Pro、Gemini Flash 4. Anthropic Claude：Claude-3.5-Sonnet、Claude-3等 5. OpenRouter：聚合多種模型。推薦使用llama3.2或更新版本以獲得最佳中文創作效果。您可以在設定中配置API Key並切換不同供應商。',
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
    answer: '最低需求：Windows 10+/macOS 10.14+/Linux Ubuntu 18.04+，4GB RAM，2GB 可用硬碟空間。推薦配置：8GB+ RAM，SSD 硬碟。AI功能支援多種配置：1. 僅本地Ollama：需8GB+ RAM 2. 雲端服務：需穩定網路連線和API Key 3. 混合模式：本地+雲端同時使用。雲端服務對硬體要求較低，但需要API使用費用。',
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
    answer: '在主頁面點擊「💾 資料管理」進入備份功能。點擊「立即備份」可以將完整的資料庫備份到您指定的位置。備份檔案為 SQLite 格式（.db），包含所有專案、章節、角色資料。建議定期建立備份並存儲在不同位置以確保資料安全。',
    category: 'technical',
    tags: ['備份', '資料管理'],
    relatedQuestions: ['data-restore', 'file-format']
  },
  {
    id: 'data-restore',
    question: '如何恢復備份的作品？',
    answer: '在主頁面點擊「💾 資料管理」進入還原功能。點擊「選擇備份檔案」可以選擇之前建立的 .db 備份檔案進行還原。還原完成後系統會自動重新載入以反映還原的資料。注意：還原會覆蓋當前所有資料，建議先建立當前資料的備份。',
    category: 'technical',
    tags: ['恢復', '還原', '資料管理'],
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
    answer: '資料恢復步驟：1. 使用資料管理功能檢查是否有可用的 .db 備份檔案 2. 透過「選擇備份檔案」還原最近的資料庫備份 3. 檢查是否有其他自動建立的備份檔案 4. 查看暫存檔案和系統備份 5. 聯繫技術支援協助恢復。強烈建議平時定期使用資料管理功能建立完整備份。',
    category: 'troubleshooting',
    tags: ['資料遺失', '恢復', '資料管理'],
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
  },

  // 電子書格式相關
  {
    id: 'ebook-formats',
    question: '「次元物語・零式記錄」與「絕對文書・完全具現化」有什麼差別？應該選擇哪一個？',
    answer: `**建議優先使用「次元物語・零式記錄」**

🌟 **次元物語・零式記錄（虛數空間展開・輕量化傳送陣）**：
• 檔案大小：輕巧，通常只有幾百 KB
• 兼容性：支援 Kindle、Apple Books、Google Play 圖書等
• 響應式：自動適應螢幕大小和閱讀偏好  
• 功能豐富：支援書籤、筆記、搜尋、調整字體大小
• 載入速度：快速開啟和瀏覽

⚔️ **絕對文書・完全具現化（真理銘刻・最終形態解放）**：
• 檔案大小：較大，因內嵌 7.1MB 中文字體
• 固定排版：保持精確的版面配置
• 列印友好：適合實體列印需求  
• 專業用途：正式文件、提交稿件

**使用建議**：
📱 一般閱讀選擇「次元物語・零式記錄」 - 在手機、平板、電子書閱讀器上體驗更佳
🖨️ 列印分享選擇「絕對文書・完全具現化」 - 需要固定版面格式時使用`,
    category: 'writing',
    tags: ['電子書', 'EPUB', 'PDF', '格式'],
    relatedQuestions: ['epub-generation', 'pdf-generation']
  },

  {
    id: 'epub-generation',
    question: '如何使用「次元物語・零式記錄」？',
    answer: `啟動「次元物語・零式記錄」的步驟：

1. **選擇功能**：在主頁選擇「🌟 次元物語・零式記錄」功能
2. **選擇專案**：從下拉選單中選擇要導出的專案
3. **自訂設定**：
   • 書籍標題和作者資訊
   • 封面設計選項
   • 章節排版設定
4. **啟動傳送陣**：點擊「展開虛數空間」按鈕
5. **下載檔案**：生成完成後自動開啟下載資料夾

**「次元物語・零式記錄」特色**：
• 檔案輕巧（幾百 KB）
• 適合各種電子書閱讀器
• 支援互動功能（書籤、筆記、搜尋）
• 自動適應螢幕大小`,
    category: 'writing',
    tags: ['EPUB', '生成', '電子書', '導出'],
    relatedQuestions: ['ebook-formats', 'pdf-generation']
  },

  {
    id: 'pdf-generation',
    question: '如何使用「絕對文書・完全具現化」？',
    answer: `**⚠️ 功能重構中**

「絕對文書・完全具現化」(PDF導出) 功能目前正在進行技術重構，暫時無法使用。

**替代方案**：
• 建議暫時使用「🌟 次元物語・零式記錄」(EPUB導出)
• EPUB格式在Windows、macOS、手機上都能完美顯示
• 檔案小巧，載入速度快，閱讀體驗佳

**重構進度**：
1. ✅ 第一階段：已禁用有問題的PDF功能，確保應用穩定
2. 🔄 第二階段：技術調研中 (1週內)
3. 📅 第三階段：重新實現 (2-3週內)

**恢復時間**：預計2-3週內完成重構並重新上線`,
    category: 'writing',
    tags: ['PDF', '生成', '文檔', '導出', '重構中'],
    relatedQuestions: ['ebook-formats', 'epub-generation']
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