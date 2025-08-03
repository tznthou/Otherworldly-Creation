import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { loadSettings, markSettingsSaved, AppSettings } from '../store/slices/settingsSlice';
import { SettingsService, SettingsWatcher } from '../services/settingsService';

/**
 * 設定管理 Hook
 * 處理設定的載入、儲存和監聽
 */
export const useSettings = () => {
  const dispatch = useAppDispatch();
  const { settings, hasUnsavedChanges, isLoading } = useAppSelector(state => state.settings);

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
  }, [dispatch]);

  // 監聽設定變更
  useEffect(() => {
    const handleSettingsChange = (newSettings: AppSettings) => {
      // 可以在這裡處理設定變更的副作用
      console.log('設定已變更:', newSettings);
    };

    SettingsWatcher.addListener(handleSettingsChange);

    return () => {
      SettingsWatcher.removeListener(handleSettingsChange);
    };
  }, []);

  // 自動儲存設定
  useEffect(() => {
    if (hasUnsavedChanges) {
      const saveTimer = setTimeout(async () => {
        try {
          await SettingsService.saveSettings(settings);
          dispatch(markSettingsSaved());
          SettingsWatcher.notifyListeners(settings);
        } catch (error) {
          console.error('自動儲存設定失敗:', error);
        }
      }, 2000); // 2 秒後自動儲存

      return () => clearTimeout(saveTimer);
    }
  }, [settings, hasUnsavedChanges, dispatch]);

  return {
    settings,
    hasUnsavedChanges,
    isLoading,
  };
};

/**
 * 設定應用 Hook
 * 將設定應用到應用程式的各個部分
 */
export const useSettingsApplication = () => {
  const { settings } = useSettings();

  // 應用主題設定
  useEffect(() => {
    if (settings.editor.theme) {
      document.documentElement.setAttribute('data-theme', settings.editor.theme);
    }
  }, [settings.editor.theme]);

  // 應用字體設定
  useEffect(() => {
    if (settings.editor.fontFamily) {
      document.documentElement.style.setProperty('--editor-font-family', settings.editor.fontFamily);
    }
    if (settings.editor.fontSize) {
      document.documentElement.style.setProperty('--editor-font-size', `${settings.editor.fontSize}px`);
    }
    if (settings.editor.lineHeight) {
      document.documentElement.style.setProperty('--editor-line-height', settings.editor.lineHeight.toString());
    }
  }, [settings.editor.fontFamily, settings.editor.fontSize, settings.editor.lineHeight]);

  // 應用 UI 設定
  useEffect(() => {
    if (settings.ui.sidebarWidth) {
      document.documentElement.style.setProperty('--sidebar-width', `${settings.ui.sidebarWidth}px`);
    }
    
    // 動畫設定
    if (!settings.ui.animationsEnabled) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
    }
  }, [settings.ui.sidebarWidth, settings.ui.animationsEnabled]);

  // 應用語言設定
  useEffect(() => {
    if (settings.language) {
      document.documentElement.setAttribute('lang', settings.language);
    }
  }, [settings.language]);

  return settings;
};

/**
 * 快捷鍵 Hook
 * 處理全域快捷鍵
 */
export const useShortcuts = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { shortcuts } = settings;
      
      // 構建當前按鍵組合
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('Ctrl');
      if (event.altKey) modifiers.push('Alt');
      if (event.shiftKey) modifiers.push('Shift');
      if (event.metaKey) modifiers.push('Meta');
      
      const key = event.key;
      const combination = [...modifiers, key].join('+');
      
      // 查找匹配的快捷鍵
      const shortcutAction = Object.entries(shortcuts).find(([_, shortcut]) => 
        shortcut === combination
      );
      
      if (shortcutAction) {
        event.preventDefault();
        const [action] = shortcutAction;
        
        // 觸發對應的動作
        handleShortcutAction(action);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings.shortcuts]);

  const handleShortcutAction = (action: string) => {
    switch (action) {
      case 'save':
        // 觸發儲存動作
        document.dispatchEvent(new CustomEvent('shortcut:save'));
        break;
      case 'newProject':
        document.dispatchEvent(new CustomEvent('shortcut:newProject'));
        break;
      case 'openProject':
        document.dispatchEvent(new CustomEvent('shortcut:openProject'));
        break;
      case 'aiContinue':
        document.dispatchEvent(new CustomEvent('shortcut:aiContinue'));
        break;
      case 'toggleSidebar':
        document.dispatchEvent(new CustomEvent('shortcut:toggleSidebar'));
        break;
      case 'toggleFullscreen':
        document.dispatchEvent(new CustomEvent('shortcut:toggleFullscreen'));
        break;
      case 'find':
        document.dispatchEvent(new CustomEvent('shortcut:find'));
        break;
      case 'replace':
        document.dispatchEvent(new CustomEvent('shortcut:replace'));
        break;
      case 'undo':
        document.dispatchEvent(new CustomEvent('shortcut:undo'));
        break;
      case 'redo':
        document.dispatchEvent(new CustomEvent('shortcut:redo'));
        break;
      default:
        console.log('未知的快捷鍵動作:', action);
    }
  };
};

/**
 * 自動儲存 Hook
 * 根據設定管理自動儲存功能
 */
export const useAutoSave = (saveCallback: () => void, hasChanges: boolean) => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.autoSave && hasChanges) {
      const timer = setTimeout(() => {
        saveCallback();
      }, settings.autoSaveInterval);

      return () => clearTimeout(timer);
    }
  }, [settings.autoSave, settings.autoSaveInterval, hasChanges, saveCallback]);
};