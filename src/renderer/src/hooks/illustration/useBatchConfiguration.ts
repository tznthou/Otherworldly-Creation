import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskPriority } from '../../types/illustration';
import type { 
  StyleTemplate, 
  StyleCategory,
  StyleTemplateFilter,
  StyleTemplateSortBy,
  CreateStyleTemplateRequest,
  UpdateStyleTemplateRequest,
} from '../../types/styleTemplate';
import { useStyleTemplates } from './useStyleTemplates';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('useBatchConfiguration');

// 批次配置選項介面
export interface UseBatchConfigurationOptions {
  /** 初始批次名稱 */
  initialBatchName?: string;
  /** 初始批次描述 */
  initialDescription?: string;
  /** 初始優先級 */
  initialPriority?: TaskPriority;
  /** 初始最大並行數 */
  initialMaxParallel?: number;
  /** 是否自動驗證配置 */
  autoValidate?: boolean;
  /** 自定義驗證規則 */
  customValidators?: ValidationRule[];
}

// 批次配置返回值介面
export interface UseBatchConfigurationReturn {
  // === 基礎配置 ===
  /** 批次名稱 */
  batchName: string;
  /** 批次描述 */
  batchDescription: string;
  /** 批次優先級 */
  batchPriority: TaskPriority;
  /** 最大並行數量 */
  maxParallel: number;
  
  // === 插畫配置 ===
  /** 色彩模式 */
  globalColorMode: 'color' | 'monochrome';
  /** API 金鑰來源 */
  apiKeySource: 'manual' | 'gemini' | 'openrouter';
  /** 插畫服務提供商 */
  illustrationProvider: 'pollinations' | 'imagen' | 'gemini-free' | 'gemini-paid';
  /** Pollinations 模型 */
  pollinationsModel: 'flux' | 'gptimage' | 'kontext' | 'sdxl';
  /** Pollinations 風格 */
  pollinationsStyle: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
  /** Gemini 模型 */
  geminiModel: 'gemini-2.5-flash' | 'gemini-2.5-flash-image-preview';
  /** Gemini 品質等級 */
  geminiQuality: 'standard' | 'high' | 'ultra';
  /** Gemini 風格指引 */
  geminiStyle: 'anime' | 'realistic' | 'artistic' | 'fantasy';
  /** Gemini 安全等級 */
  geminiSafetyLevel: 'block_most' | 'block_some' | 'block_few';
  /** API 金鑰 */
  apiKey: string;
  
  // === 風格模板系統 ===
  /** 當前選中的風格模板 */
  selectedStyleTemplate: StyleTemplate | null;
  /** 所有可用的風格模板 */
  availableTemplates: StyleTemplate[];
  /** 已過濾的模板列表 */
  filteredTemplates: StyleTemplate[];
  /** 模板搜索過濾器 */
  templateFilter: StyleTemplateFilter;
  /** 模板排序方式 */
  templateSortBy: StyleTemplateSortBy;
  
