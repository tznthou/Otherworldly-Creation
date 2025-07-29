# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is a dual-architecture AI-powered novel writing application available in both Electron and Tauri versions. It integrates with Ollama for local AI assistance and is designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

**Current Status**: The project is undergoing progressive migration from Electron to Tauri while maintaining both versions in parallel. The Electron version (v0.4.12) is stable and feature-complete, while the Tauri version (v2.0.0-alpha.1) is actively developed on the `feature/tauri-migration` branch.

## Development Commands

### Dual Version Commands
- `npm run dev` - Start default development environment (Electron version)
- `npm run dev:electron` - Start Electron development environment explicitly
- `npm run dev:tauri` - Start Tauri development environment
- `npm run build` - Build Electron version (default)
- `npm run build:electron` - Build Electron version explicitly  
- `npm run build:tauri` - Build Tauri version
- `npm run clean` - Clean all build artifacts (dist, out, src-tauri/target)

### Essential Commands
- `npm run lint` - Run ESLint code linting
- `npm test` - Run Jest test suite
- `npm run package` - Package the Electron application using Electron Forge

### Testing Commands
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only  
- `npm run test:performance` - Run performance tests only
- `node run-unit-tests.js` - Alternative unit test runner
- `node run-integration-tests.js` - Alternative integration test runner
- `node run-performance-tests.js` - Alternative performance test runner

### Running Single Tests
- To run a specific test file: `npm test -- path/to/test.spec.ts`
- To run tests matching a pattern: `npm test -- --testNamePattern="test description"`
- To run tests in watch mode: `npm test -- --watch`
- To update snapshots: `npm test -- --updateSnapshot`
- To see coverage: `npm test -- --coverage`

### Linting Commands
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run lint -- --fix` - Auto-fix ESLint errors where possible
- `npm run lint -- src/main` - Lint only main process files
- `npm run lint -- src/renderer` - Lint only renderer process files

### Build & Package Commands
- `npm run build:electron:main` - Build Electron main process only
- `npm run build:renderer` - Build renderer process only
- `npm run make` - Build and create Electron distribution packages
- `npm run make:all` - Build Electron for all platforms
- `npm run make:mac` - Build Electron for macOS
- `npm run make:win` - Build Electron for Windows
- `npm run make:linux` - Build Electron for Linux

### Tauri-Specific Commands
- `cargo tauri dev` - Direct Tauri development command
- `cargo tauri build` - Direct Tauri build command
- Access DatabaseTest page at `http://localhost:3000/#/database-test` when running Tauri version

### Utility Commands
- `npm run optimize` - Optimize resources before packaging
- `npm run diagnostic` - Run system diagnostic checks
- `npm run setup` - One-click installation script
- `npm run release` - Full release workflow (lint, test, build, package)
- `npm run package:simple` - Simple packaging without Electron Forge
- `npm run package:manual` - Manual packaging process
- `npm run test:docs` - Test user documentation
- `npm run test:update` - Test update system

## Architecture Overview

### Dual Architecture Structure
This project supports both Electron and Tauri backends with a shared React frontend:

**Electron Version (Stable)**:
- **Main Process** (`electron/main/`): Node.js-based system integration, better-sqlite3 database operations, and IPC
- **Renderer Process** (`src/renderer/`): React application with Redux state management
- **Database**: SQLite with better-sqlite3, includes migration system and foreign key constraints
- **AI Integration**: Ollama service integration for local AI text generation

**Tauri Version (Development)**:
- **Backend** (`src-tauri/src/`): Rust-based system integration with rusqlite database operations
- **Commands** (`src-tauri/src/commands/`): Tauri commands for system, project, chapter, and character operations
- **Database** (`src-tauri/src/database/`): SQLite with rusqlite, includes migration system (connection.rs, models.rs, migrations.rs)
- **Frontend**: Shared React application using unified API adapter

**Shared Frontend** (`src/renderer/`):
- **API Adapter** (`src/renderer/src/api/`): Unified API interface that detects runtime environment and switches between Electron and Tauri APIs
- **Environment Detection**: `isElectron()` and `isTauri()` functions for runtime adaptation
- **Testing**: Comprehensive test suite with unit, integration, and performance tests

### IPC/API Architecture

**Electron IPC System**:
- Main handlers in `electron/main/ipc/ipcHandlers.ts`
- Specialized handlers in subdirectories:
  - `aiHandlers.ts` - AI/Ollama related operations
  - `basicHandlers.ts` - Basic app operations (app quit, reload, etc.)
  - `updateHandlers.ts` - Auto-update functionality
  - `handlers/` - Project and chapter management

