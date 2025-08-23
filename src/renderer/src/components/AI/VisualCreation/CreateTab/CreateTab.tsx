import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';

// Redux actions
import {
  generateIllustration,
  setError,
  setAutoCreateVersions,
  openVersionPanel,
} from '../../../../store/slices/visualCreationSlice';

// Custom Hooks
import { useAutoVersionCreation } from '../../../../hooks/illustration';

// UI Components
import CharacterSelector from './CharacterSelector';
import SceneBuilder from './SceneBuilder';
import GenerationControls from './GenerationControls';
import TempImageVersionCard from './TempImageVersionCard';
import PromptSuggestionPanel from '../panels/PromptSuggestionPanel';

interface CreateTabProps {
  className?: string;
}

interface BatchRequest {
  id: string;
  scene_description: string;
  selectedCharacterIds: string[];
  scene_type: 'portrait' | 'scene' | 'interaction';
  style_template: string;
  aspect_ratio: string;
}

const CreateTab: React.FC<CreateTabProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux 狀態
  const {
    currentProvider,
    selectedCharacters,
    sceneType,
    isGenerating,
    error,
    loading,
    versionManagement: { autoCreateVersions, pendingVersionCreation, lastGeneratedImageId },
    tempImages,
  } = useSelector((state: RootState) => state.visualCreation);
  
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 版本管理 Hook
  const {
    hasPendingVersions,
    pendingCount,
    manuallyCreateVersion,
    clearAllPendingVersions,
  } = useAutoVersionCreation();
  
  // 本地狀態 (批次生成相關)
  const [requests, setRequests] = useState<BatchRequest[]>([]);
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  
  // Pollinations 特定設定
  const [pollinationsModel] = useState<'flux' | 'gptimage' | 'kontext' | 'sdxl'>('flux');
  const [pollinationsStyle] = useState<'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art'>('anime');
  
  // 獲取項目角色 - 強化過濾邏輯
  const projectCharacters = characters.filter(c => {
    // 確保類型一致比較，處理string vs number的情況
    const charProjectId = String(c.projectId);
    const currentProjectId = String(currentProject?.id);
    return charProjectId === currentProjectId;
  });
  
  // 生成智能場景描述
  const generateSceneDescription = useCallback((selectedIds: string[], sceneType: string) => {
    const selectedChars = selectedIds.map(id => 
      projectCharacters.find(c => c.id === id)
    ).filter((char): char is NonNullable<typeof char> => Boolean(char));
    
    if (selectedChars.length === 0) return '';
    
    let description = '';
    
    switch (sceneType) {
      case 'portrait': {
        const char = selectedChars[0];
        if (char) {
          description = `${char.name}的精美肖像，`;
          if (char.appearance) description += `${char.appearance}，`;
          if (char.personality) description += `展現${char.personality}的特質`;
        }
        break;
      }
        
      case 'interaction':
        description = `${selectedChars.map(c => c?.name).filter(Boolean).join('和')}的互動場景，`;
        description += '自然的對話氛圍，細膩的表情刻畫';
        break;
        
      case 'scene':
        description = `${selectedChars.map(c => c?.name).filter(Boolean).join('、')}在環境中的場景，`;
        description += '豐富的背景細節，氛圍營造';
        break;
    }
    
    return description;
  }, [projectCharacters]);

  // 處理提示詞選擇
  const handlePromptSelect = useCallback((prompt: string) => {
    setCurrentPrompt(prompt);
  }, []);

  // 處理提示詞優化
  const handlePromptOptimize = useCallback((optimizedPrompt: string) => {
    setCurrentPrompt(optimizedPrompt);
  }, []);

  // 版本管理相關處理函數
  const handleToggleAutoVersions = useCallback(() => {
    dispatch(setAutoCreateVersions(!autoCreateVersions));
  }, [dispatch, autoCreateVersions]);

  const handleManualCreateVersion = useCallback(async (imageId: string) => {
    try {
      const versionId = await manuallyCreateVersion(imageId, { status: 'active' });
      console.log(`✅ 手動創建版本成功：${versionId}`);
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : '創建版本失敗'));
    }
  }, [manuallyCreateVersion, dispatch]);

  const handleCreateVariant = useCallback(async (imageId: string) => {
    const tempImage = tempImages.find(img => img.id === imageId);
    if (!tempImage) return;

    try {
      // 使用相同參數但隨機種子生成變體
      await dispatch(generateIllustration({
        prompt: tempImage.prompt,
        width: tempImage.parameters.width,
        height: tempImage.parameters.height,
        model: tempImage.parameters.model as any,
        seed: Math.floor(Math.random() * 1000000), // 隨機種子
        enhance: tempImage.parameters.enhance,
        style: tempImage.parameters.style as any,
        projectId: tempImage.project_id,
        characterId: tempImage.character_id,
        provider: currentProvider,
      })).unwrap();
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : '生成變體失敗'));
    }
  }, [dispatch, tempImages, currentProvider]);

  const handleBatchCreateVersions = useCallback(async () => {
    try {
      const selectedImages = tempImages.filter(img => pendingVersionCreation.includes(img.id));
      for (const image of selectedImages) {
        await manuallyCreateVersion(image.id, { status: 'active' });
      }
      console.log(`✅ 批量創建 ${selectedImages.length} 個版本成功`);
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : '批量創建版本失敗'));
    }
  }, [tempImages, pendingVersionCreation, manuallyCreateVersion, dispatch]);

  const handleViewVersionPanel = useCallback((imageId: string) => {
    const tempImage = tempImages.find(img => img.id === imageId);
    if (tempImage) {
      dispatch(openVersionPanel(tempImage));
    }
  }, [dispatch, tempImages]);
  
  // 添加新請求
  const addRequest = useCallback(() => {
    // 優先使用當前提示詞，否則使用自動生成的描述
    const description = currentPrompt.trim() || generateSceneDescription(selectedCharacters, sceneType);
    if (!description) {
      dispatch(setError('請先選擇角色或輸入提示詞'));
      return;
    }
    
    const newRequest: BatchRequest = {
      id: Date.now().toString(),
      scene_description: description,
      selectedCharacterIds: [...selectedCharacters],
      scene_type: sceneType,
      style_template: sceneType === 'portrait' ? 'anime-portrait' : 'fantasy-scene',
      aspect_ratio: 'square',
    };
    
    setRequests([...requests, newRequest]);
    dispatch(setError(null));
  }, [currentPrompt, selectedCharacters, sceneType, generateSceneDescription, dispatch, requests]);
  
  // 移除請求
  const removeRequest = useCallback((id: string) => {
    setRequests(requests.filter(req => req.id !== id));
  }, [requests]);
  
  // 更新請求
  const updateRequest = useCallback((id: string, field: keyof BatchRequest, value: string | string[]) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  }, [requests]);
  
  // 提交生成請求
  const handleGenerate = useCallback(async () => {
    if (!currentProject) {
      dispatch(setError('請選擇專案'));
      return;
    }
    
    if (requests.length === 0) {
      dispatch(setError('請添加至少一個插畫請求'));
      return;
    }
    
    console.log(`🚀 開始批次插畫生成：${requests.length} 個請求`);
    
    try {
      // 批次生成所有請求
      for (const request of requests) {
        await dispatch(generateIllustration({
          prompt: request.scene_description,
          width: request.aspect_ratio === 'portrait' ? 768 : request.aspect_ratio === 'landscape' ? 1024 : 1024,
          height: request.aspect_ratio === 'portrait' ? 1024 : request.aspect_ratio === 'landscape' ? 768 : 1024,
          model: pollinationsModel,
          style: pollinationsStyle,
          projectId: currentProject.id,
          characterId: request.selectedCharacterIds[0], // 使用第一個角色ID
          provider: currentProvider,
        })).unwrap();
      }
      
      // 重置表單
      setBatchName('');
      setBatchDescription('');
      setRequests([]);
      
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : '生成失敗'));
    }
  }, [currentProject, requests, dispatch, pollinationsModel, pollinationsStyle, currentProvider]);
  
  return (
    <div className={`create-tab flex flex-col h-full ${className}`}>
      {/* 頂部控制區域 */}
      <div className="flex-shrink-0 bg-cosmic-800/30 rounded-lg p-4 mb-4 border border-cosmic-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 批次設定 */}
          <div>
            <h3 className="text-sm font-medium text-gold-500 mb-2">📋 批次設定</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="批次名稱"
                className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400 text-sm"
              />
              <textarea
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="批次描述（選填）"
                className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
          
          {/* 生成控制 */}
          <div>
            <h3 className="text-sm font-medium text-gold-500 mb-2">⚡ 快速生成</h3>
            <div className="space-y-2">
              <button
                onClick={addRequest}
                disabled={selectedCharacters.length === 0}
                className="w-full px-3 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-cosmic-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                添加請求
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || requests.length === 0}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-cosmic-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                {isGenerating ? '生成中...' : `生成 ${requests.length} 張插畫`}
              </button>
            </div>
          </div>
          
          {/* 狀態顯示 */}
          <div>
            <h3 className="text-sm font-medium text-cosmic-300 mb-2">📊 狀態</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-cosmic-400">服務:</span>
                <span className={currentProvider === 'pollinations' ? 'text-green-400' : 'text-blue-400'}>
                  {currentProvider === 'pollinations' ? '🆓 Pollinations' : '💳 Imagen'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-cosmic-400">選中角色:</span>
                <span className="text-cosmic-200">{selectedCharacters.length} 個</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cosmic-400">場景類型:</span>
                <span className="text-cosmic-200">
                  {sceneType === 'portrait' ? '👤 肖像' : 
                   sceneType === 'interaction' ? '👥 互動' : '🏞️ 場景'}
                </span>
              </div>
              
              {/* 版本管理狀態 */}
              <div className="border-t border-cosmic-600 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-cosmic-400">自動版本:</span>
                  <button
                    onClick={handleToggleAutoVersions}
                    className={`text-xs px-2 py-1 rounded ${
                      autoCreateVersions 
                        ? 'bg-green-600 text-white' 
                        : 'bg-cosmic-600 text-cosmic-300'
                    }`}
                  >
                    {autoCreateVersions ? '✅ 啟用' : '❌ 停用'}
                  </button>
                </div>
                {hasPendingVersions && (
                  <div className="flex justify-between mt-1">
                    <span className="text-cosmic-400">待創建:</span>
                    <span className="text-orange-400">{pendingCount} 個版本</span>
                  </div>
                )}
                {lastGeneratedImageId && (
                  <div className="flex justify-between mt-1">
                    <span className="text-cosmic-400">最新圖片:</span>
                    <span className="text-green-400">已生成 ✨</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 主要內容區域 */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* 左側：角色選擇和場景建構 */}
        <div className="space-y-4 overflow-y-auto">
          <CharacterSelector />
          <SceneBuilder />
          
          {/* 當前提示詞輸入 */}
          <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
            <h3 className="text-sm font-medium text-gold-500 mb-2">✏️ 當前提示詞</h3>
            <textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="在此輸入或編輯提示詞，留空將使用自動生成的場景描述..."
              className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white placeholder-cosmic-400 text-sm resize-none"
              rows={4}
            />
            <div className="text-xs text-cosmic-400 mt-2">
              提示：選擇角色後可使用智能助手獲得 AI 建議
            </div>
          </div>
        </div>
        
        {/* 中間：智能提示詞助手（在大螢幕上顯示） */}
        <div className="hidden xl:block space-y-4 overflow-y-auto">
          <PromptSuggestionPanel
            selectedCharacters={projectCharacters.filter(char => 
              selectedCharacters.includes(char.id)
            )}
            sceneType={sceneType}
            currentPrompt={currentPrompt}
            onPromptSelect={handlePromptSelect}
            onPromptOptimize={handlePromptOptimize}
          />
        </div>
        
        {/* 右側：生成控制和請求列表 */}
        <div className="space-y-4 overflow-y-auto">
          <GenerationControls 
            requests={requests}
            onRemoveRequest={removeRequest}
            onUpdateRequest={updateRequest}
          />
          
          {/* 在小螢幕上顯示智能提示詞助手 */}
          <div className="xl:hidden">
            <PromptSuggestionPanel
              selectedCharacters={projectCharacters.filter(char => 
                selectedCharacters.includes(char.id)
              )}
              sceneType={sceneType}
              currentPrompt={currentPrompt}
              onPromptSelect={handlePromptSelect}
              onPromptOptimize={handlePromptOptimize}
            />
          </div>
        </div>
      </div>
      
      {/* 生成結果區域 */}
      {tempImages.length > 0 && (
        <div className="flex-shrink-0 mt-4">
          {/* 批量操作面板 */}
          {hasPendingVersions && (
            <div className="mb-4 p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-300 text-sm">
                    ⏳ 有 {pendingCount} 個圖片待創建正式版本
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBatchCreateVersions}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                  >
                    💾 批量保存為正式版本
                  </button>
                  <button
                    onClick={clearAllPendingVersions}
                    className="px-3 py-1 bg-cosmic-600 hover:bg-cosmic-700 text-white text-sm rounded transition-colors"
                  >
                    ❌ 清空待創建列表
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 臨時圖片網格 */}
          <div className="bg-cosmic-800/30 rounded-lg border border-cosmic-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gold-500">🎨 生成結果</h3>
              <span className="text-sm text-cosmic-400">共 {tempImages.length} 張圖片</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tempImages.map((tempImage) => (
                <TempImageVersionCard
                  key={tempImage.id}
                  tempImage={tempImage}
                  isPendingVersion={pendingVersionCreation.includes(tempImage.id)}
                  isLastGenerated={tempImage.id === lastGeneratedImageId}
                  onCreateVersion={handleManualCreateVersion}
                  onCreateVariant={handleCreateVariant}
                  onViewVersionPanel={handleViewVersionPanel}
                />
              ))}
            </div>
            
            {/* 統計信息 */}
            <div className="mt-4 pt-4 border-t border-cosmic-600 flex justify-between text-xs text-cosmic-400">
              <div className="flex gap-4">
                <span>總數: {tempImages.length}</span>
                <span>待版本化: {pendingCount}</span>
                <span>免費生成: {tempImages.filter(img => img.is_free).length}</span>
              </div>
              <div>
                總生成時間: {(tempImages.reduce((sum, img) => sum + img.generation_time_ms, 0) / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 錯誤提示 */}
      {error && (
        <div className="flex-shrink-0 mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <div className="text-red-300 text-sm">{error}</div>
        </div>
      )}
      
      {/* 載入狀態 */}
      {loading.generating && (
        <div className="flex-shrink-0 mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="text-blue-300 text-sm flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full mr-2"></div>
            正在生成插畫...
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTab;