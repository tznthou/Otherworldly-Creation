import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 應用程式設定介面
export interface AppSettings {
  // 一般設定
  language: 'zh-TW' | 'zh-CN' | 'en' | 'ja';
  
  // AI 設定
  ai: {
    defaultModel: string;
    selectedModel?: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    contextLength: number;
    enableAutoComplete: boolean;
    autoCompleteDelay: number; // 毫秒
    // Ollama 服務設定
    ollamaBaseUrl: string;
    ollamaTimeout: number; // 秒
    ollamaRetryAttempts: number;
    ollamaRetryDelay: number; // 毫秒
    
    // 智能上下文優化設定
    intelligentContext: {
      enabled: boolean;                                    // 啟用智能上下文優化
      optimizationLevel: 'basic' | 'advanced' | 'experimental';  // 優化等級
      preserveDialogue: boolean;                          // 保留對話內容
      maxTokenBudget: number;                            // 最大Token預算
      plotAnalysisWeight: number;                        // 劇情分析權重 (0-1)
      statusWeight: number;                              // 章節狀態權重 (0-1)
      proximityWeight: number;                           // 位置接近權重 (0-1)
      enablePerformanceMode: boolean;                    // 性能模式（減少分析複雜度）
    };
  };
  
  // 編輯器設定
  editor: {
    theme: 'cosmic' | 'light' | 'dark' | 'sepia';
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    showLineNumbers: boolean;
    wordWrap: boolean;
    spellCheck: boolean;
    enableVimMode: boolean;
  };
  
  // 界面設定
  ui: {
    sidebarWidth: number;
    showStatusBar: boolean;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  
  // 備份設定
  backup: {
    autoBackup: boolean;
    backupInterval: number; // 小時
    maxBackupFiles: number;
    backupLocation: string;
  };
  
  // 隱私設定
  privacy: {
    enableTelemetry: boolean;
    enableCrashReporting: boolean;
    enableUsageAnalytics: boolean;
  };
  
  // 快捷鍵設定
  shortcuts: {
    [key: string]: string;
  };
  
  // 電子書功能設定
  ebookVirtualNaming: boolean;            // 電子書虛擬檔名對應系統

  // 功能開關設定
  features: {
    // AI 插畫功能
    extendedIllustrationServices: boolean;  // 擴展AI插圖服務 (Gemini、OpenRouter等)
    smartApiDetection: boolean;             // 智能API檢測
    
    // 智能上下文功能
    intelligentContextOptimization: boolean; // 智能多維度上下文優化
  };
}

// 預設設定
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-TW',
  
  ai: {
    defaultModel: '',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 600, // 🔥 增加到 600 tokens，適合中文小說段落
    contextLength: 4000,
    enableAutoComplete: false,
    autoCompleteDelay: 1000,
    // Ollama 服務預設設定
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaTimeout: 120, // 120 秒
    ollamaRetryAttempts: 3,
    ollamaRetryDelay: 1000, // 1 秒

    // 智能上下文優化預設設定
    intelligentContext: {
      enabled: false,                       // 預設關閉，需要用戶手動啟用
      optimizationLevel: 'advanced',       // 預設高級模式
      preserveDialogue: true,              // 預設保留對話
      maxTokenBudget: 8000,               // 預設8000 Token預算
      plotAnalysisWeight: 0.4,            // 劇情分析權重40%
      statusWeight: 0.3,                  // 章節狀態權重30%
      proximityWeight: 0.3,               // 位置接近權重30%
      enablePerformanceMode: false,       // 預設完整分析模式
    },
  },
  
  editor: {
    theme: 'cosmic',
    fontFamily: '"Noto Sans TC", sans-serif',
    fontSize: 16,
    lineHeight: 1.6,
    showLineNumbers: false,
    wordWrap: true,
    spellCheck: false,
    enableVimMode: false,
  },
  
  ui: {
    sidebarWidth: 280,
    showStatusBar: true,
    animationsEnabled: true,
    soundEnabled: false,
    notificationsEnabled: false,
  },
  
  backup: {
    autoBackup: true,
    backupInterval: 24, // 24 小時
    maxBackupFiles: 10,
    backupLocation: '',
  },
  
