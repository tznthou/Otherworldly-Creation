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
          <div className="flex items-start justify-between opacity-50">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-gray-500 font-medium">擴展AI插圖服務 (已遷移)</span>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/50">
                  🔄 已遷移
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input
                type="checkbox"
                checked={false}
                disabled={true}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="border-t border-cosmic-600 pt-4">
            <div className="flex items-start justify-between opacity-50">
              <div className="flex-1 mr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-gray-500 font-medium">智能API檢測 (已遷移)</span>
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/50">
                    🔄 已遷移
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={false}
                  disabled={true}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">📚 電子書功能設定</h3>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-gray-300 font-medium">電子書虛擬檔名對應系統</span>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-700/50">
                  🧪 實驗功能
                </div>
              </div>
              <p className="text-sm text-gray-400">
                允許為圖片設定語意化檔名（如 "ch01-hero-awakening.jpg"）而不修改原始檔案。
                導出電子書時動態重命名，保持原檔案安全。
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>• <strong>安全性：</strong>原始檔案保持 UUID 名稱不變</div>
                <div>• <strong>便利性：</strong>電子書中顯示語意化檔名</div>
                <div>• <strong>靈活性：</strong>支援批次重命名和分類管理</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ebookVirtualNaming || false}
                onChange={(e) => dispatch(updateSettings({ ebookVirtualNaming: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
            </label>
          </div>

          {settings.ebookVirtualNaming && (
            <div className="border-t border-cosmic-600 pt-4 bg-blue-900/10 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-300 mb-3">⚙️ 功能配置</h4>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex items-center justify-between">
                  <span>自動生成語意化檔名</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>保留原始檔案不變</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>導出時動態重命名</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 text-xs font-medium">實驗功能提醒</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      此功能目前為實驗性質，建議在重要專案使用前先進行測試。
                      所有虛擬檔名資料儲存在資料庫中，不會影響原始圖片檔案。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;