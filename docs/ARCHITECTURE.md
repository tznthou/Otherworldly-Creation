# 系統架構

創世紀元的完整架構說明。README 只放高層次的資料流示意，細節在這裡。

> 統計資料來源：`.stats/latest.json`（2025-10-11 產出），共 112,756 行、465 個檔案。跑 `npm run stats` 可更新。

## 整體資料流

```
React 前端                Tauri IPC              Rust 後端
────────────             ──────────             ──────────
components/       ──┐
pages/              │
hooks/              ├──▶  api/tauri.ts  ──▶  commands/*.rs
store/ (Redux)      │      (唯一入口)          │
services/         ──┘                          ├──▶ services/     業務邏輯
                                               │     ├── ai_providers/
                                               │     ├── illustration/
                                               │     ├── context/
                                               │     ├── translation/
                                               │     └── keyring_service
                                               │
                                               └──▶ database/     SQLite v21
                                                     ├── models
                                                     ├── migrations
                                                     └── connection
```

**硬規則**：前端一律 `import { api } from './api'`，不直接呼叫 `invoke()`。這條規則存在的理由是型別安全——`api` 層統一包上 `APIResponse<T>`，繞過它就繞過了錯誤處理。

## Rust 後端（`src-tauri/src/`）

### 命令層 `commands/`

17 個模組，每個對應一組 Tauri command：

| 模組 | 職責 |
|------|------|
| `ai.rs` | AI 續寫核心接口 |
| `ai_providers.rs` | 多供應商管理與切換 |
| `ai_history.rs` | AI 生成歷史記錄 |
| `illustration/` | 插畫生成（獨立子目錄） |
| `batch_illustration.rs` | 批次插畫處理 |
| `pollinations_auth.rs` | Pollinations 服務認證 |
| `character.rs` | 角色 CRUD 與分析 |
| `chapter.rs` | 章節管理 |
| `project.rs` | 專案管理 |
| `context.rs` | 上下文組裝 |
| `prompt_templates.rs` | 提示詞模板 |
| `epub.rs` | EPUB 3.0 導出 |
| `pdf_chrome.rs` | PDF 導出（Chrome Headless） |
| `translation.rs` | 中英翻譯 |
| `database.rs` | 資料庫維護操作 |
| `settings.rs` | 設定讀寫 |
| `system.rs` | 系統層功能 |

### 服務層 `services/`

| 模組 | 內容 |
|------|------|
| `ai_providers/` | `trait.rs` 定義供應商抽象，`ollama.rs` / `openai.rs` / `gemini.rs` / `claude.rs` / `openrouter.rs` 各自實作，`security.rs` 處理金鑰安全 |
| `illustration/` | 風格解析、角色一致性、批次管理、視覺特徵 |
| `context/` | 超長上下文優化器，處理 10 萬字以上的文件壓縮 |
| `translation/` | 翻譯引擎、提示詞優化、動漫詞彙庫 |
| `keyring_service.rs` | 作業系統原生金鑰儲存（v1.2.8 加入） |

### AI 供應商抽象

所有供應商實作同一個 trait（`services/ai_providers/trait.rs`），新增供應商只要實作該 trait 並註冊，不需要動呼叫端。

| 供應商 | 定位 | 建議模型 |
|--------|------|---------|
| Ollama | 本地執行、隱私優先 | llama3.2、qwen2.5 |
| OpenAI | 通用品質基準 | gpt-4o、gpt-4o-mini |
| Google Gemini | 多模態、長上下文 | gemini-2.5-flash、gemini-2.5-pro |
| Anthropic Claude | 角色心理與邏輯 | claude-3.5-sonnet、claude-3.5-haiku |
| OpenRouter | 統一接口 | 100+ 模型 |

### 資料層 `database/`

SQLite，目前 schema 版本 **v21**（`migrations.rs` 的 `DB_VERSION`）。開發與正式環境使用不同檔案：

- 開發：`src-tauri/genesis-chronicle-dev.db`
- 正式：`~/Library/Application Support/genesis-chronicle/genesis-chronicle.db`

這兩者在 v1.0.2 之前是共用同一個檔案，導致開發時的測試資料污染正式資料庫。

**查詢規則**：明確列出欄位，不用 `SELECT *`。schema 會隨 migration 變動，`SELECT *` 在升版後會靜默拿到非預期的欄位順序。

