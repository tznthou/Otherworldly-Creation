# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) - A Tauri-based AI-powered novel writing application for Chinese light novel creation. Built with Rust backend and React frontend, integrating Ollama for local AI assistance.

**Architecture**: Pure Tauri v2.7.0 (v1.0.0+) - 300% faster startup, 70% less memory, 90% smaller size
**Latest Updates** (2025-08-03): TypeScript Error Resolution Complete, AI Generation History, Progress Visualization, Language Purity Control
**Code Quality**: ✅ Rust: Clean | ✅ TypeScript: 0 errors | ⚠️ ESLint: 269 issues (mostly any type warnings)

## Quick Start

```bash
# Install dependencies and Tauri CLI
npm install && cargo install tauri-cli

# Start development environment
npm run dev

# Run diagnostics (may show legacy Electron warnings - can be ignored)
npm run diagnostic

# Key development commands for common tasks
cargo check --manifest-path src-tauri/Cargo.toml  # Check Rust compilation
npx tsc --noEmit                                   # Check TypeScript compilation
npm run lint                                       # Code quality checks
```

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

### Architecture

**Backend** (`src-tauri/`): Rust + Tauri v2.7.0 + SQLite (rusqlite)
- Commands: Feature-organized handlers
- Database: Migrations system (v7)
- Services: Ollama AI integration
- Utils: Language purity enforcement

**Frontend** (`src/renderer/`): React 18 + TypeScript + Redux Toolkit + Tailwind CSS
- Editor: Slate.js rich text
- Theme: Cosmic dark + gold accents
- i18n: JSON-based (zh-TW focus)

### Commands Summary

**Core APIs**: System, Projects, Chapters, Characters, AI Service, Database, Settings
**Context Engineering**: Separated prompts for 29.8% token reduction (zh-TW only)
**AI Features**: Ollama integration, history tracking, language purity control

### API Usage Pattern

```typescript
// Frontend code uses unified API interface
import { api } from './api';

// All API calls follow this pattern
const projects = await api.projects.getAll();
const version = await api.system.getAppVersion();
const aiStatus = await api.ai.checkOllamaService();
```

### Key Features

**Context Engineering**: SystemPromptBuilder + UserContextBuilder = 29.8% token savings
**Language Purity System**: Regex-based detection for Traditional Chinese enforcement
**AI Progress Visualization**: Real-time multi-stage tracking with animations
**AI Generation History**: Complete CRUD system with analytics preparation


### Database

**Tables**: projects, chapters, characters, character_relationships, ai_generation_history, settings
**Location**: `~/{AppData}/genesis-chronicle/genesis-chronicle.db`
**Migrations**: v7 (automatic via `migrations.rs`)
**⚠️ Critical**: Always use explicit field names in SQL queries

### Redux Store

**Slices**: projects, chapters, characters, ai, aiHistory, templates, settings, ui, error (with progress), editor, notification

## Critical Development Patterns

### ⚠️ MANDATORY Rules

1. **API Layer**: Always use `import { api } from './api'` - NEVER direct Tauri calls
2. **Redux**: Always use typed dispatch: `useDispatch<AppDispatch>()`
3. **Database**: Always use explicit field names in SQL - NEVER `SELECT *`
4. **Chinese Text**: Use Unicode-aware methods - NEVER ASCII-only filters
5. **PRAGMA**: Use `conn.pragma_update()` - NOT `conn.execute()`

### Key Patterns

**Error Handling**: SimpleErrorBoundary + Console filtering in main-stable.tsx
**UI Theme**: Cosmic dark (`bg-cosmic-950`) + Gold accents (`text-gold-400`)
**Entry Point**: `main-stable.tsx` (NOT App.tsx)
**i18n**: `useI18n()` hook with zh-TW default
**Progress**: Global system via errorSlice (preparing→generating→processing→complete)
**Scrollbars**: 16px gold-themed with `!important` CSS


## Development Workflows

### Adding New Tauri Command
1. Add command in `src-tauri/src/commands/*.rs`
2. Register in `src-tauri/src/lib.rs` 
3. Add to `src/renderer/src/api/types.ts` + `tauri.ts`

