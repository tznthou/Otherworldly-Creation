# 創世紀元：異世界創作神器 - 安裝測試指南

## 📋 系統需求

### 最低要求
- **作業系統**: Windows 10+, macOS 10.14+, Linux Ubuntu 18.04+
- **Node.js**: 16.x 或更高版本
- **記憶體**: 4GB RAM
- **硬碟空間**: 2GB 可用空間
- **網路**: 穩定的網路連線（用於下載依賴和 AI 功能）

### 推薦配置
- **記憶體**: 8GB+ RAM
- **硬碟**: SSD 硬碟
- **網路**: 高速寬頻連線

## 🚀 快速安裝

### 1. 克隆專案
```bash
git clone <repository-url>
cd genesis-chronicle
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 重建原生模組（重要！）
```bash
npm rebuild better-sqlite3
```

### 4. 啟動開發環境
```bash
npm run dev
```

## 🔧 詳細安裝步驟

### 步驟 1: 環境準備

1. **安裝 Node.js**
   - 前往 [nodejs.org](https://nodejs.org) 下載並安裝 LTS 版本
   - 驗證安裝：`node --version` 和 `npm --version`

2. **安裝 Git**（如果尚未安裝）
   - Windows: 下載 Git for Windows
   - macOS: `xcode-select --install` 或使用 Homebrew
   - Linux: `sudo apt-get install git`

### 步驟 2: 專案設置

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd genesis-chronicle
   ```

2. **安裝 npm 依賴**
   ```bash
   npm install
   ```

3. **處理原生模組**
   ```bash
   # 重建 better-sqlite3 以匹配您的系統
   npm rebuild better-sqlite3
   
   # 如果出現問題，嘗試清除並重新安裝
   npm run clean
   npm install
   npm rebuild better-sqlite3
   ```

### 步驟 3: AI 功能設置（可選但推薦）

1. **安裝 Ollama**
   - 前往 [ollama.ai](https://ollama.ai) 下載安裝包
   - 安裝後執行：`ollama --version` 驗證

2. **下載 AI 模型**
   ```bash
   # 推薦的中文模型
   ollama pull llama3.2
   
   # 或其他支援的模型
   ollama pull mistral
   ollama pull codellama
   ```

3. **啟動 Ollama 服務**
   ```bash
   ollama serve
   ```

## 🧪 測試指南

### 基本功能測試

1. **編譯測試**
   ```bash
   npm run build
   ```

2. **執行單元測試**
   ```bash
   npm test
   ```

3. **執行特定測試**
   ```bash
   # 測試更新系統
   node test-update-system.js
   
   # 測試使用者文檔系統
   node test-user-docs.js
   ```

### 開發環境測試

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   - 應該看到 Electron 應用程式窗口
   - 前端運行在 http://localhost:3000
   - 檢查控制台是否有錯誤

2. **測試核心功能**
   - 創建新專案
   - 添加章節和角色
   - 測試編輯器功能
   - 檢查 AI 狀態（如果已安裝 Ollama）

### 打包測試

1. **生成安裝包**
   ```bash
   npm run make
   ```

2. **測試特定平台**
   ```bash
   # macOS
   npm run make:mac
   
   # Windows
   npm run make:win
   
   # Linux
   npm run make:linux
   ```

## 🐛 常見問題解決

### 問題 1: better-sqlite3 編譯失敗

**症狀**: 出現 "Could not locate the bindings file" 錯誤

**解決方案**:
```bash
# 方案 1: 重建模組
npm rebuild better-sqlite3

# 方案 2: 清除並重新安裝
rm -rf node_modules package-lock.json
npm install

# 方案 3: 使用特定 Python 版本（如果需要）
npm config set python python3.8
npm rebuild better-sqlite3
```

### 問題 2: Electron 應用程式無法啟動

**症狀**: 開發環境啟動失敗

**解決方案**:
```bash
# 檢查 Node.js 版本
node --version

# 重新安裝 Electron
npm install electron@latest --save-dev

# 清除 Electron 快取
npx electron --version
```

### 問題 3: AI 功能無法使用

**症狀**: AI 狀態顯示"未連線"

**解決方案**:
1. 確認 Ollama 已安裝並運行：`ollama --version`
2. 啟動 Ollama 服務：`ollama serve`
3. 測試 API：`curl http://localhost:11434/api/tags`
4. 檢查防火牆設置

### 問題 4: 打包失敗

**症狀**: make 命令執行失敗

**解決方案**:
```bash
# 確保所有依賴都已安裝
npm install

# 重新編譯原生模組
npm rebuild

# 清除舊的打包文件
npm run clean

# 重新打包
npm run make
```

## 📝 測試檢查清單

### ✅ 安裝驗證
- [ ] Node.js 版本 >= 16.x
- [ ] npm 可以正常運行
- [ ] 專案依賴安裝成功
- [ ] better-sqlite3 編譯成功

### ✅ 開發環境
- [ ] `npm run dev` 成功啟動
- [ ] Electron 應用程式窗口顯示
- [ ] 前端頁面正常載入
- [ ] 資料庫初始化成功

### ✅ 核心功能
- [ ] 可以創建新專案
- [ ] 編輯器正常工作
- [ ] 角色管理功能正常
- [ ] 設定頁面可以訪問

### ✅ AI 功能（如果已安裝 Ollama）
- [ ] AI 狀態顯示"已連線"
- [ ] 可以列出可用模型
- [ ] AI 續寫功能正常

### ✅ 打包功能
- [ ] `npm run build` 成功
- [ ] `npm run make` 生成安裝包
- [ ] 安裝包可以正常安裝和運行

### ✅ 使用者文檔
- [ ] 幫助中心可以打開
- [ ] 快速入門指南正常運行
- [ ] 使用手冊內容完整
- [ ] FAQ 搜尋功能正常

## 🆘 獲取幫助

如果遇到無法解決的問題：

1. **檢查日誌**
   - 開發模式：查看終端輸出和瀏覽器控制台
   - 生產模式：檢查應用程式日誌文件

2. **系統診斷**
   ```bash
   # 生成系統診斷報告
   npm run diagnostic
   ```

3. **聯繫支援**
   - 準備系統資訊（OS 版本、Node.js 版本等）
   - 提供錯誤日誌和重現步驟
   - 描述預期行為和實際行為

## 🎉 成功安裝

如果所有測試都通過，恭喜！您已經成功安裝了創世紀元。

**下一步:**
1. 查看快速入門指南學習基本使用
2. 完成互動式教學了解所有功能
3. 開始您的創作之旅！

---

*最後更新: 2024-01-XX*
*版本: 0.1.0*