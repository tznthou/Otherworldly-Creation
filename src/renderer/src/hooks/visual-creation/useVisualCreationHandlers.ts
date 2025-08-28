// 視覺創建處理器 Hook
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { setActiveTab, setCurrentProvider, setSelectedImageIds, removeTempImages } from '../../store/slices/visualCreationSlice';
import { illustrationAPI } from '../../api/illustration';

type ActiveTab = 'create' | 'gallery';
type IllustrationProvider = 'pollinations' | 'imagen';

export const useVisualCreationHandlers = () => {
  const dispatch = useDispatch<AppDispatch>();

  // 供應商切換處理
  const handleProviderChange = useCallback((provider: IllustrationProvider) => {
    dispatch(setCurrentProvider(provider));
    console.log(`🔄 插畫服務切換至: ${provider === 'pollinations' ? 'Pollinations.AI (免費)' : 'Google Imagen (付費)'}`);
  }, [dispatch]);

  // 標籤切換處理
  const handleTabChange = useCallback((tab: ActiveTab) => {
    dispatch(setActiveTab(tab));
    console.log(`🎯 切換至標籤頁: ${tab}`);
  }, [dispatch]);

  // 儲存選中的圖片（確認功能）
  const handleSaveSelectedImages = useCallback(async (imageIds: string[]) => {
    console.log('💾 [Handler] 開始儲存選中的圖片:', imageIds);
    
    if (imageIds.length === 0) {
      console.warn('⚠️ [Handler] 沒有選中的圖片');
      return;
    }

    try {
      // 調用API確認圖片
      const result = await illustrationAPI.confirm(imageIds);
      console.log('✅ [Handler] 圖片確認成功:', result);

      // 清空選中狀態
      dispatch(setSelectedImageIds([]));
      
      // 從臨時圖片中移除已確認的圖片
      dispatch(removeTempImages(imageIds));
      
      // 添加成功通知
      console.log(`✅ 成功保存 ${imageIds.length} 張圖片到圖庫！`);
      
      // TODO: 將來可以添加 toast 通知組件
      
    } catch (error) {
      console.error('❌ [Handler] 圖片確認失敗:', error);
      // TODO: 添加錯誤通知
      throw error;
    }
  }, [dispatch]);

  return {
    handleProviderChange,
    handleTabChange,
    handleSaveSelectedImages,
  };
};