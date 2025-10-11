import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { setCurrentProvider } from '../../store/slices/visualCreationSlice';
import { api } from '../../api';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('useIllustrationService');

// 向後兼容的插圖服務提供者類型
export type IllustrationProvider =
  | 'pollinations'          // 免費，無需 API Key
  | 'gemini'               // Gemini API (免費/付費額度)
  | 'openrouter';          // OpenRouter API (用於 Gemini 2.5 Flash Image Preview)
export type PollinationsModel = 'flux' | 'gptimage' | 'kontext' | 'sdxl';
export type PollinationsStyle = 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
export type ColorMode = 'color' | 'manga' | 'sketch';
export type ApiKeySource = 'manual' | 'gemini' | 'openrouter';

export interface UseIllustrationServiceOptions {
  defaultProvider?: IllustrationProvider;
  autoLoadApiKey?: boolean;
}

export interface UseIllustrationServiceReturn {
  // 服務配置
  illustrationProvider: IllustrationProvider;
  setIllustrationProvider: (provider: IllustrationProvider) => void;
  
  // Pollinations 配置
  pollinationsModel: PollinationsModel;
  setPollinationsModel: (model: PollinationsModel) => void;
  pollinationsStyle: PollinationsStyle;
  setPollinationsStyle: (style: PollinationsStyle) => void;
  
  // 通用配置
  globalColorMode: ColorMode;
  setGlobalColorMode: (mode: ColorMode) => void;
  
  // API Key 管理
  apiKey: string;
  setApiKey: (key: string) => void;
  apiKeySource: ApiKeySource;
  setApiKeySource: (source: ApiKeySource) => void;
  isApiKeyLoaded: boolean;
  
  // 功能函數
  loadApiKeyFromProviders: () => Promise<void>;
  clearApiKey: () => void;
  validateConfiguration: () => { isValid: boolean; errors: string[] };
  detectAvailableServices: () => Promise<{
    availableServices: IllustrationProvider[];
    serviceCapabilities: Record<string, unknown>;
  }>;
  
  // 計算值
  isPollinationsFree: boolean;
  requiresApiKey: boolean;
  supportsOptionalApiKey: boolean;
  serviceDisplayName: string;
  configurationSummary: string;
}

/**
 * 插畫服務管理 Hook
 * 
 * 功能：
 * - 管理插畫服務提供商選擇
 * - 配置 Pollinations 和 Imagen 參數
 * - 自動載入和管理 API Key
 * - 服務配置驗證
 * 
 * @param options 配置選項
 * @returns 插畫服務相關狀態和函數
 */
