import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ImagePreviewModal from './VisualCreation/ImagePreviewModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { api } from '../../api';
import { 
  BatchStatusReport, 
  TaskPriority,
  TaskStatus
} from '../../types/illustration';
import { Character } from '../../api/models';
import CosmicButton from '../UI/CosmicButton';
import CosmicInput from '../UI/CosmicInput';
import LoadingSpinner from '../UI/LoadingSpinner';
import { GoogleCloudBillingModal } from '../Modals/GoogleCloudBillingModal';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { imageGenerationService } from '../../services/imageGenerationService';
import type { ImageGenerationOptions } from '../../services/imageGenerationService';
import { SafetyFilterLevel } from '@google/genai';
import { useBatchConfiguration, useCharacterSelection } from '../../hooks/illustration';

interface BatchIllustrationPanelProps {
  className?: string;
}

interface BatchRequestItem {
  id: string;
  scene_description: string;
  selectedCharacterIds: string[];  // 改為多選陣列
  style_template: string;
  aspect_ratio: string;
  scene_type: 'portrait' | 'scene' | 'interaction';
}

const BatchIllustrationPanel: React.FC<BatchIllustrationPanelProps> = ({
  className = ''
}) => {
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);

  // 組件狀態
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // 批次配置管理 Hook - 替換原有的分散式狀態管理
  const batchConfig = useBatchConfiguration({
    initialPriority: TaskPriority.Normal,
    initialMaxParallel: 2,
    autoValidate: true,
  });

  // 角色選擇管理 Hook
  const {
    selectedCharacters,
    charactersLoading,
    charactersError,
    effectiveProjectCharacters,
    toggleCharacterSelection,
    loadCharactersDirectly,
    getSelectedCharactersData,
  } = useCharacterSelection({
    projectId: currentProject?.id,
    autoLoadOnMount: true,
  });

  // 批次請求列表（獨立於配置）
  const [requests, setRequests] = useState<BatchRequestItem[]>([]);
  
  // Google Cloud 計費模態狀態
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingErrorMessage, setBillingErrorMessage] = useState('');
  

  // 場景類型狀態（保留，因為 useCharacterSelection 沒有包含這個）
  const [sceneType, setSceneType] = useState<'portrait' | 'scene' | 'interaction'>('portrait');

  // 監控狀態
  const [_activeBatches, setActiveBatches] = useState<BatchStatusReport[]>([]);
  const [_selectedBatchId, _setSelectedBatchId] = useState('');
  const [_batchDetails, _setBatchDetails] = useState<BatchStatusReport | null>(null);
  const [_refreshInterval, _setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 歷史狀態
  const [_batchHistory, _setBatchHistory] = useState<BatchStatusReport[]>([]);

  // 臨時圖像預覽狀態
  const [tempImages, setTempImages] = useState<any[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // 注：詳細調試資訊已移至 useCharacterSelection Hook
  
  // 優化計算：避免重複計算的值
  const requestsCount = useMemo(() => requests.length, [requests.length]);
  const hasRequests = useMemo(() => requests.length > 0, [requests.length]);
  const canSubmit = useMemo(() => 
    !isProcessing && hasRequests && batchConfig.isValidConfiguration,
    [isProcessing, hasRequests, batchConfig.isValidConfiguration]
  );

  // 載入活動批次
  const loadActiveBatches = useCallback(async () => {
    try {
      console.log('[BatchIllustrationPanel] 開始載入活動批次...');
      const result = await api.illustration.getAllBatchesSummary();
      console.log('[BatchIllustrationPanel] 批次摘要結果:', result);
      
      if (result.success) {
        console.log('[BatchIllustrationPanel] 成功載入批次列表:', result.batches || []);
        setActiveBatches(result.batches || []);
      } else {
        console.error('[BatchIllustrationPanel] 載入批次列表失敗:', result.message);
        setError(result.message || '無法載入批次列表');
        setActiveBatches([]);
      }
    } catch (err) {
      console.error('[BatchIllustrationPanel] 載入活動批次失敗:', err);
      setError('載入批次列表失敗: ' + err);
      setActiveBatches([]);
    }
  }, []);

  // 初始化批次管理器
  const initializeBatchManager = useCallback(async () => {
    try {
      console.log('[BatchIllustrationPanel] 開始初始化批次管理器...');
      const result = await api.illustration.initializeBatchManager();
      console.log('[BatchIllustrationPanel] 批次管理器初始化結果:', result);
      
      if (result.success) {
        console.log('[BatchIllustrationPanel] 批次管理器初始化成功，載入活動批次...');
        // 初始化成功後再載入批次
        await loadActiveBatches();
      } else {
        console.error('[BatchIllustrationPanel] 批次管理器初始化失敗:', result.message);
        setError(result.message || '批次管理器初始化失敗');
      }
    } catch (err) {
      console.error('[BatchIllustrationPanel] 初始化批次管理器失敗:', err);
      setError('初始化批次管理器失敗: ' + err);
    }
  }, [loadActiveBatches]);

  // 注：角色選擇邏輯已移至 useCharacterSelection Hook

  // 生成智能場景描述
  const generateSceneDescription = useCallback((characters: Character[], sceneType: string) => {
    if (characters.length === 0) return '';
    
    let description = '';
    
    switch (sceneType) {
      case 'portrait': {
        const char = characters[0];
        description = `${char.name}的精美肖像，`;
        if (char.appearance) description += `${char.appearance}，`;
        if (char.personality) description += `展現${char.personality}的特質`;
        break;
      }
        
      case 'interaction': {
        description = `${characters.map(c => c.name).join('和')}的互動場景，`;
        description += '自然的對話氛圍，細膩的表情刻畫';
        break;
      }
        
      case 'scene': {
        description = `${characters.map(c => c.name).join('、')}在環境中的場景，`;
        description += '豐富的背景細節，氛圍營造';
        break;
      }
    }
    
    return description;
  }, []);

  // 添加新請求 (基於選中角色)
  const addRequest = useCallback(() => {
    const selectedChars = getSelectedCharactersData();

    const newRequest: BatchRequestItem = {
      id: Date.now().toString(),
      scene_description: generateSceneDescription(selectedChars, sceneType),
      selectedCharacterIds: [...selectedCharacters],
      style_template: sceneType === 'portrait' ? 'anime-portrait' : 'fantasy-scene',
      aspect_ratio: 'square',
      scene_type: sceneType
    };
    setRequests(prev => [...prev, newRequest]);
  }, [generateSceneDescription, getSelectedCharactersData, sceneType, selectedCharacters]);

  // 移除請求
  const removeRequest = useCallback((id: string) => {
    setRequests(requests => requests.filter(req => req.id !== id));
  }, []);

  // 更新請求
  const updateRequest = useCallback((id: string, field: keyof BatchRequestItem, value: string | string[]) => {
    setRequests(requests => requests.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  }, []);

  // 提交批次請求（整合圖像生成服務）
  const submitBatch = async () => {
    if (!currentProject) {
      setError('請選擇專案');
      return;
    }

    if (!batchConfig.batchName.trim()) {
      setError('請輸入批次名稱');
      return;
    }

    if (!hasRequests) {
      setError('請添加至少一個插畫請求');
      return;
    }

    // 只有選擇 Imagen 時才需要 API Key
    if (batchConfig.illustrationProvider === 'imagen' && !batchConfig.apiKey.trim()) {
      setError('Google Imagen 需要 API 金鑰，請輸入或切換到免費的 Pollinations.AI');
      return;
    }

    // 驗證所有請求都有場景描述
    const invalidRequests = requests.filter(req => !req.scene_description.trim());
    if (invalidRequests.length > 0) {
      setError('所有請求都必須填寫場景描述');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      console.log(`🚀 開始批次插畫生成：${batchConfig.batchName}`);
      console.log(`🎨 色彩模式：${batchConfig.globalColorMode === 'color' ? '彩色' : '黑白'}`);
      console.log(`🤖 使用服務：${batchConfig.illustrationProvider === 'pollinations' ? 'Pollinations.AI (免費)' : 'Google Imagen (付費)'}`);
      console.log(`📋 共 ${requestsCount} 個請求`);

      let results: any[] = [];

      if (batchConfig.illustrationProvider === 'pollinations') {
        // === Pollinations.AI 免費生成 ===
        console.log(`🌟 使用 Pollinations.AI，模型：${batchConfig.pollinationsModel}，風格：${batchConfig.pollinationsStyle}`);
        
        results = [];
        
        for (let i = 0; i < requestsCount; i++) {
          const req = requests[i];
          console.log(`🎨 生成進度: ${i + 1}/${requestsCount} - ${req.scene_description.substring(0, 50)}...`);
          
          try {
            // 構建增強提示詞
            let enhancedPrompt = req.scene_description;
            
            // 加入角色資訊
            if (req.selectedCharacterIds.length > 0) {
              const characterNames = req.selectedCharacterIds.map(id => {
                const char = effectiveProjectCharacters.find(c => c.id === id);
                return char?.name;
              }).filter(Boolean);
              
              if (characterNames.length > 0) {
                enhancedPrompt = `${enhancedPrompt}, featuring ${characterNames.join(' and ')}`;
              }
            }
            
            // 根據場景類型調整
            if (req.scene_type === 'portrait') {
              enhancedPrompt += ', detailed character portrait';
            } else if (req.scene_type === 'interaction') {
              enhancedPrompt += ', character interaction scene';
            } else if (req.scene_type === 'scene') {
              enhancedPrompt += ', environmental scene with characters';
            }

            // 調用 Pollinations.AI 臨時生成 API
            const result = await api.illustration.generateFreeIllustrationToTemp(
              enhancedPrompt,
              1024, // width
              1024, // height
              batchConfig.pollinationsModel,
              undefined, // seed (auto-generated)
              true, // enhance
              batchConfig.pollinationsStyle,
              currentProject?.id, // projectId
              req.selectedCharacterIds.length > 0 ? req.selectedCharacterIds[0] : undefined // characterId (主要角色)
            );

            if (result.success) {
              // 存儲臨時圖像數據
              results.push({
                success: true,
                tempImageData: result, // 存儲完整的臨時圖像數據
                request: req
              });
              console.log(`✅ 第 ${i + 1} 張圖像生成成功（臨時）`);
            } else {
              results.push({
                success: false,
                error: result.message || '生成失敗',
                request: req
              });
              console.error(`❌ 第 ${i + 1} 張圖像生成失敗:`, result.message);
            }
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              request: req
            });
            console.error(`❌ 第 ${i + 1} 張圖像生成異常:`, error);
          }

          // 避免過於頻繁的請求，每個請求間隔1秒
          if (i < requests.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        // === Google Imagen 付費生成 ===
        console.log('🔷 使用 Google Imagen');
        
        // 準備圖像生成請求
        const imageRequests = requests.map(req => {
          // 根據角色信息增強場景描述
          let enhancedDescription = req.scene_description;
          
          // 加入角色資訊
          if (req.selectedCharacterIds.length > 0) {
            const characterNames = req.selectedCharacterIds.map(id => {
              const char = effectiveProjectCharacters.find(c => c.id === id);
              return char?.name;
            }).filter(Boolean);
            
            if (characterNames.length > 0) {
              enhancedDescription = `${enhancedDescription}，featuring ${characterNames.join(' and ')}`;
            }
          }
          
          // 根據場景類型調整
          if (req.scene_type === 'portrait') {
            enhancedDescription += ', detailed character portrait';
          } else if (req.scene_type === 'interaction') {
            enhancedDescription += ', character interaction scene';
          } else if (req.scene_type === 'scene') {
            enhancedDescription += ', environmental scene with characters';
          }
          
          return {
            prompt: enhancedDescription,
            options: {
              colorMode: batchConfig.globalColorMode,
              aspectRatio: req.aspect_ratio as ImageGenerationOptions['aspectRatio'],
              numberOfImages: 1,
              sceneType: req.scene_type,
              safetyLevel: SafetyFilterLevel.BLOCK_MEDIUM_AND_ABOVE
            }
          };
        });

        // 執行批次生成
        results = await imageGenerationService.generateBatch(
          imageRequests,
          batchConfig.apiKey,
          (current, total, currentPrompt) => {
            console.log(`🎨 生成進度: ${current}/${total} - ${currentPrompt?.substring(0, 50)}...`);
            // 可以在這裡更新 UI 顯示進度
          }
        );
      }

      // 統計結果
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        console.log(`✅ 成功生成 ${successCount} 張圖像（臨時）`);
        
        // 收集所有成功的臨時圖像數據
        const successfulTempImages = results
          .filter(r => r.success && r.tempImageData)
          .map(r => r.tempImageData);
        
        console.log('生成的臨時圖像數據:', successfulTempImages.length, '張');
        
        // 設置臨時圖像並顯示預覽
        setTempImages(successfulTempImages);
        setShowImagePreview(true);
        
        // 暫時不重置表單，等用戶確認後再重置
        setError(''); // 清除錯誤
        
        if (failCount > 0) {
          console.warn(`⚠️ ${failCount} 張圖像生成失敗`);
          setError(`部分圖像生成失敗：成功 ${successCount}，失敗 ${failCount}`);
        }
      } else {
        throw new Error('所有圖像生成都失敗了');
      }

    } catch (err: unknown) {
      console.error('❌ 批次生成失敗:', err);
      
      // 檢查是否為 Google Cloud 計費問題
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('billed users') || 
          errorMessage.includes('需要啟用計費') || 
          errorMessage.includes('Imagen API 需要啟用計費')) {
        // 顯示專用的計費設定模態而不是普通錯誤
        setBillingErrorMessage(errorMessage);
        setShowBillingModal(true);
        setError(''); // 清除普通錯誤，使用模態來處理
      } else {
        // 其他錯誤使用普通錯誤提示
        setError(`批次生成失敗: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };


  // 載入批次詳情
  const loadBatchDetails = useCallback(async (batchId: string) => {
    if (!batchId) return;

    try {
      const result = await api.illustration.getBatchStatus(batchId);
      if (result.success) {
        // 由於當前是模擬實現，這裡創建模擬數據
        const mockBatchDetails: BatchStatusReport = {
          batch_id: batchId,
          total_tasks: 5,
          completed_tasks: 2,
          failed_tasks: 1,
          running_tasks: 1,
          queued_tasks: 1,
          overall_progress: 0.6,
          estimated_completion: new Date(Date.now() + 300000).toISOString(),
          statistics: {
            total_tasks_processed: 2,
            successful_tasks: 2,
            failed_tasks: 1,
            cancelled_tasks: 0,
            timeout_tasks: 0,
            retried_tasks: 0,
            average_execution_time_ms: 45000,
            total_api_costs: 0.12,
            peak_concurrent_tasks: 2,
            queue_utilization: 0.8,
            error_rate: 0.2,
            throughput_per_hour: 4.8
          },
          task_details: [
            {
              task_id: 'task-1',
              batch_id: batchId,
              status: TaskStatus.Completed,
              progress: 100,
              current_step: '完成',
              started_at: new Date(Date.now() - 120000).toISOString(),
              estimated_completion: undefined,
              error_message: undefined,
              retry_count: 0,
              performance_metrics: {
                queue_time_ms: 5000,
                execution_time_ms: 45000,
                memory_usage_mb: 512,
                api_calls_count: 1,
                total_cost: 0.04
              }
            },
            {
              task_id: 'task-2',
              batch_id: batchId,
              status: TaskStatus.Running,
              progress: 75,
              current_step: 'AI 生成中',
              started_at: new Date(Date.now() - 60000).toISOString(),
              estimated_completion: new Date(Date.now() + 30000).toISOString(),
              error_message: undefined,
              retry_count: 0,
              performance_metrics: {
                queue_time_ms: 3000,
                execution_time_ms: 60000,
                memory_usage_mb: 480,
                api_calls_count: 1,
                total_cost: 0.04
              }
            }
          ]
        };
        _setBatchDetails(mockBatchDetails);
      }
    } catch (err) {
      console.error('載入批次詳情失敗:', err);
    }
  }, []);

  // 取消批次
  const _cancelBatch = async (batchId: string) => {
    try {
      const result = await api.illustration.cancelBatch(batchId);
      if (result.success) {
        console.log('批次已取消');
        loadActiveBatches();
      } else {
        setError('取消批次失敗');
      }
    } catch (err) {
      setError(`取消批次失敗: ${err}`);
    }
  };

  // 重試失敗任務
  const _retryFailedTasks = async (batchId: string) => {
    try {
      const result = await api.illustration.retryFailedTasks(batchId);
      if (result.success) {
        console.log('失敗任務已重新提交');
        loadBatchDetails(batchId);
      } else {
        setError('重試失敗');
      }
    } catch (err) {
      setError(`重試失敗: ${err}`);
    }
  };


  // 獲取優先級字符串 (保留給未來使用)
  const _getPriorityString = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.Low: return 'low';
      case TaskPriority.Normal: return 'normal';
      case TaskPriority.High: return 'high';
      case TaskPriority.Critical: return 'critical';
      case TaskPriority.Urgent: return 'urgent';
      default: return 'normal';
    }
  };

  // 獲取狀態顏色
  const _getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Completed: return 'text-green-400';
      case TaskStatus.Running: return 'text-blue-400';
      case TaskStatus.Failed: return 'text-red-400';
      case TaskStatus.Cancelled: return 'text-gray-400';
      case TaskStatus.Queued: return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  // 獲取狀態中文
  const _getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Completed: return '已完成';
      case TaskStatus.Running: return '執行中';
      case TaskStatus.Failed: return '失敗';
      case TaskStatus.Cancelled: return '已取消';
      case TaskStatus.Queued: return '排隊中';
      case TaskStatus.Waiting: return '等待中';
      case TaskStatus.Paused: return '暫停';
      case TaskStatus.Timeout: return '超時';
      case TaskStatus.Retrying: return '重試中';
      default: return '未知';
    }
  };

  // 注：預覽模態框回調函數已移至 Redux 狀態管理

  // 組件初始化
  useEffect(() => {
    // 只調用初始化，loadActiveBatches 會在初始化成功後自動調用
    initializeBatchManager();
  }, [initializeBatchManager]); // 包含依賴

  // 注：角色載入邏輯已移至 useCharacterSelection Hook

  // 新增：自動獲取API金鑰
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // 從 AI Providers 獲取已配置的金鑰
        const response = await api.aiProviders.getAll();
        
        if (response.success && response.providers) {
          // 優先找 Gemini provider
          const geminiProvider = response.providers.find((p) => 
            p.provider_type === 'gemini' && p.is_enabled
          );
          
          if (geminiProvider?.api_key_encrypted) {
            // Base64 解碼 API 金鑰
            try {
              const decodedApiKey = atob(geminiProvider.api_key_encrypted);
              batchConfig.setApiKey(decodedApiKey);
              batchConfig.setApiKeySource('gemini');
              console.log('✅ 已自動載入並解碼 Gemini API 金鑰');
              return;
            } catch (error) {
              console.error('❌ 解碼 Gemini API 金鑰失敗:', error);
            }
          }
          
          // 檢查 OpenRouter（如果支援 Gemini/Imagen）
          const openrouterProvider = response.providers.find((p) => 
            p.provider_type === 'openrouter' && p.is_enabled
          );
          
          if (openrouterProvider?.api_key_encrypted) {
            // 檢查模型名稱中是否包含 gemini 或 imagen
            const modelName = openrouterProvider.model || '';
            if (modelName.toLowerCase().includes('imagen') || modelName.toLowerCase().includes('gemini')) {
              try {
                const decodedApiKey = atob(openrouterProvider.api_key_encrypted);
                batchConfig.setApiKey(decodedApiKey);
                batchConfig.setApiKeySource('openrouter');
                console.log('✅ 已自動載入並解碼 OpenRouter API 金鑰');
              } catch (error) {
                console.error('❌ 解碼 OpenRouter API 金鑰失敗:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('無法自動載入 API 金鑰:', error);
      }
    };
    
    if (currentProject) {
      loadApiKey();
    }
  }, [currentProject, batchConfig]);


  return (
    <div className={`batch-illustration-panel ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">⚡</span>
            批次插畫生成
          </h2>
        </div>

        {/* 標籤導航 */}
        <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'create', label: '創建批次', icon: '➕' },
            { id: 'history', label: '歷史記錄', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'create' | 'history')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {/* 創建批次 */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* 基本設定 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">批次設定</h3>
                {/* 配置驗證狀態 */}
                <div className="flex items-center space-x-2">
                  {batchConfig.isValidConfiguration ? (
                    <div className="flex items-center space-x-1 text-green-400">
                      <span>✅</span>
                      <span className="text-sm">配置有效</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-400">
                      <span>❌</span>
                      <span className="text-sm">{batchConfig.validation.errors.length} 個錯誤</span>
                    </div>
                  )}
                  {batchConfig.validation.warnings.length > 0 && (
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <span>⚠️</span>
                      <span className="text-sm">{batchConfig.validation.warnings.length} 個警告</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 色彩模式選擇 - 全局設定 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  🎨 色彩模式 <span className="text-gray-400">(套用至整個批次)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => batchConfig.setGlobalColorMode('color')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      batchConfig.globalColorMode === 'color'
                        ? 'border-purple-500 bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">🌈</div>
                      <div className="font-medium text-white">彩色插畫</div>
                      <div className="text-xs text-gray-400 mt-1">豐富色彩表現</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => batchConfig.setGlobalColorMode('monochrome')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      batchConfig.globalColorMode === 'monochrome'
                        ? 'border-gray-400 bg-gray-800'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">⚫⚪</div>
                      <div className="font-medium text-white">黑白插畫</div>
                      <div className="text-xs text-gray-400 mt-1">經典素描風格</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 插畫服務選擇器 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  🤖 插畫服務 <span className="text-gray-400">(選擇生成服務)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => batchConfig.setIllustrationProvider('pollinations')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      batchConfig.illustrationProvider === 'pollinations'
                        ? 'border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">🆓</div>
                      <div className="font-medium text-white">Pollinations.AI</div>
                      <div className="text-xs text-green-400 mt-1">完全免費・無需API Key</div>
                      <div className="text-xs text-gray-400 mt-1">支援多種風格模型</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => batchConfig.setIllustrationProvider('imagen')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      batchConfig.illustrationProvider === 'imagen'
                        ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-2">💎</div>
                      <div className="font-medium text-white">Google Imagen</div>
                      <div className="text-xs text-blue-400 mt-1">高品質專業級</div>
                      <div className="text-xs text-gray-400 mt-1">需要 API Key</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Pollinations 模型和風格選擇 */}
              {batchConfig.illustrationProvider === 'pollinations' && (
                <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <h4 className="text-sm font-medium text-green-300 mb-4">🎨 Pollinations.AI 設定</h4>
                  
                  {/* 模型選擇 */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-300 mb-2">模型選擇</label>
                    <select
                      value={batchConfig.pollinationsModel}
                      onChange={(e) => batchConfig.setPollinationsModel(e.target.value as 'flux' | 'gptimage' | 'kontext' | 'sdxl')}
                      className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    >
                      <option value="flux">Flux - 高品質通用模型 (推薦)</option>
                      <option value="gptimage">GPT Image - 支援透明背景</option>
                      <option value="kontext">Kontext - 圖像轉換</option>
                      <option value="sdxl">Stable Diffusion XL - 經典模型</option>
                    </select>
                  </div>

                  {/* 風格選擇 */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">風格選擇</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'anime', label: '動漫', emoji: '🌸' },
                        { id: 'realistic', label: '寫實', emoji: '📷' },
                        { id: 'fantasy', label: '奇幻', emoji: '🧙‍♂️' },
                        { id: 'watercolor', label: '水彩', emoji: '🎨' },
                        { id: 'digital_art', label: '數位', emoji: '💻' }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => batchConfig.setPollinationsStyle(style.id as typeof batchConfig.pollinationsStyle)}
                          className={`p-2 rounded text-xs transition-colors ${
                            batchConfig.pollinationsStyle === style.id
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <div>{style.emoji}</div>
                          <div>{style.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    批次名稱 <span className="text-red-400">*</span>
                  </label>
                  <CosmicInput
                    value={batchConfig.batchName}
                    onChange={(value) => batchConfig.setBatchName(value)}
                    placeholder="例如：角色立繪批次01"
                  />
                  {/* 驗證錯誤提示 */}
                  {batchConfig.validation.errors
                    .filter(error => error.field === 'batchName')
                    .map((error, index) => (
                      <div key={index} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    優先級
                  </label>
                  <select
                    value={batchConfig.batchPriority}
                    onChange={(e) => batchConfig.setBatchPriority(parseInt(e.target.value) as TaskPriority)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={TaskPriority.Low}>低</option>
                    <option value={TaskPriority.Normal}>普通</option>
                    <option value={TaskPriority.High}>高</option>
                    <option value={TaskPriority.Critical}>重要</option>
                    <option value={TaskPriority.Urgent}>緊急</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大並行數
                  </label>
                  <CosmicInput
                    type="number"
                    value={batchConfig.maxParallel.toString()}
                    onChange={(value) => batchConfig.setMaxParallel(parseInt(value) || 1)}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">同時執行的任務數量</p>
                    <button
                      type="button"
                      onClick={() => batchConfig.setMaxParallel(batchConfig.getRecommendedMaxParallel())}
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      建議: {batchConfig.getRecommendedMaxParallel()}
                    </button>
                  </div>
                  {/* 驗證錯誤和警告提示 */}
                  {batchConfig.validation.errors
                    .filter(error => error.field === 'maxParallel')
                    .map((error, index) => (
                      <div key={`error-${index}`} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                  {batchConfig.validation.warnings
                    .filter(warning => warning.field === 'maxParallel')
                    .map((warning, index) => (
                      <div key={`warning-${index}`} className="mt-1 text-sm text-yellow-400 flex items-center space-x-1">
                        <span>⚡</span>
                        <span>{warning.message}</span>
                      </div>
                    ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API 金鑰 
                    {batchConfig.apiKeySource !== 'manual' ? (
                      <span className="text-green-400 ml-2">
                        ✅ 已從 {batchConfig.apiKeySource === 'gemini' ? 'Gemini' : 'OpenRouter'} 載入
                      </span>
                    ) : (
                      <span className="text-red-400"> *</span>
                    )}
                  </label>
                  <CosmicInput
                    type="password"
                    value={batchConfig.apiKey}
                    onChange={(value) => {
                      batchConfig.setApiKey(value);
                      batchConfig.setApiKeySource('manual');
                    }}
                    placeholder={
                      batchConfig.apiKeySource !== 'manual' 
                        ? "已自動載入 (可覆寫)" 
                        : "輸入 Google Cloud API 金鑰"
                    }
                  />
                  {batchConfig.apiKeySource !== 'manual' && (
                    <p className="text-xs text-gray-400 mt-1">
                      💡 已自動使用 AI 提供者管理中的金鑰，您也可以手動輸入覆寫
                    </p>
                  )}
                  {/* API 金鑰驗證提示 */}
                  {batchConfig.validation.errors
                    .filter(error => error.field === 'apiKey')
                    .map((error, index) => (
                      <div key={`error-${index}`} className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                        <span>⚠️</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                  {batchConfig.validation.warnings
                    .filter(warning => warning.field === 'apiKey')
                    .map((warning, index) => (
                      <div key={`warning-${index}`} className="mt-1 text-sm text-yellow-400 flex items-center space-x-1">
                        <span>⚡</span>
                        <span>{warning.message}</span>
                      </div>
                    ))}
                  <div className="mt-3 p-4 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-500/60 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 20.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-orange-300 mb-2">
                          ⚠️ 重要：Google Cloud 計費要求
                        </h4>
                        <div className="text-sm text-orange-200 space-y-1">
                          <p className="font-medium">Imagen API 需要付費的 Google Cloud 帳戶才能使用</p>
                          <ul className="list-disc list-inside space-y-1 mt-2 text-xs text-orange-100">
                            <li>需要有效的 Google Cloud API 金鑰</li>
                            <li>必須啟用 Imagen API 服務</li>
                            <li className="font-medium text-orange-200">⭐ 必須設定付費方式（計費帳戶）</li>
                            <li>在 Google Cloud Console 中完成所有設定</li>
                          </ul>
                          <p className="text-xs text-orange-300 mt-2 font-medium">
                            💡 如果遇到計費錯誤，系統會提供詳細的設定說明
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  批次描述
                </label>
                <textarea
                  value={batchConfig.batchDescription}
                  onChange={(e) => batchConfig.setBatchDescription(e.target.value)}
                  placeholder="可選：描述這個批次的用途"
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* 配置管理功能 */}
              <div className="mt-6 p-4 bg-gray-750 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-300 font-medium">⚙️ 配置管理</span>
                    <span className="text-xs text-gray-400">({batchConfig.getConfigurationSummary()})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* 重置按鈕 */}
                    <button
                      onClick={() => {
                        if (confirm('確定要重置為預設配置嗎？這會清除所有當前設定。')) {
                          batchConfig.resetToDefaults();
                        }
                      }}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-yellow-100 text-xs rounded transition-colors"
                      title="重置為預設配置"
                    >
                      🔄 重置
                    </button>
                    
                    {/* 匯出按鈕 */}
                    <button
                      onClick={() => {
                        const config = batchConfig.exportConfiguration();
                        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `batch-config-${Date.now()}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-green-100 text-xs rounded transition-colors"
                      title="匯出配置到檔案"
                    >
                      📤 匯出
                    </button>
                    
                    {/* 匯入按鈕 */}
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e: Event) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const config = JSON.parse(event.target?.result as string);
                                batchConfig.importConfiguration(config);
                                alert('配置匯入成功！');
                              } catch (_error) {
                                alert('匯入失敗：無效的配置檔案格式');
                              }
                            };
                            reader.readAsText(file);
                          }
                        };
                        input.click();
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-blue-100 text-xs rounded transition-colors"
                      title="從檔案匯入配置"
                    >
                      📥 匯入
                    </button>
                  </div>
                </div>
                
                {/* 配置摘要顯示 */}
                <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                  <strong>當前配置摘要：</strong> {batchConfig.getConfigurationSummary()}
                </div>
              </div>
            </div>

            {/* 角色選擇區域 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  🎭 選擇角色 ({selectedCharacters.length} 已選擇)
                </h3>
                <div className="flex items-center space-x-2">
                  {charactersLoading && (
                    <div className="text-blue-400 text-sm animate-pulse">載入中...</div>
                  )}
                  <button
                    onClick={loadCharactersDirectly}
                    disabled={charactersLoading}
                    className="px-3 py-1 bg-cosmic-700 hover:bg-cosmic-600 disabled:opacity-50 text-cosmic-200 rounded text-sm transition-colors"
                  >
                    🔄 重新載入
                  </button>
                </div>
              </div>
              
              {charactersError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded text-red-300">
                  <span className="font-medium">載入錯誤：</span> {charactersError}
                </div>
              )}
              
              <div className="character-grid flex flex-wrap gap-6 mb-6">
                {charactersLoading && (
                  <div className="col-span-full text-center py-8 text-blue-400">
                    <div className="text-6xl mb-4 animate-spin">🔄</div>
                    <p>載入角色中...</p>
                  </div>
                )}
                {effectiveProjectCharacters.map((character) => {
                  const isSelected = selectedCharacters.includes(character.id);
                  
                  // 獲取角色頭像
                  const getCharacterAvatar = (char: Character) => {
                    if (char.gender === 'female') {
                      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♀️' : '👩';
                    } else if (char.gender === 'male') {
                      return char.archetype?.includes('魔法') || char.archetype?.includes('法師') ? '🧙‍♂️' : '👨';
                    }
                    // 根據角色類型
                    if (char.archetype?.includes('魔法') || char.archetype?.includes('法師')) return '🧙';
                    if (char.archetype?.includes('戰士') || char.archetype?.includes('騎士')) return '⚔️';
                    if (char.archetype?.includes('盜賊') || char.archetype?.includes('刺客')) return '🗡️';
                    if (char.archetype?.includes('治療') || char.archetype?.includes('牧師')) return '🛡️';
                    return '👤';
                  };

                  // 獲取角色類型顏色
                  const getArchetypeColor = (archetype: string | undefined) => {
                    if (!archetype) return 'from-gray-600 to-gray-700';
                    
                    if (archetype.includes('主角') || archetype.includes('英雄')) return 'from-amber-500 to-orange-600';
                    if (archetype.includes('反派') || archetype.includes('敵人')) return 'from-red-500 to-red-700';
                    if (archetype.includes('魔法') || archetype.includes('法師')) return 'from-purple-500 to-indigo-600';
                    if (archetype.includes('戰士') || archetype.includes('騎士')) return 'from-blue-500 to-blue-700';
                    if (archetype.includes('配角') || archetype.includes('朋友')) return 'from-green-500 to-green-700';
                    return 'from-slate-500 to-slate-700';
                  };

                  return (
                    <button
                      key={character.id}
                      onClick={() => toggleCharacterSelection(character.id)}
                      className={`
                        relative w-52 h-36 text-white rounded-xl overflow-hidden group
                        transition-all duration-300 ease-out
                        ${isSelected 
                          ? 'ring-4 ring-gold-400 shadow-2xl shadow-gold-400/30' 
                          : 'hover:shadow-xl hover:shadow-black/20'
                        }
                        bg-gradient-to-br ${getArchetypeColor(character.archetype)}
                        border-2 ${isSelected ? 'border-gold-300' : 'border-white/20'}
                      `}
                    >
                      {/* 背景裝飾 */}
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full"></div>
                      <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-tr-full"></div>
                      
                      {/* 選中狀態指示器 */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-gold-400 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-black text-lg font-bold">✓</span>
                        </div>
                      )}
                      
                      {/* 角色頭像 */}
                      <div className="absolute top-4 left-4 text-4xl filter drop-shadow-lg">
                        {getCharacterAvatar(character)}
                      </div>
                      
                      {/* 角色信息 */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                        {/* 角色名稱 */}
                        <h4 className="text-lg font-bold text-white mb-1 truncate">
                          {character.name}
                        </h4>
                        
                        {/* 角色類型標籤 */}
                        {character.archetype && (
                          <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                            {character.archetype}
                          </span>
                        )}
                        
                        {/* 年齡 */}
                        {character.age && (
                          <div className="text-xs text-white/80 mt-1">
                            📅 {character.age}歲
                          </div>
                        )}
                      </div>

                      {/* Hover效果 */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-t from-transparent to-white/10 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        ${isSelected ? 'opacity-20' : ''}
                      `}></div>
                    </button>
                  );
                })}
                
                {!charactersLoading && effectiveProjectCharacters.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    <div className="text-6xl mb-4">🎭</div>
                    <p className="mb-2">此專案還沒有角色</p>
                    <p className="text-sm mt-2 mb-4">請先到角色管理頁面創建角色</p>
                    <div className="text-xs text-cosmic-500 bg-cosmic-900/50 p-3 rounded border border-cosmic-700">
                      <p className="mb-2"><strong>調試信息：</strong></p>
                      <p>專案ID: {currentProject?.id || '無'}</p>
                      <p>角色總數: {characters.length}</p>
                      <p>項目角色數: {effectiveProjectCharacters.length}</p>
                      <p>載入狀態: {charactersLoading ? '載入中' : '已完成'}</p>
                      {charactersError && <p className="text-red-400">錯誤: {charactersError}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* 場景類型選擇 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  場景類型
                </label>
                <div className="flex space-x-2">
                  {[
                    { value: 'portrait', label: '🎭 角色肖像', desc: '單一角色精美肖像' },
                    { value: 'interaction', label: '💬 角色互動', desc: '多角色對話場景' },
                    { value: 'scene', label: '🏰 環境場景', desc: '角色在特定環境中' }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSceneType(type.value as 'portrait' | 'scene' | 'interaction')}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        sceneType === type.value
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-xs opacity-75">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 智能建議按鈕 */}
              {selectedCharacters.length > 0 && (
                <div className="flex space-x-2">
                  <CosmicButton
                    onClick={addRequest}
                    variant="secondary"
                    size="small"
                    disabled={selectedCharacters.length === 0}
                  >
                    ✨ 基於選中角色生成請求
                  </CosmicButton>
                  
                  <CosmicButton
                    onClick={() => {
                      // 為每個角色單獨生成肖像請求
                      selectedCharacters.forEach(charId => {
                        const char = effectiveProjectCharacters.find(c => c.id === charId);
                        if (char) {
                          const portraitRequest: BatchRequestItem = {
                            id: `${Date.now()}-${charId}`,
                            scene_description: `${char.name}的精美角色肖像，${char.appearance || ''}，展現個性特質`,
                            selectedCharacterIds: [charId],
                            style_template: 'anime-portrait',
                            aspect_ratio: 'square',
                            scene_type: 'portrait'
                          };
                          setRequests(prev => [...prev, portraitRequest]);
                        }
                      });
                    }}
                    variant="secondary"
                    size="small"
                  >
                    🎨 為每個角色生成肖像
                  </CosmicButton>
                </div>
              )}
            </div>

            {/* 請求列表 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  插畫請求 ({requests.length})
                </h3>
                <CosmicButton onClick={addRequest} variant="secondary" size="small">
                  ➕ 添加請求
                </CosmicButton>
              </div>

              <div className="space-y-4">
                {requests.map((request, index) => (
                  <div key={request.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">請求 {index + 1}</span>
                      <CosmicButton
                        onClick={() => removeRequest(request.id)}
                        variant="danger"
                        size="small"
                      >
                        ✕
                      </CosmicButton>
                    </div>

                    {/* 關聯角色顯示 */}
                    {request.selectedCharacterIds && request.selectedCharacterIds.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          關聯角色
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {request.selectedCharacterIds.map(charId => {
                            const character = effectiveProjectCharacters.find(c => c.id === charId);
                            return character ? (
                              <span key={charId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gold-600/20 text-gold-300 border border-gold-600/30">
                                <span className="mr-1">{character.archetype?.includes('魔法') ? '🧙' : '👤'}</span>
                                {character.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          場景描述 <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={request.scene_description}
                          onChange={(e) => updateRequest(request.id, 'scene_description', e.target.value)}
                          placeholder="請描述要生成的插畫場景"
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          場景類型
                        </label>
                        <select
                          value={request.scene_type}
                          onChange={(e) => updateRequest(request.id, 'scene_type', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="portrait">🎭 角色肖像</option>
                          <option value="interaction">💬 角色互動</option>
                          <option value="scene">🏰 環境場景</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          風格模板
                        </label>
                        <select
                          value={request.style_template}
                          onChange={(e) => updateRequest(request.id, 'style_template', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="anime-portrait">動漫人物肖像</option>
                          <option value="fantasy-scene">奇幻場景</option>
                          <option value="manga-style">漫畫風格</option>
                          <option value="illustration">精美插畫</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {requests.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="mb-4">尚未添加任何插畫請求</p>
                    <CosmicButton onClick={addRequest} variant="secondary">
                      ➕ 添加第一個請求
                    </CosmicButton>
                  </div>
                )}
              </div>
            </div>

            {/* 提交按鈕 */}
            <div className="flex justify-center">
              <CosmicButton
                onClick={submitBatch}
                disabled={!canSubmit}
                size="large"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>提交中...</span>
                  </div>
                ) : (
                  '🚀 提交批次'
                )}
              </CosmicButton>
            </div>
          </div>
        )}


        {/* 歷史記錄 */}
        {activeTab === 'history' && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">批次歷史</h3>
            <div className="text-center py-8 text-gray-400">
              <p>歷史記錄功能開發中...</p>
              <p className="text-sm mt-2">將顯示已完成和已取消的批次記錄</p>
            </div>
          </div>
        )}
      </Card>
      
      {/* Google Cloud 計費設定模態 */}
      <GoogleCloudBillingModal
        isOpen={showBillingModal}
        onClose={() => {
          setShowBillingModal(false);
          setBillingErrorMessage('');
        }}
        errorMessage={billingErrorMessage}
      />

      {/* 圖像預覽模態框 */}
      {showImagePreview && tempImages.length > 0 && (
        <ImagePreviewModal />
      )}
    </div>
  );
};

export default BatchIllustrationPanel;

// 開發環境性能監控（暫時註解避免模組載入錯誤）
// if (process.env.NODE_ENV === 'development') {
//   import('../../utils/reactScan').then(({ monitorComponent }) => {
//     monitorComponent(BatchIllustrationPanel, 'BatchIllustrationPanel');
//   });
// }