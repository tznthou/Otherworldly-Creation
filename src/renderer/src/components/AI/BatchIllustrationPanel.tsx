import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ImagePreviewModal from './VisualCreation/ImagePreviewModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { api } from '../../api';
import { BatchStatusReport } from '../../types/illustration';
import { Character } from '../../api/models';
import CosmicButton from '../UI/CosmicButton';
import LoadingSpinner from '../UI/LoadingSpinner';
import { GoogleCloudBillingModal } from '../Modals/GoogleCloudBillingModal';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { useBatchConfiguration, useCharacterSelection } from '../../hooks/illustration';
import { useBatchSubmission } from '../../hooks/useBatchSubmission';
import { Icon } from '../UI/Icon';

// 導入子組件
import BatchConfigurationSection from './BatchIllustration/BatchConfigurationSection';
import CharacterSelectionSection from './BatchIllustration/CharacterSelectionSection';
import IllustrationRequestsSection, { BatchRequestItem } from './BatchIllustration/IllustrationRequestsSection';
import BatchHistorySection from './BatchIllustration/BatchHistorySection';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('BatchIllustrationPanel');

interface BatchIllustrationPanelProps {
  className?: string;
}

const BatchIllustrationPanel: React.FC<BatchIllustrationPanelProps> = ({
  className = ''
}) => {
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);

  // 組件狀態
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // 批次配置管理 Hook
  const batchConfig = useBatchConfiguration({
    initialPriority: 1, // TaskPriority.Normal
    initialMaxParallel: 2,
    autoValidate: true,
  });

  // 角色選擇管理 Hook
  const characterSelection = useCharacterSelection({
    projectId: currentProject?.id,
    autoLoadOnMount: true,
  });

  // 批次提交邏輯 Hook
  const batchSubmission = useBatchSubmission({
    batchConfig,
    characterSelection,
    currentProject
  });

  // 批次請求列表
  const [requests, setRequests] = useState<BatchRequestItem[]>([]);
  
  // 場景類型狀態
  const [sceneType, setSceneType] = useState<'portrait' | 'scene' | 'interaction'>('portrait');

  // 監控狀態
  const [_activeBatches, setActiveBatches] = useState<BatchStatusReport[]>([]);

  // 優化計算：避免重複計算的值
  const _requestsCount = useMemo(() => requests.length, [requests.length]); // TODO: Use or remove
  const hasRequests = useMemo(() => requests.length > 0, [requests.length]);
  const canSubmit = useMemo(() => 
    !batchSubmission.isProcessing && hasRequests && batchConfig.isValidConfiguration,
    [batchSubmission.isProcessing, hasRequests, batchConfig.isValidConfiguration]
  );

  // 載入活動批次
  const loadActiveBatches = useCallback(async () => {
    try {
      log.debug('[BatchIllustrationPanel] 開始載入活動批次...');
      const result = await api.illustration.getAllBatchesSummary();
      log.debug('[BatchIllustrationPanel] 批次摘要結果:', result);
      
      if (result.success) {
        log.debug('[BatchIllustrationPanel] 成功載入批次列表:', result.batches || []);
        setActiveBatches(result.batches || []);
      } else {
        log.error('[BatchIllustrationPanel] 載入批次列表失敗:', result.message);
        batchSubmission.setError(result.message || '無法載入批次列表');
        setActiveBatches([]);
      }
    } catch (err) {
      log.error('[BatchIllustrationPanel] 載入活動批次失敗:', err);
      batchSubmission.setError('載入批次列表失敗: ' + err);
      setActiveBatches([]);
    }
  }, [batchSubmission]);

  // 初始化批次管理器
  const initializeBatchManager = useCallback(async () => {
    try {
      log.debug('[BatchIllustrationPanel] 開始初始化批次管理器...');
      const result = await api.illustration.initializeBatchManager();
      log.debug('[BatchIllustrationPanel] 批次管理器初始化結果:', result);
      
      if (result.success) {
        log.debug('[BatchIllustrationPanel] 批次管理器初始化成功，載入活動批次...');
        await loadActiveBatches();
      } else {
        log.error('[BatchIllustrationPanel] 批次管理器初始化失敗:', result.message);
        batchSubmission.setError(result.message || '批次管理器初始化失敗');
      }
    } catch (err) {
      log.error('[BatchIllustrationPanel] 初始化批次管理器失敗:', err);
      batchSubmission.setError('初始化批次管理器失敗: ' + err);
    }
  }, [loadActiveBatches, batchSubmission]);

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
    const selectedChars = characterSelection.getSelectedCharactersData();

    const newRequest: BatchRequestItem = {
      id: Date.now().toString(),
      scene_description: generateSceneDescription(selectedChars, sceneType),
      selectedCharacterIds: [...characterSelection.selectedCharacters],
      style_template: sceneType === 'portrait' ? 'anime-portrait' : 'fantasy-scene',
      aspect_ratio: 'square',
      scene_type: sceneType
    };
    setRequests(prev => [...prev, newRequest]);
  }, [generateSceneDescription, characterSelection, sceneType]);

  // 為每個角色生成肖像
  const batchAddPortraits = useCallback(() => {
    characterSelection.selectedCharacters.forEach(charId => {
      const char = characterSelection.effectiveProjectCharacters.find(c => c.id === charId);
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
  }, [characterSelection]);

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

  // 提交批次請求
  const submitBatch = useCallback(async () => {
    await batchSubmission.submitBatch(requests);
  }, [batchSubmission, requests]);

  // 組件初始化
  useEffect(() => {
    initializeBatchManager();
  }, []); // 🔥 修復無限循環：只在組件掛載時執行一次

  // 🚫 自動獲取API金鑰功能已禁用 - 避免無限循環
  // useEffect(() => {
  //   const loadApiKey = async () => {
  //     try {
  //       const response = await api.aiProviders.getAll();
  //
  //       if (response.success && response.providers) {
  //         // 優先找 Gemini provider
  //         const geminiProvider = response.providers.find((p) =>
  //           p.provider_type === 'gemini' && p.is_enabled
  //         );
  //
  //         if (geminiProvider?.api_key_encrypted) {
  //           try {
  //             const decodedApiKey = atob(geminiProvider.api_key_encrypted);
  //             batchConfig.setApiKey(decodedApiKey);
  //             batchConfig.setApiKeySource('gemini');
  //             log.debug('✅ 已自動載入並解碼 Gemini API 金鑰');
  //             return;
  //           } catch (error) {
  //             log.error('❌ 解碼 Gemini API 金鑰失敗:', error);
  //           }
  //         }
  //
  //         // 檢查 OpenRouter
  //         const openrouterProvider = response.providers.find((p) =>
  //           p.provider_type === 'openrouter' && p.is_enabled
  //         );
  //
  //         if (openrouterProvider?.api_key_encrypted) {
  //           const modelName = openrouterProvider.model || '';
  //           if (modelName.toLowerCase().includes('imagen') || modelName.toLowerCase().includes('gemini')) {
  //             try {
  //               const decodedApiKey = atob(openrouterProvider.api_key_encrypted);
  //               batchConfig.setApiKey(decodedApiKey);
  //               batchConfig.setApiKeySource('openrouter');
  //               log.debug('✅ 已自動載入並解碼 OpenRouter API 金鑰');
  //             } catch (error) {
  //               log.error('❌ 解碼 OpenRouter API 金鑰失敗:', error);
  //             }
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       log.error('無法自動載入 API 金鑰:', error);
  //     }
  //   };
  //
  //   if (currentProject) {
  //     loadApiKey();
  //   }
  // }, [currentProject]); // 🔥 修復無限循環：移除 batchConfig 依賴

  return (
    <div className={`batch-illustration-panel ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Icon name="Bolt" variant="solid" className="w-6 h-6 mr-2 text-warm-gold" />
            批次插畫生成
          </h2>
        </div>

        {/* 標籤導航 */}
        <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
          {[
            { id: 'create', label: '創建批次', iconName: 'Plus', iconVariant: 'solid' as const },
            { id: 'history', label: '歷史記錄', iconName: 'ClipboardDocumentList', iconVariant: 'outline' as const }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'create' | 'history')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-clay-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Icon name={tab.iconName} variant={tab.iconVariant} className="w-4 h-4 mr-2 inline-block" />
              {tab.label}
            </button>
          ))}
        </div>

        {batchSubmission.error && (
          <Alert variant="destructive" className="mb-6">
            {batchSubmission.error}
          </Alert>
        )}

        {/* 創建批次 */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* 批次設定 */}
            <BatchConfigurationSection batchConfig={batchConfig} />

            {/* 角色選擇區域 */}
            <CharacterSelectionSection 
              characterSelection={characterSelection}
              sceneType={sceneType}
              onSceneTypeChange={setSceneType}
            />

            {/* 請求列表 */}
            <IllustrationRequestsSection
              requests={requests}
              onAddRequest={addRequest}
              onRemoveRequest={removeRequest}
              onUpdateRequest={updateRequest}
              characterSelection={characterSelection}
              sceneType={sceneType}
              onBatchAddPortraits={batchAddPortraits}
            />

            {/* 提交按鈕 */}
            <div className="flex justify-center">
              <CosmicButton
                onClick={submitBatch}
                disabled={!canSubmit}
                size="large"
              >
                {batchSubmission.isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="small" />
                    <span>提交中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Icon name="Rocket" variant="solid" className="w-5 h-5" />
                    <span>提交批次</span>
                  </div>
                )}
              </CosmicButton>
            </div>
          </div>
        )}

        {/* 歷史記錄 */}
        {activeTab === 'history' && (
          <BatchHistorySection />
        )}
      </Card>
      
      {/* Google Cloud 計費設定模態 */}
      <GoogleCloudBillingModal
        isOpen={batchSubmission.showBillingModal}
        onClose={() => {
          batchSubmission.setShowBillingModal(false);
          batchSubmission.setBillingErrorMessage('');
        }}
        errorMessage={batchSubmission.billingErrorMessage}
      />

      {/* 圖像預覽模態框 */}
      {batchSubmission.showImagePreview && batchSubmission.tempImages.length > 0 && (
        <ImagePreviewModal />
      )}
    </div>
  );
};

export default BatchIllustrationPanel;