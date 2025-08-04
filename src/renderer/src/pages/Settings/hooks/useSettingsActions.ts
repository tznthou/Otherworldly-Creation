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
import { tSync } from '../../../i18n';

export const useSettingsActions = () => {
  const dispatch = useAppDispatch();

  const loadUserSettings = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      dispatch(setLoading(true));
      
      // 添加超時保護，避免無限載入
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('設定載入超時'));
        }, 10000); // 10秒超時
      });
      
      const loadPromise = SettingsService.loadSettings();
      
      // 使用 Promise.race 來實現超時控制
      const userSettings = await Promise.race([loadPromise, timeoutPromise]) as AppSettings;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      dispatch(loadSettings(userSettings));
    } catch (error) {
      console.error('載入設定失敗:', error);
      
      // 載入失敗時使用預設設定
      const { DEFAULT_SETTINGS } = await import('../../../store/slices/settingsSlice');
      dispatch(loadSettings(DEFAULT_SETTINGS));
      
      dispatch(addNotification({
        type: 'warning',
        title: '載入設定失敗',
        message: '已使用預設設定，你可以重新設定你的偏好',
        duration: 5000,
      }));
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      dispatch(setLoading(false));
    }
  };

  const saveSettings = async (settings: AppSettings) => {
    try {
      await SettingsService.saveSettings(settings);
      dispatch(markSettingsSaved());
      dispatch(addNotification({
        type: 'success',
        title: tSync('settings.messages.saved'),
        message: tSync('settings.messages.saveSuccess'),
        duration: 3000,
      }));
      return true;
    } catch (error) {
      console.error('儲存設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: tSync('common.error'),
        message: tSync('settings.messages.saveFailed'),
        duration: 5000,
      }));
      return false;
    }
  };

  const resetAllSettings = async () => {
    if (confirm(tSync('settings.messages.resetConfirm'))) {
      try {
        await SettingsService.resetSettings();
        dispatch(resetSettings());
        dispatch(addNotification({
          type: 'success',
          title: tSync('common.success'),
          message: tSync('settings.messages.resetSuccess'),
          duration: 3000,
        }));
        return true;
      } catch (error) {
        console.error('重置設定失敗:', error);
        dispatch(addNotification({
          type: 'error',
          title: tSync('common.error'),
          message: tSync('settings.messages.resetFailed'),
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
        title: tSync('common.success'),
        message: tSync('settings.messages.exportSuccess'),
        duration: 3000,
      }));
      return true;
    } catch (error) {
      console.error('匯出設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: tSync('common.error'),
        message: tSync('settings.messages.exportFailed'),
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
              title: tSync('common.success'),
              message: tSync('settings.messages.importSuccess'),
              duration: 3000,
            }));
            resolve(true);
          } catch (error) {
            console.error('匯入設定失敗:', error);
            dispatch(addNotification({
              type: 'error',
              title: tSync('common.error'),
              message: tSync('settings.messages.importFailed'),
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