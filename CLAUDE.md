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

**Genesis Chronicle** - AI-powered Chinese light novel writing application
- **Stack**: Tauri v2 + Rust + React/TypeScript + SQLite
- **AI**: 5 providers (Ollama, OpenAI, Gemini, Claude, OpenRouter)
- **Editor**: Slate.js with auto-save
- **Export**: EPUB 3.0 + PDF (Chrome Headless)

## 🔑 Essential Quick Reference

### Critical Rules (MUST FOLLOW)
1. **API Layer**: Always `import { api } from './api'` - never direct invoke
2. **Database**: Specify columns explicitly, never `SELECT *`
3. **Slate.js**: Use `key={editor-${id}}` for remounting
4. **TypeScript**: Use `APIResponse<T>` wrapper for type safety
5. **Modals**: Use `dispatch(openModal('name'))` system

### Development Commands
```bash
# Development
npm run dev                    # Start Tauri desktop app
npm run dev:renderer          # Frontend only (for UI development)
npm run lint                  # ESLint check & auto-fix
npx tsc --noEmit             # TypeScript type check
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compile check

# Testing
npm test                     # Run all tests (Jest with jsdom)
npm test -- --testNamePattern="test name"  # Run single test by name
npm test -- --watch         # Run tests in watch mode
cargo test --manifest-path src-tauri/Cargo.toml   # Rust tests

# Build
npm run build               # Full build (frontend + Tauri)
npm run build:renderer     # Frontend build only
cargo tauri build          # Full production build
```

### Architecture Overview
- **Command Flow**: Frontend (`src/renderer/src/api/tauri.ts`) → Tauri IPC → Rust handlers (`src-tauri/src/commands/`)
- **AI Providers**: 5 providers with custom trait system (`src-tauri/src/services/ai_providers/`)
- **Database**: SQLite v20 with migration system, dual environment setup
- **Editor**: Slate.js with 2-second auto-save, force remount with unique keys
- **Export**: EPUB 3.0 + PDF (Chrome Headless) with Chinese font support

### Important Paths
- **Dev DB**: `src-tauri/genesis-chronicle-dev.db`
- **Prod DB**: `~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`
- **Commands**: `src-tauri/src/commands/` (system, project, chapter, character, ai_providers, epub, pdf_chrome)
- **API Layer**: `src/renderer/src/api/tauri.ts` (ALWAYS use `import { api }`, never direct invoke)
- **AI Providers**: `src-tauri/src/services/ai_providers/trait.rs` + implementations

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
- **OpenAI**: Industry standard (gpt-4o, gpt-4o-mini)  
- **Gemini**: Multimodal, long context (gemini-2.5-flash, gemini-2.5-pro)
- **Claude**: Deep understanding (claude-3.5-sonnet, claude-3.5-haiku)
- **OpenRouter**: 100+ models unified API

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

## 🎯 Workflow Best Practice

1. **Start Session**: Initialize Serena MCP
2. **Check Context**: List and read relevant memories
3. **Use Semantic Tools**: Leverage symbol search over file reading
4. **Follow Rules**: Check `critical-development-rules` memory
5. **Track Progress**: Use TodoWrite for complex tasks

---

*For complete documentation, query Serena memories. This file is intentionally concise to optimize context usage.*