Key Electron IPC channels:
- `system:showSaveDialog`, `system:showOpenDialog` - File dialog operations
- `database:backup`, `database:restore` - Database backup/restore
- `ai:checkService`, `ai:generate` - AI service operations
- `project:create`, `project:update`, `project:delete` - Project CRUD
- `chapter:create`, `chapter:update`, `chapter:delete` - Chapter CRUD

**Tauri Commands System**:
- All commands registered in `src-tauri/src/lib.rs` using `tauri::generate_handler!`
- System commands: `get_app_version`, `quit_app`, `reload_app`
- Project commands: `get_all_projects`, `create_project`, `update_project`, `delete_project`
- Chapter commands: `get_chapters_by_project_id`, `create_chapter`, `update_chapter`, `delete_chapter`
- Character commands: `get_characters_by_project_id`, `create_character`, `update_character`, `delete_character`
- Character relationship commands: `create_character_relationship`, `delete_character_relationship`

**Unified API Interface**:
- `src/renderer/src/api/index.ts` - Environment detection and API routing
- `src/renderer/src/api/electron.ts` - Electron API implementation
- `src/renderer/src/api/tauri.ts` - Tauri API implementation using `@tauri-apps/api`
- Frontend code uses `api.system.getAppVersion()` etc. regardless of backend

### Key Services & Components

#### Backend Services

**Electron Services** (`electron/main/`):
- **Database Service** (`database/database.ts`): SQLite operations with better-sqlite3, migration support
- **Ollama Service** (`services/ollamaService.ts`): AI integration and service detection
- **Context Manager** (`services/contextManager.ts`): Intelligent context management for AI requests
- **Update Service** (`services/updateService.ts`): Application update handling
- **IPC Handlers** (`ipc/`): Communication between main and renderer processes

**Tauri Services** (`src-tauri/src/`):
- **Database Module** (`database/mod.rs`): SQLite operations with rusqlite, centralized connection management
- **Database Connection** (`database/connection.rs`): SQLite connection with PRAGMA settings using `pragma_update`
- **Database Models** (`database/models.rs`): Rust structs for Project, Chapter, Character entities
- **Database Migrations** (`database/migrations.rs`): Version-controlled schema migrations
- **Commands** (`commands/`): Modular Tauri command handlers for different feature areas

#### Frontend Architecture
- **State Management**: Redux Toolkit with structured slices
- **Routing**: React Router for page navigation
- **UI Components**: Custom component library with cosmic/magical theme
- **Editor**: Slate.js rich text editor for chapter writing with SQLite persistence
- **Character Management**: Full character creation and relationship system
- **Template System**: Complete template browser and application system for different light novel genres
- **Statistics System**: Comprehensive writing statistics with project, overall, and trend analytics

### Database Schema
The application uses SQLite with the following main entities:
- **Projects**: novels/stories with template metadata
  - Fields: id, name, description, type, templateData, created_at, updated_at
- **Chapters**: individual story chapters with rich content storage  
  - Fields: id, projectId, title, content, orderIndex, created_at, updated_at
- **Characters**: character profiles and relationships
  - Fields: id, projectId, name, description, attributes, avatarUrl, created_at, updated_at
- **Character_relationships**: unidirectional relationship tracking
  - Fields: id, fromCharacterId, toCharacterId, relationshipType, description
- **Settings**: user preferences and configurations
  - Stored as key-value pairs
- Statistics are calculated dynamically from existing data

### External Dependencies
- **Ollama**: Required for AI functionality - must be installed and running locally
- **Models**: Supports various Ollama models, defaulting to llama3.2 for Chinese text

## Development Workflow

### Adding New Features

**For Electron Version**:
1. Add IPC handlers in `electron/main/ipc/ipcHandlers.ts`
2. Expose APIs in `electron/main/preload.ts` (ensure types match)
3. Update `src/renderer/src/api/electron.ts` to call new IPC channels
4. Create Redux slice in `src/renderer/src/store/slices/`
5. Build React components in `src/renderer/src/components/`
6. Add corresponding tests in `electron/main/__tests__/` or `src/__tests__/`
7. Update route in `src/renderer/src/main-stable.tsx` if adding new pages

**For Tauri Version**:
1. Add Tauri commands in appropriate `src-tauri/src/commands/*.rs` files
2. Register commands in `src-tauri/src/lib.rs` invoke_handler
3. Update `src/renderer/src/api/tauri.ts` to call new commands using `invoke()`
4. Update `src/renderer/src/api/types.ts` to include new API interface definitions
5. Frontend components and Redux slices are shared between versions
6. Test Tauri-specific functionality using DatabaseTest page

