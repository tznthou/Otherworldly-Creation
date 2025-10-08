import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { loadSettings } from '../store/slices/settingsSlice';
import { SettingsService } from '../services/settingsService';

/**
 * 設定管理 Hook
 * 處理設定的載入、儲存和監聽
 */
export const useSettings = () => {
  console.log('🎯 useSettings hook 被呼叫了！');

  const dispatch = useAppDispatch();
  const { settings } = useAppSelector(state => state.settings);

  // 初始化設定
  useEffect(() => {
    console.log('🔄 useSettings useEffect 執行');

    const initializeSettings = async () => {
      try {
        console.log('📥 開始載入設定...');
        const userSettings = await SettingsService.loadSettings();
        console.log('✅ 設定載入完成:', userSettings);
        dispatch(loadSettings(userSettings));
      } catch (error) {
        console.error('❌ 初始化設定失敗:', error);
      }
    };

    initializeSettings();
  }, [dispatch]);

  return { settings };
}