import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { setCurrentModel, setCurrentProvider, setDefaultProvider, setDefaultModel } from '../../store/slices/aiSlice';
import ConfirmDialog from '../UI/ConfirmDialog';
import { api } from '../../api';
import type { 
  AIProvider, 
  CreateAIProviderRequest, 
  UpdateAIProviderRequest,
  AIProviderTestResult
} from '../../api/models';

const AISettingsModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, AIProviderTestResult>>({});
  const [supportedTypes, setSupportedTypes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<Record<string, Array<{id: string; name: string}>>>({});
  const [isLoadingModels, setIsLoadingModels] = useState<Record<string, boolean>>({});
  
  // 新增提供者表單狀態
  const [newProvider, setNewProvider] = useState<CreateAIProviderRequest>({
    name: '',
    provider_type: 'ollama',
    model: '',
    is_enabled: true,
  });
  
  // 編輯提供者表單狀態
  const [editProvider, setEditProvider] = useState<UpdateAIProviderRequest | null>(null);
  
  // 刪除確認狀態
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean; provider: AIProvider | null}>({
    show: false,
    provider: null
  });

  const loadProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.aiProviders.getAll();
      if (response.success && response.providers) {
        setProviders(response.providers);
        
        // 選擇第一個啟用的提供者
        const activeProvider = response.providers.find(p => p.is_enabled);
        if (activeProvider) {
          setSelectedProvider(activeProvider);
        }
      }
    } catch (_error) {
      console.error('載入AI提供者失敗:', _error);
      dispatch(addNotification({
        type: 'error',
        title: '載入失敗',
        message: '無法載入 AI 提供者列表',
        duration: 3000,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const loadSupportedTypes = useCallback(async () => {
    try {
      const types = await api.aiProviders.getSupportedTypes();
      setSupportedTypes(types);
    } catch (_error) {
      console.error('載入支援類型失敗:', _error);
    }
  }, []);

  useEffect(() => {
    loadProviders();
    loadSupportedTypes();
  }, [loadProviders, loadSupportedTypes]);

  const searchAvailableModels = async (providerType: string, apiKey?: string, endpoint?: string): Promise<Array<{id: string; name: string}>> => {
    try {
      // 根據提供者類型設置預設端點
      let finalEndpoint = endpoint;
      if (!finalEndpoint) {
        switch (providerType) {
          case 'ollama':
            finalEndpoint = 'http://127.0.0.1:11434';
            break;
          case 'openrouter':
            finalEndpoint = 'https://openrouter.ai/api/v1';
            break;
          default:
            finalEndpoint = undefined; // OpenAI, Gemini, Claude 不需要自定義端點
            break;
        }
      }
      
      // 創建臨時提供者配置來測試連接
      // 為不同 provider 類型設置有效的預設模型名稱
      const getDefaultModelName = (type: string): string => {
        switch (type) {
          case 'gemini': return 'gemini-2.5-flash';
          case 'openai': return 'gpt-3.5-turbo';
          case 'claude': return 'claude-3-sonnet-20240229';
          case 'openrouter': return 'openai/gpt-3.5-turbo';
          case 'ollama': return 'llama3.2'; // Ollama 使用常見模型名
          default: return 'default-model';
        }
      };
      
      const tempProvider: CreateAIProviderRequest = {
        name: `temp-${providerType}`,
        provider_type: providerType,
        model: getDefaultModelName(providerType),
        api_key: apiKey,
        endpoint: finalEndpoint,
        is_enabled: true,
      };
      
      // 先創建臨時提供者
      const createResponse = await api.aiProviders.create(tempProvider);
      
      if (createResponse.success && createResponse.data) {
        try {
          // 測試連接並獲取模型列表
          const testResult = await api.aiProviders.test(createResponse.data.id);
          
          if (testResult.success && testResult.models) {
            // 轉換模型格式
            const models = testResult.models.map((model: unknown) => {
              const modelObj = model as Record<string, unknown>;
              return {
                id: String(modelObj.id || modelObj.name || model),
                name: String(modelObj.name || modelObj.id || model)
              };
            });
            
            dispatch(addNotification({
              type: 'success',
              title: '模型搜尋成功',
              message: `找到 ${models.length} 個可用模型`,
              duration: 3000,
            }));
            
            return models;
          } else {
            throw new Error(testResult.error || '無法獲取模型列表');
          }
        } finally {
          // 刪除臨時提供者
          await api.aiProviders.delete(createResponse.data.id);
        }
      } else {
        throw new Error(createResponse.error || '無法創建臨時提供者');
      }
      
    } catch (error) {
      console.error('搜尋模型失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '模型搜尋失敗',
        message: error instanceof Error ? error.message : '無法搜尋可用模型',
        duration: 3000,
      }));
      
      return [];
    }
  };

  const handleClose = () => {
    dispatch(closeModal('aiSettings'));
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      const result = await api.aiProviders.test(providerId);
      setTestResults(prev => ({ ...prev, [providerId]: result }));
      
      dispatch(addNotification({
        type: result.success ? 'success' : 'warning',
        title: '連接測試',
        message: result.success ? `${result.provider_type} 連接成功` : `連接失敗: ${result.error}`,
        duration: 3000,
      }));
    } catch (_error) {
      dispatch(addNotification({
        type: 'error',
        title: '測試失敗',
        message: '無法測試提供者連接',
        duration: 3000,
      }));
    }
  };

  // 🔥 新增：測試動態模型獲取功能
  const handleTestModels = async (providerId: string) => {
    try {
      dispatch(addNotification({
        type: 'info',
        title: '獲取模型',
        message: '正在獲取可用模型列表...',
        duration: 2000,
      }));

      const result = await api.aiProviders.getAvailableModels(providerId);
      
      if (result.success && result.models) {
        console.log('🔥 動態模型獲取成功:', result.models);
        dispatch(addNotification({
          type: 'success',
          title: '模型獲取成功',
          message: `成功獲取 ${result.models.length} 個可用模型`,
          duration: 3000,
        }));
        
        // 記錄到控制台供檢查
        result.models.forEach((model, index) => {
          console.log(`模型 ${index + 1}:`, model);
        });
      } else {
        dispatch(addNotification({
          type: 'warning',
          title: '模型獲取失敗',
          message: result.error || '無法獲取模型列表',
          duration: 3000,
        }));
      }
    } catch (error) {
      console.error('模型獲取錯誤:', error);
      dispatch(addNotification({
        type: 'error',
        title: '模型獲取失敗',
        message: '獲取模型列表時發生錯誤',
        duration: 3000,
      }));
    }
  };

  const handleCreateProvider = async () => {
    try {
      setIsSubmitting(true);
      const response = await api.aiProviders.create(newProvider);
      
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          title: '新增成功',
          message: `AI 提供者 "${newProvider.name}" 已新增`,
          duration: 3000,
        }));
        
        // ✅ 修復：如果新Provider是啟用狀態，直接設為當前模型
        if (newProvider.is_enabled) {
          dispatch(setCurrentModel(newProvider.model));
          dispatch(addNotification({
            type: 'info',
            title: '模型已切換',
            message: `當前AI模型已切換至 ${newProvider.model}`,
            duration: 2000,
          }));
        }
        
        setShowAddForm(false);
        setNewProvider({
          name: '',
          provider_type: 'ollama',
          model: '',
          is_enabled: true,
        });
        await loadProviders();
      } else {
        throw new Error(response.error || '新增失敗');
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '新增失敗',
        message: error instanceof Error ? error.message : '新增 AI 提供者時發生錯誤',
        duration: 3000,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProvider = async (updatedProvider: UpdateAIProviderRequest) => {
    try {
      setIsSubmitting(true);
      // 如果沒有提供新的API金鑰，則不包含在更新請求中（保留原有的）
      const updateData = { ...updatedProvider };
      if (!updateData.api_key) {
        delete updateData.api_key;
      }
      const response = await api.aiProviders.update(updateData);
      
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          title: '更新成功',
          message: 'AI 提供者設定已更新',
          duration: 3000,
        }));
        
        // 如果更新的Provider被設為啟用狀態，且模型有變化，更新當前模型
        if (updatedProvider.is_enabled && updatedProvider.model) {
          dispatch(setCurrentModel(updatedProvider.model));
          dispatch(addNotification({
            type: 'info',
            title: '模型已切換',
            message: `當前AI模型已切換至 ${updatedProvider.model}`,
            duration: 2000,
          }));
        }
        
        setEditProvider(null);
        await loadProviders();
      } else {
        throw new Error(response.error || '更新失敗');
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '更新失敗',
        message: error instanceof Error ? error.message : '更新 AI 提供者時發生錯誤',
        duration: 3000,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    const providerToDelete = providers.find(p => p.id === providerId);
    if (!providerToDelete) return;
    
    // 顯示確認對話框
    setDeleteConfirm({
      show: true,
      provider: providerToDelete
    });
  };
  
  // 設為當前模型
  const handleSetCurrentModel = (provider: AIProvider) => {
    // 先設定當前提供者，再設定模型
    dispatch(setCurrentProvider(provider.id));
    dispatch(setCurrentModel(provider.model));
    dispatch(addNotification({
      type: 'success',
      title: '模型已切換',
      message: `當前AI模型已切換至 ${provider.name} (${provider.model})`,
      duration: 2000,
    }));
  };
  const handleSetDefaultProvider = (provider: AIProvider) => {
    // 設定預設提供者和模型
    dispatch(setDefaultProvider(provider.id));
    dispatch(setDefaultModel(provider.model));
    dispatch(addNotification({
      type: 'success',
      title: '預設模型已設定',
      message: `已將 ${provider.name} (${provider.model}) 設為預設 AI 模型`,
      duration: 2000,
    }));
  };
  
  // 確認刪除的實際邏輯
  const confirmDeleteProvider = async () => {
    const { provider } = deleteConfirm;
    if (!provider) return;

    try {
      const response = await api.aiProviders.delete(provider.id);
      
      if (response.success) {
        dispatch(addNotification({
          type: 'success',
          title: '刪除成功',
          message: 'AI 提供者已刪除',
          duration: 3000,
        }));
        
        await loadProviders();
        
        // 如果刪除的是當前選擇的提供者，重新選擇
        if (selectedProvider?.id === provider.id) {
          const remaining = providers.filter(p => p.id !== provider.id);
          setSelectedProvider(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (_error) {
      dispatch(addNotification({
        type: 'error',
        title: '刪除失敗',
        message: '刪除 AI 提供者時發生錯誤',
        duration: 3000,
      }));
    } finally {
      // 關閉確認對話框
      setDeleteConfirm({ show: false, provider: null });
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'gemini': return '✨';
      case 'claude': return '🧠';
      case 'openrouter': return '🔄';
      case 'ollama': return '🦙';
      default: return '🤖';
    }
  };

  const renderProviderForm = (provider?: AIProvider, isEdit = false) => {
    const formData = isEdit && editProvider ? {
      ...editProvider,
      provider_type: editProvider.provider_type || provider?.provider_type || 'ollama'
    } : newProvider;
    const setFormData = isEdit 
      ? (data: Partial<UpdateAIProviderRequest>) => setEditProvider({ ...editProvider!, ...data })
      : (data: Partial<CreateAIProviderRequest>) => setNewProvider({ ...newProvider, ...data });

    // 為當前表單生成唯一標識
    const formId = `${formData.provider_type}-${isEdit ? 'edit' : 'new'}`;
    const currentAvailableModels = availableModels[formId] || [];
    const isSearchingModels = isLoadingModels[formId] || false;
    
    console.log('renderProviderForm 狀態:', {
      formId,
      providerType: formData.provider_type,
      isEdit,
      currentAvailableModels,
      isSearchingModels,
      allAvailableModels: availableModels,
      allLoadingStates: isLoadingModels
    });

    const handleSearchModels = async () => {
      if (formData.provider_type === 'ollama' || formData.api_key) {
        setIsLoadingModels(prev => ({ ...prev, [formId]: true }));
        
        try {
          const models = await searchAvailableModels(
            formData.provider_type, 
            formData.api_key, 
            formData.endpoint
          );
          
          console.log(`獲取到模型列表:`, models);
          
          // 直接設置模型列表到當前表單ID
          setAvailableModels(prev => ({
            ...prev,
            [formId]: models
          }));
          
        } finally {
          setIsLoadingModels(prev => ({ ...prev, [formId]: false }));
        }
      } else {
        dispatch(addNotification({
          type: 'warning',
          title: '需要API金鑰',
          message: '請先輸入API金鑰再搜尋模型',
          duration: 3000,
        }));
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2">提供者名稱</label>
          <input
            type="text"
            value={isEdit ? (editProvider?.name || provider?.name) : formData.name}
            onChange={(e) => setFormData({ name: e.target.value })}
            placeholder="例如: OpenAI GPT-4"
            className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-2">提供者類型</label>
          <select
            value={formData.provider_type}
            onChange={(e) => setFormData({ provider_type: e.target.value })}
            className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            disabled={isEdit} // 編輯時不允許修改類型
          >
            {supportedTypes.map(type => (
              <option key={type} value={type}>
                {getProviderIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {formData.provider_type !== 'ollama' && (
          <div>
            <label className="block text-gray-300 mb-2">
              API 金鑰
              {isEdit && !formData.api_key && (
                <span className="text-xs text-gray-400 ml-2">
                  (已保存，留空保持原有金鑰)
                </span>
              )}
            </label>
            <input
              type="password"
              value={formData.api_key || ''}
              onChange={(e) => setFormData({ api_key: e.target.value })}
              placeholder={isEdit ? "留空保持原有金鑰，或輸入新金鑰" : "輸入您的 API 金鑰"}
              className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}

        {(formData.provider_type === 'ollama' || formData.provider_type === 'openrouter') && (
          <div>
            <label className="block text-gray-300 mb-2">服務端點</label>
            <input
              type="url"
              value={formData.endpoint || ''}
              onChange={(e) => setFormData({ endpoint: e.target.value })}
              placeholder={
                formData.provider_type === 'ollama' 
                  ? 'http://127.0.0.1:11434' 
                  : 'https://openrouter.ai/api/v1'
              }
              className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-gray-300">模型名稱</label>
            <button
              type="button"
              onClick={handleSearchModels}
              disabled={isSearchingModels || (formData.provider_type !== 'ollama' && !formData.api_key)}
              className="btn-secondary text-xs px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearchingModels ? (
                <>
                  <div className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                  搜尋中...
                </>
              ) : (
                '🔍 搜尋模型'
              )}
            </button>
          </div>
          
          {currentAvailableModels.length > 0 ? (
            <div className="space-y-2">
              <select
                value={formData.model}
                onChange={(e) => setFormData({ model: e.target.value })}
                className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">請選擇模型...</option>
                {currentAvailableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                找到 {currentAvailableModels.length} 個可用模型
              </p>
            </div>
          ) : (
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ model: e.target.value })}
              placeholder={
                formData.provider_type === 'openai' ? '例如: gpt-4' :
                formData.provider_type === 'gemini' ? '例如: gemini-2.5-flash 或 gemini-2.5-pro' :
                formData.provider_type === 'claude' ? '例如: claude-3-sonnet' :
                formData.provider_type === 'openrouter' ? '例如: openai/gpt-4' :
                '例如: llama3.2'
              }
              className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              required
            />
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_enabled"
            checked={formData.is_enabled}
            onChange={(e) => setFormData({ is_enabled: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="is_enabled" className="text-gray-300">
            啟用此提供者
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={isEdit ? () => handleUpdateProvider(formData as UpdateAIProviderRequest) : handleCreateProvider}
            disabled={isSubmitting || !formData.name || !formData.model}
            className="btn-primary flex-1"
          >
            {isSubmitting ? '處理中...' : (isEdit ? '更新' : '新增')}
          </button>
          <button
            onClick={() => {
              if (isEdit) {
                setEditProvider(null);
              } else {
                setShowAddForm(false);
              }
            }}
            className="btn-secondary"
          >
            取消
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div ref={modalRef} className="relative bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* 標題 */}
          <div className="sticky top-0 bg-cosmic-900 p-6 border-b border-cosmic-700 flex items-center justify-between rounded-t-xl z-50">
            <h2 className="text-xl font-cosmic text-gold-500">AI 提供者管理</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl relative z-[110] p-2"
            >
              ×
            </button>
          </div>

          {/* 內容 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
                <p className="text-gray-300 mt-4">載入中...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 提供者列表 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gold-400">已配置的提供者</h3>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="btn-primary text-sm"
                    >
                      + 新增提供者
                    </button>
                  </div>

                  {providers.length === 0 ? (
                    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6 text-center">
                      <p className="text-gray-300">尚未配置任何 AI 提供者</p>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-primary mt-4"
                      >
                        新增第一個提供者
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {providers.map((provider) => (
                        <div
                          key={provider.id}
                          className={`bg-cosmic-800 border rounded-lg p-4 transition-colors ${
                            selectedProvider?.id === provider.id 
                              ? 'border-gold-500' 
                              : 'border-cosmic-700 hover:border-cosmic-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">
                                {getProviderIcon(provider.provider_type)}
                              </span>
                              <div>
                                <h4 className="text-white font-medium" title={provider.name}>
                                  {provider.name.length > 20 ? `${provider.name.substring(0, 18)}...` : provider.name}
                                </h4>
                                <p className="text-sm text-gray-400">
                                  {provider.provider_type} • {(() => {
                                    // 處理過長的模型名稱顯示
                                    const modelName = provider.model;
                                    if (provider.provider_type === 'openrouter' && modelName.length > 30) {
                                      // OpenRouter 模型名稱通常是 "provider/model" 格式
                                      const parts = modelName.split('/');
                                      if (parts.length === 2) {
                                        const [vendor, model] = parts;
                                        // 如果模型名稱太長，只顯示供應商和簡化的模型名
                                        if (model.length > 20) {
                                          const shortModel = model.split('-').slice(0, 3).join('-');
                                          return `${vendor}/${shortModel}...`;
                                        }
                                        return modelName;
                                      }
                                    }
                                    // 其他提供者或較短的名稱直接顯示
                                    return modelName.length > 35 ? `${modelName.substring(0, 32)}...` : modelName;
                                  })()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              {/* 狀態指示 */}
                              <div className="flex items-center space-x-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${
                                    provider.is_enabled ? 'bg-green-500' : 'bg-gray-500'
                                  }`}
                                ></div>
                                <span className="text-sm text-gray-300">
                                  {provider.is_enabled ? '已啟用' : '已停用'}
                                </span>
                              </div>

                              {/* 測試結果 */}
                              {testResults[provider.id] && (
                                <div className="flex items-center space-x-1">
                                  {testResults[provider.id].success ? (
                                    <span className="text-green-500 text-sm">✓</span>
                                  ) : (
                                    <span className="text-red-500 text-sm">✗</span>
                                  )}
                                </div>
                              )}

                              {/* 操作按鈕 */}
                              <button
                                onClick={() => handleTestProvider(provider.id)}
                                className="btn-secondary text-xs px-3 py-1"
                              >
                                測試
                              </button>
                              <button
                                onClick={() => handleTestModels(provider.id)}
                                className="btn-secondary text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500"
                              >
                                獲取模型
                              </button>
                              {provider.is_enabled && (
                                <>
                                  <button
                                    onClick={() => handleSetCurrentModel(provider)}
                                    className="text-gold-400 hover:text-gold-300 text-xs px-3 py-1 border border-gold-600 rounded hover:bg-gold-600 hover:text-cosmic-900 transition-colors"
                                  >
                                    設為當前
                                  </button>
                                  <button
                                    onClick={() => handleSetDefaultProvider(provider)}
                                    className="text-purple-400 hover:text-purple-300 text-xs px-3 py-1 border border-purple-600 rounded hover:bg-purple-600 hover:text-cosmic-900 transition-colors"
                                  >
                                    設為預設
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setEditProvider({
                                  id: provider.id,
                                  name: provider.name,
                                  provider_type: provider.provider_type,
                                  model: provider.model,
                                  is_enabled: provider.is_enabled,
                                  endpoint: provider.endpoint,
                                  api_key: undefined, // API key is encrypted in the provider object
                                })}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => handleDeleteProvider(provider.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 新增提供者表單 */}
                {showAddForm && (
                  <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gold-400 mb-4">新增 AI 提供者</h4>
                    {renderProviderForm()}
                  </div>
                )}

                {/* 編輯提供者表單 */}
                {editProvider && (
                  <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gold-400 mb-4">編輯 AI 提供者</h4>
                    {renderProviderForm(providers.find(p => p.id === editProvider.id), true)}
                  </div>
                )}

                {/* AI插畫功能與提供者指南 */}
                <div>
                  <h3 className="text-lg font-medium text-gold-400 mb-4">🎨 AI插畫功能指南</h3>
                  <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4 text-sm text-gray-300">

                    {/* 智能推薦系統說明 */}
                    <div className="mb-6 p-3 bg-gradient-to-r from-cosmic-700 to-cosmic-600 rounded-lg">
                      <h4 className="text-gold-400 font-medium text-sm mb-2">🧠 智能推薦系統</h4>
                      <p className="text-xs text-gray-200">
                        系統會根據小說內容自動推薦最適合的AI提供者，每個提供者都有獨特優勢。建議開啟多個提供者讓系統智能選擇最佳方案。
                      </p>
                    </div>

                    {/* 提供者詳細說明 */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-gold-400 mb-2">🦙 Ollama (本地隱私)</h5>
                        <ul className="space-y-1 text-xs">
                          <li>• 完全本地運行，無隱私風險</li>
                          <li>• 最新推薦: llama3.2, qwen2.5</li>
                          <li>• 🎨 插畫特色: 離線可用，速度快</li>
                          <li>• 點擊「🔍 搜尋模型」自動獲取</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gold-400 mb-2">✨ Gemini (多模態之王)</h5>
                        <ul className="space-y-1 text-xs">
                          <li>• 需要 Google AI API 金鑰</li>
                          <li>• 最新推薦: gemini-2.0-flash (2024)</li>
                          <li>• 🎨 插畫特色: 最懂中文文化，創意豐富</li>
                          <li>• 輸入API金鑰後可搜尋模型</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gold-400 mb-2">🤖 OpenAI (商業級穩定)</h5>
                        <ul className="space-y-1 text-xs">
                          <li>• 需要 OpenAI API 金鑰</li>
                          <li>• 最新推薦: gpt-4o, gpt-image-1</li>
                          <li>• 🎨 插畫特色: 圖像品質穩定，商業可靠</li>
                          <li>• 輸入API金鑰後可搜尋模型</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-gold-400 mb-2">🧠 Claude (深度理解)</h5>
                        <ul className="space-y-1 text-xs">
                          <li>• 需要 Anthropic API 金鑰</li>
                          <li>• 推薦模型: claude-3.5-sonnet, claude-3.5-haiku</li>
                          <li>• 🎨 插畫特色: 深度文本理解，細膩描述</li>
                          <li>• 輸入API金鑰後可搜尋模型</li>
                        </ul>
                      </div>
                    </div>

                    {/* 使用建議 */}
                    <div className="mt-6 grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-cosmic-700 rounded-lg">
                        <p className="text-gold-400 font-medium text-sm mb-1">💡 最佳實踐建議</p>
                        <ul className="text-xs space-y-1">
                          <li>✅ 新手：全部開啟，讓系統智能選擇</li>
                          <li>✅ 隱私優先：主用 Ollama</li>
                          <li>✅ 商用穩定：OpenAI + Ollama 組合</li>
                          <li>✅ 創意實驗：Gemini + OpenRouter 組合</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-cosmic-700 rounded-lg">
                        <p className="text-gold-400 font-medium text-sm mb-1">🔧 模型搜尋功能</p>
                        <p className="text-xs">
                          輸入API金鑰後，點擊「🔍 搜尋模型」按鈕可自動獲取該提供者的所有可用模型，無需手動輸入模型名稱。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部按鈕 */}
          <div className="sticky bottom-0 bg-cosmic-900 p-6 border-t border-cosmic-700 flex justify-end space-x-4 rounded-b-xl">
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
      
      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="確認刪除 AI 提供者"
        message={`確定要刪除 "${deleteConfirm.provider?.name}" 嗎？此操作無法撤銷。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={confirmDeleteProvider}
        onCancel={() => setDeleteConfirm({ show: false, provider: null })}
      />
    </div>
  );
};

export default AISettingsModal;