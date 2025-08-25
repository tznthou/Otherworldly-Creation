import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { 
  setTempImages as setReduxTempImages, 
  setShowImagePreview as setReduxShowImagePreview 
} from '../store/slices/visualCreationSlice';
import { api } from '../api';
import { useBatchConfiguration, useCharacterSelection } from './illustration';
import { BatchRequestItem } from '../components/AI/BatchIllustration/IllustrationRequestsSection';
import { imageGenerationService } from '../services/imageGenerationService';
import type { ImageGenerationOptions } from '../services/imageGenerationService';
import { SafetyFilterLevel } from '@google/genai';

interface UseBatchSubmissionProps {
  batchConfig: ReturnType<typeof useBatchConfiguration>;
  characterSelection: ReturnType<typeof useCharacterSelection>;
  currentProject: any;
}

export const useBatchSubmission = ({
  batchConfig,
  characterSelection,
  currentProject
}: UseBatchSubmissionProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingErrorMessage, setBillingErrorMessage] = useState('');
  const [tempImages, setTempImages] = useState<any[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const { effectiveProjectCharacters } = characterSelection;

  const submitBatch = useCallback(async (requests: BatchRequestItem[]) => {
    if (!currentProject) {
      setError('請選擇專案');
      return;
    }

    if (!batchConfig.batchName.trim()) {
      setError('請輸入批次名稱');
      return;
    }

    if (requests.length === 0) {
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
      console.log(`📋 共 ${requests.length} 個請求`);

      let results: any[] = [];

      if (batchConfig.illustrationProvider === 'pollinations') {
        // === Pollinations.AI 免費生成 ===
        console.log(`🌟 使用 Pollinations.AI，模型：${batchConfig.pollinationsModel}，風格：${batchConfig.pollinationsStyle}`);
        
        results = [];
        
        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          console.log(`🎨 生成進度: ${i + 1}/${requests.length} - ${req.scene_description.substring(0, 50)}...`);
          
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
        
        // 同步到 Redux 狀態以供 ImagePreviewModal 使用
        dispatch(setReduxTempImages(successfulTempImages));
        dispatch(setReduxShowImagePreview(true));
        
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
  }, [
    batchConfig,
    currentProject,
    effectiveProjectCharacters,
    dispatch
  ]);

  return {
    isProcessing,
    error,
    setError,
    showBillingModal,
    setShowBillingModal,
    billingErrorMessage,
    setBillingErrorMessage,
    tempImages,
    showImagePreview,
    submitBatch
  };
};