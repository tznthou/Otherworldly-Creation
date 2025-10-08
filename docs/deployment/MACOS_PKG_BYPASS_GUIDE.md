# 🍎 macOS PKG 安裝程式完全手冊
## 透過 GitHub Actions 自動生成 PKG 繞過 macOS 安全限制

> **重要價值**：這個方法可以讓你的 Tauri 應用程式在 macOS 上實現一鍵安裝，無需用戶手動執行複雜的 `xattr` 指令來移除 quarantine 屬性。

---

## 📋 目錄
1. [問題背景](#問題背景)
2. [解決方案原理](#解決方案原理)
3. [完整實現步驟](#完整實現步驟)
4. [核心檔案配置](#核心檔案配置)
5. [GitHub Actions 配置](#github-actions-配置)
6. [測試與驗證](#測試與驗證)
7. [常見問題排除](#常見問題排除)
8. [進階優化](#進階優化)

---

## 🎯 問題背景

### macOS 安全機制的困擾
當用戶從網路下載非 Apple Developer ID 簽名的應用程式時，macOS 會自動添加 **quarantine 屬性**：

```bash
# 用戶下載 DMG 後，通常會遇到這個問題：
# "無法開啟 genesis-chronicle.app，因為無法驗證開發者"

# 傳統解決方案（用戶體驗很差）：
sudo spctl --master-disable  # 全域禁用 Gatekeeper（不夠）
sudo xattr -rd com.apple.quarantine /Applications/your-app.app  # 手動移除 quarantine
```

### 為什麼其他 App 不需要 xattr？
- **已簽名的 App**：有 Apple Developer ID，自動通過驗證
- **從 Mac App Store 安裝**：Apple 認證的管道
- **PKG 格式安裝**：系統級安裝程式，自動處理 quarantine 屬性 ⭐

---

## 💡 解決方案原理

### PKG 安裝程式的優勢
1. **系統級安裝**：macOS 將 PKG 視為正式安裝程式
2. **自動權限處理**：安裝過程中自動處理 quarantine 屬性
3. **用戶友善**：雙擊安裝，無需終端指令
4. **專業形象**：符合 macOS 應用程式發布標準

### 技術核心
```
DMG 安裝：下載 → 拖拽 → quarantine 問題 → 手動 xattr
PKG 安裝：下載 → 雙擊 → 系統安裝 → 直接可用 ✅
```

---

## 🛠 完整實現步驟

### 步驟 1：更新 Tauri 配置

**檔案：`src-tauri/tauri.conf.json`**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "your-app-name",
  "version": "1.0.0",
  "identifier": "com.yourcompany.yourapp",
  "build": {
    "frontendDist": "../dist/renderer",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev:renderer",
    "beforeBuildCommand": "npm run build:renderer"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Your App Title",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 800,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "macOS": {
      "frameworks": [],
      "exceptionDomain": "",
      "signingIdentity": null,
      "entitlements": null,
      "minimumSystemVersion": "10.11"
    }
  }
}
```

**關鍵配置說明**：
- `bundle.active: true`：啟用打包功能
- `bundle.targets: "all"`：生成所有平台的安裝包
- `macOS.signingIdentity: null`：未簽名模式（適用於個人開發者）

### 步驟 2：建立 PKG 生成腳本

**檔案：`scripts/create-pkg.sh`**
```bash
#!/bin/bash

# 創建PKG安裝程式腳本
# 用於將 .app 文件打包為 .pkg 格式以避免 quarantine 問題

set -e

# 檢查參數
if [ $# -ne 2 ]; then
    echo "Usage: $0 <app_path> <output_pkg_path>"
    echo "Example: $0 target/universal-apple-darwin/release/bundle/macos/your-app.app target/pkg/your-app.pkg"
    exit 1
fi

APP_PATH="$1"
PKG_PATH="$2"

# 檢查 .app 是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: App not found at $APP_PATH"
    echo "🔍 Current working directory: $(pwd)"
    echo "📁 Listing parent directory contents:"
    ls -la "$(dirname "$APP_PATH")" 2>/dev/null || echo "Parent directory not accessible"
    exit 1
fi

# 獲取應用程式資訊
APP_NAME=$(basename "$APP_PATH" .app)
echo "📱 App Name: $APP_NAME"
echo "📂 App Path: $APP_PATH"

# 創建輸出目錄
mkdir -p "$(dirname "$PKG_PATH")"

# 🔑 關鍵技術：創建臨時目錄來組織 PKG 結構
TEMP_ROOT=$(mktemp -d)
echo "🗂️ Creating temporary staging area: $TEMP_ROOT"

# 將 .app 複製到臨時目錄，確保正確的目錄結構
cp -R "$APP_PATH" "$TEMP_ROOT/"

# 使用 pkgbuild 創建 PKG 安裝程式
echo "🔨 Creating PKG installer..."
pkgbuild --root "$TEMP_ROOT" \
         --identifier "com.yourcompany.yourapp" \
         --version "1.0.0" \
         --install-location "/Applications" \
         --scripts "$(dirname "$0")/pkg-scripts" \
         "$PKG_PATH" 2>/dev/null || {
    # 如果沒有 scripts 目錄，則不使用 scripts 參數
    echo "📦 Building PKG without custom scripts..."
    pkgbuild --root "$TEMP_ROOT" \
             --identifier "com.yourcompany.yourapp" \
             --version "1.0.0" \
             --install-location "/Applications" \
             "$PKG_PATH"
}

# 清理臨時目錄
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_ROOT"

echo "✅ PKG installer created: $PKG_PATH"
echo "💡 PKG安裝程式會自動處理quarantine屬性，用戶無需手動執行xattr指令"
```

**關鍵技術點**：
1. **臨時目錄策略**：`mktemp -d` 確保乾淨的打包環境
2. **正確的目錄結構**：避免產生多餘的壓縮檔案
3. **pkgbuild 參數**：
   - `--root`：指向包含 .app 的乾淨目錄
   - `--identifier`：PKG 的唯一標識符
   - `--install-location`：自動安裝到 /Applications
   - `--version`：版本控制

### 步驟 3：配置 GitHub Actions

**檔案：`.github/workflows/release.yml`**
```yaml
name: 🚀 Release

on:
  push:
    tags: ['v*']

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create_release.outputs.id }}
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🏷️ Get version from tag
        id: get_version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: 🎉 Create Release
        id: create_release
        run: |
          RELEASE_BODY="🎮 **你的應用程式名稱**

          ## 📦 安裝包下載

          ### 🍎 macOS 版本
          - **your-app-${{ steps.get_version.outputs.VERSION }}-universal.dmg** (拖放安裝)
          - **your-app-${{ steps.get_version.outputs.VERSION }}-universal.pkg** (一鍵安裝，無需手動移除隔離) ⭐ 推薦
          - 支援 Intel + Apple Silicon Mac
          - 系統需求：macOS 10.11+

          #### 📋 macOS 安裝說明
          - **推薦使用 .pkg 安裝程式**：自動處理系統權限，無需手動執行 \`xattr\` 指令
          - 如使用 .dmg：下載後需執行 \`sudo xattr -rd com.apple.quarantine /Applications/your-app.app\`

          ### 🪟 Windows 版本  
          - **your-app-${{ steps.get_version.outputs.VERSION }}-x64.msi**
          - 64位元 Windows 安裝程式
          - 系統需求：Windows 10+"
          
          gh release create ${{ steps.get_version.outputs.VERSION }} \
            --title "Your App ${{ steps.get_version.outputs.VERSION }}" \
            --notes "$RELEASE_BODY" \
            --draft=false \
            --prerelease=false
          
          echo "id=$(gh api repos/${{ github.repository }}/releases/tags/${{ steps.get_version.outputs.VERSION }} --jq .id)" >> $GITHUB_OUTPUT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-macos:
    needs: create-release
    runs-on: macos-latest
    timeout-minutes: 30
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🦀 Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: 📦 Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: 🔧 Install dependencies
        run: npm ci

      - name: 🏗️ Build frontend
        run: npm run build:renderer

      # 🔑 關鍵步驟：使用 tauri-action 構建應用程式
      - name: 🔨 Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: '--target universal-apple-darwin'

      # 🔑 關鍵步驟：生成 PKG 安裝程式
      - name: 📦 Create PKG installer
        run: |
          # 找到生成的 .app 文件
          APP_PATH=$(find src-tauri/target -name "your-app.app" -type d | head -1)
          if [ -z "$APP_PATH" ]; then
            echo "❌ Error: your-app.app not found"
            find src-tauri/target -type f -name "*your-app*" | head -10
            exit 1
          fi
          
          echo "✅ Found app at: $APP_PATH"
          
          # 獲取版本號
          VERSION="${GITHUB_REF#refs/tags/}"
          
          # 創建PKG
          PKG_DIR="$(dirname "$APP_PATH")/pkg"
          mkdir -p "$PKG_DIR"
          chmod +x ./scripts/create-pkg.sh
          PKG_NAME="your-app_${VERSION}_universal.pkg"
          ./scripts/create-pkg.sh "$APP_PATH" "$PKG_DIR/$PKG_NAME"

      # 🔑 關鍵步驟：上傳 PKG 到 GitHub Release
      - name: 📤 Upload PKG to Release
        run: |
          VERSION="${GITHUB_REF#refs/tags/}"
          PKG_PATH=$(find src-tauri/target -name "your-app_${VERSION}_universal.pkg" -type f | head -1)
          if [ -n "$PKG_PATH" ]; then
            echo "✅ Found PKG at: $PKG_PATH"
            gh release upload "$VERSION" "$PKG_PATH" --clobber
          else
            echo "❌ PKG file not found"
            exit 1
          fi
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-windows:
    needs: create-release
    runs-on: windows-latest
    timeout-minutes: 30
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🦀 Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc

      - name: 📦 Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: 🔧 Install dependencies
        run: npm ci

      - name: 🏗️ Build frontend
        run: npm run build:renderer

      - name: 🔨 Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          args: '--target x86_64-pc-windows-msvc'
          releaseId: ${{ needs.create-release.outputs.release_id }}
```

---

## 🧪 測試與驗證

### 本地測試
```bash
# 1. 確保腳本可執行
chmod +x scripts/create-pkg.sh

# 2. 本地構建測試
npm run build
cargo tauri build --target universal-apple-darwin

# 3. 手動生成 PKG 測試
./scripts/create-pkg.sh \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/your-app.app \
  test-output.pkg

# 4. 測試 PKG 安裝
sudo installer -pkg test-output.pkg -target /
```

### GitHub Actions 測試
```bash
# 1. 推送測試標籤觸發構建
git tag -a v1.0.0-test -m "Test PKG generation"
git push origin v1.0.0-test

# 2. 觀察構建過程
# 前往 GitHub Actions 頁面查看構建日誌

# 3. 驗證生成的檔案
# 檢查 Release 頁面是否包含 PKG 檔案
```

### 用戶體驗測試
1. **下載 PKG**：從 GitHub Releases 下載
2. **雙擊安裝**：無需額外設定
3. **直接啟動**：在 Applications 中找到應用程式
4. **確認無 quarantine 問題**：應用程式正常開啟

---

## 🚨 常見問題排除

### 問題 1：PKG 安裝後產生 .tar.gz 檔案
**症狀**：安裝後得到 `your-app.app.tar.gz` 而非 `your-app.app`
**原因**：`pkgbuild --root` 參數指向了包含額外目錄層級的路徑
**解決方案**：使用臨時目錄重新組織結構（已在腳本中實現）

### 問題 2：GitHub Actions YAML 語法錯誤
**症狀**：workflow 執行失敗，提示語法錯誤
**常見原因**：
- 縮排不一致（混用 tab 和空格）
- `if` 條件語法錯誤
- `continue-on-error` 位置不正確

**解決方案**：
```bash
# 本地驗證 YAML 語法
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release.yml'); puts '✅ YAML 語法正確'"
```

### 問題 3：找不到 .app 檔案
**症狀**：PKG 生成步驟中找不到應用程式檔案
**檢查項目**：
- Tauri 構建是否成功
- 檔案名稱是否與腳本中的搜尋模式一致
- 目標架構設定是否正確

**除錯指令**：
```bash
# 在 GitHub Actions 中添加除錯步驟
- name: 🔍 Debug file structure
  run: |
    echo "Target directory structure:"
    find src-tauri/target -type f -name "*your-app*" | head -20
    echo "App files:"
    find src-tauri/target -name "*.app" -type d
```

### 問題 4：版本號不一致
**症狀**：PKG 中的版本號與實際不符
**解決方案**：確保以下檔案中的版本號一致
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `scripts/create-pkg.sh`

---

## 🔧 進階優化

### 1. 自動版本同步
**檔案：`scripts/sync-version.js`**
```javascript
const fs = require('fs');
const path = require('path');

// 從 package.json 讀取版本號
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// 更新 Cargo.toml
const cargoPath = 'src-tauri/Cargo.toml';
let cargoContent = fs.readFileSync(cargoPath, 'utf8');
cargoContent = cargoContent.replace(/version = ".*"/, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargoContent);

// 更新 tauri.conf.json
const tauriConfPath = 'src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));

console.log(`✅ Version synced to ${version}`);
```

### 2. 加入安裝後腳本
**目錄結構**：
```
scripts/
├── create-pkg.sh
└── pkg-scripts/
    ├── preinstall
    ├── postinstall
    └── preremove
```

**檔案：`scripts/pkg-scripts/postinstall`**
```bash
#!/bin/bash
# PKG 安裝後執行的腳本

echo "🎉 Genesis Chronicle 安裝完成！"

# 可選：創建 dock 捷徑、設定檔案關聯等
# osascript -e 'tell application "Dock" to make new item at end of items'

exit 0
```

### 3. 程式碼簽名（進階）
如果你有 Apple Developer 帳號，可以加入程式碼簽名：

```bash
# 在 create-pkg.sh 中加入簽名步驟
codesign --force --deep --sign "Developer ID Application: Your Name" "$APP_PATH"

# 在 GitHub Actions 中加入憑證匯入
- name: Import Code-Signing Certificates
  uses: Apple-Actions/import-codesign-certs@v1
  with:
    p12-file-base64: ${{ secrets.APPLE_CERTIFICATE_BASE64 }}
    p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
```

### 4. 自動化測試
```yaml
# 在 GitHub Actions 中加入安裝測試
- name: 🧪 Test PKG Installation
  run: |
    # 安裝到測試目錄
    sudo installer -pkg "$PKG_PATH" -target /
    
    # 驗證安裝結果
    if [ -f "/Applications/your-app.app/Contents/MacOS/your-app" ]; then
      echo "✅ PKG installation test passed"
    else
      echo "❌ PKG installation test failed"
      exit 1
    fi
```

---

## 🎯 總結

這個 PKG 生成方案解決了 macOS 應用程式發布的核心痛點：

### ✅ 優勢
- **無需 Apple Developer ID**：個人開發者也能使用
- **完全自動化**：GitHub Actions 一鍵構建
- **用戶友善**：雙擊安裝，無需技術知識
- **專業級體驗**：符合 macOS 標準發布流程

### 🎪 適用場景
- Tauri 桌面應用程式
- Electron 應用程式（需調整構建腳本）
- 任何需要在 macOS 上發布的桌面應用程式

### 🔮 未來優化方向
- 整合 notarization 流程
- 支援 Apple Silicon 專用版本
- 加入自動更新機制
- 整合 Sparkle 更新框架

---

## 📚 參考資源

- [Apple PKG 開發文檔](https://developer.apple.com/documentation/installerjs)
- [Tauri 官方部署指南](https://tauri.app/v1/guides/distribution/)
- [GitHub Actions Marketplace - Tauri Action](https://github.com/marketplace/actions/tauri-action)
- [macOS 程式碼簽名指南](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

---

**🎉 恭喜！你現在擁有了完整的 macOS PKG 自動化生成方案！**

用戶只需要：下載 → 雙擊 → 完成 ✨