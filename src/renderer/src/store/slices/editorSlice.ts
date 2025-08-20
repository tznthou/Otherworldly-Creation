import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  EditorSettings, 
  EditorState, 
  CustomTheme, 
  DEFAULT_EDITOR_SETTINGS,
  THEME_OPTIONS 
} from '../../types/editor';

const initialState: EditorState = {
  settings: DEFAULT_EDITOR_SETTINGS,
  isSettingsOpen: false,
  isReadingMode: false,
  isFocusWritingMode: false,
  currentTheme: THEME_OPTIONS[0], // 預設為宇宙深藍主題
  customThemes: []
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<EditorSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      
      // 如果更新了主題，同時更新當前主題
      if (action.payload.theme) {
        const theme = THEME_OPTIONS.find(t => t.value === action.payload.theme) || THEME_OPTIONS[0];
        state.currentTheme = theme;
        
        // 更新相關顏色設定
        state.settings.backgroundColor = theme.colors.background;
        state.settings.textColor = theme.colors.text;
        state.settings.selectionColor = theme.colors.accent;
      }
    },
    
    toggleSettings: (state) => {
      state.isSettingsOpen = !state.isSettingsOpen;
    },
    
    toggleReadingMode: (state) => {
      state.isReadingMode = !state.isReadingMode;
      state.settings.readingMode = state.isReadingMode;
    },
    
    toggleFocusWritingMode: (state) => {
      state.isFocusWritingMode = !state.isFocusWritingMode;
      // 專注模式時關閉其他模式
      if (state.isFocusWritingMode) {
        state.isReadingMode = false;
        state.isSettingsOpen = false;
      }
    },
    
    setTheme: (state, action: PayloadAction<string>) => {
      const theme = THEME_OPTIONS.find(t => t.value === action.payload) || THEME_OPTIONS[0];
      state.currentTheme = theme;
      state.settings.theme = action.payload as 'cosmic' | 'light' | 'dark' | 'sepia';
      
      // 更新相關顏色設定
      state.settings.backgroundColor = theme.colors.background;
      state.settings.textColor = theme.colors.text;
      state.settings.selectionColor = theme.colors.accent;
    },
    
    addCustomTheme: (state, action: PayloadAction<CustomTheme>) => {
      state.customThemes.push(action.payload);
    },
    
    removeCustomTheme: (state, action: PayloadAction<string>) => {
      state.customThemes = state.customThemes.filter(theme => theme.name !== action.payload);
    },
    
    resetSettings: (state) => {
      state.settings = DEFAULT_EDITOR_SETTINGS;
      state.currentTheme = THEME_OPTIONS[0];
      state.isReadingMode = false;
    },
    
    // 字體設定
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.settings.fontFamily = action.payload;
    },
    
    setFontSize: (state, action: PayloadAction<number>) => {
      state.settings.fontSize = Math.max(12, Math.min(32, action.payload));
    },
    
    setFontWeight: (state, action: PayloadAction<EditorSettings['fontWeight']>) => {
      state.settings.fontWeight = action.payload;
    },
    
    // 排版設定
    setLineHeight: (state, action: PayloadAction<number>) => {
      state.settings.lineHeight = Math.max(1.0, Math.min(3.0, action.payload));
    },
    
    setLetterSpacing: (state, action: PayloadAction<number>) => {
      state.settings.letterSpacing = Math.max(-2, Math.min(5, action.payload));
    },
    
    setParagraphSpacing: (state, action: PayloadAction<number>) => {
      state.settings.paragraphSpacing = Math.max(0, Math.min(50, action.payload));
    },
    
    setTextAlign: (state, action: PayloadAction<EditorSettings['textAlign']>) => {
      state.settings.textAlign = action.payload;
    },
    
    // 閱讀模式設定
    setReadingModeWidth: (state, action: PayloadAction<number>) => {
      state.settings.readingModeWidth = Math.max(600, Math.min(1200, action.payload));
    },
    
    setReadingModeOpacity: (state, action: PayloadAction<number>) => {
      state.settings.readingModeOpacity = Math.max(0.5, Math.min(1.0, action.payload));
    },
    
    // 編輯器行為設定
    toggleAutoSave: (state) => {
      state.settings.autoSave = !state.settings.autoSave;
    },
    
    setAutoSaveInterval: (state, action: PayloadAction<number>) => {
      state.settings.autoSaveInterval = Math.max(1000, Math.min(30000, action.payload));
    },
    
    toggleSpellCheck: (state) => {
      state.settings.spellCheck = !state.settings.spellCheck;
    },
    
    toggleWordWrap: (state) => {
      state.settings.wordWrap = !state.settings.wordWrap;
    },
    
    toggleLineNumbers: (state) => {
      state.settings.showLineNumbers = !state.settings.showLineNumbers;
    }
  }
});

export const {
  updateSettings,
  toggleSettings,
  toggleReadingMode,
  toggleFocusWritingMode,
  setTheme,
  addCustomTheme,
  removeCustomTheme,
  resetSettings,
  setFontFamily,
  setFontSize,
  setFontWeight,
  setLineHeight,
  setLetterSpacing,
  setParagraphSpacing,
  setTextAlign,
  setReadingModeWidth,
  setReadingModeOpacity,
  toggleAutoSave,
  setAutoSaveInterval,
  toggleSpellCheck,
  toggleWordWrap,
  toggleLineNumbers
} = editorSlice.actions;

export default editorSlice.reducer;

// Selectors
export const selectEditorSettings = (state: { editor: EditorState }) => state.editor.settings;
export const selectIsSettingsOpen = (state: { editor: EditorState }) => state.editor.isSettingsOpen;
export const selectIsReadingMode = (state: { editor: EditorState }) => state.editor.isReadingMode;
export const selectIsFocusWritingMode = (state: { editor: EditorState }) => state.editor.isFocusWritingMode;
export const selectCurrentTheme = (state: { editor: EditorState }) => state.editor.currentTheme;
export const selectCustomThemes = (state: { editor: EditorState }) => state.editor.customThemes;