**For Both Versions**:
- Ensure API interface consistency in `src/renderer/src/api/types.ts`
- Frontend code should use unified `api.*` calls, not platform-specific implementations

### Database Changes

**Electron Database** (`electron/main/database/database.ts`):
- Uses better-sqlite3 with Node.js
- Migration system with version tracking
- Supports foreign key constraints and cascading deletes
- Transaction support for complex operations

**Tauri Database** (`src-tauri/src/database/`):
- Uses rusqlite with Rust
- Migration system in `migrations.rs` with version tracking
- Database models in `models.rs` using Rust structs with serde
- Connection management in `connection.rs` using `pragma_update()` for PRAGMA statements
- **Critical**: Use `pragma_update()` instead of `execute()` for PRAGMA statements to avoid "Execute returned results" errors
- All database operations are async and return `Result<T, String>` for error handling

### Testing Strategy
- **Unit Tests**: Core services and database operations (`src/main/__tests__/unit/`, `src/__tests__/unit/`)
- **Integration Tests**: Component interactions and workflows (`src/__tests__/integration/`)
- **Performance Tests**: Large data handling and AI request performance (`src/__tests__/performance/`)
- **Test Setup**: Uses Jest with jsdom environment, tests run from `<rootDir>/src`

## Configuration Files

**Shared Configuration**:
- `jest.config.js` - Jest testing configuration with jsdom environment
- `tsconfig.json` - TypeScript configuration for renderer process
- `vite.config.ts` - Vite build configuration for frontend
- `.eslintrc.js` - ESLint configuration
- `tailwind.config.js` - Tailwind CSS configuration

**Electron-Specific**:
- `tsconfig.electron.json` - TypeScript configuration for Electron main process
- `forge.config.js` - Electron Forge packaging configuration

**Tauri-Specific**:
- `src-tauri/Cargo.toml` - Rust dependencies and project configuration
- `src-tauri/tauri.conf.json` - Tauri application configuration
- `src-tauri/capabilities/` - Tauri security capabilities and permissions

## Special Considerations

### AI Service Integration
- Ollama must be running locally for AI features to work
- Service health checking is implemented with automatic retry mechanisms
- Context management optimizes AI requests by intelligently building context from project data

### Internationalization
- Primary language is Traditional Chinese (繁體中文)
- All UI text and comments are in Chinese
- English is used only for technical identifiers and code

### Theme & UI
- Custom "cosmic" theme with dark blue backgrounds and golden accents
- Animated magical elements and particle effects
- Responsive design optimized for desktop writing workflows

### Data Management
- Automatic backup and restore functionality
- Database maintenance tools for health checking and optimization
- Auto-save functionality for editor content

## ESLint Configuration
- Uses TypeScript ESLint parser with React hooks support
- Ignores test files and build directories
- Key rules:
  - `@typescript-eslint/no-unused-vars`: Error (ignores args starting with `_`)
  - `@typescript-eslint/no-explicit-any`: Warning
  - `react-hooks/rules-of-hooks`: Error
  - `react-hooks/exhaustive-deps`: Warning

## Current Version

### Electron Version (Stable)
- v0.4.12 - Data management consolidation, settings page save button fix, copyright year update
- v0.4.11 - Tutorial system architecture fix, template manager functionality restoration, UI interaction improvements
- v0.4.10 - Help system architecture refactoring, complete user manual and quick start guide implementation, character relationship design philosophy documentation
- v0.4.9 - Project management system enhancement, UI interaction improvements, and character management interface optimization
- v0.4.8 - Light novel template system and writing statistics fully implemented
- v0.4.7 - Editor refactoring and database storage implementation completed

### Tauri Version (Development - feature/tauri-migration branch)
- v2.0.0-alpha.1 (0.4.12+tauri) - SQLite database connection complete, Rust backend architecture established, dual-version parallel development, project/chapter/character CRUD operations implemented, frontend API adapter layer complete, PRAGMA statement fixes, database migrations system established

## Known Issues & Workarounds

### Electron Version
- **OLLAMA Connection**: If AI features fail, ensure Ollama service is running locally (`ollama serve`). As of v0.4.6, connection issues have been completely resolved with improved IPv4/IPv6 handling
- **Native Module Rebuild**: After installing, run `npm rebuild better-sqlite3` to ensure the SQLite module works with your Electron version
- **TypeScript Build**: If encountering type errors, ensure both `tsconfig.json` and `tsconfig.electron.json` are properly configured

