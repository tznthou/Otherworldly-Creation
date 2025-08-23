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

// 創建 mock 測試資料
const createMockTauriProject = () => ({
  id: 'test-project-1',
  name: '測試專案',
  description: '這是一個測試專案',
  type: 'isekai',
  novel_length: 'medium',
  created_at: '2025-08-15T15:20:00Z',
  updated_at: '2025-08-15T15:20:00Z',
  settings: JSON.stringify({
    aiModel: 'llama3',
    aiParams: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 200,
      presencePenalty: 0,
      frequencyPenalty: 0,
    },
    templateSettings: {},
  }),
});

const createMockTauriCharacter = () => ({
  id: 'test-character-1',
  project_id: 'test-project-1',
  name: '主角',
  description: '勇者主角',
  age: 18,
  gender: '男',
  appearance: '黑髮黑眼，身材健壯',
  personality: '勇敢正義，有時衝動',
  background: '異世界召喚的高中生',
  archetype: '勇者',
  traits: JSON.stringify([]),
  abilities: JSON.stringify([]),
  relationships: JSON.stringify([]),
  avatar_url: null,
  created_at: '2025-08-15T15:20:00Z',
  updated_at: '2025-08-15T15:20:00Z',
});

// 模擬 Tauri API
const mockTauriAPI = {
  invoke: jest.fn((command, args) => {
    switch (command) {
      case 'get_project_by_id':
        return Promise.resolve(createMockTauriProject());
      case 'get_characters_by_project_id':
        return Promise.resolve([createMockTauriCharacter()]);
      case 'create_character':
        return Promise.resolve('new-character-id');
      case 'update_character':
        return Promise.resolve(undefined);
      case 'delete_character':
        return Promise.resolve(undefined);
      case 'get_character_by_id':
        return Promise.resolve(createMockTauriCharacter());
      case 'get_character_relationships':
        return Promise.resolve([]);
      case 'check_ollama_service':
        return Promise.resolve({ available: true, version: '0.11.4' });
      case 'get_ai_providers':
        return Promise.resolve([]);
      default:
        return Promise.resolve(undefined);
    }
  }),
};

// 設置全域 API
global.window = Object.assign(global.window || {}, {
  electronAPI: mockElectronAPI,
  __TAURI__: mockTauriAPI,
});

// 模擬 @tauri-apps/api/core
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn().mockImplementation((command: string, args?: any) => {
    console.log('Mock Tauri invoke called:', command, args);
    
    switch (command) {
      case 'get_all_projects':
        return Promise.resolve([]);
      case 'get_chapters_by_project_id':
        return Promise.resolve([]);
      case 'get_characters_by_project_id':
        return Promise.resolve([]);
      case 'create_project':
        return Promise.resolve('test-project-id');
      case 'health_check':
        return Promise.resolve({
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
        });
      default:
        console.warn('Unhandled Tauri command in mock:', command);
        return Promise.resolve(null);
    }
  }),
}));

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