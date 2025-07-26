# 創世紀元：異世界創作神器

一款基於 AI 的輕小說創作工具，整合 Ollama 本地 AI 引擎，為中文輕小說創作者提供智能寫作輔助。

## 🚀 開發狀態

**當前版本：MVP v0.1.0**  
**開發進度：核心功能已完成 85%**

### ✅ 已完成功能

- 🌟 **創世神模式**：完整的專案管理系統，支援多專案創作
- ⚔️ **英靈召喚**：AI輔助角色創造與管理，支援角色關係網路
- 📝 **章節式編輯器**：基於 Slate.js 的富文本編輯器，支援自動儲存
- 🔮 **預言書寫**：智能續寫與劇情建議，整合 Ollama AI 引擎
- 🎭 **輕小說模板**：異世界、校園、科幻、奇幻四大類型模板
- 💾 **資料管理**：SQLite 資料庫，支援備份還原和資料庫維護
- 🎨 **星空主題**：深藍色星空背景配金色魔法陣的動漫風格界面
- 🧪 **完整測試**：單元測試、整合測試、性能測試全覆蓋

### 🔄 開發中功能

- 🎨 **幻想具現**：AI插畫生成功能（規劃中）
- 📚 **傳說編纂**：一鍵生成專業電子書（規劃中）
- 🔧 **應用程式打包**：Electron 應用程式打包和分發

## 功能特色

## 技術架構

- **前端**: React 18 + TypeScript + Tailwind CSS
- **後端**: Electron + Node.js
- **資料庫**: SQLite
- **AI 引擎**: Ollama (本地)
- **狀態管理**: Redux Toolkit
- **編輯器**: Slate.js

## 開發環境需求

- Node.js 18+
- npm 或 yarn
- Ollama (用於 AI 功能)

## 安裝與運行

### 1. 安裝依賴

```bash
npm install
```

### 2. 安裝 Ollama

