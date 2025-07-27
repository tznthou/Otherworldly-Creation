import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel } from '../../store/slices/aiSlice';

const AISettingsModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentModel = useAppSelector(state => state.ai.currentModel);
  
  const [settings, setSettings] = useState({
    baseUrl: 'http://127.0.0.1:11434',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    selectedModel: currentModel || '',
  });
  
  const [serviceStatus, setServiceStatus] = useState<{
    available: boolean;
    version?: string;
    models: string[];
    loading: boolean;
  }>({
    available: false,
    models: [],
    loading: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkServiceStatus();
  }, []);

  // 當 currentModel 從 Redux 變更時，更新本地設定
  useEffect(() => {
    setSettings(prev => ({ ...prev, selectedModel: currentModel || '' }));
  }, [currentModel]);

  const checkServiceStatus = async () => {
    try {
      setServiceStatus(prev => ({ ...prev, loading: true }));
      
      const [status, models] = await Promise.all([
        window.electronAPI.ai.getServiceStatus(),
        window.electronAPI.ai.listModels(),
      ]);

      setServiceStatus({
        available: status.service.available,
        version: status.service.version,
        models,
        loading: false,
      });
    } catch (error) {
      console.error('檢查服務狀態失敗:', error);
      setServiceStatus({
        available: false,
        models: [],
        loading: false,
      });
    }
  };

  const handleClose = () => {
    dispatch(closeModal('aiSettings'));
  };

  const handleModelChange = (modelName: string) => {
    setSettings(prev => ({ ...prev, selectedModel: modelName }));
    dispatch(setCurrentModel(modelName));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = await window.electronAPI.ai.updateOllamaConfig(settings);
      
      if (result.success) {
        // 更新選擇的模型
        if (settings.selectedModel && settings.selectedModel !== currentModel) {
          dispatch(setCurrentModel(settings.selectedModel));
        }
        
        dispatch(addNotification({
          type: 'success',
          title: '設定已更新',
          message: 'AI 引擎設定已成功更新',
          duration: 3000,
        }));
        
        // 重新檢查服務狀態
        await checkServiceStatus();
        
        handleClose();
      } else {
        throw new Error(result.error || '更新設定失敗');
      }
    } catch (error) {
      console.error('更新 AI 設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '更新失敗',
        message: error instanceof Error ? error.message : '更新 AI 設定時發生錯誤',
        duration: 5000,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const available = await window.electronAPI.ai.checkOllamaService();
      
      dispatch(addNotification({
        type: available ? 'success' : 'warning',
        title: '連接測試',
        message: available ? 'Ollama 服務連接成功' : 'Ollama 服務連接失敗',
        duration: 3000,
      }));
      
      if (available) {
        await checkServiceStatus();
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '連接測試失敗',
        message: '無法連接到 Ollama 服務',
        duration: 3000,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">AI 引擎設定</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          {/* 服務狀態 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gold-400 mb-4">服務狀態</h3>
            <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
              {serviceStatus.loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse mr-3"></div>
                  <span className="text-gray-300">檢查中...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div 
                      className={`w-4 h-4 rounded-full mr-3 ${
                        serviceStatus.available ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span className="text-gray-300">
                      {serviceStatus.available ? '服務可用' : '服務不可用'}
                    </span>
                    {serviceStatus.version && (
                      <span className="ml-2 text-sm text-gray-400">
                        (版本: {serviceStatus.version})
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    可用模型: {serviceStatus.models.length} 個
                  </div>
                  
                  {serviceStatus.models.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-400 mb-1">模型列表:</div>
                      <div className="flex flex-wrap gap-2">
                        {serviceStatus.models.map(model => (
                          <span 
                            key={model}
                            className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                              settings.selectedModel === model 
                                ? 'bg-gold-500 text-cosmic-900' 
                                : 'bg-cosmic-700 text-gray-300 hover:bg-cosmic-600'
                            }`}
                            onClick={() => handleModelChange(model)}
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                      
                      {settings.selectedModel && (
                        <div className="mt-2 text-sm text-gold-400">
                          已選擇模型: {settings.selectedModel}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4">
                <button
                  onClick={handleTestConnection}
                  className="btn-secondary text-sm"
                >
                  測試連接
                </button>
              </div>
            </div>
          </div>

          {/* 模型選擇 */}
          {serviceStatus.models.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">模型選擇</h3>
              <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                <label className="block text-gray-300 mb-2">選擇 AI 模型</label>
                <select
                  value={settings.selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">請選擇模型...</option>
                  {serviceStatus.models.map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                
                {settings.selectedModel && (
                  <div className="mt-2 text-sm text-gray-400">
                    這個模型將用於 AI 續寫功能
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 連接設定 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gold-400 mb-4">連接設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">服務地址</label>
                <input
                  type="text"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">超時時間 (毫秒)</label>
                <input
                  type="number"
                  value={settings.timeout}
                  onChange={(e) => setSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                  min="5000"
                  max="300000"
                  className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">重試次數</label>
                <input
                  type="number"
                  value={settings.retryAttempts}
                  onChange={(e) => setSettings(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) || 3 }))}
                  min="1"
                  max="10"
                  className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">重試延遲 (毫秒)</label>
                <input
                  type="number"
                  value={settings.retryDelay}
                  onChange={(e) => setSettings(prev => ({ ...prev, retryDelay: parseInt(e.target.value) || 1000 }))}
                  min="100"
                  max="10000"
                  className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* 使用說明 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gold-400 mb-4">使用說明</h3>
            <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4 text-sm text-gray-300">
              <ul className="space-y-2">
                <li>• 確保 Ollama 服務正在運行 (預設端口: 11434)</li>
                <li>• 至少需要安裝一個語言模型才能使用 AI 續寫功能</li>
                <li>• 推薦模型: llama3, qwen, gemma 等中文友好模型</li>
                <li>• 如果連接失敗，請檢查防火牆設定和服務狀態</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end space-x-4">
          <button
            onClick={handleClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;