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
  lastSaved: Date | null;
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
export const fetchChaptersByProjectId = createAsyncThunk(
  'chapters/fetchByProjectId',
  async (projectId: string) => {
    const chapters = await api.chapters.getByProjectId(projectId);
    return chapters;
  }
);

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
    return {
      ...chapter,
      content: chapter.content || [{ type: 'paragraph', children: [{ text: '' }] }],
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
      state.currentChapter = action.payload;
    },
    updateCurrentChapterContent: (state, action: PayloadAction<Descendant[]>) => {
      if (state.currentChapter) {
        state.currentChapter.content = action.payload;
        // 計算字數
        state.currentChapter.wordCount = calculateWordCount(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
    },
    setLastSaved: (state, action: PayloadAction<Date>) => {
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
        state.chapters = action.payload;
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
        state.chapters.push(action.payload);
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
        state.lastSaved = new Date();
        const index = state.chapters.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.chapters[index] = action.payload;
        }
        if (state.currentChapter?.id === action.payload.id) {
          state.currentChapter = action.payload;
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
        state.currentChapter = action.payload;
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