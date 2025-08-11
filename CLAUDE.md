# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Genesis Chronicle** - AI-powered novel writing application built with Tauri v2.7.0, supporting 5 major AI providers for Chinese light novel creation.

- **Architecture**: Tauri v2.7.0 + Rust backend + React/TypeScript frontend
- **AI Providers**: Ollama (local), OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Database**: SQLite v11 with rusqlite (includes character analysis tables)
- **Editor**: Slate.js with 2-second auto-save
- **Export Formats**: EPUB 3.0 + PDF with embedded Chinese fonts

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

**⚠️ IMPORTANT**: This is a Tauri desktop application, NOT a web app. When running `npm run dev`, a native desktop window will open. The URLs shown in terminal (e.g., http://127.0.0.1:3000/) are for Vite dev server only and CANNOT be used to test the full application in a browser. The browser will only show a blank page because Tauri APIs are not available in browser context.

### Testing & Build
```bash
npm test                   # Run all tests (Jest with jsdom)
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:performance   # Run performance tests only
npm test -- --testNamePattern="test name"  # Run single test by name
npm test -- src/path/to/test.test.ts       # Run specific test file
npm test -- --watch       # Run tests in watch mode

npm run build             # Full build (frontend + Tauri)
npm run build:renderer     # Frontend build only
cargo tauri build --no-bundle  # Rust build without bundling (faster)
cargo tauri build         # Full production build with bundling
npm run diagnostic        # System diagnostics
./scripts/security-check.sh  # Pre-release security check

# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml  # Run Rust tests
cargo test test_name --manifest-path src-tauri/Cargo.toml  # Run specific Rust test
```

### AI Model Management
```bash
ollama list               # Check available Ollama models
ollama serve              # Start Ollama service (required for local AI)
ollama pull llama3.2      # Install recommended Chinese-optimized model
```

### Database Management
```bash
# Development database (used by cargo tauri dev)
sqlite3 src-tauri/genesis-chronicle-dev.db ".tables"  # Check tables
sqlite3 src-tauri/genesis-chronicle-dev.db "SELECT COUNT(*) FROM projects;"  # Check data

# Production database (used by installed app)
# Location: ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db
rm ~/Library/Application\ Support/genesis-chronicle/genesis-chronicle.db  # Reset to rebuild with latest schema

# Database environment separation (as of 2025-08-10)
# Development: ./src-tauri/genesis-chronicle-dev.db
# Production: ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db
# Note: Development and production databases are now separated to prevent data mixing

# Test specific database operations
node scripts/test-ai-history.js        # Test AI interaction history
node scripts/test-ollama-service.js    # Test Ollama AI service
```

### macOS PKG Installer (NEW)
```bash
# Generate PKG installer for macOS (bypasses quarantine issues)
chmod +x ./scripts/create-pkg.sh
./scripts/create-pkg.sh <app_path> <output_pkg_path>

# Test PKG installation
sudo installer -pkg <pkg_file> -target /

# GitHub Actions automatically generates PKG on release tag push
git tag -a v1.0.x -m "Release message" && git push origin v1.0.x
```

## Core Architecture

### Command System Flow
Frontend (`src/renderer/src/api/tauri.ts`) → Tauri IPC → Rust handlers (`src-tauri/src/commands/`)

- **Registration**: `src-tauri/src/lib.rs` `invoke_handler![]` macro
- **Organization**: Modules by feature - `system`, `project`, `chapter`, `character`, `ai_providers`, `epub`, `pdf`
- **Frontend Access**: Always use `import { api } from './api'` - never direct `invoke()`

### AI Provider Architecture
Unified trait system for multiple providers:

- **Trait Definition**: `src-tauri/src/services/ai_providers/trait.rs`
  - `AIProvider` trait with `generate_text()` and `get_models()` methods
  - `detect_model_characteristics()` for model-specific response handling
  - Response format detection for special models (thinking field, content array, candidates array)
- **Provider Implementations**: `ollama.rs`, `openai.rs`, `gemini.rs`, `claude.rs`, `openrouter.rs`
- **Database**: `ai_providers` table stores configurations
- **Frontend**: `api.aiProviders.*` for unified access

### Special Response Handling (2025-08-10)
```rust
// Model-specific response formats
ResponseFormat::ThinkingField    // Ollama gpt-oss models
ResponseFormat::ContentArray     // Claude models  
ResponseFormat::CandidatesArray  // Gemini models
ResponseFormat::Standard         // OpenAI/OpenRouter

// Gemini parts=None handling
if let Some(text) = &candidate.content.text {
    // Fallback to direct text field when parts is None
}
```

### Database Operations
- **Development Location**: `src-tauri/genesis-chronicle-dev.db` (as of 2025-08-10)
- **Production Location**: `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`
- **Version**: v11 with migration system (includes character analysis tables)
- **Environment Detection**: Based on executable path - `/Applications/` = production, others = development
- **Rules**: 
  - Never use `SELECT *` - specify columns explicitly
  - Use `conn.pragma_update()` for version updates
  - Delete DB file to rebuild with latest schema
- **Analysis Tables**: `character_analysis`, `plot_analysis`, `creative_suggestions`, `analysis_cache`, `analysis_queue`, `analysis_templates`
- **Export Tables**: `epub_exports`, `pdf_exports` for tracking generation history
- **Important**: Database separation implemented in `src-tauri/src/database/connection.rs` to prevent dev/prod data mixing

### NLP & Character Analysis System
- **Core Service**: `src/renderer/src/services/characterAnalysisService.ts` (600+ lines)
- **UI Component**: `src/renderer/src/components/AI/CharacterAnalysisPanel.tsx` (715 lines, 100% complete)
- **Chart Components** (using Recharts v3.1.2):
  - `PersonalityRadarChart.tsx`: Big Five personality traits radar visualization
  - `EmotionTrendChart.tsx`: Emotion distribution pie chart + trend lines
  - `ConsistencyScoreChart.tsx`: Multi-dimensional consistency bar charts
- **NLP Utils**: `src/renderer/src/utils/nlpUtils.ts` with Compromise.js integration
- **Features**:
  - Chinese dialogue extraction (5 punctuation patterns)
  - Big Five personality analysis with confidence scoring
  - Cross-chapter consistency detection
  - Speaker attribution with context inference
- **Smart AI Parameters**: `src/renderer/src/services/aiWritingAssistant.ts` with model-specific token limits

### Export System Architecture  
Dual-format export system for professional publishing:

- **EPUB 3.0 Generation**: `src-tauri/src/commands/epub.rs`
  - Slate.js to XHTML conversion with recursive node processing
  - Professional CSS styling and responsive layout
  - Complete ZIP structure with META-INF and OEBPS
  - Export history tracking in `epub_exports` table
  - 中二風格命名: "次元物語・零式記錄" (虛數空間展開)
  
- **PDF Generation**: `src-tauri/src/commands/pdf.rs`
  - Embedded 7.1MB Noto Sans TC font for cross-platform Chinese support
  - Smart text wrapping with character-width calculation
  - Automatic pagination and chapter breaking
  - Uses printpdf crate with custom text layout algorithms
  - 中二風格命名: "絕對文書・完全具現化" (真理銘刻)

```rust
// PDF Chinese text wrapping algorithm  
fn wrap_text(text: &str, font: &IndirectFontRef, font_size: f32, max_width: Mm) -> Vec<String> {
    // Character width estimation: Chinese = font_size * 1.0, ASCII = font_size * 0.6
    // Converts Mm to points (1 mm = 2.834645669 points) for accurate measurement
}
```

### macOS Distribution System (NEW - 2025-08-10)
Automated PKG installer generation to bypass macOS quarantine restrictions:

- **PKG Script**: `scripts/create-pkg.sh`
  - Uses `pkgbuild` with temporary staging directory
  - Installs directly to `/Applications` without quarantine issues
  - Supports universal binary (Intel + Apple Silicon)
  
- **GitHub Actions**: `.github/workflows/release.yml`
  - Automatically generates both DMG and PKG on tag push
  - Uses `tauri-apps/tauri-action@v0` for consistent builds
  - Uploads to GitHub Releases with detailed installation instructions

```bash
# PKG generation process
TEMP_ROOT=$(mktemp -d)
cp -R "$APP_PATH" "$TEMP_ROOT/"
pkgbuild --root "$TEMP_ROOT" \
         --identifier "com.genesis-chronicle.desktop" \
         --install-location "/Applications" \
         "$PKG_PATH"
```

### Redux/TypeScript Patterns
```typescript
// Type-safe dispatch
const dispatch = useDispatch<AppDispatch>();

// Slate.js chapter rendering - force remount
<SlateEditor key={`editor-${currentChapter.id}`} />

// Prevent double JSON parsing
const fetchChapters = createAsyncThunk(
  'chapters/fetchByProjectId',
  async (projectId: string) => {
    const chapters = await api.chapters.getByProjectId(projectId);
    return chapters; // API layer already parsed JSON
  }
);
```

## Critical Development Rules

1. **API Layer Unity**: Always use `import { api } from './api'` pattern
2. **Database Queries**: Explicitly specify column names, never `SELECT *`
3. **Slate.js Rendering**: Use `key={editor-${chapterId}}` for proper remounting
4. **JSON Parsing**: API layer handles parsing - don't parse again in Redux slices
5. **AI Context**: Always pass `position` parameter for context-aware generation
6. **Model Selection**: Preserve user's model choice across provider switches
7. **AI Filtering**: Use smart filtering in `aiWritingAssistant.ts` to prevent English thinking content leakage
8. **Token Management**: Pass `userMaxTokens` parameter through `generateSmartParams()` to respect user settings
9. **Character Analysis**: Use Compromise.js NLP utils for Chinese dialogue extraction and Big Five personality analysis
10. **Export Font Handling**: PDF generation uses embedded Noto Sans TC (7.1MB) - verify font data integrity before compilation
11. **User Format Guidance**: Recommend EPUB for digital reading (lightweight), PDF for printing (large file with embedded fonts)
12. **Naming Conventions**: Use `#[allow(non_snake_case)]` for Tauri command parameters to maintain camelCase API compatibility
13. **Icon Updates**: macOS has aggressive icon caching - use `killall Dock && killall Finder` or restart to refresh icons
14. **macOS PKG Distribution**: Use PKG format for seamless installation without quarantine issues - see `MACOS_PKG_BYPASS_GUIDE.md`

## GitHub Actions & CI/CD

### Release Workflows
- **Standard Release**: `release.yml` - Triggered by `v*` tags, generates DMG + PKG
- **Signed Release**: `release-signed.yml` - For Apple Developer ID signed versions
- **Test Build**: `test-build.yml` - Validates builds without releasing

### macOS PKG Generation
The automated PKG generation system solves the macOS quarantine problem:
- **User Experience**: Download → Double-click → Install (no `xattr` commands needed)
- **Technical**: PKG format automatically handles quarantine attributes
- **Automation**: GitHub Actions generates both DMG and PKG on every release
- **Universal Support**: Single PKG works on Intel and Apple Silicon Macs

## Known Issues & Solutions

### UI Interaction
- Button not clickable: Check `z-50` overlay blocking
- Menu component: Don't add onClick to trigger button
- Long model names: OpenRouter models auto-truncate after 30 chars (e.g., `qwen/qwen3-235b-a22b...`)
- Provider names: Auto-truncate after 20 chars with title tooltip for full name

### AI Generation
- Ollama: Ensure service running at `http://127.0.0.1:11434`
- Empty responses: Check model-specific response format (thinking vs response field)
- Gemini `parts=None`: Falls back to `content.text` field when MAX_TOKENS reached
- API quotas: Handle 429 errors gracefully
- Token limits: Gemini 2.5 Flash uses ultra-conservative 60-80 tokens, 2.5 Pro uses 200-300 tokens
- Content filtering: Check AI-generated text in `aiWritingAssistant.ts` for thinking/reasoning leakage
- OpenRouter models: Use format `provider/model` (e.g., `openai/gpt-4`, `anthropic/claude-3`)

### macOS Distribution Issues (SOLVED)
- **Quarantine Problem**: Users needed `sudo xattr -rd com.apple.quarantine` after DMG installation
- **Solution**: PKG installer automatically handles quarantine attributes
- **Implementation**: See `scripts/create-pkg.sh` and `MACOS_PKG_BYPASS_GUIDE.md`

### Performance
- Startup: 300% faster with Tauri v2.7.0
- Memory: 70% reduction vs Electron
- Bundle size: 90% smaller

### Export Issues
- PDF Chinese fonts: Ensure `src-tauri/assets/fonts/NotoSansTC-Regular.ttf` is a valid TTF file (not HTML)
- Large PDF files: Expected due to embedded 7.1MB Chinese font for cross-platform compatibility
- Text wrapping: Algorithm handles Chinese/ASCII character width differences automatically

### Icon & UI Issues
- macOS icon cache: System caches app icons aggressively. After updating icons in `src-tauri/icons/`, run `killall Dock && killall Finder` or restart system
- Icon formats needed: PNG (multiple sizes), .icns (macOS), .ico (Windows)
- 中二風格 UI: Export dialogs use themed naming ("次元物語", "絕對文書", etc.)

## Recent Achievements (2025-08-11 - v1.0.4 Milestone)

- ✅ **COMPLETED: Character Analysis UI Components** (2025-08-11): 100% complete with all 6 tabs implemented
  - ✅ Personality analysis with Big Five radar chart (Recharts integration)
  - ✅ Language style analysis with vocabulary richness visualization
  - ✅ Emotion analysis with pie charts and trend lines
  - ✅ Consistency checking with multi-dimensional scoring
  - ✅ AI-powered improvement suggestions with priority classification
  - ✅ 3 new chart components: PersonalityRadarChart, EmotionTrendChart, ConsistencyScoreChart
- ✅ **COMPLETED: macOS PKG Installer System**: Full implementation with quarantine bypass
  - ✅ One-click installation without terminal commands
  - ✅ GitHub Actions automation for dual-format releases (DMG + PKG)
  - ✅ Universal binary support (Intel + Apple Silicon)
  - ✅ Professional installation experience matching commercial software
- ✅ **COMPLETED: PDF + EPUB Export System**: Embedded Noto Sans TC (7.1MB) for cross-platform Chinese support
- ✅ **COMPLETED: Version Management**: All config files synchronized to v1.0.4
- ✅ **COMPLETED: Technical Documentation**: MACOS_PKG_BYPASS_GUIDE.md comprehensive manual
- ✅ Multi-provider AI system with context awareness and model-specific response handling
- ✅ Character dialogue extraction with Chinese NLP optimization (Compromise.js)
- ✅ Big Five personality analysis system for character consistency
- ✅ Database v11 migration with 6 analysis tables and 30+ performance indices
- ✅ Smart parameter generation with model-specific token limits
- ✅ Project scale: 213,392 lines of code (TypeScript: 49,687 | Rust: 12,377 | Docs: 35,979)

## Current Development Status (Commercial-Grade Product)

**Status**: Genesis Chronicle v1.0.4 has successfully evolved from technical prototype to **commercial-grade product** with professional installation experience.

### ✅ Completed Commercial Features
- **Professional Installation**: PKG installer with automatic quarantine handling
- **Cross-platform Export**: PDF/EPUB with embedded Chinese fonts
- **Multi-AI Integration**: 5 providers with unified architecture
- **Advanced NLP**: Character analysis and dialogue extraction
- **Automated CI/CD**: Complete GitHub Actions workflow
- **Professional Documentation**: Technical guides and user manuals

### 🎯 Next Phase Priorities
1. **Windows Distribution**: MSI installer generation
2. **Linux Support**: AppImage packaging
3. **Auto-update System**: In-app update mechanism
4. **Internationalization**: English and Japanese versions
5. **Cloud Integration**: Project backup and synchronization

### Architecture Excellence
- **Installation**: Professional-grade macOS PKG system eliminates user friction
- **Performance**: 300% startup speed improvement, 70% memory reduction vs Electron
- **Scalability**: Modular AI provider architecture supports easy expansion
- **Maintainability**: Comprehensive documentation and automated testing