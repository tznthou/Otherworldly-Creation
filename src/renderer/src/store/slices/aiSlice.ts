import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';

interface AIState {
  isOllamaConnected: boolean;
  serviceStatus: {
    service: {
      available: boolean;
      version?: string;
      error?: string;
    };
    models: {
      count: number;
      list: string[];
    };
    lastChecked?: Date;
  } | null;
  availableModels: string[];
  modelsInfo: {
    success: boolean;
    models: Array<{
      name: string;
      size: number;
      modified_at: string;
    }>;
    error?: string;
  } | null;
  currentModel: string | null;
  generating: boolean;
  error: string | null;
  generationHistory: GenerationResult[];
}

interface GenerationResult {
  id: string;
  prompt: string;
  result: string;
  model: string;
  timestamp: Date;
  params: AIParameters;
}

interface AIParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
}

const initialState: AIState = {
  isOllamaConnected: false,
  serviceStatus: null,
  availableModels: [],
  modelsInfo: null,
  currentModel: null,
  generating: false,
  error: null,
  generationHistory: [],
};

// 異步 thunks
export const checkOllamaService = createAsyncThunk(
  'ai/checkOllamaService',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: 檢查 Ollama 服務...');
      console.log('Redux: API 對象:', api);
      console.log('Redux: AI API:', api.ai);
      
      const isConnected = await api.ai.checkOllamaService();
      console.log('Redux: Ollama 服務結果:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('Redux: 檢查 Ollama 服務失敗:', error);
      console.error('Redux: 錯誤詳情:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return rejectWithValue(false);
    }
  }
);

// 延遲初始化 AI 服務（背景執行，不阻塞 UI）
export const initializeAIServiceLazy = createAsyncThunk(
  'ai/initializeAIServiceLazy',
  async (_, { dispatch }) => {
    try {
      console.log('Redux: 開始延遲 AI 服務初始化...');
      
      // 先快速檢查 Ollama 服務
      const isConnected = await dispatch(checkOllamaService()).unwrap();
      
      if (isConnected) {
        // 如果連接成功，背景載入模型列表
        console.log('Redux: Ollama 已連接，載入模型列表...');
        await dispatch(fetchModelsInfo());
      }
      
      return isConnected;
    } catch (error) {
      console.warn('Redux: 延遲 AI 初始化失敗:', error);
      // 不返回錯誤，允許應用程式繼續運行
      return false;
    }
  }
);

export const fetchServiceStatus = createAsyncThunk(
  'ai/fetchServiceStatus',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: 獲取服務狀態...');
      const status = await api.ai.getServiceStatus();
      console.log('Redux: 服務狀態結果:', status);
      return status;
    } catch (error) {
      console.error('Redux: 獲取服務狀態失敗:', error);
      return rejectWithValue(null);
    }
  }
);

export const fetchAvailableModels = createAsyncThunk(
  'ai/fetchAvailableModels',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: 獲取可用模型...');
      const models = await api.ai.listModels();
      console.log('Redux: 可用模型結果:', models);
      return models;
    } catch (error) {
      console.error('Redux: 獲取可用模型失敗:', error);
      return rejectWithValue([]);
    }
  }
);

export const fetchModelsInfo = createAsyncThunk(
  'ai/fetchModelsInfo',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: 獲取模型詳細資訊...');
      const modelsInfo = await api.ai.getModelsInfo();
      console.log('Redux: 模型詳細資訊結果:', modelsInfo);
      return modelsInfo;
    } catch (error) {
      console.error('Redux: 獲取模型詳細資訊失敗:', error);
      return rejectWithValue(null);
    }
  }
);

export const checkModelAvailability = createAsyncThunk(
  'ai/checkModelAvailability',
  async (modelName: string) => {
    const result = await api.ai.checkModelAvailability(modelName);
    return { modelName, ...result };
  }
);

