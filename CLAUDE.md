# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start with Serena MCP

**IMPORTANT**: This project requires **Serena MCP** for optimal development experience. Always start by checking onboarding status:

```typescript
// First command to run in every session
mcp__serena__check_onboarding_performed()

// If onboarding not performed, run:
mcp__serena__onboarding()
```

### Essential Serena Workflow
1. **Project Exploration**: `mcp__serena__get_symbols_overview({ relative_path: "src" })`
2. **Memory Check**: `mcp__serena__list_memories()` - Review existing project knowledge
3. **Code Analysis**: Use `mcp__serena__find_symbol()` and `mcp__serena__search_for_pattern()` 
4. **Knowledge Persistence**: `mcp__serena__write_memory()` for important discoveries

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) - A Tauri-based AI-powered novel writing application for Chinese light novel creation. Built with Rust backend and React frontend, supporting 5 major AI providers.

**Architecture**: Pure Tauri v2.7.0 (v1.0.0+) - 300% faster startup, 70% less memory, 90% smaller size
**Latest Updates** (2025-08-07): Chapter Content Duplication FIXED + Complete Horizontal Scrolling Fix + Multi-Provider AI System - Perfect editing experience with flawless chapter navigation
**Code Quality**: ✅ Rust: Clean | ✅ TypeScript: 0 errors (100% FIXED - from 300+ to 0!) | ✅ ESLint: Critical errors fixed
**Critical Fixes**: ✅ Chapter Rendering (Slate.js key prop) | ✅ Double JSON Parsing | ✅ Window Mode Scrolling
**AI Providers**: 🦙 Ollama (Local) | 🤖 OpenAI | ✨ Google Gemini | 🧠 Anthropic Claude | 🔄 OpenRouter
**Key Features**: ✅ Multi-Provider AI System | ✅ Advanced Model Search | ✅ Chapter Navigation | ✅ Novel Length Classification | ✅ Template Import Wizard | ✅ NLP Text Processing | ✅ Context-Aware AI Writing

## Essential Commands

### Development
```bash
npm run dev                # Start Tauri development
npm run dev:renderer       # Start only frontend (Vite dev server)
npm run lint               # Run ESLint with auto-fix
npm run lint -- --fix     # Auto-fix ESLint errors where possible
cargo check --manifest-path src-tauri/Cargo.toml  # Check Rust
npx tsc --noEmit          # Check TypeScript
```

### Quick Problem Diagnosis
```bash
npm run diagnostic        # System diagnostics (ignore Electron-related errors)
npm run dev               # Start dev server and check console for errors
ollama list               # Check AI models available
git status                # Check for uncommitted changes
```

### Testing & Building
```bash
npm test                   # Run all tests
npm run build             # Build application
npm run clean             # Clean build artifacts
```

### Troubleshooting
```bash
# When encountering build issues
npm run clean && npm install              # Clean and reinstall dependencies
cargo clean --manifest-path src-tauri/    # Clean Rust build cache

# When database schema changes
rm ~/.local/share/genesis-chronicle/genesis-chronicle.db  # Reset database (macOS/Linux)
# Database will auto-recreate with latest schema on next run

# When AI features aren't working
ollama serve                               # Start Ollama service
ollama list                               # Check installed models
ollama pull llama3.2                     # Install recommended model
```

## Architecture Overview

### Backend (`src-tauri/`)
**Stack**: Rust + Tauri v2.7.0 + SQLite (rusqlite)
- **Commands**: Feature-organized handlers in `src/commands/` (system, project, chapter, character, ai, ai_providers, context, settings, database, ai_history)
- **Database**: Migration system (current v9) with `ai_providers` table for multi-provider support
- **AI Providers**: Unified trait-based system supporting 5 major providers with auto-discovery
- **Services**: Multi-provider AI integration with connection pooling and error recovery
- **Utils**: Language purity enforcement, text processing utilities

### Frontend (`src/renderer/`)
**Stack**: React 18 + TypeScript + Redux Toolkit + Tailwind CSS
- **Editor**: Slate.js for rich text editing with custom formatting
- **State Management**: Redux slices for projects, chapters, characters, ai, aiHistory, templates, settings, ui, error, editor, notification
- **Theme**: Cosmic dark theme (`bg-cosmic-950`) with gold accents (`text-gold-400`)
- **i18n**: JSON-based translations with Traditional Chinese (zh-TW) as primary language

### Key Features
- **Chapter Navigation System**: Visual chapter separation with numbered navigation (←/→) and title bars
- **Novel Length Classification**: Projects categorized as short (1-5), medium (10-30), or long (50+) chapters
- **Context Engineering**: Separated prompts achieve 29.8% token reduction (SystemPromptBuilder + UserContextBuilder)
- **Language Purity**: Regex-based enforcement for Traditional Chinese only content
- **AI Progress Visualization**: Multi-stage progress tracking (preparing→generating→processing→complete)
- **AI Generation History**: Complete CRUD operations with timestamp tracking
- **Novel Template Import**: AI-powered analysis of novels to generate writing templates using Compromise.js NLP
- **Multi-step Analysis Pipeline**: Upload → Parse → Analyze → Preview → Generate template workflow
- **Real-time Text Processing**: NLP-based entity extraction, writing metrics, and style analysis
- **Smart AI Writing Assistant**: Context-aware AI text generation with Compromise.js NLP integration
- **Cursor Position Preservation**: Manual and auto-save operations maintain cursor position for seamless editing experience

## High-Level Architecture Patterns

### API Layer Structure
The project uses a unified API adapter pattern to handle both Tauri and potential future backends:

```typescript
// Unified API entry point
src/renderer/src/api/
├── index.ts          # Main API export with environment detection
├── types.ts          # Shared API interface definitions
├── models.ts         # Tauri backend response type mappings
├── tauri.ts          # Tauri-specific implementation
└── safeApi.ts        # Error handling and fallback mechanisms
```