  // === 配置函數 ===
  /** 設置批次名稱 */
  setBatchName: (name: string) => void;
  /** 設置批次描述 */
  setBatchDescription: (description: string) => void;
  /** 設置批次優先級 */
  setBatchPriority: (priority: TaskPriority) => void;
  /** 設置最大並行數量 */
  setMaxParallel: (max: number) => void;
  /** 設置色彩模式 */
  setGlobalColorMode: (mode: 'color' | 'monochrome') => void;
  /** 設置 API 金鑰來源 */
  setApiKeySource: (source: 'manual' | 'gemini' | 'openrouter') => void;
  /** 設置插畫服務提供商 */
  setIllustrationProvider: (provider: 'pollinations' | 'imagen' | 'gemini-free' | 'gemini-paid') => void;
  /** 設置 Pollinations 模型 */
  setPollinationsModel: (model: 'flux' | 'gptimage' | 'kontext' | 'sdxl') => void;
  /** 設置 Pollinations 風格 */
  setPollinationsStyle: (style: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art') => void;
  /** 設置 Gemini 模型 */
  setGeminiModel: (model: 'gemini-2.5-flash' | 'gemini-2.5-flash-image-preview') => void;
  /** 設置 Gemini 品質等級 */
  setGeminiQuality: (quality: 'standard' | 'high' | 'ultra') => void;
  /** 設置 Gemini 風格指引 */
  setGeminiStyle: (style: 'anime' | 'realistic' | 'artistic' | 'fantasy') => void;
  /** 設置 Gemini 安全等級 */
  setGeminiSafetyLevel: (level: 'block_most' | 'block_some' | 'block_few') => void;
  /** 設置 API 金鑰 */
  setApiKey: (key: string) => void;
  
  // === 風格模板管理函數 ===
  /** 選擇風格模板 */
  selectStyleTemplate: (template: StyleTemplate | null) => void;
  /** 應用模板到當前配置 */
  applyTemplate: (template: StyleTemplate) => void;
  /** 設置模板過濾器 */
  setTemplateFilter: (filter: StyleTemplateFilter) => void;
  /** 設置模板排序方式 */
  setTemplateSortBy: (sortBy: StyleTemplateSortBy) => void;
  /** 創建新的風格模板 */
  createTemplate: (template: CreateStyleTemplateRequest) => Promise<StyleTemplate>;
  /** 更新風格模板 */
  updateTemplate: (template: UpdateStyleTemplateRequest) => Promise<StyleTemplate>;
  /** 刪除風格模板 */
  deleteTemplate: (templateId: string) => Promise<void>;
  /** 複製風格模板 */
  duplicateTemplate: (templateId: string, newName: string) => Promise<StyleTemplate>;
  /** 從當前配置創建模板 */
  createTemplateFromCurrentConfig: (name: string, description: string, category: StyleCategory) => Promise<StyleTemplate>;
  /** 重置模板過濾器 */
  resetTemplateFilter: () => void;
  
  // === 驗證和實用功能 ===
  /** 配置驗證結果 */
  validation: ValidationResult;
  /** 是否為有效配置 */
  isValidConfiguration: boolean;
  /** 重置為預設配置 */
  resetToDefaults: () => void;
  /** 匯出配置 */
  exportConfiguration: () => BatchConfiguration;
  /** 匯入配置 */
  importConfiguration: (config: Partial<BatchConfiguration>) => void;
  /** 獲取配置摘要 */
  getConfigurationSummary: () => string;
  /** 驗證單一字段 */
  validateField: (field: keyof BatchConfiguration, value: unknown) => ValidationError | null;
  /** 獲取建議的最大並行數 */
  getRecommendedMaxParallel: () => number;
}

// 驗證規則介面
export interface ValidationRule {
  field: keyof BatchConfiguration;
  validator: (value: unknown, config: BatchConfiguration) => ValidationError | null;
  message: string;
}

// 驗證結果介面
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// 驗證錯誤介面
export interface ValidationError {
  field: keyof BatchConfiguration;
  message: string;
  severity: 'error' | 'warning';
}

// 驗證警告介面（繼承自錯誤，但語義不同）
export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

// 批次配置介面
export interface BatchConfiguration {
  batchName: string;
  batchDescription: string;
  batchPriority: TaskPriority;
  maxParallel: number;
  globalColorMode: 'color' | 'monochrome';
  apiKeySource: 'manual' | 'gemini' | 'openrouter';
  illustrationProvider: 'pollinations' | 'imagen' | 'gemini-free' | 'gemini-paid';
  pollinationsModel: 'flux' | 'gptimage' | 'kontext' | 'sdxl';
  pollinationsStyle: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
  geminiModel: 'gemini-2.5-flash' | 'gemini-2.5-flash-image-preview';
  geminiQuality: 'standard' | 'high' | 'ultra';
  geminiStyle: 'anime' | 'realistic' | 'artistic' | 'fantasy';
  geminiSafetyLevel: 'block_most' | 'block_some' | 'block_few';
  apiKey: string;
  
