import { AppSettings, DEFAULT_SETTINGS } from '../store/slices/settingsSlice';
import { api } from '../api';

const SETTINGS_KEY = 'genesis-chronicle-settings';

export class SettingsService {
  /**
   * 載入設定
   */
  static async loadSettings(): Promise<AppSettings> {
    try {
      // 首先嘗試從後端 API 載入（統一設定來源）
      try {
        const backendSettings = await api.settings.getAll();
        if (backendSettings && Object.keys(backendSettings).length > 0) {
          console.log('從後端載入設定:', backendSettings);
          const mergedSettings = this.mergeWithDefaults(backendSettings);
          
          // 同時更新 localStorage 作為快取
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
          
          return mergedSettings;
        }
      } catch (error) {
        console.warn('從後端載入設定失敗，回退到 localStorage:', error);
      }

      // 回退到 localStorage
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 合併預設設定以確保新增的設定項目有預設值
        const mergedSettings = this.mergeWithDefaults(parsed);
        
        // 嘗試將 localStorage 設定同步到後端
        try {
          for (const [key, value] of Object.entries(mergedSettings)) {
            await api.settings.set(key, value);
          }
          console.log('成功將 localStorage 設定同步到後端');
        } catch (error) {
          console.warn('同步設定到後端失敗:', error);
        }
        
        return mergedSettings;
      }
      
      // 如果都沒有設定，初始化預設設定到後端
      try {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await api.settings.set(key, value);
        }
        console.log('初始化預設設定到後端');
      } catch (error) {
        console.warn('初始化預設設定到後端失敗:', error);
      }
      
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('載入設定失敗:', error);
      return DEFAULT_SETTINGS;
    }
  }
  
  /**
   * 儲存設定
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      
      // 儲存設定變更歷史
      this.saveSettingsHistory(settings);
      
      // 同時通知主程序更新設定
      try {
        // 將設定逐一儲存到統一的設定系統
        // 對於複雜物件，需要序列化儲存
        for (const [key, value] of Object.entries(settings)) {
          await api.settings.set(key, value);
        }
      } catch (error) {
        console.warn('同步設定到後端失敗:', error);
      }
      
      // 通知監聽器
      SettingsWatcher.notifyListeners(settings);
    } catch (error) {
      console.error('儲存設定失敗:', error);
      throw error;
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
  static validateSettings(settings: any): boolean {
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
      
      // 檢查 AI 設定
      if (!settings.ai || typeof settings.ai !== 'object') {
        return false;
      }
      
      // 檢查編輯器設定
      if (!settings.editor || typeof settings.editor !== 'object') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 合併設定與預設值
   */
  private static mergeWithDefaults(settings: any): AppSettings {
    const merged = { ...DEFAULT_SETTINGS };
    
    if (settings && typeof settings === 'object') {
      // 一般設定
      if (typeof settings.language === 'string') merged.language = settings.language as any;
      if (typeof settings.autoSave === 'boolean') merged.autoSave = settings.autoSave;
      if (typeof settings.autoSaveInterval === 'number') merged.autoSaveInterval = settings.autoSaveInterval;
      
      // AI 設定
      if (settings.ai && typeof settings.ai === 'object') {
        merged.ai = { ...merged.ai, ...settings.ai };
      }
      
      // 編輯器設定
      if (settings.editor && typeof settings.editor === 'object') {
        merged.editor = { ...merged.editor, ...settings.editor };
      }
      
      // UI 設定
      if (settings.ui && typeof settings.ui === 'object') {
        merged.ui = { ...merged.ui, ...settings.ui };
      }
      
      // 備份設定
      if (settings.backup && typeof settings.backup === 'object') {
        merged.backup = { ...merged.backup, ...settings.backup };
      }
      
      // 隱私設定
      if (settings.privacy && typeof settings.privacy === 'object') {
        merged.privacy = { ...merged.privacy, ...settings.privacy };
      }
      
      // 快捷鍵設定
      if (settings.shortcuts && typeof settings.shortcuts === 'object') {
        merged.shortcuts = { ...merged.shortcuts, ...settings.shortcuts };
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
        return JSON.parse(history).map((item: any) => ({
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