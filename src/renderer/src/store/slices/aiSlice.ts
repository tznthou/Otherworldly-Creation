import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../api';
import type { AIProvider } from '../../api/models';

interface AIState {
  // Legacy single provider state
  isOllamaConnected: boolean;
  isInitializing: boolean;
  error: string | null;
  generating: boolean;
  generationHistory: GenerationResult[];
  currentModel: string | null;
  availableModels: string[];
  modelSizes: Record<string, number>;
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
    lastChecked: Date | null;
  } | null;
  modelsInfo: {
    success: boolean;
    models: Array<{
      name: string;
      size: number;
      modified_at: string;
    }>;
    error?: string;
  } | null;
  
  // Multi-provider state
  providers: AIProvider[];
  currentProviderId: string | null;
  defaultProviderId: string | null; // 新增：預設提供者ID
  autoUseDefault: boolean;          // 新增：是否自動使用預設提供者
}

interface GenerationResult {
  id: string;
  prompt: string;
  result: string;
  model: string;
  providerId?: string;
  timestamp: Date;
  params: AIParameters;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface AIParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

const initialState: AIState = {
  // Multi-provider support
  providers: [],
  currentProviderId: null,
  defaultProviderId: null,    // 預設提供者
  autoUseDefault: true,        // 自動使用預設提供者
  
  // Legacy Ollama support (for backward compatibility)
  isOllamaConnected: false,
  isInitializing: false,
  serviceStatus: null,
  
  // Model management
  availableModels: [],
  modelsInfo: null,
  currentModel: null,
  modelSizes: {},
  
  // Generation state
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
// Multi-provider async thunks
export const fetchAIProviders = createAsyncThunk(
  'ai/fetchAIProviders',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: 獲取 AI 提供者列表...');
      const response = await api.aiProviders.getAll();
      console.log('Redux: AI 提供者列表結果:', response);
      
      if (response.success && response.providers) {
        return response.providers;
      } else {
        throw new Error(response.error || '獲取提供者失敗');
      }
    } catch (error) {
      console.error('Redux: 獲取 AI 提供者失敗:', error);
      return rejectWithValue([]);
    }
  }
);

export const setActiveProvider = createAsyncThunk(
  'ai/setActiveProvider',
  async (providerId: string, { dispatch: _dispatch, getState: _getState }) => {
    try {
      console.log('Redux: 設定活躍提供者:', providerId);
      
      // 測試提供者連接
      const testResult = await api.aiProviders.test(providerId);
      
      if (testResult.success) {
        // 獲取該提供者的可用模型
        const models = testResult.models || [];
        return {
          providerId,
          models: models.map((model: unknown) => {
            const modelObj = model as Record<string, unknown>;
            const modelId = modelObj.id || modelObj.name || String(model);
            return typeof modelId === 'string' ? modelId : String(modelId);
          }),
          isConnected: true,
        };
      } else {
        throw new Error(testResult.error || '提供者連接失敗');
      }
    } catch (error) {
      console.error('Redux: 設定活躍提供者失敗:', error);
      return {
        providerId,
        models: [],
        isConnected: false,
        error: error instanceof Error ? error.message : '連接失敗',
      };
    }
  }
);