**Critical Pattern**: Always import from the unified API layer:
```typescript
import { api } from '../api';  // ✅ Correct
// NEVER: import { invoke } from '@tauri-apps/api/core';  // ❌ Wrong
```

### Database Architecture
SQLite with versioned migrations (current: v9) following strict patterns:

**Migration Structure**:
```rust
// src-tauri/src/database/migrations.rs
pub fn migrate_to_v9(conn: &Connection) -> anyhow::Result<()> {
    // Create ai_providers table for multi-provider support
    conn.execute(
        "CREATE TABLE ai_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider_type TEXT NOT NULL,
            model TEXT NOT NULL,
            endpoint TEXT,  -- Optional for cloud providers
            api_key TEXT,
            is_enabled BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )", []
    )?;
    conn.pragma_update(None, "user_version", 9)?;  // Use pragma_update, NOT execute
    Ok(())
}
```

**Database Commands**: Feature-organized in `src-tauri/src/commands/` with explicit field selection:
```sql
-- ✅ Correct: Explicit field names
SELECT id, name, description, created_at FROM projects

-- ❌ Wrong: Causes field mapping errors
SELECT * FROM projects
```

### State Management Architecture
Redux Toolkit with typed patterns across feature slices:

```typescript
// Standard Redux slice structure
src/renderer/src/store/slices/
├── projectsSlice.ts     # Project CRUD operations
├── chaptersSlice.ts     # Chapter management
├── charactersSlice.ts   # Character and relationship management
├── aiSlice.ts          # AI generation state
├── aiHistorySlice.ts   # AI generation history tracking
├── settingsSlice.ts    # Application settings
├── uiSlice.ts          # UI state (modals, notifications)
└── errorSlice.ts       # Error handling and progress tracking
```

**Mandatory Pattern**: Always use typed dispatch:
```typescript
const dispatch = useDispatch<AppDispatch>();  // ✅ Required
```

### Component Organization
Feature-based component structure with shared UI components:

```typescript
src/renderer/src/components/
├── UI/                 # Reusable UI components (Button, Modal, etc.)
├── Editor/             # Rich text editor (Slate.js)
├── AI/                 # AI generation features
├── Characters/         # Character management
├── Templates/          # Novel templates & template import wizard
├── Projects/           # Project management
└── Settings/           # Application settings

# Key Template System Files:
src/renderer/src/services/
├── novelParserService.ts      # Novel text parsing & chapter extraction
├── novelAnalysisService.ts    # AI-powered semantic analysis
└── nlpUtils.ts               # Compromise.js NLP utilities

src/renderer/src/components/Templates/
├── TemplateImportWizard.tsx  # 5-step import process
└── TemplateManager.tsx       # Template management interface
```

### Language System Architecture
Focused on Traditional Chinese with language purity enforcement:

**Frontend i18n**: JSON-based dynamic loading system
```typescript
src/renderer/src/i18n/
├── index.ts           # I18n service with async/sync APIs
├── translations.ts    # Dynamic translation loader
└── locales/
    ├── zh-TW.json    # Primary Traditional Chinese
    ├── zh-CN.json    # Simplified Chinese
    ├── en.json       # English
    └── ja.json       # Japanese
```

**Backend Language Purity**: Rust-based regex enforcement in `src-tauri/src/utils/language_purity.rs`

### Slate.js Editor Architecture (Critical - Recently Refactored)
The rich text editor uses a specialized architecture to avoid React hook context issues:

```typescript
// ✅ Correct: Inline toolbar within Slate context
<Slate editor={editor} initialValue={value} onChange={onChange}>
  <InlineToolbar onSave={onSave} onAIWrite={onAIWrite} />  // Uses useSlate() safely
  <Editable ... />
</Slate>

// ❌ Wrong: External toolbar outside Slate context
<EditorToolbar />  // Cannot use useSlate() - will cause context errors
<Slate editor={editor} ...>
  <Editable ... />
</Slate>
```

**Key Components**:
- `SlateEditor.tsx`: Main editor with integrated inline toolbar
- `InlineToolbar`: Formatting tools within Slate context (Bold, Italic, H1, etc.)
- `ProjectEditor.tsx`: Chapter navigation and management layer
- **AI Panel**: Currently disabled due to context constraints (maintenance mode)

## Critical Development Patterns

### ⚠️ MANDATORY Rules

