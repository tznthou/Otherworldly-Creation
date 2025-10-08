# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Serena MCP Integration (CRITICAL!)

**ESSENTIAL**: This project REQUIRES Serena MCP for full functionality. Initialize at session start:

```bash
# Initialization Workflow (MUST DO):
1. mcp__serena__check_onboarding_performed()  # Always first
2. mcp__serena__list_memories()                # View 120+ memories
3. Read relevant memories for current task      # Context-aware development
```

**Core Capabilities**:
- **Memory System**: 120+ categorized project memories
- **Semantic Search**: `find_symbol()`, `search_for_pattern()`, `get_symbols_overview()`
- **Smart Editing**: `replace_symbol_body()`, `insert_before/after_symbol()`
- **Knowledge Base**: Read/write persistent project knowledge

## 📝 Project Overview

**Genesis Chronicle v1.2.8** - AI-powered Chinese light novel writing application
- **Stack**: Tauri v2 + Rust + React/TypeScript + SQLite
- **Scale**: 112,266 lines of code across 468 files (3 languages)
- **AI**: 5 providers (Ollama, OpenAI, Gemini, Claude, OpenRouter)
- **Security**: OS-native Keyring encryption for API keys (v1.2.8+)
- **Editor**: Slate.js with auto-save
- **Export**: EPUB 3.0 + PDF (Chrome Headless)

## 🔑 Essential Quick Reference

### Critical Rules (MUST FOLLOW)
1. **API Layer**: Always `import { api } from './api'` - never direct invoke
2. **Database**: Specify columns explicitly, never `SELECT *`
3. **Slate.js**: Use `key={editor-${id}}` for remounting
4. **TypeScript**: Use `APIResponse<T>` wrapper for type safety
5. **Modals**: Use `dispatch(openModal('name'))` system via Redux uiSlice
6. **Path Management**: Use PathManager for all file operations (v1.2.0+)
7. **Security**: Use `SettingsService.getSecureApiKey()` / `setSecureApiKey()` for API keys (v1.2.8+)
8. **UI Feature Removal**: NEVER remove UI functionality without verifying target location has COMPLETE feature parity - check control settings, not just documentation
9. **State Management**: All component state should flow through Redux - avoid local state for shared data
10. **Error Handling**: Wrap all Tauri API calls with APIResponse<T> and error boundaries
11. **Rust Build**: Use `cargo check --manifest-path src-tauri/Cargo.toml` for compilation checks

### Development Commands (v1.2.0)

**Version Management**:
```bash
npm run version:sync 1.2.0     # Sync all config files to version
RELEASE_VERSION=1.2.0 node scripts/sync-version.js  # Environment variable approach
npm run release-ready          # Complete release preparation
```

**Code Analysis**:
```bash
npm run stats                  # Generate code statistics with cloc
npm run stats:verbose          # Detailed statistics output
npm run readme:update          # Auto-update README with latest stats
npm run pre-release            # Complete pre-release quality check
```

**Core Commands**:
```bash
# Development
npm run dev                    # Start Tauri desktop app
npm run dev:renderer          # Frontend only (for UI development)
npm run lint                  # ESLint check & auto-fix
npx tsc --noEmit             # TypeScript type check
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compile check

# Testing
npm test                     # Run all tests (Jest with jsdom)
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests only
npm run test:performance     # Run performance tests
npm test -- --testNamePattern="test name"  # Run single test by name
npm test -- --watch         # Run tests in watch mode
cargo test --manifest-path src-tauri/Cargo.toml   # Rust tests

# Build & Package
npm run build               # Full build (frontend + Tauri)
npm run build:renderer     # Frontend build only
npm run build:tauri        # Tauri build only
cargo tauri build          # Full production build
npm run package            # Complete packaging

# Utilities
npm run clean              # Clean build artifacts
npm run optimize           # Optimize resources
npm run diagnostic         # Run diagnostic checks
npm run setup              # Quick project setup
```