## React 前端（`src/renderer/src/`）

| 層 | 檔案數 | 說明 |
|----|--------|------|
| `components/` | 270 | UI 元件，依功能分 18 個子目錄 |
| `pages/` | 54 | 8 個頂層頁面 |
| `hooks/` | 53 | 自訂 hooks，含 `illustration/`、`gallery/`、`visual-creation/` 三組 |
| `services/` | 45 | 前端業務邏輯，含 `ai-generation/` 子系統 |
| `store/` | 23 | Redux Toolkit |
| `utils/` | 20 | 工具函式 |
| `types/` | 11 | 型別定義 |
| `api/` | 9 | Tauri IPC 封裝層 |

### 頁面

`Dashboard`、`ProjectEditor`、`CharacterManager`、`ChapterStatus`、`IllustrationManager`、`Statistics`、`Settings`、`DatabaseMaintenance`

### 狀態管理

Redux Toolkit，`store.ts` 註冊 16 個 reducer：

```
projects  chapters  characters  templates
ai        aiHistory  ui         editor
editorStats  error   progress   notification
settings  visualCreation  versionManagement  ebookPreparation
```

**規則**：共用狀態一律走 Redux，不要用 local state。彈窗透過 `dispatch(openModal('name'))` 集中管理（`uiSlice.ts`），不要各自維護 `isOpen` 布林值。

middleware 有客製化的 `serializableCheck`，允許 Date 物件通過——這是為了 `progress` 與 `error` 兩個 slice 的時間戳。

### 編輯器

Slate.js，2 秒自動存檔。切換章節時必須用 `key={editor-${id}}` 強制 remount，否則 Slate 內部狀態會殘留上一章的內容。

## 導出系統

### EPUB 3.0

`commands/epub.rs`。Slate.js JSON → XHTML 轉換，嵌入中文字型，含封面生成與導出歷史。

### PDF（Chrome Headless）

`commands/pdf_chrome.rs`。這套方案是第四次嘗試的結果——前三套（printpdf、lopdf V1、lopdf V2）都卡在中文字型渲染。改用 Chrome Headless 後直接沿用瀏覽器的排版引擎，中文問題消失，同時省下 7.1MB 的內嵌字型檔。

流程：Slate.js JSON → HTML 模板 → Chrome Headless → PDF。跨平台自動偵測 Chrome 路徑，找不到時降級回 lopdf。

## 路徑管理

v1.2.0 引入的 PathManager 統一所有檔案操作。在此之前，路徑邏輯散在各處，`temp/` 與 `final/` 目錄的界線模糊，造成資料庫記錄與實際檔案不同步。

**規則**：所有檔案操作走 PathManager，不要自己組路徑字串。

Windows 上曾因為兩個路徑函式無條件附加 `.jpg` 而產生 `uuid.jpg.jpg`，花了將近一個月才定位。現在這兩個函式會先檢查副檔名是否已存在。

## 安全性

API 金鑰透過 `SettingsService.getSecureApiKey()` / `setSecureApiKey()` 存取，底層走作業系統原生 keyring：

- macOS：Keychain
- Windows：認證管理員
- Linux：Secret Service

首次使用時自動從 localStorage 遷移。採雙寫策略（keyring 為主、localStorage 為備），keyring 不可用時自動降級，不會把使用者鎖在門外。

## 已知技術債

| 項目 | 位置 |
|------|------|
| `.backup-console` / `.backup-20250831` 備份檔仍在版控中 | `src/renderer/src/store/slices/` |
| `components/Debug/` 目錄 | `src/renderer/src/components/Debug/` |
| 根目錄殘留 `batch*.py` / `fix-*.py` 等一次性腳本 | 專案根目錄 |
| `README_zh_TW.md.backup-1760676216` | 專案根目錄 |
| 開發資料庫與 WAL 檔（2.2MB）被追蹤 | `genesis-chronicle-dev.db*` |

## 相關文件

- [開發工具鏈](TOOLING.md) — 版本管理、統計、發布前檢查
- [測試指南](TESTING_GUIDE.md)
- [ESLint 設定指南](ESLINT_CONFIGURATION_GUIDE.md)
- [技術債稽核報告](TECH_DEBT_AUDIT_2025-10-11.md)
