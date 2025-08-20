import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { api } from '../../api';

export type IllustrationProvider = 'pollinations' | 'imagen';
export type PollinationsModel = 'flux' | 'gptimage' | 'kontext' | 'sdxl';
export type PollinationsStyle = 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
export type ColorMode = 'color' | 'monochrome';
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
  
  // 計算值
  isPollinationsFree: boolean;
  requiresApiKey: boolean;
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
    defaultProvider = 'pollinations',
    autoLoadApiKey = true 
  } = options;

  const currentProject = useSelector((state: RootState) => state.projects.currentProject);

  // 服務配置狀態
  const [illustrationProvider, setIllustrationProvider] = useState<IllustrationProvider>(defaultProvider);
  
  // Pollinations 配置
  const [pollinationsModel, setPollinationsModel] = useState<PollinationsModel>('flux');
  const [pollinationsStyle, setPollinationsStyle] = useState<PollinationsStyle>('anime');
  
  // 通用配置
  const [globalColorMode, setGlobalColorMode] = useState<ColorMode>('color');
  
  // API Key 狀態
  const [apiKey, setApiKeyState] = useState<string>('');
  const [apiKeySource, setApiKeySource] = useState<ApiKeySource>('manual');
  const [isApiKeyLoaded, setIsApiKeyLoaded] = useState(false);

  // API Key 設定（帶來源追蹤）
  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key && apiKeySource === 'manual') {
      // 如果手動設定，更新來源
      setApiKeySource('manual');
    }
  }, [apiKeySource]);

  // 從 AI Providers 載入 API Key
  const loadApiKeyFromProviders = useCallback(async () => {
    if (!currentProject) {
      console.log('⚠️ 沒有當前專案，跳過 API Key 載入');
      return;
    }

    try {
      console.log('🔑 開始從 AI Providers 載入 API Key...');
      const response = await api.aiProviders.getAll();
      
      if (!response.success || !response.providers) {
        console.log('❌ 無法獲取 AI Providers');
        return;
      }

      // 優先找 Gemini provider
      const geminiProvider = response.providers.find((p) => 
        p.provider_type === 'gemini' && p.is_enabled && p.api_key_encrypted
      );
      
      if (geminiProvider?.api_key_encrypted) {
        try {
          const decodedApiKey = atob(geminiProvider.api_key_encrypted);
          setApiKeyState(decodedApiKey);
          setApiKeySource('gemini');
          setIsApiKeyLoaded(true);
          console.log('✅ 成功載入 Gemini API Key');
          return;
        } catch (error) {
          console.error('❌ 解碼 Gemini API Key 失敗:', error);
        }
      }
      
      // 檢查 OpenRouter（如果支援 Gemini/Imagen）
      const openrouterProvider = response.providers.find((p) => 
        p.provider_type === 'openrouter' && p.is_enabled && p.api_key_encrypted
      );
      
      if (openrouterProvider?.api_key_encrypted) {
        const modelName = openrouterProvider.model || '';
        if (modelName.toLowerCase().includes('imagen') || modelName.toLowerCase().includes('gemini')) {
          try {
            const decodedApiKey = atob(openrouterProvider.api_key_encrypted);
            setApiKeyState(decodedApiKey);
            setApiKeySource('openrouter');
            setIsApiKeyLoaded(true);
            console.log('✅ 成功載入 OpenRouter API Key');
          } catch (error) {
            console.error('❌ 解碼 OpenRouter API Key 失敗:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ 載入 API Key 失敗:', error);
    }
  }, [currentProject]);

  // 清空 API Key
  const clearApiKey = useCallback(() => {
    setApiKeyState('');
    setApiKeySource('manual');
    setIsApiKeyLoaded(false);
    console.log('🗑️ 已清空 API Key');
  }, []);

  // 配置驗證
  const validateConfiguration = useCallback(() => {
    const errors: string[] = [];
    
    // 檢查 Imagen 是否需要 API Key
    if (illustrationProvider === 'imagen' && !apiKey.trim()) {
      errors.push('Google Imagen 需要 API Key');
    }
    
    // 檢查 API Key 格式（簡單驗證）
    if (illustrationProvider === 'imagen' && apiKey.trim()) {
      if (!apiKey.startsWith('AIza') && !apiKey.includes('google')) {
        errors.push('API Key 格式可能不正確');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [illustrationProvider, apiKey]);

  // 計算值
  const isPollinationsFree = illustrationProvider === 'pollinations';
  const requiresApiKey = illustrationProvider === 'imagen';
  
  const serviceDisplayName = useMemo(() => {
    switch (illustrationProvider) {
      case 'pollinations':
        return 'Pollinations.AI (免費)';
      case 'imagen':
        return 'Google Imagen (付費)';
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
    if (autoLoadApiKey && currentProject && !isApiKeyLoaded) {
      loadApiKeyFromProviders();
    }
  }, [autoLoadApiKey, currentProject, isApiKeyLoaded, loadApiKeyFromProviders]);

  // 服務切換時的處理
  useEffect(() => {
    console.log(`🔄 插畫服務切換至: ${serviceDisplayName}`);
    
    // 如果切換到免費服務，可以清空 API Key（可選）
    if (illustrationProvider === 'pollinations' && apiKeySource === 'manual') {
      // 不自動清空，讓用戶自己決定
    }
  }, [illustrationProvider, serviceDisplayName, apiKeySource]);

  // 調試資訊
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [useIllustrationService] Debug Info:');
      console.log('   🎨 Provider:', illustrationProvider);
      console.log('   🤖 Model:', pollinationsModel);
      console.log('   🎭 Style:', pollinationsStyle);
      console.log('   🌈 Color Mode:', globalColorMode);
      console.log('   🔑 API Key Source:', apiKeySource);
      console.log('   ✅ API Key Loaded:', isApiKeyLoaded);
      console.log('   🔐 Has API Key:', !!apiKey);
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
    
    // 計算值
    isPollinationsFree,
    requiresApiKey,
    serviceDisplayName,
    configurationSummary,
  };
};

export default useIllustrationService;