export const generateText = createAsyncThunk(
  'ai/generateText',
  async (params: {
    prompt: string;
    model: string;
    aiParams: AIParameters;
  }) => {
    const result = await api.ai.generateText(
      params.prompt,
      params.model,
      params.aiParams
    );
    
    return {
      id: Date.now().toString(),
      prompt: params.prompt,
      result,
      model: params.model,
      timestamp: new Date(),
      params: params.aiParams,
    };
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setCurrentModel: (state, action: PayloadAction<string>) => {
      state.currentModel = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearGenerationHistory: (state) => {
      state.generationHistory = [];
    },
    removeGenerationResult: (state, action: PayloadAction<string>) => {
      state.generationHistory = state.generationHistory.filter(
        result => result.id !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // checkOllamaService
      .addCase(checkOllamaService.fulfilled, (state, action) => {
        state.isOllamaConnected = action.payload;
        if (!action.payload) {
          state.availableModels = [];
          state.currentModel = null;
        }
      })
      .addCase(checkOllamaService.rejected, (state) => {
        state.isOllamaConnected = false;
        state.availableModels = [];
        state.currentModel = null;
      })

      // initializeAIServiceLazy
      .addCase(initializeAIServiceLazy.fulfilled, (state, action) => {
        state.isOllamaConnected = action.payload;
        if (!action.payload) {
          state.availableModels = [];
          state.currentModel = null;
        }
      })
      .addCase(initializeAIServiceLazy.rejected, (state) => {
        // 延遲初始化失敗不影響應用程式運行
        state.isOllamaConnected = false;
      })

      // fetchServiceStatus
      .addCase(fetchServiceStatus.fulfilled, (state, action) => {
        state.serviceStatus = action.payload;
        if (action.payload && action.payload.service) {
          state.isOllamaConnected = action.payload.service.available;
          if (!action.payload.service.available) {
            state.availableModels = [];
            state.currentModel = null;
          }
        } else {
          state.isOllamaConnected = false;
          state.availableModels = [];
          state.currentModel = null;
        }
      })
      .addCase(fetchServiceStatus.rejected, (state, action) => {
        state.error = action.error.message || '獲取服務狀態失敗';
        state.isOllamaConnected = false;
      })
      
      // fetchAvailableModels
      .addCase(fetchAvailableModels.fulfilled, (state, action) => {
        state.availableModels = action.payload;
        // 如果沒有選擇模型且有可用模型，選擇第一個
        if (!state.currentModel && action.payload.length > 0) {
          state.currentModel = action.payload[0];
        }
      })
      .addCase(fetchAvailableModels.rejected, (state, action) => {
        state.error = action.error.message || '獲取模型列表失敗';
        state.availableModels = [];
      })

      // fetchModelsInfo
      .addCase(fetchModelsInfo.fulfilled, (state, action) => {
        state.modelsInfo = action.payload;
        if (action.payload && action.payload.success) {
          state.availableModels = action.payload.models.map((m: { name: string; size: number; modified_at: string }) => m.name);
          // 如果沒有選擇模型且有可用模型，選擇第一個
          if (!state.currentModel && action.payload.models.length > 0) {
            state.currentModel = action.payload.models[0].name;
          }
        } else {
          state.availableModels = [];
        }
      })
      .addCase(fetchModelsInfo.rejected, (state, action) => {
        state.error = action.error.message || '獲取模型資訊失敗';
        state.modelsInfo = null;
      })

      // checkModelAvailability
      .addCase(checkModelAvailability.fulfilled, (state, action) => {
        // 可以在這裡處理特定模型的可用性狀態
        if (!action.payload.available && state.currentModel === action.payload.modelName) {
          state.currentModel = null;
        }
      })
      
      // generateText
      .addCase(generateText.pending, (state) => {
        state.generating = true;
        state.error = null;
      })
      .addCase(generateText.fulfilled, (state, action) => {
        state.generating = false;
        state.generationHistory.unshift(action.payload);
        // 限制歷史記錄數量
        if (state.generationHistory.length > 50) {
          state.generationHistory = state.generationHistory.slice(0, 50);
        }
      })
      .addCase(generateText.rejected, (state, action) => {
        state.generating = false;
        state.error = action.error.message || 'AI 生成失敗';
      });
  },
});

export const {
  setCurrentModel,
  clearError,
  clearGenerationHistory,
  removeGenerationResult,
} = aiSlice.actions;

export default aiSlice.reducer;