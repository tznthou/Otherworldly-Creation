# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is a pure Tauri-based AI-powered novel writing application. Built with a Rust backend and React frontend, it integrates with Ollama for local AI assistance and is designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

**Current Status**: The project has completed its migration to pure Tauri architecture in v1.0.0. Electron support was completely removed, focusing on a single, optimized architecture for better performance and maintainability.

**Performance Benefits**: 300% faster startup, 70% less memory usage, and 90% smaller application size compared to the previous dual-architecture system.

## Quick Start

```bash
# Install dependencies and Tauri CLI
npm install && cargo install tauri-cli

# Start development environment
npm run dev

# Run diagnostics
npm run diagnostic
```

## Essential Commands

### Development
- `npm run dev` - Start Tauri development (primary command)
- `npm run dev:tauri` - Explicit Tauri development
- `npm run dev:renderer` - Start Vite frontend only
- `npm run lint` - Run ESLint with auto-fix support
- `npm run diagnostic` - System environment diagnostics

### Testing
- `npm test` - Run all tests with Jest
- `npm test -- path/to/test.spec.ts` - Run specific test file
- `npm test -- --testNamePattern="pattern"` - Run tests matching pattern
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report
- `npm run test:unit` - Unit tests only
- `npm run test:integration` - Integration tests only
- `npm run test:performance` - Performance tests only

### Building & Packaging
- `npm run build` - Build complete application (renderer + Tauri)
- `npm run build:renderer` - Build Vite frontend only
- `npm run build:tauri` - Build Tauri backend only
- `npm run package` - Package application for distribution
- `npm run clean` - Clean all build artifacts

### Direct Cargo Commands
- `cargo tauri dev` - Direct Tauri development
- `cargo tauri build` - Direct Tauri build
- `cargo tauri build --debug` - Debug build with console
- `cargo check` - Check Rust code without building

## Architecture Overview

### Single Tauri Architecture (v1.0.0)

**Backend** (`src-tauri/src/`):
- **Rust Backend**: Tauri v2.0 with rusqlite for SQLite operations
- **Commands** (`src-tauri/src/commands/`): Tauri command handlers organized by feature
- **Database** (`src-tauri/src/database/`): SQLite models, migrations, and connection management
- **Services** (`src-tauri/src/services/`): Business logic (Ollama AI integration)

**Frontend** (`src/renderer/`):
- **Framework**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Redux Toolkit with feature-based slices
- **Editor**: Slate.js for rich text editing
- **UI Components**: Custom cosmic theme with dark backgrounds and gold accents
- **Internationalization**: JSON-based translation system supporting zh-TW, zh-CN, en, ja

### Tauri Command Architecture

**System Commands**:
- `get_app_version`, `quit_app`, `reload_app`, `show_save_dialog`, `show_open_dialog`, `open_external`
- Update system: `check_for_updates`, `download_update`, `install_update`, `set_auto_update`

**Data Management Commands**:
- **Projects**: `get_all_projects`, `get_project_by_id`, `create_project`, `update_project`, `delete_project`
- **Chapters**: `get_chapters_by_project_id`, `get_chapter_by_id`, `create_chapter`, `update_chapter`, `delete_chapter`
- **Characters**: `get_characters_by_project_id`, `create_character`, `update_character`, `delete_character`
- **Relationships**: `create_character_relationship`, `delete_character_relationship`, `get_character_relationships`

**AI & Context Commands**:
- **AI Service**: `check_ollama_service`, `get_service_status`, `list_models`, `get_models_info`, `generate_text`
- **Context Management**: `build_context`, `compress_context`, `get_context_stats`, `generate_with_context`
- **Configuration**: `update_ollama_config`, `check_model_availability`

**Database & Settings Commands**:
- **Database**: `backup_database`, `restore_database`, `run_database_maintenance`, `get_database_stats`, `health_check`
- **Settings**: `get_setting`, `set_setting`, `get_all_settings`, `reset_settings`

### API Usage Pattern

```typescript
// Frontend code uses unified API interface
import { api } from './api';

// All API calls follow this pattern
const projects = await api.projects.getAll();
const version = await api.system.getAppVersion();
const aiStatus = await api.ai.checkOllamaService();
```

### Database Schema

**Core Tables**:
- **projects**: id, name, description, type, settings, created_at, updated_at
- **chapters**: id, project_id, title, content, order_index, created_at, updated_at  
- **characters**: id, project_id, name, description, attributes, avatar_url, created_at, updated_at
- **character_relationships**: id, from_character_id, to_character_id, relationship_type, description, created_at, updated_at
- **settings**: key, value, created_at, updated_at

**Database Location**: `~/{AppData}/genesis-chronicle/genesis-chronicle.db`
**Migration System**: Automatic migrations in `src-tauri/src/database/migrations.rs` (current version: 6)
**Critical**: Always use explicit field names in SQL queries to avoid field mapping errors

