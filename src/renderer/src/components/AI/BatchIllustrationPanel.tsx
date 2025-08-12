import React, { useState, useEffect } from 'react';
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
import { Progress } from '../UI/Progress';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';

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

  // 初始化批次管理器
  const initializeBatchManager = async () => {
    try {
      await api.illustration.initializeBatchManager();
    } catch (err) {
      console.error('初始化批次管理器失敗:', err);
    }
  };

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

  // 提交批次請求
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
      // 轉換為 API 格式
      const apiRequests = requests.map(req => ({
        project_id: currentProject.id,
        character_id: req.selectedCharacterIds.length > 0 ? req.selectedCharacterIds[0] : null,
        scene_description: req.scene_description,
        style_template_id: req.style_template,
        custom_style_params: {
          scene_type: req.scene_type,
          characters: req.selectedCharacterIds.map(id => {
            const char = projectCharacters.find(c => c.id === id);
            return char ? {
              id: char.id,
              name: char.name,
              appearance: char.appearance,
              personality: char.personality
            } : null;
          }).filter(Boolean)
        },
        use_reference_image: req.selectedCharacterIds.length > 0,
        quality_preset: 'balanced',
        batch_size: 1
      }));

      const result = await api.illustration.submitBatchRequest(
        batchName,
        currentProject.id,
        apiRequests,
        getPriorityString(batchPriority),
        maxParallel,
        apiKey
      );

      if (result.success) {
        console.log(`批次請求提交成功！批次 ID: ${result.batch_id}`);
        
        // 重置表單
        setBatchName('');
        setBatchDescription('');
        setRequests([]);
        setSelectedCharacters([]);
        
        // 切換到監控標籤
        setActiveTab('monitor');
        loadActiveBatches();
      } else {
        setError(result.message || '批次提交失敗');
      }
    } catch (err) {
      setError(`批次提交失敗: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 載入活動批次
  const loadActiveBatches = async () => {
    try {
      const result = await api.illustration.getAllBatchesSummary();
      if (result.success) {
        // 這裡需要根據實際 API 返回格式調整
        setActiveBatches([]);
      }
    } catch (err) {
      console.error('載入活動批次失敗:', err);
    }
  };

  // 載入批次詳情
  const loadBatchDetails = async (batchId: string) => {
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
  };

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

  // 獲取優先級字符串
  const getPriorityString = (priority: TaskPriority): string => {
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
    initializeBatchManager();
    loadActiveBatches();
  }, []);

  // 載入當前專案角色
  useEffect(() => {
    if (currentProject?.id) {
      dispatch(fetchCharactersByProjectId(currentProject.id));
    }
  }, [currentProject?.id, dispatch]);

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
  }, [activeTab, selectedBatchId, refreshInterval]);

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
                    API 金鑰 <span className="text-red-400">*</span>
                  </label>
                  <CosmicInput
                    type="password"
                    value={apiKey}
                    onChange={(value) => setApiKey(value)}
                    placeholder="Google Cloud API 金鑰"
                  />
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
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">選擇批次</h3>
              <div className="flex space-x-3">
                <CosmicInput
                  value={selectedBatchId}
                  onChange={(value) => setSelectedBatchId(value)}
                  placeholder="輸入批次 ID"
                  className="flex-1"
                />
                <CosmicButton
                  onClick={() => loadBatchDetails(selectedBatchId)}
                  disabled={!selectedBatchId.trim()}
                  variant="secondary"
                >
                  查詢
                </CosmicButton>
              </div>
            </div>

            {batchDetails && (
              <div className="space-y-6">
                {/* 批次概覽 */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      批次 {batchDetails.batch_id}
                    </h3>
                    <div className="flex space-x-2">
                      <CosmicButton
                        onClick={() => retryFailedTasks(batchDetails.batch_id)}
                        variant="secondary"
                        size="small"
                        disabled={batchDetails.failed_tasks === 0}
                      >
                        重試失敗
                      </CosmicButton>
                      <CosmicButton
                        onClick={() => cancelBatch(batchDetails.batch_id)}
                        variant="danger"
                        size="small"
                      >
                        取消批次
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
                  <h3 className="text-lg font-semibold text-white mb-4">任務詳情</h3>
                  <div className="space-y-3">
                    {batchDetails.task_details.map(task => (
                      <div key={task.task_id} className="bg-gray-700 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">
                            任務 {task.task_id}
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
                          <Progress value={task.progress} className="mb-2 h-2" />
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
                          <div className="text-red-400 text-sm mt-2">
                            錯誤: {task.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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