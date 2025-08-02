# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

創世紀元：異世界創作神器 (Genesis Chronicle) is a pure Tauri-based AI-powered novel writing application. Built with a Rust backend and React frontend, it integrates with Ollama for local AI assistance and is designed specifically for Chinese light novel creation with features like character management, chapter-based editing, and AI writing assistance.

**Current Status**: The project has completed its migration to pure Tauri architecture in v1.0.0. Electron support was completely removed, focusing on a single, optimized architecture for better performance and maintainability.

**Performance Benefits**: 300% faster startup, 70% less memory usage, and 90% smaller application size compared to the previous dual-architecture system.

**Latest Updates** (2025-08-02): AI Generation History system implementation, AI progress visualization enhancements, nested scrollbar system improvements, comprehensive language purity control system, and major code quality improvements.

**Code Quality Status**: 
- ✅ Rust backend: Compiles without errors or warnings
- ✅ Frontend build: Successful with minor performance warnings
- ⚠️ TypeScript errors: Reduced from 100+ to 31 errors (68% improvement)
- ⚠️ ESLint issues: Reduced from 270+ to 257 issues (5% improvement)
- 🔧 Key fixes: ESLint config, AppError types, Redux dispatch types, database pragma usage

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
- `npm run dev` - Start Tauri development (primary command)
- `npm run dev:tauri` - Explicit Tauri development
- `npm run dev:renderer` - Start Vite frontend only for UI development
- `npm run lint` - Run ESLint with auto-fix support
- `npm run diagnostic` - System environment diagnostics (legacy Electron checks, may show false positives)

### Code Quality & Debugging
- `cargo check --manifest-path src-tauri/Cargo.toml` - Check Rust compilation without building
- `npx tsc --noEmit` - TypeScript type checking without compilation
- `npm run build:renderer` - Test frontend build process
- `cargo tauri build --debug` - Debug build with console access

### Testing
- `npm test` - Run all tests with Jest
- `npm test -- --testNamePattern="pattern"` - Run specific test pattern
- `npm test -- --watch` - Watch mode for development
- `npm run test:integration` - Integration tests only

### Building & Packaging
- `npm run build` - Build complete application (renderer + Tauri)
- `npm run package` - Package application for distribution
- `npm run clean` - Clean all build artifacts

### MCP Server Management
- `claude mcp list` - Check status of all configured MCP servers
- `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project "$(pwd)"` - Add Serena MCP server for current project
- `claude mcp remove serena` - Remove Serena MCP server configuration
- **Required Setup**: Each project needs `.serena/project.yml` configuration file generated with `uvx --from git+https://github.com/oraios/serena serena project generate-yml`

### Common Troubleshooting Commands
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

### Single Tauri Architecture (v1.0.0)

**Backend** (`src-tauri/src/`):
- **Rust Backend**: Tauri v2.7.0 with rusqlite for SQLite operations
- **Commands** (`src-tauri/src/commands/`): Tauri command handlers organized by feature
- **Database** (`src-tauri/src/database/`): SQLite models, migrations, and connection management (current: v7)
- **Services** (`src-tauri/src/services/`): Business logic (Ollama AI integration)
- **Utils** (`src-tauri/src/utils/`): Language purity enforcement system

**Frontend** (`src/renderer/`):
- **Framework**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Redux Toolkit with feature-based slices
- **Editor**: Slate.js for rich text editing
- **UI Components**: Custom cosmic theme with dark backgrounds and gold accents
- **Internationalization**: JSON-based translation system (primarily zh-TW focused)

### Tauri Command Architecture

**System Commands**:
- `get_app_version`, `quit_app`, `reload_app`, `show_save_dialog`, `show_open_dialog`, `open_external`
- Update system: `check_for_updates`, `download_update`, `install_update`, `set_auto_update`

