# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start with Serena MCP

**⚠️ ULTRA IMPORTANT**: This project **REQUIRES** **Serena MCP** for optimal development experience. Always start by checking onboarding status:

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
**Latest Updates** (2025-08-09): ✅ Phase 2 Plot Analysis Engine Complete - Advanced NLP-driven story analysis with 6-tab interface, conflict detection, pacing analysis, foreshadowing tracking, and AI-powered improvement suggestions
**Code Quality**: ✅ Rust: Clean | ✅ TypeScript: 0 errors (100% FIXED - from 300+ to 0!) | ✅ ESLint: Critical errors fixed
**Critical Fixes**: ✅ Chapter Rendering (Slate.js key prop) | ✅ Double JSON Parsing | ✅ Window Mode Scrolling
**AI Providers**: 🦙 Ollama (Local) | 🤖 OpenAI | ✨ Google Gemini | 🧠 Anthropic Claude | 🔄 OpenRouter
**Key Features**: ✅ Multi-Provider AI System | ✅ Advanced Model Search | ✅ Chapter Navigation | ✅ Novel Length Classification | ✅ Template Import Wizard | ✅ NLP Text Processing | ✅ Context-Aware AI Writing | ✅ **Plot Analysis Engine** | ✅ **EPUB Generation System**

## Essential Commands

### Development
```bash
npm run dev                # Start Tauri development
npm run dev:renderer       # Start only frontend (Vite dev server)
npm run lint               # Run ESLint with auto-fix
npm run lint -- --fix     # Auto-fix ESLint errors where possible
cargo check --manifest-path src-tauri/Cargo.toml  # Check Rust
npx tsc --noEmit          # Check TypeScript
npm list epub-gen-memory  # Verify EPUB dependencies installed
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

### Security & Release
```bash
./scripts/security-check.sh               # MANDATORY before any release - checks for API keys, database files, user content
git ls-files | grep -E '\.(db|sqlite)'   # Verify no database files are tracked
npm run build && ls -la dist/             # Check build output for sensitive data
```

### Troubleshooting
```bash
# When encountering build issues
npm run clean && npm install              # Clean and reinstall dependencies
cargo clean --manifest-path src-tauri/    # Clean Rust build cache

# When database schema changes
rm ~/Library/Application\ Support/genesis-chronicle/genesis-chronicle.db  # Reset database (macOS)
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
- **Database**: Migration system (current v10) with `ai_providers` and `epub_exports` tables for multi-provider support and EPUB generation history
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
- **Plot Analysis Engine**: Advanced NLP-driven story analysis with 6-tab interface (conflict detection, pacing analysis, foreshadowing tracking, improvement suggestions, chapter trends)
- **EPUB Generation System**: Complete EPUB 3.0 compliant e-book generation with Slate.js to HTML conversion, professional styling, and export history tracking

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
SQLite with versioned migrations (current: v10) following strict patterns:

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
├── AI/                 # AI generation features & plot analysis
├── Characters/         # Character management
├── Templates/          # Novel templates & template import wizard
├── Projects/           # Project management
└── Settings/           # Application settings

# Key AI & Analysis System Files:
src/renderer/src/utils/
└── nlpUtils.ts               # Core NLP functions (368+ lines of plot analysis)

src/renderer/src/services/
├── novelParserService.ts      # Novel text parsing & chapter extraction
├── novelAnalysisService.ts    # AI-powered semantic analysis
└── plotAnalysisService.ts     # Plot analysis service layer (221 lines)

src/renderer/src/components/AI/
├── PlotAnalysisPanel.tsx     # 6-tab plot analysis interface (445 lines)
└── AIWritingPanel.tsx        # AI generation panel

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

### EPUB Generation Architecture (Production Ready - 2025-08-09)
Complete e-book generation system with enterprise-grade features:

**Core Components**:
- `src-tauri/src/commands/epub.rs`: Main EPUB generation backend (637 lines)
- `src/renderer/src/services/epubService.ts`: Frontend service layer with progress tracking
- `src/renderer/src/components/Modals/EPubGenerationModal.tsx`: Complete UI workflow

**Technical Implementation**:
```rust
// EPUB 3.0 compliant ZIP structure generation
generate_epub_file() -> Creates:
├── mimetype (uncompressed, EPUB standard requirement)
├── META-INF/container.xml (EPUB container definition)
└── OEBPS/ (content directory)
    ├── content.opf (package manifest)
    ├── toc.ncx (navigation control)
    ├── styles.css (responsive styling)
    ├── cover.xhtml (professional cover page)
    └── chapter*.xhtml (converted content)
```

