import { AppSettings, DEFAULT_SETTINGS } from '../store/slices/settingsSlice';
import { api } from '../api';
import { Language } from '../i18n';
import { Store } from '@tauri-apps/plugin-store';

// 🔐 使用加密的 Tauri Store 取代 localStorage
const SETTINGS_STORE_FILE = '.settings.dat';
const SETTINGS_KEY = 'app-settings';
const SETTINGS_HISTORY_KEY = 'settings-history';

// 初始化加密的 settings store
let settingsStore: Store | null = null;

async function getStore(): Promise<Store> {
  if (!settingsStore) {
    settingsStore = await Store.load(SETTINGS_STORE_FILE);
  }
  return settingsStore;
}

export class SettingsService {
  /**
   * 🔄 一次性遷移：從 localStorage 遷移到加密儲存
   */
  private static async migrateFromLocalStorage(): Promise<AppSettings | null> {
    try {
      const OLD_SETTINGS_KEY = 'genesis-chronicle-settings';
      const oldSettings = localStorage.getItem(OLD_SETTINGS_KEY);

      if (oldSettings) {
        console.log('🔄 檢測到舊版 localStorage 設定，開始遷移...');
        const parsed = JSON.parse(oldSettings);
        const store = await getStore();

        // 儲存到加密 store
        await store.set(SETTINGS_KEY, parsed);
        await store.save();

        // 清除舊的 localStorage
        localStorage.removeItem(OLD_SETTINGS_KEY);
        localStorage.removeItem(`${OLD_SETTINGS_KEY}-history`);

        console.log('✅ 設定遷移完成！已從 localStorage 移至加密儲存');
        return parsed;
      }

      return null;
    } catch (error) {
      console.warn('⚠️ localStorage 遷移失敗:', error);
      return null;
    }
  }

