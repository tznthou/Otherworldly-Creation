import React from 'react';
import { TaskPriority } from '../../../types/illustration';
import { useBatchConfiguration } from '../../../hooks/illustration';
import CosmicInput from '../../UI/CosmicInput';
// import { Alert } from '../../UI/Alert'; // TODO: Remove if not needed

interface BatchConfigurationSectionProps {
  batchConfig: ReturnType<typeof useBatchConfiguration>;
  className?: string;
}

const BatchConfigurationSection: React.FC<BatchConfigurationSectionProps> = ({
  batchConfig,
  className = ''
}) => {
  return (
    <div className={`bg-gray-800 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">批次設定</h3>
        {/* 配置驗證狀態 */}
        <div className="flex items-center space-x-2">
          {batchConfig.isValidConfiguration ? (
            <div className="flex items-center space-x-1 text-green-400">
              <span>✅</span>
              <span className="text-sm">配置有效</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-400">
              <span>❌</span>
              <span className="text-sm">{batchConfig.validation.errors.length} 個錯誤</span>
            </div>
          )}
          {batchConfig.validation.warnings.length > 0 && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <span>⚠️</span>
              <span className="text-sm">{batchConfig.validation.warnings.length} 個警告</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 色彩模式選擇 - 全局設定 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          🎨 色彩模式 <span className="text-gray-400">(套用至整個批次)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => batchConfig.setGlobalColorMode('color')}
            className={`p-4 rounded-lg border-2 transition-all ${
              batchConfig.globalColorMode === 'color'
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
            onClick={() => batchConfig.setGlobalColorMode('monochrome')}
            className={`p-4 rounded-lg border-2 transition-all ${
              batchConfig.globalColorMode === 'monochrome'
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
            onClick={() => batchConfig.setIllustrationProvider('pollinations')}
            className={`p-4 rounded-lg border-2 transition-all ${
              batchConfig.illustrationProvider === 'pollinations'
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
            onClick={() => batchConfig.setIllustrationProvider('imagen')}
            className={`p-4 rounded-lg border-2 transition-all ${
              batchConfig.illustrationProvider === 'imagen'
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
      {batchConfig.illustrationProvider === 'pollinations' && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
          <h4 className="text-sm font-medium text-green-300 mb-4">🎨 Pollinations.AI 設定</h4>
          
          {/* 模型選擇 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">模型選擇</label>
            <select
              value={batchConfig.pollinationsModel}
              onChange={(e) => batchConfig.setPollinationsModel(e.target.value as 'flux' | 'gptimage' | 'kontext' | 'sdxl')}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
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
                  onClick={() => batchConfig.setPollinationsStyle(style.id as typeof batchConfig.pollinationsStyle)}
                  className={`p-2 rounded text-xs transition-colors ${
                    batchConfig.pollinationsStyle === style.id
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            批次名稱 <span className="text-red-400">*</span>
          </label>
          <CosmicInput
            value={batchConfig.batchName}
            onChange={(value) => batchConfig.setBatchName(value)}
            placeholder="例如：角色立繪批次01"
          />
          {/* 驗證錯誤提示 */}
          {batchConfig.validation.errors
            .filter(error => error.field === 'batchName')
            .map((error, index) => (
              <div key={index} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{error.message}</span>
              </div>
            ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            優先級
          </label>
          <select
            value={batchConfig.batchPriority}
            onChange={(e) => batchConfig.setBatchPriority(parseInt(e.target.value) as TaskPriority)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={TaskPriority.Low}>低</option>
            <option value={TaskPriority.Normal}>普通</option>
            <option value={TaskPriority.High}>高</option>
            <option value={TaskPriority.Critical}>重要</option>
            <option value={TaskPriority.Urgent}>緊急</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            最大並行數
          </label>
          <CosmicInput
            type="number"
            value={batchConfig.maxParallel.toString()}
            onChange={(value) => batchConfig.setMaxParallel(parseInt(value) || 1)}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">同時執行的任務數量</p>
            <button
              type="button"
              onClick={() => batchConfig.setMaxParallel(batchConfig.getRecommendedMaxParallel())}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              建議: {batchConfig.getRecommendedMaxParallel()}
            </button>
          </div>
          {/* 驗證錯誤和警告提示 */}
          {batchConfig.validation.errors
            .filter(error => error.field === 'maxParallel')
            .map((error, index) => (
              <div key={`error-${index}`} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{error.message}</span>
              </div>
            ))}
          {batchConfig.validation.warnings
            .filter(warning => warning.field === 'maxParallel')
            .map((warning, index) => (
              <div key={`warning-${index}`} className="mt-1 text-sm text-yellow-400 flex items-center space-x-1">
                <span>⚡</span>
                <span>{warning.message}</span>
              </div>
            ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API 金鑰 
            {batchConfig.apiKeySource !== 'manual' ? (
              <span className="text-green-400 ml-2">
                ✅ 已從 {batchConfig.apiKeySource === 'gemini' ? 'Gemini' : 'OpenRouter'} 載入
              </span>
            ) : (
              <span className="text-red-400"> *</span>
            )}
          </label>
          <CosmicInput
            type="password"
            value={batchConfig.apiKey}
            onChange={(value) => {
              batchConfig.setApiKey(value);
              batchConfig.setApiKeySource('manual');
            }}
            placeholder={
              batchConfig.apiKeySource !== 'manual' 
                ? "已自動載入 (可覆寫)" 
                : "輸入 Google Cloud API 金鑰"
            }
          />
          {batchConfig.apiKeySource !== 'manual' && (
            <p className="text-xs text-gray-400 mt-1">
              💡 已自動使用 AI 提供者管理中的金鑰，您也可以手動輸入覆寫
            </p>
          )}
          {/* API 金鑰驗證提示 */}
          {batchConfig.validation.errors
            .filter(error => error.field === 'apiKey')
            .map((error, index) => (
              <div key={`error-${index}`} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                <span>⚠️</span>
                <span>{error.message}</span>
              </div>
            ))}
          {batchConfig.validation.warnings
            .filter(warning => warning.field === 'apiKey')
            .map((warning, index) => (
              <div key={`warning-${index}`} className="mt-1 text-sm text-yellow-400 flex items-center space-x-1">
                <span>⚡</span>
                <span>{warning.message}</span>
              </div>
            ))}
          
          {/* Google Cloud 計費警告 */}
          {batchConfig.illustrationProvider === 'imagen' && (
            <div className="mt-3 p-4 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-500/60 rounded-lg">
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
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          批次描述
        </label>
        <textarea
          value={batchConfig.batchDescription}
          onChange={(e) => batchConfig.setBatchDescription(e.target.value)}
          placeholder="可選：描述這個批次的用途"
          rows={2}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>

      {/* 配置管理功能 */}
      <div className="mt-6 p-4 bg-gray-750 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-300 font-medium">⚙️ 配置管理</span>
            <span className="text-xs text-gray-400">({batchConfig.getConfigurationSummary()})</span>
          </div>
          <div className="flex items-center space-x-2">
            {/* 重置按鈕 */}
            <button
              onClick={() => {
                if (confirm('確定要重置為預設配置嗎？這會清除所有當前設定。')) {
                  batchConfig.resetToDefaults();
                }
              }}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-yellow-100 text-xs rounded transition-colors"
              title="重置為預設配置"
            >
              🔄 重置
            </button>
            
            {/* 匯出按鈕 */}
            <button
              onClick={() => {
                const config = batchConfig.exportConfiguration();
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `batch-config-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 text-green-100 text-xs rounded transition-colors"
              title="匯出配置到檔案"
            >
              📤 匯出
            </button>
            
            {/* 匯入按鈕 */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e: Event) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const config = JSON.parse(event.target?.result as string);
                        batchConfig.importConfiguration(config);
                        alert('配置匯入成功！');
                      } catch (_error) {
                        alert('匯入失敗：無效的配置檔案格式');
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-blue-100 text-xs rounded transition-colors"
              title="從檔案匯入配置"
            >
              📥 匯入
            </button>
          </div>
        </div>
        
        {/* 配置摘要顯示 */}
        <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
          <strong>當前配置摘要：</strong> {batchConfig.getConfigurationSummary()}
        </div>
      </div>
    </div>
  );
};

export default BatchConfigurationSection;