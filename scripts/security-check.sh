#!/bin/bash

# 創世紀元：安全檢查腳本
# 用於發布前檢查是否有敏感資料洩露風險

set -e

echo "🔒 創世紀元 - 安全檢查腳本"
echo "================================"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ] || [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查結果統計
ISSUES_FOUND=0

echo "📁 檢查 1: 是否有資料庫檔案被追蹤..."
DB_FILES=$(git ls-files | grep -E '\.(db|sqlite|sqlite3)$' || true)
if [ -n "$DB_FILES" ]; then
    echo "❌ 發現被追蹤的資料庫檔案："
    echo "$DB_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ 無資料庫檔案被追蹤"
fi

echo ""
echo "🔑 檢查 2: 是否有 API 金鑰洩露..."
API_KEY_LEAKS=$(grep -r -n "api_key.*=.*\"[a-zA-Z0-9]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.rs" --include="*.json" . 2>/dev/null | grep -v "/target/" | grep -v "node_modules" | grep -v ".git" | grep -v "placeholder" | grep -v "example" | grep -v "your.*api.*key" || true)
if [ -n "$API_KEY_LEAKS" ]; then
    echo "❌ 發現疑似 API 金鑰洩露："
    echo "$API_KEY_LEAKS"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ 無 API 金鑰洩露"
fi

echo ""
echo "📝 檢查 3: 是否有個人小說內容..."
NOVEL_CONTENT=$(find . -name "*.md" -o -name "*.txt" | grep -v README | grep -v CHANGELOG | grep -v RELEASE_CHECKLIST | grep -v CLAUDE.md | grep -v node_modules | grep -v .serena | grep -v .specstory | grep -v coverage | xargs grep -l "第.*章\|故事\|主角\|劇情" 2>/dev/null || true)
if [ -n "$NOVEL_CONTENT" ]; then
    echo "⚠️  發現疑似小說內容檔案："
    echo "$NOVEL_CONTENT"
    echo "請確認這些檔案不包含個人創作內容"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ 無個人小說內容檔案"
fi

echo ""
echo "🏠 檢查 4: 是否有用戶資料目錄..."
USER_DATA_DIRS=$(find . -type d -name "*user*data*" -o -name "*backup*" -o -name "*export*" | grep -v node_modules | grep -v target | grep -v coverage || true)
# 檢查可能包含用戶路徑的檔案
USER_DATA_FILES=$(find . -name "*backup*" -o -name "*user*data*" | grep -v node_modules | grep -v target | grep -v coverage || true)
if [ -n "$USER_DATA_DIRS" ] || [ -n "$USER_DATA_FILES" ]; then
    echo "⚠️  發現用戶資料相關項目："
    [ -n "$USER_DATA_DIRS" ] && echo "目錄: $USER_DATA_DIRS"
    [ -n "$USER_DATA_FILES" ] && echo "檔案: $USER_DATA_FILES"
    echo "ℹ️  這些可能是開發用檔案，請確認不含真實用戶資料"
else
    echo "✅ 無用戶資料目錄或檔案"
fi

echo ""
echo "🔍 檢查 5: 是否有秘密檔案..."
SECRET_FILES=$(find . -name "*secret*" -o -name "*credential*" -o -name "*.env*" | grep -v node_modules | grep -v target || true)
if [ -n "$SECRET_FILES" ]; then
    echo "⚠️  發現秘密檔案："
    echo "$SECRET_FILES"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ 無秘密檔案"
fi

echo ""
echo "📦 檢查 6: Build 輸出安全性..."
if [ -d "dist" ]; then
    BUILD_DB_FILES=$(find dist -name "*.db" -o -name "*.sqlite*" 2>/dev/null || true)
    if [ -n "$BUILD_DB_FILES" ]; then
        echo "❌ Build 輸出包含資料庫檔案："
        echo "$BUILD_DB_FILES"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo "✅ Build 輸出不包含資料庫檔案"
    fi
else
    echo "ℹ️  Build 目錄不存在，跳過檢查"
fi

echo ""
echo "================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "🎉 安全檢查通過！沒有發現安全問題"
    echo "✅ 可以安全地發布此版本"
    exit 0
else
    echo "❌ 發現 $ISSUES_FOUND 個潛在安全問題"
    echo "🚨 請修復所有問題後再發布"
    exit 1
fi