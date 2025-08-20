import React, { memo } from 'react';
import { useIllustrationService } from '../../../../hooks/illustration';
import type { 
  IllustrationProvider, 
  PollinationsModel, 
  PollinationsStyle, 
  ColorMode 
} from '../../../../hooks/illustration';
import CosmicInput from '../../../UI/CosmicInput';
import CosmicButton from '../../../UI/CosmicButton';

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
 * - 管理 API Key
 * - 色彩模式選擇
 * - 配置驗證和警告
 */
export const ServiceConfigurationPanel: React.FC<ServiceConfigurationPanelProps> = memo(({
  className = '',
  onConfigurationChange,
  showBillingWarning = true
}) => {
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
    
    // API Key 管理
    apiKey,
    setApiKey,
    apiKeySource,
    isApiKeyLoaded,
    loadApiKeyFromProviders,
    clearApiKey,
    
    // 功能
    validateConfiguration,
    
    // 計算值
    isPollinationsFree,
    requiresApiKey,
    serviceDisplayName,
    configurationSummary,
  } = useIllustrationService();

  // 配置變更回調
  React.useEffect(() => {
    if (onConfigurationChange) {
      const validation = validateConfiguration();
      onConfigurationChange({
        provider: illustrationProvider,
        colorMode: globalColorMode,
        pollinationsModel: illustrationProvider === 'pollinations' ? pollinationsModel : undefined,
        pollinationsStyle: illustrationProvider === 'pollinations' ? pollinationsStyle : undefined,
        apiKey,
        isValid: validation.isValid
      });
    }
  }, [
    illustrationProvider, 
    globalColorMode, 
    pollinationsModel, 
    pollinationsStyle, 
    apiKey, 
    validateConfiguration, 
    onConfigurationChange
  ]);

  const validation = validateConfiguration();

  return (
    <div className={`service-configuration-panel ${className}`}>
      {/* 色彩模式選擇 - 全局設定 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          🎨 色彩模式 <span className="text-gray-400">(套用至整個批次)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setGlobalColorMode('color')}
            className={`p-4 rounded-lg border-2 transition-all ${
              globalColorMode === 'color'
                ? 'border-purple-500 bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🌈</div>
              <div className="font-medium text-white">彩色插畫</div>
              <div className="text-xs text-gray-400 mt-1">豐富色彩表現</div>
            </div>
          </button>
          
          <button
            onClick={() => setGlobalColorMode('monochrome')}
            className={`p-4 rounded-lg border-2 transition-all ${
              globalColorMode === 'monochrome'
                ? 'border-gray-400 bg-gray-800'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">⚫⚪</div>
              <div className="font-medium text-white">黑白插畫</div>
              <div className="text-xs text-gray-400 mt-1">經典素描風格</div>
            </div>
          </button>
        </div>
      </div>

      {/* 插畫服務選擇器 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          🤖 插畫服務 <span className="text-gray-400">(選擇生成服務)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIllustrationProvider('pollinations')}
            className={`p-4 rounded-lg border-2 transition-all ${
              illustrationProvider === 'pollinations'
                ? 'border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🆓</div>
              <div className="font-medium text-white">Pollinations.AI</div>
              <div className="text-xs text-green-400 mt-1">完全免費・無需API Key</div>
              <div className="text-xs text-gray-400 mt-1">支援多種風格模型</div>
            </div>
          </button>
          
          <button
            onClick={() => setIllustrationProvider('imagen')}
            className={`p-4 rounded-lg border-2 transition-all ${
              illustrationProvider === 'imagen'
                ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">💎</div>
              <div className="font-medium text-white">Google Imagen</div>
              <div className="text-xs text-blue-400 mt-1">高品質專業級</div>
              <div className="text-xs text-gray-400 mt-1">需要 API Key</div>
            </div>
          </button>
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
          <div>
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
        </div>
      )}

      {/* API Key 管理 (僅限 Imagen) */}
      {requiresApiKey && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API 金鑰 
            {isApiKeyLoaded && apiKeySource !== 'manual' ? (
              <span className="text-green-400 ml-2">
                ✅ 已從 {apiKeySource === 'gemini' ? 'Gemini' : 'OpenRouter'} 載入
              </span>
            ) : (
              <span className="text-red-400"> *</span>
            )}
          </label>
          
          <div className="flex space-x-2">
            <CosmicInput
              type="password"
              value={apiKey}
              onChange={(value) => setApiKey(value)}
              placeholder={
                isApiKeyLoaded && apiKeySource !== 'manual'
                  ? "已自動載入 (可覆寫)" 
                  : "輸入 Google Cloud API 金鑰"
              }
              className="flex-1"
            />
            <CosmicButton
              onClick={loadApiKeyFromProviders}
              variant="secondary"
              size="small"
            >
              🔄 載入
            </CosmicButton>
            {apiKey && (
              <CosmicButton
                onClick={clearApiKey}
                variant="danger"
                size="small"
              >
                🗑️ 清空
              </CosmicButton>
            )}
          </div>
          
          {isApiKeyLoaded && apiKeySource !== 'manual' && (
            <p className="text-xs text-gray-400 mt-1">
              💡 已自動使用 AI 提供者管理中的金鑰，您也可以手動輸入覆寫
            </p>
          )}
        </div>
      )}

      {/* Google Cloud 計費警告 */}
      {requiresApiKey && showBillingWarning && (
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
                <ul className="list-disc list-inside space-y-1 mt-2 text-xs text-orange-100">
                  <li>需要有效的 Google Cloud API 金鑰</li>
                  <li>必須啟用 Imagen API 服務</li>
                  <li className="font-medium text-orange-200">⭐ 必須設定付費方式（計費帳戶）</li>
                  <li>在 Google Cloud Console 中完成所有設定</li>
                </ul>
                <p className="text-xs text-orange-300 mt-2 font-medium">
                  💡 如果遇到計費錯誤，系統會提供詳細的設定說明
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配置驗證結果 */}
      {!validation.isValid && (
        <div className="mb-6 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-300">
          <div className="font-medium mb-1">配置錯誤：</div>
          <ul className="list-disc list-inside text-sm">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 配置摘要 */}
      <div className="mt-4 p-3 bg-cosmic-800/50 rounded-lg">
        <div className="text-sm text-cosmic-300">
          <div className="font-medium mb-1">當前配置：</div>
          <div>{configurationSummary}</div>
          {validation.isValid ? (
            <div className="text-green-400 text-xs mt-1">✅ 配置有效</div>
          ) : (
            <div className="text-red-400 text-xs mt-1">❌ 配置無效</div>
          )}
        </div>
      </div>

      {/* 服務狀態指示 */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isPollinationsFree ? 'bg-green-500' : 'bg-blue-500'
          } animate-pulse`}></div>
          <span className="text-cosmic-400">
            {serviceDisplayName} 
            {isPollinationsFree ? ' - 免費服務' : ' - 付費服務'}
          </span>
        </div>
        <div className="text-cosmic-500">
          {validation.isValid ? '服務可用' : '需要配置'}
        </div>
      </div>
    </div>
  );
});

ServiceConfigurationPanel.displayName = 'ServiceConfigurationPanel';

export default ServiceConfigurationPanel;