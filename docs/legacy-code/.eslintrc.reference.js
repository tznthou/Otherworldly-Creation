/**
 * ESLint 參考配置文件
 * 
 * 這是創世紀元專案的標準 ESLint 配置範本
 * 如果 .eslintrc.js 出現問題，可以複製此檔案作為替代
 * 
 * 使用方法：
 * 1. 複製此檔案為 .eslintrc.js
 * 2. 安裝必要依賴：npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
 * 3. 運行測試：npm run lint
 */

module.exports = {
  // 設定為根配置，阻止向上查找
  root: true,
  
  // 環境配置
  env: {
    browser: true,    // 支援瀏覽器 API
    es2021: true,     // 支援 ES2021 語法
    node: true,       // 支援 Node.js API
  },
  
  // 繼承的規則集
  extends: [
    'eslint:recommended',                    // ESLint 推薦規則
    '@typescript-eslint/recommended',       // TypeScript 推薦規則
  ],
  
  // 解析器配置
  parser: '@typescript-eslint/parser',      // 使用 TypeScript 解析器
  
  // 插件列表
  plugins: [
    '@typescript-eslint',    // TypeScript 支援
    'react',                 // React 支援
    'react-hooks'           // React Hooks 規則
  ],
  
  // 解析器選項
  parserOptions: {
    ecmaFeatures: {
      jsx: true,            // 啟用 JSX 解析
    },
    ecmaVersion: 2021,      // ECMAScript 版本
    sourceType: 'module',   // 使用 ES 模組
    project: [              // TypeScript 專案配置
      './tsconfig.json', 
      './tsconfig.main.json'
    ],
  },
  
  // 自定義規則
  rules: {
    // === TypeScript 相關規則 ===
    'no-unused-vars': 'off',                                    // 關閉 JS 的未使用變數檢查
    '@typescript-eslint/no-unused-vars': [                      // 啟用 TS 的未使用變數檢查
      'error', 
      { 
        argsIgnorePattern: '^_',                                 // 忽略 _ 開頭的參數
        varsIgnorePattern: '^_'                                  // 忽略 _ 開頭的變數
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn',               // any 類型警告
    '@typescript-eslint/explicit-function-return-type': 'off',  // 不強制函數返回類型
    '@typescript-eslint/explicit-module-boundary-types': 'off', // 不強制模組邊界類型
    
    // === 通用規則 ===
    'no-console': 'off',                                        // 允許 console.log
    'no-undef': 'off',                                          // TypeScript 會處理未定義變數
    'prefer-const': 'error',                                    // 優先使用 const
    'no-var': 'error',                                          // 禁用 var
    
    // === React 相關規則 ===
    'react/react-in-jsx-scope': 'off',                          // React 17+ 不需要導入 React
    'react/prop-types': 'off',                                  // TypeScript 已提供類型檢查
    'react-hooks/rules-of-hooks': 'error',                      // Hook 使用規則
    'react-hooks/exhaustive-deps': 'warn',                      // useEffect 依賴檢查
    
    // === 代碼風格規則 ===
    'indent': ['error', 2],                                     // 2 空格縮排
    'quotes': ['error', 'single'],                              // 單引號
    'semi': ['error', 'always'],                                // 分號結尾
    'comma-dangle': ['error', 'always-multiline'],              // 多行時尾隨逗號
    'object-curly-spacing': ['error', 'always'],                // 物件大括號空格
    'array-bracket-spacing': ['error', 'never'],                // 陣列括號無空格
  },
  
  // React 設定
  settings: {
    react: {
      version: 'detect',    // 自動檢測 React 版本
    },
  },
  
  // 忽略文件/目錄
  ignorePatterns: [
    'dist/',                // 建構輸出目錄
    'out/',                 // Electron 打包目錄
    'coverage/',            // 測試覆蓋率報告
    'node_modules/',        // 依賴包目錄
    '*.test.ts',            // 測試文件
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    'test-*.js',            // 測試腳本
    '*.config.js',          // 配置文件
    '*.config.ts',
  ],
  
  // 覆蓋配置（針對特定文件類型）
  overrides: [
    {
      // Electron 主程序配置
      files: ['src/main/**/*'],
      env: {
        node: true,
        browser: false,       // 主程序不使用瀏覽器 API
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',           // 允許 require()
        'no-restricted-imports': ['error', {
          patterns: ['react*']                                  // 主程序禁用 React
        }]
      }
    },
    {
      // React 渲染程序配置
      files: ['src/renderer/**/*'],
      env: {
        browser: true,
        node: false,          // 渲染程序不直接使用 Node.js API
      },
      rules: {
        'no-restricted-globals': ['error', 'process', 'Buffer'], // 禁用 Node.js 全域變數
      }
    },
    {
      // 測試文件配置
      files: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts', 
        '**/*.spec.tsx',
        'src/**/__tests__/**/*'
      ],
      env: {
        jest: true,           // Jest 測試環境
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',           // 測試中允許 any
        '@typescript-eslint/no-non-null-assertion': 'off',     // 測試中允許非空斷言
        'no-console': 'off',                                    // 測試中允許 console
      }
    },
    {
      // 配置文件
      files: [
        '*.config.js',
        '*.config.ts',
        'forge.config.js',
        'vite.config.ts',
        'jest.config.js'
      ],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',           // 配置文件允許 require
        'no-undef': 'off',
      }
    }
  ]
};

/*
常見問題解決方案：

1. 如果遇到 "Cannot find module '@typescript-eslint/parser'" 錯誤：
   npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

2. 如果遇到 "The keyword 'interface' is reserved" 錯誤：
   確保 parser 設定為 '@typescript-eslint/parser'

3. 如果遇到 React JSX 語法錯誤：
   確保 parserOptions.ecmaFeatures.jsx 設為 true

4. 如果版本不兼容：
   npm install --save-dev eslint@^8.54.0 @typescript-eslint/parser@^6.11.0

5. 緊急重置：
   rm -rf node_modules package-lock.json && npm install
*/