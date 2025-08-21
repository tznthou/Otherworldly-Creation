import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { createVersion } from '../../store/slices/versionManagementSlice';
import { 
  removePendingVersionCreation, 
  clearPendingVersionCreation 
} from '../../store/slices/visualCreationSlice';
import { tempImageToVersion, generateNextVersionNumber } from '../../utils/versionUtils';

/**
 * 自動版本創建 Hook
 * 監聽待創建版本的圖片列表，並自動創建版本記錄
 */
export function useAutoVersionCreation() {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux 狀態
  const { 
    tempImages, 
    versionManagement: { 
      pendingVersionCreation, 
      autoCreateVersions,
      lastGeneratedImageId 
    } 
  } = useSelector((state: RootState) => state.visualCreation);
  
  const { versions } = useSelector((state: RootState) => state.versionManagement);

  /**
   * 為單個圖片創建版本
   */
  const createVersionForImage = useCallback(async (imageId: string) => {
    const tempImage = tempImages.find(img => img.id === imageId);
    if (!tempImage) {
      console.warn(`找不到臨時圖片 ID: ${imageId}`);
      return;
    }

    try {
      // 計算下一個版本號
      const nextVersionNumber = generateNextVersionNumber(versions);
      
      // 轉換為版本格式
      const versionData = tempImageToVersion(tempImage, {
        status: 'draft', // 自動創建的版本預設為草稿狀態
        type: 'original',
        versionNumber: nextVersionNumber
      });

      // 創建版本記錄
      const result = await dispatch(createVersion(versionData)).unwrap();
      
      if (result.success) {
        console.log(`✅ 自動創建版本成功：圖片 ${imageId} → 版本 ${result.versionId}`);
        
        // 從待創建列表中移除
        dispatch(removePendingVersionCreation(imageId));
        
        return result.versionId;
      } else {
        throw new Error(result.message || '版本創建失敗');
      }
    } catch (error) {
      console.error(`❌ 自動創建版本失敗：圖片 ${imageId}`, error);
      
      // 即使失敗也要從待創建列表中移除，避免無限重試
      dispatch(removePendingVersionCreation(imageId));
      
      throw error;
    }
  }, [dispatch, tempImages, versions]);

  /**
   * 批量創建版本
   */
  const createVersionsForImages = useCallback(async (imageIds: string[]) => {
    const results: { imageId: string; versionId?: string; error?: string }[] = [];
    
    for (const imageId of imageIds) {
      try {
        const versionId = await createVersionForImage(imageId);
        results.push({ imageId, versionId });
      } catch (error) {
        results.push({ 
          imageId, 
          error: error instanceof Error ? error.message : '未知錯誤' 
        });
      }
    }
    
    return results;
  }, [createVersionForImage]);

  /**
   * 手動為指定圖片創建版本
   */
  const manuallyCreateVersion = useCallback(async (
    imageId: string, 
    options: {
      status?: 'draft' | 'active';
      type?: 'original' | 'revision' | 'branch';
      parentVersionId?: string;
    } = {}
  ) => {
    const tempImage = tempImages.find(img => img.id === imageId);
    if (!tempImage) {
      throw new Error(`找不到圖片 ID: ${imageId}`);
    }

    const {
      status = 'active', // 手動創建預設為正式狀態
      type = 'original',
      parentVersionId
    } = options;

    try {
      // 計算版本號
      const nextVersionNumber = parentVersionId
        ? generateNextVersionNumber(versions, parentVersionId)
        : generateNextVersionNumber(versions);
      
      // 轉換為版本格式
      const versionData = tempImageToVersion(tempImage, {
        status,
        type,
        parentVersionId,
        versionNumber: nextVersionNumber
      });

      // 創建版本記錄
      const result = await dispatch(createVersion(versionData)).unwrap();
      
      if (result.success) {
        console.log(`✅ 手動創建版本成功：圖片 ${imageId} → 版本 ${result.versionId}`);
        
        // 從待創建列表中移除（如果存在）
        dispatch(removePendingVersionCreation(imageId));
        
        return result.versionId;
      } else {
        throw new Error(result.message || '版本創建失敗');
      }
    } catch (error) {
      console.error(`❌ 手動創建版本失敗：圖片 ${imageId}`, error);
      throw error;
    }
  }, [dispatch, tempImages, versions]);

  /**
   * 清理所有待創建版本
   */
  const clearAllPendingVersions = useCallback(() => {
    dispatch(clearPendingVersionCreation());
  }, [dispatch]);

  // 自動處理待創建版本的 Effect
  useEffect(() => {
    if (!autoCreateVersions || pendingVersionCreation.length === 0) {
      return;
    }

    const processPendingVersions = async () => {
      console.log(`🔄 開始自動處理 ${pendingVersionCreation.length} 個待創建版本...`);
      
      try {
        await createVersionsForImages(pendingVersionCreation);
        console.log(`✅ 自動版本創建處理完成`);
      } catch (error) {
        console.error(`❌ 自動版本創建處理失敗:`, error);
      }
    };

    // 使用 setTimeout 避免在 Redux dispatch 過程中再次 dispatch
    const timeoutId = setTimeout(processPendingVersions, 100);
    
    return () => clearTimeout(timeoutId);
  }, [autoCreateVersions, pendingVersionCreation, createVersionsForImages]);

  // 監聽最後生成的圖片，提供即時反饋
  useEffect(() => {
    if (lastGeneratedImageId && autoCreateVersions) {
      console.log(`🎨 新圖片生成完成：${lastGeneratedImageId}，即將自動創建版本...`);
    }
  }, [lastGeneratedImageId, autoCreateVersions]);

  return {
    // 狀態
    pendingVersionCreation,
    autoCreateVersions,
    lastGeneratedImageId,
    
    // 操作方法
    createVersionForImage,
    createVersionsForImages,
    manuallyCreateVersion,
    clearAllPendingVersions,
    
    // 計算屬性
    hasPendingVersions: pendingVersionCreation.length > 0,
    pendingCount: pendingVersionCreation.length,
  };
}