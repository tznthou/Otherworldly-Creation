# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Serena MCP Integration (重要！)

**CRITICAL**: This project uses Serena MCP for enhanced development capabilities. You MUST wake up Serena MCP functionality at the start of any session:

- **Auto-Onboarding**: Always call `mcp__serena__check_onboarding_performed()` first
- **Memory System**: 120+ project memories available via `mcp__serena__list_memories()`
- **Intelligent Code Search**: Use `mcp__serena__find_symbol()`, `mcp__serena__search_for_pattern()` 
- **Architectural Overview**: Access via `mcp__serena__get_symbols_overview()`
- **Context-Aware Edits**: Use `mcp__serena__replace_symbol_body()`, `mcp__serena__insert_after_symbol()`
- **Memory Management**: Read/write project knowledge with `mcp__serena__read_memory()`, `mcp__serena__write_memory()`

**Workflow**: Check onboarding → List relevant memories → Use semantic search → Apply targeted edits

## Project Overview

**Genesis Chronicle** - AI-powered novel writing application built with Tauri v2, supporting 5 major AI providers for Chinese light novel creation.

- **Architecture**: Tauri v2 + Rust backend + React/TypeScript frontend
- **AI Providers**: Ollama (local), OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Database**: SQLite v11 with rusqlite
- **Editor**: Slate.js with 2-second auto-save
- **Export**: EPUB 3.0 + PDF via Chrome Headless

## Essential Commands

### Development
```bash
npm run dev                # Start Tauri dev environment (Desktop App)
npm run dev:renderer       # Frontend Vite dev server only (for UI development)
npm run lint               # ESLint check & auto-fix
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compile check
npx tsc --noEmit          # TypeScript type check
npm run optimize          # Optimize build resources
```

