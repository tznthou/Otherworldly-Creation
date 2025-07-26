# ESLint 快速參考指南

本文件提供 ESLint 常見問題的快速解決方案，適合緊急故障排除。

## 🚨 常見錯誤速查表

| 錯誤信息 | 快速解決方案 | 詳細說明 |
|---------|------------|---------|
| `The keyword 'interface' is reserved` | 添加 `parser: '@typescript-eslint/parser'` | [詳見](#typescript-解析器問題) |
| `Parsing error: Unexpected token ?` | 設定 `ecmaVersion: 2021` | [詳見](#語法版本問題) |
| `Unexpected token <` | 啟用 JSX: `jsx: true` | [詳見](#jsx-語法問題) |
| `'React' is not defined` | 添加 `'react/react-in-jsx-scope': 'off'` | [詳見](#react-17-問題) |
| `Cannot find module '@typescript-eslint/parser'` | `npm install @typescript-eslint/parser` | [詳見](#依賴缺失問題) |

## ⚡ 30秒快速修復

### 🔥 緊急修復配置
```javascript
// .eslintrc.js - 最小可用配置
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  env: { 
    browser: true, 
    node: true, 
    es2021: true 
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
}
```

### 🔥 緊急依賴安裝
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

## 🔍 問題診斷步驟

### 1️⃣ 配置檢查 (30秒)
```bash
# 檢查配置是否正確
npx eslint --print-config src/main/main.ts
```

### 2️⃣ 依賴檢查 (30秒)
```bash
# 檢查必要依賴
npm ls eslint @typescript-eslint/parser
```

### 3️⃣ 清理重建 (2分鐘)
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📋 常用命令清單

```bash
# 基本檢查
npm run lint                    # 檢查所有文件
npx eslint src/main/main.ts    # 檢查單個文件
npx eslint --fix .             # 自動修復

# 配置相關
npx eslint --print-config file.ts  # 查看有效配置
npx eslint --debug .               # 調試模式

# 快速測試
echo "const x: number = 1" | npx eslint --stdin --stdin-filename=test.ts
```

## 🎯 專案特定解決方案

### Electron 專案常見問題
```javascript
// 主程序 vs 渲染程序環境衝突
overrides: [
  {
    files: ['src/main/**/*'],
    env: { node: true, browser: false }
  },
  {
    files: ['src/renderer/**/*'],
    env: { browser: true, node: false }
  }
]
```

### TypeScript 嚴格模式問題
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',        // 開發時用 warn
  '@typescript-eslint/no-unused-vars': ['error', {     // 忽略 _ 開頭變數
    argsIgnorePattern: '^_'
  }]
}
```

## 🛠️ VS Code 整合修復

### settings.json 配置
```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact", 
    "typescript",
    "typescriptreact"
  ],
  "eslint.format.enable": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 🔄 版本兼容性矩陣

| ESLint | @typescript-eslint | React Plugin | 狀態 |
|--------|-------------------|--------------|------|
| 8.54.0 | 6.11.0           | 7.33.2       | ✅ 推薦 |
| 8.x    | 6.x              | 7.x          | ✅ 穩定 |
| 7.x    | 5.x              | 7.x          | ⚠️ 舊版 |

## 🚑 終極修復腳本

將以下腳本保存為 `fix-eslint.sh`:

```bash
#!/bin/bash
echo "🔧 開始修復 ESLint 配置..."

# 1. 備份當前配置
cp .eslintrc.js .eslintrc.js.backup 2>/dev/null || echo "沒有找到現有配置"

# 2. 清理依賴
echo "📦 清理依賴..."
rm -rf node_modules package-lock.json

# 3. 重新安裝
echo "⬇️ 重新安裝依賴..."
npm install

# 4. 安裝 ESLint 依賴
echo "🔧 安裝 ESLint 相關依賴..."
npm install --save-dev \
  eslint@^8.54.0 \
  @typescript-eslint/parser@^6.11.0 \
  @typescript-eslint/eslint-plugin@^6.11.0 \
  eslint-plugin-react@^7.33.2 \
  eslint-plugin-react-hooks@^4.6.0

# 5. 創建基本配置
echo "⚙️ 創建基本配置..."
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  env: { browser: true, node: true, es2021: true },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['dist/', 'out/', 'node_modules/']
}
EOF

# 6. 測試配置
echo "✅ 測試配置..."
npx eslint --print-config package.json > /dev/null && echo "配置有效" || echo "配置無效"

# 7. 運行檢查
echo "🔍 運行檢查..."
npm run lint || echo "發現問題，請檢查具體錯誤"

echo "🎉 修復完成！"
```

使用方法:
```bash
chmod +x fix-eslint.sh
./fix-eslint.sh
```

---

**💡 提示**: 遇到問題時，先嘗試這個文件中的快速解決方案，如果問題複雜，請參考 `ESLINT_CONFIGURATION_GUIDE.md` 的詳細說明。