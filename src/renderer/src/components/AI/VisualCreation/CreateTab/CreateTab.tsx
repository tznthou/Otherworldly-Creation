import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';
import { useNotification } from '../../../UI/NotificationSystem';

// Redux actions
import {
  setError,
  openVersionPanel,
  addTempImage,
  setShowImagePreview,
  setCurrentImageIndex,
  clearTempImages,
  type TempImageData,
} from '../../../../store/slices/visualCreationSlice';

// API
import { api } from '../../../../api/tauri';
import { illustrationAPI } from '../../../../api/illustration';

// Custom Hooks
import { useIllustrationService } from '../../../../hooks/illustration';
// import { useAutoVersionCreation } from '../../../../hooks/illustration'; // 已改用收藏功能替代

// UI Components
import CharacterSelector from './CharacterSelector';
import SceneBuilder from './SceneBuilder';
import PromptSuggestionPanel from '../panels/PromptSuggestionPanel';

// Shared Components
import WorkflowSteps from '../shared/WorkflowSteps';
import GuidanceCard from '../shared/GuidanceCard';
import Tooltip from '../../../UI/Tooltip';
import { SafeImage } from '../../../UI/SafeImage';
import { GUIDANCE_TEXTS } from '../shared/guidanceTexts';
import { createLogger } from '../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('CreateTab');

interface CreateTabProps {
  className?: string;
}

interface BatchRequest {
  id: string;
  scene_description: string;
  enriched_prompt: string;
  selectedCharacterIds: string[];
  scene_type: 'portrait' | 'scene' | 'interaction';
  style_template: string;
  aspect_ratio: string;
}

