import { configureStore } from '@reduxjs/toolkit';
import projectsReducer from './slices/projectsSlice';
import chaptersReducer from './slices/chaptersSlice';
import charactersReducer from './slices/charactersSlice';
import templatesReducer from './slices/templatesSlice';
import aiReducer from './slices/aiSlice'; // 重新啟用 AI slice
import uiReducer from './slices/uiSlice';
import editorReducer from './slices/editorSlice';
import { errorReducer, progressReducer } from './slices/errorSlice';
import notificationReducer from './slices/notificationSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    projects: projectsReducer,
    chapters: chaptersReducer,
    characters: charactersReducer,
    templates: templatesReducer,
    ai: aiReducer, // 重新啟用 AI slice
    ui: uiReducer,
    editor: editorReducer,
    error: errorReducer,
    progress: progressReducer,
    notification: notificationReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
        ignoredPaths: ['payload.timestamp', 'meta.arg', 'meta.baseQueryMeta'],
        // 自定義檢查，允許 Date 物件和函數
        isSerializable: (value: any) => {
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;