### Tauri Version
- **Rust Dependencies**: Ensure Rust toolchain is installed and up to date
- **PRAGMA Statements**: Always use `conn.pragma_update()` instead of `conn.execute()` for PRAGMA statements to avoid "Execute returned results" errors
- **Database Initialization**: Database is automatically initialized on first startup with proper error handling and logging
- **Frontend Testing**: Use DatabaseTest page (`/#/database-test`) to verify Tauri database functionality

## Debugging Approaches

### Modal Display Issues
- Check Redux state in `store.ts` for modal visibility
- Verify modal name consistency between `openModal()` calls and `ModalContainer` cases
- Use Redux DevTools to track modal state changes
- Common modal names: 'createProject', 'backupManager', 'templateManager', 'aiSettings'

### Tutorial System
- Tutorial functionality uses `useTutorial` hook with `currentTutorialId` state
- Each page component should check if `currentTutorialId` matches its specific tutorial
- Tutorial buttons in help pages should display instructions rather than trigger tutorials

### Template Application Flow
1. User clicks template button → `openModal('templateManager')`
2. Select template → `setLocalSelectedTemplate` (local state)
3. Apply template → `setSelectedTemplate` (Redux) + `openModal('templateApplication')`
4. Create project with proper `type` field matching template type

## Critical Development Notes
- **AI Service Stability**: v0.4.6 implements bulletproof Ollama connectivity with fallback mechanisms and proper timeout handling
- **Entry Point**: Application uses `main-stable.tsx` as the stable entry point for renderer process (NOT App.tsx)
- **Network Configuration**: Uses 127.0.0.1 instead of localhost to avoid IPv6/IPv4 resolution conflicts
- **CSP Policy**: Content Security Policy configured to allow local AI service connections while maintaining security
- **Module Resolution**: Uses `@/` alias for renderer imports, mapped to `src/renderer/`
- **Test Environment**: Requires proper jsdom setup, see `src/__tests__/integration/setup.ts`
- **Project Deletion**: Complete project deletion functionality includes confirmation dialogs and cascading deletes of related data
- **Character Management**: Character storage uses SQLite database; avoid calling non-existent APIs like `updateRelationships` or `checkRelationshipConsistency`
- **UI Theme Consistency**: All modals and components should use the cosmic theme with dark backgrounds (`bg-cosmic-900`) and gold accents (`text-gold-400`)
- **Help System**: The HelpCenterModal in Dashboard redirects to the full HelpCenter component for complete help functionality
- **Character Relationships**: The system uses single-directional relationships by design to support complex emotional dynamics and unequal relationships
- **Tutorial System**: Tutorial steps require proper target element existence; use center positioning for steps without valid targets
- **API Fallbacks**: Character relationship APIs may require fallback strategies if clearRelationships is not available without app restart
- **Template Application**: When applying templates, ensure `localSelectedTemplate` is used for local state to avoid Redux naming conflicts
- **Modal Scrolling**: Use fixed height with proper flex structure (`h-[90vh]` and `min-h-0`) to ensure content scrollability
- **Data Management Consolidation**: As of v0.4.12, data management functions are consolidated into a single 'backupManager' modal entry point
- **Settings Page Route**: Settings page must use the full Settings component, not SettingsSimple, loaded via main-stable.tsx routes

## Dual-Version Development Workflow

### Branch Strategy
- `main` branch: Stable Electron version (v0.4.12)
- `feature/tauri-migration` branch: Tauri development version with dual architecture
- Both versions share the same React frontend codebase under `src/renderer/`

### Environment Setup
- **Electron Development**: `npm run dev:electron` - Uses Node.js backend with better-sqlite3
- **Tauri Development**: `npm run dev:tauri` - Uses Rust backend with rusqlite
- **Frontend Testing**: Access different test pages based on environment:
  - Tauri: `/#/database-test` for database functionality testing
  - Both: Standard application routes work in both environments

### Code Organization
- **Backend Code**: Platform-specific in `electron/main/` and `src-tauri/src/`
- **Frontend Code**: Shared in `src/renderer/` with environment-aware API adapter
- **API Layer**: `src/renderer/src/api/` provides unified interface for both backends
- **Testing**: Environment detection ensures proper functionality testing

### Migration Progress
- **Completed**: Basic architecture, database layer, project/chapter/character CRUD
- **In Progress**: AI service integration, settings management, data migration tools
- **Planned**: Feature parity, performance optimization, comprehensive testing