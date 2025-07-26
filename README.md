# 創世紀元：異世界創作神器

一款基於 AI 的輕小說創作工具，整合 Ollama 本地 AI 引擎，為中文輕小說創作者提供智能寫作輔助。

## 功能特色

- 🌟 **創世神模式**：從零開始構建專屬異世界
- ⚔️ **英靈召喚**：AI輔助角色創造與管理  
- 🎨 **幻想具現**：AI插畫生成讓想像成真（開發中）
- 📚 **傳說編纂**：一鍵生成專業電子書（開發中）
- 🔮 **預言書寫**：智能續寫與劇情建議

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
│   ├── main/                 # Electron 主程序
│   │   ├── main.ts          # 主程序入口
│   │   ├── preload.ts       # 預載腳本
│   │   ├── database/        # 資料庫相關
│   │   └── ipc/             # IPC 處理器
│   └── renderer/            # React 前端
│       ├── src/
│       │   ├── components/  # React 組件
│       │   ├── pages/       # 頁面組件
│       │   ├── store/       # Redux store
│       │   └── hooks/       # 自定義 hooks
│       └── index.html
├── dist/                    # 建置輸出
├── package.json
└── README.md
```

## 開發指南

### 添加新功能

1. 在 `src/main/ipc/ipcHandlers.ts` 中添加 IPC 處理器
2. 在 `src/main/preload.ts` 中暴露 API
3. 在 `src/renderer/src/store/slices/` 中添加 Redux slice
4. 在 `src/renderer/src/components/` 中創建 React 組件

### 資料庫操作

資料庫操作都在 `src/main/database/database.ts` 中處理，使用 better-sqlite3。

### AI 整合

AI 功能通過 Ollama API 實現，相關代碼在 `src/main/ipc/ipcHandlers.ts` 的 AI 處理器中。

## 貢獻指南

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權

此專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件

## 聯絡方式

如有問題或建議，請開啟 Issue 或聯絡開發團隊。

---

**「喚醒內心的創世神，用AI之力編織異世界傳說！」**