**Data Management Commands**:
- **Projects**: `get_all_projects`, `get_project_by_id`, `create_project`, `update_project`, `delete_project`
- **Chapters**: `get_chapters_by_project_id`, `get_chapter_by_id`, `create_chapter`, `update_chapter`, `delete_chapter`
- **Characters**: `get_characters_by_project_id`, `create_character`, `update_character`, `delete_character`
- **Relationships**: `create_character_relationship`, `delete_character_relationship`, `get_character_relationships`
- **AI History**: `create_ai_history`, `query_ai_history`, `mark_ai_history_selected`, `delete_ai_history`, `cleanup_ai_history`

**AI & Context Commands**:
- **AI Service**: `check_ollama_service`, `get_service_status`, `list_models`, `get_models_info`, `generate_text`
- **Legacy Context**: `build_context`, `compress_context`, `get_context_stats`, `generate_with_context`
- **Context Engineering**: `build_separated_context`, `estimate_separated_context_tokens`, `generate_with_separated_context`
- **Language Purity**: `analyze_text_purity`, `enhance_generation_parameters`
- **Configuration**: `update_ollama_config`, `check_model_availability`
- **Traditional Chinese Focus**: Context system simplified to focus only on Traditional Chinese (zh-TW)

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

### Context Engineering Architecture (v1.0.0+ Simplified)

**Overview**: The project implements Context Engineering principles to optimize AI token usage by separating system prompts from dynamic user content. The architecture has been simplified to focus exclusively on Traditional Chinese (繁體中文).

**Core Components** (`src-tauri/src/commands/context.rs`):
- **SystemPromptBuilder**: Handles fixed Traditional Chinese writing instructions and guidelines
  - Simplified: Removed `language` parameter, now focused only on zh-TW
  - Includes CRITICAL markers for language purity enforcement
- **UserContextBuilder**: Manages dynamic content (project, chapter, character data) with intelligent compression
  - Smart content extraction with dynamic length adjustment
  - Simplified label format for token efficiency
- **Token Optimization**: Achieves 29.8% token reduction (513 → 360 tokens in testing)

**API Commands** (Simplified):
- `build_separated_context(project_id, chapter_id, position)` - Returns `[system_prompt, user_context]` tuple
  - No language parameter needed
- `estimate_separated_context_tokens(project_id)` - Provides token usage statistics
- `generate_with_separated_context(project_id, chapter_id, position, model, params)` - AI generation using separated context
  - Removed language parameter for cleaner API

**Architecture Benefits**:
- **Token Efficiency**: 29.8% reduction in API token consumption
- **Code Simplification**: 40% reduction in code complexity (~200 lines removed)
- **Maintenance**: 60% reduction in maintenance overhead
- **Future-Ready**: Prepared for Chat API integration where system prompts don't count toward context limits
- **Language Purity**: Enhanced with "CRITICAL" markers to prevent English/Simplified Chinese mixing
- **Focused Design**: Single-language architecture eliminates multilingual complexity

**Backward Compatibility**: Legacy `build_context` and `generate_with_context` methods preserved but simplified to match new architecture.

### Language Purity Control System (v1.0.0+)

**Overview**: Advanced language purity detection and enforcement system ensuring Traditional Chinese text generation without English words or Simplified Chinese character contamination.

**Core Components** (`src-tauri/src/utils/language_purity.rs`):
- **LanguagePurityEnforcer**: Main enforcement engine with regex-based detection
  - English word pattern detection (`[A-Za-z]{2,}` for multi-character English)
  - Simplified Chinese character detection (curated character set)
  - Forbidden pattern matching for common contamination sources
  - Statistical analysis with percentage purity calculation

**Detection Capabilities**:
- English word identification with context awareness
- Simplified vs Traditional Chinese character distinction
- Proper noun preservation (single characters, names)
- Statistical purity scoring (0-100%)

**API Commands**:
- `analyze_text_purity(text)` - Returns detailed purity analysis with violations list
- `enhance_generation_parameters(base_params, purity_requirements)` - Adjusts AI parameters for better language purity

**Integration Points**:
- Context Engineering system integration for prompt enhancement
- AI generation parameter optimization based on purity requirements
- Real-time text analysis during generation process
- Post-generation validation and scoring