### Adding Frontend Feature
1. Component in `src/renderer/src/components/[feature]/`
2. Redux slice in `src/renderer/src/store/slices/`
3. Translation keys in `src/renderer/src/i18n/locales/*.json`

### AI Integration

**Setup**: Ollama service (`http://127.0.0.1:11434`) + llama3.2 model
**Context System**: 29.8% token savings with separated prompts (zh-TW only)
**Generation Flow**: Context → Clean → Generate (multi-temp) → Display
**Common Issues**: Database mapping, timeouts, UI state updates

## Common Issues & Solutions

### Chinese Text
- **Issue**: ASCII filters break Chinese characters
- **Fix**: Use `c.is_alphanumeric()` (Unicode-aware)

### Database
- **Issue**: `SELECT *` causes field mismatches
- **Fix**: Always use explicit field names
- **Schema Issues**: Delete DB file to reinitialize

### Ollama API
- **Parameter**: Use `num_predict` not `max_tokens`
- **Timeouts**: Set to 300s client, 120s API

### UI State
- **React Updates**: Use functional setState
- **Auto-scroll**: Use `scrollIntoView` after generation
- **Scrollbars**: Apply `!important` CSS to override Tailwind

### Build & Config
- **CSP**: Disabled in tauri.conf.json
- **ESLint**: Use `@typescript-eslint/recommended`
- **Rust**: Use snake_case for parameters

## Code Quality & Debugging

### TypeScript Compilation
- **Status**: ✅ All 31 TypeScript errors resolved (100% success rate)
- **Key Fixes**: SlateEditor type assertions, API interface mismatches, character slice parameters
- **Check Command**: `npx tsc --noEmit`

### Common TypeScript Issues
- **Slate.js Types**: Use `n as any` for Editor.isBlock() calls
- **API Mismatches**: Ensure Rust backend and TypeScript frontend parameter alignment
- **Unused Variables**: Prefix with underscore `_param` for allowed unused parameters

### AI Generation Debugging
1. Check `ollama serve` is running
2. Verify database field mapping
3. Test with simple parameters first
4. Add console logs for state changes

### Performance Monitoring
- Increase timeouts for AI generation
- Use parallel processing
- Monitor token usage (360 avg with context engineering)
- **ESLint**: 269 issues (mostly `any` type warnings - consider gradual type improvement)

## Performance

**Memory**: SQLite pooling, Redux normalization, React.memo
**Build**: Tauri single-arch (90% smaller), Vite optimization
**Auto-save**: 2s debounce for chapters, immediate for critical data

## Environment

**Required**: Node.js 18+, Rust 1.75+, Tauri CLI
**AI**: Ollama (`ollama serve` + `ollama pull llama3.2`)
**Platform**: Xcode (macOS), VS Build Tools (Windows), build-essential (Linux)

### MCP Server (Serena)
**Setup**:
1. `uvx --from git+https://github.com/oraios/serena serena project generate-yml`
2. `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project "$(pwd)"`
3. `claude mcp list` - Verify ✓ Connected

**Required**: `.serena/project.yml` configuration file

## Testing

**Framework**: Jest + jsdom
**Scripts**: `test-ollama-service.js`, `test-ai-progress-visualization.js`
**Commands**: `npm test`, `npm run diagnostic`

## Version

**Current**: v1.0.0+ (Pure Tauri)
**Stack**: Tauri v2.7.0 + React 18.2.0 + SQLite
**Recent**: AI History, Progress Viz, Language Purity, Context Engineering (29.8% token savings)

## Quick Reference

### New Tauri Command
```rust
// 1. src-tauri/src/commands/[feature].rs
#[tauri::command]
pub async fn new_command(param: String) -> Result<String, String> { }

// 2. Register in lib.rs
.invoke_handler(tauri::generate_handler![new_command])

// 3. Frontend API
newCommand: (param: string) => Promise<string>
```

### Key Patterns
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

### Database Migration
```rust
conn.execute("ALTER TABLE...", [])?;
conn.pragma_update(None, "user_version", 8)?;  // NOT conn.execute()
```