const CreateTab: React.FC<CreateTabProps> = ({ className = '' }) => {
  const dispatch = useDispatch<AppDispatch>();
  const notification = useNotification();
  
  // 插畫服務配置
  const {
    illustrationProvider,
    apiKey,
    serviceDisplayName,
    globalColorMode,
  } = useIllustrationService();
  
  // Redux 狀態
  const {
    selectedCharacters,
    sceneType,
    artStyle,
    loading,
    error,
    tempImages,
    isGenerating,
    showImagePreview,
    currentImageIndex,
  } = useSelector((state: RootState) => state.visualCreation);
  
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 獲取專案角色
  const projectCharacters = characters.filter(c => {
    const charProjectId = String(c.projectId);
    const currentProjectId = String(currentProject?.id);
    return charProjectId === currentProjectId;
  });

  // 本地狀態
  const [sceneDescription, setSceneDescription] = useState('');
  const [englishPrompt, setEnglishPrompt] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [batchRequests, setBatchRequests] = useState<BatchRequest[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);

  // 刪除臨時圖片處理函數
  const handleDeleteImages = useCallback(() => {
    if (!tempImages || tempImages.length === 0) {
      notification.warning('沒有可刪除的圖片', '預覽區已經是空的');
      return;
    }

    const count = tempImages.length;
    dispatch(clearTempImages());
    notification.info('✅ 已刪除', `已清空 ${count} 張臨時圖片，可繼續生成新圖片`);
    log.debug('🗑️ [CreateTab] 已清空臨時圖片', { count });
  }, [tempImages, dispatch, notification]);

  // 自動版本創建 Hook - 現已改用收藏功能替代
  // const { createVersionForImage } = useAutoVersionCreation();

  // 生成增強的 prompt，整合角色背景資訊
  const buildEnrichedPrompt = useCallback((sceneDesc: string, characterIds: string[]) => {
    const selectedChars = projectCharacters.filter(char => characterIds.includes(char.id));
    
    if (selectedChars.length === 0) {
      return sceneDesc;
    }

    // 構建角色詳細資訊
    const characterDetails = selectedChars.map(char => {
      const details = [];
      if (char.name) details.push(`名稱: ${char.name}`);
      if (char.appearance) details.push(`外觀: ${char.appearance}`);
      if (char.personality) details.push(`個性: ${char.personality}`);
      if (char.background) details.push(`背景: ${char.background}`);
      if (char.age) details.push(`年齡: ${char.age}`);
      if (char.gender) details.push(`性別: ${char.gender}`);
      
      return details.length > 0 ? details.join(', ') : char.name;
    }).filter(Boolean);

    // 組合最終 prompt
    if (characterDetails.length > 0) {
      return `${sceneDesc}\n\n[角色詳細資訊]\n${characterDetails.join('\n')}\n\n請確保生成的圖像準確反映上述角色特徵和場景描述。`;
    }
    
    return sceneDesc;
  }, [projectCharacters]);

  // 計算當前工作流程步驟
  const getCurrentStep = () => {
    if (selectedCharacters.length === 0) return 0;
    if (!sceneType) return 1; 
    if (!sceneDescription.trim()) return 2;
    return 3;
  };

  // 添加請求到批次
  const handleAddToBatch = useCallback(() => {
    if (selectedCharacters.length === 0) {
      dispatch(setError('請先選擇角色'));
      return;
    }
    
    if (!sceneType) {
      dispatch(setError('請選擇場景類型'));
      return;
    }
    
    if (!sceneDescription.trim()) {
      dispatch(setError('請輸入場景描述'));
      return;
    }

    // 生成增強的 prompt
    const enrichedPrompt = buildEnrichedPrompt(sceneDescription.trim(), selectedCharacters);

    const request: BatchRequest = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scene_description: sceneDescription.trim(),
      enriched_prompt: enrichedPrompt,
      selectedCharacterIds: [...selectedCharacters],
      scene_type: sceneType,
      style_template: artStyle,
      aspect_ratio: '1:1', // 默認比例
    };

    setBatchRequests([...batchRequests, request]);
    
    // 清空場景描述，但保留角色和場景類型選擇
    setSceneDescription('');
    
    log.debug('📋 [CreateTab] 已添加批次請求:', request);
  }, [selectedCharacters, sceneType, sceneDescription, artStyle, batchRequests, buildEnrichedPrompt, dispatch]);

  // 獲取AI服務提供者的正確模型名稱
  const getModelNameForProvider = (provider: string): string => {
    switch (provider) {
      case 'pollinations':
        return 'flux';
      case 'gemini':
        return 'gemini-2.5-flash-image-preview';
      case 'openrouter':
        return 'google/gemini-2.5-flash-image-preview';
      case 'imagen':
        return 'imagen-3';
      case 'openai':
        return 'dall-e-3';
      case 'claude':
        return 'claude-3.5-sonnet';
      default:
        return provider;
    }
  };

  // 🎯 智能Seed生成系統：確保不同環境產生不同插畫
  const generateSmartSeed = useCallback((characterIds: string[], prompt: string, templateId?: string): number => {
    // 基礎隨機性：時間戳（毫秒）+ 強化隨機數
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000); // 增強隨機範圍
    
    // 🔐 隱私友好的環境特徵：僅收集必要且無敏感性的信息
    const language = window.navigator.language || 'en-US';
    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch (_error) {
        log.warn('🔍 [SmartSeed] 無法獲取時區，使用UTC');
        return 'UTC';
      }
    })();
    
    // 內容特徵：基於角色、提示詞和模板創建內容指紋
    const characterHash = characterIds.join('|');
    const promptHash = prompt.slice(0, 30); // 限制長度避免過長prompt影響性能
    const templateHash = templateId || 'default';
    
    // 🚀 優化：限制組合字符串長度以提升性能
    const combinedString = [
      timestamp.toString(),
      random.toString(),
      language,
      timezone,
      characterHash,
      promptHash,
      templateHash
    ].join('|').slice(0, 300); // 限制總長度避免性能問題
    
    // 使用高效hash函數將字符串轉換為數字seed
    let hash = 0;
    const maxIterations = Math.min(combinedString.length, 200); // 限制計算循環次數
    for (let i = 0; i < maxIterations; i++) {
      const char = combinedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    
    // 確保seed為正數且在Pollinations API支持範圍內（1-999999999）
    const seed = Math.abs(hash) % 999999999 + 1;
    
    log.debug('🎲 [CreateTab] 智能Seed生成', { seed,
      characterCount: characterIds.length,
      promptLength: prompt.length,
      templateId,
      environmentFactors: { language, timezone }, // 隱私友好的日誌
      timestamp,
      random
    });
    
    return seed;
  }, []);

  const handleBatchGenerate = useCallback(async () => {
    if (batchRequests.length === 0) {
      dispatch(setError('請先添加至少一個生成請求'));
      return;
    }

    if (!currentProject) {
      dispatch(setError('請先選擇專案'));
      return;
    }

    try {
      log.debug('🚀 [CreateTab] 開始批次生成，請求數量:', batchRequests.length);
      
      for (const request of batchRequests) {
        log.debug('🎯 [CreateTab] 處理請求', { requestId: request.id });

        // 🎲 生成智能Seed：確保不同環境產生不同插畫
        const smartSeed = generateSmartSeed(
          request.selectedCharacterIds,
          request.enriched_prompt
        );

        // 🎨 增強 prompt：確保包含插畫風格關鍵字
        let enhancedPrompt = request.enriched_prompt;
        if (globalColorMode === 'manga') {
          if (!enhancedPrompt.includes('manga style') && !enhancedPrompt.includes('black and white')) {
            enhancedPrompt += ', manga style, black and white, line art, ink drawing, screentone, detailed linework, comic illustration';
          }
        } else if (globalColorMode === 'sketch') {
          if (!enhancedPrompt.includes('pencil sketch') && !enhancedPrompt.includes('grayscale')) {
            enhancedPrompt += ', pencil sketch, grayscale drawing, soft shading, hand-drawn, artistic sketch, charcoal effect';
          }
        }
        log.debug('🎨 [CreateTab] 插畫風格設定', { globalColorMode, smartSeed, enhancedPrompt });

        // 根據 provider 選擇不同的 API
        let result;
        log.debug('🔍 [CreateTab] 使用插畫服務', { illustrationProvider, serviceDisplayName });
        
        if (illustrationProvider === 'gemini') {
          // 使用 Gemini API
          result = await illustrationAPI.generateGeminiIllustration({
            prompt: enhancedPrompt,
            provider: illustrationProvider,
            apiKey: apiKey,
            width: 1024,
            height: 1024,
            style: artStyle,
            projectId: currentProject.id,
            characterId: request.selectedCharacterIds[0],
          });
        } else if (illustrationProvider === 'openrouter') {
          // 使用 OpenRouter API 訪問 Gemini 2.5 Flash Image
          result = await illustrationAPI.generateGeminiIllustration({
            prompt: enhancedPrompt,
            provider: 'gemini-flash', // 🔧 修復：OpenRouter 對應到 gemini-flash 配置
            apiKey: apiKey,
            width: 1024,
            height: 1024,
            style: artStyle,
            projectId: currentProject.id,
            characterId: request.selectedCharacterIds[0],
          });
        } else {
          // 🎲 使用 Pollinations API 與智能Seed
          result = await api.illustration.generateFreeIllustrationToTemp(
            enhancedPrompt,
            1024,   // width
            1024,   // height
            'flux', // model
            smartSeed, // 🎯 使用智能生成的seed
            false,  // enhance
            artStyle, // style
            currentProject.id,
            request.selectedCharacterIds[0] // 使用第一個選中的角色ID
          );
        }
        
        log.debug('✅ [CreateTab] 請求完成', { requestId: request.id, result });
        
        // 將生成的圖片添加到臨時圖片列表
        if (result && typeof result === 'object' && 'success' in result && result.success) {
          const resultWithData = result as {
            success: boolean;
            id: string;
            image_path?: string;
            image_url?: string;
            prompt?: string;
            original_prompt?: string;
            parameters?: { model: string; width: number; height: number; seed?: number; enhance: boolean; style?: string };
            file_size_bytes?: number;
            generation_time_ms?: number;
            provider?: string;
            project_id?: string;
            character_id?: string;
          };

          // 🔧 統一字段：所有 AI 提供商都返回 image_path
          const imagePath = resultWithData.image_path || '';
          log.debug('🔍 [CreateTab] 圖片路徑處理:', {
            image_path: resultWithData.image_path,
            使用路徑: imagePath
          });

          const tempImage = {
            id: resultWithData.id || '',
            temp_path: imagePath, // 使用正確的圖片路徑
            image_url: resultWithData.image_url,
            prompt: resultWithData.prompt || request.enriched_prompt,
            original_prompt: resultWithData.original_prompt || request.enriched_prompt,
            parameters: resultWithData.parameters || {
              model: getModelNameForProvider(illustrationProvider),
              width: 1024,
              height: 1024,
              seed: smartSeed, // 📝 記錄使用的智能seed
              enhance: false
            },
            file_size_bytes: resultWithData.file_size_bytes || 0,
            generation_time_ms: resultWithData.generation_time_ms || 0,
            provider: resultWithData.provider || illustrationProvider,
            is_free: true,
            is_temp: true,
            project_id: resultWithData.project_id,
            character_id: resultWithData.character_id
          };
          
          dispatch(addTempImage(tempImage));
        }
      }
      
      // 批次完成後的後續處理
      log.debug('🎉 [CreateTab] 所有批次請求完成');

      // 🚀 自動開啟大圖預覽 Modal
      // 確保currentImageIndex 正確設置，然後開啟預覽
      dispatch(setCurrentImageIndex(0));
      dispatch(setShowImagePreview(true));
      log.debug('🖼️ [CreateTab] 自動開啟大圖預覽 Modal');

      // 🔍 調試：檢查 Redux state
      setTimeout(() => {
        log.debug('🔍 [CreateTab] Redux State 檢查:', {
          tempImagesLength: tempImages.length,
          showImagePreview: showImagePreview,
          currentImageIndex: currentImageIndex,
          tempImagesData: tempImages.map(img => ({
            id: img.id,
            temp_path: img.temp_path,
            image_url: img.image_url,
            hasPath: !!img.temp_path,
            hasUrl: !!img.image_url
          }))
        });
      }, 100);

      // 可選：清空批次請求
      // dispatch(generateBatchRequests([]));
      
    } catch (error) {
      log.error('❌ [CreateTab] 批次生成失敗:', error);
      
      // 智能錯誤處理：解析Rust後端的友善錯誤格式
      const handleSmartError = (errorMessage: string) => {
        if (errorMessage.startsWith('FRIENDLY_ERROR||')) {
          // 解析結構化錯誤訊息: FRIENDLY_ERROR||title||subtitle||action1||action2||...
          const parts = errorMessage.split('||');
          if (parts.length >= 3) {
            const title = parts[1];
            const subtitle = parts[2];
            const actions = parts.slice(3);
            
            log.debug('📋 [SmartError] 友善錯誤', { title, subtitle });
            log.debug(`🛠️ [SmartError] 建議操作:`, actions);
            
            // 顯示詳細的錯誤訊息，包含建議操作
            let fullMessage = `${title}\n${subtitle}`;
            if (actions.length > 0) {
              fullMessage += `\n\n建議解決方案：\n${actions.map(action => `• ${action}`).join('\n')}`;
            }
            
            return fullMessage;
          }
        }
        
        // 檢測常見錯誤類型並提供友善訊息
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
          return `🚫 AI配額已用完\nGemini免費版今日額度已達上限\n\n建議解決方案：\n• 立即切換到OpenAI繼續創作\n• 明天自動恢復 (配額會在UTC午夜重置)\n• 升級付費版獲得無限配額`;
        }
        
        if (errorMessage.includes('401') || errorMessage.includes('invalid') || errorMessage.includes('authentication')) {
          return `🔑 AI服務認證失敗\nAPI金鑰可能無效或已過期\n\n建議解決方案：\n• 請檢查設定中的API金鑰是否正確\n• 確認金鑰是否已啟用圖片生成權限`;
        }
        
        if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('maintenance')) {
          return `⚠️ AI服務暫時不可用\n服務端正在維護中\n\n建議解決方案：\n• 請稍後重試或使用其他AI服務\n• 預計恢復時間：30分鐘內`;
        }
        
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
          return `🌐 網路連線問題\n無法連接到AI服務\n\n建議解決方案：\n• 請檢查網路連線後重試\n• 或切換到其他可用服務`;
        }
        
        // 預設錯誤處理
        return `❌ 生成失敗\n${errorMessage}\n\n建議解決方案：\n• 請重試或切換其他AI服務\n• 如問題持續，請檢查服務狀態`;
      };
      
      const friendlyError = handleSmartError(error instanceof Error ? error.message : '批次生成失敗');
      dispatch(setError(friendlyError));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchRequests, currentProject, dispatch, artStyle, illustrationProvider, apiKey, serviceDisplayName, globalColorMode, generateSmartSeed]);

  // 移除批次請求
  const handleRemoveBatchRequest = useCallback((requestId: string) => {
    const updatedRequests = batchRequests.filter((req: BatchRequest) => req.id !== requestId);
    setBatchRequests(updatedRequests);
    log.debug('🗑️ [CreateTab] 已移除批次請求:', requestId);
  }, [batchRequests]);

  // 清空所有批次請求
  const handleClearBatch = useCallback(() => {
    setBatchRequests([]);
    log.debug('🧹 [CreateTab] 已清空所有批次請求');
  }, []);

  // AI 翻譯和優化提示詞
  const translateAndOptimize = useCallback(async () => {
    if (!sceneDescription.trim()) {
      notification.warning('請輸入場景描述', '請先描述您想要的場景内容');
      return;
    }

    setIsTranslating(true);
    try {
      // 備用方案：簡單的關鍵詞翻譯和優化
      let optimizedPrompt = `masterpiece, best quality, detailed`;
      
      // 基礎場景翻譯
      let sceneTranslation = sceneDescription;
      if (sceneDescription.includes('森林')) sceneTranslation = sceneTranslation.replace('森林', 'forest');
      if (sceneDescription.includes('魔法')) sceneTranslation = sceneTranslation.replace('魔法', 'magic');
      if (sceneDescription.includes('學校') || sceneDescription.includes('校園')) {
        sceneTranslation = sceneTranslation.replace(/學校|校園/g, 'school');
      }
      if (sceneDescription.includes('櫻花')) sceneTranslation = sceneTranslation.replace('櫻花', 'cherry blossoms');
      if (sceneDescription.includes('夕陽')) sceneTranslation = sceneTranslation.replace('夕陽', 'sunset');
      if (sceneDescription.includes('微笑')) sceneTranslation = sceneTranslation.replace('微笑', 'smiling');
      if (sceneDescription.includes('站在')) sceneTranslation = sceneTranslation.replace('站在', 'standing at');
      
      // 添加角色描述
      const selectedChars = projectCharacters.filter(char => 
        selectedCharacters.includes(char.id)
      );
      if (selectedChars.length > 0) {
        const characterDescs = selectedChars.map(char => 
          char.appearance || char.background || `character ${char.name}`
        ).join(', ');
        optimizedPrompt += `, ${characterDescs}`;
      }

      // 添加場景描述
      optimizedPrompt += `, ${sceneTranslation}`;

      // 添加風格標籤
      if (artStyle === 'anime') {
        optimizedPrompt += ', anime style, illustration';
      } else if (artStyle === 'realistic') {
        optimizedPrompt += ', photorealistic, detailed';
      }

      // 添加場景類型標籤
      if (sceneType === 'portrait') {
        optimizedPrompt += ', portrait, close-up';
      } else if (sceneType === 'scene') {
        optimizedPrompt += ', full scene, environment';
      } else if (sceneType === 'interaction') {
        optimizedPrompt += ', character interaction, dynamic pose';
      }

      // 🎨 根據插畫風格模式添加專業關鍵字
      if (globalColorMode === 'manga') {
        optimizedPrompt += ', manga style, black and white, line art, ink drawing, screentone, detailed linework, comic illustration';
      } else if (globalColorMode === 'sketch') {
        optimizedPrompt += ', pencil sketch, grayscale drawing, soft shading, hand-drawn, artistic sketch, charcoal effect';
      }
      // 彩色模式 (color) 保持原有邏輯，不額外添加關鍵字

      setEnglishPrompt(optimizedPrompt);
      notification.success('✨ 優化完成', '已自動生成英文提示詞！');

    } catch (error) {
      log.error('翻譯優化失敗:', error);
      notification.error('優化失敗', '請稍後重試');
    } finally {
      setIsTranslating(false);
    }
  }, [sceneDescription, projectCharacters, selectedCharacters, sceneType, artStyle, globalColorMode, notification]);

  return (
    <div className={`create-tab flex flex-col h-full ${className}`}>
      {/* 歡迎引導 */}
      <GuidanceCard
        title={GUIDANCE_TEXTS.workflow.welcome}
        description={GUIDANCE_TEXTS.workflow.stepByStep}
        variant="primary"
        className="mb-4 flex-shrink-0"
      />

      {/* 工作流程指示器 */}
      <WorkflowSteps
        currentStep={getCurrentStep()}
        className="mb-4 flex-shrink-0"
      />

      {/* 🎯 第一步：角色選擇 - 最優先顯示 */}
      <div className="flex-shrink-0 mb-4">
        {/* 角色選擇引導 */}
        <GuidanceCard
          title={GUIDANCE_TEXTS.characterSelection.title}
          description={GUIDANCE_TEXTS.characterSelection.description}
          tips={[
            GUIDANCE_TEXTS.characterSelection.multiSelectTip,
            '選擇 1-3 個角色可獲得最佳效果',
            '角色背景資訊將自動整合到生成提示中'
          ]}
          variant="primary"
          className="mb-4"
        />

        {/* 角色選擇器 */}
        <div className="bg-gradient-to-r from-blue-900/20 to-cosmic-800/30 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center mb-3">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              👥 選擇角色
            </h3>
            <span className="ml-2 text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded">
              步驟 1/4
            </span>
          </div>
          <CharacterSelector />
        </div>
      </div>

      {/* 創作狀態總覽 */}
      <div className="flex-shrink-0 bg-cosmic-800/30 rounded-lg p-3 mb-4 border border-cosmic-700">
        <div className="flex items-center justify-between">
          {/* 左側：當前狀態 */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 text-cosmic-300">
              <span>👥 角色:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                selectedCharacters.length > 0 ? 'bg-green-600 text-white' : 'bg-cosmic-600 text-cosmic-300'
              }`}>
                {selectedCharacters.length > 0 ? `${selectedCharacters.length} 已選` : '未選擇'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-cosmic-300">
              <span>📋 請求:</span>
              <span className="px-2 py-1 bg-cosmic-600 rounded text-xs">{batchRequests.length}</span>
            </div>
            <div className="text-xs text-cosmic-400">
              服務: {
                illustrationProvider === 'pollinations' ? 'Pollinations.AI (免費)' :
                illustrationProvider === 'gemini' ? 'Gemini Flash (免費/付費額度)' :
                illustrationProvider === 'openrouter' ? 'OpenRouter (Gemini 2.5 Flash Image Preview)' : '未知服務'
              }
            </div>
          </div>

          {/* 右側：操作按鈕 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddToBatch}
              disabled={selectedCharacters.length === 0 || !sceneType || !sceneDescription.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-cosmic-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center space-x-2"
              title="先選擇角色，設定場景，再添加到批次請求"
            >
              <span>➕</span>
              <span>添加請求</span>
            </button>
            <button
              onClick={handleBatchGenerate}
              disabled={batchRequests.length === 0 || loading.generating || isGenerating}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-cosmic-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>🚀</span>
              <span>{loading.generating || isGenerating ? '生成中...' : `生成 ${batchRequests.length} 張圖片`}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 主要內容區域 - 修復滾動問題 */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-4">
          {/* 左側：場景設定和模板輔助 */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              
              {/* 場景建構引導 */}
              <GuidanceCard
                title={GUIDANCE_TEXTS.sceneBuilder.title}
                description={GUIDANCE_TEXTS.sceneBuilder.description}
                tips={[...GUIDANCE_TEXTS.sceneBuilder.tips]}
                examples={GUIDANCE_TEXTS.sceneBuilder.examples?.slice(0, 2) || []}
                variant="info"
                className="flex-shrink-0"
              />

              {/* 場景建構器 */}
              <SceneBuilder />

              {/* 場景描述 */}
              <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-cosmic text-gold-500">📝 場景描述</h3>
                  <Tooltip content="描述角色在場景中的具體情況、動作和表情">
                    <div className="text-cosmic-400 text-sm">❓</div>
                  </Tooltip>
                </div>

                <textarea
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="描述角色的具體情況、動作、表情和環境... 例如：角色站在櫻花樹下，微笑著向前伸手，夕陽西下的溫暖光線"
                  className="w-full h-32 p-3 bg-cosmic-900/50 border border-cosmic-600 rounded-lg text-white placeholder-cosmic-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-colors resize-none"
                  maxLength={500}
                />
                
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-cosmic-500">
                    {sceneDescription.length}/500 字
                  </span>
                  <button
                    onClick={translateAndOptimize}
                    disabled={!sceneDescription.trim() || isTranslating}
                    className={`
                      text-xs px-3 py-1 rounded-full transition-all duration-200
                      ${isTranslating 
                        ? 'bg-gold-700 opacity-70 cursor-wait' 
                        : sceneDescription.trim()
                          ? 'bg-gold-600 hover:bg-gold-700 hover:scale-105 active:scale-95'
                          : 'bg-gray-600 opacity-50 cursor-not-allowed'
                      }
                      text-white font-medium shadow-sm
                    `}
                  >
                    {isTranslating ? '✨ 優化中...' : '✨ AI優化提示詞'}
                  </button>
                </div>
                
                {/* AI 優化結果顯示 */}
                {englishPrompt && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-green-400">🎯 優化後的英文提示詞</h4>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(englishPrompt);
                          notification.info('已複製', '提示詞已複製到剪貼板');
                        }}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        📋 複製
                      </button>
                    </div>
                    <div className="text-xs text-green-200 bg-green-950/30 p-2 rounded border break-all">
                      {englishPrompt}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-green-400">
                        包含 {englishPrompt.split(',').length} 個標籤
                      </span>
                      <button
                        onClick={() => setSceneDescription(englishPrompt)}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        📥 使用此提示詞
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        
          {/* 中間：智能提示詞助手（在大螢幕上顯示） */}
          <div className="hidden xl:flex xl:flex-col xl:space-y-4 xl:h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <PromptSuggestionPanel
                selectedCharacters={projectCharacters.filter(char => 
                  selectedCharacters.includes(char.id)
                )}
                sceneType={sceneType}
                currentPrompt={sceneDescription}
                onPromptSelect={(prompt: string) => setSceneDescription(prompt)}
                onPromptOptimize={(prompt: string) => setSceneDescription(prompt)}
                className="h-full"
              />
            </div>
          </div>
        
          {/* 右側：生成控制和請求列表 */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* 批次生成引導 */}
              <GuidanceCard
                title={GUIDANCE_TEXTS.generation.title}
                description={GUIDANCE_TEXTS.generation.batchMode || '批次模式可以一次性生成多張插畫'}
                tips={[
                  '設定完成後點擊「添加請求」',
                  '可以添加多個不同的場景設定',
                  '最後點擊「生成」開始批次創作'
                ]}
                variant="success"
                className="flex-shrink-0"
              />

              {/* 生成控制 */}
              <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
                <h3 className="text-lg font-cosmic text-gold-500 mb-3">⚡ 生成控制</h3>
                <p className="text-cosmic-300 text-sm">
                  設定完成後，點擊上方的「添加請求」和「生成」按鈕開始創作。
                </p>
              </div>

              {/* 批次請求列表 */}
              {batchRequests.length > 0 && (
                <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-cosmic text-gold-500">📋 批次請求</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-cosmic-400">
                        {batchRequests.length} 個請求
                      </span>
                      <button
                        onClick={handleClearBatch}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        清空
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {batchRequests.map((request: BatchRequest, index: number) => (
                      <div
                        key={request.id}
                        className="p-3 bg-cosmic-700/50 rounded border border-cosmic-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-white">
                                #{index + 1}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gold-600 text-white rounded">
                                {request.scene_type === 'portrait' ? '肖像' : request.scene_type === 'interaction' ? '互動' : '場景'}
                              </span>
                              <span className="text-xs text-cosmic-400">
                                {request.selectedCharacterIds.length} 個角色
                              </span>
                            </div>
                            <p className="text-sm text-cosmic-300 line-clamp-2 mb-2">
                              {request.scene_description}
                            </p>
                            
                            {/* 角色資訊提示 */}
                            {request.selectedCharacterIds.length > 0 && (
                              <div className="text-xs text-green-400 mb-1">
                                ✨ 已整合 {request.selectedCharacterIds.length} 個角色的背景資訊
                              </div>
                            )}
                            
                            <div className="text-xs text-cosmic-500">
                              {request.style_template} • {request.aspect_ratio}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveBatchRequest(request.id)}
                            className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                            title="移除此請求"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 臨時圖片版本 */}
              {tempImages.length > 0 && (
                <div className="bg-cosmic-800/30 rounded-lg p-4 border border-cosmic-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-cosmic text-gold-500">🖼️ 最新生成</h3>
                    <div className="flex items-center gap-2">
                      {/* 主要操作區：收藏 & 刪除 */}
                      <div className="flex items-center gap-2 border-r border-cosmic-600 pr-2">
                      <button
                        onClick={async () => {
                          try {
                            setIsCollecting(true);
                            log.debug('🔍 [Collection] 🚀 開始收藏流程...');
                            
                            if (!tempImages || tempImages.length === 0) {
                              notification.warning('沒有可收藏的圖片', '請先生成圖片再進行收藏');
                              return;
                            }
                            
                            // 🛡️ 優化：只傳遞必要的數據，包含模型信息用於正確的資料庫記錄
                            const imageData = tempImages
                              .filter(image => image && image.id) // 過濾無效數據
                              .map(image => ({
                                id: image.id,
                                project_id: image.project_id || currentProject?.id,
                                character_id: image.character_id,
                                original_prompt: image.original_prompt || image.prompt || 'Generated image',
                                // 🔧 添加模型信息以避免後端硬編碼問題
                                model: image.parameters?.model || image.provider || 'unknown',
                                provider: image.provider || 'unknown'
                                // 移除 temp_path 和大部分 parameters 避免傳輸大數據
                              }));
                            
                            if (imageData.length === 0) {
                              notification.error('無法收藏', '沒有有效的圖片數據可以收藏');
                              return;
                            }
                            
                            // 顯示處理中的通知
                            notification.info('正在收藏', `正在收藏 ${imageData.length} 張圖片...`);
                            
                            // 🛡️ 安全調用API，使用完整的錯誤處理
                            const result = await api.illustration.addToCollectionWithData(imageData);
                            
                            log.debug('🔍 [Collection] 收到後端回應:', result);
                            
                            // 🎉 使用通知系統替代 console.log
                            if (result && result.success && ((result.collected_count || 0) > 0 || (result.skipped_duplicates || 0) > 0)) {
                              const successMsg = `已成功收藏 ${result.collected_count || 0} 張圖片`;
                              const detailMsg = [
                                (result.newly_confirmed_count || 0) > 0 ? `其中 ${result.newly_confirmed_count} 張為新確認` : '',
                                (result.skipped_duplicates || 0) > 0 ? `跳過 ${result.skipped_duplicates} 張重複圖片` : '',
                                (result.error_count || 0) > 0 ? `${result.error_count} 個處理錯誤` : ''
                              ].filter(Boolean).join('，');

                              // 根據情況選擇不同的通知類型
                              const hasNewCollections = (result.collected_count || 0) > 0;
                              const hasSkipped = (result.skipped_duplicates || 0) > 0;

                              if (hasNewCollections && !hasSkipped) {
                                notification.success(
                                  '🎉 收藏成功',
                                  detailMsg ? `${successMsg}（${detailMsg}）` : successMsg,
                                  4000
                                );
                              } else if (!hasNewCollections && hasSkipped) {
                                notification.info(
                                  'ℹ️ 圖片已存在',
                                  `跳過 ${result.skipped_duplicates} 張重複圖片，這些圖片已在圖庫中`,
                                  4000
                                );
                              } else {
                                notification.success(
                                  '🎉 收藏完成',
                                  detailMsg ? `${successMsg}（${detailMsg}）` : successMsg,
                                  4000
                                );
                              }

                              // 🎯 收藏成功後自動清空預覽區
                              if (hasNewCollections || hasSkipped) {
                                dispatch(clearTempImages());
                                log.debug('✨ [Collection] 已自動清空預覽區，可繼續生成新圖片');
                              }

                              // 記錄詳細信息到控制台
                              log.debug('✅ [Collection] 收藏處理完成', { collected: result.collected_count || 0, skipped: result.skipped_duplicates || 0 });
                              if (result.errors && result.errors.length > 0) {
                                log.warn('⚠️ [Collection] 處理錯誤詳情:', result.errors);
                              }
                              
                            } else if (result && !result.success) {
                              // 🚫 處理部分失敗的情況
                              const failMsg = result.message || '收藏過程中遇到問題';
                              notification.warning(
                                '收藏部分成功',
                                failMsg,
                                5000
                              );
                              log.warn('⚠️ [Collection] 操作失敗', { failMsg });
                              if (result.errors && result.errors.length > 0) {
                                log.warn('⚠️ [Collection] 錯誤詳情:', result.errors);
                              }
                            } else {
                              // ❌ 完全失敗
                              notification.error(
                                '收藏失敗',
                                '服務器回應異常，請稍後再試',
                                5000
                              );
                              log.error('❌ [Collection] 收藏失敗，回應格式異常:', result);
                            }
                            
                          } catch (error) {
                            // 🛡️ 全面的錯誤捕獲和處理
                            log.error('💥 [Collection] 收藏操作發生錯誤:', error);
                            
                            let errorMessage = '收藏失敗';
                            if (error instanceof Error) {
                              errorMessage += `: ${error.message}`;
                            } else if (typeof error === 'string') {
                              errorMessage += `: ${error}`;
                            } else {
                              errorMessage += '：未知錯誤';
                            }
                            
                            notification.error(
                              '系統錯誤',
                              errorMessage,
                              5000
                            );
                            
                            // 🔍 記錄詳細的錯誤信息以便調試
                            log.error('🔍 [Collection] 錯誤詳情:', {
                              error,
                              tempImages: tempImages?.length || 0,
                              currentProject: currentProject?.id
                            });
                          } finally {
                            setIsCollecting(false);
                          }
                        }}
                        className={`
                          text-xs px-3 py-1 rounded transition-all duration-300
                          ${isCollecting 
                            ? 'bg-purple-700 opacity-70 cursor-wait' 
                            : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
                          }
                          disabled:bg-gray-600 disabled:opacity-50 text-white
                        `}
                        disabled={!tempImages || tempImages.length === 0 || isCollecting}
                        title={
                          isCollecting 
                            ? '正在收藏...' 
                            : tempImages && tempImages.length > 0 
                              ? `收藏 ${tempImages.length} 張圖片` 
                              : '沒有可收藏的圖片'
                        }
                      >
                        {isCollecting ? (
                          <>
                            <span className="inline-block animate-spin mr-1">⏳</span>
                            收藏中...
                          </>
                        ) : (
                          <>🔖 加入收藏</>
                        )}
                      </button>

                      {/* 刪除按鈕 */}
                      <button
                        onClick={handleDeleteImages}
                        className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!tempImages || tempImages.length === 0}
                        title={tempImages && tempImages.length > 0 ? `刪除 ${tempImages.length} 張臨時圖片` : '沒有可刪除的圖片'}
                      >
                        🗑️ 刪除
                      </button>
                      </div>

                      {/* 次要操作區 */}
                      <button
                        onClick={() => {
                          // TODO: 實現變體創建邏輯
                          log.debug('創建變體功能');
                        }}
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        創建變體
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tempImages.slice(-4).map((image: TempImageData, _index: number) => (
                      <div key={image.id} className="aspect-square bg-cosmic-700/50 rounded border border-cosmic-600 p-2 overflow-hidden">
                        <div className="w-full h-full relative rounded">
                          <SafeImage
                            imageUrl={image.image_url}
                            localFilePath={image.temp_path}
                            alt={`生成的插畫 - ${image.prompt?.slice(0, 50) || 'AI插畫'}`}
                            className="w-full h-full object-cover rounded"
                            fallbackIcon="🎨"
                            fallback="載入中..."
                          />
                          {/* 圖片信息覆蓋層 */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <div className="text-xs text-white truncate">
                              ID: {image.id.slice(-8)}
                            </div>
                            <div className="text-xs text-gray-300 truncate">
                              {image.parameters?.model || 'AI生成'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 快速動作面板 */}
                  <div className="mt-4 p-3 bg-gold-900/20 border border-gold-700/50 rounded-lg">
                    <p className="text-gold-300 text-sm font-medium mb-2">
                      🚀 下一步操作建議
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          // 繼續為其他角色生成
                          log.debug('為其他角色生成');
                        }}
                        className="px-3 py-2 bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs rounded transition-colors"
                      >
                        🎭 切換角色
                      </button>
                      <button
                        onClick={() => {
                          // 嘗試不同場景
                          setSceneDescription('');
                        }}
                        className="px-3 py-2 bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs rounded transition-colors"
                      >
                        🎬 新場景
                      </button>
                      <button
                        onClick={() => {
                          if (tempImages.length > 0) {
                            dispatch(openVersionPanel(tempImages[0]));
                          }
                        }}
                        className="px-3 py-2 bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs rounded transition-colors"
                      >
                        📚 管理版本
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="flex-shrink-0 mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CreateTab;