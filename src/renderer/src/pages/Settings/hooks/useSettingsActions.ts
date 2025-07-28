import { useAppDispatch } from '../../../hooks/redux';
import { SettingsService } from '../../../services/settingsService';
import { 
  loadSettings, 
  markSettingsSaved, 
  resetSettings,
  setLoading
} from '../../../store/slices/settingsSlice';
import { addNotification } from '../../../store/slices/uiSlice';
import { AppSettings } from '../../../store/slices/settingsSlice';

export const useSettingsActions = () => {
  const dispatch = useAppDispatch();

  const loadUserSettings = async () => {
    try {
      dispatch(setLoading(true));
      const userSettings = await SettingsService.loadSettings();
      dispatch(loadSettings(userSettings));
    } catch (error) {
      console.error('載入設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '載入設定失敗',
        message: '無法載入使用者設定，將使用預設設定',
        duration: 5000,
      }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const saveSettings = async (settings: AppSettings) => {
    try {
      await SettingsService.saveSettings(settings);
      dispatch(markSettingsSaved());
      dispatch(addNotification({
        type: 'success',
        title: '設定已儲存',
        message: '所有設定已成功儲存',
        duration: 3000,
      }));
      return true;
    } catch (error) {
      console.error('儲存設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '儲存失敗',
        message: '儲存設定時發生錯誤',
        duration: 5000,
      }));
      return false;
    }
  };

  const resetAllSettings = async () => {
    if (confirm('確定要重置所有設定嗎？此操作無法復原。')) {
      try {
        await SettingsService.resetSettings();
        dispatch(resetSettings());
        dispatch(addNotification({
          type: 'success',
          title: '設定已重置',
          message: '所有設定已重置為預設值',
          duration: 3000,
        }));
        return true;
      } catch (error) {
        console.error('重置設定失敗:', error);
        dispatch(addNotification({
          type: 'error',
          title: '重置失敗',
          message: '重置設定時發生錯誤',
          duration: 5000,
        }));
        return false;
      }
    }
    return false;
  };

  const exportSettings = async () => {
    try {
      const settingsJson = await SettingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genesis-chronicle-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      dispatch(addNotification({
        type: 'success',
        title: '設定已匯出',
        message: '設定檔案已下載',
        duration: 3000,
      }));
      return true;
    } catch (error) {
      console.error('匯出設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '匯出失敗',
        message: '匯出設定時發生錯誤',
        duration: 5000,
      }));
      return false;
    }
  };

  const importSettings = () => {
    return new Promise<boolean>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const text = await file.text();
            const importedSettings = await SettingsService.importSettings(text);
            dispatch(loadSettings(importedSettings));
            dispatch(addNotification({
              type: 'success',
              title: '設定已匯入',
              message: '設定已成功匯入並套用',
              duration: 3000,
            }));
            resolve(true);
          } catch (error) {
            console.error('匯入設定失敗:', error);
            dispatch(addNotification({
              type: 'error',
              title: '匯入失敗',
              message: '設定檔案格式錯誤或損壞',
              duration: 5000,
            }));
            resolve(false);
          }
        } else {
          resolve(false);
        }
      };
      input.click();
    });
  };

  return {
    loadUserSettings,
    saveSettings,
    resetAllSettings,
    exportSettings,
    importSettings,
  };
};