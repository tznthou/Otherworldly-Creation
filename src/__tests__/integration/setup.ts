/**
 * Integration 測試專用設定
 *
 * 只放應用層的替身：Tauri 命令的回應與測試資料工廠。
 * 瀏覽器 API polyfill 與 Tauri 執行期介面屬於環境層，在 `../setup-env.ts`。
 *
 * 這裡曾經有一份 90 行的 window.electronAPI 替身。它已隨 2026-08-05 刪除的
 * 五個 integration suite 一起移除 —— 專案主體早已遷到 Tauri，元件的資料
 * 一律走 invoke，那份替身對畫面沒有任何作用，卻讓五個 suite 誤以為
 * 設 mockResolvedValue 就能餵資料。殘留的兩處 window.electronAPI?.xxx
 * （UpdateManager / GlobalErrorHandler）都是 optional chaining，
 * 不 mock 它反而讓測試環境與真實的 Tauri 執行期一致。
 */

// === 測試資料工廠 ===
//
// 形狀是後端格式（snake_case、settings 為 JSON 字串），api 層會轉成前端格式。

export const createMockTauriProject = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

export const createMockTauriChapter = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-chapter-1',
  project_id: 'test-project-1',
  title: '第一章',
  content: JSON.stringify([{ type: 'paragraph', children: [{ text: '這是第一章的內容。' }] }]),
  order_index: 1,
  chapter_number: 1,
  metadata: null,
  created_at: '2025-08-15T15:20:00Z',
  updated_at: '2025-08-15T15:20:00Z',
  ...overrides,
});

export const createMockTauriCharacter = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

// === Tauri 命令的可覆寫回應 ===
//
// 元件的資料一律走 Tauri invoke（api 層 → enhancedSafeInvoke → invoke），
// 所以測試要餵資料給畫面，唯一的入口就是這裡。
//
// 用 mockTauriCommand() 覆寫單一命令，afterEach 會自動還原成預設值。
// 變數名必須以 mock 開頭，否則 jest 的 hoisting 檢查會擋下 factory 內的引用。
//
//   mockTauriCommand('get_all_projects', () => [createMockTauriProject({ name: '專案一' })]);

type CommandHandler = (args?: Record<string, unknown>) => unknown;

const mockCommandOverrides: Record<string, CommandHandler> = {};

export function mockTauriCommand(command: string, handler: CommandHandler): void {
  mockCommandOverrides[command] = handler;
}

export function resetTauriCommands(): void {
  Object.keys(mockCommandOverrides).forEach(key => delete mockCommandOverrides[key]);
}

afterEach(() => {
  resetTauriCommands();
});

// 用 requireActual 保留模組其餘匯出，只換掉 invoke。
// 整個模組換成物件字面值會連帶弄丟 Resource / transformCallback 等內部依賴，
// 而 `@tauri-apps/plugin-store` 的 `class Store extends core.Resource` 正是靠它們，
// 少一個就會在載入階段丟 "Class extends value undefined"。

jest.mock('@tauri-apps/api/core', () => {
  const actual = jest.requireActual('@tauri-apps/api/core');

  return {
    ...actual,
    invoke: jest.fn(async (command: string, args?: Record<string, unknown>) => {
      const override = mockCommandOverrides[command];
      if (override) {
        return override(args);
      }

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
