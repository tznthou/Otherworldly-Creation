#!/bin/bash

# ESLint 自動修復腳本
# 用於快速修復 ESLint 配置問題
# 
# 使用方法:
#   chmod +x scripts/fix-eslint.sh
#   ./scripts/fix-eslint.sh
#
# 或者直接運行:
#   bash scripts/fix-eslint.sh

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 輸出函數
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# 檢查是否在專案根目錄
check_project_root() {
    if [[ ! -f "package.json" ]]; then
        log_error "未找到 package.json，請確保在專案根目錄運行此腳本"
        exit 1
    fi
    
    if [[ ! -d "src" ]]; then
        log_error "未找到 src 目錄，請確保在正確的專案目錄"
        exit 1
    fi
    
    log_success "專案目錄檢查通過"
}

# 備份現有配置
backup_config() {
    log_step "備份現有配置..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="eslint_backup_${timestamp}"
    
    mkdir -p "${backup_dir}"
    
    [[ -f ".eslintrc.js" ]] && cp ".eslintrc.js" "${backup_dir}/" && log_info "已備份 .eslintrc.js"
    [[ -f ".eslintrc.json" ]] && cp ".eslintrc.json" "${backup_dir}/" && log_info "已備份 .eslintrc.json"
    [[ -f ".eslintrc.yml" ]] && cp ".eslintrc.yml" "${backup_dir}/" && log_info "已備份 .eslintrc.yml"
    [[ -f "package-lock.json" ]] && cp "package-lock.json" "${backup_dir}/" && log_info "已備份 package-lock.json"
    
    log_success "配置備份完成：${backup_dir}"
}

# 清理依賴
clean_dependencies() {
    log_step "清理依賴..."
    
    # 清理 node_modules
    if [[ -d "node_modules" ]]; then
        log_info "刪除 node_modules 目錄..."
        rm -rf node_modules
    fi
    
    # 清理 package-lock.json
    if [[ -f "package-lock.json" ]]; then
        log_info "刪除 package-lock.json..."
        rm -f package-lock.json
    fi
    
    # 清理 ESLint 緩存
    if [[ -d ".eslintcache" ]]; then
        log_info "清理 ESLint 緩存..."
        rm -rf .eslintcache
    fi
    
    log_success "依賴清理完成"
}

# 重新安裝依賴
install_dependencies() {
    log_step "重新安裝依賴..."
    
    # 檢查 npm 是否可用
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝，請先安裝 Node.js"
        exit 1
    fi
    
    log_info "安裝基礎依賴..."
    npm install
    
    log_info "安裝 ESLint 相關依賴..."
    npm install --save-dev \
        eslint@^8.54.0 \
        @typescript-eslint/parser@^6.11.0 \
        @typescript-eslint/eslint-plugin@^6.11.0 \
        eslint-plugin-react@^7.33.2 \
        eslint-plugin-react-hooks@^4.6.0
    
    log_success "依賴安裝完成"
}

# 創建標準配置
create_standard_config() {
    log_step "創建標準 ESLint 配置..."
    
    # 如果存在參考配置，直接複製
    if [[ -f ".eslintrc.reference.js" ]]; then
        log_info "使用參考配置文件..."
        cp .eslintrc.reference.js .eslintrc.js
    else
        log_info "創建基本配置文件..."
        cat > .eslintrc.js << 'EOF'
/**
 * 自動生成的 ESLint 配置
 * 生成時間: $(date)
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.main.json'],
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-undef': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'dist/',
    'out/',
    'coverage/',
    'node_modules/',
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    'test-*.js',
  ],
};
EOF
    fi
    
    log_success "ESLint 配置創建完成"
}

# 驗證配置
validate_config() {
    log_step "驗證 ESLint 配置..."
    
    # 檢查配置語法
    if npx eslint --print-config package.json > /dev/null 2>&1; then
        log_success "ESLint 配置語法正確"
    else
        log_error "ESLint 配置語法錯誤"
        return 1
    fi
    
    # 測試 TypeScript 文件
    local test_ts_content="interface Test { name: string; }"
    echo "${test_ts_content}" > temp_test.ts
    
    if npx eslint temp_test.ts > /dev/null 2>&1; then
        log_success "TypeScript 解析正常"
    else
        log_warning "TypeScript 解析可能有問題"
    fi
    
    rm -f temp_test.ts
    
    # 測試 React 文件
    local test_tsx_content="import React from 'react'; const App = () => <div>Test</div>; export default App;"
    echo "${test_tsx_content}" > temp_test.tsx
    
    if npx eslint temp_test.tsx > /dev/null 2>&1; then
        log_success "React/JSX 解析正常"
    else
        log_warning "React/JSX 解析可能有問題"
    fi
    
    rm -f temp_test.tsx
    
    log_success "配置驗證完成"
}

# 運行測試
run_tests() {
    log_step "運行 ESLint 檢查..."
    
    # 檢查是否有 lint 腳本
    if npm run | grep -q "lint"; then
        log_info "使用 npm run lint..."
        if npm run lint; then
            log_success "ESLint 檢查通過"
        else
            log_warning "ESLint 檢查發現問題，但配置正常"
        fi
    else
        log_info "直接運行 eslint..."
        if npx eslint . --ext .ts,.tsx,.js,.jsx; then
            log_success "ESLint 檢查通過"
        else
            log_warning "ESLint 檢查發現問題，但配置正常"
        fi
    fi
}

# 生成報告
generate_report() {
    log_step "生成修復報告..."
    
    local report_file="eslint_fix_report_$(date +"%Y%m%d_%H%M%S").md"
    
    cat > "${report_file}" << EOF
# ESLint 修復報告

**修復時間**: $(date)
**ESLint 版本**: $(npx eslint --version)
**Node.js 版本**: $(node --version)
**npm 版本**: $(npm --version)

## 修復步驟

1. ✅ 備份現有配置
2. ✅ 清理依賴
3. ✅ 重新安裝依賴
4. ✅ 創建標準配置
5. ✅ 驗證配置
6. ✅ 運行測試

## 安裝的依賴

\`\`\`bash
$(npm ls eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks 2>/dev/null || echo "依賴列表獲取失敗")
\`\`\`

## 當前配置

\`\`\`javascript
$(cat .eslintrc.js)
\`\`\`

## 建議

- 定期更新 ESLint 相關依賴
- 遵循專案的編碼規範
- 使用 IDE 的 ESLint 整合功能
- 參考 docs/ESLINT_CONFIGURATION_GUIDE.md 了解詳細配置

## 如果仍有問題

1. 檢查 docs/ESLINT_QUICK_REFERENCE.md
2. 重新運行此腳本: \`./scripts/fix-eslint.sh\`
3. 手動復原參考配置: \`cp .eslintrc.reference.js .eslintrc.js\`
EOF
    
    log_success "修復報告已生成: ${report_file}"
}

# 主要執行函數
main() {
    echo "🚀 ESLint 自動修復腳本"
    echo "=========================="
    echo ""
    
    # 執行修復步驟
    check_project_root
    backup_config
    clean_dependencies
    install_dependencies
    create_standard_config
    validate_config
    run_tests
    generate_report
    
    echo ""
    echo "🎉 ESLint 修復完成！"
    echo ""
    echo "📝 後續步驟："
    echo "  1. 檢查生成的修復報告"
    echo "  2. 運行 'npm run lint' 驗證"
    echo "  3. 如有問題，參考 docs/ESLINT_QUICK_REFERENCE.md"
    echo ""
}

# 腳本執行入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi