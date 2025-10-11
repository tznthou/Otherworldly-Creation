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
    // 🧹 Tech Debt Prevention: Warn about TODO comments (2025-10-11)
    'no-warning-comments': ['warn', { terms: ['TODO', 'FIXME', 'XXX', 'HACK'], location: 'start' }],
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