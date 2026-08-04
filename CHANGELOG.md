# Changelog

[繁體中文](CHANGELOG_zh_TW.md)

All notable changes to Genesis Chronicle are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com); version numbers follow [Semantic Versioning](https://semver.org).

The project started on 2025-07-26 as an Electron app. Three days later the Tauri migration began, and by 2025-07-31 Electron was gone entirely. Everything from `v0.4.x` down at the bottom of this file belongs to that first, short-lived incarnation.

Two notes on how versions here map to git tags: 1.0.0 and 1.0.1 were released without tags, so they have no release link. 1.0.5 and 1.0.8 each accumulated several intermediate tags (`-beta`, `-unified`, `-powershell-fix`, `-debug`) during a rough patch with the installers and CI; those are folded into one entry each.

## [2.0.1] - 2025-11-05

### Added
- Prominent API configuration card in Settings → General, so new users stop hunting for where to paste their keys
- Blank project template — no genre, no preset world-building, no required novel length. Some people just want an empty page
- Log cleanup command that keeps the last two days and discards the rest

### Changed
- Project type icons now match the ones on the product site (Heart, Bolt, solid variants) instead of drifting from them
- Novel length became optional when creating a project

## [2.0.0] - 2025-10-17

The visual language moved from cosmic sci-fi to something warmer and more human. Every top-level page and all 20+ modals were reworked.

### Changed
- **BREAKING:** Design tokens were rebuilt on Tailwind CSS v4. Custom styles written against the old v3 token names need to be updated
- New palette across the entire app: warm gold (`#d4a574`), earth orange (`#c17d5a`), wood brown (`#8b7355`)
- All blue and purple borders left over from the cosmic theme were converted to warm gold
- Sidebar, Settings, Editor, and every modal were reworked page by page across seven passes

### Removed
- The entire `cosmic` color scheme, including the leftover variables no component referenced anymore

## [1.3.10] - 2025-10-14

### Fixed
- Database initialization crash in production builds

## [1.3.9] - 2025-10-14

### Changed
- Several UX refinements and system-level adjustments based on real usage

## [1.3.8] - 2025-10-13

### Added
- Full API configuration guide for first-time users — which provider to pick, where to get a key, what each one costs

### Removed
- Temporary batch-processing shell scripts that had been committed by accident

## [1.3.7] - 2025-10-11

The technical debt cleanup finished here. It took 54 batches to strip every stray `console.*` call out of the codebase and route logging through a single service.

### Added
- Logger service and ESLint rules that prevent raw `console.*` calls from coming back
- Console usage analysis tooling that produced the audit report driving the cleanup

### Changed
- Every `console.*` call across the codebase now goes through the logger service — roughly 1,000 call sites across 45+ files

### Fixed
- Compilation and startup bugs introduced by the automated cleanup scripts, including broken `import` statements and duplicate `from` keywords

## [1.3.5] - 2025-10-11

### Added
- MIT LICENSE file (the project had been license-less until this point)

### Changed
- Settings defaults tuned so a fresh install behaves sensibly without configuration

## [1.3.4] - 2025-10-10

Windows images had been broken since mid-September. Nearly a month of failed fixes ended when we finally dumped a detailed Windows log and read the actual path.

### Fixed
- Duplicate file extensions on Windows image paths. The database stored `uuid.jpg`, and `get_temp_image_path()` / `get_final_image_path()` appended `.jpg` unconditionally, producing `uuid.jpg.jpg`. Both functions now check for an existing extension first. macOS and Linux behavior is unchanged — the input there never carried an extension

## [1.3.3] - 2025-10-10

### Added
- Log management system
- Version-pinning comments in `Cargo.toml` warning against loose Tauri version ranges

### Fixed
- `npm install` failure caused by an invalid `COMMENT` field
- Tauri `plugin-log` version mismatch between the Rust and NPM sides; all Tauri plugin versions are now pinned exactly
- Release workflow now handles the case where the GitHub release already exists

## [1.3.2] - 2025-10-10

### Added
- Manual trigger option for the GitHub Actions build

### Fixed
- Image display on Windows by using the full path consistently

## [1.3.1] - 2025-10-09

### Changed
- Version bump only

## [1.3.0] - 2025-10-09

### Fixed
- Image loading for both Pollinations and Gemini — the two services return different path shapes and only one was handled

## [1.2.10] - 2025-10-09

### Fixed
- Gemini image previews failing because the image path field was named inconsistently across layers

## [1.2.9] - 2025-10-09

### Changed
- Project files reorganized: the root directory was cleared out and a structured `docs/` tree was introduced

### Fixed
- Windows image display

## [1.2.8] - 2025-10-08

### Added
- API keys are now stored in the OS-native keyring — macOS Keychain, Windows Credential Manager, Linux Secret Service. Roughly 260 lines across Rust, TypeScript, and the command layer

### Security
- API keys no longer live in plain `localStorage`. Migration is automatic on first use, with dual-write to keyring and localStorage so a keyring failure degrades gracefully instead of locking you out

### Fixed
- CI builds failing on keyring by enabling the platform-specific features
- Tauri NPM package versions downgraded to match the pinned Rust `tauri` version. This mismatch caused nine consecutive CI failures before the cause was found

## [1.2.7] - 2025-09-17

### Fixed
- Windows image display compatibility

## [1.2.6] - 2025-09-17

### Fixed
- Image display in the Windows environment

## [1.2.5] - 2025-09-16

### Changed
- Cross-platform compatibility work and improvements to the visual creation flow

## [1.2.3] - 2025-09-15

### Fixed
- OpenRouter failing to detect Gemini models
- Image display in production builds

### Removed
- The `debug` folder and all its test components

## [1.2.1] - 2025-09-13

### Changed
- Documentation restructured across the board

## [1.2.0] - 2025-09-13

### Added
- Gemini image generation API integration
- PathManager — a single unified path management system, replacing scattered path logic

### Changed
- Temporary image handling now uses deferred deletion instead of immediate cleanup, which was racing with in-flight reads
- TypeScript errors: 21 → 0. ESLint warnings: 10 → 0

## [1.1.9] - 2025-09-12

Two weeks of work on one problem. The image generation system had been unreliable in a way that resisted every surface-level fix.

### Changed
- Path system rebuilt so `temp/` and `final/` directories are genuinely separate. Six redundant image generation commands collapsed into the new architecture
- Database and filesystem state now stay in sync, which they previously did not
- NotificationSystem integrated throughout — operations that used to complete silently now report progress and results

### Fixed
- TypeScript errors: 63 → 0

## [1.1.8] - 2025-09-01

### Added
- `gemini_image_api.rs`, `provider_trait.rs`, and `features.ts`
- Unified PathManager architecture (first implementation, refined further in v1.1.9)

### Fixed
- 63 TypeScript errors across 57 files. The bulk were duplicate function declarations in `useVersionComparison.ts` (32 alone), error-type handling in the version hooks, and unsafe nested type mapping in the batch submission flow
- Error handling standardized on `error instanceof Error ? error.message : String(error)`

## [1.1.7] - 2025-08-31

### Changed
- GitHub Actions timeout extended to 45 minutes and the Rust cache configuration improved — builds were being killed mid-compile

## [1.1.6] - 2025-08-30

Crossed 100,000 lines of core code.

### Added
- Image favorites system (database upgraded to v19)

### Changed
- Image path architecture unified across development and production environments
- Version numbers now managed together across `package.json`, `Cargo.toml`, and `tauri.conf.json`

### Fixed
- CSP-related image display failures via SafeImage component fixes

## [1.1.5] - 2025-08-29

### Fixed
- Image paths on Windows

## [1.1.4] - 2025-08-29

### Added
- AI illustration preview system — batch-generated images are now shown in a gallery for selection instead of being applied blind
- StyleResolver module supporting realistic, anime, concept art, and manga styles, with unit tests

## [1.1.3] - 2025-08-26

### Fixed
- GitHub Actions build failure caused by a Rust module conflict

## [1.1.2] - 2025-08-26

### Fixed
- AI illustration gallery failing to load

## [1.1.0] - 2025-08-24

### Changed
- AI continuation rebuilt from a single 200-line function into seven service modules: ValidationService, ContextPreparationService, ParameterOptimizer, GenerationExecutor, ProgressManager, and the `useAIGeneration` hook tying them together
- Context handling optimized for documents over 100k characters
- Model-specific parameter tuning for the o1 series, Gemini Flash, GPT-4, and Claude

### Added
- Visual Creation Center, consolidating the previously scattered illustration features into one interface
- Pollinations.AI integration for free illustration generation
- Test infrastructure

## [1.0.9] - 2025-08-20

### Added
- Focus writing mode — non-editor elements fade out to reduce distraction

### Fixed
- Windows MSI build by adding `msi` to the bundle targets

## [1.0.8] - 2025-08-19

### Added
- AI parameter documentation in the settings UI
- Significantly expanded model support

### Changed
- macOS distribution now recommends DMG over PKG
- ESLint warnings: 74 → 0

### Fixed
- OpenRouter API integration
- Chapter notes failing to save

## [1.0.5] - 2025-08-16

### Added
- Character analysis UI with Recharts visualizations
- AI illustration system with character integration
- Unified version management across config files
- Dual-track macOS installation

### Fixed
- PKG installer permissions so the app is visible to all users
- Infinite React re-render in the batch illustration system

## [1.0.4] - 2025-08-11

### Fixed
- PKG installer extraction failure

## [1.0.3] - 2025-08-11

### Added
- PKG installer support for macOS

### Fixed
- Multiple GitHub Actions failures — YAML syntax, indentation, conditional expressions, and deprecated action warnings. The workflow was eventually rewritten from scratch against Tauri's official CI guidance

## [1.0.2] - 2025-08-10

### Added
- EPUB 3.0 generation and the plot analysis engine
- PDF generation with Chinese font support and a typography engine
- Character analysis system
- Intel Mac build support
- GitHub Actions CI/CD

### Changed
- Context Engineering refactor separating the system prompt from user context
- AI provider architecture unified across all providers

### Fixed
- Development and production databases now use separate paths — they had been sharing one file
- AI continuation producing duplicate content
- Thinking-tag leakage in AI continuation output
- Redux read-only errors on Date objects across every slice

## [1.0.1] - 2025-08-09

### Added
- Gold scrollbar on the statistics page
- Smarter AI provider auto-selection

## [1.0.0] - 2025-07-31

### Changed
- **BREAKING:** Electron removed entirely. The app is now pure Tauri — every Electron-era IPC handler, build script, and packaging path is gone

### Fixed
- Error boundary component reference (hotfix, same day)

## [0.4.14-electron-final] - 2025-07-31

The last tag carrying the Electron lineage, though by this point the Tauri build was already the one being developed against.

### Added
- AI continuation visual feedback
- Character management and AI settings on the Tauri side
- SQLite connection for the Tauri build

### Changed
- Internationalization system rebuilt

### Fixed
- CSP configuration and database schema problems blocking the Tauri build

### Removed
- All remaining Electron API dependencies from the Tauri version

## [0.4.12-electron-stable] - 2025-07-29

The final stable Electron build. The Tauri migration started the same day.

### Added
- Data management, tutorial system, help system, light novel templates, and writing statistics
- Auto-update system
- One-click installer and user documentation

### Fixed
- Ollama connectivity, after six attempts across v0.3.3 – v0.4.6. The root causes turned out to be duplicate IPC handler registration and Electron main-process network request handling
- App loading blocked on startup
- Editor rebuilt with proper database persistence

[2.0.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v2.0.1
[2.0.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v2.0.0
[1.3.10]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.10
[1.3.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.9
[1.3.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.8
[1.3.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.7
[1.3.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.5
[1.3.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.4
[1.3.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.3
[1.3.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.2
[1.3.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.1
[1.3.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.3.0
[1.2.10]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.10
[1.2.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.9
[1.2.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.8
[1.2.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.7
[1.2.6]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.6
[1.2.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.5
[1.2.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.3
[1.2.1]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.1
[1.2.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.2.0
[1.1.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.9
[1.1.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.8
[1.1.7]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.7
[1.1.6]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.6
[1.1.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.5
[1.1.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.4
[1.1.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.3
[1.1.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.2
[1.1.0]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.1.0
[1.0.9]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.9
[1.0.8]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.8
[1.0.5]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.5-complete
[1.0.4]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.4
[1.0.3]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.3
[1.0.2]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v1.0.2
[0.4.14-electron-final]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v0.4.14-electron-final
[0.4.12-electron-stable]: https://github.com/tznthou/Otherworldly-Creation/releases/tag/v0.4.12-electron-stable
