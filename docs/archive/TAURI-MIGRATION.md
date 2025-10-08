# Tauri 遷移進度報告

## 概述

這是「創世紀元：異世界創作神器」從 Electron 到 Tauri 的漸進式遷移專案。我們採用雙版本並行開發策略，確保現有用戶體驗不受影響的同時，逐步建構更現代化的 Tauri 版本。

## 當前進度 (第一週)

### ✅ 已完成的任務

1. **Git 分支策略建立**
   - 創建 `feature/tauri-migration` 分支
   - 標記 `v0.4.12-electron-stable` 穩定版本
   
2. **專案結構重組**
   - 將 Electron 代碼移動到 `electron/` 目錄
   - 創建 `src-tauri/` Tauri 專案結構
   - 調整 package.json 支援雙版本開發

3. **Tauri 基礎架構**
   - 初始化 Tauri v2.7.0 專案
   - 實現基本的 system commands (get_app_version, quit_app, reload_app)
   - 配置 Cargo.toml 和 tauri.conf.json

4. **前端 API 適配層**
   - 創建統一的 API 接口 (`src/renderer/src/api/`)
   - 實現環境檢測 (isElectron, isTauri)
   - 建立 Electron 和 Tauri 的 API 實現層

5. **測試驗證**
   - Tauri 專案編譯成功
   - 開發服務器正常啟動
   - 前端環境檢測正常工作

## 專案結構

```
genesis-chronicle/
├── electron/                  # Electron 版本代碼
│   └── main/                  # 原 src/main 內容
├── src-tauri/                 # Tauri 後端
│   ├── src/
│   │   ├── commands/          # Tauri commands
│   │   │   ├── mod.rs
│   │   │   └── system.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # 共用前端代碼
│   └── renderer/
│       └── src/
│           └── api/           # API 適配層
│               ├── index.ts   # 主入口
│               ├── types.ts   # 類型定義
│               ├── electron.ts # Electron API
│               └── tauri.ts   # Tauri API
├── tsconfig.electron.json     # Electron 編譯配置
└── package.json               # 雙版本腳本
```

## 開發命令

### Electron 版本 (現有穩定版本)
```bash
npm run dev:electron          # 啟動 Electron 開發環境
npm run build:electron        # 建置 Electron 版本
```

### Tauri 版本 (開發中)
```bash
npm run dev:tauri             # 啟動 Tauri 開發環境
npm run build:tauri           # 建置 Tauri 版本
```

### 共用前端
```bash
npm run dev:renderer          # 僅啟動前端開發服務器
npm run build:renderer        # 建置前端資源
```

## API 適配層使用方式

前端代碼現在可以使用統一的 API 接口：

```typescript
import { api, isElectron, isTauri } from '../api';

// 檢測環境
if (isElectron()) {
  console.log('運行在 Electron 環境');
} else if (isTauri()) {
  console.log('運行在 Tauri 環境');
}

// 使用統一 API
const version = await api.system.getAppVersion();
await api.system.quitApp();
```

## 版本資訊

- **Electron 版本**: v0.4.12 (穩定)
- **Tauri 版本**: v2.0.0-alpha.1 (開發中)
- **共享前端**: React 18 + TypeScript + Tailwind CSS

## 下一步計劃 (第二週)

1. **資料庫層遷移**
   - 使用 rusqlite 實現 SQLite 操作
   - 遷移專案、章節、角色管理功能
   
2. **核心功能 Tauri Commands**
   - 實現 project commands
   - 實現 chapter commands  
   - 實現 character commands

3. **前端整合測試**
   - 確保 Redux store 正常工作
   - 測試路由和組件渲染
   - 驗證資料持久化

## 已知問題

1. ~~Tauri v2 編譯錯誤~~ ✅ 已解決
2. ~~API 適配層類型不匹配~~ ✅ 已解決
3. 前端組件需要適配新的 API 層 (進行中)

## 技術細節

### Tauri Commands 實現示例

```rust
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub async fn quit_app(app: AppHandle) {
    app.exit(0);
}
```

### 前端 API 調用示例

```typescript
// 統一的 API 呼叫，無論 Electron 或 Tauri
const version = await api.system.getAppVersion();
```

## 測試狀態

- ✅ Tauri 專案編譯成功
- ✅ 開發服務器啟動正常  
- ✅ 基本 commands 功能驗證
- ⏳ 前端完整功能測試 (進行中)
- ⏳ 資料庫功能遷移 (待開始)

---

**下一次更新**: 完成資料庫層遷移後更新此文件