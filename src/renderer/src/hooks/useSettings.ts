import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { loadSettings } from '../store/slices/settingsSlice';
import { SettingsService } from '../services/settingsService';

/**
 * 設定管理 Hook
 * 處理設定的載入、儲存和監聽
 */
export const useSettings = () => {
  const dispatch = useAppDispatch();
  const { settings } = useAppSelector(state => state.settings);

  // 初始化設定
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const userSettings = await SettingsService.loadSettings();
        dispatch(loadSettings(userSettings));
      } catch (error) {
        console.error('初始化設定失敗:', error);
      }
    };

    initializeSettings();
  }, [settings, dispatch]);
};