前往 [ollama.ai](https://ollama.ai) 下載並安裝 Ollama。

安裝完成後，啟動 Ollama 服務：

```bash
ollama serve
```

下載中文模型：

```bash
ollama pull llama3.2
```

### 3. 開發模式運行

```bash
npm run dev
```

這會同時啟動：
- Electron 主程序
- Vite 開發伺服器（前端）

### 4. 建置應用程式

```bash
npm run build
```

### 5. 打包應用程式

```bash
npm run package
```

## 專案結構

```
├── src/
│   ├── main/                          # Electron 主程序
│   │   ├── main.ts                   # 主程序入口
│   │   ├── preload.ts                # 預載腳本
│   │   ├── database/                 # 資料庫相關
│   │   │   └── database.ts           # SQLite 資料庫管理
│   │   ├── services/                 # 核心服務
│   │   │   ├── ollamaService.ts      # Ollama AI 服務
│   │   │   ├── contextManager.ts     # 上下文管理器
│   │   │   └── databaseMaintenance.ts # 資料庫維護
│   │   ├── ipc/                      # IPC 處理器
│   │   │   ├── ipcHandlers.ts        # 主要 IPC 處理
│   │   │   └── aiHandlers.ts         # AI 相關處理
│   │   └── __tests__/                # 測試文件
│   │       ├── database/             # 資料庫測試
│   │       ├── services/             # 服務測試
│   │       ├── integration/          # 整合測試
│   │       └── performance/          # 性能測試
│   └── renderer/                     # React 前端
│       ├── src/
│       │   ├── components/           # React 組件
│       │   │   ├── Characters/       # 角色管理組件
│       │   │   ├── Editor/           # 編輯器組件
│       │   │   ├── Modals/           # 對話框組件
│       │   │   └── UI/               # UI 組件
│       │   ├── pages/                # 頁面組件
│       │   │   ├── Dashboard/        # 儀表板
│       │   │   ├── ProjectEditor/    # 專案編輯器
│       │   │   ├── CharacterManager/ # 角色管理
│       │   │   └── Settings/         # 設定頁面
│       │   ├── store/                # Redux store
│       │   ├── services/             # 前端服務
│       │   ├── hooks/                # 自定義 hooks
│       │   └── data/                 # 資料定義
│       └── index.html
├── .kiro/                            # Kiro AI 助手設定
│   ├── steering/                     # 全局規則
│   └── specs/                        # 專案規格
├── dist/                             # 建置輸出
├── coverage/                         # 測試覆蓋率報告
├── run-*.js                          # 測試執行腳本
├── package.json
└── README.md
```

## 🧪 測試

專案包含完整的測試套件，確保代碼品質和功能穩定性：

### 測試類型

- **單元測試**：核心服務和資料庫操作測試
- **整合測試**：組件互動和工作流程測試
- **性能測試**：大量資料處理和 AI 請求性能測試

### 執行測試

```bash
# 執行所有測試
npm test

# 執行單元測試
node run-unit-tests.js

# 執行整合測試
node run-integration-tests.js

# 執行性能測試
node run-performance-tests.js
```

### 測試覆蓋率

- **資料庫服務**：完整的 CRUD 操作和維護功能測試
- **AI 服務**：Ollama 整合、錯誤處理、重試機制測試
- **上下文管理**：智能上下文構建和壓縮測試
- **使用者流程**：完整的創作工作流程端到端測試

## 開發指南

### 添加新功能

1. 在 `src/main/ipc/ipcHandlers.ts` 中添加 IPC 處理器
2. 在 `src/main/preload.ts` 中暴露 API
3. 在 `src/renderer/src/store/slices/` 中添加 Redux slice
4. 在 `src/renderer/src/components/` 中創建 React 組件
5. 在 `src/main/__tests__/` 中添加對應的測試

### 資料庫操作

資料庫操作都在 `src/main/database/database.ts` 中處理，使用 better-sqlite3：
- 支援外鍵約束和級聯刪除
- 自動資料庫遷移和版本管理
- 完整的錯誤處理和事務支援

### AI 整合

AI 功能通過 Ollama API 實現：
- **服務檢測**：`src/main/services/ollamaService.ts`
- **上下文管理**：`src/main/services/contextManager.ts`
- **IPC 處理**：`src/main/ipc/aiHandlers.ts`

### 資料庫維護

內建資料庫維護功能：
- 健康檢查和問題檢測
- 自動修復和優化
- 詳細的維護報告生成

## 📈 開發里程碑

### 已完成 (v0.1.0 MVP)
- [x] 專案管理系統 - 多專案創建、管理、刪除
- [x] 角色管理系統 - 角色創建、關係管理、原型系統
- [x] 章節式編輯器 - 富文本編輯、自動儲存、章節管理
- [x] AI 智能續寫 - Ollama 整合、上下文管理、多版本生成
- [x] 輕小說模板 - 四大類型模板、角色原型、世界設定
- [x] 資料管理 - SQLite 資料庫、備份還原、維護功能
- [x] 使用者界面 - 星空主題、動畫效果、響應式設計
- [x] 測試框架 - 單元測試、整合測試、性能測試

### 開發中 (v0.2.0)
- [ ] 應用程式打包 - Electron Forge 配置、安裝程式生成
- [ ] 自動更新機制 - 版本檢查、更新下載、安裝流程
- [ ] 使用者文檔 - 使用手冊、快速入門、常見問題

### 規劃中 (v1.0.0)
- [ ] AI 插畫生成 - 角色插畫、場景插畫、封面設計
- [ ] 電子書製作 - EPUB 生成、排版優化、封面設計
- [ ] 雲端同步 - 多裝置同步、協作編輯、版本控制
- [ ] 進階 AI 功能 - 劇情分析、角色一致性檢查、創意建議

## 🤝 貢獻指南

歡迎參與「創世紀元：異世界創作神器」的開發！

### 開發流程
1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 編寫代碼並添加測試
4. 執行測試確保功能正常 (`npm test`)
5. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
6. 推送到分支 (`git push origin feature/AmazingFeature`)
7. 開啟 Pull Request

### 代碼規範
- 使用 TypeScript 進行開發
- 遵循 ESLint 配置的代碼風格
- 為新功能添加對應的測試
- 保持代碼註釋的完整性
- 使用繁體中文進行註釋和文檔

## 授權

此專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件

## 聯絡方式

如有問題或建議，請開啟 Issue 或聯絡開發團隊。

---

**「喚醒內心的創世神，用AI之力編織異世界傳說！」**