### Architecture Overview
- **Command Flow**: Frontend (`src/renderer/src/api/tauri.ts`) → Tauri IPC → Rust handlers (`src-tauri/src/commands/`)
- **AI Providers**: 5 providers with custom trait system (`src-tauri/src/services/ai_providers/trait.rs`)
- **State Management**: Redux Toolkit with 16 slices (projects, chapters, characters, ai, ui, etc.)
- **Database**: SQLite v20 with migration system, dual environment setup
- **Path Management**: Unified PathManager system (v1.2.0 breakthrough)
- **Security**: System Keyring encryption with automatic fallback (v1.2.8)
- **Editor**: Slate.js with 2-second auto-save, force remount with unique keys
- **Export**: EPUB 3.0 + PDF (Chrome Headless) with Chinese font support
- **Modal System**: Centralized modal management via Redux (`uiSlice.ts`)
- **Error Handling**: Comprehensive error boundaries and APIResponse<T> wrapper

### Important Paths
- **Dev DB**: `src-tauri/genesis-chronicle-dev.db`
- **Prod DB**: `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`
- **Commands**: `src-tauri/src/commands/` (system, project, chapter, character, ai_providers, epub, pdf_chrome)
- **API Layer**: `src/renderer/src/api/tauri.ts` (ALWAYS use `import { api }`, never direct invoke)
- **AI Providers**: `src-tauri/src/services/ai_providers/trait.rs` + implementations
- **Security Service**: `src-tauri/src/services/keyring_service.rs` + `src/renderer/src/services/settingsService.ts`
- **Security Docs**: `KEYRING_IMPLEMENTATION_SUMMARY.md`, `KEYRING_TEST.md`
- **Redux Store**: `src/renderer/src/store/store.ts` (16 slices with middleware configuration)
- **Modal Components**: `src/renderer/src/components/Modals/` (CharacterAnalysisModal, PlotAnalysisModal, etc.)
- **Settings**: `src/renderer/src/pages/Settings/` (GeneralSettings with AI feature controls)

## 📚 Detailed Documentation in Serena Memories

**Access detailed documentation via Serena MCP**:
- `development-commands-complete` - All development commands
- `system-architecture-details` - Full architecture documentation
- `troubleshooting-complete-guide` - Issue resolution guide
- `critical-development-rules` - Complete development rules

**Query memories for**:
- Template system details
- AI illustration system
- Character analysis
- Export system
- Version management
- Build configurations
- GitHub Actions setup
- Platform-specific issues

## 🎭 Key Features & Systems

### AI Provider Integration
- **Ollama**: Local, privacy-first (llama3.2, qwen2.5)
- **OpenAI**: Industry standard (gpt-4o, gpt-4o-mini, gpt-image-1)
- **Gemini**: Multimodal, long context (gemini-2.0-flash, gemini-1.5-pro)
- **Claude**: Deep understanding (claude-3.5-sonnet, claude-3.5-haiku)
- **OpenRouter**: 100+ models unified API

### Modern Features (v1.2.0+)
- **Character Analysis Modal**: Full-screen modal with z-index 10002 for character analysis
- **Plot Analysis Modal**: Full-screen modal for story plot analysis
- **Visual Creation Center**: AI illustration with batch processing
- **Smart API Detection**: Intelligent provider recommendation based on available API keys
- **Dynamic Model Discovery**: Auto-discovery of available models per provider

### Security & API Key Management (v1.2.8+)
- **Keyring Integration**: Use `SettingsService.getSecureApiKey()` / `setSecureApiKey()` for API keys
- **Automatic Migration**: localStorage → Keyring happens automatically on first use
- **Dual-Write Strategy**: All API keys written to both Keyring (primary) and localStorage (backup)
- **Graceful Fallback**: If Keyring fails, application automatically uses localStorage
- **Cross-Platform**: macOS Keychain, Windows Credential Manager, Linux Secret Service
- **Zero Breaking Changes**: Pure additive security layer, all existing functionality preserved
- **Documentation**: See [KEYRING_IMPLEMENTATION_SUMMARY.md](KEYRING_IMPLEMENTATION_SUMMARY.md) and [KEYRING_TEST.md](KEYRING_TEST.md)

