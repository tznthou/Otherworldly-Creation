import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';
import { AIGenerationParams } from '../../api/models';

// AI 歷史記錄類型定義
export interface AIGenerationHistory {
  id: string;
  projectId: string;
  chapterId: string;
  model: string;
  prompt: string;
  generatedText: string;
  parameters?: AIGenerationParams;
  languagePurity?: number;
  tokenCount?: number;
  generationTimeMs?: number;
  selected: boolean;
  position?: number;
  createdAt: Date;
}

// AI 歷史記錄狀態
export interface AIHistoryState {
  histories: AIGenerationHistory[];
  currentProjectHistories: AIGenerationHistory[];
  selectedHistory: AIGenerationHistory | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
  };
}

// 初始狀態
const initialState: AIHistoryState = {
  histories: [],
  currentProjectHistories: [],
  selectedHistory: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  pagination: {
    page: 1,
    pageSize: 20,
  },
};

// 異步 thunks
export const createAIHistory = createAsyncThunk(
  'aiHistory/create',
  async (history: Omit<AIGenerationHistory, 'id' | 'createdAt' | 'selected'>) => {
    const result = await api.aiHistory.create(history);
    return result;
  }
);

export const queryAIHistory = createAsyncThunk(
  'aiHistory/query',
  async (params: {
    projectId?: string;
    chapterId?: string;
    selectedOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const results = await api.aiHistory.query(params);
    return results;
  }
);

export const markHistorySelected = createAsyncThunk(
  'aiHistory/markSelected',
  async ({ historyId, projectId }: { historyId: string; projectId: string }) => {
    await api.aiHistory.markSelected(historyId, projectId);
    return { historyId, projectId };
  }
);

export const deleteAIHistory = createAsyncThunk(
  'aiHistory/delete',
  async (historyId: string) => {
    await api.aiHistory.delete(historyId);
    return historyId;
  }
);

export const cleanupAIHistory = createAsyncThunk(
  'aiHistory/cleanup',
  async ({ projectId, keepCount }: { projectId: string; keepCount: number }) => {
    const deletedCount = await api.aiHistory.cleanup(projectId, keepCount);
    return { projectId, deletedCount };
  }
);

// Slice
const aiHistorySlice = createSlice({
  name: 'aiHistory',
  initialState,
  reducers: {
    setCurrentProjectHistories: (state, action: PayloadAction<AIGenerationHistory[]>) => {
      state.currentProjectHistories = action.payload;
    },
    setSelectedHistory: (state, action: PayloadAction<AIGenerationHistory | null>) => {
      state.selectedHistory = action.payload;
    },
    setPagination: (state, action: PayloadAction<{ page?: number; pageSize?: number }>) => {
      if (action.payload.page !== undefined) {
        state.pagination.page = action.payload.page;
      }
      if (action.payload.pageSize !== undefined) {
        state.pagination.pageSize = action.payload.pageSize;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // 創建歷史記錄
    builder
      .addCase(createAIHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAIHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.histories.unshift(action.payload);
        if (action.payload.projectId === state.currentProjectHistories[0]?.projectId) {
          state.currentProjectHistories.unshift(action.payload);
        }
      })
      .addCase(createAIHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '創建 AI 歷史記錄失敗';
      });

    // 查詢歷史記錄
    builder
      .addCase(queryAIHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(queryAIHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.histories = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(queryAIHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || '查詢 AI 歷史記錄失敗';
      });

    // 標記選擇
    builder
      .addCase(markHistorySelected.pending, (state) => {
        state.error = null;
      })
      .addCase(markHistorySelected.fulfilled, (state, action) => {
        const { historyId, projectId } = action.payload;
        // 更新所有該專案的歷史記錄
        state.histories.forEach((history) => {
          if (history.projectId === projectId) {
            history.selected = history.id === historyId;
          }
        });
        state.currentProjectHistories.forEach((history) => {
          if (history.projectId === projectId) {
            history.selected = history.id === historyId;
          }
        });
        // 更新選中的歷史記錄
        const selected = state.histories.find((h) => h.id === historyId);
        if (selected) {
          state.selectedHistory = selected;
        }
      })
      .addCase(markHistorySelected.rejected, (state, action) => {
        state.error = action.error.message || '標記歷史記錄失敗';
      });

    // 刪除歷史記錄
    builder
      .addCase(deleteAIHistory.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteAIHistory.fulfilled, (state, action) => {
        const historyId = action.payload;
        state.histories = state.histories.filter((h) => h.id !== historyId);
        state.currentProjectHistories = state.currentProjectHistories.filter(
          (h) => h.id !== historyId
        );
        if (state.selectedHistory?.id === historyId) {
          state.selectedHistory = null;
        }
      })
      .addCase(deleteAIHistory.rejected, (state, action) => {
        state.error = action.error.message || '刪除歷史記錄失敗';
      });

    // 清理歷史記錄
    builder
      .addCase(cleanupAIHistory.pending, (state) => {
        state.error = null;
      })
      .addCase(cleanupAIHistory.fulfilled, (state, _action) => {
        // 清理完成後，可能需要重新查詢
        state.error = null;
      })
      .addCase(cleanupAIHistory.rejected, (state, action) => {
        state.error = action.error.message || '清理歷史記錄失敗';
      });
  },
});

// 導出 actions 和 reducer
export const {
  setCurrentProjectHistories,
  setSelectedHistory,
  setPagination,
  clearError,
} = aiHistorySlice.actions;

export default aiHistorySlice.reducer;