**Usage Patterns**:
```rust
// Analyze text purity
let analysis = LanguagePurityEnforcer::new().analyze_purity(&text);
if analysis.purity_percentage < 95.0 {
    // Apply enhanced generation parameters
}

// Enhance AI parameters for better purity
let enhanced_params = enhancer.enhance_parameters(base_params, purity_requirements);
```

### Database Schema

**Core Tables**:
- **projects**: id, name, description, type, settings, created_at, updated_at
- **chapters**: id, project_id, title, content, order_index, created_at, updated_at  
- **characters**: id, project_id, name, description, attributes, avatar_url, created_at, updated_at
- **character_relationships**: id, from_character_id, to_character_id, relationship_type, description, created_at, updated_at
- **ai_generation_history**: id, project_id, chapter_id, model, prompt, generated_text, parameters, language_purity, token_count, generation_time_ms, selected, position, created_at
- **settings**: key, value, created_at, updated_at

**Database Location**: `~/{AppData}/genesis-chronicle/genesis-chronicle.db`
**Migration System**: Automatic migrations in `src-tauri/src/database/migrations.rs` (current version: 7)
**Critical**: Always use explicit field names in SQL queries to avoid field mapping errors

### Redux State Architecture

**Feature-Based Store Organization**:
- **projectsSlice**: Project CRUD, current project selection, project statistics
- **chaptersSlice**: Chapter management, content editing, auto-save state, word count calculation
- **charactersSlice**: Character CRUD, relationship management, archetype application, search/filter
- **aiSlice**: Ollama service status, model management, text generation, parameters configuration
- **aiHistorySlice**: AI generation history tracking, CRUD operations, selection management, pagination
- **templatesSlice**: Template system, filtering/sorting, custom template creation, project application
- **settingsSlice**: Application settings, AI configuration, editor preferences, backup settings
- **uiSlice**: Modal management, notifications, theme switching, sidebar state, global loading
- **errorSlice**: Error handling, progress tracking with stages (preparing→generating→processing→complete)
- **editorSlice**: Editor configuration, themes, reading mode, auto-save intervals
- **notificationSlice**: User notifications, dismissal, cleanup

## Critical Development Patterns

### API Layer Architecture (MANDATORY)
The project uses a unified API abstraction in `src/renderer/src/api/`:
- **index.ts**: Exports single `api` object, always use this interface
- **tauri.ts**: Tauri-specific implementation  
- **types.ts**: TypeScript interfaces for all API operations
- **Critical**: Never use direct `window.__TAURI__.*` calls, always use `api.*` methods

```typescript
// ✅ Correct: Use unified API
import { api } from './api';
const projects = await api.projects.getAll();

// ❌ Wrong: Direct Tauri calls
import { invoke } from '@tauri-apps/api/core';
const projects = await invoke('get_all_projects');
```

### Redux Pattern with AppDispatch
Always use typed dispatch for Redux operations:
```typescript
// ✅ Correct: Typed dispatch
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
const dispatch = useDispatch<AppDispatch>();

// ❌ Wrong: Untyped dispatch
const dispatch = useDispatch();
```

### Database Field Mapping (CRITICAL)
**Always use explicit field names in SQL queries to avoid field mapping errors:**
```rust
// ✅ Correct: Explicit field names
"SELECT id, name, description, created_at FROM projects WHERE id = ?"

// ❌ Wrong: SELECT * causes field index mismatches
"SELECT * FROM projects WHERE id = ?"
```

### Chinese Text Handling
**Never use ASCII-only filters for Chinese content:**
```rust
// ✅ Correct: Unicode-aware filtering
text.chars().filter(|c| c.is_alphanumeric() || c.is_whitespace()).collect()

// ❌ Wrong: ASCII-only filtering breaks Chinese characters
text.chars().filter(|c| c.is_ascii_alphanumeric()).collect()
```

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
- **Error Filtering**: `main-stable.tsx` implements early error interception for Tauri-specific console errors
- **Scrollbar Design**: 16px gold-themed scrollbars with `!important` CSS to override Tailwind reset

