# ESLint 配置指南

本文件提供創世紀元專案的 ESLint 配置最佳實踐，避免常見的配置問題和語法錯誤。

## 📋 目錄

- [專案架構概覽](#專案架構概覽)
- [核心配置文件](#核心配置文件)
- [常見問題與解決方案](#常見問題與解決方案)
- [配置驗證步驟](#配置驗證步驟)
- [故障排除指南](#故障排除指南)
- [最佳實踐](#最佳實踐)

## 🏗️ 專案架構概覽

創世紀元是一個 Electron + React + TypeScript 專案，包含多種技術棧：

```
genesis-chronicle/
├── src/
│   ├── main/           # Electron 主程序 (Node.js 環境)
│   │   ├── database/   # SQLite 資料庫
│   │   ├── services/   # 核心服務 (AI, 更新等)
│   │   └── ipc/        # IPC 通信處理
│   └── renderer/       # React 前端 (Browser 環境)
│       └── src/
│           ├── components/  # React 組件
│           ├── pages/       # 頁面組件
│           ├── store/       # Redux 狀態管理
│           └── services/    # 前端服務
├── .eslintrc.js        # ESLint 主配置
├── tsconfig.json       # TypeScript 前端配置
└── tsconfig.main.json  # TypeScript 主程序配置
```

## ⚙️ 核心配置文件

### 1. 主要 ESLint 配置 (`.eslintrc.js`)

```javascript
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
    // TypeScript 規則
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // 通用規則
    'no-console': 'off',
    'no-undef': 'off', // TypeScript 會處理這個
    
    // React 規則
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要
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
```

### 2. 必要的依賴包 (`package.json`)

```json
{
  "devDependencies": {
    "eslint": "^8.54.0",
    "@typescript-eslint/parser": "^6.11.0",
    "@typescript-eslint/eslint-plugin": "^6.11.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

### 3. TypeScript 配置

**前端配置 (`tsconfig.json`)**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/renderer"],
  "exclude": ["node_modules", "dist", "src/main"]
}
```

**主程序配置 (`tsconfig.main.json`)**:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./src/main",
    "noEmit": false,
    "jsx": "preserve",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/main/**/*"],
  "exclude": ["node_modules", "src/renderer"]
}
```

## 🐛 常見問題與解決方案

### 問題 1: `The keyword 'interface' is reserved`

**原因**: ESLint 沒有使用 TypeScript 解析器

**解決方案**:
```javascript
// 確保配置中包含
module.exports = {
  parser: '@typescript-eslint/parser', // 必須設定
  plugins: ['@typescript-eslint'],
  extends: ['@typescript-eslint/recommended']
}
```

### 問題 2: `Parsing error: Unexpected token ?` (可選鏈)

**原因**: ECMAScript 版本過舊

**解決方案**:
```javascript
parserOptions: {
  ecmaVersion: 2021, // 支援可選鏈 (?.) 和空值合併 (??)
  sourceType: 'module'
}
```

### 問題 3: `Unexpected token <` (JSX 語法)

**原因**: JSX 支援未啟用

**解決方案**:
```javascript
parserOptions: {
  ecmaFeatures: {
    jsx: true // 啟用 JSX 解析
  }
},
plugins: ['react'],
extends: ['plugin:react/recommended']
```

### 問題 4: `'React' is not defined`

**原因**: React 17+ 的新 JSX 轉換

**解決方案**:
```javascript
rules: {
  'react/react-in-jsx-scope': 'off' // React 17+ 不需要導入 React
}
```

### 問題 5: 版本不兼容錯誤

**解決方案**: 確保所有相關套件版本一致
```bash
npm install --save-dev \
  @typescript-eslint/parser@^6.11.0 \
  @typescript-eslint/eslint-plugin@^6.11.0 \
  eslint@^8.54.0
```

## ✅ 配置驗證步驟

### 1. 安裝依賴
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

### 2. 驗證配置
```bash
# 檢查配置語法
npx eslint --print-config src/main/main.ts

# 測試特定文件
npx eslint src/main/main.ts
npx eslint src/renderer/src/App.tsx
```

### 3. 運行完整檢查
```bash
npm run lint
```

### 4. 自動修復
```bash
npm run lint -- --fix
```

## 🔧 故障排除指南

### 步驟 1: 檢查基礎配置
- [ ] `.eslintrc.js` 文件存在且語法正確
- [ ] `parser` 設定為 `@typescript-eslint/parser`
- [ ] 必要的 `plugins` 和 `extends` 已配置

### 步驟 2: 驗證依賴
```bash
npm ls eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 步驟 3: 清理緩存
```bash
rm -rf node_modules/.cache
npx eslint --cache-location ./node_modules/.cache/eslint/
```

### 步驟 4: 分步測試
```bash
# 測試 JavaScript 文件
npx eslint test.js

# 測試 TypeScript 文件
npx eslint test.ts

# 測試 React 組件
npx eslint test.tsx
```

### 步驟 5: 檢查編輯器整合
確保 VS Code 的 ESLint 擴展配置正確：
```json
// .vscode/settings.json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.format.enable": true
}
```

## 🎯 最佳實踐

### 1. 分階段配置策略
```javascript
// 基礎配置 → TypeScript 支援 → React 支援 → 專案特定規則
module.exports = {
  // 第一階段：基礎
  extends: ['eslint:recommended'],
  
  // 第二階段：TypeScript
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  
  // 第三階段：React
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  
  // 第四階段：專案規則
  rules: {
    // 自定義規則
  }
}
```

### 2. 環境特定配置
```javascript
module.exports = {
  // 全域配置
  root: true,
  
  // 覆蓋配置
  overrides: [
    {
      // 主程序文件
      files: ['src/main/**/*'],
      env: { node: true, browser: false },
      rules: {
        '@typescript-eslint/no-var-requires': 'off' // 允許 require()
      }
    },
    {
      // 前端文件
      files: ['src/renderer/**/*'],
      env: { browser: true, node: false },
      rules: {
        'no-restricted-globals': ['error', 'process'] // 禁用 Node.js globals
      }
    },
    {
      // 測試文件
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: { jest: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
}
```

### 3. 段階式錯誤處理
```javascript
rules: {
  // 第一階段：警告模式（開發初期）
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': 'warn',
  
  // 第二階段：錯誤模式（穩定開發）
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': 'error',
  
  // 第三階段：嚴格模式（發布前）
  '@typescript-eslint/strict-boolean-expressions': 'error'
}
```

### 4. 自動化工具整合
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "lint:staged": "lint-staged",
    "pre-commit": "npm run lint:staged"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "git add"]
  }
}
```

## 📚 參考資源

- **ESLint 官方文檔**: https://eslint.org/docs/
- **TypeScript ESLint**: https://typescript-eslint.io/
- **React ESLint 規則**: https://github.com/jsx-eslint/eslint-plugin-react
- **專案 CLAUDE.md**: ./CLAUDE.md

## 🚨 緊急修復命令

如果 ESLint 完全無法工作，執行以下命令重置：

```bash
# 1. 清理依賴
rm -rf node_modules package-lock.json

# 2. 重新安裝
npm install

# 3. 重新安裝 ESLint 依賴
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks

# 4. 驗證配置
npx eslint --print-config src/main/main.ts

# 5. 測試運行
npm run lint
```

---

**最後更新**: 2024年1月
**適用版本**: ESLint 8.x, TypeScript 5.x, React 18.x
**維護者**: 創世紀元開發團隊