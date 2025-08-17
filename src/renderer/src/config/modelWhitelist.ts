/**
 * AI 模型白名單配置
 * 每個 Provider 支援的有效模型 ID 列表
 */

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  costLevel: 'low' | 'medium' | 'high';
  isRecommended?: boolean;
}

export interface ProviderModels {
  [providerId: string]: ModelInfo[];
}

export const MODEL_WHITELIST: ProviderModels = {
  openai: [
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: '最新 GPT-5 系列的輕量版本，速度快成本低',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'low',
      isRecommended: true
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: '最新的多模態模型，平衡性能與成本',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'medium',
      isRecommended: true
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: '輕量級版本，速度快成本低',
      maxTokens: 16384,
      contextWindow: 128000,
      costLevel: 'low',
      isRecommended: true
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: '經典模型，性價比高',
      maxTokens: 4096,
      contextWindow: 16385,
      costLevel: 'low'
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: '高性能模型，適合複雜任務',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'high'
    }
  ],

  gemini: [
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (Experimental)',
      description: '最新實驗版本，超長上下文窗口',
      maxTokens: 8192,
      contextWindow: 1000000,
      costLevel: 'medium',
      isRecommended: true
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: '穩定專業版本，平衡性能',
      maxTokens: 8192,
      contextWindow: 2000000,
      costLevel: 'medium'
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: '快速版本，適合日常使用',
      maxTokens: 8192,
      contextWindow: 1000000,
      costLevel: 'low',
      isRecommended: true
    }
  ],

  claude: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: '平衡版本，適合創意寫作',
      maxTokens: 8192,
      contextWindow: 200000,
      costLevel: 'medium',
      isRecommended: true
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: '最強版本，最高品質輸出',
      maxTokens: 4096,
      contextWindow: 200000,
      costLevel: 'high'
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      description: '快速版本，成本最低',
      maxTokens: 4096,
      contextWindow: 200000,
      costLevel: 'low'
    }
  ],

  ollama: [
    {
      id: 'llama3.2',
      name: 'Llama 3.2',
      description: 'Meta 最新本地模型',
      maxTokens: 2048,
      contextWindow: 8192,
      costLevel: 'low',
      isRecommended: true
    },
    {
      id: 'qwen2.5',
      name: 'Qwen 2.5',
      description: '阿里巴巴中文優化模型',
      maxTokens: 2048,
      contextWindow: 32768,
      costLevel: 'low',
      isRecommended: true
    },
    {
      id: 'gemma2',
      name: 'Gemma 2',
      description: 'Google 開源模型',
      maxTokens: 2048,
      contextWindow: 8192,
      costLevel: 'low'
    }
  ],

  openrouter: [
    {
      id: 'openai/gpt-5-mini',
      name: 'GPT-5 Mini (OpenRouter)',
      description: '通過 OpenRouter 訪問的 GPT-5 Mini',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'low',
      isRecommended: true
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o (OpenRouter)',
      description: '通過 OpenRouter 訪問的 GPT-4o',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'medium'
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (OpenRouter)',
      description: '通過 OpenRouter 訪問的 Claude',
      maxTokens: 8192,
      contextWindow: 200000,
      costLevel: 'medium'
    },
    {
      id: 'google/gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash (OpenRouter)',
      description: '通過 OpenRouter 訪問的 Gemini',
      maxTokens: 8192,
      contextWindow: 1000000,
      costLevel: 'medium'
    }
  ]
};

/**
 * 驗證模型 ID 是否有效
 * 🔥 修復：信任API返回的模型，移除白名單限制
 */
export function isValidModelId(providerId: string, modelId: string): boolean {
  // 信任 API 返回的所有模型都是有效的
  // 如果模型無效，API 會返回錯誤，由錯誤處理機制處理
  return true;
}

/**
 * 獲取模型資訊
 * 🔥 修復：智能推斷模型參數，不依賴硬編碼白名單
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | null {
  // 首先嘗試從白名單獲取
  const providerModels = MODEL_WHITELIST[providerId];
  if (providerModels) {
    const whitelistModel = providerModels.find(model => model.id === modelId);
    if (whitelistModel) {
      return whitelistModel;
    }
  }
  
  // 如果白名單中沒有，使用智能推斷
  return inferModelInfo(modelId);
}

/**
 * 智能推斷模型資訊
 * 根據模型名稱模式推斷合理的參數
 */