  // 風格模板相關
  selectedStyleTemplateId?: string;
  useStyleTemplate: boolean;
  customPositivePrompts: string[];
  customNegativePrompts: string[];
}

// 預設配置常數
const DEFAULT_CONFIGURATION: BatchConfiguration = {
  batchName: '',
  batchDescription: '',
  batchPriority: TaskPriority.Normal,
  maxParallel: 2,
  globalColorMode: 'color',
  apiKeySource: 'manual',
  illustrationProvider: 'pollinations',
  pollinationsModel: 'flux',
  pollinationsStyle: 'anime',
  geminiModel: 'gemini-2.5-flash',
  geminiQuality: 'standard',
  geminiStyle: 'anime',
  geminiSafetyLevel: 'block_most',
  apiKey: '',
  
  // 風格模板預設值
  selectedStyleTemplateId: undefined,
  useStyleTemplate: false,
  customPositivePrompts: [],
  customNegativePrompts: [],
};

// 預設驗證規則
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'batchName',
    validator: (value: unknown) => {
      const stringValue = String(value || '');
      if (!stringValue || stringValue.trim().length === 0) {
        return { field: 'batchName', message: '批次名稱不能為空', severity: 'error' };
      }
      if (stringValue.length > 50) {
        return { field: 'batchName', message: '批次名稱不能超過 50 個字符', severity: 'error' };
      }
      return null;
    },
    message: '批次名稱驗證',
  },
  {
    field: 'maxParallel',
    validator: (value: unknown) => {
      const numberValue = Number(value);
      if (isNaN(numberValue) || numberValue < 1) {
        return { field: 'maxParallel', message: '最大並行數不能小於 1', severity: 'error' };
      }
      if (numberValue > 10) {
        return { field: 'maxParallel', message: '最大並行數不建議超過 10', severity: 'warning' };
      }
      return null;
    },
    message: '最大並行數驗證',
  },
  {
    field: 'apiKey',
    validator: (value: unknown, config: BatchConfiguration) => {
      const stringValue = String(value || '');
      if (config.apiKeySource === 'manual' && (!stringValue || stringValue.trim().length === 0)) {
        return { field: 'apiKey', message: '手動輸入模式下 API 金鑰不能為空', severity: 'error' };
      }
      if (stringValue && stringValue.length < 10) {
        return { field: 'apiKey', message: 'API 金鑰長度可能過短', severity: 'warning' };
      }
      return null;
    },
    message: 'API 金鑰驗證',
  },
];

// 各 provider 的模型建議 (保留供未來使用)
const _PROVIDER_MODEL_RECOMMENDATIONS = {
  pollinations: {
    best_quality: 'flux',
    fastest: 'gptimage',
    balanced: 'kontext',
    classic: 'sdxl',
  },
  imagen: {
    // Imagen 通常只有一種模型
    default: 'imagen-3.0',
  },
};

// 建議的最大並行數（基於服務提供商）
const RECOMMENDED_MAX_PARALLEL: Record<'pollinations' | 'imagen' | 'gemini-free' | 'gemini-paid', number> = {
  pollinations: 3, // Pollinations 免費服務建議較低並行
  imagen: 2, // Imagen 是付費服務，建議保守
  'gemini-free': 1, // Gemini 免費版建議更保守
  'gemini-paid': 3, // Gemini 付費版可以稍微提高
};

/**
 * 批次配置管理 Hook
 * 
 * 功能：
 * - 管理所有批次生成相關配置
 * - 提供配置驗證和預設值
 * - 自動保存和還原配置
 * - 提供配置匯入/匯出功能
 * - 智能建議和警告系統
 * 
 * @param options 配置選項
 * @returns 批次配置相關狀態和函數
 */
