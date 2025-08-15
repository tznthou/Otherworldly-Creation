import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { fetchCharactersByProjectId } from '../../store/slices/charactersSlice';
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
import { openrouterImageService } from '../../services/openrouterImageService';
import { Progress } from '../UI/Progress';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { imageGenerationService } from '../../services/imageGenerationService';
import type { ImageGenerationOptions } from '../../services/imageGenerationService';
import { SafetyFilterLevel } from '@google/genai';

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
  const dispatch = useDispatch<AppDispatch>();
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);

  // 組件狀態
  const [activeTab, setActiveTab] = useState<'create' | 'monitor' | 'history'>('create');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // 批次創建狀態
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [batchPriority, setBatchPriority] = useState<TaskPriority>(TaskPriority.Normal);
  const [maxParallel, setMaxParallel] = useState(2);
  const [requests, setRequests] = useState<BatchRequestItem[]>([]);
  const [apiKey, setApiKey] = useState('');
  
  // 新增：色彩模式和API金鑰來源狀態
  const [globalColorMode, setGlobalColorMode] = useState<'color' | 'monochrome'>('color');
  const [apiKeySource, setApiKeySource] = useState<'manual' | 'gemini' | 'openrouter'>('manual');
  
  // 新增：Google Cloud 計費模態狀態
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingErrorMessage, setBillingErrorMessage] = useState('');
  
  // 新增：OpenRouter 測試狀態
  const [openrouterTestResult, setOpenrouterTestResult] = useState<any>(null);
  const [isTestingOpenrouter, setIsTestingOpenrouter] = useState(false);

  // 角色選擇狀態
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [sceneType, setSceneType] = useState<'portrait' | 'scene' | 'interaction'>('portrait');

  // 監控狀態
  const [_activeBatches, setActiveBatches] = useState<BatchStatusReport[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchDetails, setBatchDetails] = useState<BatchStatusReport | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 歷史狀態
  const [_batchHistory, _setBatchHistory] = useState<BatchStatusReport[]>([]);

  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

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

  // 角色選擇處理
  const toggleCharacterSelection = (characterId: string) => {
    setSelectedCharacters(prev => 
      prev.includes(characterId) 
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  // 生成智能場景描述
  const generateSceneDescription = (characters: Character[], sceneType: string) => {
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
  };

  // 添加新請求 (基於選中角色)
  const addRequest = () => {
    const selectedChars = selectedCharacters.map(id => 
      projectCharacters.find(c => c.id === id)
    ).filter(Boolean) as Character[];

    const newRequest: BatchRequestItem = {
      id: Date.now().toString(),
      scene_description: generateSceneDescription(selectedChars, sceneType),
      selectedCharacterIds: [...selectedCharacters],
      style_template: sceneType === 'portrait' ? 'anime-portrait' : 'fantasy-scene',
      aspect_ratio: 'square',
      scene_type: sceneType
    };
    setRequests([...requests, newRequest]);
  };

  // 移除請求
  const removeRequest = (id: string) => {
    setRequests(requests.filter(req => req.id !== id));
  };

  // 更新請求
  const updateRequest = (id: string, field: keyof BatchRequestItem, value: string | string[]) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  };

  // 提交批次請求（整合圖像生成服務）
  const submitBatch = async () => {
    if (!currentProject) {
      setError('請選擇專案');
      return;
    }

    if (!batchName.trim()) {
      setError('請輸入批次名稱');
      return;
    }

    if (requests.length === 0) {
      setError('請添加至少一個插畫請求');
      return;
    }

    if (!apiKey.trim()) {
      setError('請輸入 API 金鑰');
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
      console.log(`🚀 開始批次插畫生成：${batchName}`);
      console.log(`🎨 色彩模式：${globalColorMode === 'color' ? '彩色' : '黑白'}`);
      console.log(`📋 共 ${requests.length} 個請求`);

      // 準備圖像生成請求
      const imageRequests = requests.map(req => {
        // 根據角色信息增強場景描述
        let enhancedDescription = req.scene_description;
        
        // 加入角色資訊
        if (req.selectedCharacterIds.length > 0) {
          const characterNames = req.selectedCharacterIds.map(id => {
            const char = projectCharacters.find(c => c.id === id);
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
            colorMode: globalColorMode,
            aspectRatio: req.aspect_ratio as ImageGenerationOptions['aspectRatio'],
            numberOfImages: 1,
            sceneType: req.scene_type,
            safetyLevel: SafetyFilterLevel.BLOCK_MEDIUM_AND_ABOVE
          }
        };
      });

      // 執行批次生成
      const results = await imageGenerationService.generateBatch(
        imageRequests,
        apiKey,
        (current, total, currentPrompt) => {
          console.log(`🎨 生成進度: ${current}/${total} - ${currentPrompt?.substring(0, 50)}...`);
          // 可以在這裡更新 UI 顯示進度
        }
      );

      // 統計結果
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        console.log(`✅ 成功生成 ${successCount} 張圖像`);
        
        // 保存成功的圖像結果到本地狀態或資料庫
        const successfulResults = results.filter(r => r.success);
        console.log('生成的圖像數據:', successfulResults.map(r => ({
          success: r.success,
          imageCount: r.data?.length || 0,
          hasData: !!r.data
        })));
        
        // 重置表單
        setBatchName('');
        setBatchDescription('');
        setRequests([]);
        setSelectedCharacters([]);
        
        // 顯示成功消息
        setError(''); // 清除錯誤
        
        // 切換到監控標籤
        setActiveTab('monitor');
        
        if (failCount > 0) {
          console.warn(`⚠️ ${failCount} 張圖像生成失敗`);
          setError(`部分圖像生成失敗：成功 ${successCount}，失敗 ${failCount}`);
        }
      } else {
        throw new Error('所有圖像生成都失敗了');
      }

    } catch (err: any) {
      console.error('❌ 批次生成失敗:', err);
      
      // 檢查是否為 Google Cloud 計費問題
      const errorMessage = err.message || err.toString();
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
        setBatchDetails(mockBatchDetails);
      }
    } catch (err) {
      console.error('載入批次詳情失敗:', err);
    }
  }, []);

  // 取消批次
  const cancelBatch = async (batchId: string) => {
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
  const retryFailedTasks = async (batchId: string) => {
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

  // 測試 OpenRouter 圖像生成功能
  const testOpenRouterImageGeneration = async () => {
    if (!apiKey.trim()) {
      setError('請先輸入 API 金鑰');
      return;
    }

    setIsTestingOpenrouter(true);
    setOpenrouterTestResult(null);
    setError('');

    try {
      console.log('🧪 開始測試 OpenRouter 圖像生成...');
      const result = await openrouterImageService.testImageGeneration(apiKey);
      
      setOpenrouterTestResult(result);
      
      if (result.success) {
        console.log('✅ OpenRouter 圖像生成測試成功!', result);
      } else {
        console.warn('⚠️ OpenRouter 圖像生成測試失敗', result);
        setError('OpenRouter 圖像生成測試失敗，請查看詳細結果');
      }
    } catch (error: any) {
      console.error('❌ OpenRouter 測試失敗:', error);
      setError(`OpenRouter 測試失敗: ${error.message}`);
      setOpenrouterTestResult({
        success: false,
        supportedModels: [],
        testResults: { error: error.message }
      });
    } finally {
      setIsTestingOpenrouter(false);
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
  const getStatusText = (status: TaskStatus) => {
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

  // 組件初始化
  useEffect(() => {
    // 只調用初始化，loadActiveBatches 會在初始化成功後自動調用
    initializeBatchManager();
  }, []); // 只在組件掛載時運行一次

  // 載入當前專案角色
  useEffect(() => {
    if (currentProject?.id) {
      dispatch(fetchCharactersByProjectId(currentProject.id));
    }
  }, [currentProject?.id, dispatch]);

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
              setApiKey(decodedApiKey);
              setApiKeySource('gemini');
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
                setApiKey(decodedApiKey);
                setApiKeySource('openrouter');
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
  }, [currentProject]);

  // 自動刷新監控數據
  useEffect(() => {
    if (activeTab === 'monitor' && selectedBatchId) {
      if (refreshInterval) clearInterval(refreshInterval);
      
      const interval = setInterval(() => {
        loadBatchDetails(selectedBatchId);
      }, 5000); // 每5秒刷新
      
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [activeTab, selectedBatchId]);

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
            { id: 'monitor', label: '監控進度', icon: '📊' },
            { id: 'history', label: '歷史記錄', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
              <h3 className="text-lg font-semibold text-white mb-4">批次設定</h3>
              
              {/* 色彩模式選擇 - 全局設定 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  🎨 色彩模式 <span className="text-gray-400">(套用至整個批次)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGlobalColorMode('color')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      globalColorMode === 'color'
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
                    onClick={() => setGlobalColorMode('monochrome')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      globalColorMode === 'monochrome'
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    批次名稱 <span className="text-red-400">*</span>
                  </label>
                  <CosmicInput
                    value={batchName}
                    onChange={(value) => setBatchName(value)}
                    placeholder="例如：角色立繪批次01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    優先級
                  </label>
                  <select
                    value={batchPriority}
                    onChange={(e) => setBatchPriority(parseInt(e.target.value) as TaskPriority)}
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
                    value={maxParallel.toString()}
                    onChange={(value) => setMaxParallel(parseInt(value) || 1)}
                  />
                  <p className="text-xs text-gray-400 mt-1">同時執行的任務數量</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API 金鑰 
                    {apiKeySource !== 'manual' ? (
                      <span className="text-green-400 ml-2">
                        ✅ 已從 {apiKeySource === 'gemini' ? 'Gemini' : 'OpenRouter'} 載入
                      </span>
                    ) : (
                      <span className="text-red-400"> *</span>
                    )}
                  </label>
                  <CosmicInput
                    type="password"
                    value={apiKey}
                    onChange={(value) => {
                      setApiKey(value);
                      setApiKeySource('manual');
                    }}
                    placeholder={
                      apiKeySource !== 'manual' 
                        ? "已自動載入 (可覆寫)" 
                        : "輸入 Google Cloud API 金鑰"
                    }
                  />
                  {apiKeySource !== 'manual' && (
                    <p className="text-xs text-gray-400 mt-1">
                      💡 已自動使用 AI 提供者管理中的金鑰，您也可以手動輸入覆寫
                    </p>
                  )}
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

              {/* OpenRouter 圖像生成測試區域 */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-2 border-blue-500/60 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-300 mb-2">
                      🧪 OpenRouter 圖像生成測試
                    </h4>
                    <p className="text-sm text-blue-200 mb-3">
                      測試您的 OpenRouter API 是否支援 Gemini 2.0 Flash (Image Gen) 模型
                    </p>
                    
                    <div className="flex items-center space-x-3 mb-3">
                      <button
                        onClick={testOpenRouterImageGeneration}
                        disabled={!apiKey.trim() || isTestingOpenrouter}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors flex items-center space-x-2"
                      >
                        {isTestingOpenrouter ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>測試中...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span>測試 OpenRouter</span>
                          </>
                        )}
                      </button>
                      
                      {openrouterTestResult && (
                        <div className={`px-3 py-1 rounded text-xs font-medium ${
                          openrouterTestResult.success 
                            ? 'bg-green-600 text-green-100' 
                            : 'bg-red-600 text-red-100'
                        }`}>
                          {openrouterTestResult.success ? '✅ 支援圖像生成' : '❌ 不支援圖像生成'}
                        </div>
                      )}
                    </div>

                    {/* 測試結果詳情 */}
                    {openrouterTestResult && (
                      <div className="mt-3 p-3 bg-black/20 rounded border border-blue-400/30">
                        <p className="text-xs text-blue-300 font-medium mb-2">測試結果：</p>
                        <div className="text-xs text-blue-100 space-y-1">
                          {openrouterTestResult.success ? (
                            <>
                              <p>✅ 支援的模型: {openrouterTestResult.supportedModels.join(', ')}</p>
                              <p className="text-green-300">🎉 您可以使用 OpenRouter 進行圖像生成！</p>
                            </>
                          ) : (
                            <>
                              <p>❌ 測試失敗</p>
                              <div className="mt-2 text-xs text-gray-300">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(openrouterTestResult.testResults, null, 2)}
                                </pre>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  批次描述
                </label>
                <textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="可選：描述這個批次的用途"
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {/* 角色選擇區域 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">
                🎭 選擇角色 ({selectedCharacters.length} 已選擇)
              </h3>
              
              <div className="character-grid flex flex-wrap gap-6 mb-6">
                {projectCharacters.map((character) => {
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
                
                {projectCharacters.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    <p>此專案還沒有角色</p>
                    <p className="text-sm mt-2">請先到角色管理頁面創建角色</p>
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
                      onClick={() => setSceneType(type.value as any)}
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
                        const char = projectCharacters.find(c => c.id === charId);
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
                            const character = projectCharacters.find(c => c.id === charId);
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
                disabled={isProcessing || requests.length === 0 || !batchName.trim() || !apiKey.trim()}
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

        {/* 監控進度 */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            {/* 提示信息 - 當沒有選中批次ID時顯示 */}
            {!selectedBatchId && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-blue-400 mb-2">批次提交成功！</h3>
                <p className="text-gray-300 mb-4">
                  您的插畫生成批次已提交。批次 ID 會自動填入下方，您也可以手動輸入其他批次 ID 進行監控。
                </p>
                <p className="text-sm text-gray-400">
                  💡 提示：提交新批次後會自動切換到此頁面並顯示進度
                </p>
              </div>
            )}
            
            {/* 批次查詢區域 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">🔍 批次查詢</h3>
                {selectedBatchId && (
                  <div className="text-sm text-gray-400">
                    當前批次：<span className="text-gold-400 font-mono">{selectedBatchId}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <CosmicInput
                  value={selectedBatchId}
                  onChange={(value) => setSelectedBatchId(value)}
                  placeholder="輸入批次 ID（例如：batch_abc123）"
                  className="flex-1"
                />
                <CosmicButton
                  onClick={() => loadBatchDetails(selectedBatchId)}
                  disabled={!selectedBatchId.trim()}
                  variant="secondary"
                >
                  🔍 查詢
                </CosmicButton>
              </div>
              
              <div className="mt-3 text-sm text-gray-400">
                <p>💡 批次 ID 會在提交時顯示在控制台，格式通常為 "batch_" 開頭的字符串</p>
              </div>
            </div>

            {/* 批次詳情 */}
            {batchDetails && (
              <div className="space-y-6">
                {/* 批次概覽 */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <span className="mr-2">📊</span>
                      批次 {batchDetails.batch_id} 概覽
                    </h3>
                    <div className="flex space-x-2">
                      <CosmicButton
                        onClick={() => retryFailedTasks(batchDetails.batch_id)}
                        variant="secondary"
                        size="small"
                        disabled={batchDetails.failed_tasks === 0}
                      >
                        🔄 重試失敗
                      </CosmicButton>
                      <CosmicButton
                        onClick={() => cancelBatch(batchDetails.batch_id)}
                        variant="danger"
                        size="small"
                      >
                        ❌ 取消批次
                      </CosmicButton>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{batchDetails.total_tasks}</div>
                      <div className="text-sm text-gray-400">總任務</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{batchDetails.completed_tasks}</div>
                      <div className="text-sm text-gray-400">已完成</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{batchDetails.running_tasks}</div>
                      <div className="text-sm text-gray-400">執行中</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">{batchDetails.failed_tasks}</div>
                      <div className="text-sm text-gray-400">失敗</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">{batchDetails.queued_tasks}</div>
                      <div className="text-sm text-gray-400">排隊</div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>總進度</span>
                      <span>{(batchDetails.overall_progress * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={batchDetails.overall_progress * 100} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">平均執行時間：</span>
                      <span className="text-white">
                        {(batchDetails.statistics.average_execution_time_ms / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">總費用：</span>
                      <span className="text-white">${batchDetails.statistics.total_api_costs.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">錯誤率：</span>
                      <span className="text-white">
                        {(batchDetails.statistics.error_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">吞吐量：</span>
                      <span className="text-white">
                        {batchDetails.statistics.throughput_per_hour.toFixed(1)}/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* 任務詳情 */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">📋</span>
                    任務詳情 ({batchDetails.task_details.length} 項任務)
                  </h3>
                  <div className="space-y-3">
                    {batchDetails.task_details.map((task, index) => (
                      <div key={task.task_id} className="bg-gray-700 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">
                            任務 {index + 1} - {task.task_id}
                          </span>
                          <Badge variant={
                            task.status === TaskStatus.Completed ? 'default' :
                            task.status === TaskStatus.Failed ? 'destructive' :
                            task.status === TaskStatus.Running ? 'outline' : 'secondary'
                          }>
                            {getStatusText(task.status)}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2">
                          當前步驟: {task.current_step}
                        </div>
                        
                        {task.status === TaskStatus.Running && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>進度</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                          <div>
                            執行時間: {(task.performance_metrics.execution_time_ms / 1000).toFixed(1)}s
                          </div>
                          <div>
                            重試次數: {task.retry_count}
                          </div>
                          <div>
                            費用: ${task.performance_metrics.total_cost.toFixed(3)}
                          </div>
                          <div>
                            記憶體: {task.performance_metrics.memory_usage_mb}MB
                          </div>
                        </div>
                        
                        {task.error_message && (
                          <div className="text-red-400 text-sm mt-2 p-2 bg-red-900/20 rounded">
                            <span className="font-semibold">錯誤:</span> {task.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* 如果查詢了批次但沒有詳情，顯示說明 */}
            {selectedBatchId && !batchDetails && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-yellow-400 mb-2">找不到批次詳情</h3>
                <p className="text-gray-300 mb-4">
                  批次 ID "<span className="font-mono text-yellow-400">{selectedBatchId}</span>" 可能不存在或尚未開始處理。
                </p>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>• 請確認批次 ID 是否正確</p>
                  <p>• 剛提交的批次可能需要幾秒鐘才能開始處理</p>
                  <p>• 可以點擊「🔍 查詢」按鈕重新獲取狀態</p>
                </div>
              </div>
            )}
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