# 🍋 Sniffly 使用手冊

> Claude Code 的 AI 分析儀表板 - 讓你更了解自己的 AI 協作習慣！

## 📖 什麼是 Sniffly？

Sniffly 是一個專門分析 Claude Code 使用情況的工具，幫你：
- 📊 分析 AI 使用模式和習慣
- 🐛 發現錯誤和改進機會
- 📝 回顧過去的對話記錄
- 🔒 **完全本地運行，保護隱私**

## 🚀 快速開始

### 訪問儀表板
打開瀏覽器，前往：**http://127.0.0.1:8081**

> 💡 已設定自動啟動，每次開機都會自動運行！

## 🎮 常用指令

### 基本控制
```bash
# 啟動服務（如果沒有自動啟動）
sniffly init

# 或使用簡化指令
sniff
sniff-start
```

### 狀態管理
```bash
# 檢查運行狀態
sniff-status

# 停止服務
sniff-stop

# 重新啟動
sniff-stop && sniff-start
```

### 配置設定
```bash
# 更改 port（預設 8081）
sniffly config set port 8090

# 關閉自動開啟瀏覽器
sniffly config set auto_browser false

# 查看所有設定
sniffly config list
```

## 📊 儀表板功能

### 主要面板
1. **使用統計** - 查看 AI 互動次數和趨勢
2. **錯誤分析** - 識別常見問題和解決方案
3. **對話記錄** - 搜尋和回顧過去的互動
4. **模式分析** - 了解你的 AI 協作習慣

### 實用功能
- 🔍 **搜尋對話** - 快速找到特定的討論內容
- 📈 **趨勢圖表** - 視覺化你的使用模式
- 🎯 **改進建議** - 基於數據的優化建議
- 📤 **匯出數據** - 分享分析結果

## ⚙️ 系統設定

### 自動啟動管理
```bash
# 移除自動啟動
launchctl unload ~/Library/LaunchAgents/com.sniffly.plist

# 重新啟用自動啟動
launchctl load ~/Library/LaunchAgents/com.sniffly.plist
```

### 解除安裝
```bash
# 完全移除 Sniffly
uv tool uninstall sniffly

# 移除自動啟動設定
rm ~/Library/LaunchAgents/com.sniffly.plist
launchctl unload ~/Library/LaunchAgents/com.sniffly.plist
```

## 🔧 疑難排解

### 常見問題

**Q: 無法存取 http://127.0.0.1:8081**
```bash
# 檢查服務狀態
sniff-status

# 重新啟動
sniff-stop && sniff-start
```

**Q: Port 衝突怎麼辦？**
```bash
# 更改到其他 port
sniffly config set port 8082
```

**Q: 資料太大無法分析？**
- Sniffly 會跳過超過 500MB 的專案資料夾
- 這是正常行為，不影響其他專案的分析

**Q: 如何暫停自動啟動？**
```bash
launchctl unload ~/Library/LaunchAgents/com.sniffly.plist
```

### 日誌檢查
```bash
# 查看運行日誌
tail -f /tmp/sniffly.log

# 查看錯誤日誌
tail -f /tmp/sniffly.error.log
```

## 🎯 使用建議

### 最佳實踐
1. **定期查看** - 每週檢查一次分析結果
2. **關注趨勢** - 觀察使用模式的變化
3. **學習改進** - 根據錯誤分析優化工作流程
4. **保持更新** - 定期更新到最新版本

### 隱私保護
- ✅ 所有數據都在本地處理
- ✅ 不會傳送任何資訊到外部伺服器
- ✅ 完全離線運作

## 📞 需要幫助？

- **作者**：Chip Huyen（知名 AI/ML 專家）
- **專案頁面**：https://github.com/chiphuyen/sniffly
- **許可證**：MIT License

---

## 🚀 更新日誌

### v0.1.5 (目前版本)
- Claude Code 分析功能
- 本地儀表板介面
- 自動快取管理
- 配置系統

---

💡 **小提示**：這個工具會隨著你使用 Claude Code 的時間越長，提供越有價值的分析！

🎉 **享受你的 AI 分析之旅！**