export const useBatchConfiguration = (
  options: UseBatchConfigurationOptions = {}
): UseBatchConfigurationReturn => {
  const {
    initialBatchName = DEFAULT_CONFIGURATION.batchName,
    initialDescription = DEFAULT_CONFIGURATION.batchDescription,
    initialPriority = DEFAULT_CONFIGURATION.batchPriority,
    initialMaxParallel = DEFAULT_CONFIGURATION.maxParallel,
    autoValidate = true,
    customValidators = [],
  } = options;

  // === 基礎配置狀態 ===
  const [batchName, setBatchName] = useState<string>(initialBatchName);
  const [batchDescription, setBatchDescription] = useState<string>(initialDescription);
  const [batchPriority, setBatchPriority] = useState<TaskPriority>(initialPriority);
  const [maxParallel, setMaxParallel] = useState<number>(initialMaxParallel);

  // === 插畫配置狀態 ===
  const [globalColorMode, setGlobalColorMode] = useState<'color' | 'monochrome'>('color');
  const [apiKeySource, setApiKeySource] = useState<'manual' | 'gemini' | 'openrouter'>('manual');
  const [illustrationProvider, setIllustrationProvider] = useState<'pollinations' | 'imagen' | 'gemini-free' | 'gemini-paid'>('pollinations');
  const [pollinationsModel, setPollinationsModel] = useState<'flux' | 'gptimage' | 'kontext' | 'sdxl'>('flux');
  const [pollinationsStyle, setPollinationsStyle] = useState<'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art'>('anime');
  const [geminiModel, setGeminiModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-flash-image-preview'>('gemini-2.5-flash');
  const [geminiQuality, setGeminiQuality] = useState<'standard' | 'high' | 'ultra'>('standard');
  const [geminiStyle, setGeminiStyle] = useState<'anime' | 'realistic' | 'artistic' | 'fantasy'>('anime');
  const [geminiSafetyLevel, setGeminiSafetyLevel] = useState<'block_most' | 'block_some' | 'block_few'>('block_most');
  const [apiKey, setApiKey] = useState<string>('');

  // === 風格模板狀態 ===
  const [selectedStyleTemplateId, setSelectedStyleTemplateId] = useState<string | undefined>(undefined);
  const [useStyleTemplate, setUseStyleTemplate] = useState<boolean>(false);
  const [customPositivePrompts, setCustomPositivePrompts] = useState<string[]>([]);
  const [customNegativePrompts, setCustomNegativePrompts] = useState<string[]>([]);

  // === 風格模板系統整合 ===
  const styleTemplatesHook = useStyleTemplates({
    loadBuiltInTemplates: true
  });

  // === 當前配置物件 ===
  const currentConfiguration: BatchConfiguration = useMemo(() => ({
    batchName,
    batchDescription,
    batchPriority,
    maxParallel,
    globalColorMode,
    apiKeySource,
    illustrationProvider,
    pollinationsModel,
    pollinationsStyle,
    geminiModel,
    geminiQuality,
    geminiStyle,
    geminiSafetyLevel,
    apiKey,
    
    // 風格模板相關
    selectedStyleTemplateId,
    useStyleTemplate,
    customPositivePrompts,
    customNegativePrompts,
  }), [
    batchName, batchDescription, batchPriority, maxParallel,
    globalColorMode, apiKeySource, illustrationProvider,
    pollinationsModel, pollinationsStyle,
    geminiModel, geminiQuality, geminiStyle, geminiSafetyLevel,
    apiKey,
    selectedStyleTemplateId, useStyleTemplate, customPositivePrompts, customNegativePrompts
  ]);

  // === 驗證邏輯 ===
  const validateField = useCallback((field: keyof BatchConfiguration, value: unknown): ValidationError | null => {
    const allRules = [...DEFAULT_VALIDATION_RULES, ...customValidators];
    const fieldRules = allRules.filter(rule => rule.field === field);
    
    for (const rule of fieldRules) {
      const error = rule.validator(value, currentConfiguration);
      if (error) {
        return error;
      }
    }
    
    return null;
  }, [currentConfiguration, customValidators]);

  const validation: ValidationResult = useMemo(() => {
    if (!autoValidate) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const allRules = [...DEFAULT_VALIDATION_RULES, ...customValidators];

    for (const rule of allRules) {
      const error = rule.validator(currentConfiguration[rule.field], currentConfiguration);
      if (error) {
        if (error.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error as ValidationWarning);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [currentConfiguration, autoValidate, customValidators]);

  const isValidConfiguration = validation.isValid;

  // === 實用功能 ===
  const resetToDefaults = useCallback(() => {
    setBatchName(DEFAULT_CONFIGURATION.batchName);
    setBatchDescription(DEFAULT_CONFIGURATION.batchDescription);
    setBatchPriority(DEFAULT_CONFIGURATION.batchPriority);
    setMaxParallel(DEFAULT_CONFIGURATION.maxParallel);
    setGlobalColorMode(DEFAULT_CONFIGURATION.globalColorMode);
    setApiKeySource(DEFAULT_CONFIGURATION.apiKeySource);
    setIllustrationProvider(DEFAULT_CONFIGURATION.illustrationProvider);
    setPollinationsModel(DEFAULT_CONFIGURATION.pollinationsModel);
    setPollinationsStyle(DEFAULT_CONFIGURATION.pollinationsStyle);
    setApiKey(DEFAULT_CONFIGURATION.apiKey);
    
    log.debug('🔄 [useBatchConfiguration] 已重置為預設配置');
  }, []);

  const exportConfiguration = useCallback((): BatchConfiguration => {
    log.debug('📤 [useBatchConfiguration] 匯出配置:', currentConfiguration);
    return { ...currentConfiguration };
  }, [currentConfiguration]);

  const importConfiguration = useCallback((config: Partial<BatchConfiguration>) => {
    log.debug('📥 [useBatchConfiguration] 匯入配置:', config);
    
    if (config.batchName !== undefined) setBatchName(config.batchName);
    if (config.batchDescription !== undefined) setBatchDescription(config.batchDescription);
    if (config.batchPriority !== undefined) setBatchPriority(config.batchPriority);
    if (config.maxParallel !== undefined) setMaxParallel(config.maxParallel);
    if (config.globalColorMode !== undefined) setGlobalColorMode(config.globalColorMode);
    if (config.apiKeySource !== undefined) setApiKeySource(config.apiKeySource);
    if (config.illustrationProvider !== undefined) setIllustrationProvider(config.illustrationProvider);
    if (config.pollinationsModel !== undefined) setPollinationsModel(config.pollinationsModel);
    if (config.pollinationsStyle !== undefined) setPollinationsStyle(config.pollinationsStyle);
    if (config.apiKey !== undefined) setApiKey(config.apiKey);
  }, []);

  const getConfigurationSummary = useCallback((): string => {
    const provider = illustrationProvider === 'pollinations' ? 'Pollinations' : 'Google Imagen';
    const model = illustrationProvider === 'pollinations' ? pollinationsModel : 'imagen-3.0';
    const style = illustrationProvider === 'pollinations' ? pollinationsStyle : '自動';
    const colorMode = globalColorMode === 'color' ? '彩色' : '黑白';
    
    return `${provider} (${model}) | ${style} 風格 | ${colorMode} | 最大並行: ${maxParallel}`;
  }, [illustrationProvider, pollinationsModel, pollinationsStyle, globalColorMode, maxParallel]);

  const getRecommendedMaxParallel = useCallback((): number => {
    return RECOMMENDED_MAX_PARALLEL[illustrationProvider];
  }, [illustrationProvider]);

  // === 風格模板相關方法 ===
  
  // 獲取當前選中的風格模板
  const selectedStyleTemplate = useMemo(() => {
    if (!selectedStyleTemplateId) return null;
    return styleTemplatesHook.templates.find(t => t.id === selectedStyleTemplateId) || null;
  }, [selectedStyleTemplateId, styleTemplatesHook.templates]);

  // 選擇風格模板
  const selectStyleTemplate = useCallback((template: StyleTemplate | null) => {
    setSelectedStyleTemplateId(template?.id);
    styleTemplatesHook.selectTemplate(template);
  }, [styleTemplatesHook]);

  // 應用模板到當前配置
  const applyTemplate = useCallback((template: StyleTemplate) => {
    setSelectedStyleTemplateId(template.id);
    setUseStyleTemplate(true);
    
    // 應用模板的正面和負面提示詞
    if (template.parameters.positivePrompts) {
      setCustomPositivePrompts(template.parameters.positivePrompts);
    }
    if (template.parameters.negativePrompts) {
      setCustomNegativePrompts(template.parameters.negativePrompts);
    }
    
    // 如果模板有支援的提供商設定，應用第一個
    if (template.supportedProviders && template.supportedProviders.length > 0) {
      const recommendedProvider = template.supportedProviders[0];
      if (recommendedProvider === 'pollinations' || recommendedProvider === 'imagen') {
        setIllustrationProvider(recommendedProvider);
      }
    }
    
    log.debug('🎨 [useBatchConfiguration] 已應用風格模板:', template.name);
  }, []);

  // 從當前配置創建模板
  const createTemplateFromCurrentConfig = useCallback(async (
    name: string, 
    description: string, 
    category: StyleCategory
  ): Promise<StyleTemplate> => {
    const templateRequest: CreateStyleTemplateRequest = {
      name,
      description,
      category,
      parameters: {
        positivePrompts: customPositivePrompts,
        negativePrompts: customNegativePrompts,
        pollinationsModel: illustrationProvider === 'pollinations' ? pollinationsModel : undefined,
        pollinationsStyle: illustrationProvider === 'pollinations' ? pollinationsStyle : undefined,
      },
      tags: [category, illustrationProvider, globalColorMode],
      supportedProviders: [illustrationProvider]
    };
    
    return await styleTemplatesHook.createTemplate(templateRequest);
  }, [customPositivePrompts, customNegativePrompts, illustrationProvider, pollinationsModel, pollinationsStyle, globalColorMode, styleTemplatesHook]);

  // === 自動調整邏輯 ===
  // 當 provider 變更時自動調整建議的最大並行數
  useEffect(() => {
    const recommended = getRecommendedMaxParallel();
    if (maxParallel > recommended) {
      log.debug(`⚠️ [useBatchConfiguration] ${illustrationProvider} 建議最大並行數為 ${recommended}，當前設定 ${maxParallel} 可能過高`);
    }
  }, [illustrationProvider, maxParallel, getRecommendedMaxParallel]);

  // === 調試資訊 ===
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('🐛 [useBatchConfiguration] Debug Info:');
      log.debug('   📝 批次名稱:', batchName);
      log.debug('   📄 批次描述:', batchDescription.slice(0, 50) + (batchDescription.length > 50 ? '...' : ''));
      log.debug('   ⭐ 優先級:', batchPriority);
      log.debug('   🔢 最大並行:', maxParallel);
      log.debug('   🎨 色彩模式:', globalColorMode);
      log.debug('   🔑 API 來源:', apiKeySource);
      log.debug('   🖼️ 服務商:', illustrationProvider);
      log.debug('   🤖 模型:', pollinationsModel);
      log.debug('   🎭 風格:', pollinationsStyle);
      log.debug('   ✅ 配置有效:', isValidConfiguration);
      log.debug('   ❌ 錯誤數量:', validation.errors.length);
      log.debug('   ⚠️ 警告數量:', validation.warnings.length);
    }
  }, [
    batchName, batchDescription, batchPriority, maxParallel,
    globalColorMode, apiKeySource, illustrationProvider,
    pollinationsModel, pollinationsStyle, isValidConfiguration,
    validation.errors.length, validation.warnings.length
  ]);

  return {
    // === 基礎配置 ===
    batchName,
    batchDescription,
    batchPriority,
    maxParallel,
    
    // === 插畫配置 ===
    globalColorMode,
    apiKeySource,
    illustrationProvider,
    pollinationsModel,
    pollinationsStyle,
    geminiModel,
    geminiQuality,
    geminiStyle,
    geminiSafetyLevel,
    apiKey,
    
    // === 風格模板系統 ===
    selectedStyleTemplate,
    availableTemplates: styleTemplatesHook.templates,
    filteredTemplates: styleTemplatesHook.filteredTemplates,
    templateFilter: styleTemplatesHook.filter,
    templateSortBy: styleTemplatesHook.sortBy,
    
    // === 配置函數 ===
    setBatchName,
    setBatchDescription,
    setBatchPriority,
    setMaxParallel,
    setGlobalColorMode,
    setApiKeySource,
    setIllustrationProvider,
    setPollinationsModel,
    setPollinationsStyle,
    setGeminiModel,
    setGeminiQuality,
    setGeminiStyle,
    setGeminiSafetyLevel,
    setApiKey,
    
    // === 風格模板管理函數 ===
    selectStyleTemplate,
    applyTemplate,
    setTemplateFilter: styleTemplatesHook.setFilter,
    setTemplateSortBy: styleTemplatesHook.setSortBy,
    createTemplate: styleTemplatesHook.createTemplate,
    updateTemplate: styleTemplatesHook.updateTemplate,
    deleteTemplate: styleTemplatesHook.deleteTemplate,
    duplicateTemplate: styleTemplatesHook.duplicateTemplate,
    createTemplateFromCurrentConfig,
    resetTemplateFilter: styleTemplatesHook.resetFilter,
    
    // === 驗證和實用功能 ===
    validation,
    isValidConfiguration,
    resetToDefaults,
    exportConfiguration,
    importConfiguration,
    getConfigurationSummary,
    validateField,
    getRecommendedMaxParallel,
  };
};

export default useBatchConfiguration;