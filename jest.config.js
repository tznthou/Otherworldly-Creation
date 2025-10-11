module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)': ['ts-jest', {
      useESM: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/__tests__/**/*',
  ],
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/renderer/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup-import-meta.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],
  // 修復 Vite import.meta.env 在 Jest 中的解析問題
  globals: {
    'import.meta': {
      env: {
        PROD: false,
        DEV: true,
        MODE: 'test',
      },
    },
  },
};