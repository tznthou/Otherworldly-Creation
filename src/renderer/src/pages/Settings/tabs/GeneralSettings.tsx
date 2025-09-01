import React from 'react';
import { updateSettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';
import { useI18n } from '../../../hooks/useI18n';

const GeneralSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => {
  const { t } = useI18n();
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-cosmic text-gold-500 mb-6">{t('settings.general.title')}</h2>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">語言與地區設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">界面語言</label>
            <div className="relative">
              <select
                value={settings.language}
                onChange={(e) => dispatch(updateSettings({ language: e.target.value as 'zh-TW' | 'zh-CN' | 'en' | 'ja' }))}
                className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 appearance-none cursor-pointer"
                disabled
              >
                <option value="zh-TW">繁體中文</option>
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              ⚠️ 語言切換功能開發中，目前僅支援繁體中文界面
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">編輯器設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300">自動儲存</span>
              <p className="text-sm text-gray-400">編輯器內容每 2 秒自動儲存</p>
            </div>
            <div className="flex items-center text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm">已啟用</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">
            💡 自動儲存功能已內建於編輯器中，無需手動設定
          </p>
        </div>
      </div>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">🎨 AI 插畫功能設定</h3>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-gray-300 font-medium">擴展AI插圖服務</span>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  settings.features?.extendedIllustrationServices 
                    ? 'bg-green-900/30 text-green-400 border border-green-700/50' 
                    : 'bg-gray-800/30 text-gray-500 border border-gray-700/50'
                }`}>
                  {settings.features?.extendedIllustrationServices ? '✅ 已啟用' : '⭕ 已停用'}
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                啟用後可使用 6 個 AI 提供商：Pollinations、Imagen、Gemini Flash、Gemini Flash Image、OpenRouter Free/Pro
              </p>
              <p className="text-xs text-gray-500">
                關閉後只顯示基本的 2 個服務（Pollinations、Imagen）
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features?.extendedIllustrationServices || false}
                onChange={(e) => dispatch(updateSettings({
                  features: {
                    ...settings.features,
                    extendedIllustrationServices: e.target.checked
                  }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
            </label>
          </div>
          
          <div className="border-t border-cosmic-600 pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-gray-300 font-medium">智能API檢測</span>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    settings.features?.smartApiDetection 
                      ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50' 
                      : 'bg-gray-800/30 text-gray-500 border border-gray-700/50'
                  }`}>
                    {settings.features?.smartApiDetection ? '🧠 智能' : '📋 手動'}
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  自動檢測已配置的 API 金鑰並推薦可用服務
                </p>
                <p className="text-xs text-gray-500">
                  提供服務品質指標（頂級/高品質/良好）和智能推薦
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.features?.smartApiDetection || false}
                  onChange={(e) => dispatch(updateSettings({
                    features: {
                      ...settings.features,
                      smartApiDetection: e.target.checked
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          <div className="bg-cosmic-700/30 border border-cosmic-600/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-yellow-400">💡</span>
              <span className="text-sm font-medium text-yellow-300">功能說明</span>
            </div>
            <ul className="text-xs text-gray-400 space-y-1 ml-6">
              <li>• 這些設定會即時影響 AI 插畫功能的可用選項</li>
              <li>• 建議新手保持預設開啟狀態，獲得最完整的功能體驗</li>
              <li>• 高級用戶可根據需要關閉部分功能以簡化介面</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;