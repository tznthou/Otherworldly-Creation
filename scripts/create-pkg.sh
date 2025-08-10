#!/bin/bash

# 創建PKG安裝程式腳本
# 用於將 .app 文件打包為 .pkg 格式以避免 quarantine 問題

set -e

# 檢查參數
if [ $# -ne 2 ]; then
    echo "Usage: $0 <app_path> <output_pkg_path>"
    echo "Example: $0 target/universal-apple-darwin/release/bundle/macos/genesis-chronicle.app target/universal-apple-darwin/release/bundle/pkg/genesis-chronicle.pkg"
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

# 創建輸出目錄
mkdir -p "$(dirname "$PKG_PATH")"

# 使用 pkgbuild 創建 PKG 安裝程式
echo "🔨 Creating PKG installer..."
pkgbuild --root "$(dirname "$APP_PATH")" \
         --identifier "com.genesis-chronicle.desktop" \
         --version "1.0.3" \
         --install-location "/Applications" \
         --scripts "$(dirname "$0")/pkg-scripts" \
         "$PKG_PATH" 2>/dev/null || {
    # 如果沒有 scripts 目錄，則不使用 scripts 參數
    echo "📦 Building PKG without custom scripts..."
    pkgbuild --root "$(dirname "$APP_PATH")" \
             --identifier "com.genesis-chronicle.desktop" \
             --version "1.0.3" \
             --install-location "/Applications" \
             "$PKG_PATH"
}

echo "✅ PKG installer created: $PKG_PATH"
echo "💡 PKG安裝程式會自動處理quarantine屬性，用戶無需手動執行xattr指令"