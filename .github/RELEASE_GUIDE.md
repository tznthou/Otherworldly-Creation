# 🚀 Genesis Chronicle 發布指南

## 📋 發布流程

### 1️⃣ 準備發布
```bash
# 1. 確保程式碼已提交
git add .
git commit -m "🎉 準備發布 v1.0.2"
git push origin main

# 2. 建立並推送版本標籤
git tag v1.0.2
git push origin v1.0.2
```

### 2️⃣ 自動化構建
推送標籤後，GitHub Actions 會自動：
- ✅ 建立 GitHub Release
- ✅ 構建 macOS 通用版本 (.dmg)
- ✅ 構建 Windows 64位版本 (.msi)
- ✅ 上傳安裝檔到 Release

### 3️⃣ 手動測試構建
如需測試構建而不發布：
1. 前往 GitHub → Actions
2. 選擇 "🧪 Test Build (Manual)"
3. 點擊 "Run workflow"
4. 選擇平台 (all/macos-only/windows-only)

## 🔧 GitHub Secrets 設定

### 必要設定
- `GITHUB_TOKEN`: 自動提供，無需手動設定

### 可選設定 (macOS 簽名)
```
BUILD_CERTIFICATE_BASE64     # Apple 開發者憑證 (Base64)
P12_PASSWORD                # 憑證密碼
APPLE_SIGNING_IDENTITY      # 簽名身份
APPLE_ID                    # Apple ID
APPLE_PASSWORD             # Apple 專用密碼
APPLE_TEAM_ID              # Team ID
KEYCHAIN_PASSWORD          # Keychain 密碼
```

## 📦 構建產物

### macOS 版本
- `genesis-chronicle_v1.0.2_universal.dmg` (26MB)
- 支援 Intel + Apple Silicon Mac
- 系統需求：macOS 10.11+

### Windows 版本
- `genesis-chronicle_v1.0.2_x64_en-US.msi` (約30-40MB)
- 64位元 Windows 安裝程式
- 系統需求：Windows 10+

## 🎯 版本號規則

遵循 [語義化版本](https://semver.org/)：
- `v1.0.0` - 主要版本 (重大更新)
- `v1.1.0` - 次要版本 (功能新增)
- `v1.0.1` - 修訂版本 (錯誤修復)

## 🔍 故障排除

### 構建失敗
1. 檢查 Actions 日誌
2. 確認 Rust/Node.js 版本兼容
3. 驗證 `src-tauri/Cargo.toml` 版本號

### Windows 構建問題
- 確認依賴項完整
- 檢查 C++ 構建工具
- 驗證 Windows SDK

### macOS 簽名問題
- 檢查憑證有效性
- 確認 Team ID 正確
- 驗證 Apple ID 權限

## 📈 發布檢查清單

發布前確認：
- [ ] 版本號已更新 (`src-tauri/Cargo.toml` 和標籤一致)
- [ ] CHANGELOG.md 已更新
- [ ] 所有測試通過
- [ ] 程式碼已合併到 main 分支
- [ ] GitHub Actions 權限正確

---

🎮 **創世紀元，讓創作更簡單！**