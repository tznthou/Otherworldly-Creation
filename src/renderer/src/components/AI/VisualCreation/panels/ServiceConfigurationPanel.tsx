import React, { memo, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { openModal } from '../../../../store/slices/uiSlice';
import { useIllustrationService } from '../../../../hooks/illustration';
import type {
  IllustrationProvider,
  PollinationsModel,
  PollinationsStyle,
  ColorMode
} from '../../../../hooks/illustration';
import { debugLog } from '../../../../config/features';
import { api } from '../../../../api';
import { createLogger } from '../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ServiceConfigurationPanel');

interface ServiceConfigurationPanelProps {
  className?: string;
  onConfigurationChange?: (config: {
    provider: IllustrationProvider;
    colorMode: ColorMode;
    pollinationsModel?: PollinationsModel;
    pollinationsStyle?: PollinationsStyle;
    apiKey: string;
    isValid: boolean;
  }) => void;
  showBillingWarning?: boolean;
}

/**
 * 插畫服務配置面板組件
 *
 * 功能：
 * - 選擇插畫服務提供商
 * - 配置 Pollinations 模型和風格
 * - 色彩模式選擇
 * - 簡化的 API 狀態顯示（詳細配置統一在 AI 提供者管理）
 * - 配置驗證和警告
 */
