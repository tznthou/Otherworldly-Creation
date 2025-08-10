# 🤖 Genesis Chronicle CI/CD 自動化構建

## 🎯 快速開始

### 📦 自動發布版本
```bash
# 1. 更新版本號 (在 src-tauri/Cargo.toml)
version = "1.0.2"

# 2. 提交並推送標籤
git add .
git commit -m "🎉 Release v1.0.2"  
git tag v1.0.2
git push origin main --tags
```

**✨ 自動化流程會：**
- 🏗️ 同時構建 macOS + Windows 版本
- 📦 建立 GitHub Release  
- ⬆️ 上傳安裝檔 (.dmg / .msi)
- 📝 生成發布說明

### 🧪 測試構建 (不發布)
1. 前往 [GitHub Actions](../../actions)
2. 選擇 "🧪 Test Build (Manual)"
3. 點擊 "Run workflow"
4. 選擇平台：`all` / `macos-only` / `windows-only`

## 📋 支援平台

| 平台 | 目標架構 | 輸出格式 | 大小 |
|------|----------|----------|------|  
| **macOS** | Universal (Intel + Apple Silicon) | `.dmg` | ~26MB |
| **Windows** | x64 | `.msi` | ~30-40MB |

## 🔧 工作流程文件

```
.github/workflows/
├── 🚀 build-and-release.yml    # 正式發布流程
├── 🧪 test-build.yml           # 測試構建流程  
└── 🔧 env-setup.yml            # 環境設定 (可重用)
```

## ⚙️ 配置檔案

### Tauri 設定
- `src-tauri/tauri.conf.json` - 應用程式配置
- `src-tauri/Cargo.toml` - Rust 依賴與版本

### 重要修改
```json
// src-tauri/tauri.conf.json
{
  "identifier": "com.genesis-chronicle.desktop", // ✅ 已修正警告
  "version": "1.0.1"  // 🎯 與標籤保持一致
}
```

## 🎮 使用範例

### 發布新功能版本
```bash
# 功能更新：v1.1.0
git tag v1.1.0
git push origin v1.1.0
```

### 發布錯誤修復版本  
```bash
# 修復更新：v1.0.2
git tag v1.0.2
git push origin v1.0.2
```

## 📊 構建狀態

[![Build Status](../../actions/workflows/build-and-release.yml/badge.svg)](../../actions/workflows/build-and-release.yml)

### 查看構建結果
- 📈 [Actions 頁面](../../actions) - 查看所有構建
- 📦 [Releases 頁面](../../releases) - 下載安裝檔
- 🎯 [最新版本](../../releases/latest) - 快速下載

## 🔍 故障排除

### 常見問題
1. **構建失敗**: 檢查 Actions 日誌
2. **版本衝突**: 確保 `Cargo.toml` 版本與標籤一致  
3. **依賴錯誤**: 清除快取重新構建

### 手動排查
```bash
# 本地測試構建
npm run build:renderer
cargo tauri build --target universal-apple-darwin
```

---

🎉 **一次設定，永久受用！推送標籤即可自動發布多平台版本！**