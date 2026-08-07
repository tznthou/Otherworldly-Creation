import { AppSettings, DEFAULT_SETTINGS } from '../store/slices/settingsSlice';
import { api } from '../api';
import { Language } from '../i18n';
import { Store } from '@tauri-apps/plugin-store';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('settingsService');

// ⚠️ Tauri Store 是「明文 JSON 檔」，沒有加密層——.settings.dat 可直接 JSON.parse。
// 它取代 localStorage 只是為了脫離網頁儲存層；API 金鑰的加密儲存走 OS Keyring（見下方 Keyring 區段）。
const SETTINGS_STORE_FILE = '.settings.dat';
const SETTINGS_KEY = 'app-settings';
const SETTINGS_HISTORY_KEY = 'settings-history';

// 初始化 settings store（明文 JSON）
let settingsStore: Store | null = null;

async function getStore(): Promise<Store> {
  if (!settingsStore) {
    settingsStore = await Store.load(SETTINGS_STORE_FILE);
  }
  return settingsStore;
}

export class SettingsService {
  /**
   * 🔄 一次性遷移：從 localStorage 遷移到 Tauri Store
   */
  private static async migrateFromLocalStorage(): Promise<AppSettings | null> {
    try {
      const OLD_SETTINGS_KEY = 'genesis-chronicle-settings';
      const oldSettings = localStorage.getItem(OLD_SETTINGS_KEY);

      if (oldSettings) {
        log.debug('🔄 檢測到舊版 localStorage 設定，開始遷移...');
        const parsed = JSON.parse(oldSettings);
        const store = await getStore();

        // 儲存到 Tauri Store
        await store.set(SETTINGS_KEY, parsed);
        await store.save();

        // 清除舊的 localStorage
        localStorage.removeItem(OLD_SETTINGS_KEY);
        localStorage.removeItem(`${OLD_SETTINGS_KEY}-history`);

        log.debug('✅ 設定遷移完成！已從 localStorage 移至 Tauri Store');
        return parsed;
      }

      return null;
    } catch (error) {
      log.warn('⚠️ localStorage 遷移失敗:', error);
      return null;
    }
  }