## Critical Development Patterns

### API Layer Architecture
The project uses a unified API abstraction in `src/renderer/src/api/`:
- **index.ts**: Exports single `api` object, always use this interface
- **tauri.ts**: Tauri-specific implementation  
- **types.ts**: TypeScript interfaces for all API operations
- **Critical**: Never use direct `window.__TAURI__.*` calls, always use `api.*` methods

### Error Handling
- **SimpleErrorBoundary**: Located in `src/renderer/src/components/UI/SimpleErrorBoundary.tsx`
- **Console Error Filtering**: `main-stable.tsx` filters Tauri-specific errors to prevent spam
- **Error Recovery**: All components wrapped in error boundaries with reset capabilities

### State Management
- **Redux Store**: All application state managed through Redux Toolkit
- **Slices**: Organized by feature - `projectsSlice`, `aiSlice`, `settingsSlice`, `uiSlice`, `errorSlice` (includes progress)
- **Async Actions**: Use `createAsyncThunk` for API calls with proper error handling
- **Modal Management**: Centralized modal state in `uiSlice`
- **Progress System**: Global progress indicators managed through `errorSlice` with `startProgress`, `updateProgress`, `completeProgress`, `failProgress`

### Internationalization System
- **Architecture**: JSON-based translation files in `src/renderer/src/i18n/locales/`
- **Dynamic Loading**: `TranslationLoader` class handles async translation loading
- **Usage**: `useI18n()` hook provides `t()` (async) and `tSync()` (sync) functions
- **Languages**: zh-TW (default), zh-CN, en, ja

### UI/UX Guidelines
- **Theme**: Cosmic theme with `bg-cosmic-950` backgrounds and `text-gold-400` accents
- **Entry Point**: `main-stable.tsx` (NOT App.tsx) - this is the actual application entry
- **Translation Keys**: Always use translation keys, never hardcoded text
- **Modal System**: Use Redux modal system with consistent naming patterns

## Common Development Tasks

### Adding New Features

**Tauri Command**:
1. Add command function in `src-tauri/src/commands/*.rs`
2. Register in `src-tauri/src/lib.rs` invoke_handler
3. Add API interface in `src/renderer/src/api/types.ts`
4. Implement in `src/renderer/src/api/tauri.ts`

**Frontend Component**:
1. Create React component in appropriate `src/renderer/src/components/` subdirectory
2. Add Redux slice if state management needed in `src/renderer/src/store/slices/`
3. Add translation keys to all language files in `src/renderer/src/i18n/locales/`
4. Write tests in `src/__tests__/`

### Database Operations
**Rust Backend** (`src-tauri/src/database/`):
- Use `rusqlite` with `Result<T, String>` error handling pattern
- **Critical**: Use `conn.pragma_update()` for PRAGMA statements, not `conn.execute()`
- All database operations are async and require proper error handling
- Foreign key constraints are enabled - consider cascade effects

### AI Integration  
**External Dependency**: Requires Ollama service running locally
- **Default Endpoint**: `http://127.0.0.1:11434`
- **Recommended Model**: llama3.2 for Chinese text generation
- **Service Check**: Always verify Ollama availability before AI operations
- **Error Handling**: Graceful fallback when AI service unavailable
- **Context Building**: `generate_with_context` command builds context from project/character data, handles text encoding issues
- **Progress Integration**: AI generation operations use global progress system for user feedback

**AI Generation Flow**:
1. **Context Building** (`build_context`): Collects project, character, and chapter data
2. **Text Cleaning**: Ensures Chinese characters are properly handled in context
3. **Parameter Variation**: Creates multiple generations with different temperature settings
4. **Parallel Processing**: Generates multiple versions simultaneously
5. **Result Display**: Auto-scrolls to results with user selection interface

**Common AI Issues**:
- **"Conversion error from type Text"**: Usually indicates database field mapping issues in context building
- **Empty Results**: Check Ollama service status and parameter formatting
- **Timeout Errors**: Increase HTTP timeouts for longer generation tasks
- **Missing Results in UI**: Verify functional state updates and auto-scroll implementation

### Critical Issue Solutions

**Chinese Text Encoding Issues** (`src-tauri/src/commands/context.rs:110-122`):
- **Problem**: `clean_text` function filtered out Chinese characters, causing "Conversion error from type Text" errors
- **Solution**: Updated filter to include `c.is_alphanumeric()` which supports Unicode/Chinese characters
- **Critical**: Never use ASCII-only filters for Chinese content - use Unicode-aware methods

**Database Query Field Mapping** (`src-tauri/src/commands/context.rs:28-57`):
- **Problem**: Using `SELECT *` caused field index mismatches 
- **Solution**: Always use explicit field names in SELECT statements
- **Pattern**: `SELECT id, name, description, type, settings, created_at, updated_at FROM projects WHERE id = ?`

