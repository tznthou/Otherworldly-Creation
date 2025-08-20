import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';

// Redux actions
import {
  generateIllustration,
  setError,
} from '../../../../store/slices/visualCreationSlice';

// UI Components
import CharacterSelector from './CharacterSelector';
import SceneBuilder from './SceneBuilder';
import GenerationControls from './GenerationControls';

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
  } = useSelector((state: RootState) => state.visualCreation);
  
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 本地狀態 (批次生成相關)
  const [requests, setRequests] = useState<BatchRequest[]>([]);
  const [batchName, setBatchName] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  
  // Pollinations 特定設定
  const [pollinationsModel] = useState<'flux' | 'gptimage' | 'kontext' | 'sdxl'>('flux');
  const [pollinationsStyle] = useState<'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art'>('anime');
  
  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);
  
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
  
  // 添加新請求
  const addRequest = useCallback(() => {
    const description = generateSceneDescription(selectedCharacters, sceneType);
    if (!description) {
      dispatch(setError('請先選擇角色'));
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
  }, [selectedCharacters, sceneType, generateSceneDescription, dispatch, requests]);
  
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
            </div>
          </div>
        </div>
      </div>
      
      {/* 主要內容區域 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        {/* 左側：角色選擇和場景建構 */}
        <div className="space-y-4 overflow-y-auto">
          <CharacterSelector />
          <SceneBuilder />
        </div>
        
        {/* 右側：生成控制和請求列表 */}
        <div className="space-y-4 overflow-y-auto">
          <GenerationControls 
            requests={requests}
            onRemoveRequest={removeRequest}
            onUpdateRequest={updateRequest}
          />
        </div>
      </div>
      
      {/* 錯誤提示 */}
      {error && (
        <div className="flex-shrink-0 mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {/* 載入狀態 */}
      {loading.generating && (
        <div className="flex-shrink-0 mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <p className="text-blue-300 text-sm flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full mr-2"></div>
            正在生成插畫...
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateTab;