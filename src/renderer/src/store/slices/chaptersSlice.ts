import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Descendant } from 'slate';
import { api } from '../../api';
import { Chapter } from '../../api/models';

interface ChaptersState {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSaved: string | null;
}

const initialState: ChaptersState = {
  chapters: [],
  currentChapter: null,
  loading: false,
  saving: false,
  error: null,
  lastSaved: null,
};

// 異步 thunks
// 重新導出 Chapter 類型供其他組件使用
export type { Chapter } from '../../api/models';
export const fetchChaptersByProjectId = createAsyncThunk(
  'chapters/fetchByProjectId',
  async (projectId: string) => {
    console.log('🔍 [chaptersSlice] 開始載入專案章節:', projectId);
    
    const chapters = await api.chapters.getByProjectId(projectId);
    
    // 詳細記錄每個章節的數據
    console.log('🔍 [chaptersSlice] API 返回的章節數量:', chapters.length);
    chapters.forEach((chapter, index) => {
      console.log(`🔍 [chaptersSlice] 章節 ${index + 1}:`, {
        id: chapter.id,
        title: chapter.title,
        contentType: typeof chapter.content,
        contentLength: Array.isArray(chapter.content) ? chapter.content.length : 'not array',
        contentPreview: Array.isArray(chapter.content) && chapter.content.length > 0 
          ? JSON.stringify(chapter.content[0]).substring(0, 100) + '...'
          : 'empty or invalid',
        order: chapter.order,
        chapterNumber: chapter.chapterNumber
      });
    });
    
    // 檢查是否有重複內容
    const contentHashes = chapters.map(c => JSON.stringify(c.content));
    const uniqueContents = new Set(contentHashes);
    console.log('🔍 [chaptersSlice] 內容唯一性檢查:', {
      總章節數: chapters.length,
      唯一內容數: uniqueContents.size,
      是否有重複: chapters.length !== uniqueContents.size
    });
    
    return chapters;
  }
);;

export const createChapter = createAsyncThunk(
  'chapters/create',
  async (chapterData: {
    projectId: string;
    title: string;
    content?: Descendant[];
    order?: number;
  }) => {
    const chapterId = await api.chapters.create({
      ...chapterData,
      content: chapterData.content || [{ type: 'paragraph', children: [{ text: '' }] }],
      order: chapterData.order ?? 0,
    });
    const chapter = await api.chapters.getById(chapterId);
    return chapter;
  }
);

export const updateChapter = createAsyncThunk(
  'chapters/update',
  async (chapter: Chapter) => {
    await api.chapters.update(chapter);
    // API 層會處理序列化，這裡直接返回原始的 chapter 物件
    console.log('更新章節:', {
      id: chapter.id,
      title: chapter.title,
      contentType: typeof chapter.content
    });
    
    return chapter;
  }
);

export const deleteChapter = createAsyncThunk(
  'chapters/delete',
  async (chapterId: string) => {
    await api.chapters.delete(chapterId);
    return chapterId;
  }
);

export const fetchChapterById = createAsyncThunk(
  'chapters/fetchById',
  async (chapterId: string) => {
    const chapter = await api.chapters.getById(chapterId);
    // API 層已經處理了資料轉換，直接返回
    console.log('載入單一章節:', {
      id: chapter.id,
      title: chapter.title,
      contentType: typeof chapter.content,
      contentLength: Array.isArray(chapter.content) ? chapter.content.length : 'not array'
    });
    
    return {
      ...chapter,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
    };
  }
);

const chaptersSlice = createSlice({
  name: 'chapters',
  initialState,
  reducers: {
    setCurrentChapter: (state, action: PayloadAction<Chapter | null>) => {
      console.log('🔍 [Redux] setCurrentChapter reducer 被調用');
      console.log('🔍 [Redux] 之前的 currentChapter:', state.currentChapter ? {
        id: state.currentChapter.id,
        title: state.currentChapter.title,
        contentType: typeof state.currentChapter.content,
        contentLength: Array.isArray(state.currentChapter.content) ? state.currentChapter.content.length : 'not array'
      } : 'null');
      
      console.log('🔍 [Redux] 新的 currentChapter payload:', action.payload ? {
        id: action.payload.id,
        title: action.payload.title,
        contentType: typeof action.payload.content,
        contentLength: Array.isArray(action.payload.content) ? action.payload.content.length : 'not array',
        contentPreview: Array.isArray(action.payload.content) && action.payload.content.length > 0
          ? JSON.stringify(action.payload.content[0]).substring(0, 100) + '...'
          : 'empty or invalid'
      } : 'null');
      
      state.currentChapter = action.payload;
      console.log('🔍 [Redux] currentChapter 已更新');
    },
    updateCurrentChapterContent: (state, action: PayloadAction<Descendant[]>) => {
      if (state.currentChapter) {
        state.currentChapter.content = action.payload;
        // 計算字數
        const newWordCount = calculateWordCount(action.payload);
        state.currentChapter.wordCount = newWordCount;
        
        // 🔥 修復：同步更新 chapters 數組中對應章節的 wordCount
        const chapterIndex = state.chapters.findIndex(c => c.id === state.currentChapter?.id);
        if (chapterIndex !== -1) {
          state.chapters[chapterIndex].wordCount = newWordCount;
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
    },
    setLastSaved: (state, action: PayloadAction<string>) => {
      state.lastSaved = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchChaptersByProjectId
      .addCase(fetchChaptersByProjectId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChaptersByProjectId.fulfilled, (state, action) => {
        state.loading = false;
        // 🔥 修復：載入章節時重新計算所有章節的字數
        state.chapters = action.payload.map(chapter => ({
          ...chapter,
          wordCount: calculateWordCount(chapter.content)
        }));
      })
      .addCase(fetchChaptersByProjectId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '獲取章節列表失敗';
      })
      
      // createChapter
      .addCase(createChapter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChapter.fulfilled, (state, action) => {
        state.loading = false;
        // 🔥 修復：新建章節時也要重新計算字數
        const newChapter = {
          ...action.payload,
          wordCount: calculateWordCount(action.payload.content)
        };
        state.chapters.push(newChapter);
        // 自動選擇新創建的章節
        state.currentChapter = newChapter;
      })
      .addCase(createChapter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '創建章節失敗';
      })
      
      // updateChapter
      .addCase(updateChapter.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateChapter.fulfilled, (state, action) => {
        state.saving = false;
        state.lastSaved = new Date().toISOString();
        // 🔥 修復：保存章節後也要重新計算字數
        const updatedChapter = {
          ...action.payload,
          wordCount: calculateWordCount(action.payload.content)
        };
        const index = state.chapters.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.chapters[index] = updatedChapter;
        }
        if (state.currentChapter?.id === action.payload.id) {
          state.currentChapter = updatedChapter;
        }
      })
      .addCase(updateChapter.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || '儲存章節失敗';
      })
      
      // deleteChapter
      .addCase(deleteChapter.fulfilled, (state, action) => {
        state.chapters = state.chapters.filter(c => c.id !== action.payload);
        if (state.currentChapter?.id === action.payload) {
          state.currentChapter = null;
        }
      })
      
      // fetchChapterById
      .addCase(fetchChapterById.fulfilled, (state, action) => {
        // 🔥 修復：載入單個章節時也要重新計算字數
        const chapterWithWordCount = {
          ...action.payload,
          wordCount: calculateWordCount(action.payload.content)
        };
        state.currentChapter = chapterWithWordCount;
      });
  },
});

// 輔助函數：計算字數
const calculateWordCount = (content: Descendant[]): number => {
  const getText = (nodes: Descendant[]): string => {
    return nodes
      .map(node => {
        if ('text' in node) {
          return node.text;
        } else if ('children' in node) {
          return getText(node.children);
        }
        return '';
      })
      .join('');
  };

  const text = getText(content);
  // 中文字符計算
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  // 英文單詞計算
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  
  return chineseChars.length + englishWords.length;
};

export const {
  setCurrentChapter,
  updateCurrentChapterContent,
  clearError,
  setSaving,
  setLastSaved,
} = chaptersSlice.actions;

export default chaptersSlice.reducer;