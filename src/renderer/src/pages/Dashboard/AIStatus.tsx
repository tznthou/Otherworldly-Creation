import React from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { checkOllamaService, fetchServiceStatus, fetchModelsInfo } from '../../store/slices/aiSlice';

const AIStatus: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isOllamaConnected, availableModels, currentModel } = useAppSelector(state => state.ai);

  const handleRefreshConnection = async () => {
    await dispatch(checkOllamaService());
    if (isOllamaConnected) {
      dispatch(fetchAvailableModels());
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-cosmic text-gold-500">AI 引擎狀態</h2>
        <button
          onClick={handleRefreshConnection}
          className="btn-secondary text-sm px-4 py-2"
        >
          🔄 重新檢測
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 連接狀態 */}
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl ${
            isOllamaConnected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {isOllamaConnected ? '✅' : '❌'}
          </div>
          <h3 className="font-medium mb-1">Ollama 服務</h3>
          <p className={`text-sm ${
            isOllamaConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            {isOllamaConnected ? '已連接' : '未連接'}
          </p>
        </div>

        {/* 可用模型 */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto mb-3 flex items-center justify-center text-2xl">
            🤖
          </div>
          <h3 className="font-medium mb-1">可用模型</h3>
          <p className="text-sm text-gray-400">
            {availableModels.length} 個模型
          </p>
        </div>

        {/* 當前模型 */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 mx-auto mb-3 flex items-center justify-center text-2xl">
            ⚡
          </div>
          <h3 className="font-medium mb-1">當前模型</h3>
          <p className="text-sm text-gray-400 truncate">
            {currentModel || '未選擇'}
          </p>
        </div>
      </div>

      {/* 詳細資訊 */}
      {isOllamaConnected && availableModels.length > 0 && (
        <div className="mt-6 pt-6 border-t border-cosmic-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">可用模型列表</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableModels.map((model) => (
              <div
                key={model}
                className={`px-3 py-2 rounded-lg text-sm ${
                  model === currentModel
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                    : 'bg-cosmic-800 text-gray-300'
                }`}
              >
                {model}
                {model === currentModel && (
                  <span className="ml-2 text-xs">（當前）</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未連接時的幫助資訊 */}
      {!isOllamaConnected && (
        <div className="mt-6 pt-6 border-t border-cosmic-700">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-yellow-400 font-medium mb-2">🔧 需要安裝 Ollama</h4>
            <p className="text-sm text-gray-300 mb-3">
              創世紀元需要 Ollama 來提供本地 AI 功能。請按照以下步驟安裝：
            </p>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>前往 <span className="text-gold-400">ollama.ai</span> 下載 Ollama</li>
              <li>安裝完成後，在終端機執行 <code className="bg-cosmic-800 px-2 py-1 rounded">ollama serve</code></li>
              <li>下載中文模型：<code className="bg-cosmic-800 px-2 py-1 rounded">ollama pull llama3.2</code></li>
              <li>點擊上方的「重新檢測」按鈕</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStatus;