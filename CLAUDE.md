# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is a dual-architecture AI-powered novel writing application available in both Electron and Tauri versions. It integrates with Ollama for local AI assistance and is designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

**Current Status**: The project is undergoing progressive migration from Electron to Tauri while maintaining both versions in parallel. The Electron version (v0.4.12) is stable and feature-complete, while the Tauri version (v2.0.0-alpha.1) is actively developed on the `feature/tauri-migration` branch.

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

### Testing
- `npm test` - Run all tests
- `npm test -- path/to/test.spec.ts` - Run specific test file
- `npm test -- --testNamePattern="pattern"` - Run tests matching pattern
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- --coverage` - Generate coverage report

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
- **API Adapter** (`src/renderer/src/api/`): Environment-aware API layer
- **State Management**: Redux Toolkit
- **UI Framework**: React + Tailwind CSS + Custom cosmic theme
- **Editor**: Slate.js for rich text editing

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
- Database: `backup_database`, `restore_database`, `run_maintenance`, `get_database_stats`

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

### Database Operations

**Electron**: Use better-sqlite3 in `electron/main/database/database.ts`
**Tauri**: Use rusqlite in `src-tauri/src/database/`
- **Critical**: Use `pragma_update()` for PRAGMA statements in Rust
- All operations return `Result<T, String>` for error handling

## Critical Development Notes

### API Compatibility
- **Frontend**: Always use camelCase for API calls
- **Tauri**: Automatically converts camelCase to snake_case
- **Date Handling**: Use `safeParseDate()` from `dateUtils.ts`
- **Environment Detection**: Use `isElectron()` and `isTauri()` functions

### Common Issues & Solutions

**Tauri Version**:
- **CSP Errors**: CSP is disabled (`"csp": null`)
- **Database Schema**: Delete DB file to reinitialize
- **Slow Loading**: Check for `window.electronAPI` usage
- **PRAGMA Errors**: Use `conn.pragma_update()` not `conn.execute()`

**Electron Version**:
- **Ollama Connection**: Ensure service is running
- **Native Modules**: Run `npm rebuild better-sqlite3`
- **TypeScript**: Check both tsconfig files

### UI/UX Guidelines
- **Theme**: Cosmic theme with dark backgrounds and gold accents
- **Language**: Traditional Chinese (繁體中文) for all UI text
- **Modals**: Use Redux modal system with consistent naming
- **Entry Point**: `main-stable.tsx` (NOT App.tsx)

### External Dependencies
- **Ollama**: Required for AI features (`ollama serve`)
- **Default Model**: llama3.2 for Chinese text
- **Endpoint**: `http://127.0.0.1:11434`

## Testing Strategy
- **Unit Tests**: Core services and utilities
- **Integration Tests**: Component interactions
- **Performance Tests**: Large data handling
- **Environment**: Jest with jsdom

## Version Information

**Electron**: v0.4.12 (Stable)
**Tauri**: v2.0.0-alpha.1 (Development)
**Branch Structure**:
- `main`: Stable Electron version
- `feature/tauri-migration`: Tauri development