**Ollama API Parameter Issues** (`src-tauri/src/services/ollama.rs:36-37`):
- **Problem**: Using `max_tokens` parameter name instead of Ollama's expected `num_predict`
- **Solution**: Use `#[serde(rename = "num_predict")]` for the max_tokens field
- **Note**: Ollama API uses different parameter names than OpenAI-style APIs

**HTTP Timeout Configuration** (`src-tauri/src/services/ollama.rs:107-115`):
- **Problem**: Default 30-second timeouts too short for AI text generation
- **Solution**: Increase client timeout to 300s (5 minutes), API timeout to 120s (2 minutes)
- **Reasoning**: AI generation, especially for Chinese text, requires longer processing time

**React State Updates for Dynamic Content** (`src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx:223-238`):
- **Problem**: Generated AI results not displaying in UI despite successful backend generation
- **Solution**: Use functional state updates with auto-scrolling to generated content
- **Pattern**: Always use functional updates for complex state changes: `setState(() => newValue)`

**Auto-Scrolling for Generated Content** (`src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx:227-235`):
- **Issue**: Users couldn't see generated results without manual scrolling
- **Solution**: Implement auto-scroll to results container after content generation
- **Implementation**: Use `data-results-container` attribute and `scrollIntoView` with smooth behavior

**Database Pragma Statements** (`src-tauri/src/database/migrations.rs`):
- **Critical**: Use `conn.pragma_update()` for PRAGMA statements, NOT `conn.execute()`
- **Reason**: PRAGMA statements have different execution semantics in rusqlite

**CSP Errors**: CSP is disabled (`"csp": null`) in `src-tauri/tauri.conf.json` to allow IPC communication

**Database Schema Issues**: Delete database file to reinitialize if schema errors occur:
- Location: `~/{AppData}/genesis-chronicle/genesis-chronicle.db`
- Automatic migrations handle version updates through `src-tauri/src/database/migrations.rs`

**Build Issues**: 
- Ensure both Node.js dependencies (`npm install`) and Rust toolchain are updated
- Run `cargo check` to verify Rust compilation before Tauri build

**Translation Loading**: Pre-load translations during app initialization to avoid async issues in components

## Debugging and Troubleshooting

### AI Generation Issues
**Symptoms**: "AI續寫" button not working, "Conversion error from type Text" errors
**Debugging Steps**:
1. Check Ollama service: `ollama serve` should be running
2. Check console for database field mapping errors
3. Verify Chinese text encoding in `clean_text` function
4. Test with simple AI generation parameters first

**Console Debugging**:
```typescript
// Add debugging to React components
console.log('生成選項狀態變化:', generationOptions);
console.log('API 回應結果:', result);
console.log('按鈕禁用狀態:', isGenerating || !currentModel || !isOllamaConnected);
```

**Backend Debugging**:
```rust
// Add logging to Rust commands
log::info!("構建上下文 - 專案: {}, 章節: {}, 位置: {}", project_id, chapter_id, position);
log::error!("獲取專案失敗: {}", e);
```

### State Management Issues
**Problem**: UI not updating despite successful backend operations
**Solutions**:
- Use functional state updates: `setState(() => newValue)`
- Check Redux DevTools for state changes
- Verify component re-renders with React DevTools

### Database Issues
**Problem**: Field mapping errors, schema mismatches
**Solutions**:
- Use explicit field names in SQL queries
- Check migration logs in console
- Delete database file to trigger fresh migrations if needed
- Verify field names match between database schema and Rust models

### Performance Issues
**Problem**: Slow AI generation, timeout errors
**Solutions**:
- Increase HTTP timeouts in `src-tauri/src/services/ollama.rs`
- Use parallel processing for multiple AI generations
- Implement progress indicators for user feedback
- Consider context length optimization

## Development Environment

### Required Tools
- **Node.js**: 18+ (recommended: 22.16.0+)
- **Rust**: 1.75+ (recommended: 1.88.0+)  
- **Tauri CLI**: `cargo install tauri-cli`
- **Platform Tools**:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools
  - Linux: build-essential

### External Services
- **Ollama**: Required for AI features - install from ollama.ai
- **Start Command**: `ollama serve`
- **Model Installation**: `ollama pull llama3.2`

## Testing Strategy

**Test Environment**: Jest with jsdom for React component testing
**Coverage Areas**:
- **Unit Tests**: Core services, database operations, utility functions
- **Integration Tests**: Component interactions, API flow, user workflows  
- **Performance Tests**: Large data handling, AI request processing

**Run Tests**:
```bash
npm test                    # All tests
npm run test:unit          # Unit tests only  
npm run test:integration   # Integration tests
npm run test:performance   # Performance tests
```

## Version Information

**Current Version**: v1.0.0 (Pure Tauri Architecture)
**Tauri Version**: v2.0.0-alpha.1
**Architecture**: Single unified Tauri + Rust + React stack
**Database**: SQLite with rusqlite v0.29+
**Build Target**: Cross-platform desktop application