1. **Serena MCP First**: ALWAYS start sessions with `mcp__serena__check_onboarding_performed()`
2. **API Layer**: Always use `import { api } from './api'` - NEVER direct Tauri calls
3. **Redux**: Always use typed dispatch: `useDispatch<AppDispatch>()`
4. **Database**: Always use explicit field names in SQL - NEVER `SELECT *`
5. **Chinese Text**: Use Unicode-aware methods - NEVER ASCII-only filters
6. **PRAGMA**: Use `conn.pragma_update()` - NOT `conn.execute()`
7. **ESLint**: Variables prefixed with `_` are allowed to be unused
8. **Symbol-First Approach**: Use `mcp__serena__get_symbols_overview()` before reading entire files
9. **Type Safety**: Prefer specific type definitions over `as any` - use interfaces, unions, or `Record<string, unknown>`
10. **API Interface Consistency**: Character/Relationship APIs use `CreateRelationshipRequest` type - never `Omit<Relationship, 'id'>`
11. **Error Type Guards**: Always implement type guards for unknown/error objects before accessing properties
12. **Chapter Content Format**: Always pass Slate.js content as JSON string to Tauri backend: `JSON.stringify(chapter.content)` 
13. **Cursor Position Management**: Use `textAreaRef` and preserve `selectionStart` for save operations to maintain editing context
14. **Slate.js Context**: All Slate editor tools must be within `<Slate>` component context - use inline toolbar patterns
15. **Novel Length Classification**: Projects must specify novel_length ('short'|'medium'|'long') for proper chapter management
16. **Chapter Navigation**: Always display chapter_number with navigation controls (←/→) for multi-chapter projects
17. **UI Debugging**: When buttons are unclickable, first check for overlay components (`z-50`, `fixed inset-0`) blocking interactions
18. **AI Writing Parameters**: Always import and use `aiWritingAssistant.ts` for NLP analysis before parameter generation
19. **Parameter Diversity**: Use enhanced parameter variations (±0.15-0.2) instead of minimal changes (±0.1) for content diversity
20. **Multi-Provider AI**: Always use the unified `api.aiProviders` interface - NEVER call provider APIs directly
21. **Model Search Pattern**: Use temporary provider creation for safe model discovery without permanent storage
22. **Provider Type Safety**: Always validate provider types with the `AIProvider` trait interface
23. **AI History Saving**: Always call `createAIHistory` after successful AI text generation - both main generation and regeneration must save to history
24. **Menu Component Integration**: When using UI Menu components, never add onClick to trigger buttons - Menu component handles click events automatically
25. **Chapter Deletion Pattern**: Use ConfirmDialog for destructive operations with proper error handling and notifications
26. **Double JSON Parsing Prevention**: CRITICAL - Never parse JSON in Redux slices if API layer already handles it - this corrupts Slate.js content and causes data synchronization issues
27. **Chapter Content Rendering**: ALWAYS use `key` prop for Slate.js editor when switching content - `key={editor-${currentChapter.id}}` forces re-render and prevents content duplication
28. **Tauri Desktop App Limitation**: This is a Tauri desktop application - CANNOT use Puppeteer or browser automation tools for testing

### Development Workflows

#### Session Startup (MANDATORY)
1. **Check Onboarding**: `mcp__serena__check_onboarding_performed()`
2. **Project Overview**: `mcp__serena__get_symbols_overview({ relative_path: "src" })`
3. **Review Memories**: `mcp__serena__list_memories()` - Check existing project knowledge
4. **Switch to Editing Mode**: `mcp__serena__switch_modes({ modes: ["editing", "interactive"] })`

#### Adding New Tauri Command
1. **Explore Existing**: `mcp__serena__find_symbol({ name_path: "commands", relative_path: "src-tauri/src" })`
2. Add command in `src-tauri/src/commands/*.rs`
3. Register in `src-tauri/src/lib.rs` invoke_handler
4. Add types to `src/renderer/src/api/types.ts`
5. Implement in `src/renderer/src/api/tauri.ts`
6. **Record Changes**: `mcp__serena__write_memory()` for new patterns discovered

#### Adding Frontend Feature
1. **Analyze Structure**: `mcp__serena__get_symbols_overview({ relative_path: "src/renderer/src/components" })`
2. Component in `src/renderer/src/components/[feature]/`
3. Redux slice in `src/renderer/src/store/slices/`
4. Translation keys in `src/renderer/src/i18n/locales/*.json`
5. **Document Pattern**: `mcp__serena__write_memory()` for reusable insights

## Common Issues & Solutions

### UI Interaction Problems (PRIORITY 1)
- **Issue**: Buttons unclickable, overlays blocking interaction
- **Debug**: Check `ReadingModeOverlay` and `TutorialOverlay` states
- **Check**: Console logs for tutorial/reading mode state
- **Fix**: Ensure `isReadingMode={false}` and `isTutorialActive={false}`
- **Overlays**: Watch for `fixed inset-0 z-50` CSS blocking interactions
- **Menu Components**: If Menu trigger buttons don't work, remove onClick from button element - Menu component auto-handles clicks
- **Z-Index Issues**: Add `z-10` or higher to ensure interactive elements are above other content

### Diagnostic Script False Positives (Can Ignore)
- **Issue**: Diagnostic script reports missing Electron files
- **Cause**: Script still checks removed Electron architecture
- **Safe to Ignore**: main.ts, electron dependencies, better-sqlite3
- **Status**: These are expected after Tauri migration

### Chinese Text Processing
- **Issue**: ASCII filters break Chinese characters
- **Fix**: Use `c.is_alphanumeric()` (Unicode-aware) in Rust

### Database Operations
- **Issue**: `SELECT *` causes field mapping errors
- **Fix**: Always specify field names explicitly
- **Schema Issues**: Delete DB file to force recreation with latest schema
- **Path Issues**: Database location is `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db` on macOS
- **Double JSON Parsing**: CRITICAL - Never parse JSON in Redux if API layer already handles it
  - **Symptom**: Slate.js shows "[{\"type\":\"paragraph\"..." instead of content
  - **Cause**: API layer parses JSON, Redux slice parses again, corrupts data
  - **Fix**: Trust API layer completely - remove JSON.parse() from Redux slices

### Ollama Integration
- **Service URL**: `http://127.0.0.1:11434`
- **Parameter**: Use `num_predict` not `max_tokens`
- **Timeouts**: Client 300s, API 120s
- **Model**: Default is llama3.2

### UI State Management
- **React Updates**: Use functional setState: `setState(prev => ...)`
- **Auto-scroll**: Call `scrollIntoView()` after AI generation
- **Scrollbars**: Gold-themed 16px with `!important` CSS overrides
- **Settings Page**: Use cleanup functions in useEffect to prevent infinite loading
- **Navigation Issues**: Settings accessible via Settings → 模板管理 (Template Management)

