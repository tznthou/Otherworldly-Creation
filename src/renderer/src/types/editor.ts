// 編輯器設定相關類型定義

export interface EditorSettings {
  // 字體設定
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  
  // 排版設定
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  
  // 顏色設定
  textColor: string;
  backgroundColor: string;
  selectionColor: string;
  
  // 閱讀模式設定
  readingMode: boolean;
  readingModeWidth: number;
  readingModeOpacity: number;
  
  // 編輯器行為設定
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  wordWrap: boolean;
  showLineNumbers: boolean;
  
  // 主題設定
  theme: 'cosmic' | 'light' | 'dark' | 'sepia';
  customTheme?: CustomTheme;
}

export interface CustomTheme {
  name: string;
  colors: {
    background: string;
    text: string;
    accent: string;
    border: string;
    selection: string;
  };
}

export interface FontOption {
  name: string;
  value: string;
  category: 'serif' | 'sans-serif' | 'monospace' | 'chinese';
  preview: string;
}

export interface ThemeOption {
  name: string;
  value: string;
  colors: {
    background: string;
    text: string;
    accent: string;
  };
  preview: string;
}

// 預設字體選項
export const FONT_OPTIONS: FontOption[] = [
  {
    name: '思源黑體',
    value: '"Noto Sans TC", sans-serif',
    category: 'chinese',
    preview: '中文輕小說創作的理想選擇'
  },
  {
    name: '思源宋體',
    value: '"Noto Serif TC", serif',
    category: 'chinese',
    preview: '傳統閱讀體驗，適合長篇閱讀'
  },
  {
    name: 'Inter',
    value: 'Inter, sans-serif',
    category: 'sans-serif',
    preview: 'Modern and clean typeface'
  },
  {
    name: 'Georgia',
    value: 'Georgia, serif',
    category: 'serif',
    preview: 'Classic serif font for reading'
  },
  {
    name: 'JetBrains Mono',
    value: '"JetBrains Mono", monospace',
    category: 'monospace',
    preview: 'Monospace font for code'
  },
  {
    name: 'Orbitron',
    value: 'Orbitron, sans-serif',
    category: 'sans-serif',
    preview: 'Futuristic sci-fi style'
  }
];

// 預設主題選項
export const THEME_OPTIONS: ThemeOption[] = [
  {
    name: '宇宙深藍',
    value: 'cosmic',
    colors: {
      background: '#0A1128',
      text: '#FFFFFF',
      accent: '#FFD700'
    },
    preview: '深邃星空，金色點綴'
  },
  {
    name: '純淨白色',
    value: 'light',
    colors: {
      background: '#FFFFFF',
      text: '#1F2937',
      accent: '#3B82F6'
    },
    preview: '簡潔明亮，護眼舒適'
  },
  {
    name: '經典黑色',
    value: 'dark',
    colors: {
      background: '#1F2937',
      text: '#F9FAFB',
      accent: '#10B981'
    },
    preview: '經典暗色，減少眼疲勞'
  },
  {
    name: '復古棕褐',
    value: 'sepia',
    colors: {
      background: '#F7F3E9',
      text: '#5D4E37',
      accent: '#8B4513'
    },
    preview: '復古紙張質感，溫暖護眼'
  }
];

// 預設編輯器設定
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  // 字體設定
  fontFamily: '"Noto Sans TC", sans-serif',
  fontSize: 16,
  fontWeight: 'normal',
  
  // 排版設定
  lineHeight: 1.6,
  letterSpacing: 0,
  paragraphSpacing: 16,
  textAlign: 'left',
  
  // 顏色設定
  textColor: '#FFFFFF',
  backgroundColor: '#0A1128',
  selectionColor: '#FFD700',
  
  // 閱讀模式設定
  readingMode: false,
  readingModeWidth: 800,
  readingModeOpacity: 0.9,
  
  // 編輯器行為設定
  autoSave: true,
  autoSaveInterval: 3000,
  spellCheck: false,
  wordWrap: true,
  showLineNumbers: false,
  
  // 主題設定
  theme: 'cosmic'
};

// 編輯器狀態
export interface EditorState {
  settings: EditorSettings;
  isSettingsOpen: boolean;
  isReadingMode: boolean;
  currentTheme: ThemeOption;
  customThemes: CustomTheme[];
}

// 編輯器動作類型
export type EditorAction = 
  | { type: 'UPDATE_SETTINGS'; payload: Partial<EditorSettings> }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'TOGGLE_READING_MODE' }
  | { type: 'SET_THEME'; payload: string }
  | { type: 'ADD_CUSTOM_THEME'; payload: CustomTheme }
  | { type: 'REMOVE_CUSTOM_THEME'; payload: string }
  | { type: 'RESET_SETTINGS' };