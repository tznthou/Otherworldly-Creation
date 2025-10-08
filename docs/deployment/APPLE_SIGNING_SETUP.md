# 🍎 Apple 代碼簽名設定指南

## 📋 必要的 GitHub Secrets

前往 **GitHub Repository Settings** → **Secrets and variables** → **Actions**，添加以下 secrets：

### 🔐 Apple 憑證相關
```
APPLE_CERTIFICATE
# Apple Developer ID Application Certificate (.p12 檔案的 base64 編碼)
# 取得方式：base64 -i certificate.p12 | pbcopy

APPLE_CERTIFICATE_PASSWORD  
# .p12 憑證的密碼

APPLE_SIGNING_IDENTITY
# 簽名身份，格式：Developer ID Application: Your Name (TEAM_ID)
# 在 Keychain Access 中查看完整名稱
```

### 🔑 Apple ID 相關（用於公證）
```
APPLE_ID
# 你的 Apple ID email

APPLE_PASSWORD
# App-specific password (不是 Apple ID 密碼)
# 在 appleid.apple.com 生成

APPLE_TEAM_ID
# Apple 開發者團隊 ID，10 字元英數字串
# 在 Apple Developer Portal 查看
```

### 🔒 Keychain 相關
```
KEYCHAIN_PASSWORD
# GitHub Actions 用的臨時 keychain 密碼
# 可以是任意安全密碼，例如：SecurePassword123!
```

## 📱 Apple 開發者帳戶設定步驟

### 1️⃣ 申請開發者帳戶
1. 前往 [Apple Developer](https://developer.apple.com)
2. 點擊 **Account**
3. 選擇 **Apple Developer Program**
4. 付費 $99 USD，等待審核（通常 24-48 小時）

### 2️⃣ 生成憑證
1. 登入 [Apple Developer Portal](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Certificates**
3. 點擊 **+** 創建新憑證
4. 選擇 **Developer ID Application** (用於 macOS app 分發)
5. 上傳 CSR（Certificate Signing Request）
6. 下載 .cer 檔案並匯入 Keychain
7. 從 Keychain 匯出 .p12 檔案（包含私鑰）

### 3️⃣ 生成 CSR 檔案
```bash
# 在 macOS 上生成 CSR：
# 1. 打開 Keychain Access
# 2. Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority
# 3. 填入 email 和 common name
# 4. 選擇 "Saved to disk" 和 "Let me specify key pair information"
# 5. Key Size: 2048 bits, Algorithm: RSA
# 6. 儲存 CSR 檔案
```

### 4️⃣ 設定 App-specific Password
1. 前往 [appleid.apple.com](https://appleid.apple.com)
2. 登入你的 Apple ID
3. **App-Specific Passwords** → **Generate Password**
4. 輸入標籤（例如：GitHub Actions）
5. 複製生成的密碼（用於 APPLE_PASSWORD）

## 🚀 使用簽名版發佈

設定完成後，使用以下流程發佈簽名版：

```bash
# 1. 更新版本號（如需要）
# 編輯 src-tauri/tauri.conf.json

# 2. 提交更改
git add .
git commit -m "🎉 準備簽名版發佈"
git push origin main

# 3. 創建簽名版標籤
git tag v1.0.3-signed
git push origin v1.0.3-signed
```

## 📊 驗證簽名

下載完成後可以驗證簽名：

```bash
# 驗證 app 簽名
codesign -dv --verbose=4 /Applications/genesis-chronicle.app

# 驗證公證狀態
spctl -a -t exec -vv /Applications/genesis-chronicle.app

# 檢查是否通過公證
stapler validate /Applications/genesis-chronicle.app
```

## 🎯 預期結果

- ✅ **直接安裝**：雙擊 .dmg 即可安裝，無安全警告
- ✅ **系統信任**：通過 macOS Gatekeeper 檢查
- ✅ **專業形象**：顯示開發者身份和簽名狀態
- ✅ **自動更新**：為未來的自動更新功能做準備

## 💰 成本分析

- **一次性費用**：Apple Developer Program $99 USD/年
- **時間投資**：初次設定約 2-3 小時
- **長期收益**：
  - 用戶信任度提升
  - 安裝體驗改善  
  - 專業品牌形象
  - 支援 Mac App Store 上架（如需要）

## ⚡ 快速檢查清單

設定完成後的檢查項目：

- [ ] Apple Developer 帳戶已啟用
- [ ] Developer ID Application 憑證已生成
- [ ] .p12 憑證檔案已匯出
- [ ] App-specific password 已生成
- [ ] 所有 GitHub Secrets 已設定
- [ ] `release-signed.yml` workflow 已部署
- [ ] 測試簽名版發佈（使用 `-signed` 標籤）

---

🔥 **完成後，你的 Genesis Chronicle 將成為真正的專業級 macOS 應用程式！**