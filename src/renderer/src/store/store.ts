import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from './slices/projectsSlice';
import chaptersReducer from './slices/chaptersSlice';
import charactersReducer from './slices/charactersSlice';
import templatesReducer from './slices/templatesSlice';
import aiReducer from './slices/aiSlice'; // 重新啟用 AI slice
import aiHistoryReducer from './slices/aiHistorySlice';
import uiReducer from './slices/uiSlice';
import editorReducer from './slices/editorSlice';
import editorStatsReducer from './slices/editorStatsSlice';
import { errorReducer, progressReducer } from './slices/errorSlice';
import notificationReducer from './slices/notificationSlice';
import settingsReducer from './slices/settingsSlice';
import visualCreationReducer from './slices/visualCreationSlice';
import versionManagementReducer from './slices/versionManagementSlice';
import ebookPreparationReducer from './slices/ebookPreparationSlice';

const rootReducer = {
  projects: projectsReducer,
  chapters: chaptersReducer,
  characters: charactersReducer,
  templates: templatesReducer,
  ai: aiReducer, // 重新啟用 AI slice
  aiHistory: aiHistoryReducer,
  ui: uiReducer,
  editor: editorReducer,
  editorStats: editorStatsReducer,
  error: errorReducer,
  progress: progressReducer,
  notification: notificationReducer,
  settings: settingsReducer,
  visualCreation: visualCreationReducer, // 新增視覺創作狀態管理
  versionManagement: versionManagementReducer, // 新增版本管理狀態管理
  ebookPreparation: ebookPreparationReducer, // 新增電子書排版預備狀態管理
};

// 測試用的 store 走同一條組裝路徑，reducer 與 middleware 才不會與真實環境漂移。
// 舊的測試 helper 自己列了一份 reducer，少掉四個 slice 而沒人發現。
export function createAppStore(preloadedState?: Record<string, unknown>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'progress/startProgress', 'progress/updateProgress', 'progress/completeProgress', 'progress/failProgress'],
          ignoredPaths: ['payload.timestamp', 'meta.arg', 'meta.baseQueryMeta', 'progress.indicators', 'error.errors'],
          // 自定義檢查，允許 Date 物件和函數
          isSerializable: (value: unknown) => {
            if (value instanceof Date) {
              return true;
            }
            if (typeof value === 'function') {
              return false; // 函數不應該被序列化
            }
            return true;
          },
        },
        thunk: true, // 確保 thunk 中間件被啟用
      }),
  });
}

export const store = createAppStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
