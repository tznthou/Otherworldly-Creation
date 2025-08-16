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
    </div>
  );
};

export default GeneralSettings;