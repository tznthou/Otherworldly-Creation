# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Genesis Chronicle** - AI-powered novel writing application built with Tauri v2, supporting 5 major AI providers for Chinese light novel creation.

- **Architecture**: Tauri v2 + Rust backend + React/TypeScript frontend
- **AI Providers**: Ollama (local), OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Database**: SQLite v11 with rusqlite
- **Editor**: Slate.js with 2-second auto-save
- **Export**: EPUB 3.0 + PDF with embedded Chinese fonts

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

### 版本管理系統 (新增！)
```bash
# 版本統一同步腳本
node scripts/sync-version.js                    # 使用 package.json 版本
RELEASE_VERSION=1.0.5 node scripts/sync-version.js  # 使用指定版本

# 發布流程測試
scripts/test-release-flow.sh                    # 完整發布流程驗證
```

### macOS 雙軌安裝支援 (已升級！)

#### DMG 格式 (推薦)
```bash
# Tauri 自動生成 DMG，用戶只需拖放安裝
cargo tauri build --target universal-apple-darwin
# 輸出：src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

#### PKG 格式 (企業級)
```bash
# 修復的 PKG 安裝程式
chmod +x ./scripts/create-pkg.sh
PKG_VERSION=1.0.5 ./scripts/create-pkg.sh <app_path> <output_pkg_path>

# 測試 PKG 安裝（現已修復安裝路徑問題）
sudo installer -pkg <pkg_file> -target /
```

### GitHub Actions 自動發布 (完全重構！)
```bash
# 觸發發布 - 單一指令完成所有平台建置
git tag v1.0.5 && git push origin v1.0.5

# 自動執行：
# 1. 版本同步到所有配置文件
# 2. macOS: 生成 DMG + PKG 雙格式
# 3. Windows: 生成 MSI 安裝程式
# 4. 自動上傳到 GitHub Release
# 5. 生成詳細發布說明
```

## Core Architecture

### Command System Flow
Frontend (`src/renderer/src/api/tauri.ts`) → Tauri IPC → Rust handlers (`src-tauri/src/commands/`)

- **Registration**: `src-tauri/src/lib.rs` `invoke_handler![]` macro
- **Modules**: `system`, `project`, `chapter`, `character`, `ai_providers`, `epub`, `pdf`
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
- **PDF**: `src-tauri/src/commands/pdf.rs` - Embedded Noto Sans TC font (7.1MB)
  ```rust
  // PDF text wrapping: Chinese = font_size * 1.0, ASCII = font_size * 0.6
  fn wrap_text(text: &str, font: &IndirectFontRef, font_size: f32, max_width: Mm)
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

## Critical Development Rules

1. **API Layer**: Always use `import { api } from './api'`
2. **Database**: Explicitly specify columns, never `SELECT *`
3. **Slate.js**: Use `key={editor-${chapterId}}` for remounting
4. **JSON**: API layer handles parsing - don't double-parse
5. **AI Context**: Pass `position` parameter for context-aware generation
6. **Model Selection**: Preserve user's choice across provider switches
7. **Token Management**: Use `generateSmartParams()` for model-specific limits
8. **Character Analysis**: Use Compromise.js for Chinese NLP
9. **PDF Fonts**: Verify Noto Sans TC integrity before compilation
10. **Naming**: Use `#[allow(non_snake_case)]` for Tauri camelCase compatibility
11. **macOS Icons**: Use `killall Dock && killall Finder` after icon updates
12. **Distribution**: Use PKG format for macOS (bypasses quarantine)
13. **Modal System**: Use `dispatch(openModal('modalName'))` for modal opening, never direct navigation
14. **Character Selection**: Preserve multi-character selection state with arrays, not single IDs
15. **Component Remounting**: Use unique keys for components that need state reset (e.g., `key={editor-${id}}`)

## GitHub Actions & CI/CD

- **release.yml**: Triggered by `v*` tags, generates DMG + PKG (Windows MSI + macOS installers)
- **release-signed.yml**: Apple Developer ID signed versions
- **test-build.yml**: Build validation without releasing

**Platform Support**: Windows (MSI) + macOS (PKG/DMG) - Linux support removed by design decision.
PKG generation automatically handles macOS quarantine attributes for seamless installation.

## Known Issues & Solutions

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
- Token limits (Updated 2025-01-14):
  - Gemini 2.5 Flash: 500 tokens (基礎值，可增加至 650)
  - Gemini 2.5 Pro: 800 tokens (基礎值，可增加至 1000)
  - Gemini 1.5 Pro: 1000 tokens
  - Claude models: 1500 tokens
  - GPT-4 models: 1200 tokens
- OpenRouter: Use format `provider/model`

### macOS Distribution
- Quarantine solved: PKG installer handles automatically
- Implementation: `scripts/create-pkg.sh`

### Performance
- Startup: 300% faster than Electron
- Memory: 70% reduction
- Bundle: 90% smaller

### Export Issues
- PDF size: Large due to embedded 7.1MB Chinese font
- Text wrapping: Handles Chinese/ASCII width differences

### Icon Cache
- macOS caches aggressively: `killall Dock && killall Finder` or restart
- Formats: PNG (multiple sizes), .icns (macOS), .ico (Windows)