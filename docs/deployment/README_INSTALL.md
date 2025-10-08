# 🚀 創世紀元 - 快速安裝與測試

## 一鍵安裝（推薦）

```bash
# 克隆專案
git clone <repository-url>
cd genesis-chronicle

# 執行自動安裝腳本
node scripts/quick-install.js

# 啟動應用程式
./start-dev.sh    # macOS/Linux
# 或
start-dev.bat     # Windows
```

## 手動安裝

### 1. 基本安裝
```bash
# 安裝依賴
npm install

# 重建原生模組（重要！）
npm rebuild better-sqlite3

# 測試編譯
npm run build
```

### 2. 啟動測試
```bash
# 開發模式
npm run dev

# 如果出現資料庫錯誤，重新安裝 better-sqlite3
npm rebuild better-sqlite3
```

## ✅ 安裝驗證清單

### 必需項目
- [ ] Node.js >= 16.x 已安裝
- [ ] npm install 成功執行
- [ ] better-sqlite3 重建成功
- [ ] npm run build 編譯成功
- [ ] npm run dev 啟動成功

### 測試項目
- [ ] Electron 應用程式窗口顯示
- [ ] 可以創建新專案
- [ ] 編輯器正常工作
- [ ] 幫助系統可以打開

### 可選項目
- [ ] Ollama 已安裝（AI 功能需要）
- [ ] ollama serve 服務運行中
- [ ] AI 狀態顯示"已連線"

## 🐛 常見問題

### Q: better-sqlite3 編譯失敗？
```bash
# 解決方案 1
npm rebuild better-sqlite3

# 解決方案 2（如果方案1失敗）
rm -rf node_modules package-lock.json
npm install
```

### Q: Electron 應用程式無法啟動？
```bash
# 檢查 Node.js 版本
node --version

# 重新安裝 Electron
npm install electron@latest --save-dev
```

### Q: AI 功能不工作？
```bash
# 安裝 Ollama
# 1. 前往 https://ollama.ai 下載
# 2. 安裝後執行：
ollama pull llama3.2
ollama serve
```

## 📞 獲取幫助

1. **查看詳細指南**: `INSTALLATION_GUIDE.md`
2. **執行診斷腳本**: `node test-update-system.js`
3. **檢查使用者文檔**: `node test-user-docs.js`

## 🎯 快速測試命令

```bash
# 全面測試
npm run build && npm test

# 更新系統測試
node test-update-system.js

# 文檔系統測試  
node test-user-docs.js

# 啟動開發環境
npm run dev
```

---

**安裝完成後，應用程式內有完整的快速入門指南和使用手冊！** 🎉