  /**
   * 載入設定
   */
  static async loadSettings(): Promise<AppSettings> {
    console.log('開始載入設定...');

    try {
      const store = await getStore();

      // 🔄 首次執行：嘗試從 localStorage 遷移
      const migratedSettings = await this.migrateFromLocalStorage();
      if (migratedSettings) {
        const mergedSettings = this.mergeWithDefaults(migratedSettings);
        console.log('✅ 從 localStorage 遷移設定成功');
        return mergedSettings;
      }

      // 從加密 store 載入
      const stored = await store.get<AppSettings>(SETTINGS_KEY);
      if (stored) {
        const mergedSettings = this.mergeWithDefaults(stored);
        console.log('✅ 從加密儲存載入設定成功');
        return mergedSettings;
      }

      // 如果沒有設定，使用預設設定並儲存
      console.log('📝 使用預設設定');
      await store.set(SETTINGS_KEY, DEFAULT_SETTINGS);
      await store.save();

      return DEFAULT_SETTINGS;

    } catch (error) {
      console.error('❌ 設定載入完全失敗，使用預設設定:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 儲存設定
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const store = await getStore();

      // 🔐 儲存到加密 store
      await store.set(SETTINGS_KEY, settings);
      await store.save();
      console.log('✅ 設定已儲存到加密儲存（AES-256）');

      // 儲存設定變更歷史
      await this.saveSettingsHistory(settings);

      // 後台同步到後端（不阻塞主流程）
      this.syncSettingsToBackend(settings).catch(error => {
        console.warn('⚠️ 背景同步設定到後端失敗:', error);
      });

      // 通知監聽器
      SettingsWatcher.notifyListeners(settings);

      // 觸發功能開關重載
      this.notifyFeatureFlagsUpdate();
    } catch (error) {
      console.error('❌ 儲存設定失敗:', error);
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
      console.log('✅ 設定已同步到後端');
    } catch (error) {
      console.warn('⚠️ 同步設定到後端失敗:', error);
    }
  }

  /**
   * 重置設定
   */
  static async resetSettings(): Promise<void> {
    try {
      const store = await getStore();

      // 清除加密儲存
      await store.delete(SETTINGS_KEY);
      await store.delete(SETTINGS_HISTORY_KEY);
      await store.save();

      // 通知主程序重置設定
      try {
        await api.settings.reset();
      } catch (error) {
        console.warn('⚠️ 重置後端設定失敗:', error);
      }

      console.log('✅ 設定已重置');
    } catch (error) {
      console.error('❌ 重置設定失敗:', error);
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
      console.error('❌ 匯出設定失敗:', error);
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
      console.error('❌ 匯入設定失敗:', error);
      throw error;
    }
  }

  /**
   * 通知功能開關系統更新
   */
  private static notifyFeatureFlagsUpdate() {
    try {
      window.dispatchEvent(new CustomEvent('settings-updated', {
        detail: { timestamp: Date.now() }
      }));
      console.log('🔄 已通知功能開關系統更新');
    } catch (error) {
      console.warn('⚠️ 通知功能開關更新失敗:', error);
    }
  }

  /**
   * 驗證設定格式
   */
  static validateSettings(settings: unknown): boolean {
    try {
      if (!settings || typeof settings !== 'object') {
        return false;
      }

      const requiredKeys = ['language', 'ai', 'editor', 'ui', 'backup', 'privacy', 'shortcuts', 'features'];
      for (const key of requiredKeys) {
        if (!(key in settings)) {
          return false;
        }
      }

      const settingsObj = settings as Record<string, unknown>;
      if (!settingsObj.ai || typeof settingsObj.ai !== 'object') {
        return false;
      }

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
      if (typeof settingsObj.language === 'string' && ['zh-TW', 'zh-CN', 'en', 'ja'].includes(settingsObj.language)) {
        merged.language = settingsObj.language as Language;
      }
      if (typeof settingsObj.autoSave === 'boolean') merged.backup.autoBackup = settingsObj.autoSave;
      if (typeof settingsObj.autoSaveInterval === 'number') merged.backup.backupInterval = Math.round(settingsObj.autoSaveInterval / 1000);

      if (settingsObj.ai && typeof settingsObj.ai === 'object') {
        merged.ai = { ...merged.ai, ...settingsObj.ai };
      }

      if (settingsObj.editor && typeof settingsObj.editor === 'object') {
        merged.editor = { ...merged.editor, ...settingsObj.editor };
      }

      if (settingsObj.ui && typeof settingsObj.ui === 'object') {
        merged.ui = { ...merged.ui, ...settingsObj.ui };
      }

      if (settingsObj.backup && typeof settingsObj.backup === 'object') {
        merged.backup = { ...merged.backup, ...settingsObj.backup };
      }

      if (settingsObj.privacy && typeof settingsObj.privacy === 'object') {
        merged.privacy = { ...merged.privacy, ...settingsObj.privacy };
      }

      if (settingsObj.shortcuts && typeof settingsObj.shortcuts === 'object') {
        merged.shortcuts = { ...merged.shortcuts, ...settingsObj.shortcuts };
      }

      if (settingsObj.features && typeof settingsObj.features === 'object') {
        merged.features = { ...merged.features, ...settingsObj.features };
      }
    }

    return merged;
  }

  /**
   * 獲取設定變更歷史
   */
  static async getSettingsHistory(): Promise<Array<{ timestamp: Date; settings: AppSettings }>> {
    try {
      const store = await getStore();
      const history = await store.get<Array<{ timestamp: string; settings: AppSettings }>>(SETTINGS_HISTORY_KEY);

      if (history) {
        return history.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ 獲取設定歷史失敗:', error);
      return [];
    }
  }

  /**
   * 儲存設定變更歷史
   */
  static async saveSettingsHistory(settings: AppSettings): Promise<void> {
    try {
      const store = await getStore();
      const history = await this.getSettingsHistory();

      history.unshift({
        timestamp: new Date(),
        settings: { ...settings }
      });

      // 只保留最近 10 次變更
      const trimmedHistory = history.slice(0, 10);

      await store.set(SETTINGS_HISTORY_KEY, trimmedHistory);
      await store.save();
    } catch (error) {
      console.error('❌ 儲存設定歷史失敗:', error);
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
        console.error('❌ 設定監聽器執行失敗:', error);
      }
    });
  }
}