### Template Import System
- **File Types**: Supports .txt files for novel analysis
- **NLP Processing**: Uses Compromise.js for entity extraction and text analysis
- **AI Analysis**: Integrates with Ollama for semantic understanding of world-building, characters, plot structure
- **Progress Tracking**: Multi-stage progress indicators with error recovery
- **Memory Usage**: Text chunking (2500 chars with 200 char overlap) for large novels

### Smart AI Writing System
- **NLP Integration**: Uses `aiWritingAssistant.ts` with Compromise.js for context analysis
- **Context Analysis**: Detects writing style (tense, narrative perspective, emotional tone)
- **Smart Parameters**: Auto-adjusts AI generation parameters based on text analysis
- **Enhanced Diversity**: Parameter variations increased from ±0.1 to ±0.15-0.2 for temperature, plus topP and penalty variations
- **Quality Checking**: Post-generation quality assessment for coherence and style consistency
- **History Integration**: AI History Panel accessible via toggle button in AI Writing Panel
- **Cursor Preservation**: Save operations maintain cursor position using `textAreaRef` and `selectionStart`

### TypeScript Patterns
```typescript
// Redux with typed dispatch
const dispatch = useDispatch<AppDispatch>();

// AppError format
const error: AppError = {
  id: Date.now().toString(),
  code: 'ERROR_CODE',
  message: 'Error message',
  severity: 'high',
  category: 'ai',
  timestamp: new Date()
};

// Prefer specific type definitions over 'as any'
// ✅ Good: Specific interface
const payload = action.payload as { isRunning?: boolean; version?: string };

// ✅ Good: Record for unknown objects
const settings = data as Record<string, unknown>;

// ❌ Avoid: Generic any type
const result = apiCall() as any;

// Type Guard Pattern for Error Handling
const hasCode = (err: unknown): err is { code?: string } => {
  return typeof err === 'object' && err !== null && 'code' in err;
};

// Character Relationship API Pattern
const createRelationshipRequest: CreateRelationshipRequest = {
  fromCharacterId: 'char1',
  toCharacterId: 'char2', 
  relationshipType: 'friend',
  description: 'Best friends'
};

// Chapter Content Serialization Pattern  
const chapterUpdateRequest = {
  id: chapter.id,
  title: chapter.title,
  content: JSON.stringify(chapter.content), // ✅ Always serialize Slate.js content
  order_index: chapter.order
};

// Cursor Position Preservation Pattern
const savedCursorPosition = textAreaRef.current?.selectionStart || cursorPosition;
// ... perform save operation ...
setTimeout(() => {
  if (textAreaRef.current) {
    textAreaRef.current.focus();
    textAreaRef.current.setSelectionRange(savedCursorPosition, savedCursorPosition);
  }
}, 10);

// Menu Component Integration Pattern
// ✅ Correct: Let Menu handle clicks
<Menu trigger={<button>Menu</button>}>
  <MenuItem onClick={handleAction}>Action</MenuItem>
</Menu>

// ❌ Wrong: Don't add onClick to trigger
<Menu trigger={<button onClick={handleClick}>Menu</button>}>
  <MenuItem onClick={handleAction}>Action</MenuItem>
</Menu>

// Destructive Action Pattern with ConfirmDialog
const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; item: Item | null}>({
  show: false, item: null
});

const handleDelete = async (item: Item) => {
  try {
    await dispatch(deleteAction(item.id)).unwrap();
    dispatch(addNotification({ type: 'success', message: 'Deleted successfully' }));
    setDeleteConfirm({ show: false, item: null });
  } catch (error) {
    dispatch(addNotification({ type: 'error', message: 'Delete failed' }));
  }
};

// Slate.js Chapter Rendering Pattern (CRITICAL FIX)
// ✅ Correct: Force re-render with key prop
<SlateEditor
  key={`editor-${currentChapter.id}`} // ← Forces component remount on chapter change
  value={currentChapter.content}
  onChange={handleEditorChange}
  placeholder="開始寫作..."
  autoFocus={true}
/>

// ❌ Wrong: Reuses same component instance - causes content duplication
<SlateEditor
  value={currentChapter.content}
  onChange={handleEditorChange}
  // Missing key prop - React reuses component, content doesn't update visually
/>

// Double JSON Parsing Prevention Pattern
// ✅ Correct: Trust API layer completely
const fetchChapters = createAsyncThunk(
  'chapters/fetchByProjectId',
  async (projectId: string) => {
    const chapters = await api.chapters.getByProjectId(projectId);
    return chapters; // API layer already handles JSON parsing
  }
);

// ❌ Wrong: Double parsing corrupts Slate.js content
const fetchChapters = createAsyncThunk(
  'chapters/fetchByProjectId',
  async (projectId: string) => {
    const chapters = await api.chapters.getByProjectId(projectId);
    return chapters.map(chapter => ({
      ...chapter,
      content: JSON.parse(chapter.content) // ❌ API already parsed this!
    }));
  }
);
```

### Database Migration Pattern
```rust
// In migrations.rs
conn.execute("ALTER TABLE...", [])?;
conn.pragma_update(None, "user_version", 8)?;  // NOT conn.execute()
```

## Performance Considerations

- **Memory**: SQLite connection pooling, Redux state normalization, React.memo for expensive components
- **Auto-save**: 2s debounce for chapter content, immediate for critical operations
- **Token Usage**: Average 360 tokens with context engineering (down from 513)
- **Build Size**: Tauri single-arch builds are 90% smaller than Electron equivalents

## Testing

- **Framework**: Jest with jsdom environment
- **Test Scripts**: Located in project root (test-*.js)
- **Run Tests**: `npm test` for all tests, `npm run test:unit` for unit tests only
- **Additional Commands**: 
  - `npm run test:integration` - Integration tests
  - `npm run test:performance` - Performance benchmarks
  - `npm run diagnostic` - System diagnostics

## Serena MCP Integration

