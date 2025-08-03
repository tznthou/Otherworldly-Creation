import React from 'react';
import { updateAISettings, resetAISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';
import { api } from '../../../api';

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
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">Ollama 服務設定</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-gray-300 mb-2">服務端點 URL</label>
          <input
            type="text"
            value={settings.ai.ollamaBaseUrl}
            onChange={(e) => dispatch(updateAISettings({ ollamaBaseUrl: e.target.value }))}
            placeholder="http://127.0.0.1:11434"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <p className="text-sm text-gray-400 mt-1">Ollama 服務的 API 端點位址</p>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">請求超時時間 (秒)</label>
          <input
            type="number"
            value={settings.ai.ollamaTimeout}
            onChange={(e) => dispatch(updateAISettings({ ollamaTimeout: parseInt(e.target.value) }))}
            min="30"
            max="600"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <p className="text-sm text-gray-400 mt-1">AI 生成請求的最大等待時間</p>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">重試次數</label>
          <input
            type="number"
            value={settings.ai.ollamaRetryAttempts}
            onChange={(e) => dispatch(updateAISettings({ ollamaRetryAttempts: parseInt(e.target.value) }))}
            min="0"
            max="10"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <p className="text-sm text-gray-400 mt-1">請求失敗時的重試次數</p>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">重試延遲 (毫秒)</label>
          <input
            type="number"
            value={settings.ai.ollamaRetryDelay}
            onChange={(e) => dispatch(updateAISettings({ ollamaRetryDelay: parseInt(e.target.value) }))}
            min="500"
            max="10000"
            step="500"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          <p className="text-sm text-gray-400 mt-1">重試之間的等待時間</p>
        </div>
        
        <div className="md:col-span-2 mt-4">
          <button
            onClick={async () => {
              try {
                await api.ai.updateOllamaConfig({
                  baseUrl: settings.ai.ollamaBaseUrl,
                  timeout: settings.ai.ollamaTimeout,
                  retryAttempts: settings.ai.ollamaRetryAttempts,
                  retryDelay: settings.ai.ollamaRetryDelay,
                  selectedModel: settings.ai.selectedModel || 'llama3.2',
                });
                // 可以在這裡添加成功通知
              } catch (error) {
                console.error('更新 Ollama 配置失敗:', error);
                // 可以在這裡添加錯誤通知
              }
            }}
            className="btn-primary"
          >
            套用配置變更
          </button>
          <p className="text-sm text-gray-400 mt-2">點擊套用以更新 Ollama 服務的運行時配置</p>
        </div>
      </div>
    </div>
  </div>
);

export default AISettings;