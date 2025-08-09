import React from 'react';
import { updatePrivacySettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const PrivacySettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-cosmic text-gold-500">隱私設定</h2>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">資料收集</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableTelemetry"
            checked={settings.privacy.enableTelemetry}
            onChange={(e) => dispatch(updatePrivacySettings({ enableTelemetry: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableTelemetry" className="text-gray-300">
            啟用遙測資料收集
            <span className="block text-xs text-orange-400 mt-1">⚠️ 功能未實作 - 需要添加實際遙測邏輯</span>
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableCrashReporting"
            checked={settings.privacy.enableCrashReporting}
            onChange={(e) => dispatch(updatePrivacySettings({ enableCrashReporting: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableCrashReporting" className="text-gray-300">
            啟用錯誤報告
            <span className="block text-xs text-orange-400 mt-1">⚠️ 功能未實作 - 需要添加錯誤上傳機制</span>
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableUsageAnalytics"
            checked={settings.privacy.enableUsageAnalytics}
            onChange={(e) => dispatch(updatePrivacySettings({ enableUsageAnalytics: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableUsageAnalytics" className="text-gray-300">
            啟用使用情況分析
            <span className="block text-xs text-orange-400 mt-1">⚠️ 功能未實作 - 需要添加使用統計追蹤</span>
          </label>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-cosmic-700 rounded-lg">
        <p className="text-sm text-gray-400">
          這些設定幫助我們改善產品品質。所有資料都會匿名處理，不會包含您的創作內容。
        </p>
      </div>
    </div>
  </div>
);

export default PrivacySettings;