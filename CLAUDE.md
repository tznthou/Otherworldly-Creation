# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is a dual-architecture AI-powered novel writing application available in both Electron and Tauri versions. It integrates with Ollama for local AI assistance and is designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

**Current Status**: The project is undergoing progressive migration from Electron to Tauri while maintaining both versions in parallel. The Electron version (v0.4.12) is stable and feature-complete, while the Tauri version (v2.0.0-alpha.1) is actively developed on the `feature/tauri-migration` branch.

**Latest Update (v0.4.13+tauri)**: Completed comprehensive internationalization (i18n) system refactor with JSON-based translations for zh-TW, zh-CN, en, ja languages, fixed settings system translations, and enhanced database health check API.

## Quick Start

```bash
# Electron 版本開發（穩定版）
npm install && npm run dev:electron

# Tauri 版本開發（開發中）
npm install && cargo install tauri-cli && npm run dev:tauri

# 診斷系統環境
npm run diagnostic
```

## Essential Commands

### Development
- `npm run dev` - Start Electron development (default)
- `npm run dev:electron` - Explicitly start Electron development
- `npm run dev:tauri` - Start Tauri development
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint -- --fix` - Auto-fix linting errors
- `npm run diagnostic` - Run system environment diagnostics

### Testing
- `npm test` - Run all tests
- `npm test -- path/to/test.spec.ts` - Run specific test file
- `npm test -- --testNamePattern="pattern"` - Run tests matching pattern
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:performance` - Run performance tests only

### Building & Packaging
- `npm run build` - Build Electron version
- `npm run build:tauri` - Build Tauri version
- `npm run package` - Package Electron app with Electron Forge
- `npm run make` - Build and create distribution packages
- `npm run clean` - Clean all build artifacts

### Tauri-Specific
- `cargo tauri dev` - Direct Tauri development
- `cargo tauri build` - Direct Tauri build
- `cargo tauri build --debug` - Debug build with console
- Database location: `~/.config/com.genesis-chronicle.app/genesis.db`
- Test page: `http://localhost:3000/#/database-test`

## Architecture Overview

### Dual Architecture Structure

**Electron Version (Stable)**:
- **Main Process** (`electron/main/`): Node.js backend with better-sqlite3
- **Renderer Process** (`src/renderer/`): React + Redux frontend
- **IPC Handlers** (`electron/main/ipc/`): Communication layer
- **Database**: SQLite with migrations and foreign keys

**Tauri Version (Development)**:
- **Backend** (`src-tauri/src/`): Rust backend with rusqlite
- **Commands** (`src-tauri/src/commands/`): Tauri command handlers
- **Database** (`src-tauri/src/database/`): SQLite with Rust models
- **Frontend**: Shared React application

**Unified Frontend** (`src/renderer/`):
- **API Adapter** (`src/renderer/src/api/`): Environment-aware API layer with `isElectron()` and `isTauri()` detection
- **State Management**: Redux Toolkit
- **UI Framework**: React + Tailwind CSS + Custom cosmic theme
- **Editor**: Slate.js for rich text editing
- **Internationalization** (`src/renderer/src/i18n/`): JSON-based translation system with dynamic loading

### IPC/API Architecture

**Electron IPC Channels**:
- `system:*` - System operations (dialogs, app control)
- `database:*` - Database backup/restore operations
- `ai:*` - AI/Ollama service operations
- `project:*` - Project CRUD operations
- `chapter:*` - Chapter CRUD operations
- `character:*` - Character CRUD operations

**Tauri Commands**:
- System: `get_app_version`, `quit_app`, `reload_app`, `show_save_dialog`, `show_open_dialog`
- Projects: `get_all_projects`, `create_project`, `update_project`, `delete_project`
- Chapters: `get_chapters_by_project_id`, `create_chapter`, `update_chapter`, `delete_chapter`
- Characters: `get_characters_by_project_id`, `create_character`, `update_character`, `delete_character`
- Relationships: `create_character_relationship`, `delete_character_relationship`, `get_character_relationships`
- AI: `check_ollama_service`, `get_service_status`, `list_models`, `generate_text`, `generate_with_context`
- Context: `build_context`, `compress_context`, `get_context_stats`
- Database: `backup_database`, `restore_database`, `run_maintenance`, `get_database_stats`, `health_check`
- Settings: `get_setting`, `set_setting`, `get_all_settings`, `reset_settings`

**Unified API Usage**:
```javascript
// Frontend code uses unified API regardless of backend
const projects = await api.projects.getAll();
const version = await api.system.getAppVersion();
```

### Database Schema

**Projects Table**:
- id, name, description, type, templateData, created_at, updated_at

**Chapters Table**:
- id, projectId, title, content, orderIndex, created_at, updated_at

**Characters Table**:
- id, projectId, name, description, attributes, avatarUrl, created_at, updated_at

**Character_relationships Table**:
- id, fromCharacterId, toCharacterId, relationshipType, description

**Settings Table**:
- key-value pairs for user preferences

**Enhanced AI Writing System Tables** (Development Files):
- `world_settings` - World-building elements and magic systems
- `character_states` - Character emotional/physical state timeline
- `character_speech_patterns` - Language style and speech analysis
- `plot_points` - Story beats and narrative structure tracking
- `context_cache` - Optimized context compression cache

## Development Workflow

### Adding New Features

**For Both Versions**:
1. Define API interface in `src/renderer/src/api/types.ts`
2. Implement frontend components in `src/renderer/src/components/`
3. Add Redux slices if needed in `src/renderer/src/store/slices/`
4. Write tests in `src/__tests__/`

**For Electron**:
1. Add IPC handler in `electron/main/ipc/ipcHandlers.ts`
2. Expose API in `electron/main/preload.ts`
3. Update `src/renderer/src/api/electron.ts`

**For Tauri**:
1. Add command in `src-tauri/src/commands/*.rs`
2. Register in `src-tauri/src/lib.rs`
3. Update `src/renderer/src/api/tauri.ts`

### Enhanced AI Writing System Development

**Development Files (Root Directory)**:
- `enhanced_context_models.rs` - Core data models for AI writing system
- `intelligent_context_manager.rs` - Smart context building and compression
- `character_consistency_tracker.rs` - Character behavior and speech analysis
- `plot_coherence_system.rs` - Story structure and timeline management
- `ultra_long_context_optimizer.rs` - Advanced context optimization algorithms
- `integrated_ai_writing_system.rs` - Unified system orchestration
- `ENHANCED_AI_WRITING_SYSTEM_GUIDE.md` - Complete technical documentation

**Key Architecture**:
- **Layered Context Building**: Core, character, plot, world, historical layers
- **Attention Mechanism**: Focuses on relevant content based on writing position
- **Character Consistency**: Tracks speech patterns, behavior, and knowledge state
- **Plot Coherence**: Timeline management, causality chains, foreshadowing tracking
- **Quality Assessment**: Multi-dimensional content quality analysis

### Database Operations

**Electron**: Use better-sqlite3 in `electron/main/database/database.ts`
**Tauri**: Use rusqlite in `src-tauri/src/database/`
- **Critical**: Use `pragma_update()` for PRAGMA statements in Rust
- All operations return `Result<T, String>` for error handling

## Key Architectural Patterns

### API Abstraction Layer
The project uses a unified API abstraction that automatically detects the runtime environment:
- `src/renderer/src/api/index.ts` exports a single `api` object
- Environment detection via `isElectron()` and `isTauri()` functions
- All frontend code should use `api.*` methods, never direct `window.electronAPI` or Tauri calls
- Backend implementations in `electron.ts` and `tauri.ts` handle platform-specific details
- **Critical**: Direct API calls (`window.electronAPI.*` or `window.__TAURI__.*`) are prohibited and will cause errors in the unified system

### Redux State Management
- All application state managed through Redux Toolkit
- Slices organized by feature: `projectsSlice`, `settingsSlice`, `aiSlice`, etc.
- Async actions use `createAsyncThunk` for API calls
- Modal state managed centrally in `uiSlice`

### Database Architecture
Both versions use SQLite but with different drivers:
- **Electron**: better-sqlite3 (synchronous)
- **Tauri**: rusqlite (async with Result<T, String> pattern)
- Schema migrations handled differently in each version
- Foreign key constraints enabled in both versions

## Critical Development Notes

### API Compatibility
- **Frontend**: Always use camelCase for API calls
- **Tauri**: Automatically converts camelCase to snake_case
- **Date Handling**: Use `safeParseDate()` from `dateUtils.ts`
- **Environment Detection**: Use `isElectron()` and `isTauri()` functions from `src/renderer/src/api/index.ts`
- **Translation System**: Use `useI18n()` hook for React components; provides both `t()` async and `tSync()` sync functions
- **Error Handling**: All API calls are wrapped in safety systems - failures automatically fall back to frontend-only mode

### Common Issues & Solutions

