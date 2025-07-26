import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

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
  async () => {
    const isConnected = await window.electronAPI.ai.checkOllamaService();
    return isConnected;
  }
);

export const fetchServiceStatus = createAsyncThunk(
  'ai/fetchServiceStatus',
  async () => {
    const status = await window.electronAPI.ai.getServiceStatus();
    return status;
  }
);

export const fetchAvailableModels = createAsyncThunk(
  'ai/fetchAvailableModels',
  async () => {
    const models = await window.electronAPI.ai.listModels();
    return models;
  }
);

export const fetchModelsInfo = createAsyncThunk(
  'ai/fetchModelsInfo',
  async () => {
    const modelsInfo = await window.electronAPI.ai.getModelsInfo();
    return modelsInfo;
  }
);

export const checkModelAvailability = createAsyncThunk(
  'ai/checkModelAvailability',
  async (modelName: string) => {
    const result = await window.electronAPI.ai.checkModelAvailability(modelName);
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
    const result = await window.electronAPI.ai.generateText(
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

      // fetchServiceStatus
      .addCase(fetchServiceStatus.fulfilled, (state, action) => {
        state.serviceStatus = action.payload;
        state.isOllamaConnected = action.payload.service.available;
        if (!action.payload.service.available) {
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
        if (action.payload.success) {
          state.availableModels = action.payload.models.map(m => m.name);
          // 如果沒有選擇模型且有可用模型，選擇第一個
          if (!state.currentModel && action.payload.models.length > 0) {
            state.currentModel = action.payload.models[0].name;
          }
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