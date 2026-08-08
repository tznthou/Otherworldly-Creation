module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    // 🧹 Tech Debt Prevention: Warn about console usage (2025-10-11)
    // Allow console.warn and console.error for important logging
    // Block console.log in production code (use logger instead)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-undef': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    // 🧹 Tech Debt Prevention (2025-10-11)，2026-08-08 拿掉 TODO：
    // 60 個 TODO 佔了全部 warning 的 69%，讓 lint 輸出永遠有噪音而沒人看，
    // 實際代價是 useAIGeneration 的 exhaustive-deps 真 bug 被淹了一年。
    // TODO 是工作項目（歸 RESUME.md），FIXME/XXX/HACK 才是「這裡壞的」，留著擋。
    'no-warning-comments': ['warn', { terms: ['FIXME', 'XXX', 'HACK'], location: 'start' }],
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
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
    'src/__tests__/**/*',
    'vite.config.ts',
    'scripts/**/*',
  ],
};