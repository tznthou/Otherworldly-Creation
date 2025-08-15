import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from '../../../renderer/src/store/slices/projectsSlice';
import chaptersReducer from '../../../renderer/src/store/slices/chaptersSlice';
import charactersReducer from '../../../renderer/src/store/slices/charactersSlice';
import templatesReducer from '../../../renderer/src/store/slices/templatesSlice';
import aiReducer from '../../../renderer/src/store/slices/aiSlice';
import aiHistoryReducer from '../../../renderer/src/store/slices/aiHistorySlice';
import uiReducer from '../../../renderer/src/store/slices/uiSlice';
import editorReducer from '../../../renderer/src/store/slices/editorSlice';
import { errorReducer, progressReducer } from '../../../renderer/src/store/slices/errorSlice';
import notificationReducer from '../../../renderer/src/store/slices/notificationSlice';
import settingsReducer from '../../../renderer/src/store/slices/settingsSlice';

// 創建測試用的 Redux store
export function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      projects: projectsReducer,
      chapters: chaptersReducer,
      characters: charactersReducer,
      templates: templatesReducer,
      ai: aiReducer,
      aiHistory: aiHistoryReducer,
      ui: uiReducer,
      editor: editorReducer,
      error: errorReducer,
      progress: progressReducer,
      notification: notificationReducer,
      settings: settingsReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  });
}

// 自定義渲染函數
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createTestStore>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// 測試資料生成器
export const createMockProject = (overrides = {}) => ({
  id: 'test-project-1',
  name: '測試專案',
  type: 'isekai' as const,
  description: '這是一個測試專案',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    aiModel: 'llama3',
    aiParams: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 200,
      presencePenalty: 0,
      frequencyPenalty: 0,
    },
    templateSettings: {},
  },
  ...overrides,
});

export const createMockChapter = (overrides = {}) => ({
  id: 'test-chapter-1',
  projectId: 'test-project-1',
  title: '第一章',
  content: '這是第一章的內容。',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCharacter = (overrides = {}) => ({
  id: 'test-character-1',
  projectId: 'test-project-1',
  name: '主角',
  archetype: '勇者',
  age: 18,
  gender: '男',
  appearance: '黑髮黑眼，身材中等',
  personality: '勇敢正義，有時衝動',
  background: '普通高中生，意外穿越到異世界',
  abilities: ['劍術', '魔法'],
  relationships: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// 等待異步操作完成的工具函數
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// 模擬用戶操作的工具函數
export const simulateUserInput = async (element: HTMLElement, value: string) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.change(element, { target: { value } });
  fireEvent.blur(element);
};

export const simulateClick = async (element: HTMLElement) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.click(element);
};

// 等待元素出現的工具函數
export const waitForElement = async (getByTestId: any, testId: string, timeout = 5000) => {
  const { waitFor } = await import('@testing-library/react');
  
  return waitFor(() => getByTestId(testId), { timeout });
};

// 檢查通知是否顯示的工具函數
export const expectNotificationToShow = async (getByText: any, message: string) => {
  const { waitFor } = await import('@testing-library/react');
  
  await waitFor(() => {
    expect(getByText(message)).toBeInTheDocument();
  });
};

// 模擬文件上傳的工具函數
export const simulateFileUpload = async (input: HTMLInputElement, file: File) => {
  const { fireEvent } = await import('@testing-library/react');
  
  Object.defineProperty(input, 'files', {
    value: [file],
    writable: false,
  });
  
  fireEvent.change(input);
};

// 創建模擬文件的工具函數
export const createMockFile = (name: string, content: string, type = 'application/json') => {
  return new File([content], name, { type });
};

// 模擬拖放操作的工具函數
export const simulateDragAndDrop = async (
  dragElement: HTMLElement,
  dropElement: HTMLElement
) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.dragStart(dragElement);
  fireEvent.dragEnter(dropElement);
  fireEvent.dragOver(dropElement);
  fireEvent.drop(dropElement);
  fireEvent.dragEnd(dragElement);
};

// 檢查 Redux store 狀態的工具函數
export const expectStoreState = (store: any, path: string, expectedValue: any) => {
  const state = store.getState();
  const actualValue = path.split('.').reduce((obj, key) => obj[key], state);
  expect(actualValue).toEqual(expectedValue);
};

// 模擬鍵盤事件的工具函數
export const simulateKeyPress = async (element: HTMLElement, key: string, options = {}) => {
  const { fireEvent } = await import('@testing-library/react');
  
  fireEvent.keyDown(element, { key, ...options });
  fireEvent.keyUp(element, { key, ...options });
};

// 等待 loading 狀態結束的工具函數
export const waitForLoadingToFinish = async (queryByTestId: any) => {
  const { waitFor } = await import('@testing-library/react');
  
  await waitFor(() => {
    expect(queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
};

// 簡單的測試來避免 Jest 錯誤
describe('Test Utils', () => {
  it('should provide testing utilities', () => {
    expect(createMockProject).toBeDefined();
    expect(createMockChapter).toBeDefined();
    expect(createMockCharacter).toBeDefined();
    expect(renderWithProviders).toBeDefined();
  });
});