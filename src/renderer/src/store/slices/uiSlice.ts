import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarCollapsed: boolean;
  currentView: 'dashboard' | 'editor' | 'characters' | 'settings';
  theme: 'cosmic' | 'light' | 'dark';
  notifications: Notification[];
  selectedTemplate: any | null; // 儲存選中的模板
  modals: {
    createProject: boolean;
    projectManage: boolean;
    deleteProject: boolean;
    importProject: boolean;
    chapterManage: boolean;
    createChapter: boolean;
    aiSettings: boolean;
    settings: boolean;
    characterForm: boolean;
    templateManager: boolean;
    templateApplication: boolean;
    selectProjectForCharacters: boolean;
    backupManager: boolean;
    helpCenter: boolean;
    updateManager: boolean;
  };
  loading: {
    global: boolean;
    projects: boolean;
    chapters: boolean;
    characters: boolean;
    ai: boolean;
  };
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  currentView: 'dashboard',
  theme: 'cosmic',
  notifications: [],
  selectedTemplate: null,
  modals: {
    createProject: false,
    projectManage: false,
    deleteProject: false,
    importProject: false,
    chapterManage: false,
    createChapter: false,
    aiSettings: false,
    settings: false,
    characterForm: false,
    templateManager: false,
    templateApplication: false,
    selectProjectForCharacters: false,
    backupManager: false,
    helpCenter: false,
    updateManager: false,
  },
  loading: {
    global: false,
    projects: false,
    chapters: false,
    characters: false,
    ai: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setCurrentView: (state, action: PayloadAction<UIState['currentView']>) => {
      state.currentView = action.payload;
    },
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
    },
    
    // 通知管理
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        autoClose: action.payload.autoClose ?? true,
        duration: action.payload.duration ?? 5000,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // 模態框管理
    openModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action: PayloadAction<keyof UIState['modals']>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key as keyof UIState['modals']] = false;
      });
    },
    
    // 載入狀態管理
    setLoading: (state, action: PayloadAction<{ key: keyof UIState['loading']; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    // 模板管理
    setSelectedTemplate: (state, action: PayloadAction<any>) => {
      state.selectedTemplate = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setCurrentView,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setLoading,
  setGlobalLoading,
  setSelectedTemplate,
} = uiSlice.actions;

export default uiSlice.reducer;

// 輔助函數：創建通知
export const createNotification = {
  success: (title: string, message: string): Omit<Notification, 'id' | 'timestamp'> => ({
    type: 'success',
    title,
    message,
  }),
  error: (title: string, message: string): Omit<Notification, 'id' | 'timestamp'> => ({
    type: 'error',
    title,
    message,
    autoClose: false, // 錯誤通知不自動關閉
  }),
  warning: (title: string, message: string): Omit<Notification, 'id' | 'timestamp'> => ({
    type: 'warning',
    title,
    message,
  }),
  info: (title: string, message: string): Omit<Notification, 'id' | 'timestamp'> => ({
    type: 'info',
    title,
    message,
  }),
};