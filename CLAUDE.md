# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 新 session 開始前，先讀取 `.claude/RESUME.md`

## 🚀 Serena MCP Integration (CRITICAL!)

**ESSENTIAL**: This project REQUIRES Serena MCP for full functionality. Initialize at session start:

```bash
# Initialization Workflow (MUST DO):
1. mcp__serena__check_onboarding_performed()  # Always first
2. mcp__serena__list_memories()                # View 180+ memories
3. Read relevant memories for current task      # Context-aware development
```

**Core Capabilities**:
- **Memory System**: 180+ categorized project memories
- **Semantic Search**: `find_symbol()`, `search_for_pattern()`, `get_symbols_overview()`
- **Smart Editing**: `replace_symbol_body()`, `insert_before/after_symbol()`
- **Knowledge Base**: Read/write persistent project knowledge

## 📝 Project Overview

**Genesis Chronicle v2.0.1** - AI-powered Chinese light novel writing application
- **Stack**: Tauri v2 + Rust + React/TypeScript + SQLite
- **Scale**: 109,509 lines of code across 457 files (3 languages)
- **AI**: 5 providers (Ollama, OpenAI, Gemini, Claude, OpenRouter)
- **Security**: OS-native Keyring encryption for API keys (v1.2.8+)
- **Design**: Human-centered warm design system (v2.0.0+)
- **Editor**: Slate.js with auto-save
- **Export**: EPUB 3.0 + PDF (Chrome Headless)

## 🔑 Essential Quick Reference

### Critical Rules (MUST FOLLOW)
1. **API Layer**: Always `import { api } from './api'` - never direct invoke
2. **Database**: Specify columns explicitly, never `SELECT *`
3. **Slate.js**: Use `key={editor-${id}}` for remounting
4. **TypeScript**: Use `APIResponse<T>` wrapper for type safety
5. **Modals**: Use `dispatch(openModal('name'))` system via Redux uiSlice
6. **Path Management**: Use `utils::path_utils` for file paths (the de-facto standard, 23 call sites); `PathManager` is legacy (2 methods in real use) — don't route new code through it
7. **Security**: Use `SettingsService.getSecureApiKey()` / `setSecureApiKey()` for API keys (v1.2.8+)
8. **UI Feature Removal**: NEVER remove UI functionality without verifying target location has COMPLETE feature parity - check control settings, not just documentation
9. **State Management**: All component state should flow through Redux - avoid local state for shared data
10. **Error Handling**: Wrap all Tauri API calls with APIResponse<T> and error boundaries
11. **Rust Build**: Use `cargo check --manifest-path src-tauri/Cargo.toml` for compilation checks
12. **Testing**: TDD applies forward only — new code gets tests first. See 🧪 Testing below

### Development Commands (v1.2.0)

