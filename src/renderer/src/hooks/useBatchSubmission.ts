import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { 
  setTempImages as setReduxTempImages, 
  setShowImagePreview as setReduxShowImagePreview,
  TempImageData
} from '../store/slices/visualCreationSlice';
import { api } from '../api';
import { useBatchConfiguration, useCharacterSelection } from './illustration';
import { BatchRequestItem } from '../components/AI/BatchIllustration/IllustrationRequestsSection';
import { imageGenerationService } from '../services/imageGenerationService';
import type { ImageGenerationOptions } from '../services/imageGenerationService';
import { SafetyFilterLevel } from '@google/genai';
import { Project } from '../store/slices/projectsSlice';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('useBatchSubmission');

interface TempImage {
  id: string;
  url: string;
  filename: string;
  metadata?: Record<string, unknown>;
}

interface UseBatchSubmissionProps {
  batchConfig: ReturnType<typeof useBatchConfiguration>;
  characterSelection: ReturnType<typeof useCharacterSelection>;
  currentProject: Project | null;
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
  const [tempImages, setTempImages] = useState<TempImage[]>([]);
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

    // 只有選擇 Imagen 或 Gemini 付費版時才需要 API Key
    if ((batchConfig.illustrationProvider === 'imagen' || 
         batchConfig.illustrationProvider === 'gemini-paid') && 
        !batchConfig.apiKey.trim()) {
      const providerName = batchConfig.illustrationProvider === 'imagen' ? 'Google Imagen' : 'Gemini 付費版';
      setError(`${providerName} 需要 API 金鑰，請輸入或切換到免費的 Pollinations.AI 或 Gemini 免費版`);
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
      log.debug('🚀 開始批次插畫生成', { batchName: batchConfig.batchName });
      log.debug('🎨 色彩模式', { colorMode: batchConfig.globalColorMode === 'color' ? '彩色' : '黑白' });
      
      // 確定服務名稱
      let serviceName = '';
      switch (batchConfig.illustrationProvider) {
        case 'pollinations':
          serviceName = 'Pollinations.AI (免費)';
          break;
        case 'imagen':
          serviceName = 'Google Imagen (付費)';
          break;
        case 'gemini-free':
          serviceName = 'Gemini 2.5 Flash Image (免費)';
          break;
        case 'gemini-paid':
          serviceName = 'Gemini 2.5 Flash Image (付費)';
          break;
        default:
          serviceName = '未知服務';
      }
      log.debug('🤖 使用服務', { serviceName });
      log.debug('📋 請求總數', { count: requests.length });

      interface BatchSubmissionResult {
        success: boolean;
        url?: string;
        error?: string;
        filename?: string;
        tempImageData?: unknown;
        request?: unknown;
      }
      
      let results: Array<BatchSubmissionResult> = [];

      if (batchConfig.illustrationProvider === 'pollinations') {
        // === Pollinations.AI 免費生成 ===
        log.debug('🌟 使用 Pollinations.AI', { model: batchConfig.pollinationsModel, style: batchConfig.pollinationsStyle });
        
        results = [];
        
        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          log.debug('🎨 生成進度', { current: i + 1, total: requests.length, scene: req.scene_description.substring(0, 50) });
          
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
              log.debug('✅ 圖像生成成功（臨時）', { index: i + 1 });
            } else {
              results.push({
                success: false,
                error: result.message || '生成失敗',
                request: req
              });
              log.error('❌ 圖像生成失敗', { index: i + 1, message: result.message });
            }
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              request: req
            });
            log.error('❌ 圖像生成異常', { index: i + 1, error });
          }

          // 避免過於頻繁的請求，每個請求間隔1秒
          if (i < requests.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else if (batchConfig.illustrationProvider === 'gemini-free' || 
                 batchConfig.illustrationProvider === 'gemini-paid') {
        // === Gemini 2.5 Flash Image 生成 ===
        const isFreeTier = batchConfig.illustrationProvider === 'gemini-free';
        log.debug('💎 使用 Gemini 2.5 Flash Image', { tier: isFreeTier ? '免費版' : '付費版' });
        log.debug('🔧 Gemini 配置', { model: batchConfig.geminiModel, quality: batchConfig.geminiQuality, style: batchConfig.geminiStyle });
        
        results = [];
        
        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          log.debug('💎 生成進度', { current: i + 1, total: requests.length, scene: req.scene_description.substring(0, 50) });
          
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

            // 調用後端 API（目前使用模擬，實際實現需要添加對應的 API 調用）
            // TODO: 實現 Gemini 2.5 Flash Image 的後端 API 調用
            const result = {
              success: false,
              message: '🚧 Gemini 2.5 Flash Image 功能開發中，敬請期待！',
              error: 'GEMINI_NOT_IMPLEMENTED'
            };

            if (result.success) {
              results.push({
                success: true,
                tempImageData: result,
                request: req
              });
              console.log(`✅ 第 ${i + 1} 張 Gemini 圖像生成成功`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
            } else {
              results.push({
                success: false,
                error: result.message || 'Gemini 生成失敗',
                request: req
              });
              console.error(`❌ 第 ${i + 1} 張 Gemini 圖像生成失敗:`, result.message); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
            }
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              request: req
            });
            console.error(`❌ 第 ${i + 1} 張 Gemini 圖像生成異常:`, error); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
          }

          // 避免過於頻繁的請求，每個請求間隔1秒
          if (i < requests.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else if (batchConfig.illustrationProvider === 'imagen') {
        // === Google Imagen 付費生成 ===
        log.debug('🔷 使用 Google Imagen');
        
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
        const batchResults = await imageGenerationService.generateBatch(
          imageRequests,
          batchConfig.apiKey,
          (current, total, currentPrompt) => {
            console.log(`🎨 生成進度: ${current}/${total} - ${currentPrompt?.substring(0, 50)}...`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
            // 可以在這裡更新 UI 顯示進度
          }
        );

        // 轉換 BatchResult[] 為 BatchSubmissionResult[]
        results = batchResults.map((batchResult): BatchSubmissionResult => ({
          success: batchResult.success,
          error: typeof batchResult.error === 'string' ? batchResult.error : batchResult.error?.message,
          // 如果有數據，從第一個結果中提取 URL
          url: batchResult.data?.[0]?.imageData,
          filename: `generated_${Date.now()}.png`
        }));
      }

      // 統計結果
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        console.log(`✅ 成功生成 ${successCount} 張圖像（臨時）`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
        
        // 收集所有成功的臨時圖像數據
        const successfulTempImages: TempImage[] = results
          .filter(r => r.success && (r.tempImageData || r.url))
          .map(r => {
            if (r.tempImageData && typeof r.tempImageData === 'object' && r.tempImageData !== null) {
              const tempData = r.tempImageData as Record<string, unknown>;
              return {
                id: tempData.id || `temp-${Date.now()}-${Math.random()}`,
                url: tempData.url || r.url || '',
                filename: tempData.filename || r.filename || 'generated.png',
                metadata: tempData.metadata || {}
              } as TempImage;
            } else {
              return { 
                id: `temp-${Date.now()}-${Math.random()}`, 
                url: r.url || '', 
                filename: r.filename || 'generated.png',
                metadata: {}
              } as TempImage;
            }
          });
        
        log.debug('生成的臨時圖像數據', { count: successfulTempImages.length });
        
        // 設置臨時圖像並顯示預覽
        setTempImages(successfulTempImages);
        setShowImagePreview(true);
        
        // 同步到 Redux 狀態以供 ImagePreviewModal 使用
        const tempImageData: TempImageData[] = successfulTempImages.map(img => ({
          id: img.id,
          prompt: `Generated at ${new Date().toISOString()}`,
          temp_path: img.url,
          image_url: img.url,
          parameters: {
            model: 'unknown',
            width: 512,
            height: 512,
            enhance: false,
            style: 'default'
          },
          file_size_bytes: 0,
          generation_time_ms: 0,
          provider: 'unknown',
          is_free: true,
          is_temp: true,
          original_prompt: `Generated at ${new Date().toISOString()}`
        }));
        dispatch(setReduxTempImages(tempImageData));
        dispatch(setReduxShowImagePreview(true));
        
        // 暫時不重置表單，等用戶確認後再重置
        setError(''); // 清除錯誤
        
        if (failCount > 0) {
          console.warn(`⚠️ ${failCount} 張圖像生成失敗`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
          setError(`部分圖像生成失敗：成功 ${successCount}，失敗 ${failCount}`);
        }
      } else {
        throw new Error('所有圖像生成都失敗了');
      }

    } catch (err: unknown) {
      log.error('❌ 批次生成失敗:', err);
      
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