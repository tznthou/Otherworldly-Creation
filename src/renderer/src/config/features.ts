/**
 * 功能開關配置
 * 
 * 用於控制實驗性功能和新功能的啟用/停用
 * 現在從用戶設定中讀取，而不是硬編碼
 */

// 獲取設定中的功能開關，帶有預設值
const getSettingsFeatureFlags = () => {
  try {
    const stored = localStorage.getItem('genesis-chronicle-settings');
    if (stored) {
      const settings = JSON.parse(stored);
      console.log('📖 [FeatureFlags] 讀取設定:', settings.features);
      return settings.features || {};
    }
  } catch (error) {
    console.warn('無法讀取設定中的功能開關:', error);
  }
  return {};
};

// 動態獲取功能開關狀態
const getUserFeatureFlags = () => {
  const userFeatures = getSettingsFeatureFlags();
  
  return {
    /**
     * 擴展的AI插圖服務支援
     * 
     * 啟用後將顯示：
     * - Gemini Flash Image (免費)
     * - OpenRouter 圖像模型 (免費/付費)
     * - 基於已配置API的智能服務推薦
     * 
     * 關閉時只顯示原有的 Pollinations 和 Imagen
     */
    EXTENDED_ILLUSTRATION_SERVICES: userFeatures.extendedIllustrationServices ?? true,

    /**
     * 智能API檢測
     * 
     * 自動檢測用戶已配置的API金鑰
     * 並根據可用API動態顯示對應的圖像服務
     */
    SMART_API_DETECTION: userFeatures.smartApiDetection ?? true,

    /**
     * 開發模式調試
     * 
     * 在控制台輸出額外的調試信息（不受用戶設定影響）
     */
    DEBUG_ILLUSTRATION_SERVICES: process.env.NODE_ENV === 'development'
  };
};

// 創建一個可重新載入的功能開關系統
class FeatureFlagsManager {
  private _flags: ReturnType<typeof getUserFeatureFlags>;
  
  constructor() {
    this._flags = getUserFeatureFlags();
  }
  
  // 重新載入功能開關
  reload() {
    this._flags = getUserFeatureFlags();
  }
  
  // 獲取當前功能開關
  get flags() {
    return this._flags;
  }
  
  // 檢查功能是否啟用
  isEnabled(feature: keyof ReturnType<typeof getUserFeatureFlags>): boolean {
    return this._flags[feature];
  }
  
  // 調試日志函數
  debugLog(message: string, ...args: unknown[]) {
    if (this._flags.DEBUG_ILLUSTRATION_SERVICES) {
      console.log(`[IllustrationServices] ${message}`, ...args);
    }
  }
}

// 創建全域實例
const featureFlagsManager = new FeatureFlagsManager();

// 導出功能開關和管理器
export const FEATURE_FLAGS = featureFlagsManager.flags;
export const reloadFeatureFlags = () => featureFlagsManager.reload();
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return featureFlagsManager.isEnabled(feature);
};
export const debugLog = (message: string, ...args: unknown[]) => {
  featureFlagsManager.debugLog(message, ...args);
};

// 監聽設定變更事件，自動重載功能開關
window.addEventListener('settings-updated', () => {
  featureFlagsManager.reload();
  console.log('🔄 功能開關已重新載入');
});

// 也監聽 localStorage 變更作為後備
window.addEventListener('storage', (event) => {
  if (event.key === 'genesis-chronicle-settings') {
    featureFlagsManager.reload();
    console.log('🔄 功能開關已重新載入 (storage event)');
  }
});