### Template System (Quick Start)
- **🏰 Fantasy Adventure**: Classic magical worlds
- **💕 Campus Romance**: Modern urban youth stories
- **⚡ Isekai Reincarnation**: Popular transmigration themes
- **🚀 Sci-Fi Adventure**: Future tech space exploration
- **Access**: Settings → Template Manager → Import Template

## ⚠️ Development Warnings

- **Desktop App**: This is NOT a web app - browser URLs show blank pages
- **Serena Required**: Many features depend on Serena MCP memories  
- **No Comments**: Don't add code comments unless asked
- **Edit > Create**: Always prefer editing existing files
- **Performance**: 300% faster startup, 70% less memory than Electron
- **v1.2.0 Update**: Path management system completely overhauled - temp/final directory issues resolved

## 🎯 Workflow Best Practice

1. **Start Session**: Initialize Serena MCP
2. **Check Context**: List and read relevant memories
3. **Use Semantic Tools**: Leverage symbol search over file reading
4. **Follow Rules**: Check `critical-development-rules` memory
5. **Track Progress**: Use TodoWrite for complex tasks

---

## 🔄 Major Version Milestones

### v1.2.8 - Security Enhancement (2025-10-08)
- **OS-Native Encryption**: System Keyring integration for API key security
- **Implementation**: 260 lines (Rust 52 + TypeScript 144 + commands 58)
- **Cross-Platform**: macOS Keychain, Windows Credential Manager, Linux Secret Service
- **Zero Breaking Changes**: Pure additive security layer with automatic fallback
- **Code Growth**: +367 lines (111,017 → 112,266 total)

### v1.2.0 - System Architecture Breakthrough
- **Issue Resolved**: 2-week blocking problem with temp/final directory unification
- **Solution**: Complete PathManager architecture implementation
- **Impact**: Eliminated 6 redundant image generation commands
- **Result**: Bulletproof atomic file operations with database consistency
- **Key Changes**: Unified file operations, 100% database sync, thread safety fixes
- **Code Growth**: +8,259 lines (105,530 → 111,017 total), +46 files (447 → 466)

---

## ⚠️ UI Feature Removal Protocol (CRITICAL!)

**Background**: Critical lesson from AI插畫設定移除事件where removing "duplicate" functionality resulted in loss of user control capabilities.

### 🚨 Before Removing ANY UI Feature - Mandatory Checklist

1. **Deep Function Analysis** (not surface comparison):
   ```
   Original Location: Settings controls + documentation
   Target Location: Only documentation ❌ INCOMPLETE
   Result: Users lose control ability
   ```

2. **Function Type Verification**:
   - [ ] Setting controls (toggles/selectors/inputs)
   - [ ] Documentation/guides
   - [ ] Action buttons (test/save/reset)
   - [ ] Status indicators

3. **Complete Feature Parity Check**:
   - [ ] All user-controllable settings preserved
   - [ ] Same accessibility/discoverability
   - [ ] Workflow continuity maintained

4. **Division of Labor Analysis**:
   ```
   Question: Are locations truly duplicate OR complementary?
   Example: GeneralSettings (controls) + AISettingsModal (detailed config)
   ```

### 📋 Standard Operating Procedure

**Step 1: Create Function Inventory**
- List ALL functionality in source location
- List ALL functionality in target location
- Map each item 1:1 for verification

**Step 2: User Journey Testing**
- Can users still accomplish same tasks?
- Is the path still intuitive?
- Any workflow disruption?

**Step 3: Gradual Removal**
- Comment out UI (don't delete)
- Test functionality completeness
- Get user confirmation before permanent removal

**Step 4: Documentation Update**
- Update user guides if paths change
- Record architectural decisions in Serena

### 🎯 Case Study: AI插畫設定 Event

**What Happened**: Removed GeneralSettings AI controls assuming AISettingsModal had same functionality
**Reality**: AISettingsModal only had guides, not setting controls
**Lost Functionality**:
- 智能API檢測 toggle
- 擴展AI插圖服務 toggle
**Fix**: Restored controls to GeneralSettings with clear division of labor

**Memory Reference**: `ui-cleanup-lessons-learned` in Serena

---

*For complete documentation, query Serena memories. This file is intentionally concise to optimize context usage.*