**⚠️ IMPORTANT**: This is a Tauri desktop application, NOT a web app. When running `npm run dev`, a native desktop window will open. The browser URLs (e.g., http://127.0.0.1:3000/) are for Vite dev server only and will show a blank page in browser.

### Testing & Build
```bash
npm test                   # Run all tests (Jest with jsdom)
npm test -- --testNamePattern="test name"  # Run single test by name
npm test -- src/path/to/test.test.ts       # Run specific test file
npm test -- --watch       # Run tests in watch mode

npm run build             # Full build (frontend + Tauri)
npm run build:renderer    # Frontend build only
cargo tauri build --no-bundle  # Rust build without bundling (faster)
cargo tauri build         # Full production build with bundling
npm run diagnostic        # System diagnostics
./scripts/security-check.sh  # Pre-release security check

# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml
cargo test test_name --manifest-path src-tauri/Cargo.toml
```

### AI Model Management
```bash
ollama list               # Check available Ollama models
ollama serve              # Start Ollama service (required for local AI)
ollama pull llama3.2      # Install recommended Chinese-optimized model
```

### Database Management
```bash
# Development database (src-tauri/genesis-chronicle-dev.db)
sqlite3 src-tauri/genesis-chronicle-dev.db ".tables"
sqlite3 src-tauri/genesis-chronicle-dev.db "SELECT COUNT(*) FROM projects;"

# Production database: ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db
rm ~/Library/Application\ Support/genesis-chronicle/genesis-chronicle.db  # Reset to rebuild

# Database separation: development and production use different databases
# Development: Uses local ./genesis-chronicle-dev.db
# Production: Uses ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db

# Test database operations
node scripts/test-ai-history.js
node scripts/test-ollama-service.js
```

### 🎭 模板管理系統 (重要功能！)
```bash
# 模板快速開始
設定 → 模板管理 → 匯入模板

# 四大預設模板類型
- 🏰 奇幻冒險: 經典魔法世界冒險故事
- 💕 校園戀愛劇: 現代都市青春戀愛
- ⚡ 異世界轉生: 熱門輕小說穿越題材
- 🚀 科幻冒險: 未來科技太空探險

# 模板功能特色
- 完整世界觀設定和角色框架
- 一鍵匯入，快速開始創作
- 支援自定義模板匯入和管理
- 新用戶降低創作門檻的最佳工具

# 使用流程
1. 設定頁面 → 點擊「模板管理」
2. 點擊右上角「匯入模板」按鈕
3. 選擇合適的模板類型
4. 一鍵應用到新專案或現有專案
```

### 版本管理系統 (新增！)
```bash
# 版本統一同步腳本
node scripts/sync-version.js                    # 使用 package.json 版本
RELEASE_VERSION=1.0.5 node scripts/sync-version.js  # 使用指定版本

# 發布流程測試
scripts/test-release-flow.sh                    # 完整發布流程驗證
```

### macOS 安裝支援

#### DMG 格式 (主要推薦 🌟)
```bash
# Tauri 自動生成 DMG，用戶只需拖放安裝
cargo tauri build --target universal-apple-darwin
# 輸出：src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg

# 優勢：
# - 用戶體驗最佳（直觀拖拉安裝）
# - Tauri 原生支援，更穩定
# - 不需要 sudo 權限
# - 檔案更小巧
```

#### PKG 格式 (Legacy Support)
```bash
# 修復的 PKG 安裝程式（保留給特殊需求用戶）
chmod +x ./scripts/create-pkg.sh
PKG_VERSION=1.0.5 ./scripts/create-pkg.sh <app_path> <output_pkg_path>

# 測試 PKG 安裝
sudo installer -pkg <pkg_file> -target /

# 注意：PKG 格式已標記為 legacy support
# 主要供企業環境或自動化部署使用
# 一般用戶建議使用 DMG 格式
```

### GitHub Actions 自動發布 (完全重構！)
```bash
# 觸發發布 - 單一指令完成所有平台建置
git tag v1.0.9 && git push origin v1.0.9

# 自動執行：
# 1. 版本同步到所有配置文件
# 2. macOS: 生成 DMG (主要) + PKG (legacy support) 雙格式
# 3. Windows: 生成 MSI 安裝程式
# 4. 自動上傳到 GitHub Release，DMG 標示為推薦格式
# 5. 生成詳細發布說明

# ⚠️ CRITICAL: Tauri 配置檢查
# 確保 src-tauri/tauri.conf.json 包含所有目標平台：
# "targets": ["dmg", "app", "msi"]
# 缺少 "msi" 會導致 Windows 建置沒有產生安裝檔案
```

## Core Architecture

### Command System Flow
Frontend (`src/renderer/src/api/tauri.ts`) → Tauri IPC → Rust handlers (`src-tauri/src/commands/`)

- **Registration**: `src-tauri/src/lib.rs` `invoke_handler![]` macro
- **Modules**: `system`, `project`, `chapter`, `character`, `ai_providers`, `epub`, `pdf_chrome`
- **Frontend Access**: Always use `import { api } from './api'` - never direct `invoke()`

### AI Provider Architecture
- **Trait**: `src-tauri/src/services/ai_providers/trait.rs` - `AIProvider` trait
- **Implementations**: `ollama.rs`, `openai.rs`, `gemini.rs`, `claude.rs`, `openrouter.rs`
- **Response Formats**:
  ```rust
  ResponseFormat::ThinkingField    // Ollama gpt-oss models
  ResponseFormat::ContentArray     // Claude models  
  ResponseFormat::CandidatesArray  // Gemini models
  ResponseFormat::Standard         // OpenAI/OpenRouter
  ```

### Database Operations
- **Development**: `src-tauri/genesis-chronicle-dev.db`
- **Production**: `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`
- **Version**: v11 with migration system
- **Tables**: 
  - Core: `projects`, `chapters`, `characters`, `ai_providers`
  - Analysis: `character_analysis`, `plot_analysis`, `creative_suggestions`
  - Export: `epub_exports`, `pdf_exports`
- **Rules**: 
  - Never use `SELECT *` - specify columns explicitly
  - Use `conn.pragma_update()` for version updates
  - Database separation in `src-tauri/src/database/connection.rs`

### NLP & Character Analysis
- **Service**: `src/renderer/src/services/characterAnalysisService.ts`
- **UI**: `src/renderer/src/components/AI/CharacterAnalysisPanel.tsx` (715 lines, 6 complete tabs)
- **Charts**: `PersonalityRadarChart.tsx`, `EmotionTrendChart.tsx`, `ConsistencyScoreChart.tsx` (Recharts 3.1.2)
- **NLP**: `src/renderer/src/utils/nlpUtils.ts` with Compromise.js
- **Features**: Chinese dialogue extraction, Big Five personality analysis, consistency detection, intelligent suggestions

### AI Illustration System
- **Main Panel**: `src/renderer/src/components/AI/BatchIllustrationPanel.tsx` - Batch illustration generation
- **Character Integration**: `src/renderer/src/components/AI/CharacterCard.tsx` - Visual character selection
- **Modal System**: `src/renderer/src/components/Modals/AiIllustrationModal.tsx` - Modal wrapper
- **Access**: Dashboard → "幻想具現" card OR Sidebar → "AI 插畫" (both open modal)
- **Features**: Multi-character selection, intelligent scene suggestions, batch portrait generation

### Export System
- **EPUB**: `src-tauri/src/commands/epub.rs` - Slate.js to XHTML, ZIP structure
- **PDF**: `src-tauri/src/commands/pdf_chrome.rs` - Chrome Headless HTML-to-PDF generation
  ```rust
  // Chrome Headless generates PDF from HTML with native font rendering
  // Supports AI illustration embedding and professional typography
  pub async fn generate_pdf_chrome(project_id: String, options: Option<PdfOptionsChrome>)
  ```

### Redux/TypeScript Patterns
```typescript
// Type-safe dispatch
const dispatch = useDispatch<AppDispatch>();

// Slate.js force remount
<SlateEditor key={`editor-${currentChapter.id}`} />

// API layer handles JSON parsing
const chapters = await api.chapters.getByProjectId(projectId);
return chapters; // Already parsed

// Modal system
dispatch(openModal('aiIllustration')); // Open AI illustration modal
dispatch(closeModal('aiIllustration')); // Close modal

// Character selection state
const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
const toggleCharacterSelection = (characterId: string) => {
  setSelectedCharacterIds(prev => 
    prev.includes(characterId) 
      ? prev.filter(id => id !== characterId)
      : [...prev, characterId]
  );
};
```

## 程式碼統計標準 (2025-08-23 修正)

**標準統計命令**:
```bash
# 正確的統計方式（排除依賴包和生成文件）
cloc . --exclude-dir=node_modules,target,.git --include-lang=TypeScript,Rust,JavaScript

# 當前標準結果 (2025-08-23)：
# TypeScript: 67,142行 (293個檔案) - 73.8%
# Rust: 19,333行 (58個檔案) - 21.2%  
# JavaScript: 4,521行 (41個檔案) - 5.0%
# 總計: 90,996行核心程式碼
```

**統計原則**:
- ✅ 只計算手寫核心代碼（TypeScript, Rust, JavaScript）
- ❌ 排除依賴包（node_modules目錄）
- ❌ 排除編譯產物（target目錄）
- ❌ 排除版本控制（.git目錄）
- 📊 使用cloc專業工具，不使用wc或find命令

**防止錯誤更新**:
- README.md更新時必須使用上述標準命令驗證
- 定期（每月）重新統計並同步文檔
- 所有手動輸入的數字都要用cloc驗證

## Critical Development Rules

1. **API Layer**: Always use `import { api } from './api'`
2. **Database**: Explicitly specify columns, never `SELECT *`
3. **Slate.js**: Use `key={editor-${chapterId}}` for remounting
4. **JSON**: API layer handles parsing - don't double-parse
5. **AI Context**: Pass `position` parameter for context-aware generation
6. **Model Selection**: Preserve user's choice across provider switches
7. **Token Management**: Use `generateSmartParams()` for model-specific limits
8. **Character Analysis**: Use Compromise.js for Chinese NLP
9. **PDF Generation**: Chrome Headless uses system fonts - no embedding required
10. **Naming**: Use `#[allow(non_snake_case)]` for Tauri camelCase compatibility
11. **macOS Icons**: Use `killall Dock && killall Finder` after icon updates
12. **Distribution**: DMG format preferred for macOS (best UX), PKG as legacy support
13. **Modal System**: Use `dispatch(openModal('modalName'))` for modal opening, never direct navigation
14. **Character Selection**: Preserve multi-character selection state with arrays, not single IDs
15. **Component Remounting**: Use unique keys for components that need state reset (e.g., `key={editor-${id}}`)
16. **TypeScript Safety**: Use APIResponse<T> wrapper for all Tauri API responses, maintain 100% type safety in API layer
17. **Progress Tracking**: Essential for UX - never remove progress indicators, especially for multi-version generation with partial failures
18. **跨平台建置**: 確保 `src-tauri/tauri.conf.json` 的 `bundle.targets` 包含所有目標平台，避免安裝包缺失
19. **版本發布檢查**: 每次發布前驗證 Tauri 配置，防止平台特定建置失敗

## GitHub Actions & CI/CD

- **release.yml**: Triggered by `v*` tags, generates DMG + PKG (Windows MSI + macOS installers)
- **release-signed.yml**: Apple Developer ID signed versions
- **test-build.yml**: Build validation without releasing

**Platform Support**: Windows (MSI) + macOS (DMG/PKG) - Linux support removed by design decision.
DMG format is now the primary macOS distribution method, providing the best user experience with drag-and-drop installation. PKG remains available as legacy support for enterprise environments.

## Known Issues & Solutions

### GitHub Actions 疑難排解
- **Windows MSI 未生成**: 檢查 `src-tauri/tauri.conf.json` 的 `bundle.targets` 必須包含 `"msi"`
- **跨平台建置失敗**: 確認版本同步腳本正常執行，所有配置檔案版本號一致
- **建置診斷順序**: 配置檢查 → 腳本分析 → 環境變數確認 → GitHub Actions 設定
- **常見誤判**: 不是 .gitignore 或環境變數問題，通常是 Tauri 配置缺失

### UI Interaction
- Button not clickable: Check `z-50` overlay blocking
- Menu component: Don't add onClick to trigger button
- Long model names: Auto-truncate after 30 chars
- Modal overlap: Use `ml-64` margin to account for sidebar (320px width)
- Navigation 404: Use modal system instead of routes for feature panels
- Character cards: Use visual selection with `ring-2 ring-gold-500` for selected state

### AI Generation
- Ollama: Ensure service at `http://127.0.0.1:11434`
- Empty responses: Check model-specific response format
- Gemini `parts=None`: Falls back to `content.text` field
- Token limits (Updated 2025-01-15):
  - Gemini 2.5 Flash: 500 tokens (基礎值，可增加至 650)
  - Gemini 2.5 Pro: 800 tokens (基礎值，可增加至 1000)
  - Gemini 1.5 Pro: 1000 tokens
  - Claude models: 1500 tokens
  - GPT-4 models: 1200 tokens
- OpenRouter: Use format `provider/model`
- AI Parameter System: Comprehensive parameter explanation system with quick presets (保守/平衡/創意), real-time risk assessment (安全/注意/危險), and context-aware guidance for Chinese novel writing

### macOS Distribution
- **DMG (推薦)**: Tauri 原生支援，最佳用戶體驗
- **PKG (Legacy)**: 企業環境使用，`scripts/create-pkg.sh` 實現

### Performance
- Startup: 300% faster than Electron
- Memory: 70% reduction
- Bundle: 90% smaller

### Export Issues
- PDF generation: Chrome Headless required - auto-detects Chrome installation paths
- Chinese text: System fonts provide native Chinese rendering support

### Icon Cache
- macOS caches aggressively: `killall Dock && killall Finder` or restart
- Formats: PNG (multiple sizes), .icns (macOS), .ico (Windows)

### 模板系統
- **模板類型**: 奇幻冒險、校園戀愛劇、異世界轉生、科幻冒險
- **組件**: TemplateManager.tsx (主介面), TemplateImportWizard.tsx (匯入精靈)
- **位置**: 設定 → 模板管理 → 匯入模板 (右上角按鈕)
- **內容**: 每個模板包含完整的世界觀設定、角色框架、劇情大綱
- **新用戶友善**: 降低創作門檻，提供結構化創作起點

### AI 參數說明系統 (2025-01-15 新增)
- **組件**: ParameterHelp.tsx, QuickPresets.tsx, ParameterRiskIndicator.tsx
- **預設模式**: 保守穩重 🎯, 平衡創作 ⚖️, 創意奔放 🌟
- **風險評估**: 三級系統 (安全/注意/危險) 基於 OpenAI 官方文檔
- **位置**: AI 續寫面板 → 高級設置
- **特色**: 實時參數說明、預防性警告、針對中文小說創作優化