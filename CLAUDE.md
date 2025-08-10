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
```

**⚠️ IMPORTANT**: This is a Tauri desktop application, NOT a web app. When running `npm run dev`, a native desktop window will open. The URLs shown in terminal (e.g., http://127.0.0.1:3000/) are for Vite dev server only and CANNOT be used to test the full application in a browser. The browser will only show a blank page because Tauri APIs are not available in browser context.

### Testing & Build
```bash
npm test                   # Run all tests (Jest with jsdom)
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:performance   # Run performance tests only
npm run build             # Full build (frontend + Tauri)
npm run build:renderer     # Frontend build only
cargo tauri build --no-bundle  # Rust build without bundling (faster)
npm run diagnostic        # System diagnostics
./scripts/security-check.sh  # Pre-release security check
```

### AI Model Management
```bash
ollama list               # Check available Ollama models
ollama serve              # Start Ollama service (required for local AI)
ollama pull llama3.2      # Install recommended Chinese-optimized model
```

### Database Management
```bash
# Database location: ~/Library/Application Support/genesis-chronicle/genesis-chronicle.db
rm ~/Library/Application\ Support/genesis-chronicle/genesis-chronicle.db  # Reset to rebuild with latest schema
# Test specific database operations
node scripts/test-ai-history.js        # Test AI interaction history
node scripts/test-ollama-service.js    # Test Ollama AI service
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
- **Location**: `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`
- **Version**: v11 with migration system (includes character analysis tables)
- **Rules**: 
  - Never use `SELECT *` - specify columns explicitly
  - Use `conn.pragma_update()` for version updates
  - Delete DB file to rebuild with latest schema
- **Analysis Tables**: `character_analysis`, `plot_analysis`, `creative_suggestions`, `analysis_cache`, `analysis_queue`, `analysis_templates`
- **Export Tables**: `epub_exports`, `pdf_exports` for tracking generation history

### NLP & Character Analysis System
- **Core Service**: `src/renderer/src/services/characterAnalysisService.ts` (600+ lines)
- **NLP Utils**: `src/renderer/src/utils/nlpUtils.ts` with Compromise.js integration
- **Features**:
  - Chinese dialogue extraction (5 punctuation patterns)
  - Big Five personality analysis with confidence scoring
  - Cross-chapter consistency detection
  - Speaker attribution with context inference
- **Smart AI Parameters**: `src/renderer/src/services/aiWritingAssistant.ts` with model-specific token limits

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

## Known Issues & Solutions

### UI Interaction
- Button not clickable: Check `z-50` overlay blocking
- Menu component: Don't add onClick to trigger button

### AI Generation
- Ollama: Ensure service running at `http://127.0.0.1:11434`
- Empty responses: Check model-specific response format (thinking vs response field)
- Gemini `parts=None`: Falls back to `content.text` field when MAX_TOKENS reached
- API quotas: Handle 429 errors gracefully
- Token limits: Gemini 2.5 Flash uses ultra-conservative 60-80 tokens, 2.5 Pro uses 200-300 tokens
- Content filtering: Check AI-generated text in `aiWritingAssistant.ts` for thinking/reasoning leakage

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

## Recent Achievements (2025-08-10)

- ✅ Multi-provider AI system with context awareness
- ✅ EPUB 3.0 generation with Slate.js conversion
- ✅ **PDF Generation with Chinese Font Support**: Complete implementation with embedded Noto Sans TC
  - Cross-platform Chinese text rendering (Windows/macOS/Linux compatible)
  - Smart text wrapping algorithm for mixed Chinese/English content
  - Professional page layout with automatic pagination
- ✅ Plot analysis engine with NLP character extraction (Phase 2: 40% complete)
- ✅ Model-specific response format handling
- ✅ Gemini `parts=None` fallback mechanism
- ✅ Character dialogue extraction with Chinese NLP optimization
- ✅ Big Five personality analysis system for character consistency
- ✅ Database v11 migration with 6 new analysis tables
- ✅ Smart parameter generation with model-specific token limits
- ✅ **User Interface Enhancements**: Format selection guidance in help system and dashboard
- ✅ **中二風格命名系統**: Export features use themed Japanese-style naming ("次元物語・零式記錄" for EPUB, "絕對文書・完全具現化" for PDF)
- ✅ **圖標系統完整更新**: 新「創」字設計 - 金色文字配紫色漸層背景，支援全平台格式

## Current Development Status (Phase 2)

**Advanced AI-powered Novel Analysis Features**: 40% complete

### Completed Core Infrastructure
- ✅ NLP foundation with Compromise.js integration
- ✅ Character analysis service (600+ lines) with Big Five personality model
- ✅ Chinese dialogue extraction (5 punctuation patterns)
- ✅ Database v11 schema with 6 analysis tables and 30+ performance indices
- ✅ Smart parameter generation with model-specific optimizations

### In Progress
- 🚧 Character consistency detection algorithms (vector similarity)
- 🚧 Plot analysis and conflict detection systems
- 🚧 Creative suggestion engine with multi-AI integration
- 🚧 Analysis UI components and visualization dashboards

### Architecture Priorities
1. **Character Analysis**: Focus on Chinese light novel characteristics
2. **Performance**: Efficient caching and batch processing
3. **User Experience**: Seamless integration with existing writing workflow
4. **AI Integration**: Leverage all 5 AI providers for comprehensive analysis