**Slate.js to HTML Conversion**:
```rust
// Recursive conversion supporting all editor formats
slate_to_html_recursive() supports:
- Text formatting: bold, italic, underline
- Elements: paragraph, heading-one/two/three, block-quote
- Lists: bulleted-list, numbered-list, list-item
- Preserves Chinese typography and spacing
```

**Database Integration** (v10 schema):
```sql
-- Complete export history tracking
epub_exports table with:
- Export metadata and file paths
- Format settings JSON storage
- Creation and download timestamps
- Automatic cleanup on project deletion
```

**User Experience Flow**:
1. "📚 傳說編纂" button in Dashboard QuickActions
2. Project validation (chapters, content completeness)
3. Format options (fonts, cover, author settings)
4. Real-time progress tracking (preparing→converting→generating→complete)
5. Automatic download folder delivery with size formatting

### Plot Analysis Engine Architecture (Production Ready - 2025-08-09)
Advanced NLP-driven story analysis system with enterprise-grade features:

**Core Components**:
- `src/renderer/src/utils/nlpUtils.ts`: NLP analysis core with 368+ lines of plot analysis functions
- `src/renderer/src/services/plotAnalysisService.ts`: Service layer for plot analysis operations
- `src/renderer/src/components/AI/PlotAnalysisPanel.tsx`: Complete 6-tab analysis interface

**Technical Implementation**:
```typescript
// Core NLP Analysis Functions
detectConflictPoints() -> Identifies:
- Internal conflicts (self-doubt, moral dilemmas)
- External conflicts (obstacles, antagonists)
- Interpersonal conflicts (relationship tensions)
- Societal conflicts (system vs. individual)

analyzePace() -> Evaluates:
- Sentence length patterns
- Dialogue-to-narrative ratios
- Action verb density
- Event density per segment

trackForeshadowing() -> Tracks:
- Setup elements (hints, prophecies, symbols)
- Payoff connections (resolution matches)
- Orphaned setups (unresolved foreshadowing)
```

**Analysis Interface**:
1. 📊 **Overview** - Overall plot score and core metrics
2. ⚔️ **Conflicts** - Conflict detection with intensity ratings
3. 🎵 **Pace** - Rhythm analysis with segment breakdowns
4. 🔮 **Foreshadowing** - Setup/payoff tracking with orphan warnings
5. 💡 **Suggestions** - AI-generated improvement recommendations
6. 📈 **Trends** - Cross-chapter plot development analysis

**User Experience Flow**:
1. Dashboard → "🧠 進階功能" button
2. Project selection modal with feature overview
3. ProjectEditor auto-opens analysis panel (`?plotAnalysis=true`)
4. Analysis scope selection (current chapter/entire project)
5. Real-time NLP processing with progress indicators
6. Interactive results with actionable suggestions

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
29. **Settings Page Organization**: Settings now streamlined - old duplicate AI settings removed, cosmic theme applied consistently throughout all settings tabs
30. **Template CSS Theme Pattern**: Always apply complete cosmic theme to Template components - change `bg-white` to `bg-cosmic-800`, `text-gray-900` to `text-white`, ensure button contrast with `bg-gold-600` + `text-cosmic-900`
31. **Redux Selector Memoization**: Use `createSelector` from `@reduxjs/toolkit` for complex selectors to prevent "different result with same parameters" warnings and improve performance
32. **Security First**: ALWAYS run `./scripts/security-check.sh` before any release or commit that includes new features - this prevents API key leaks and user data exposure
33. **AI Context Integration**: New multi-provider AI system requires `position` parameter for context-aware generation - always pass cursor position from frontend to enable context building
34. **Smart Model Selection**: Preserve user model choices - only auto-select when necessary, never override user selections
35. **Scrollbar UI Pattern**: Use `force-scrollbar` class for consistent gold-themed scrollbars that always display - critical for statistics pages and long content areas
36. **Statistics Data Flow**: Statistics service uses real database data through unified API layer - never mock data in production, always use `await` for async data fetching
37. **EPUB Generation**: Always use the unified `api.epub` interface for EPUB operations - the system supports complete EPUB 3.0 standard with automatic Slate.js conversion and export history tracking
38. **Plot Analysis Engine**: Always use `plotAnalysisService` for story analysis - supports both single chapter and full project analysis with NLP-driven conflict detection, pacing analysis, and foreshadowing tracking

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
- **Path Issues**: Database location is `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db` on macOS (NOT in project directory for security)
- **Double JSON Parsing**: CRITICAL - Never parse JSON in Redux if API layer already handles it
  - **Symptom**: Slate.js shows "[{\"type\":\"paragraph\"..." instead of content
  - **Cause**: API layer parses JSON, Redux slice parses again, corrupts data
  - **Fix**: Trust API layer completely - remove JSON.parse() from Redux slices

