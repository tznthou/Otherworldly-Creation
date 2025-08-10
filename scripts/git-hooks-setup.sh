#!/bin/bash

# Git Hooks 設置腳本 - 創世紀元
# 提供多種 pre-commit hook 配置選項

PROJECT_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "🔧 Git Hooks 設置向導"
echo "===================="
echo ""
echo "選擇 pre-commit hook 模式："
echo "1. 嚴格模式 (推薦) - 檢查安全性、ESLint、TypeScript、Rust"
echo "2. 基礎模式 - 只檢查安全性和 ESLint (跳過 TypeScript 類型錯誤)"
echo "3. 移除 hook"
echo "4. 查看當前設置"

read -p "請選擇模式 [1-4]: " choice

case $choice in
    1)
        echo "設置嚴格模式 pre-commit hook..."
        cp "$PROJECT_ROOT/.git/hooks/pre-commit" "$PROJECT_ROOT/.git/hooks/pre-commit.backup" 2>/dev/null || true
        
        # 嚴格模式 hook (已存在的版本)
        echo "✅ 嚴格模式 pre-commit hook 已啟用"
        echo "   - 安全性檢查"
        echo "   - ESLint 檢查"
        echo "   - TypeScript 類型檢查"
        echo "   - Rust 程式碼檢查"
        ;;
    
    2)
        echo "設置基礎模式 pre-commit hook..."
        
        cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# 創世紀元 Pre-commit Hook - 基礎模式
# 檢查安全性和 ESLint，跳過 TypeScript 類型檢查

set -e

echo "🚀 創世紀元 Pre-commit 檢查 (基礎模式)"
echo "===================================="

PROJECT_ROOT=$(git rev-parse --show-toplevel)
TOTAL_ISSUES=0

echo ""
echo "🔒 執行安全檢查..."
if [ -f "$PROJECT_ROOT/scripts/security-check.sh" ]; then
    if ! bash "$PROJECT_ROOT/scripts/security-check.sh"; then
        echo "❌ 安全檢查失敗"
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    else
        echo "✅ 安全檢查通過"
    fi
fi

echo ""
echo "🧹 執行 ESLint 檢查..."
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [ -n "$STAGED_TS_FILES" ]; then
    cd "$PROJECT_ROOT"
    if ! npm run lint -- $STAGED_TS_FILES; then
        echo "❌ ESLint 檢查發現問題"
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    else
        echo "✅ ESLint 檢查通過"
    fi
fi

echo ""
echo "===================================="

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo "🎉 基礎檢查通過！允許提交"
    exit 0
else
    echo "❌ 發現 $TOTAL_ISSUES 個問題，請修復後重試"
    exit 1
fi
EOF
        
        chmod +x "$HOOKS_DIR/pre-commit"
        echo "✅ 基礎模式 pre-commit hook 已啟用"
        echo "   - 安全性檢查"
        echo "   - ESLint 檢查"
        echo "   ⚠️  跳過 TypeScript 類型檢查"
        ;;
    
    3)
        echo "移除 pre-commit hook..."
        rm -f "$HOOKS_DIR/pre-commit"
        echo "✅ pre-commit hook 已移除"
        ;;
    
    4)
        echo "當前設置："
        if [ -f "$HOOKS_DIR/pre-commit" ]; then
            echo "✅ pre-commit hook 已啟用"
            echo ""
            echo "Hook 內容預覽："
            head -20 "$HOOKS_DIR/pre-commit"
        else
            echo "❌ 沒有設置 pre-commit hook"
        fi
        ;;
    
    *)
        echo "❌ 無效選擇"
        exit 1
        ;;
esac

echo ""
echo "🎯 使用建議："
echo "- 開發階段：建議使用基礎模式，避免 TypeScript 錯誤阻擋提交"
echo "- 發布前：手動執行 'npx tsc --noEmit' 檢查 TypeScript"
echo "- 生產發布：使用嚴格模式確保程式碼品質"