export const generateTextWithProvider = createAsyncThunk(
  'ai/generateTextWithProvider',
  async (params: {
    prompt: string;
    providerId: string;
    model: string;
    projectId: string;
    chapterId: string;
    position?: number;  // 新增：位置參數
    aiParams: AIParameters;
    systemPrompt?: string;
  }) => {
    const result = await api.aiProviders.generateText({
      provider_id: params.providerId,
      model: params.model,
      prompt: params.prompt,
      system_prompt: params.systemPrompt,
      project_id: params.projectId,
      chapter_id: params.chapterId,
      position: params.position,  // 🔥 新增：傳遞位置參數
      temperature: params.aiParams.temperature,
      max_tokens: params.aiParams.maxTokens,
      top_p: params.aiParams.topP,
      presence_penalty: params.aiParams.presencePenalty,
      frequency_penalty: params.aiParams.frequencyPenalty,
    });
    
    return {
      id: Date.now().toString(),
      prompt: params.prompt,
      result: typeof result === 'string' ? result : result.generated_text || '',
      model: params.model,
      providerId: params.providerId,
      timestamp: new Date(),
      params: params.aiParams,
      usage: typeof result === 'object' && result && 'usage' in result ? result.usage as {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      } : undefined,
    };
  }
);;

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // Legacy single model reducers
    setCurrentModel: (state, action: PayloadAction<string>) => {
      state.currentModel = action.payload;
    },
    
    // Multi-provider reducers
    setCurrentProvider: (state, action: PayloadAction<string>) => {
      state.currentProviderId = action.payload;
      // Clear current model when switching providers
      state.currentModel = null;
      state.availableModels = [];
    },
    setProviderModels: (state, action: PayloadAction<{providerId: string; models: string[]}>) => {
      const { providerId, models } = action.payload;
      if (state.currentProviderId === providerId) {
        state.availableModels = models;
        // Auto-select first model if none selected
        if (!state.currentModel && models.length > 0) {
          state.currentModel = models[0];
        }
      }
    },
    
    // 預設提供者管理
    setDefaultProvider: (state, action: PayloadAction<string>) => {
      state.defaultProviderId = action.payload;
      // 如果開啟自動使用預設，立即切換
      if (state.autoUseDefault) {
        state.currentProviderId = action.payload;
        // 清空模型列表，等待重新載入
        state.currentModel = null;
        state.availableModels = [];
      }
    },
    toggleAutoUseDefault: (state) => {
      state.autoUseDefault = !state.autoUseDefault;
      // 如果開啟自動使用且有預設提供者，立即切換
      if (state.autoUseDefault && state.defaultProviderId) {
        state.currentProviderId = state.defaultProviderId;
        state.currentModel = null;
        state.availableModels = [];
      }
    },
    
    // General reducers
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
        const payload = action.payload as { 
          service?: { available?: boolean; version?: string; error?: string };
          models?: { count?: number; list?: string[] };
        };
        state.serviceStatus = {
          service: {
            available: payload.service?.available || false,
            version: payload.service?.version,
            error: payload.service?.error
          },
          models: {
            count: payload.models?.count || 0,
            list: payload.models?.list || []
          },
          lastChecked: new Date()
        };
        state.isOllamaConnected = payload.service?.available || false;
        if (!payload.service?.available) {
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
        interface ModelInfo { name: string; size: number; modified_at: string; }
        const payload = action.payload as { success?: boolean; models?: ModelInfo[]; error?: string } | ModelInfo[];
        
        if (Array.isArray(payload)) {
          // 直接返回模型列表的情況
          state.modelsInfo = {
            success: true,
            models: payload,
            error: undefined
          };
          state.availableModels = payload.map(m => m.name);
          if (!state.currentModel && payload.length > 0) {
            state.currentModel = payload[0].name;
          }
        } else {
          // 返回包含 success 字段的對象
          state.modelsInfo = {
            success: payload.success || true,
            models: payload.models || [],
            error: payload.error
          };
          const models = payload.models || [];
          if (models.length > 0) {
            state.availableModels = models.map(m => m.name);
            if (!state.currentModel) {
              state.currentModel = models[0].name;
            }
          } else {
            state.availableModels = [];
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
        if (!action.payload.isAvailable && state.currentModel === action.payload.modelName) {
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
      })

      // Multi-provider reducers
      // fetchAIProviders
      .addCase(fetchAIProviders.fulfilled, (state, action) => {
        state.providers = action.payload;
        
        // 設定預設提供者（第一個啟用的提供者）
        if (!state.defaultProviderId && action.payload.length > 0) {
          const enabledProvider = action.payload.find(p => p.is_enabled);
          if (enabledProvider) {
            state.defaultProviderId = enabledProvider.id;
            // 如果開啟自動使用預設，也設定為當前提供者
            if (state.autoUseDefault) {
              state.currentProviderId = enabledProvider.id;
            }
          }
        }
        
        // 確保當前提供者有效
        if (!state.currentProviderId && state.defaultProviderId) {
          state.currentProviderId = state.defaultProviderId;
        }
      })
      .addCase(fetchAIProviders.rejected, (state, action) => {
        state.error = action.error.message || '獲取 AI 提供者失敗';
        state.providers = [];
      })

      // setActiveProvider
      .addCase(setActiveProvider.fulfilled, (state, action) => {
        const { providerId, models, isConnected } = action.payload;
        state.currentProviderId = providerId;
        
        if (isConnected && Array.isArray(models)) {
          const modelList = models as string[]; // 明確類型轉換
          state.availableModels = modelList;
          // 智能模型選擇：只在需要時自動選擇
          if (modelList.length > 0) {
            // 如果當前模型在新的模型列表中，保持不變
            if (state.currentModel && modelList.includes(state.currentModel)) {
              // 用戶選擇的模型仍然可用，保持不變
              console.log('Redux: 保持用戶選擇的模型:', state.currentModel);
            } else {
              // 當前模型不在新列表中或沒有選擇模型，選擇第一個
              console.log('Redux: 自動選擇第一個模型:', modelList[0]);
              state.currentModel = modelList[0];
            }
          }
          state.error = null;
        } else {
          state.availableModels = [];
          state.currentModel = null;
          if ('error' in action.payload) {
            state.error = action.payload.error as string;
          }
        }
      })
      .addCase(setActiveProvider.rejected, (state, action) => {
        state.error = action.error.message || '設定提供者失敗';
        state.availableModels = [];
        state.currentModel = null;
      })

      // generateTextWithProvider
      .addCase(generateTextWithProvider.pending, (state) => {
        state.generating = true;
        state.error = null;
      })
      .addCase(generateTextWithProvider.fulfilled, (state, action) => {
        state.generating = false;
        state.generationHistory.unshift(action.payload);
        // 限制歷史記錄數量
        if (state.generationHistory.length > 50) {
          state.generationHistory = state.generationHistory.slice(0, 50);
        }
      })
      .addCase(generateTextWithProvider.rejected, (state, action) => {
        state.generating = false;
        state.error = action.error.message || 'AI 生成失敗';
      });
  },
});

export const {
  setCurrentModel,
  setCurrentProvider,
  setProviderModels,
  setDefaultProvider,
  toggleAutoUseDefault,
  clearError,
  clearGenerationHistory,
  removeGenerationResult,
} = aiSlice.actions;

export default aiSlice.reducer;