  /**
   * 載入設定
   */
  static async loadSettings(): Promise<AppSettings> {
    log.debug('開始載入設定...');

    try {
      const store = await getStore();

      // 🔄 首次執行：嘗試從 localStorage 遷移
      const migratedSettings = await this.migrateFromLocalStorage();
      if (migratedSettings) {
        const mergedSettings = this.mergeWithDefaults(migratedSettings);
        log.debug('✅ 從 localStorage 遷移設定成功');
        return mergedSettings;
      }

      // 從 Tauri Store 載入
      const stored = await store.get<AppSettings>(SETTINGS_KEY);
      if (stored) {
        const mergedSettings = this.mergeWithDefaults(stored);
        log.debug('✅ 從 Tauri Store 載入設定成功');
        return mergedSettings;
      }

      // 如果沒有設定，使用預設設定並儲存
      log.debug('📝 使用預設設定');
      await store.set(SETTINGS_KEY, DEFAULT_SETTINGS);
      await store.save();

      return DEFAULT_SETTINGS;

    } catch (error) {
      log.error('❌ 設定載入完全失敗，使用預設設定:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 儲存設定
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const store = await getStore();

      // 儲存到 Tauri Store（明文 JSON，勿存機密資料）
      await store.set(SETTINGS_KEY, settings);
      await store.save();
      log.debug('✅ 設定已儲存到 Tauri Store');

      // 儲存設定變更歷史
      await this.saveSettingsHistory(settings);

      // 後台同步到後端（不阻塞主流程）
      this.syncSettingsToBackend(settings).catch(error => {
        log.warn('⚠️ 背景同步設定到後端失敗:', error);
      });

      // 通知監聽器
      SettingsWatcher.notifyListeners(settings);

      // 觸發功能開關重載
      this.notifyFeatureFlagsUpdate();
    } catch (error) {
      log.error('❌ 儲存設定失敗:', error);
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
      log.debug('✅ 設定已同步到後端');
    } catch (error) {
      log.warn('⚠️ 同步設定到後端失敗:', error);
    }
  }

  /**
   * 重置設定
   */
  static async resetSettings(): Promise<void> {
    try {
      const store = await getStore();

      // 清除 Tauri Store
      await store.delete(SETTINGS_KEY);
      await store.delete(SETTINGS_HISTORY_KEY);
      await store.save();

      // 通知主程序重置設定
      try {
        await api.settings.reset();
      } catch (error) {
        log.warn('⚠️ 重置後端設定失敗:', error);
      }

      log.debug('✅ 設定已重置');
    } catch (error) {
      log.error('❌ 重置設定失敗:', error);
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
      log.error('❌ 匯出設定失敗:', error);
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
      log.error('❌ 匯入設定失敗:', error);
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
      log.debug('🔄 已通知功能開關系統更新');
    } catch (error) {
      log.warn('⚠️ 通知功能開關更新失敗:', error);
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
      log.error('❌ 獲取設定歷史失敗:', error);
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
      log.error('❌ 儲存設定歷史失敗:', error);
    }
  }

  // ========================================
  // 🔐 加密 API Key 管理 (Keyring)
  // ========================================

  /**
   * 🔐 取得加密的 API Key
   *
   * 讀取順序：
   * 1. 優先從 OS Keyring 讀取 (macOS Keychain / Windows Credential Manager)
   * 2. 如果失敗，降級到 localStorage (向後相容)
   *
   * @param key - API key 的識別名稱 (例如: "ai.openaiApiKey")
   * @returns API key 值，不存在則返回 null
   */
  static async getSecureApiKey(key: string): Promise<string | null> {
    try {
      // 1️⃣ 優先嘗試從 Keyring 讀取
      log.debug('🔐 [getSecureApiKey] 嘗試從 Keyring 讀取', { key });
      const result = await api.getSecureKey(key);

      if (result) {
        log.debug('✅ [getSecureApiKey] Keyring 讀取成功', { key });
        return result;
      }

      // 2️⃣ Keyring 沒有資料，降級到 localStorage (向後相容)
      log.warn('⚠️ [getSecureApiKey] Keyring 無資料，降級到 localStorage', { key });
      const settings = await this.loadSettings();

      // 根據 key 路徑取得值 (例如: "ai.openaiApiKey" -> settings.ai.openaiApiKey)
      const value = this.getNestedValue(settings, key);

      if (value && typeof value === 'string') {
        // 🔄 自動遷移：發現 localStorage 有資料，同步到 Keyring
        log.debug('🔄 [getSecureApiKey] 自動遷移到 Keyring', { key });
        await this.setSecureApiKey(key, value);
        return value;
      }

      log.info('ℹ️ [getSecureApiKey] 未找到資料', { key });
      return null;

    } catch (error) {
      log.error('❌ [getSecureApiKey] 讀取失敗', { key, error });
      // 發生任何錯誤都回退到 localStorage
      try {
        const settings = await this.loadSettings();
        const value = this.getNestedValue(settings, key);
        return (value && typeof value === 'string') ? value : null;
      } catch (fallbackError) {
        log.error(`❌ [getSecureApiKey] localStorage fallback 也失敗:`, fallbackError);
        return null;
      }
    }
  }

  /**
   * 🔐 設定加密的 API Key
   *
   * 寫入策略：雙寫保險
   * 1. 寫入 OS Keyring (主要加密儲存)
   * 2. 同時寫入 localStorage (備份 + 向後相容)
   *
   * @param key - API key 的識別名稱
   * @param value - API key 的值
   */
  static async setSecureApiKey(key: string, value: string): Promise<void> {
    try {
      log.debug('🔐 [setSecureApiKey] 開始寫入', { key });

      // 1️⃣ 寫入 Keyring (主要儲存)
      try {
        await api.setSecureKey(key, value);
        log.debug('✅ [setSecureApiKey] Keyring 寫入成功', { key });
      } catch (keyringError) {
        log.warn('⚠️ [setSecureApiKey] Keyring 寫入失敗 (將僅使用 localStorage)', { key, error: keyringError });
      }

      // 2️⃣ 同時寫入 localStorage (備份 + 向後相容)
      const settings = await this.loadSettings();
      this.setNestedValue(settings, key, value);
      await this.saveSettings(settings);
      log.debug('✅ [setSecureApiKey] localStorage 備份成功', { key });

    } catch (error) {
      log.error('❌ [setSecureApiKey] 寫入完全失敗', { key, error });
      throw new Error(`無法儲存 API Key: ${error}`);
    }
  }

  /**
   * 🔐 刪除加密的 API Key
   *
   * 刪除策略：雙刪除
   * 1. 從 OS Keyring 刪除
   * 2. 從 localStorage 刪除
   *
   * @param key - API key 的識別名稱
   */
  static async deleteSecureApiKey(key: string): Promise<void> {
    try {
      log.debug('🔐 [deleteSecureApiKey] 開始刪除', { key });

      // 1️⃣ 從 Keyring 刪除
      try {
        await api.deleteSecureKey(key);
        log.debug('✅ [deleteSecureApiKey] Keyring 刪除成功', { key });
      } catch (keyringError) {
        log.warn('⚠️ [deleteSecureApiKey] Keyring 刪除失敗 (可能不存在)', { key, error: keyringError });
      }

      // 2️⃣ 從 localStorage 刪除
      const settings = await this.loadSettings();
      this.setNestedValue(settings, key, ''); // 設為空字串
      await this.saveSettings(settings);
      log.debug('✅ [deleteSecureApiKey] localStorage 刪除成功', { key });

    } catch (error) {
      log.error('❌ [deleteSecureApiKey] 刪除失敗', { key, error });
    }
  }

  /**
   * 工具函數：根據路徑取得巢狀物件的值
   * 例如: getNestedValue(settings, "ai.openaiApiKey") => settings.ai.openaiApiKey
   */
  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 工具函數：根據路徑設定巢狀物件的值
   * 例如: setNestedValue(settings, "ai.openaiApiKey", "sk-xxx") => settings.ai.openaiApiKey = "sk-xxx"
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
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
        log.error('❌ 設定監聽器執行失敗:', error);
      }
    });
  }
}