  privacy: {
    enableTelemetry: false,
    enableCrashReporting: true,
    enableUsageAnalytics: false,
  },
  
  shortcuts: {
    'save': 'Ctrl+S',
    'newProject': 'Ctrl+N',
    'openProject': 'Ctrl+O',
    'aiContinue': 'Ctrl+Space',
    'toggleSidebar': 'Ctrl+B',
    'toggleFullscreen': 'F11',
    'find': 'Ctrl+F',
    'replace': 'Ctrl+H',
    'undo': 'Ctrl+Z',
    'redo': 'Ctrl+Y',
  },
  
  // 電子書功能預設值
  ebookVirtualNaming: false,              // 預設關閉電子書虛擬檔名功能

  features: {
    extendedIllustrationServices: false,  // 🚫 已禁用 - 功能已遷移至AI Provider管理
    smartApiDetection: false,             // 🚫 已禁用 - 功能已遷移至AI Provider管理
    intelligentContextOptimization: false, // 🚫 預設關閉智能上下文優化
  },
};

// 設定狀態介面
interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
}

// 初始狀態
const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  hasUnsavedChanges: false,
  lastSaved: null,
};

// 設定 slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // 載入設定
    loadSettings: (state, action: PayloadAction<AppSettings>) => {
      const loadedSettings = action.payload;

      // 🛡️ Migration: 確保新增的 intelligentContext 設定存在
      if (!loadedSettings.ai?.intelligentContext) {
        loadedSettings.ai = {
          ...loadedSettings.ai,
          intelligentContext: DEFAULT_SETTINGS.ai.intelligentContext
        };
      }

      // 🔧 Migration (v1.3.5): 強制重置音效和通知預設值為關閉
      if (loadedSettings.ui) {
        loadedSettings.ui = {
          ...loadedSettings.ui,
          soundEnabled: false,
          notificationsEnabled: false,
        };
      }

      state.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
      state.isLoading = false;
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date();
    },
    
    // 更新設定
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    // 更新特定分類的設定
    updateAISettings: (state, action: PayloadAction<Partial<AppSettings['ai']>>) => {
      state.settings.ai = { ...state.settings.ai, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateEditorSettings: (state, action: PayloadAction<Partial<AppSettings['editor']>>) => {
      state.settings.editor = { ...state.settings.editor, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateUISettings: (state, action: PayloadAction<Partial<AppSettings['ui']>>) => {
      state.settings.ui = { ...state.settings.ui, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updateBackupSettings: (state, action: PayloadAction<Partial<AppSettings['backup']>>) => {
      state.settings.backup = { ...state.settings.backup, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    updatePrivacySettings: (state, action: PayloadAction<Partial<AppSettings['privacy']>>) => {
      state.settings.privacy = { ...state.settings.privacy, ...action.payload };
      state.hasUnsavedChanges = true;
    },
    
    // 更新快捷鍵
    updateShortcut: (state, action: PayloadAction<{ key: string; value: string }>) => {
      state.settings.shortcuts[action.payload.key] = action.payload.value;
      state.hasUnsavedChanges = true;
    },
    
    // 重置設定
    resetSettings: (state) => {
      state.settings = DEFAULT_SETTINGS;
      state.hasUnsavedChanges = true;
    },
    
    // 重置特定分類的設定
    resetAISettings: (state) => {
      state.settings.ai = DEFAULT_SETTINGS.ai;
      state.hasUnsavedChanges = true;
    },
    
    resetEditorSettings: (state) => {
      state.settings.editor = DEFAULT_SETTINGS.editor;
      state.hasUnsavedChanges = true;
    },
    
    resetUISettings: (state) => {
      state.settings.ui = DEFAULT_SETTINGS.ui;
      state.hasUnsavedChanges = true;
    },
    
    // 標記設定已儲存
    markSettingsSaved: (state) => {
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date();
    },
    
    // 設定載入狀態
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  loadSettings,
  updateSettings,
  updateAISettings,
  updateEditorSettings,
  updateUISettings,
  updateBackupSettings,
  updatePrivacySettings,
  updateShortcut,
  resetSettings,
  resetAISettings,
  resetEditorSettings,
  resetUISettings,
  markSettingsSaved,
  setLoading,
} = settingsSlice.actions;

export default settingsSlice.reducer;