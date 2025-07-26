import React from 'react';
import { updateUISettings, resetUISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const UISettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">界面設定</h2>
      <button
        onClick={() => dispatch(resetUISettings())}
        className="btn-secondary text-sm"
      >
        重置界面設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">布局</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">側邊欄寬度</label>
          <input
            type="number"
            value={settings.ui.sidebarWidth}
            onChange={(e) => dispatch(updateUISettings({ sidebarWidth: parseInt(e.target.value) }))}
            min="200"
            max="500"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">顯示選項</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showStatusBar"
            checked={settings.ui.showStatusBar}
            onChange={(e) => dispatch(updateUISettings({ showStatusBar: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showStatusBar" className="text-gray-300">顯示狀態欄</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMinimap"
            checked={settings.ui.showMinimap}
            onChange={(e) => dispatch(updateUISettings({ showMinimap: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showMinimap" className="text-gray-300">顯示小地圖</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="animationsEnabled"
            checked={settings.ui.animationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ animationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="animationsEnabled" className="text-gray-300">啟用動畫效果</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="soundEnabled"
            checked={settings.ui.soundEnabled}
            onChange={(e) => dispatch(updateUISettings({ soundEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="soundEnabled" className="text-gray-300">啟用音效</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notificationsEnabled"
            checked={settings.ui.notificationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ notificationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="notificationsEnabled" className="text-gray-300">啟用通知</label>
        </div>
      </div>
    </div>
  </div>
);

export default UISettings;