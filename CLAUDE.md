# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) - A Tauri-based AI-powered novel writing application for Chinese light novel creation. Built with Rust backend and React frontend, integrating Ollama for local AI assistance.

**Architecture**: Pure Tauri v2.7.0 (v1.0.0+) - 300% faster startup, 70% less memory, 90% smaller size
**Latest Updates** (2025-08-03): TypeScript Error Resolution Complete, AI Generation History, Progress Visualization, Language Purity Control
**Code Quality**: ✅ Rust: Clean | ✅ TypeScript: 0 errors | ⚠️ ESLint: 179 warnings (any type only)

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

## Critical Development Patterns

### ⚠️ MANDATORY Rules

1. **API Layer**: Always use `import { api } from './api'` - NEVER direct Tauri calls
2. **Redux**: Always use typed dispatch: `useDispatch<AppDispatch>()`
3. **Database**: Always use explicit field names in SQL - NEVER `SELECT *`
4. **Chinese Text**: Use Unicode-aware methods - NEVER ASCII-only filters
5. **PRAGMA**: Use `conn.pragma_update()` - NOT `conn.execute()`
6. **ESLint**: Variables prefixed with `_` are allowed to be unused

### Development Workflows

#### Adding New Tauri Command
1. Add command in `src-tauri/src/commands/*.rs`
2. Register in `src-tauri/src/lib.rs` invoke_handler
3. Add types to `src/renderer/src/api/types.ts`
4. Implement in `src/renderer/src/api/tauri.ts`

#### Adding Frontend Feature
1. Component in `src/renderer/src/components/[feature]/`
2. Redux slice in `src/renderer/src/store/slices/`
3. Translation keys in `src/renderer/src/i18n/locales/*.json`

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