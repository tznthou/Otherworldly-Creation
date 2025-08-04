import { AppSettings, DEFAULT_SETTINGS } from '../store/slices/settingsSlice';
import { api } from '../api';
import { Language } from '../i18n';

const SETTINGS_KEY = 'genesis-chronicle-settings';

export class SettingsService {
  /**
   * 載入設定
   */
  static async loadSettings(): Promise<AppSettings> {
    console.log('開始載入設定...');
    
    try {
      // 簡化載入邏輯，優先使用 localStorage，避免 API 調用卡死
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const mergedSettings = this.mergeWithDefaults(parsed);
          console.log('從 localStorage 載入設定成功');
          return mergedSettings;
        } catch (error) {
          console.warn('localStorage 設定解析失敗:', error);
        }
      }
      
      // 如果 localStorage 沒有設定，使用預設設定
      console.log('使用預設設定');
      
      // 儲存預設設定到 localStorage
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      
      return DEFAULT_SETTINGS;
      
    } catch (error) {
      console.error('設定載入完全失敗，使用預設設定:', error);
      return DEFAULT_SETTINGS;
    }
  }
  
  /**
   * 儲存設定
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      // 優先儲存到 localStorage，確保不會卡死
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('設定已儲存到 localStorage');
      
      // 儲存設定變更歷史
      this.saveSettingsHistory(settings);
      
      // 後台同步到後端（不阻塞主流程）
      this.syncSettingsToBackend(settings).catch(error => {
        console.warn('背景同步設定到後端失敗:', error);
      });
      
      // 通知監聽器
      SettingsWatcher.notifyListeners(settings);
    } catch (error) {
      console.error('儲存設定失敗:', error);
      throw error;
    }
  }
  
  /**
   * 後台同步設定到後端
   */
  private static async syncSettingsToBackend(settings: AppSettings): Promise<void> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await api.settings.set(key, value);
      }
      console.log('設定已同步到後端');
    } catch (error) {
      console.warn('同步設定到後端失敗:', error);
    }
  }
  
  /**
   * 重置設定
   */
  static async resetSettings(): Promise<void> {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      
      // 通知主程序重置設定
      try {
        await api.settings.reset();
      } catch (error) {
        console.warn('重置後端設定失敗:', error);
      }
    } catch (error) {
      console.error('重置設定失敗:', error);
      throw error;
    }
  }
  
  /**
   * 匯出設定
   */
  static async exportSettings(): Promise<string> {
    try {
      const settings = await this.loadSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('匯出設定失敗:', error);
      throw error;
    }
  }
  
  /**
   * 匯入設定
   */
  static async importSettings(settingsJson: string): Promise<AppSettings> {
    try {
      const settings = JSON.parse(settingsJson);
      const mergedSettings = this.mergeWithDefaults(settings);
      await this.saveSettings(mergedSettings);
      return mergedSettings;
    } catch (error) {
      console.error('匯入設定失敗:', error);
      throw error;
    }
  }
  
  /**
   * 驗證設定格式
   */
  static validateSettings(settings: unknown): boolean {
    try {
      // 基本結構檢查
      if (!settings || typeof settings !== 'object') {
        return false;
      }
      
      // 檢查必要的頂層屬性
      const requiredKeys = ['language', 'autoSave', 'ai', 'editor', 'ui', 'backup', 'privacy', 'shortcuts'];
      for (const key of requiredKeys) {
        if (!(key in settings)) {
          return false;
        }
      }
      
      const settingsObj = settings as Record<string, unknown>;
      // 檢查 AI 設定
      if (!settingsObj.ai || typeof settingsObj.ai !== 'object') {
        return false;
      }
      
      // 檢查編輯器設定
      if (!settingsObj.editor || typeof settingsObj.editor !== 'object') {
        return false;
      }
      
      return true;
    } catch (_error) {
      return false;
    }
  }
  
  /**
   * 合併設定與預設值
   */
  private static mergeWithDefaults(settings: unknown): AppSettings {
    const merged = { ...DEFAULT_SETTINGS };
    
    if (settings && typeof settings === 'object') {
      const settingsObj = settings as Record<string, unknown>;
      // 一般設定
      if (typeof settingsObj.language === 'string' && ['zh-TW', 'zh-CN', 'en', 'ja'].includes(settingsObj.language)) {
        merged.language = settingsObj.language as Language;
      }
      if (typeof settingsObj.autoSave === 'boolean') merged.autoSave = settingsObj.autoSave;
      if (typeof settingsObj.autoSaveInterval === 'number') merged.autoSaveInterval = settingsObj.autoSaveInterval;
      
      // AI 設定
      if (settingsObj.ai && typeof settingsObj.ai === 'object') {
        merged.ai = { ...merged.ai, ...settingsObj.ai };
      }
      
      // 編輯器設定
      if (settingsObj.editor && typeof settingsObj.editor === 'object') {
        merged.editor = { ...merged.editor, ...settingsObj.editor };
      }
      
      // UI 設定
      if (settingsObj.ui && typeof settingsObj.ui === 'object') {
        merged.ui = { ...merged.ui, ...settingsObj.ui };
      }
      
      // 備份設定
      if (settingsObj.backup && typeof settingsObj.backup === 'object') {
        merged.backup = { ...merged.backup, ...settingsObj.backup };
      }
      
      // 隱私設定
      if (settingsObj.privacy && typeof settingsObj.privacy === 'object') {
        merged.privacy = { ...merged.privacy, ...settingsObj.privacy };
      }
      
      // 快捷鍵設定
      if (settingsObj.shortcuts && typeof settingsObj.shortcuts === 'object') {
        merged.shortcuts = { ...merged.shortcuts, ...settingsObj.shortcuts };
      }
    }
    
    return merged;
  }
  
  /**
   * 獲取設定變更歷史
   */
  static getSettingsHistory(): Array<{ timestamp: Date; settings: AppSettings }> {
    try {
      const history = localStorage.getItem(`${SETTINGS_KEY}-history`);
      if (history) {
        return JSON.parse(history).map((item: { timestamp: string; settings: AppSettings }) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('獲取設定歷史失敗:', error);
      return [];
    }
  }
  
  /**
   * 儲存設定變更歷史
   */
  static saveSettingsHistory(settings: AppSettings): void {
    try {
      const history = this.getSettingsHistory();
      history.unshift({
        timestamp: new Date(),
        settings: { ...settings }
      });
      
      // 只保留最近 10 次變更
      const trimmedHistory = history.slice(0, 10);
      
      localStorage.setItem(`${SETTINGS_KEY}-history`, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('儲存設定歷史失敗:', error);
    }
  }
}

// 設定變更監聽器
export class SettingsWatcher {
  private static listeners: Array<(settings: AppSettings) => void> = [];
  
  static addListener(callback: (settings: AppSettings) => void): void {
    this.listeners.push(callback);
  }
  
  static removeListener(callback: (settings: AppSettings) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  static notifyListeners(settings: AppSettings): void {
    this.listeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        console.error('設定監聽器執行失敗:', error);
      }
    });
  }
}