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

創世紀元：異世界創作神器 (Genesis Chronicle) - A Tauri-based AI-powered novel writing application for Chinese light novel creation. Built with Rust backend and React frontend, integrating Ollama for local AI assistance.

**Architecture**: Pure Tauri v2.7.0 (v1.0.0+) - 300% faster startup, 70% less memory, 90% smaller size
**Latest Updates** (2025-08-03): TypeScript Error Resolution Complete, AI Generation History, Progress Visualization, Language Purity Control
**Code Quality**: ✅ Rust: Clean | ✅ TypeScript: 0 errors | ✅ ESLint: 0 warnings, 0 errors

## Essential Commands

### Development
```bash
npm run dev                # Start Tauri development
npm run lint               # Run ESLint with auto-fix
cargo check --manifest-path src-tauri/Cargo.toml  # Check Rust
npx tsc --noEmit          # Check TypeScript
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
- **Commands**: Feature-organized handlers in `src/commands/` (system, project, chapter, character, ai, context, settings, database, ai_history)
- **Database**: Migration system (current v7) with automatic schema updates
- **Services**: Ollama integration for AI text generation
- **Utils**: Language purity enforcement, text processing utilities

### Frontend (`src/renderer/`)
**Stack**: React 18 + TypeScript + Redux Toolkit + Tailwind CSS
- **Editor**: Slate.js for rich text editing with custom formatting
- **State Management**: Redux slices for projects, chapters, characters, ai, aiHistory, templates, settings, ui, error, editor, notification
- **Theme**: Cosmic dark theme (`bg-cosmic-950`) with gold accents (`text-gold-400`)
- **i18n**: JSON-based translations with Traditional Chinese (zh-TW) as primary language

### Key Features
- **Context Engineering**: Separated prompts achieve 29.8% token reduction (SystemPromptBuilder + UserContextBuilder)
- **Language Purity**: Regex-based enforcement for Traditional Chinese only content
- **AI Progress Visualization**: Multi-stage progress tracking (preparing→generating→processing→complete)
- **AI Generation History**: Complete CRUD operations with timestamp tracking

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
SQLite with versioned migrations (current: v7) following strict patterns:

**Migration Structure**:
```rust
// src-tauri/src/database/migrations.rs
pub fn migrate_to_v7(conn: &Connection) -> anyhow::Result<()> {
    conn.execute("CREATE TABLE ai_generation_history (...)", [])?;
    conn.pragma_update(None, "user_version", 7)?;  // Use pragma_update, NOT execute
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
├── Templates/          # Novel templates
├── Projects/           # Project management
└── Settings/           # Application settings
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

### Chinese Text Processing
- **Issue**: ASCII filters break Chinese characters
- **Fix**: Use `c.is_alphanumeric()` (Unicode-aware) in Rust

### Database Operations
- **Issue**: `SELECT *` causes field mapping errors
- **Fix**: Always specify field names explicitly
- **Schema Issues**: Delete DB file to force recreation with latest schema

### Ollama Integration
- **Service URL**: `http://127.0.0.1:11434`
- **Parameter**: Use `num_predict` not `max_tokens`
- **Timeouts**: Client 300s, API 120s
- **Model**: Default is llama3.2

### UI State Management
- **React Updates**: Use functional setState: `setState(prev => ...)`
- **Auto-scroll**: Call `scrollIntoView()` after AI generation
- **Scrollbars**: Gold-themed 16px with `!important` CSS overrides

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

// Slate.js type assertions for Editor.isBlock
match: (n) => Editor.isBlock(editor, n as any)
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
- **TypeScript**: ✅ 0 errors (strict mode)
- **ESLint**: ✅ 0 warnings, 0 errors

### TypeScript Quality Guidelines
- Avoid `any` types - use specific interfaces or unions
- Use type guards for runtime validation
- Leverage generic functions `<T>` for reusable code
- Employ strict null checks and optional chaining

### ESLint Configuration
Key rules in `.eslintrc.js`:
- `@typescript-eslint/no-explicit-any`: 'warn' (successfully eliminated all instances)
- Variables prefixed with `_` are ignored for unused-vars
- `react-hooks/exhaustive-deps`: Successfully resolved all warnings

## Change Log

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

### ESLint Warning Resolution Project ✅ COMPLETED
- **Progress**: Reduced from 179 to 0 warnings (100% completion)
- **Strategy**: Systematic approach in phases
  - Phase 1: Core API refactoring (tauri.ts, models.ts)
  - Phase 2: Utility function generification  
  - Phase 3: Edge case cleanup (hooks, i18n, components)
  - Phase 4: React hooks exhaustive-deps fixes
- **Result**: Zero ESLint warnings achieved with improved type safety

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