**Tauri Version**:
- **CSP Errors**: CSP is disabled (`"csp": null`) in `src-tauri/tauri.conf.json`
- **Database Schema**: Delete DB file to reinitialize (`~/.config/com.genesis-chronicle.app/genesis.db`)
- **Slow Loading**: Check for `window.electronAPI` usage - all should use unified `api.*` interface
- **PRAGMA Errors**: Use `conn.pragma_update()` not `conn.execute()` in Rust
- **API Format**: Tauri backend returns `Result<T, String>` - ensure proper error handling
- **Translation Loading**: Pre-load translations during app initialization to avoid async issues
- **Red Console Errors**: If seeing "callbackId" or "undefined is not an object" errors, these are intercepted by the safety system and won't affect functionality

**Electron Version**:
- **Ollama Connection**: Ensure service is running
- **Native Modules**: Run `npm rebuild better-sqlite3`
- **TypeScript**: Check both tsconfig files

### Error Handling & Safety Systems

**Architecture Components**:
- **Environment Safety** (`src/renderer/src/utils/environmentSafety.ts`): Detects runtime environment and error patterns
- **Safe API Wrapper** (`src/renderer/src/api/safeApi.ts`): Provides fallback to frontend-only mode when backend fails
- **Error Boundaries** (`src/renderer/src/components/ErrorBoundary/SafetyErrorBoundary.tsx`): React error isolation with safe mode activation
- **Console Error Interception** (`src/renderer/src/main-stable.tsx`): Filters Tauri-specific errors to prevent console spam

**Safe Mode Behavior**:
- Automatically activates when backend API calls fail repeatedly
- Provides full frontend functionality with in-memory data storage
- Displays yellow banner indicating limited functionality
- Users can manually reload to retry full functionality

### UI/UX Guidelines
- **Theme**: Cosmic theme with dark backgrounds and gold accents
- **Internationalization**: Support zh-TW (default), zh-CN, en, ja; use translation keys instead of hardcoded text
- **Modals**: Use Redux modal system with consistent naming
- **Entry Point**: `main-stable.tsx` (NOT App.tsx)
- **Translation Keys**: Use `tSync()` for React components, `t()` for async operations; organize keys by component/feature

### External Dependencies
- **Ollama**: Required for AI features (`ollama serve`)
- **Default Model**: llama3.2 for Chinese text
- **Endpoint**: `http://127.0.0.1:11434`

### Enhanced AI Writing System Integration

**Development Status**: Comprehensive AI writing system components are available as development files in the root directory. These provide advanced features for:

**Context Management**:
- Intelligent multi-layer context building (core/character/plot/world/historical)
- Dynamic content selection based on relevance and importance
- Advanced compression algorithms for ultra-long content

**Character Consistency**:
- Detailed character profile tracking (speech patterns, behavioral traits)
- Real-time consistency analysis and violation detection
- Character development trajectory monitoring

**Plot Coherence**:
- Timeline management and causality chain tracking
- Foreshadowing/payoff relationship monitoring
- Multi-threaded plot line management

**Performance Optimization**:
- Attention mechanism for content prioritization
- Intelligent caching and compression strategies
- Quality assessment and improvement suggestions

**Note**: These components are designed as development references and would need integration into the existing Tauri command structure for full implementation.

## Testing Strategy
- **Unit Tests**: Core services and utilities
- **Integration Tests**: Component interactions
- **Performance Tests**: Large data handling
- **Environment**: Jest with jsdom

### Internationalization System

**Architecture**:
- JSON-based translation files in `src/renderer/src/i18n/locales/`
- Dynamic loading with `TranslationLoader` class
- Sync/async API: `t()` (async) and `tSync()` (sync)
- Supported languages: zh-TW (default), zh-CN, en, ja

**Usage Patterns**:
```typescript
// In React components (synchronous)
const { t } = useI18n();
return <button>{t('common.save')}</button>;

// In async operations
const message = await t('notifications.success');

// With parameters
const welcomeMsg = t('welcome.greeting', { name: 'User' });
```

**Translation File Structure**:
```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "settings": {
    "title": "Settings",
    "actions": { "save": "Save Settings" },
    "messages": { "saved": "Settings saved" }
  }
}
```

## Version Information

**Electron**: v0.4.12 (Stable)
**Tauri**: v2.0.0-alpha.1 (Development) - Current: v0.4.13+tauri
**Branch Structure**:
- `main`: Stable Electron version
- `feature/tauri-migration`: Tauri development with i18n system