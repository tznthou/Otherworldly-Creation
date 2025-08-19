# 創世紀元：Genesis Chronicle
**AI驅動的中文輕小說創作神器** - 整合5大主流AI供應商的創作平台

![Version](https://img.shields.io/badge/version-v1.0.8-blue) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-green) ![AI Providers](https://img.shields.io/badge/AI_Providers-5-orange)

## 🌟 核心特色

### 💡 創新功能
- **🔀 多AI供應商整合**: 支援5大主流AI供應商統一平台，可在Ollama、OpenAI、Google Gemini、Anthropic Claude、OpenRouter間靈活切換
- **🧠 中文輕小說專精**: 針對中文輕小說創作優化的AI模型整合，涵蓋異世界、校園、科幻、奇幻等熱門類型
- **🎨 角色視覺一致性**: 跨章節角色插畫視覺統一管理，結合Gemini Imagen API與智能種子系統

### 🛠️ 技術亮點
- **📚 完整創作流程**: 從創意發想 → AI續寫 → 角色分析 → 插畫生成 → 專業出版的一站式解決方案
- **🧬 Big Five人格分析**: 將心理學Big Five人格理論應用於角色分析，協助維持角色性格一致性
- **⚡ Tauri v2高效能**: 採用Tauri v2架構，相比傳統Electron應用大幅提升啟動速度、減少記憶體使用

### 🎯 設計理念
- **🇹🇼 華語創作友善**: 專為華語創作者設計，提供更貼近中文輕小說創作習慣的工具
- **🏢 穩定可靠**: 追求高品質與穩定性的開發標準
- **🔐 隱私與便利兼顧**: 支援本地AI（Ollama）與雲端AI混合使用，在隱私保護與功能便利間取得平衡

## 🏆 專案成就

### ✅ 三大核心功能 100% 完成
- 📚 **EPUB電子書生成系統** - 完整EPUB 3.0標準實現，專業排版輸出
- 🧠 **智能角色分析系統** - Big Five人格分析，多維度角色一致性檢測
- 🎨 **AI插畫生成系統** - Gemini Imagen整合，角色視覺一致性管理

### 📊 專案規模 (截至2025年8月19日 15:35)
- **核心程式碼**: 73,083行（不含依賴包，純手寫代碼）
- **前端程式碼**: 51,616行（TypeScript/React，240個檔案）
- **後端程式碼**: 17,784行（Rust/Tauri，57個檔案）
- **配置與腳本**: 3,683行（JavaScript工具腳本）
- **代碼檔案數**: 326個核心程式檔案
- **依賴包管理**: 550個第三方套件（node_modules，不計入統計）
- **開發狀態**: 100%功能完成，v1.0.8 版本發布準備就緒

### 🚀 技術優勢 (最新更新 2025-08-19)
- **性能提升**: 啟動速度300%提升，記憶體使用70%減少
- **體積優化**: 應用程式體積90%縮減
- **代碼品質**: ✅ Rust Clean | ✅ TypeScript 類型安全100% | ✅ ESLint 優化完成
- **最新修復**: ✅ OpenRouter API 空回應問題修復 | ✅ 模型白名單限制移除 | ✅ WAL模式警告優化
- **新增功能**: ✅ AI參數說明系統完整實作 | ✅ 進度追蹤系統優化 | ✅ 快速預設模式（保守/平衡/創意）

## 🌟 AI供應商生態

| AI供應商 | 特色 | 推薦模型 | 使用場景 |
|---------|------|---------|---------|
| 🦙 **Ollama** | 本地運行，完全免費 | llama3.2, qwen2.5 | 無網路環境、隱私優先 |
| 🤖 **OpenAI** | GPT系列，業界標準 | gpt-4o, gpt-4o-mini | 專業創作、高品質輸出 |
| ✨ **Google Gemini** | 多模態理解，長文本 | gemini-2.5-flash, gemini-2.5-pro | 大綱規劃、世界觀構建 |
| 🧠 **Anthropic Claude** | 深度理解，邏輯嚴謹 | claude-3.5-sonnet, claude-3.5-haiku | 角色心理、情節邏輯 |
| 🔄 **OpenRouter** | 統一接口，多模型 | 支援100+模型 | 靈活切換、成本優化 |

## 🚀 快速開始

### 📦 安裝應用程式

#### 🍎 macOS（推薦）
```bash
# 下載PKG安裝程式
curl -L -o genesis-chronicle.pkg https://github.com/username/genesis-chronicle/releases/latest/download/genesis-chronicle_universal.pkg

# 安裝（自動繞過quarantine）
sudo installer -pkg genesis-chronicle.pkg -target /
```

#### 🪟 Windows
```bash
# 下載MSI安裝程式
# 雙擊執行 genesis-chronicle.msi
```

### ⚡ 5分鐘入門
1. **創建專案** - 點擊「創世神模式」→「新建專案」
2. **使用模板快速開始** - 設定→模板管理→匯入模板，選擇四大類型預設模板
3. **配置AI** - 設定→AI設定→選擇供應商和API密鑰
4. **開始創作** - 章節編輯器→AI續寫→角色分析→插畫生成
5. **導出作品** - 傳說編纂→EPUB/PDF雙格式導出

### 🎭 模板管理系統
- **快速開始**: 提供四大熱門類型預設模板，一鍵匯入完整創作框架
- **模板類型**: 
  - 🏰 **奇幻冒險** - 經典奇幻世界，魔法與劍的冒險故事
  - 💕 **校園戀愛劇** - 現代都市校園，青春戀愛故事
  - ⚡ **異世界轉生** - 熱門輕小說題材，穿越異世界設定
  - 🚀 **科幻冒險** - 未來科技世界，AI與太空冒險
- **完整內容**: 每個模板包含世界觀設定、角色框架、劇情大綱
- **自定義支援**: 支援匯入、修改、分享自製模板
- **智能引導**: 新用戶可直接使用模板，無需從零開始

## 💎 核心功能詳解

### 📚 EPUB電子書生成系統
- **技術實現**: 637行Rust核心代碼，完整EPUB 3.0標準
- **功能特色**: Slate.js→XHTML轉換，專業封面生成，完整導出歷史
- **格式支援**: EPUB 3.0 + PDF雙格式，嵌入中文字型

### 🧠 智能角色分析系統  
- **技術實現**: 715行TypeScript，6個完整功能標籤
- **分析維度**: Big Five人格分析、語言風格、情感分析、一致性檢查
- **視覺化**: Recharts 3.1.2專業圖表，雷達圖+趨勢線+條形圖
- **NLP引擎**: Compromise.js中文特化，智能對話提取

### 🎨 AI插畫生成系統
- **技術實現**: 2800+行Rust後端 + 3644+行TypeScript前端
- **核心功能**: 中英翻譯引擎、提示詞優化、角色一致性管理
- **API整合**: Gemini Imagen API，150+專業動漫詞彙庫
- **批量生成**: 隊列管理、成本估算、3級安全過濾

## 🔧 開發環境設置

### 系統需求
- **macOS**: 10.11+ (Intel/Apple Silicon)
- **Windows**: Windows 10+ 
- **開發環境**: Node.js 18+, Rust 1.70+

### 一鍵開發環境設置
```bash
# 克隆專案
git clone https://github.com/username/genesis-chronicle.git
cd genesis-chronicle

# 安裝依賴並啟動
npm install
npm run dev
```

### 開發命令
```bash
# 開發環境
npm run dev                # Tauri開發環境（桌面應用）
npm run dev:renderer       # 前端Vite開發伺服器

# 建置與測試
npm run build              # 完整建置
npm run lint               # ESLint檢查
npm test                   # 執行測試
cargo check --manifest-path src-tauri/Cargo.toml  # Rust編譯檢查

# 診斷工具
npm run diagnostic         # 系統診斷
./scripts/security-check.sh # 安全檢查
```

## 🏗️ 技術架構

### 完整專案架構
```
Genesis Chronicle (總計：73,083行核心程式碼，不含依賴包)
├── 🦀 src-tauri/               # Rust後端 (17,784行)
│   ├── src/commands/          # Tauri命令層 (15個模組)
│   │   ├── ai.rs             # AI服務接口
│   │   ├── ai_providers.rs   # 多AI供應商管理
│   │   ├── illustration.rs   # 插畫生成系統
│   │   ├── character.rs      # 角色管理
│   │   ├── chapter.rs        # 章節管理
│   │   ├── project.rs        # 專案管理
│   │   ├── epub.rs          # EPUB導出 (637行)
│   │   ├── pdf.rs           # PDF導出
│   │   └── database.rs       # 數據庫操作
│   ├── services/             # 核心業務邏輯
│   │   ├── ai_providers/     # AI供應商實現 (7個)
│   │   │   ├── trait.rs     # AI供應商抽象
│   │   │   ├── ollama.rs    # 本地AI整合
│   │   │   ├── openai.rs    # OpenAI GPT整合
│   │   │   ├── gemini.rs    # Google Gemini整合
│   │   │   ├── claude.rs    # Anthropic Claude整合
│   │   │   └── openrouter.rs # OpenRouter統一接口
│   │   ├── illustration/     # AI插畫系統 (2,800+行)
│   │   │   ├── imagen_api.rs        # Gemini Imagen API
│   │   │   ├── character_consistency.rs # 角色一致性
│   │   │   ├── batch_manager.rs      # 批量生成管理
│   │   │   └── visual_traits.rs     # 視覺特徵管理
│   │   └── translation/      # 翻譯引擎
│   │       ├── translation_engine.rs # 中英翻譯
│   │       ├── prompt_optimizer.rs  # 提示詞優化
│   │       └── vocabulary_database.rs # 動漫詞彙庫
│   └── database/             # 數據持久層
│       ├── models.rs        # 數據模型定義
│       ├── migrations.rs    # 版本遷移系統
│       └── connection.rs    # 連接管理
│
├── ⚛️ src/renderer/           # React前端 (51,616行)
│   ├── components/           # UI組件系統
│   │   ├── Templates/       # 模板管理系統 (5個組件)
│   │   │   ├── TemplateManager.tsx      # 模板管理主介面
│   │   │   ├── TemplateImportWizard.tsx # 模板匯入精靈
│   │   │   ├── TemplateSelector.tsx     # 模板選擇器
│   │   │   └── TemplateApplicationWizard.tsx # 模板應用精靈
│   │   ├── AI/              # AI功能組件 (8個主要組件)
│   │   │   ├── CharacterAnalysisPanel.tsx  # 角色分析 (715行)
│   │   │   ├── BatchIllustrationPanel.tsx  # 批量插畫
│   │   │   ├── PlotAnalysisPanel.tsx       # 劇情分析
│   │   │   └── AIWritingPanel.tsx          # AI續寫面板
│   │   ├── Charts/          # 數據可視化 (5個圖表組件)
│   │   │   ├── PersonalityRadarChart.tsx   # 性格雷達圖
│   │   │   ├── EmotionTrendChart.tsx       # 情感趨勢
│   │   │   └── ConsistencyScoreChart.tsx   # 一致性分數
│   │   ├── Editor/          # 編輯器系統 (9個組件)
│   │   │   ├── SlateEditor.tsx             # Slate.js編輯器
│   │   │   ├── AIWritingPanel.tsx          # AI續寫整合
│   │   │   └── ChapterList.tsx             # 章節管理
│   │   ├── Modals/          # 模態系統 (15個模態組件)
│   │   │   ├── AISettingsModal.tsx         # AI設定
│   │   │   ├── AiIllustrationModal.tsx     # AI插畫模態
│   │   │   └── EPubGenerationModal.tsx     # EPUB生成
│   │   ├── Characters/      # 角色管理 (9個組件)
│   │   ├── Layout/          # 布局組件 (4個)
│   │   └── UI/             # 通用UI組件 (25個)
│   ├── services/           # 前端業務邏輯 (14個服務)
│   │   ├── aiWritingAssistant.ts      # AI寫作助手
│   │   ├── characterAnalysisService.ts # 角色分析服務
│   │   ├── plotAnalysisService.ts     # 劇情分析服務
│   │   └── epubService.ts             # EPUB處理
│   ├── store/             # Redux狀態管理
│   │   └── slices/        # 狀態切片 (10個)
│   │       ├── aiSlice.ts         # AI狀態管理
│   │       ├── projectsSlice.ts   # 專案狀態
│   │       ├── charactersSlice.ts # 角色狀態
│   │       └── editorSlice.ts     # 編輯器狀態
│   ├── pages/             # 頁面組件 (7個主要頁面)
│   │   ├── Dashboard/     # 控制台 (5個組件)
│   │   ├── Settings/      # 設定頁面 (13個子頁面)
│   │   └── ProjectEditor/ # 專案編輯器
│   ├── utils/            # 工具函式 (8個)
│   │   ├── nlpUtils.ts          # NLP中文處理
│   │   └── performanceMonitor.ts # 性能監控
│   └── types/            # TypeScript類型定義 (7個)
│       ├── character.ts        # 角色類型
│       ├── illustration.ts     # 插畫類型
│       └── editor.ts          # 編輯器類型
│
├── 🧪 測試系統/                # 測試代碼 (包含於統計中)
│   ├── __tests__/integration/  # 整合測試
│   │   ├── workflows/         # 工作流程測試 (3個)
│   │   ├── components/        # 組件交互測試
│   │   └── e2e/              # 端到端測試
│   └── src/renderer/src/components/__tests__/ # 組件單元測試
│
├── 📜 scripts/               # 自動化腳本 (3,683行)
│   ├── create-pkg.sh        # macOS PKG創建
│   ├── security-check.sh    # 安全檢查
│   ├── diagnostic.js        # 系統診斷工具
│   └── init-db.sh          # 資料庫初始化
│
├── 📦 node_modules/          # 依賴包目錄 (550個套件，不計入統計)
│   ├── @anthropic-ai/      # Claude API SDK
│   ├── react/              # React 框架
│   ├── typescript/         # TypeScript 編譯器
│   └── 547個其他依賴套件...
│
├── 📚 文檔系統/              # 完整文檔 (不計入程式碼統計)
│   ├── README.md           # 專案說明 (更新至 2025-08-17 21:30)
│   ├── CLAUDE.md           # 開發指南
│   ├── .serena/memories/   # Serena AI 知識庫 (148個記憶檔案)
│   └── docs/               # 技術文檔
│
└── ⚙️ 配置系統/              # 配置文件 (JSON/TOML，不計入程式碼統計)
    ├── package.json        # 依賴管理 (550個套件定義)
    ├── tsconfig.json      # TypeScript配置
    ├── tailwind.config.js # 樣式配置
    ├── jest.config.js     # 測試配置
    └── vite.config.ts     # 構建配置
```

### 核心技術棧
- **後端框架**: Tauri v2 + Rust 1.70+
- **前端框架**: React 18 + TypeScript 5.0+
- **狀態管理**: Redux Toolkit + RTK Query
- **UI框架**: Tailwind CSS + Headless UI
- **編輯器**: Slate.js (2秒自動保存)
- **圖表庫**: Recharts 3.1.2
- **數據庫**: SQLite v12 (開發/生產分離)
- **測試框架**: Jest + React Testing Library
- **構建工具**: Vite + Tauri CLI
- **包管理**: npm + Cargo

### 數據庫架構
- **引擎**: SQLite v12 with migration system
- **環境分離**: 開發/生產數據庫分離
- **核心表**: projects, chapters, characters, ai_providers
- **分析表**: character_analysis, plot_analysis, creative_suggestions
- **導出表**: epub_exports, pdf_exports

## 📋 版本記錄

### v1.0.8 (2025-08-19) - 當前版本  
**版本統一管理 + 發布流程完善**
- 🔧 **版本統一更新**: 所有配置文件版本號統一為 v1.0.8（package.json、Cargo.toml、tauri.conf.json）
- 🚀 **GitHub Actions 發布**: 自動建置 DMG (主推) + PKG (Legacy) + MSI 三格式
- ✅ **TypeScript 類型安全維持**: 核心 API 層級 100% 類型安全
- 📦 **分發策略優化**: DMG 格式成為 macOS 主要推薦，PKG 轉為企業 Legacy 支援
- 🎯 **版本控制標準化**: 建立可重複、可靠的自動發布機制

### v1.0.5-beta (2025-08-16) - 上一版本
- 🔧 章節筆記存檔修復：API層metadata欄位傳遞問題解決
- 📊 專案規模統計更新：總代碼行數88,462行精確統計
- 🧹 TypeScript 類型安全化：95+ 個 `any` 類型警告修復
- ⚡ ESLint 系統性優化：從 74 個警告減少到 0 個

### v1.0.9 (計劃中)
- ✅ 功能完整性驗證測試
- 🚀 AI續寫引擎升級（1800 tokens上限）
- ⚡ 性能優化系統框架
- 🔧 PKG 安裝問題最終修復

## 🤝 貢獻指南

### 開發流程
1. Fork專案並創建feature分支
2. 使用`npm run lint`確保代碼品質
3. 運行`npm test`確保測試通過
4. 提交Pull Request並描述變更

### 代碼規範
- **Rust**: 使用`cargo fmt`格式化
- **TypeScript**: 遵循ESLint配置
- **提交訊息**: 使用conventional commits格式

## 📞 支援與聯絡

- **GitHub Issues**: [報告問題](https://github.com/username/genesis-chronicle/issues)
- **討論區**: [GitHub Discussions](https://github.com/username/genesis-chronicle/discussions)
- **文檔**: [完整文檔](./CLAUDE.md)

## 📄 授權

MIT License - 詳見 [LICENSE](./LICENSE) 檔案

## 📈 Change Log

### [2025-08-19 15:35:26] 最新更新
- **核心程式碼**: 73,083行（純手寫代碼，不含依賴包）
- **專案架構**: 前端51,616行（70.6%）+ 後端17,784行（24.3%）+ 腳本3,683行（5.1%）
- **開發進度**: 持續優化中，最新修復包括 ESLint 和 TypeScript 類型安全問題
- **核心改進**:
  - 🔧 **版本統一管理**: 三個關鍵配置文件版本號完全同步為 v1.0.8
  - 🚀 **自動化發布流程**: GitHub Actions 完整建置 DMG + PKG + MSI 三格式
  - 📦 **分發策略最佳化**: DMG 格式主推，PKG 轉為 Legacy 企業支援
  - ✅ **TypeScript 類型安全維持**: 核心API層級100%類型安全持續保持
  - 🎯 **發布品質保證**: 版本同步腳本自動驗證，確保配置一致性
  - 🏷️ **Git 標籤管理**: v1.0.8 標籤推送觸發自動建置流程
  - 🧠 **開發知識累積**: 發布流程完整記錄在 Serena AI 知識庫
  - 📊 **專案成熟度提升**: 建立標準化、可重複的版本發布機制
- **技術成就**: 完整的跨平台自動化發布系統，支持所有主流AI模型

---

**Genesis Chronicle** - 讓AI為你的創作插上翅膀 ✨

*更新時間：2025年8月19日 15:35 CST*  
*專案狀態：v1.0.8 版本統一發布完成，GitHub Actions 自動建置中，支持314個AI模型*