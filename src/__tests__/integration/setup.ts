/**
 * Integration 測試專用設定
 *
 * 只放應用層的替身：Electron 遺留 API、Tauri 命令的預設回應、測試資料工廠。
 * 瀏覽器 API polyfill 與 Tauri 執行期介面屬於環境層，在 `../setup-env.ts`。
 */

// === Electron API（遺留） ===
//
// 專案主體已遷移到 Tauri，但 UpdateManager 與 GlobalErrorHandler 仍讀
// window.electronAPI，移除這個 mock 會讓載入到它們的測試直接壞掉。

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

// === 測試資料工廠 ===

export const createMockTauriProject = () => ({
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

export const createMockTauriCharacter = () => ({
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

Object.assign(window, {
  electronAPI: mockElectronAPI,
});

// === Tauri 命令的預設回應 ===
//
// 用 requireActual 保留模組其餘匯出，只換掉 invoke。
// 整個模組換成物件字面值會連帶弄丟 Resource / transformCallback 等內部依賴，
// 而 `@tauri-apps/plugin-store` 的 `class Store extends core.Resource` 正是靠它們，
// 少一個就會在載入階段丟 "Class extends value undefined"。

jest.mock('@tauri-apps/api/core', () => {
  const actual = jest.requireActual('@tauri-apps/api/core');

  return {
    ...actual,
    invoke: jest.fn(async (command: string) => {
      switch (command) {
        case 'get_all_projects':
          return [];
        case 'get_project_by_id':
          return createMockTauriProject();
        case 'get_chapters_by_project_id':
          return [];
        case 'get_characters_by_project_id':
          return [createMockTauriCharacter()];
        case 'get_character_by_id':
          return createMockTauriCharacter();
        case 'create_project':
          return 'test-project-id';
        case 'create_character':
          return 'new-character-id';
        case 'update_character':
        case 'delete_character':
          return undefined;
        case 'get_character_relationships':
          return [];
        case 'check_ollama_service':
          return { available: true, version: '0.11.4' };
        case 'get_ai_providers':
          return [];
        case 'health_check':
          return {
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
          };
        default:
          return null;
      }
    }),
  };
});

export { mockElectronAPI };
