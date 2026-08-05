/**
 * 共用設定。unit 與 integration 只在測試範圍與 setup 上分歧，
 * 其餘（transform / 路徑別名 / 環境）必須一致，否則兩邊會出現只在單邊重現的問題。
 */
const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    // 與 tsconfig.json 的 "@/*": ["src/renderer/src/*"] 及
    // vite.config.ts 的 resolve(__dirname, 'src/renderer/src') 對齊
    '^@/(.*)': '<rootDir>/src/renderer/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup-import-meta.js'],
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

module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/__tests__/**/*',
  ],

  // 分成兩組：單元測試不需要 integration 的 Electron 替身與命令回應，
  // 混在一起會讓每個單元測試都揹著整套應用層 mock。
  //
  // testMatch 一律限定 .test / .spec —— 原本的 '**/__tests__/**/*' 會把
  // 目錄下的輔助檔（testUtils.tsx / TestApp.tsx / setup.ts）也當成測試 suite，
  // 以「沒有測試」計入失敗數。舊的 setup.ts 為此還加了一個假測試繞過。
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/renderer/**/*.(test|spec).+(ts|tsx|js)'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup-env.ts'],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.(test|spec).+(ts|tsx|js)'],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup-env.ts',
        '<rootDir>/src/__tests__/integration/setup.ts',
      ],
    },
  ],
};
