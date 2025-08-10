# 🤖 Genesis Chronicle CI/CD 自動化構建

## 🎯 雙 Workflow 策略

基於 SQT 深度分析，採用**職責分離**的設計：

### 🧪 測試構建 (`test-build.yml`)
- **觸發方式**: 手動觸發 (workflow_dispatch)
- **用途**: 開發測試，不發布版本
- **平台選擇**: both / macos / windows
- **產出**: GitHub Artifacts (保存7天)

### 🚀 正式發布 (`release.yml`) 
- **觸發方式**: 推送版本標籤 (v*)
- **用途**: 自動發布正式版本
- **平台**: 同時構建 macOS + Windows
- **產出**: GitHub Release + 安裝檔

## 🔥 快速開始

### 1️⃣ 測試構建 (開發階段)
1. 前往 [GitHub Actions](../../actions)
2. 選擇 "🧪 Test Build"
3. 點擊 "Run workflow"
4. 選擇構建平台：
   - `both` - 同時構建兩個平台 (推薦)
   - `macos` - 僅構建 macOS 版本
   - `windows` - 僅構建 Windows 版本

**📥 下載測試版本**：
構建完成後在 Actions 頁面下載 artifacts

### 2️⃣ 正式發布 (生產階段)
```bash
# 1. 確保所有修改已提交
git add .
git commit -m "🎉 Release v1.0.2"
git push origin main

# 2. 創建並推送版本標籤
git tag v1.0.2
git push origin v1.0.2
```

**✨ 自動化流程會：**
- 🏗️ 並行構建 macOS + Windows 版本
- 📦 創建 GitHub Release
- ⬆️ 上傳安裝檔 (.dmg / .msi)  
- 📝 生成完整發布說明

## 📋 構建產物

| 平台 | 目標架構 | 輸出格式 | 預期大小 |
|------|----------|----------|----------|  
| **🍎 macOS** | Universal (Intel + Apple Silicon) | `.dmg` | ~26MB |
| **🪟 Windows** | x64 | `.msi` | ~30-40MB |

## 🏗️ 工作流程架構

```
.github/workflows/
├── 🧪 test-build.yml     # 手動測試構建
└── 🚀 release.yml        # 標籤觸發發布
```

### 核心優勢
- ✅ **簡化邏輯**: 避免複雜條件表達式
- ✅ **並行構建**: 提升構建效率 
- ✅ **職責分離**: 測試與發布流程獨立
- ✅ **易於調試**: 清晰的錯誤提示

## 🎮 使用範例

### 開發階段 - 測試新功能
1. 修改代碼並提交到 GitHub
2. 手動觸發 "🧪 Test Build" 選擇 `both`
3. 等待構建完成 (~10-15分鐘)
4. 下載 artifacts 進行測試

### 發布階段 - 正式版本
```bash
# 功能更新
git tag v1.1.0
git push origin v1.1.0

# 錯誤修復
git tag v1.0.2  
git push origin v1.0.2
```

## 📊 構建監控

### 查看構建狀態
- 📈 [Actions 頁面](../../actions) - 實時構建狀態
- 🧪 [測試構建](../../actions/workflows/test-build.yml) - 開發測試
- 🚀 [正式發布](../../actions/workflows/release.yml) - 版本發布

### 下載安裝檔
- 📦 [Releases 頁面](../../releases) - 所有正式版本
- 🎯 [最新版本](../../releases/latest) - 快速下載

## 🔧 技術細節

### 構建環境
- **Node.js**: v18 (LTS)
- **Rust**: 最新穩定版
- **Tauri**: v2.7.0
- **快取策略**: Rust cargo + npm 智能快取

### 目標平台
```yaml
# macOS 構建
runs-on: macos-latest
target: universal-apple-darwin

# Windows 構建  
runs-on: windows-latest
target: x86_64-pc-windows-msvc
```

## 🔍 故障排除

### 常見問題
1. **🚨 構建失敗**: 檢查 Actions 詳細日誌
2. **⚠️ 版本衝突**: 確保 `src-tauri/Cargo.toml` 版本與標籤一致
3. **💥 依賴錯誤**: 清除快取或檢查依賴版本

### 本地偵錯
```bash
# 前端構建測試
npm run build:renderer

# macOS 本地構建
cargo tauri build --target universal-apple-darwin

# Windows 本地構建 (僅限 Windows 系統)
cargo tauri build --target x86_64-pc-windows-msvc
```

### 構建失敗救援
1. 檢查 Actions 頁面的詳細錯誤日誌
2. 確認所有依賴版本相容性
3. 重新觸發失敗的 workflow
4. 聯繫開發者 [@tznthou](https://github.com/tznthou)

---

🎉 **專業級 CI/CD 系統：一鍵測試，標籤發布！**