export const ServiceConfigurationPanel: React.FC<ServiceConfigurationPanelProps> = memo(({
  className = '',
  onConfigurationChange,
  showBillingWarning = true
}) => {
  const dispatch = useDispatch();

  const {
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

    // API Key 狀態檢查
    isApiKeyLoaded,
    apiKeySource,

    // 功能
    validateConfiguration,
    detectAvailableServices,

    // 計算值
    requiresApiKey,
    serviceDisplayName,
    configurationSummary,
  } = useIllustrationService();

  // 智能服務檢測狀態
  const [availableServices, setAvailableServices] = useState<IllustrationProvider[]>(['pollinations', 'gemini', 'openrouter']);
  interface ServiceCapability {
    quality?: 'premium' | 'high' | 'standard';
    [key: string]: unknown;
  }
  const [serviceCapabilities, setServiceCapabilities] = useState<Record<string, ServiceCapability>>({});
  const [isDetecting, setIsDetecting] = useState(false);

  // Pollinations API Token 狀態 - 使用簡化版本避免與 useIllustrationService 衝突
  const [pollinationsTokenInput, setPollinationsTokenInput] = useState<string>('');
  const [isPollinationsLoading, setIsPollinationsLoading] = useState(false);
  const [hasPollinationsToken, setHasPollinationsToken] = useState(false);

  // 移除功能開關相關代碼，簡化邏輯

  // 簡化的 Pollinations Token 檢查 - 只在需要時載入，避免無限迴圈
  useEffect(() => {
    if (illustrationProvider === 'pollinations') {
      const checkPollinationsToken = async () => {
        try {
          const response = await api.invoke('get_pollinations_token') as string | null;
          setHasPollinationsToken(!!response);
          if (response && !pollinationsTokenInput) {
            setPollinationsTokenInput(response);
          }
        } catch (error) {
          log.warn('無法檢查 Pollinations Token:', error);
          setHasPollinationsToken(false);
        }
      };
      checkPollinationsToken();
    }
  }, [illustrationProvider, pollinationsTokenInput]); // 只在選擇 Pollinations 時檢查

  // 配置變更回調
  React.useEffect(() => {
    if (onConfigurationChange) {
      const validation = validateConfiguration();
      onConfigurationChange({
        provider: illustrationProvider,
        colorMode: globalColorMode,
        pollinationsModel: illustrationProvider === 'pollinations' ? pollinationsModel : undefined,
        pollinationsStyle: illustrationProvider === 'pollinations' ? pollinationsStyle : undefined,
        apiKey: '', // 不在此處管理 API Key
        isValid: validation.isValid
      });
    }
  }, [
    illustrationProvider,
    globalColorMode,
    pollinationsModel,
    pollinationsStyle,
    validateConfiguration,
    onConfigurationChange
  ]);

  // 智能服務檢測
  useEffect(() => {
    const detectServices = async () => {
      if (!isDetecting) {
        setIsDetecting(true);
        debugLog('開始智能服務檢測...');

        try {
          const result = await detectAvailableServices();
          setAvailableServices(result.availableServices);
          setServiceCapabilities(result.serviceCapabilities as Record<string, ServiceCapability>);
          debugLog('服務檢測完成:', result);
        } catch (error) {
          log.error('❌ 服務檢測失敗:', error);
          // 保持預設服務
          setAvailableServices(['pollinations']);
        } finally {
          setIsDetecting(false);
        }
      }
    };

    detectServices();
  }, [detectAvailableServices]);

  const validation = validateConfiguration();

  // 跳轉到 AI 設定的處理函數
  const handleNavigateToAISettings = () => {
    // 使用 Redux 打開 AI 設定模態框
    dispatch(openModal('aiSettings'));
  };

  // 簡化的 Pollinations Token 操作
  const handleLoadPollinationsToken = async () => {
    setIsPollinationsLoading(true);
    try {
      const response = await api.invoke('get_pollinations_token') as string | null;
      if (response) {
        setPollinationsTokenInput(response);
        setHasPollinationsToken(true);
        debugLog('✅ 載入 Pollinations API Token 成功');
      } else {
        setPollinationsTokenInput('');
        setHasPollinationsToken(false);
        debugLog('ℹ️ 未找到已儲存的 Pollinations API Token');
      }
    } catch (error) {
      log.error('❌ 載入 Pollinations Token 失敗:', error);
      setHasPollinationsToken(false);
    } finally {
      setIsPollinationsLoading(false);
    }
  };

  const handleSavePollinationsToken = async () => {
    if (!pollinationsTokenInput.trim()) {
      alert('請輸入 API Token');
      return;
    }

    setIsPollinationsLoading(true);
    try {
      await api.invoke('save_pollinations_token', {
        token: pollinationsTokenInput.trim(),
        user_name: 'user',
        token_tier: 'seed'
      });
      setHasPollinationsToken(true);
      debugLog('✅ Pollinations API Token 儲存成功');
      alert('API Token 已成功儲存！');
    } catch (error) {
      log.error('❌ 儲存 Pollinations Token 失敗:', error);
      alert(`儲存失敗: ${error}`);
    } finally {
      setIsPollinationsLoading(false);
    }
  };

  const handleClearPollinationsToken = async () => {
    if (!confirm('確定要清除 API Token 嗎？')) return;

    setIsPollinationsLoading(true);
    try {
      await api.invoke('remove_pollinations_token');
      setPollinationsTokenInput('');
      setHasPollinationsToken(false);
      debugLog('✅ Pollinations API Token 已清除');
      alert('API Token 已清除');
    } catch (error) {
      log.error('❌ 清除 Pollinations Token 失敗:', error);
      alert(`清除失敗: ${error}`);
    } finally {
      setIsPollinationsLoading(false);
    }
  };

  // 服務配置映射
  const getServiceConfig = (service: IllustrationProvider) => {
    const baseConfigs = {
      pollinations: {
        emoji: '🆓',
        name: 'Pollinations.AI',
        description: '完全免費・無需API Key',
        details: '支援多種風格模型',
        colors: 'border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20',
        hoverColors: 'border-gray-600 bg-gray-700 hover:border-gray-500',
        textColor: 'text-green-400',
        isFree: true
      },
      gemini: {
        emoji: '⚡',
        name: 'Gemini Flash',
        description: '快速免費・需要API',
        details: '免費/付費額度',
        colors: 'border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
        hoverColors: 'border-gray-600 bg-gray-700 hover:border-gray-500',
        textColor: 'text-yellow-400',
        isFree: true
      },
      openrouter: {
        emoji: '🚀',
        name: 'OpenRouter',
        description: '快速高品質・付費版',
        details: 'Gemini 2.5 Flash Image Preview ($0.03/圖)',
        colors: 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-red-500/20',
        hoverColors: 'border-gray-600 bg-gray-700 hover:border-gray-500',
        textColor: 'text-orange-400',
        isFree: false
      }
    };

    return baseConfigs[service as keyof typeof baseConfigs] || baseConfigs.pollinations;
  };

  // 直接顯示檢測到的服務列表
  const servicesToShow = availableServices;

  return (
    <div className={`service-configuration-panel ${className}`}>
      {/* 插畫風格選擇 - 輕小說專業模式 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          🎨 插畫風格 <span className="text-gray-400">(套用至整個批次)</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setGlobalColorMode('color')}
            className={`p-3 rounded-lg border-2 transition-all ${
              globalColorMode === 'color'
                ? 'border-clay-orange bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🌈</div>
              <div className="font-medium text-white text-sm">彩色插畫</div>
              <div className="text-xs text-gray-400 mt-1">全彩繪圖</div>
            </div>
          </button>

          <button
            onClick={() => setGlobalColorMode('manga')}
            className={`p-3 rounded-lg border-2 transition-all ${
              globalColorMode === 'manga'
                ? 'border-gray-300 bg-gray-800'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📖</div>
              <div className="font-medium text-white text-sm">漫畫線稿</div>
              <div className="text-xs text-gray-400 mt-1">黑白線條</div>
            </div>
          </button>

          <button
            onClick={() => setGlobalColorMode('sketch')}
            className={`p-3 rounded-lg border-2 transition-all ${
              globalColorMode === 'sketch'
                ? 'border-gray-400 bg-gray-800'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">✏️</div>
              <div className="font-medium text-white text-sm">素描風格</div>
              <div className="text-xs text-gray-400 mt-1">灰階素描</div>
            </div>
          </button>
        </div>
      </div>

      {/* 插畫服務選擇器 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          🤖 插畫服務
          <span className="text-gray-400">(選擇生成服務)</span>
          {isDetecting && (
            <span className="ml-2 text-xs text-yellow-400">🔍 檢測中...</span>
          )}
        </label>

        {/* 動態服務網格 - 左側面板優化：2x2 網格 */}
        <div className="grid grid-cols-2 gap-3">
          {servicesToShow.map((service) => {
            const config = getServiceConfig(service as IllustrationProvider);
            const isSelected = illustrationProvider === service;

            return (
              <button
                key={service}
                onClick={() => setIllustrationProvider(service as IllustrationProvider)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected ? config.colors : config.hoverColors
                }`}
                disabled={isDetecting}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{config.emoji}</div>
                  <div className="font-medium text-white text-xs mb-1">{config.name}</div>
                  <div className={`text-xs ${config.textColor} mb-1`}>
                    {config.description}
                  </div>
                  <div className="text-xs text-gray-400">
                    {config.details}
                  </div>

                  {/* 服務品質指標 */}
                  {serviceCapabilities[service] && (
                    <div className="mt-2 flex justify-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        serviceCapabilities[service]?.quality === 'premium'
                          ? 'bg-warm-gold/50/20 text-warm-gold'
                          : serviceCapabilities[service]?.quality === 'high'
                          ? 'bg-warm-gold/20 text-warm-gold'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {serviceCapabilities[service]?.quality === 'premium' ? '👑 頂級' :
                         serviceCapabilities[service]?.quality === 'high' ? '⭐ 高品質' : '✅ 良好'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 提示訊息 */}
        <div className="mt-3 p-3 bg-warm-gold/10 border border-warm-gold rounded-lg">
          <div className="text-sm text-warm-gold">
            💡 <strong>提示：</strong> 需要更多 AI 插畫服務？請前往
            <strong className="text-warm-gold/80 mx-1">設定 → AI 提供者管理</strong> 新增 API 金鑰
          </div>
        </div>
      </div>

      {/* Pollinations 模型和風格選擇 */}
      {illustrationProvider === 'pollinations' && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-300 mb-4">🎨 Pollinations.AI 設定</h4>

          {/* 模型選擇 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">模型選擇</label>
            <select
              value={pollinationsModel}
              onChange={(e) => setPollinationsModel(e.target.value as PollinationsModel)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="flux">Flux - 高品質通用模型 (推薦)</option>
              <option value="gptimage">GPT Image - 支援透明背景</option>
              <option value="kontext">Kontext - 圖像轉換</option>
              <option value="sdxl">Stable Diffusion XL - 經典模型</option>
            </select>
          </div>

          {/* 風格選擇 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">風格選擇</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'anime', label: '動漫', emoji: '🌸' },
                { id: 'realistic', label: '寫實', emoji: '📷' },
                { id: 'fantasy', label: '奇幻', emoji: '🧙‍♂️' },
                { id: 'watercolor', label: '水彩', emoji: '🎨' },
                { id: 'digital_art', label: '數位', emoji: '💻' }
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => setPollinationsStyle(style.id as PollinationsStyle)}
                  className={`p-2 rounded text-xs transition-colors ${
                    pollinationsStyle === style.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div>{style.emoji}</div>
                  <div>{style.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Token 配置 */}
          <div className="pt-4 border-t border-green-700/50">
            <label className="block text-sm text-gray-300 mb-2">
              🔐 API Token <span className="text-green-400">(選填)</span>
              {isPollinationsLoading && <span className="ml-2 text-xs text-yellow-400">處理中...</span>}
              {hasPollinationsToken && <span className="ml-2 text-xs text-green-400">✅ 已設定</span>}
              {!hasPollinationsToken && !isPollinationsLoading && <span className="ml-2 text-xs text-gray-400">未設定</span>}
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={pollinationsTokenInput}
                  onChange={(e) => setPollinationsTokenInput(e.target.value)}
                  placeholder="輸入 Pollinations API Token"
                  disabled={isPollinationsLoading}
                  className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                />
                <button
                  onClick={pollinationsTokenInput.trim() ? handleSavePollinationsToken : handleLoadPollinationsToken}
                  disabled={isPollinationsLoading}
                  className="px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                >
                  {pollinationsTokenInput.trim() ? '儲存' : '載入'}
                </button>
                <button
                  onClick={handleClearPollinationsToken}
                  disabled={isPollinationsLoading || !hasPollinationsToken}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                >
                  清除
                </button>
              </div>
              <p className="text-xs text-green-200">
                💡 API Token 用於身份驗證，可獲得更快速度和高級功能。
                <a
                  href="https://auth.pollinations.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-300 hover:text-green-200 underline ml-1"
                >
                  取得 Token →
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 簡化的 API 狀態顯示 */}
      {requiresApiKey && (
        <div className="mb-6 p-4 bg-warm-gold/10 border border-warm-gold rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-warm-gold font-medium">🔑 API 配置</span>
              {isApiKeyLoaded && apiKeySource !== 'manual' ? (
                <span className="text-green-400 text-sm">
                  ✅ 已從 {apiKeySource === 'gemini' ? 'Gemini' : 'OpenRouter'} 載入
                </span>
              ) : (
                <span className="text-yellow-400 text-sm">⚠️ 需要配置</span>
              )}
            </div>
            <button
              onClick={handleNavigateToAISettings}
              className="px-3 py-1 bg-warm-gold hover:bg-warm-gold text-white text-sm rounded transition-colors"
            >
              前往設定
            </button>
          </div>
          <p className="text-xs text-warm-gold/80 mt-2">
            💡 在 AI 提供者管理中統一配置所有服務的 API 金鑰和詳細設定
          </p>
        </div>
      )}

      {/* 保留 Google Cloud 計費警告但簡化 */}
      {requiresApiKey && showBillingWarning && (illustrationProvider === 'gemini' || illustrationProvider === 'openrouter') && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-500/60 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 20.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-orange-300 mb-2">
                ⚠️ 重要：Google Cloud 計費要求
              </h4>
              <div className="text-sm text-orange-200 space-y-1">
                <p className="font-medium">Imagen API 需要付費的 Google Cloud 帳戶才能使用</p>
                <p className="text-xs text-orange-300 mt-2 font-medium">
                  💡 詳細設定說明請參考 AI 提供者管理中的完整指南
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配置摘要 */}
      {validation && (
        <div className={`p-3 rounded-lg border ${
          validation.isValid
            ? 'bg-green-900/20 border-green-700 text-green-300'
            : 'bg-red-900/20 border-red-700 text-red-300'
        }`}>
          <div className="text-sm font-medium mb-1">
            {validation.isValid ? '✅ 配置完成' : '❌ 配置不完整'}
          </div>
          <div className="text-xs opacity-80">
            服務: {serviceDisplayName} | 風格: {globalColorMode === 'color' ? '彩色插畫' : globalColorMode === 'manga' ? '漫畫線稿' : '素描風格'}
            {configurationSummary && ` | ${configurationSummary}`}
          </div>
        </div>
      )}
    </div>
  );
});

ServiceConfigurationPanel.displayName = 'ServiceConfigurationPanel';

export default ServiceConfigurationPanel;