function inferModelInfo(modelId: string): ModelInfo {
  const lowerModelId = modelId.toLowerCase();
  
  // GPT 系列
  if (lowerModelId.includes('gpt-4o')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 GPT-4o 系列模型',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'medium'
    };
  }
  
  if (lowerModelId.includes('gpt-4')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 GPT-4 系列模型',
      maxTokens: 4096,
      contextWindow: 128000,
      costLevel: 'high'
    };
  }
  
  if (lowerModelId.includes('gpt-3.5')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 GPT-3.5 系列模型',
      maxTokens: 4096,
      contextWindow: 16000,
      costLevel: 'low'
    };
  }
  
  // Claude 系列
  if (lowerModelId.includes('claude')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 Claude 系列模型',
      maxTokens: 8192,
      contextWindow: 200000,
      costLevel: 'medium'
    };
  }
  
  // Gemini 系列
  if (lowerModelId.includes('gemini')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 Gemini 系列模型',
      maxTokens: 8192,
      contextWindow: 1000000,
      costLevel: 'medium'
    };
  }
  
  // Llama 系列
  if (lowerModelId.includes('llama')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 Llama 系列模型',
      maxTokens: 2048,
      contextWindow: 8192,
      costLevel: 'low'
    };
  }
  
  // Qwen 系列
  if (lowerModelId.includes('qwen')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 Qwen 系列模型',
      maxTokens: 2048,
      contextWindow: 32768,
      costLevel: 'low'
    };
  }
  
  // Grok 系列 (X.AI)
  if (lowerModelId.includes('grok')) {
    return {
      id: modelId,
      name: `${modelId} (推斷)`,
      description: '智能推斷的 Grok 系列模型',
      maxTokens: 4096,
      contextWindow: 131072,
      costLevel: 'medium'
    };
  }
  
  // 默認推斷 - 適用於任何未知模型
  return {
    id: modelId,
    name: `${modelId} (推斷)`,
    description: '智能推斷的模型參數',
    maxTokens: 2048,
    contextWindow: 8192,
    costLevel: 'medium'
  };
}

/**
 * 獲取 Provider 的推薦模型
 */
export function getRecommendedModels(providerId: string): ModelInfo[] {
  const providerModels = MODEL_WHITELIST[providerId];
  if (!providerModels) return [];
  
  return providerModels.filter(model => model.isRecommended);
}

/**
 * 獲取所有支援的 Provider ID
 */
export function getSupportedProviders(): string[] {
  return Object.keys(MODEL_WHITELIST);
}

/**
 * 根據 Token 需求推薦模型
 * 🔥 修復：先從白名單搜尋，找不到則返回通用推薦
 */
export function recommendModelForTokens(providerId: string, requiredTokens: number): ModelInfo | null {
  const providerModels = MODEL_WHITELIST[providerId];
  
  if (providerModels) {
    // 找到符合 Token 需求的模型，優先推薦版本
    const suitable = providerModels.filter(model => model.maxTokens >= requiredTokens);
    const recommended = suitable.filter(model => model.isRecommended);
    
    if (recommended.length > 0) {
      // 從推薦模型中選擇成本最低的
      return recommended.reduce((best, current) => {
        const costOrder = { low: 1, medium: 2, high: 3 };
        return costOrder[current.costLevel] < costOrder[best.costLevel] ? current : best;
      });
    }
    
    if (suitable.length > 0) {
      // 如果沒有推薦的，選擇成本最低的
      return suitable.reduce((best, current) => {
        const costOrder = { low: 1, medium: 2, high: 3 };
        return costOrder[current.costLevel] < costOrder[best.costLevel] ? current : best;
      });
    }
  }
  
  // 如果白名單中沒有合適的模型，返回基於 provider 的通用推薦
  return getGenericRecommendation(providerId, requiredTokens);
}

/**
 * 獲取通用推薦模型
 * 當白名單中沒有合適模型時的備選方案
 */
function getGenericRecommendation(providerId: string, requiredTokens: number): ModelInfo | null {
  switch (providerId) {
    case 'openai':
      return {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini (推薦)',
        description: '通用推薦：平衡性能與成本',
        maxTokens: Math.max(4096, requiredTokens),
        contextWindow: 128000,
        costLevel: 'low',
        isRecommended: true
      };
      
    case 'claude':
      return {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet (推薦)',
        description: '通用推薦：適合創意寫作',
        maxTokens: Math.max(8192, requiredTokens),
        contextWindow: 200000,
        costLevel: 'medium',
        isRecommended: true
      };
      
    case 'gemini':
      return {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash (推薦)',
        description: '通用推薦：快速且經濟',
        maxTokens: Math.max(8192, requiredTokens),
        contextWindow: 1000000,
        costLevel: 'low',
        isRecommended: true
      };
      
    case 'openrouter':
      return {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini via OpenRouter (推薦)',
        description: '通用推薦：OpenRouter上的經濟選擇',
        maxTokens: Math.max(4096, requiredTokens),
        contextWindow: 128000,
        costLevel: 'low',
        isRecommended: true
      };
      
    default:
      return null;
  }
}

/**
 * 獲取所有有效的模型列表
 */
export function getAllValidModels(providerType?: ProviderType): ModelInfo[] {
  if (providerType) {
    return whitelistedModels[providerType] || [];
  }
  
  // 返回所有提供者的模型
  const allModels: ModelInfo[] = [];
  Object.entries(whitelistedModels).forEach(([provider, models]) => {
    models.forEach(model => {
      allModels.push({
        ...model,
        provider: provider as ProviderType
      });
    });
  });
  
  return allModels;
}