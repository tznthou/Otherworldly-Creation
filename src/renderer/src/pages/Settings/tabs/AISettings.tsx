import React from 'react';
import { updateAISettings, resetAISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';

const AISettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">AI 設定</h2>
      <button
        onClick={() => dispatch(resetAISettings())}
        className="btn-secondary text-sm"
      >
        重置 AI 設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">模型設定</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">預設模型</label>
          <input
            type="text"
            value={settings.ai.defaultModel}
            onChange={(e) => dispatch(updateAISettings({ defaultModel: e.target.value }))}
            placeholder="llama3"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">上下文長度</label>
          <input
            type="number"
            value={settings.ai.contextLength}
            onChange={(e) => dispatch(updateAISettings({ contextLength: parseInt(e.target.value) }))}
            min="1000"
            max="32000"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">生成參數</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">溫度 ({settings.ai.temperature})</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.ai.temperature}
            onChange={(e) => dispatch(updateAISettings({ temperature: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">Top P ({settings.ai.topP})</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai.topP}
            onChange={(e) => dispatch(updateAISettings({ topP: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">最大 Token 數</label>
          <input
            type="number"
            value={settings.ai.maxTokens}
            onChange={(e) => dispatch(updateAISettings({ maxTokens: parseInt(e.target.value) }))}
            min="50"
            max="2000"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">自動完成</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAutoComplete"
            checked={settings.ai.enableAutoComplete}
            onChange={(e) => dispatch(updateAISettings({ enableAutoComplete: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableAutoComplete" className="text-gray-300">啟用自動完成</label>
        </div>
        
        {settings.ai.enableAutoComplete && (
          <div>
            <label className="block text-gray-300 mb-2">自動完成延遲 (毫秒)</label>
            <input
              type="number"
              value={settings.ai.autoCompleteDelay}
              onChange={(e) => dispatch(updateAISettings({ autoCompleteDelay: parseInt(e.target.value) }))}
              min="500"
              max="5000"
              className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AISettings;