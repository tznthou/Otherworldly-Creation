import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// 配置 Testing Library
configure({
  testIdAttribute: 'data-testid',
});

// 設置全域變數
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 模擬 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模擬 IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 模擬 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模擬 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// 模擬 sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// 模擬 Electron API
const mockElectronAPI = {
  projects: {
    getAll: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue('test-project-id'),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
  },
  chapters: {
    getByProjectId: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue('test-chapter-id'),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
  },
  characters: {
    getByProjectId: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue('test-character-id'),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    updateRelationships: jest.fn().mockResolvedValue(undefined),
    getRelationships: jest.fn().mockResolvedValue([]),
    checkRelationshipConsistency: jest.fn().mockResolvedValue([]),
    checkReferences: jest.fn().mockResolvedValue({ references: [], characterName: null }),
  },
  ai: {
    checkOllamaService: jest.fn().mockResolvedValue(true),
    getServiceStatus: jest.fn().mockResolvedValue({
      service: { available: true, version: '0.1.0' },
      models: { count: 2, list: ['llama3', 'codellama'] },
      lastChecked: new Date(),
    }),
    listModels: jest.fn().mockResolvedValue(['llama3', 'codellama']),
    getModelsInfo: jest.fn().mockResolvedValue([]),
    checkModelAvailability: jest.fn().mockResolvedValue({ available: true }),
    generateText: jest.fn().mockResolvedValue('Generated text'),
    generateWithContext: jest.fn().mockResolvedValue('Generated text with context'),
    updateOllamaConfig: jest.fn().mockResolvedValue({ success: true }),
  },
  system: {
    getVersion: jest.fn().mockResolvedValue('1.0.0'),
    showMessageBox: jest.fn().mockResolvedValue({ response: 0 }),
  },
  settings: {
    loadSettings: jest.fn().mockResolvedValue({}),
    saveSettings: jest.fn().mockResolvedValue(undefined),
    resetSettings: jest.fn().mockResolvedValue(undefined),
    updateSettings: jest.fn().mockResolvedValue(undefined),
  },
  database: {
    healthCheck: jest.fn().mockResolvedValue({
      isHealthy: true,
      issues: [],
      statistics: {
        totalProjects: 0,
        totalChapters: 0,
        totalCharacters: 0,
        totalTemplates: 4,
        databaseSize: 1024,
        lastVacuum: null,
        fragmentationLevel: 0,
      },
      timestamp: new Date().toISOString(),
    }),
    autoRepair: jest.fn().mockResolvedValue({
      success: true,
      fixedIssues: [],
      remainingIssues: [],
      message: 'No issues found',
    }),
    generateReport: jest.fn().mockResolvedValue('Database health report'),
    optimize: jest.fn().mockResolvedValue({ success: true, message: 'Database optimized' }),
    export: jest.fn().mockResolvedValue({ success: true, filePath: '/path/to/backup.json' }),
    import: jest.fn().mockResolvedValue({ success: true, message: 'Data imported successfully' }),
    getStatistics: jest.fn().mockResolvedValue({
      totalProjects: 0,
      totalChapters: 0,
      totalCharacters: 0,
      totalTemplates: 4,
      databaseSize: 1024,
      lastVacuum: null,
      fragmentationLevel: 0,
    }),
    checkIntegrity: jest.fn().mockResolvedValue({ isHealthy: true, issues: [] }),
    vacuum: jest.fn().mockResolvedValue({ success: true, message: 'Database vacuumed' }),
    analyze: jest.fn().mockResolvedValue({ success: true, message: 'Database analyzed' }),
  },
};

// 設置全域 electronAPI
global.window = Object.assign(global.window || {}, {
  electronAPI: mockElectronAPI,
});

// 導出 mock 以供測試使用
export { mockElectronAPI };

// 簡單的測試來避免 Jest 錯誤
describe('Test Setup', () => {
  it('should setup test environment correctly', () => {
    expect(global.window.electronAPI).toBeDefined();
    expect(global.TextEncoder).toBeDefined();
    expect(global.ResizeObserver).toBeDefined();
  });
});