**Version Management** (`scripts/sync-version.js`, one script, two modes):
```bash
npm run version:check          # No version given → check only, exits 1 if the 3 config files disagree
npm run version:sync 2.0.1     # Version given → sync package.json / Cargo.toml / tauri.conf.json
RELEASE_VERSION=2.0.1 node scripts/sync-version.js   # Same, via env var (CI uses GITHUB_REF)
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
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report
npm test -- --testNamePattern="test name"  # Run single test by name
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
- **Database**: SQLite v21 with migration system, dual environment setup
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
- **Security Docs**: `docs/KEYRING_IMPLEMENTATION_SUMMARY.md`, `docs/KEYRING_TEST.md`
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
- **Ollama**: Local, privacy-first (dynamic model list)
- **OpenAI**: Industry standard (dynamic model list)
- **Gemini**: Multimodal, long context (hardcoded list, Gemini 2.5 series)
- **Claude**: Deep understanding (hardcoded list: claude-opus-5 / claude-sonnet-5 / claude-haiku-4-5)
- **OpenRouter**: 100+ models unified API (dynamic model list)

### Modern Features (v1.2.0+)
- **Character Analysis Modal**: Full-screen modal with z-index 10002 for character analysis
- **Plot Analysis Modal**: Full-screen modal for story plot analysis
- **Visual Creation Center**: AI illustration with batch processing
- **Smart API Detection**: Intelligent provider recommendation based on available API keys
- **Dynamic Model Discovery**: Auto-discovery of available models (Ollama / OpenAI / OpenRouter only; Claude & Gemini use hardcoded lists)

### Security & API Key Management (v1.2.8+)
- **Keyring Integration**: Use `SettingsService.getSecureApiKey()` / `setSecureApiKey()` for API keys
- **Automatic Migration**: localStorage → Keyring happens automatically on first use
- **Dual-Write Strategy**: All API keys written to both Keyring (primary) and localStorage (backup)
- **Graceful Fallback**: If Keyring fails, application automatically uses localStorage
- **Cross-Platform**: macOS Keychain, Windows Credential Manager, Linux Secret Service
- **Zero Breaking Changes**: Pure additive security layer, all existing functionality preserved
- **Documentation**: See [docs/KEYRING_IMPLEMENTATION_SUMMARY.md](docs/KEYRING_IMPLEMENTATION_SUMMARY.md) and [docs/KEYRING_TEST.md](docs/KEYRING_TEST.md)

### Template System (Quick Start)
- **🏰 Fantasy Adventure**: Classic magical worlds
- **💕 Campus Romance**: Modern urban youth stories
- **⚡ Isekai Reincarnation**: Popular transmigration themes
- **🚀 Sci-Fi Adventure**: Future tech space exploration
- **Access**: Settings → Template Manager → Import Template

## 🧪 Testing (TDD, 2026-08-05+)

**Scope**: TDD applies **forward only**. New code gets tests first; existing code gets tests only when you touch it. Never retrofit tests across the codebase.

**Baseline (must stay green)**: frontend 12 passed / Rust 34 passed / **0 failed / 0 skipped**. CI runs on every push to `main` and every PR — `frontend` on ubuntu + windows, `rust` on windows + macos. A red CI is a real signal now.

```bash
npm test                                          # jest (unit + integration projects)
cargo test --manifest-path src-tauri/Cargo.toml   # lib + doctest
```

### The one rule that matters

**A green test must mean the product works.** If a test can't turn red when production code breaks, it is worse than no test — it manufactures the appearance of coverage. 2026-08-05 deleted 55 tests that had never once passed, plus 7 that were always green while touching zero production code.

Three ways fake green happens here — all three have already bitten this repo:

1. `jest.mock` an entire module, then assert on that mock. Always green, verifies nothing, and it **hid a real gap for a year** (`context-engineering.test.ts` "tested" three APIs the frontend never wired up)
2. Render something the test itself wrote inline (`<div onKeyDown={...}>`) and assert your own handler fired — that tests React, not the product
3. Placeholder tests in helper files, re-registered once per importing suite

### How to write one that counts

- **Feed data through the Tauri command channel** — `mockTauriCommand('get_all_projects', () => [...])` from `src/__tests__/integration/setup.ts`. Components read via api layer → `enhancedSafeInvoke` → `invoke`. Setting `window.electronAPI` does **nothing** (Electron leftover; only 3 optional-chaining sites remain)
- **Build the store with `createAppStore()`** from `store/store.ts`, never hand-roll a reducer list — the old helper did and silently lost 4 slices
- **Verify the UI actually looks like that before asserting on it.** The deleted suites passed `isOpen`/`onClose` to a modal that takes no props (it dispatches `closeModal()`), queried a `modal-backdrop` testId that never existed, and drove `ProjectGrid` — a component nothing imports
- **When a test fails, get evidence before theorizing.** Insert a log and confirm which function actually runs. `validates age range` sat skipped for months because everyone assumed a JS validation path that HTML5 `min`/`max` preempts — submit never dispatches, so `handleSubmit` never runs
- Reference example: `src/__tests__/integration/workflows/dashboard.test.tsx`

📚 **Deletion rationale, backlog of uncovered flows, and known gaps**: [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

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

### v2.0.1 - UX Refinements & Creative Freedom (2025-01-05)
- **API Configuration Quick Access**: Prominent guidance card in Settings → General
- **Blank Project Template**: No template constraints, optional novel length
- **Project Type Icons**: Unified with product website (Heart, Bolt, solid variants)
- **Log Management**: Delete old logs feature (keeps last 2 days, prevents size bloat)
- **Impact**: Enhanced onboarding experience, creative flexibility, system maintenance
- **Code Changes**: +421 lines insertion, -63 deletions (12 files modified)

### v2.0.0 - The Human Design Era (2025-10-17)
- **Visual Language Revolution**: Complete UI redesign from cosmic sci-fi to warm humanities
- **Tailwind CSS v4**: Architecture upgrade with unified design token system
- **New Color Palette**: Warm gold (#d4a574), earth orange (#c17d5a), wood brown (#8b7355)
- **100% Coverage**: All 7 top-level pages + 20+ modal components
- **Maintenance Efficiency**: +90% improvement via centralized design management
- **Why v2.0**: Product identity redefinition - tech tool → human-centered creative companion
- **Code Changes**: ~500 lines of color system refactoring, zero breaking changes

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

## 🐛 Critical Development Lessons

### ⚠️ Tauri Version Matching (v1.2.8 經驗)
**Key Issue**: Rust and NPM package version mismatch caused 9 consecutive CI failures

**Quick Solution**: Use exact versions (no `^`) for all Tauri packages:
```json
"@tauri-apps/api": "2.7.0",           // Match Rust tauri = "=2.7.0"
"@tauri-apps/plugin-store": "2.3.0"   // Match Rust plugin version
```

**Pre-Release Checklist**:
- [ ] Verify `package-lock.json` with `npm list @tauri-apps/api`
- [ ] Ensure all Tauri packages use exact versions
- [ ] Check Cargo.toml plugins match NPM counterparts

📚 **Complete Guide**: Query Serena memory `v1-3-3-npm-install-fix-lesson`

---

## ⚠️ UI Feature Removal Protocol

**CRITICAL RULE**: NEVER remove UI functionality without verifying target location has COMPLETE feature parity

### 🚨 Mandatory Pre-Removal Checklist
1. **Deep Function Analysis**: Distinguish controls vs documentation
2. **Feature Parity Verification**: All user-controllable settings preserved
3. **User Journey Testing**: Workflow continuity maintained
4. **Gradual Removal**: Comment first, test, then delete

### ⚡ Quick Reference
- [ ] List ALL functionality in both locations (1:1 mapping)
- [ ] Verify controls (toggles/selectors) not just documentation
- [ ] Test user workflows remain unbroken
- [ ] Record decisions in Serena memory

📚 **Complete Protocol**: Query Serena memory `ui-cleanup-lessons-learned`
🎯 **Case Study**: AI插畫設定 removal incident and recovery process

---

*For complete documentation, query Serena memories. This file is intentionally concise to optimize context usage.*