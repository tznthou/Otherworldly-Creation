#!/bin/bash

# 創建PKG安裝程式腳本
# 用於將 .app 文件打包為 .pkg 格式以避免 quarantine 問題

set -e

# 從環境變數或參數獲取版本號（優先級：PKG_VERSION > 參數3 > RELEASE_VERSION > 預設值）
VERSION="${PKG_VERSION:-${3:-${RELEASE_VERSION:-1.0.4}}}"

# 檢查參數
if [ $# -lt 2 ]; then
    echo "Usage: $0 <app_path> <output_pkg_path> [version]"
    echo "Example: $0 target/universal-apple-darwin/release/bundle/macos/genesis-chronicle.app target/universal-apple-darwin/release/bundle/pkg/genesis-chronicle.pkg 1.0.5"
    echo "Note: Version can also be set via PKG_VERSION environment variable"
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

# 獲取應用程式的實際名稱和版本信息
APP_NAME=$(basename "$APP_PATH" .app)
echo "📱 App Name: $APP_NAME"
echo "📂 App Path: $APP_PATH"
echo "📦 Package Version: $VERSION"

# 創建輸出目錄
mkdir -p "$(dirname "$PKG_PATH")"

# 創建臨時目錄來組織 PKG 結構
TEMP_ROOT=$(mktemp -d)
echo "🗂️ Creating temporary staging area: $TEMP_ROOT"

# 將 .app 複製到臨時目錄，確保正確的目錄結構
cp -R "$APP_PATH" "$TEMP_ROOT/"

# 清理可能的舊 PKG 快取（避免路徑問題）
echo "🧹 Cleaning previous PKG cache..."
sudo pkgutil --forget com.genesis-chronicle.desktop 2>/dev/null || echo "   (無舊快取需清理)"

# 使用 pkgbuild 創建 PKG 安裝程式
echo "🔨 Creating PKG installer..."
echo "   Version: $VERSION"
echo "   Install Location: /Applications"
echo "   Identifier: com.genesis-chronicle.desktop"

# 確保 scripts 目錄存在且可訪問
SCRIPTS_DIR="$(dirname "$0")/pkg-scripts"
if [ -d "$SCRIPTS_DIR" ] && [ -r "$SCRIPTS_DIR" ]; then
    echo "📋 Using custom installation scripts from: $SCRIPTS_DIR"
    pkgbuild --root "$TEMP_ROOT" \
             --identifier "com.genesis-chronicle.desktop" \
             --version "$VERSION" \
             --install-location "/Applications" \
             --scripts "$SCRIPTS_DIR" \
             "$PKG_PATH" || {
        echo "❌ Error: PKG creation with scripts failed"
        exit 1
    }
else
    echo "📦 Building PKG without custom scripts..."
    pkgbuild --root "$TEMP_ROOT" \
             --identifier "com.genesis-chronicle.desktop" \
             --version "$VERSION" \
             --install-location "/Applications" \
             "$PKG_PATH" || {
        echo "❌ Error: PKG creation failed"
        exit 1
    }
fi

# 清理臨時目錄
echo "🧹 Cleaning up temporary files..."
rm -rf "$TEMP_ROOT"

# 驗證 PKG 檔案是否成功創建
if [ -f "$PKG_PATH" ]; then
    PKG_SIZE=$(du -h "$PKG_PATH" | cut -f1)
    echo "✅ PKG installer created successfully: $PKG_PATH"
    echo "📦 Package size: $PKG_SIZE"
    echo "🏷️ Package version: $VERSION"
    echo "📍 Install location: /Applications/"
    echo "🆔 Package identifier: com.genesis-chronicle.desktop"
    echo ""
    echo "💡 PKG安裝程式會自動處理quarantine屬性，用戶無需手動執行xattr指令"
    echo "🚀 用戶只需雙擊PKG檔案即可完成安裝"
    
    # 驗證 PKG 內容
    echo ""
    echo "🔍 PKG content verification:"
    pkgutil --payload-files "$PKG_PATH" | head -5 | while read -r file; do
        echo "   📄 $file"
    done
    
    # 顯示 PKG 資訊
    echo ""
    echo "📋 Package information:"
    pkgutil --info com.genesis-chronicle.desktop "$PKG_PATH" 2>/dev/null || echo "   (Package info will be available after installation)"
else
    echo "❌ Error: PKG file was not created at $PKG_PATH"
    exit 1
fi