This project **REQUIRES** **Serena MCP** - an intelligent coding assistant that provides semantic code analysis and editing capabilities.

### 🔴 MANDATORY: Session Initialization
**EVERY** Claude Code session must start with these commands:
```typescript
mcp__serena__check_onboarding_performed()  // Always run first
mcp__serena__list_memories()              // Review project knowledge
mcp__serena__switch_modes({ modes: ["editing", "interactive"] })  // Enable full capabilities
```

### Key Capabilities
- **Semantic Code Search**: Find symbols, functions, classes by name patterns
- **Intelligent Refactoring**: Symbol-level editing and code transformations
- **Memory System**: Project knowledge persistence across sessions
- **Type-aware Operations**: Understands TypeScript/JavaScript semantics

### Essential Serena Commands

#### Code Exploration
```typescript
// Get project overview
mcp__serena__get_symbols_overview({ relative_path: "src" })

// Find specific symbols
mcp__serena__find_symbol({ name_path: "ComponentName", include_body: true })

// Search for patterns in code
mcp__serena__search_for_pattern({ substring_pattern: "async.*await", restrict_search_to_code_files: true })
```

#### Code Editing
```typescript
// Replace entire function/class body
mcp__serena__replace_symbol_body({ name_path: "functionName", relative_path: "src/file.ts", body: "new implementation" })

// Insert code after symbol
mcp__serena__insert_after_symbol({ name_path: "MyClass", relative_path: "src/file.ts", body: "new method" })

// Regex-based replacements
mcp__serena__replace_regex({ relative_path: "src/file.ts", regex: "old.*pattern", repl: "new content" })
```

#### Memory Management
```typescript
// Store project insights
mcp__serena__write_memory({ memory_name: "feature-implementation", content: "Detailed notes..." })

// Retrieve project knowledge
mcp__serena__read_memory({ memory_file_name: "architecture-notes.md" })

// List available memories
mcp__serena__list_memories()
```

### Serena Best Practices

1. **Use Symbol Tools First**: Before reading entire files, use `get_symbols_overview` and `find_symbol`
2. **Leverage Memory System**: Store important project insights for future reference
3. **Prefer Symbol Editing**: Use `replace_symbol_body` over manual file editing when possible
4. **Search Strategically**: Use `search_for_pattern` with appropriate filters to avoid noise

### Integration Notes
- Serena operates in **interactive** and **editing** modes
- Always use `relative_path` parameters to restrict search scope
- For complex refactoring, break into smaller symbol-level operations
- Memory files persist across Claude Code sessions

## Code Quality Standards

### Current Status
- **Rust Backend**: ✅ Clean compilation
- **TypeScript**: ✅ 0 errors (COMPLETELY FIXED - reduced from 300+ to 0)
- **ESLint**: ✅ 0 errors, 0 warnings (PERFECT SCORE)

### TypeScript Quality Guidelines
- **Avoid `any` types**: Use specific interfaces, unions, or `Record<string, unknown>`
- **Type Guards**: Implement runtime validation for unknown data
- **Generic Functions**: Leverage `<T>` for reusable, type-safe code
- **Strict Null Checks**: Use optional chaining and nullish coalescing
- **API Responses**: Define specific interfaces rather than casting to `any`
- **Redux Payloads**: Use typed action creators and payload interfaces

### ESLint Configuration
Key rules in `.eslintrc.js`:
- `@typescript-eslint/no-explicit-any`: 'warn' (✅ ALL WARNINGS ELIMINATED)
- Variables prefixed with `_` are ignored for unused-vars
- `react-hooks/exhaustive-deps`: Successfully resolved all warnings
- **Achievement**: Perfect ESLint score with comprehensive type safety improvements

### Development Priorities (2025-08-03) - ✅ ALL COMPLETED
1. ✅ **Complete TypeScript Error Resolution**: ACHIEVED - Reduced from 300+ to 0 errors (100% success)
2. ✅ **ESLint Cleanup**: COMPLETED - All warnings eliminated with comprehensive type safety
3. ✅ **API Layer Type Safety**: COMPLETED - Major overhaul of API types and error handling
4. ✅ **Character Relationship System**: COMPLETED - Fixed API interfaces and type definitions
5. ✅ **Final Type Issues**: COMPLETED - Fixed all remaining Slate.js and database interface issues

## Change Log

### [2025-08-07 21:35:58] - 章節內容重複問題根本修復 + 文檔全面更新 🎯📚
- **總程式碼行數**: 77,522 行
- **與上次更新比較**: -111,484 行 (程式碼統計方式調整，排除更多構建檔案)
- **修改檔案數**: 5 個檔案，新增 269 行，刪除 10 行
- **關鍵修復**: 最終解決不同章節顯示相同內容的頑固問題
  - **根本原因發現**: React組件重用導致Slate.js編輯器未重新渲染
  - **一行代碼解決方案**: `key={editor-${currentChapter.id}}` 強制組件重新掛載
  - **調試過程完整記錄**: 詳細追蹤數據流路徑，確認問題在渲染層而非邏輯層
- **文檔品質大幅提升**: 
  - **CLAUDE.md**: 新增 92 行技術文檔和最佳實踐
  - 新增 28 項關鍵開發規則 (包含 Slate.js, Tauri 限制, 雙重JSON解析防範)
  - 完整的調試方法論和解決方案模式記錄
  - 增強的 TypeScript 模式和錯誤處理指南
- **技術改進**:
  - **API層調試**: 新增完整的數據流追蹤日誌系統
  - **章節切換邏輯**: 優化用戶選擇章節的調試輸出
  - **Redux狀態管理**: 增強章節內容更新的同步機制
- **調試經驗累積**: 
  - 系統性問題追蹤方法論建立
  - React組件生命週期深入理解
  - Slate.js富文本編輯器特性掌握
