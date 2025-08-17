import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditorStats } from '../../components/Layout/StatusBar';

interface EditorStatsState {
  stats: EditorStats | null;
  currentChapterTitle?: string;
  isActive: boolean; // 是否在編輯器頁面
}

const initialState: EditorStatsState = {
  stats: null,
  currentChapterTitle: undefined,
  isActive: false
};

const editorStatsSlice = createSlice({
  name: 'editorStats',
  initialState,
  reducers: {
    updateEditorStats: (state, action: PayloadAction<EditorStats>) => {
      state.stats = action.payload;
    },
    
    setCurrentChapterTitle: (state, action: PayloadAction<string | undefined>) => {
      state.currentChapterTitle = action.payload;
    },
    
    setEditorActive: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload;
      if (!action.payload) {
        // 離開編輯器頁面時清空統計
        state.stats = null;
        state.currentChapterTitle = undefined;
      }
    },
    
    clearEditorStats: (state) => {
      state.stats = null;
      state.currentChapterTitle = undefined;
    }
  }
});

export const {
  updateEditorStats,
  setCurrentChapterTitle,
  setEditorActive,
  clearEditorStats
} = editorStatsSlice.actions;

export default editorStatsSlice.reducer;