### Multi-Provider AI Context Issues (Fixed 2025-08-08)
- **Issue**: New AI models not capturing context for continuation writing
- **Root Cause**: `generate_ai_text` command missing context building functionality that `generate_with_context` had
- **Fix**: Added position-aware context building to new multi-provider system
- **Pattern**: Always pass `position` parameter from frontend to enable context construction
- **Verification**: Look for "構建上下文，位置: X" and "上下文構建成功，長度: X 字符" in logs

### Model Selection Persistence (Fixed 2025-08-08)
- **Issue**: User-selected models automatically reset to first model after provider changes
- **Root Cause**: Two places with auto-selection logic that didn't preserve user choices
- **Fix**: Smart selection logic - preserve user choice if model still available, only auto-select when no current model
- **Files**: `AIWritingPanel.tsx` and `aiSlice.ts` with `modelList.includes(currentModel)` checks

### Ollama Integration
- **Service URL**: `http://127.0.0.1:11434`
- **Parameter**: Use `num_predict` not `max_tokens`
- **Timeouts**: Client 300s, API 120s
- **Model**: Default is llama3.2

### UI State Management
- **React Updates**: Use functional setState: `setState(prev => ...)`
- **Auto-scroll**: Call `scrollIntoView()` after AI generation
- **Scrollbars**: Gold-themed 16px with `!important` CSS overrides - use `force-scrollbar` class for always-visible scrollbars
- **Settings Page**: Use cleanup functions in useEffect to prevent infinite loading
- **Navigation Issues**: Settings accessible via Settings → 模板管理 (Template Management)
- **Statistics Page Scrolling**: Use container-level `h-screen overflow-y-scroll force-scrollbar pb-16` for full-page scrollable statistics with proper bottom padding

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

// TypeScript Type Assertion Pattern (Fixed 2025-08-08)
// ✅ Correct: Explicit type conversion for complex inference
const modelList = models as string[];
if (currentModel && modelList.includes(currentModel)) {
  // Type-safe operation
}

// ❌ Wrong: Let TypeScript infer complex types - causes 'never[]' errors
if (currentModel && models.includes(currentModel)) {
  // TypeScript inference fails here
}

// Statistics Service Async Pattern (Fixed 2025-08-09)
// ✅ Correct: Proper async/await for statistics data
static async getOverallStatistics(): Promise<OverallStatistics> {
  try {
    const projectStats = await this.getProjectStatistics();
    const recentActivity = await this.generateRecentActivity(); // ← Must await async call
    return { /* ... */ recentActivity };
  } catch (error) {
    console.error('獲取整體統計失敗:', error);
    return defaultStats;
  }
}

// ❌ Wrong: Missing await causes 'reduce is not a function'
const recentActivity = this.generateRecentActivity(); // Returns Promise, not array
recentActivity.reduce(...); // TypeError: reduce is not a function

// Scrollbar Pattern for Full-Page Content
// ✅ Correct: Statistics page with proper scrolling
<div className="p-8 h-screen overflow-y-scroll force-scrollbar pb-16">
  {/* Statistics content */}
</div>

// ❌ Wrong: Missing height constraints or force-scrollbar
<div className="p-8">
  {/* Content may not scroll properly */}
</div>
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

### Scrollbar System Architecture (CSS)
The project includes a sophisticated scrollbar system in `src/renderer/src/index.css`:

```css
/* Standard gold-themed scrollbar */
.custom-scrollbar {
  scrollbar-width: thick;
  scrollbar-color: rgba(251, 191, 36, 1) rgba(10, 17, 40, 0.9);
}

/* Force-display scrollbar (always visible) */
.force-scrollbar {
  overflow-y: scroll !important;
  /* Inherits gold styling with 16px width */
}

/* Editor-specific scrollbar with enhanced styling */
.editor-scroll-container {
  scrollbar-width: thick !important;
  /* Enhanced gold gradient effects */
}
```

**Usage Patterns**:
- **Statistics Pages**: Use `force-scrollbar` for always-visible scrolling
- **Long Content Lists**: Use `custom-scrollbar` for conditional scrolling  
- **Editor Areas**: Use `editor-scroll-container` for enhanced styling
- **Full-Page Scrolling**: Combine with `h-screen overflow-y-scroll pb-16`