export const useIllustrationService = (
  options: UseIllustrationServiceOptions = {}
): UseIllustrationServiceReturn => {
  const { 
    autoLoadApiKey = true 
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  
  // 從 Redux 讀取 currentProvider 而不是維護內部狀態
  const illustrationProvider = useSelector((state: RootState) => state.visualCreation.currentProvider);
  
  // 創建 setIllustrationProvider 函數來 dispatch Redux action
  const setIllustrationProvider = useCallback((provider: IllustrationProvider) => {
    dispatch(setCurrentProvider(provider));
  }, [dispatch]);
  
  // Pollinations 配置
  const [pollinationsModel, setPollinationsModel] = useState<PollinationsModel>('flux');
  const [pollinationsStyle, setPollinationsStyle] = useState<PollinationsStyle>('anime');
  
  // 通用配置
  const [globalColorMode, setGlobalColorMode] = useState<ColorMode>('color');
  
  // API Key 狀態
  const [apiKey, setApiKeyState] = useState<string>('');
  const [apiKeySource, setApiKeySource] = useState<ApiKeySource>('manual');
  const [isApiKeyLoaded, setIsApiKeyLoaded] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);

  // API Key 設定（帶來源追蹤）
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key && apiKeySource === 'manual') {
      // 如果手動設定，更新來源
      setApiKeySource('manual');
    }
  }, [apiKeySource]);

  // 從 AI Providers 載入 API Key（修復閉包陷阱問題）
  const loadApiKeyFromProviders = useCallback(async (targetProvider?: IllustrationProvider) => {
    if (!currentProject) {
      log.debug('⚠️ 沒有當前專案，跳過 API Key 載入');
      return;
    }

    const providerToUse = targetProvider || illustrationProvider;
    console.log(`🔑 開始為 ${providerToUse} 載入 API Key...`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換

    try {
      const response = await api.aiProviders.getAll();

      if (!response.success || !response.providers) {
        log.debug('❌ 無法獲取 AI Providers');
        return;
      }

      // 根據當前選擇的服務載入對應的 API key
      if (providerToUse === 'gemini') {
        // Gemini：使用 Gemini API key
        const geminiProvider = response.providers.find((p) =>
          p.provider_type === 'gemini' && p.is_enabled && p.api_key_encrypted
        );

        if (geminiProvider?.api_key_encrypted) {
          try {
            const decodedApiKey = atob(geminiProvider.api_key_encrypted);
            setApiKeyState(decodedApiKey);
            setApiKeySource('gemini');
            setIsApiKeyLoaded(true);
            log.debug('✅ 成功載入 Gemini API Key');
            return;
          } catch (error) {
            log.error('❌ 解碼 Gemini API Key 失敗:', error);
          }
        }
      } else if (providerToUse === 'openrouter') {
        // OpenRouter：使用 OpenRouter API key
        const openrouterProvider = response.providers.find((p) =>
          p.provider_type === 'openrouter' && p.is_enabled && p.api_key_encrypted
        );

        if (openrouterProvider?.api_key_encrypted) {
          try {
            const decodedApiKey = atob(openrouterProvider.api_key_encrypted);
            setApiKeyState(decodedApiKey);
            setApiKeySource('openrouter');
            setIsApiKeyLoaded(true);
            log.debug('✅ 成功載入 OpenRouter API Key (用於 Gemini 2.5 Flash Image Preview)');
            return;
          } catch (error) {
            log.error('❌ 解碼 OpenRouter API Key 失敗:', error);
          }
        }
      } else {
        // Pollinations：無需 API key，嘗試載入 Gemini API key 作為預設
        const geminiProvider = response.providers.find((p) =>
          p.provider_type === 'gemini' && p.is_enabled && p.api_key_encrypted
        );

        if (geminiProvider?.api_key_encrypted) {
          try {
            const decodedApiKey = atob(geminiProvider.api_key_encrypted);
            setApiKeyState(decodedApiKey);
            setApiKeySource('gemini');
            setIsApiKeyLoaded(true);
            log.debug('✅ 成功載入 Gemini API Key');
            return;
          } catch (error) {
            log.error('❌ 解碼 Gemini API Key 失敗:', error);
          }
        }
      }

      log.debug('⚠️ 沒有找到可用的 API Key');
    } catch (error) {
      log.error('❌ 載入 API Key 失敗:', error);
    }
  }, [currentProject, illustrationProvider]); // 保持 illustrationProvider 依賴，但通過參數傳遞避免閉包陷阱

  // 智能API檢測 - 分析可用的插畫服務
  const detectAvailableServices = useCallback(async () => {
    if (!currentProject) {
      log.debug('⚠️ 沒有當前專案，跳過服務檢測');
      return {
        availableServices: ['pollinations'] as IllustrationProvider[], // 預設免費服務
        serviceCapabilities: {
          pollinations: { isFree: true, requiresApiKey: false, quality: 'good' }
        }
      };
    }

    try {
      log.debug('🔍 開始檢測可用的插畫服務...');
      const response = await api.aiProviders.getAll();

      if (!response.success || !response.providers) {
        log.debug('❌ 無法獲取 AI Providers，僅提供免費服務');
        return {
          availableServices: ['pollinations'] as IllustrationProvider[],
          serviceCapabilities: {
            pollinations: { isFree: true, requiresApiKey: false, quality: 'good' }
          }
        };
      }

      const availableServices: IllustrationProvider[] = ['pollinations']; // 始終可用
      const serviceCapabilities: Record<string, unknown> = {
        pollinations: { isFree: true, requiresApiKey: false, quality: 'good' }
      };

      // 檢查 Gemini 提供者
      const geminiProvider = response.providers.find((p) =>
        p.provider_type === 'gemini' && p.is_enabled && p.api_key_encrypted
      );

      if (geminiProvider?.api_key_encrypted) {
        availableServices.push('gemini');
        serviceCapabilities.gemini = {
          isFree: true,
          requiresApiKey: true,
          quality: 'high',
          provider: 'gemini'
        };
        log.debug('✅ 檢測到 Gemini API - 啟用 Gemini Flash 服務');
      }

      // 檢查 OpenRouter 提供者
      const openrouterProvider = response.providers.find((p) =>
        p.provider_type === 'openrouter' && p.is_enabled && p.api_key_encrypted
      );

      if (openrouterProvider?.api_key_encrypted) {
        availableServices.push('openrouter');
        serviceCapabilities.openrouter = {
          isFree: false,
          requiresApiKey: true,
          quality: 'premium',
          provider: 'openrouter',
          model: 'google/gemini-2.5-flash-image-preview'
        };
        log.debug('✅ 檢測到 OpenRouter API - 啟用 Gemini 2.5 Flash Image Preview');
      }

      log.debug('🎯 檢測結果:', { availableServices, serviceCapabilities });

      return {
        availableServices: availableServices.filter((service, index, arr) => arr.indexOf(service) === index), // 去重
        serviceCapabilities
      };

    } catch (error) {
      log.error('❌ 檢測可用服務失敗:', error);
      return {
        availableServices: ['pollinations'] as IllustrationProvider[],
        serviceCapabilities: {
          pollinations: { isFree: true, requiresApiKey: false, quality: 'good' }
        }
      };
    }
  }, [currentProject]);

  // 清空 API Key
  const clearApiKey = useCallback(() => {
    setApiKeyState('');
    setApiKeySource('manual');
    setIsApiKeyLoaded(false);
    log.debug('🗑️ 已清空 API Key');
  }, []);

  // 配置驗證
  const validateConfiguration = useCallback(() => {
    const errors: string[] = [];

    // 檢查需要 API Key 的服務
    const needsApiKey = ['gemini', 'openrouter'].includes(illustrationProvider);
    if (needsApiKey && !apiKey.trim()) {
      const displayName = illustrationProvider === 'gemini' ? 'Gemini Flash' : 'OpenRouter';
      errors.push(`${displayName} 需要 API Key`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [illustrationProvider, apiKey]);

  // 計算值
  const isPollinationsFree = illustrationProvider === 'pollinations';

  // 檢查是否支援可選的 API Key 配置
  const supportsOptionalApiKey = useMemo(() => {
    const optionalApiKeyServices: IllustrationProvider[] = ['pollinations'];
    return optionalApiKeyServices.includes(illustrationProvider);
  }, [illustrationProvider]);

  const requiresApiKey = useMemo(() => {
    // 完全不需要 API Key 的服務 (無選填選項)
    const _freeServices: IllustrationProvider[] = [];

    // 需要 API Key 的服務 (必填)
    const requiresApiKeyServices: IllustrationProvider[] = ['gemini', 'openrouter'];

    // 支援可選 API Key 的服務 (選填) - Pollinations 現在支援可選的 API Token
    const optionalApiKeyServices: IllustrationProvider[] = ['pollinations'];

    // 對於有可選 API Key 支援的服務，在 UI 中仍顯示配置選項但不強制要求
    if (optionalApiKeyServices.includes(illustrationProvider)) {
      return false; // 不強制要求，但 ServiceConfigurationPanel 會顯示配置選項
    }

    return requiresApiKeyServices.includes(illustrationProvider);
  }, [illustrationProvider]);
  
  const serviceDisplayName = useMemo(() => {
    switch (illustrationProvider) {
      case 'pollinations':
        return 'Pollinations.AI (免費)';
      case 'gemini':
        return 'Gemini Flash (免費/付費額度)';
      case 'openrouter':
        return 'OpenRouter (Gemini 2.5 Flash Image Preview)';
      default:
        return '未知服務';
    }
  }, [illustrationProvider]);

  const configurationSummary = useMemo(() => {
    const parts: string[] = [];
    
    parts.push(`服務: ${serviceDisplayName}`);
    parts.push(`色彩: ${globalColorMode === 'color' ? '彩色' : '黑白'}`);
    
    if (illustrationProvider === 'pollinations') {
      parts.push(`模型: ${pollinationsModel}`);
      parts.push(`風格: ${pollinationsStyle}`);
    }
    
    if (requiresApiKey) {
      parts.push(`API Key: ${apiKey ? '已設定' : '未設定'}`);
    }
    
    return parts.join(' | ');
  }, [serviceDisplayName, globalColorMode, illustrationProvider, pollinationsModel, pollinationsStyle, requiresApiKey, apiKey]);

  // 自動載入 API Key
  useEffect(() => {
    if (autoLoadApiKey && currentProject && !isApiKeyLoaded && !isLoadingApiKey) {
      console.log(`🔄 開始為 ${illustrationProvider} 自動載入 API Key...`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
      setIsLoadingApiKey(true);
      loadApiKeyFromProviders(illustrationProvider).finally(() => {
        setIsLoadingApiKey(false);
      });
    }
  }, [autoLoadApiKey, currentProject, isApiKeyLoaded, isLoadingApiKey, loadApiKeyFromProviders, illustrationProvider]);

  // 服務切換時的處理
  useEffect(() => {
    console.log(`🔄 插畫服務切換至: ${serviceDisplayName}`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換

    // 當切換服務時重新載入適當的 API Key
    if (currentProject && autoLoadApiKey) {
      // 需要 API Key 的服務類型
      const needsApiKey = ['gemini', 'openrouter'].includes(illustrationProvider);

      if (needsApiKey) {
        log.debug('🔄 服務切換：重新載入 API Key...');
        setIsApiKeyLoaded(false);
        setIsLoadingApiKey(true);
        loadApiKeyFromProviders(illustrationProvider).finally(() => {
          setIsLoadingApiKey(false);
        });
      } else {
        // 切換到不需要 API Key 的服務，保持當前狀態
        log.debug('🔄 服務切換到免費服務，不需要 API Key');
      }
    }
  }, [illustrationProvider, currentProject, autoLoadApiKey, loadApiKeyFromProviders]);

  // 調試資訊
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('🐛 [useIllustrationService] Debug Info:');
      log.debug('   🎨 Provider:', illustrationProvider);
      log.debug('   🤖 Model:', pollinationsModel);
      log.debug('   🎭 Style:', pollinationsStyle);
      log.debug('   🌈 Color Mode:', globalColorMode);
      log.debug('   🔑 API Key Source:', apiKeySource);
      log.debug('   ✅ API Key Loaded:', isApiKeyLoaded);
      log.debug('   🔐 Has API Key:', !!apiKey);
    }
  }, [illustrationProvider, pollinationsModel, pollinationsStyle, globalColorMode, apiKeySource, isApiKeyLoaded, apiKey]);

  return {
    // 服務配置
    illustrationProvider,
    setIllustrationProvider,
    
    // Pollinations 配置
    pollinationsModel,
    setPollinationsModel,
    pollinationsStyle,
    setPollinationsStyle,
    
    // 通用配置
    globalColorMode,
    setGlobalColorMode,
    
    // API Key 管理
    apiKey,
    setApiKey,
    apiKeySource,
    setApiKeySource,
    isApiKeyLoaded,
    
    // 功能函數
    loadApiKeyFromProviders,
    clearApiKey,
    validateConfiguration,
    detectAvailableServices,
    
    // 計算值
    isPollinationsFree,
    requiresApiKey,
    supportsOptionalApiKey,
    serviceDisplayName,
    configurationSummary,
  };
};

export default useIllustrationService;