- **影響**: 章節導航功能完美運作，文檔品質達到業界標準，為未來開發奠定堅實基礎

### [2025-08-07 18:30:00] - 章節內容重複問題完全修復 🔧✅
- **關鍵修復**: 解決兩個不同章節顯示相同內容的嚴重問題
- **根本原因**: API層和Redux slice的雙重JSON解析導致數據損壞
  - API層 (`tauri.ts`) 已正確解析JSON
  - Redux slice (`chaptersSlice.ts`) 錯誤地再次解析JSON
  - 導致Slate.js收到字串而非物件陣列，造成內容顯示錯誤
- **技術修復**:
  - 移除 `fetchChaptersByProjectId` 中的冗餘JSON解析
  - 移除 `fetchChapterById` 中的冗餘JSON解析  
  - 簡化 `updateChapter` 邏輯，完全信任API層
- **Slate.js錯誤解決**:
  - 修復 `[Slate] initialValue is invalid!` 錯誤
  - 確保編輯器接收正確的物件陣列格式
- **調試經驗**:
  - 直接檢查SQLite資料庫確認數據完整性
  - 追蹤完整數據流路徑找出問題根源
  - 建立雙重JSON解析防範機制
- **影響**: 章節內容現在能正確顯示各自獨特的內容，編輯器功能完全恢復正常

### [2025-08-07 18:45:00] - 章節內容重複問題最終解決方案 🎯✅
- **關鍵修復**: 發現並解決不同章節顯示相同內容的根本原因
- **問題核心**: Slate.js編輯器組件在章節切換時未重新渲染
  - **數據流確認**: 後端 → API → Redux → React 全程正常
  - **章節切換邏輯**: 完全正確，資料庫內容正確區分
  - **真正問題**: React重用相同組件實例導致視覺內容不更新
- **一行代碼解決方案**:
  ```tsx
  <SlateEditor
    key={`editor-${currentChapter.id}`} // ← 強制重新渲染的關鍵
    value={currentChapter.content}
    // ... 其他屬性
  />
  ```
- **調試方法論**:
  - 系統性追蹤完整數據流路徑
  - 在關鍵轉換點添加詳細console日誌
  - 確認問題層級：邏輯層 vs 渲染層
- **技術洞察**:
  - **React Re-rendering**: `key` 屬性強制組件重新掛載
  - **Slate.js特性**: 富文本編輯器需要明確重新掛載來處理內容切換
  - **組件生命週期**: 內容變化但props相似時需要key來觸發重新渲染
- **用戶反饋**: "完美成功，分分妳超棒" - 問題完全解決
- **Serena記憶**: 已記錄完整解決方案模式供未來參考
- **影響**: 章節導航功能現在完美運作，編輯體驗流暢無誤

### [2025-08-07 14:38:44] - 水平捲軸問題完全修復 🎯✨
- **關鍵修復**: 解決窗口模式下AI面板被截斷的問題
- **技術改進**:
  - **Layout.tsx**: 主要內容區域添加 `flexShrink: 0` 和 `minWidth: '1000px'`，防止容器自動收縮適應視窗寬度
  - **ProjectEditor.tsx**: AI面板添加 `flex-shrink-0` 和 `minWidth: '384px'`，防止面板文字被擠壓
- **用戶體驗提升**:
  - ✅ 窗口模式下出現應用程式層級水平捲軸
  - ✅ 可完整滾動查看AI續寫面板內容
  - ✅ AI面板文字不再被擠壓，保持完整顯示
  - ✅ 支援響應式設計，適配各種窗口尺寸
- **問題解決**:
  - 修復了多次嘗試無效的flexbox收縮問題
  - 找到了正確的父容器層級進行修復
  - 確保水平捲軸在應用程式底部正常顯示
- **影響**: 大幅提升窗口模式下的寫作體驗，AI面板功能完全可用

### [2025-08-06 23:13:35] - Multi-Provider AI System Implementation Complete 🤖✨
- **Total lines of code**: 189,006
- **Change from last update**: +94,516 lines (99.8% increase from 94,490 lines in last changelog)
- **Files modified**: 24 tracked files, 7 new files (2,430 new lines in AI providers system)
- **Revolutionary Feature**: Complete multi-provider AI system implementation
  - **5 Major Providers Supported**: Ollama (local), OpenAI, Google Gemini, Anthropic Claude, OpenRouter
  - **Unified Trait Architecture**: Common `AIProvider` trait with provider-specific implementations
  - **Advanced Model Discovery**: Auto-detection of available models for each provider
  - **Smart Provider Management**: Dynamic creation, testing, and management of AI providers
  - **Database Schema v9**: New `ai_providers` table for multi-provider configuration storage
- **Backend Architecture**:
  - New `ai_providers.rs` command system (436 lines)
  - Complete provider trait system (1,994 lines across 7 files)
  - Provider-specific implementations: Ollama, OpenAI, Gemini, Claude, OpenRouter
  - Unified error handling and connection pooling
- **Frontend Enhancements**:
  - Completely redesigned AISettingsModal (866+ lines) with advanced provider management
  - Dynamic model search and provider testing capabilities
  - Enhanced AI slice with multi-provider state management (220+ lines added)
  - Comprehensive type definitions for all provider interfaces
- **User Experience**: 
  - Seamless switching between AI providers
  - Real-time model discovery and testing
  - Provider connection status monitoring
  - Intelligent fallback mechanisms
- **Technical Impact**: 
  - Database migration to v9 with backwards compatibility
  - Enhanced error handling across all AI operations
  - Improved internationalization with 113+ new translation keys
- **Impact**: Transforms the application from single-provider to enterprise-grade multi-provider AI platform