## Recent Major Updates

### [2025-08-09 Latest] - Plot Analysis Engine Complete Implementation 🎭✨
- **Phase 2 Complete**: Advanced NLP-driven story analysis system with enterprise-grade features
- **Core Architecture**: 1000+ lines of code across NLP core (368 lines), service layer (221 lines), and UI interface (445 lines)
- **6-Tab Analysis Interface**: Overview, conflicts, pace, foreshadowing, suggestions, and chapter trends
- **Dashboard Integration**: "進階功能" card fully enabled with project selection modal and auto-navigation
- **NLP Technology**: Compromise.js integration for Chinese text analysis, conflict detection, and foreshadowing tracking
- **Impact**: Writers can now perform professional-grade story analysis with actionable improvement suggestions

### [2025-08-09] - EPUB Generation Complete Implementation 📚✨
- **Production Ready EPUB System**: Complete EPUB 3.0 compliant e-book generation from Slate.js content
- **Enterprise Architecture**: 800+ lines of production code (Rust backend + TypeScript frontend)
- **Database v10 Migration**: New `epub_exports` table for complete export history tracking
- **Professional Features**: Custom styling, cover generation, progress tracking, format validation
- **Performance**: <2 seconds generation time, optimized ZIP compression, automatic cleanup
- **Impact**: Users can now export novels as professional EPUB e-books with one-click workflow

### [2025-08-09] - Statistics Page Complete Fix 📊✨
- **Statistics Data Display**: Fixed all data showing as 0 - corrected API import and async data fetching
- **Gold Scrollbar Implementation**: Added `force-scrollbar` system for consistent UI scrolling experience
- **Container Scrolling**: Implemented proper full-page scrolling with `h-screen overflow-y-scroll pb-16`
- **Database Integration**: Statistics now use real project data from SQLite with proper error handling
- **Impact**: Statistics page now displays accurate data (1 project, 4 chapters, 2.5K words, 4 characters) with beautiful gold scrollbars

### [2025-08-08 Latest] - AI Context & Model Selection Critical Fixes 🎯🤖
- **AI Context Recovery**: Fixed new multi-provider AI models unable to capture context for continuation writing
- **Smart Model Selection**: Implemented user-preference preservation - models stay selected across provider switches  
- **TypeScript Type Safety**: Fixed complex type inference issues with explicit type assertions
- **Impact**: All 5 AI providers now fully support context-aware writing with preserved user selections

### [2025-08-08 01:47:00] - Settings System Complete Optimization ✅🎯
- **Complete Settings System Overhaul**: Comprehensive optimization with duplicate removal
- **UI Theme Unification**: Template Import Wizard fully converted to cosmic theme
- **Redux Performance**: Fixed `selectFilteredAndSortedTemplates` selector memoization
- **Impact**: Perfect settings experience with streamlined UI

### [2025-08-07 21:35:58] - 章節內容重複問題根本修復 🎯📚
- **關鍵修復**: 最終解決不同章節顯示相同內容的頑固問題
- **根本原因發現**: React組件重用導致Slate.js編輯器未重新渲染
- **一行代碼解決方案**: `key={editor-${currentChapter.id}}` 強制組件重新掛載
- **影響**: 章節導航功能完美運作，編輯體驗流暢無誤

### [2025-08-06 23:13:35] - Multi-Provider AI System Implementation Complete 🤖✨
- **Revolutionary Feature**: Complete multi-provider AI system implementation
- **5 Major Providers Supported**: Ollama (local), OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **Database Schema v9**: New `ai_providers` table for multi-provider configuration storage
- **Impact**: Transforms the application from single-provider to enterprise-grade multi-provider AI platform

### [2025-08-04 01:20:06] - 完美程式碼品質里程碑 🏆
- **史無前例的成就**:
  - ✅ **TypeScript 錯誤**: 0 個錯誤 (完美狀態 - 從 300+ 錯誤降到 0)
  - ✅ **ESLint 警告**: 0 錯誤，0 警告 (完美評分)
  - ✅ **程式碼品質**: 達到業界頂尖標準
- **影響**: 專案達到完美的程式碼品質標準，為未來開發奠定堅實基礎

## Key Achievements

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
- **Multi-Provider Context Fixes (2025-08-08)**: Fixed context building in new multi-provider system - all providers now support position-aware context generation
- **Smart Model Selection (2025-08-08)**: Implemented user-preference preservation - models stay selected across provider switches

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.