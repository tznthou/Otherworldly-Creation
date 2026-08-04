# 開發工具鏈

版本管理、程式碼統計、發布前檢查的完整說明。日常開發指令在 README，這裡是自動化工具的細節。

## 一鍵發布準備

```bash
npm run release-ready
```

等同依序執行 `npm run stats` → `npm run readme:update` → `npm run pre-release`。發布前跑這一條就夠。

## 版本管理

三個設定檔的版本號必須一致：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。

```bash
npm run version:check          # 檢查三者是否一致
npm run version:sync           # 檢查當前版本一致性
npm run version:sync 2.0.2     # 同步所有設定檔到指定版本

RELEASE_VERSION=2.0.2 npm run version:sync   # CI/CD 用環境變數方式
```

會做的事：

- 同步三個設定檔的版本欄位
- 驗證版本號符合 `x.y.z` 格式
- 彩色進度輸出與錯誤處理
- 提示後續步驟

### Tauri 版本鎖定陷阱

Rust 端的 `tauri` 版本與 NPM 端的 `@tauri-apps/*` 套件版本必須精確匹配。v1.2.8 發布時因為這件事連續九次 CI 失敗。

所有 Tauri 相關套件一律用精確版本，不加 `^`：

```json
"@tauri-apps/api": "2.7.0",
"@tauri-apps/plugin-store": "2.3.0"
```

發布前檢查：

- `npm list @tauri-apps/api` 確認 `package-lock.json` 的實際版本
- `Cargo.toml` 的 plugin 版本與 NPM 對應套件一致

## 程式碼統計

```bash
npm run stats            # 用 cloc 產出統計
npm run stats:verbose    # 含原始輸出
```

產出檔案：

| 檔案 | 內容 |
|------|------|
| `.stats/latest.json` | 最新統計 |
| `.stats/history.json` | 最近 10 次的歷史趨勢 |
| `.stats/readme-format.json` | 供 README 更新用的格式 |

統計維度：TypeScript / Rust / JavaScript 三種語言的行數、檔案數、註解比例、平均檔案行數，以及與歷史資料對比的成長率。自動排除 `node_modules`、`target`、`.git`。

## 文檔自動更新

```bash
npm run readme:update
```

依 `.stats/latest.json` 更新 README 裡的統計數字、版本徽章、架構圖數值與時間戳。

安全機制：

- 自動備份到 `.stats/README_backup_[timestamp].md`
- 失敗時自動回滾
- 產出更新報告 `.stats/readme_update_[timestamp].json`

> 這個工具只更新數字，不會重寫結構。README 的區塊安排請手動維護——工具改過的地方僅限它認得的 pattern。

## 發布前檢查

```bash
npm run pre-release
```

七類檢查，報告寫到 `.stats/pre-release-check_[timestamp].json`：

1. **版本號一致性** — 三個設定檔是否同步
2. **Git 狀態** — 工作目錄是否乾淨、當前分支
3. **程式碼品質** — TypeScript 型別檢查、ESLint、Rust 編譯
4. **依賴安全** — `npm audit`、`cargo audit`（若已安裝）
5. **建置測試** — Vite 前端建置、Rust 函式庫建置
6. **關鍵檔案** — README 與設定檔是否存在
7. **單元測試** — Jest（若有設定）

結果分三級：

| 結果 | 意義 |
|------|------|
| 可安全發布 | 全數通過 |
| 建議處理後發布 | 有警告，無關鍵錯誤 |
| 禁止發布 | 存在關鍵錯誤 |

## 工作流程

### 日常

```bash
npm run stats && npm run readme:update
```

### 版本發布

```bash
npm run version:sync 2.0.2      # 1. 更新版本號
npm run release-ready           # 2. 完整發布準備
git tag v2.0.2 && git push origin v2.0.2   # 3. 建立 tag
                                # 4. GitHub Actions 自動跨平台建置
```

### 快速確認

```bash
npm run pre-release      # 發布前最後確認
npm run version:check    # 只檢查版本一致性
```

## 工具安裝

**必需**（腳本會自動偵測）：

```bash
# cloc — 程式碼統計
brew install cloc          # macOS
choco install cloc         # Windows
npm install -g cloc        # 跨平台
```

**選用**：

```bash
cargo install cargo-audit  # Rust 安全稽核
```

## 相關文件

- [系統架構](ARCHITECTURE.md)
- [測試指南](TESTING_GUIDE.md)
- [ESLint 設定指南](ESLINT_CONFIGURATION_GUIDE.md)