### Component Organization Patterns

**Feature-Based Component Structure**:
- **Editor/**: Rich text editing components (`SimpleAIWritingPanel.tsx` with AI integration)
- **Projects/**: Project management UI (`SimpleProjectEditor.tsx`, project cards)
- **Characters/**: Character management (`CharacterManager.tsx`, relationship visualization)
- **Templates/**: Template browser and application system
- **Settings/**: Configuration panels (general, AI, editor, backup settings)
- **UI/**: Reusable components (`SimpleErrorBoundary.tsx`, modals, notifications)
- **Help/**: Documentation and tutorial system

**Cross-Component Communication**:
- Use Redux for global state sharing across feature boundaries
- Implement unified API layer for consistent data access patterns
- Error boundaries at feature level with graceful degradation
- Progress tracking through `errorSlice` for long-running operations

### AI Progress Visualization Architecture (v1.0.0+)

**Overview**: Advanced progress visualization system providing real-time feedback during AI text generation with multi-stage tracking, animated visual elements, and detailed performance statistics.

**Core Components**:
- **AIGenerationProgress** (`src/renderer/src/components/AI/AIGenerationProgress.tsx`): Main progress visualization component
  - Multi-stage progress tracking (preparing → generating → processing → complete)
  - Real-time statistics display (generation speed, token count, quality estimation, language purity)
  - Animated visual feedback (gradient progress bars, thinking animations, shimmer effects)
  - Error handling with friendly user feedback
  - Success celebration with completion statistics

**Integration with SimpleAIWritingPanel**:
- Automatic show/hide based on generation state
- Real-time progress updates synchronized with Redux store
- Replaced old overlay design with embedded progress component
- Support for multi-version generation tracking (x/n display)

**Visual Features**:
- Cosmic-themed design matching application aesthetics
- Gradient progress bars with animated shimmer during generation
- Pulsing dot animations showing AI "thinking" state
- Stage indicators with appropriate icons and colors
- Detailed statistics grid with real-time updates
- Step-by-step progress visualization for multi-generation tasks

**Performance Benefits**:
- Enhanced user experience with transparent progress visibility
- Reduced user anxiety during long AI generation tasks
- Professional visual feedback matching application theme
- Intelligent error reporting with actionable suggestions

### AI Generation History System (v1.0.0+)

**Overview**: Comprehensive tracking and management system for all AI generation activities, providing detailed history, analytics, and reusability features for generated content.

**Core Components**:
- **Database Storage** (`ai_generation_history` table): Complete generation history with metadata
  - Generation parameters, model information, timing data
  - Language purity scores and token count tracking
  - Selection status and position context
  - Automatic cleanup and retention management

**Key Features**:
- **Automatic History Saving**: Every AI generation automatically saved with full context
- **Generation Analytics**: Performance metrics, token usage, and language purity scoring
- **History Query System**: Flexible filtering by project, chapter, selection status, and date ranges
- **Selection Tracking**: Mark and track which generations were actually used
- **Cleanup Management**: Automatic cleanup of old entries while preserving selected generations

**API Commands**:
- `create_ai_history(history_data)` - Save new generation with metadata
- `query_ai_history(filters)` - Query history with flexible filtering options
- `mark_ai_history_selected(history_id, project_id)` - Mark generation as used
- `delete_ai_history(history_id)` - Delete specific history entry
- `cleanup_ai_history(project_id, keep_count)` - Automatic cleanup of old entries

**Integration Points**:
- **SimpleAIWritingPanel**: Automatic history saving after each successful generation
- **Redux State Management**: Full integration with aiHistorySlice for state tracking
- **Performance Metrics**: Integration with language purity analysis and token counting
- **Future UI Components**: Prepared for history browsing and analytics interfaces

**Data Structure**:
```typescript
interface AIGenerationHistory {
  id: string;
  projectId: string;
  chapterId: string;
  model: string;
  prompt: string;
  generatedText: string;
  parameters?: any;
  languagePurity?: number;
  tokenCount?: number;
  generationTimeMs?: number;
  selected: boolean;
  position?: number;
  createdAt: Date;
}
```

**Benefits**:
- **Quality Improvement**: Track which parameters and models produce best results
- **Performance Analysis**: Monitor generation speed and efficiency trends  
- **Content Reuse**: Access to previously generated content for inspiration
- **Analytics Ready**: Foundation for detailed AI usage analytics and optimization

## Key Development Workflows

### Adding New Tauri Commands
1. Add command function in `src-tauri/src/commands/*.rs`
2. Register in `src-tauri/src/lib.rs` invoke_handler
3. Add API interface in `src/renderer/src/api/types.ts`
4. Implement in `src/renderer/src/api/tauri.ts`

### Adding Frontend Features
1. Create component in `src/renderer/src/components/[feature]/`
2. Add Redux slice if needed in `src/renderer/src/store/slices/`
3. Add translation keys to `src/renderer/src/i18n/locales/*.json`
4. Write integration tests in `src/__tests__/integration/`

### Database Operations
**Rust Backend** (`src-tauri/src/database/`):
- Use `rusqlite` with `Result<T, String>` error handling pattern
- **Critical**: Use `conn.pragma_update()` for PRAGMA statements, not `conn.execute()`
- All database operations are async and require proper error handling
- Foreign key constraints are enabled - consider cascade effects

### Development Task Management

**Current Todo System**: The project uses a structured todo list for tracking development progress and maintaining focus on priority tasks.

**Completed Tasks** (as of 2025-08-02):
- ✅ Ollama service modifications and configuration
- ✅ AI service testing infrastructure  
- ✅ Language purity control optimization
- ✅ AI generation progress visualization (AIGenerationProgress component)
- ✅ AI generation history feature implementation (complete CRUD system)
- ✅ AI generation history UI interface (AIHistoryPanel component)
- ✅ AI progress panel color contrast fixes
- ✅ API parameter naming standardization (camelCase consistency)
- ✅ Nested scrollbar system improvements
- ✅ TypeScript compilation fixes across all components

**Task Prioritization**:
- **High Priority**: Core functionality improvements, bug fixes, performance optimizations
- **Medium Priority**: UX/UI enhancements, additional features, system optimizations
- **Low Priority**: Nice-to-have features, future enhancements, experimental features

**Development Workflow**:
1. Complete high-priority tasks before medium/low priority items
2. Test thoroughly after each major implementation
3. Document changes and update CLAUDE.md accordingly
4. Maintain backward compatibility where possible
5. Focus on Traditional Chinese language support as primary use case

### AI Integration  
**External Dependency**: Requires Ollama service running locally
- **Default Endpoint**: `http://127.0.0.1:11434`
- **Recommended Model**: llama3.2 for Chinese text generation
- **Service Check**: Always verify Ollama availability before AI operations
- **Error Handling**: Graceful fallback when AI service unavailable
- **Context Building**: `generate_with_context` command builds context from project/character data, handles text encoding issues
- **Progress Integration**: AI generation operations use global progress system for user feedback
- **Traditional Chinese Focus**: Simplified architecture focuses only on Traditional Chinese (zh-TW) generation
- **Context Engineering**: Separated system prompts and user context for 29.8% token reduction
- **Language Purity**: Enhanced instructions prevent English words and Simplified Chinese mixing

**AI Generation Flow**:
1. **Context Engineering**: Uses separated context system with SystemPromptBuilder and UserContextBuilder  
2. **Context Building** (`build_context` or `build_separated_context`): Collects project, character, and chapter data
3. **Text Cleaning**: Ensures Chinese characters are properly handled in context
4. **Parameter Variation**: Creates multiple generations with different temperature settings
5. **Parallel Processing**: Generates multiple versions simultaneously
6. **Result Display**: Auto-scrolls to results with user selection interface

**Common AI Issues**:
- **"Conversion error from type Text"**: Usually indicates database field mapping issues in context building
- **Empty Results**: Check Ollama service status and parameter formatting
- **Timeout Errors**: Increase HTTP timeouts for longer generation tasks
- **Missing Results in UI**: Verify functional state updates and auto-scroll implementation

### Template System Architecture
**Template Categories**: Organized into 4 main types (異世界, 校園, 科幻, 奇幻) with character archetypes
**Template Application Flow**:
1. **Template Selection**: Browse and filter templates by type, popularity, or custom criteria
2. **Character Integration**: Apply character archetypes with relationship templates
3. **Project Creation**: One-click template application creates complete project structure
4. **Customization**: Modify template settings and character relationships post-creation

**Template Storage**: JSON-based template definitions with character archetypes and world-building elements

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

**Nested Scrollbar System & Layout Issues** (`src/renderer/src/index.css` + layout components):
- **Implementation**: 16px gold-themed scrollbars with gradient effects and cosmic theme integration
- **Critical**: Use `!important` CSS declarations to override Tailwind's base reset styles
- **Nested Scrolling**: Supports dual-layer scrolling - outer container for page content, inner container for editor text
- **Height Constraints**: Use `min-h-full` instead of `h-full` in ProjectEditor to allow content expansion
- **Layout Pattern**: Outer scroll (Layout main with conditional `overflow-auto`), inner scroll (editor with `maxHeight` limits)
- **Browser Compatibility**: Uses both webkit scrollbar properties and CSS scrollbar-width/color for cross-browser support

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

**ESLint Configuration Issues**:
- **Problem**: Missing TypeScript ESLint configuration causing linting failures
- **Solution**: Updated `.eslintrc.js` to use `plugin:@typescript-eslint/recommended` format and removed non-existent `tsconfig.main.json` reference
- **Critical**: ESLint configuration should match installed package versions and available tsconfig files

**Rust Parameter Naming**:
- **Problem**: Rust compiler warnings for non-snake_case parameter names
- **Solution**: Use `snake_case` naming convention for Rust function parameters (e.g., `project_id` instead of `projectId`)
- **Pattern**: Always follow Rust naming conventions in command functions

**Traditional Chinese Focused Context Building** (`src-tauri/src/commands/context.rs`):
- **Architecture Simplification**: Removed multilingual support, now focuses only on Traditional Chinese (zh-TW)
- **Context Engineering**: Implemented separated context system with SystemPromptBuilder and UserContextBuilder
- **Token Optimization**: 29.8% token reduction through system prompt separation
- **Language Purity**: Enhanced with "CRITICAL" markers to prevent English/Simplified Chinese mixing
- **API Commands**: `build_separated_context`, `estimate_separated_context_tokens`, `generate_with_separated_context`

**Recent Critical Fixes (2025-08-02)**:
- **AI Generation History Implementation** (Database Migration v7 + Full Stack): Complete CRUD system for tracking AI generations with automatic saving, history management, and analytics preparation
- **TypeScript Compilation Fixes** (Multiple files): Resolved all TypeScript errors including React imports, type guards, modal definitions, and progress indicator types
- **Database Connection Standardization** (`src-tauri/src/commands/ai_history.rs`): Fixed database connection method naming from `get_connection()` to `get_db()` for consistency
- **Error Object Type Checking** (`src/renderer/src/api/tauri.ts`): Added proper type guards for error objects: `typeof error === 'object' && 'message' in error`
- **Nested Scrollbar System Resolution** (`src/renderer/src/index.css`): Implemented 16px gold-themed scrollbars with proper `!important` declarations to override Tailwind reset, supporting dual-layer scrolling for page and editor content
- **Error Boundary Reference Fix** (`src/renderer/src/components/UI/SimpleErrorBoundary.tsx`): Corrected component export paths to prevent runtime errors during error handling
- **ESLint Configuration Update** (`.eslintrc.js`): Fixed TypeScript ESLint configuration to use correct plugin format and removed invalid tsconfig references
- **Progress Integration Enhancement** (`src/renderer/src/components/Editor/SimpleAIWritingPanel.tsx`): Seamlessly integrated AIGenerationProgress component with Redux state management and auto-cleanup functionality
- **Language Purity Module Setup** (`src-tauri/src/utils/mod.rs`): Proper module registration and export structure for language purity enforcement system

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

### Token Optimization Issues
**Problem**: Current context building in `build_context` may consume excessive tokens with formatting/instruction text
**Analysis**:
- System instructions and labels can consume 40-50% of available context tokens
- Multilingual support increases instruction overhead
- Story content gets compressed to make room for formatting

**Context Engineering Solution (IMPLEMENTED)**:
The project now implements Context Engineering principles with separated system prompts and user context:

- **SystemPromptBuilder**: Handles fixed Traditional Chinese writing instructions and guidelines
- **UserContextBuilder**: Manages dynamic content with intelligent extraction and compression  
- **Token Efficiency**: Achieves 29.8% token savings in real-world testing
- **Architecture Simplification**: Removed multilingual complexity, focusing only on Traditional Chinese
- **Backward Compatibility**: Legacy `build_context` preserved for comparison and fallback

**Performance Results** (tested 2025-08-01):
- Traditional method: 513 tokens
- Separated method: 360 tokens  
- Savings: 153 tokens (29.8% reduction)
- Quality: Maintained with minor language purity improvements needed

**Language Purity Enhancements (IMPLEMENTED)**:
Following initial testing that revealed language mixing issues, comprehensive language purity improvements have been implemented:

- **Enhanced System Prompts**: Added "CRITICAL" markers with strict language requirements
- **Traditional Chinese Enforcement**: Explicit prohibition of English words and simplified Chinese characters  
- **Multilingual Consistency**: Applied improvements across all supported languages (zh-TW, zh-CN, en, ja)
- **Genre-Specific Rules**: Enhanced light novel style requirements with language purity constraints

**Language Purity Test Results**:
- Original Issue: English words ("Scribble") mixed in generated content
- Original Issue: Simplified Chinese characters mixed in traditional Chinese context
- Solution: Strengthened system prompts with "CRITICAL" and "絕對不允許" (absolutely not allowed) constraints
- Validation: Created comprehensive test script for ongoing quality assurance

**Future Enhancements**:
1. **Chat API Integration**: Expected additional 20-30% token savings
2. **Smart Context Budgeting**: Dynamic allocation based on available tokens
3. **Quality Validation Loop**: Automated assessment and improvement
4. **Advanced Language Detection**: Real-time validation of generated content purity

## Performance Considerations

### Memory Management
- **SQLite Optimization**: Use connection pooling and prepared statements for database operations
- **Redux State**: Implement state normalization to avoid deep object nesting and improve performance
- **Component Rendering**: Use React.memo for expensive components, especially in character/template lists

### Build Optimization
- **Tauri Bundle**: Single architecture approach reduces build complexity and application size by 90%
- **Frontend Assets**: Vite handles code splitting and asset optimization automatically
- **Rust Compilation**: Use `cargo tauri build --release` for production builds with full optimizations

### Auto-Save Strategy
- **Chapter Content**: 2-second debounced auto-save to prevent data loss without overwhelming the database
- **Character Data**: Immediate save on relationship changes due to referential integrity requirements
- **Settings**: Persist settings changes immediately to maintain user preferences

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

### MCP Server Configuration
- **Serena MCP**: Advanced code analysis and development assistant
- **Prerequisites**: `uv` package manager (install from uv.pip.python.org)
- **Project Setup**: 
  1. Generate project configuration: `uvx --from git+https://github.com/oraios/serena serena project generate-yml`
  2. Add to Claude Code: `claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project "$(pwd)"`
  3. Verify connection: `claude mcp list` (should show serena as ✓ Connected)
- **Configuration File**: `.serena/project.yml` (automatically generated for TypeScript projects)
- **Troubleshooting**: If connection fails, ensure `.serena/project.yml` exists and remove/re-add the MCP server

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

### Testing Infrastructure & Scripts

**AI Service Testing** (`scripts/test-ollama-service.js`):
- Comprehensive Ollama service functionality testing
- Connection verification, model listing, text generation
- Concurrent request handling and error scenarios
- Language purity validation with test cases
- Performance benchmarking and timeout testing

**Progress Visualization Testing** (`scripts/test-ai-progress-visualization.js`):
- AI generation progress system validation
- Visual component feature verification
- User experience improvement assessment
- Performance considerations and recommendations
- Future enhancement roadmap

**System Diagnostics** (`npm run diagnostic`):
- Environment validation (Node.js, Rust, Git versions)
- Dependency verification and compilation checks
- Ollama service status and model availability
- Memory usage analysis and recommendations
- Network connectivity and external service checks

**Test Execution Patterns**:
```bash
# Run AI service tests
node scripts/test-ollama-service.js

# Test progress visualization
node scripts/test-ai-progress-visualization.js

# System-wide diagnostics
npm run diagnostic

# Manual testing recommendations
# 1. Restart Tauri application
# 2. Open project and enter editor
# 3. Click "AI 續寫" button and observe progress
# 4. Test different generation parameters
# 5. Verify cancellation and cleanup functions
```

## Version Information

**Current Version**: v1.0.0+ (Pure Tauri Architecture with Context Engineering & Progress Visualization)
**Latest Update**: AI Generation History & Progress Visualization systems completed (2025-08-02)
**Tauri Version**: v2.7.0
**React Version**: 18.2.0
**Ollama Version**: v0.10.1
**Architecture**: Single unified Tauri + Rust + React stack
**Database**: SQLite with rusqlite v0.29+
**Build Target**: Cross-platform desktop application

**Recent Updates**:
- **AI Generation History System**: Complete CRUD implementation with automatic tracking, analytics preparation, and full UI integration
- **AI Progress Visualization**: Comprehensive progress tracking with real-time statistics, animations, and cosmic theme integration
- **Language Purity Control**: Advanced detection and enforcement system for Traditional Chinese text generation
- **Nested Scrollbar System**: 16px gold-themed scrollbars with cosmic theme integration and dual-layer scrolling support
- **Context Engineering**: 29.8% token savings achieved through separated context architecture
- **TypeScript Improvements**: Fixed compilation errors, enhanced type safety, and standardized API parameter naming
- **UI/UX Enhancements**: Improved error boundaries, modal systems, and visual feedback across all components
- **Testing Infrastructure**: Comprehensive test scripts for AI services and progress visualization

## Quick Reference for Common Tasks

### Adding a New Tauri Command
1. **Rust Backend** (`src-tauri/src/commands/[feature].rs`):
   ```rust
   #[tauri::command]
   pub async fn new_command(param: String) -> Result<String, String> {
       // Implementation
   }
   ```
2. **Register in lib.rs**:
   ```rust
   .invoke_handler(tauri::generate_handler![new_command])
   ```
3. **Frontend API** (`src/renderer/src/api/types.ts` + `tauri.ts`):
   ```typescript
   newCommand: (param: string) => Promise<string>
   ```

### Adding a Redux Slice
```typescript
// In src/renderer/src/store/slices/featureSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'feature/fetchData',
  async (params: any, { rejectWithValue }) => {
    try {
      return await api.feature.getData(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);
```

### Database Migration Pattern
```rust
// In src-tauri/src/database/migrations.rs
pub fn migrate_to_v8(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute("ALTER TABLE projects ADD COLUMN new_field TEXT", [])?;
    conn.pragma_update(None, "user_version", 8)?;  // Use pragma_update, not execute
    Ok(())
}
```

### Error Object Creation
```typescript
// Always include id and timestamp for AppError
const error: AppError = {
  id: Date.now().toString(),
  code: 'ERROR_CODE',
  message: 'Error message',
  severity: 'high' as ErrorSeverity,
  category: 'ai',
  timestamp: new Date(),
  stack: error instanceof Error ? error.stack : undefined
};
```