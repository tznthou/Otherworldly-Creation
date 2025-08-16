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
 */
export function isValidModelId(providerId: string, modelId: string): boolean {
  const providerModels = MODEL_WHITELIST[providerId];
  if (!providerModels) return false;
  
  return providerModels.some(model => model.id === modelId);
}

/**
 * 獲取模型資訊
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | null {
  const providerModels = MODEL_WHITELIST[providerId];
  if (!providerModels) return null;
  
  return providerModels.find(model => model.id === modelId) || null;
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
 */
export function recommendModelForTokens(providerId: string, requiredTokens: number): ModelInfo | null {
  const providerModels = MODEL_WHITELIST[providerId];
  if (!providerModels) return null;
  
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
  
  return null;
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