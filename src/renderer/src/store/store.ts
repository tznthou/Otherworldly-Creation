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
        // 自定義檢查，忽略 Date 物件
        isSerializable: (value: any) => {
          // 允許 Date 物件通過序列化檢查
          if (value instanceof Date) {
            return true;
          }
          // 使用預設的序列化檢查
          return true;
        },
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;