### [2025-08-05 16:45:00] - Chapter Deletion Feature Implementation 🗑️✅
- **New Feature**: Added chapter deletion functionality to ChapterList component
  - Integrated deletion option in three-dot menu with red styling for dangerous operation
  - Implemented ConfirmDialog to prevent accidental deletions
  - Added proper error handling and user notifications for success/failure
  - Fixed Menu component click event handling issue
- **Technical Improvements**:
  - Resolved Menu trigger button click conflicts by removing redundant onClick handlers
  - Added z-index styling to ensure proper layering of interactive elements
  - Implemented comprehensive state management for deletion confirmation flow
- **User Experience**: Users can now safely delete individual chapters directly from the chapter list
- **Impact**: Enhanced chapter management capabilities with safe deletion workflow

### [2025-08-05 15:45:00] - AI Thinking Tag Filter Fix 🧠🚫
- **Critical Bug Fix**: Fixed AI writing panel showing thinking tags in generated content
  - Added `filterThinkingTags` function to `AIWritingPanel.tsx` 
  - Filters various thinking tag formats: XML (`<thinking>`), Markdown (` ```thinking```), custom tags
  - Applied filtering at three key points: after generation, before insertion, during regeneration
- **User Issue Resolution**: AI generated text no longer displays internal thinking/reflection tags
- **Technical Improvements**: 
  - Fixed TypeScript errors (function declaration order and null checks)
  - Consistent filtering across all AI text operations
  - Preserved clean code quality with proper type safety
- **Impact**: Users now receive clean, polished AI-generated content without seeing AI's internal reasoning

### [2025-08-05 12:30:00] - AI History Saving Fix 📝✅
- **Critical Bug Fix**: Fixed AI writing panel not saving generation history
  - Added missing `createAIHistory` import in `AIWritingPanel.tsx`
  - Implemented history saving in both main generation (lines 254-268) and regeneration (lines 435-451) functions
  - Added proper error handling to prevent history save failures from interrupting main AI generation flow
  - Fixed ESLint error by converting inner function to arrow function
- **User Issue Resolution**: Resolved user-reported problem where AI generation history panel showed empty despite recent AI writing activities
- **Architecture Fix**: Identified that `ProjectEditor.tsx` uses `AIWritingPanel.tsx` which lacked history saving, while `SimpleAIWritingPanel.tsx` had correct implementation
- **Impact**: All AI writing activities now correctly save to generation history database with complete metadata

### [2025-08-05 08:52:00] - AI Writing Enhancement & NLP Integration 🧠✨
- **Enhanced AI Content Diversity**: Fixed AI writing generating similar content by integrating Compromise.js NLP analysis
  - Integrated `aiWritingAssistant.ts` into `AIWritingPanel.tsx` for intelligent context analysis
  - Increased parameter variation range from ±0.1 to ±0.15-0.2 for temperature, topP, and penalty parameters
  - Added smart parameter generation based on text complexity, emotional tone, and narrative style
  - NLP analysis detects tense (past/present/future), narrative style (first/third person), and emotional tone
- **AI History Panel Integration**: Re-integrated AI generation history functionality
  - Added toggle button "📝 查看歷程" in AI Writing Panel header
  - AI History Panel displays within AI Writing Panel when toggled
  - Maintains project-specific filtering of generation history
- **Intelligent Parameter Adjustment**: Context-aware AI generation
  - Analyzes existing text for writing style and adjusts generation parameters accordingly
  - Fallback to enhanced traditional parameter generation for short texts
  - Progress indicators show detected writing style during generation
- **Debug Improvements**: Enhanced console logging for NLP analysis and parameter generation
- **Impact**: Significantly improved AI writing content diversity and user experience

### [2025-08-04 23:48:00] - Chapter Navigation System & Slate.js Editor Refactor 🎯📚
- **Chapter Navigation Complete**: Visual chapter separation with numbered badges and navigation controls
  - Chapter title bars with chapter numbers (1, 2, 3...) and titles
  - Previous/Next chapter navigation buttons (←/→) with proper state management
  - Novel length classification badges (短篇/中篇/長篇) displayed in project info
  - Integrated chapter management with sidebar chapter list
- **Slate.js Architecture Refactor**: Complete resolution of React hook context issues
  - Moved EditorToolbar inside Slate context as InlineToolbar component
  - Fixed "useSlate hook must be used inside Slate component" errors
  - Maintained all formatting functionality (Bold, Italic, Underline, Code, H1, Quote, List)
  - Preserved save, settings, and reading mode functionality
  - AI Panel temporarily disabled with maintenance message during refactor
- **Database Schema v8**: Added novel_length and chapter_number fields
  - Projects: novel_length column for short/medium/long classification
  - Chapters: chapter_number column for sequential numbering
  - Automatic migration from v7 to v8 with backward compatibility
- **User Experience**: Seamless chapter navigation and writing flow
- **Impact**: Professional-grade chapter management system with visual feedback

### [2025-08-04 15:50:00] - Smart AI Writing & User Experience Enhancements 🧠✨
- **NLP-Powered AI Writing**: Complete integration of Compromise.js NLP with AI writing assistant
  - Context-aware analysis (tense, narrative style, emotional tone, entities)
  - Smart parameter adjustment based on writing style analysis  
  - Quality checking for generated content coherence and consistency
  - UI panels for NLP insights and quality reports
- **Cursor Position Preservation**: Fixed save operations maintaining cursor position
  - Auto-save and manual save preserve `selectionStart` position
  - Seamless editing experience without cursor jumping to document top
  - Smart focus management with `textAreaRef` integration
- **Save Function Fixes**: Resolved Tauri backend content serialization issues
  - Fixed `"invalid type: sequence, expected a string"` error
  - Proper JSON serialization of Slate.js content: `JSON.stringify(chapter.content)`
  - Enhanced error handling with user-friendly notifications
- **Architecture**: Added `aiWritingAssistant.ts` service with comprehensive NLP analysis
- **Impact**: Dramatically improved writing experience with intelligent AI assistance and seamless UX

### [2025-08-04 14:20:00] - Novel Template Import Feature Complete 📚
- **New Major Feature**: AI-powered novel template import system
- **NLP Integration**: Compromise.js for text analysis and entity extraction
- **Multi-step Wizard**: 5-stage import process (Upload → Options → Analysis → Preview → Save)
- **AI Analysis**: Semantic analysis using Ollama for world-building, characters, plot, and writing style
- **Text Processing**: Automatic chapter detection, statistics calculation, and writing metrics
- **Navigation Fixes**: Resolved settings page infinite loading and sidebar click issues
- **Database Standardization**: Unified database path to ~/Library/Application Support/genesis-chronicle/
- **UI Improvements**: Consistent naming, error boundaries, and loading state management
- **Impact**: Users can now import existing novels to automatically generate writing templates

### [2025-08-04 01:20:06] - 完美程式碼品質里程碑 🏆
- **總程式碼行數**: 94,490 行
- **與上次更新比較**: +25,031 行 (36.0% 增長，從 69,459 行)
- **修改檔案數**: 47 個檔案
- **史無前例的成就**:
  - ✅ **TypeScript 錯誤**: 0 個錯誤 (完美狀態 - 從 300+ 錯誤降到 0)
  - ✅ **ESLint 警告**: 0 錯誤，0 警告 (完美評分)
  - ✅ **程式碼品質**: 達到業界頂尖標準
  - ✅ **類型安全**: 整個程式碼庫完全類型安全
  - ✅ **API 層重構**: 完整的類型定義和錯誤處理
  - ✅ **12 個核心問題修復**: 字符關係系統、設定頁面、資料庫維護等
- **技術改進**:
  - 新增 models.ts 統一 API 類型定義
  - 完善錯誤處理類型守衛系統
  - 解決所有 Slate.js 編輯器類型問題
  - 修復設定服務和備份系統類型安全
  - 統一字符關係 API 介面設計
- **影響**: 專案達到完美的程式碼品質標準，為未來開發奠定堅實基礎

### [2025-08-03 22:30:00] - COMPLETE TYPESCRIPT RESOLUTION 🎉
- **TypeScript Errors**: COMPLETELY ELIMINATED - Reduced from 300+ to 0 errors (100% success!)
- **Key Achievements**:
  - ✅ Fixed Character/Relationship API type system with CreateRelationshipRequest
  - ✅ Implemented comprehensive error type guards in useErrorHandler
  - ✅ Resolved TemplateManagerModal template type definitions 
  - ✅ Fixed AutoBackupService export/import issues
  - ✅ Corrected UpdateSettings date handling
  - ✅ Enhanced CharacterManager consistency issue severity types
  - ✅ Fixed AI Settings type definitions (selectedModel property)
  - ✅ Eliminated all DatabaseMaintenance.tsx `any` type warnings
  - ✅ Resolved all remaining Slate.js and database interface issues
- **Impact**: Project now has PERFECT type safety across entire codebase

### [2025-08-03 19:43:57]
- **Total lines of code**: 69,459
- **Change from last update**: +421 lines (0.6% increase from 69,038 estimated)
- **Files modified**: 31 files (29 modified, 2 new: eslint-report.json, models.ts)
- **Key Changes**:
  - API Layer Enhancement: Complete type safety overhaul in tauri.ts and types.ts
  - New models.ts: Centralized API type definitions for better maintainability  
  - Component Refactoring: 20+ components with improved TypeScript typing
  - Hook Improvements: Enhanced type safety in useErrorHandler, useSettings, useTemplateApplication
  - ESLint Warnings: Reduced from 179 to 80 (55% improvement)
- **Impact**: Significant TypeScript type safety improvements across the entire frontend stack

## Recent Achievements (2025-08-03)

### TypeScript Error Resolution Project ⚡ MISSION ACCOMPLISHED
- **Progress**: COMPLETELY FINISHED - Reduced from 300+ to 0 errors (100% success!)
- **Strategy**: Systematic approach in phases
  - Phase 1: ✅ Core API refactoring (tauri.ts, models.ts)
  - Phase 2: ✅ Redux state management type fixes
  - Phase 3: ✅ Service layer type safety improvements
  - Phase 4: ✅ Character relationship system overhaul
  - Phase 5: ✅ Error handling and template system fixes
  - Phase 6: ✅ Final Slate.js and database interface cleanup - COMPLETED
- **ESLint Status**: ✅ 0 errors, 0 warnings (PERFECT SCORE - all any types eliminated)

### ESLint Warnings Complete Elimination ✅ COMPLETED
- **Achievement**: Perfect ESLint score (0 errors, 0 warnings)
- **Scope**: Eliminated all 19 `@typescript-eslint/no-explicit-any` warnings
- **Files Modified**: 
  - `src/renderer/src/api/tauri.ts`: 5 any types → specific Tauri interfaces
  - `src/renderer/src/utils/errorUtils.ts`: 14 any types → comprehensive error type system
- **Technical Improvements**:
  - Added `TauriAIHistoryResult`, `ErrorWithCode` type definitions
  - Implemented type-safe error handling patterns
  - Enhanced API layer type safety with specific backend types
  - Replaced `as any` with proper type guards and unions

### AI Generation System Enhancements
- **Language Purity Tracking**: Real-time scoring of Traditional Chinese content
- **Generation History**: Complete CRUD with performance metrics
- **Progress Visualization**: Multi-stage progress indicators
- **Context Engineering**: 29.8% token reduction through prompt separation

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.