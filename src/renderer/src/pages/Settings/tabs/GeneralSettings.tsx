import React from 'react';
import { useAppDispatch } from '../../../hooks/redux';
import { updateSettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const GeneralSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-cosmic text-gold-500 mb-6">一般設定</h2>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">語言與地區</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">界面語言</label>
          <select
            value={settings.language}
            onChange={(e) => dispatch(updateSettings({ language: e.target.value as any }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">自動儲存</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoSave"
            checked={settings.autoSave}
            onChange={(e) => dispatch(updateSettings({ autoSave: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="autoSave" className="text-gray-300">啟用自動儲存</label>
        </div>
        
        {settings.autoSave && (
          <div>
            <label className="block text-gray-300 mb-2">自動儲存間隔 (秒)</label>
            <input
              type="number"
              value={settings.autoSaveInterval / 1000}
              onChange={(e) => dispatch(updateSettings({ autoSaveInterval: parseInt(e.target.value) * 1000 }))}
              min="1"
              max="300"
              className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

export default GeneralSettings;