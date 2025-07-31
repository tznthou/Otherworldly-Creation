import { initializeSafeAPI } from './safeApi';
import { environmentSafety, detectEnvironment } from '../utils/environmentSafety';
import type { API } from './types';

// API 實例快取
let apiInstance: API | null = null;
let initializationPromise: Promise<API> | null = null;

// 檢測運行環境 (保持向後兼容)
export const isElectron = () => {
  const env = detectEnvironment();
  return env.isElectron;
};

export const isTauri = () => {
  const env = detectEnvironment();
  return env.isTauri;
};

// 安全的 API 初始化
const initializeAPI = async (): Promise<API> => {
  if (apiInstance) {
    return apiInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('🔧 開始初始化安全 API 系統...');
      
      // 檢測環境
      const env = detectEnvironment();
      console.log('📊 環境檢測完成:', env);
      
      // 初始化安全 API
      const safeAPI = await initializeSafeAPI();
      apiInstance = safeAPI;
      
      console.log('✅ 安全 API 系統初始化成功');
      
      if (env.safeMode) {
        console.warn('⚠️  當前運行在安全模式下，某些功能可能受限');
      }
      
      return safeAPI;
    } catch (error) {
      console.error('❌ 安全 API 系統初始化失敗:', error);
      
      // 強制啟用安全模式
      environmentSafety.forceSafeMode();
      
      // 重新嘗試初始化（此時應該會使用純前端模式）
      const safeAPI = await initializeSafeAPI();
      apiInstance = safeAPI;
      
      console.warn('🛡️  已切換到純前端安全模式');
      return safeAPI;
    }
  })();

  return initializationPromise;
};

// 同步獲取 API（如果尚未初始化則拋出錯誤）
const getAPI = (): API => {
  if (!apiInstance) {
    console.error('❌ API 尚未初始化，請先調用 initializeAPI()');
    throw new Error('API not initialized. Please call initializeAPI() first.');
  }
  return apiInstance;
};

// 異步獲取 API（會自動初始化）
export const getAPIAsync = async (): Promise<API> => {
  return await initializeAPI();
};

// 重置 API（用於測試或重新初始化）
export const resetAPI = () => {
  apiInstance = null;
  initializationPromise = null;
  environmentSafety.resetErrorCount();
};

// 檢查 API 是否已初始化
export const isAPIInitialized = (): boolean => {
  return apiInstance !== null;
};

// 創建 API 代理，在首次訪問時自動初始化
const createAPIProxy = (): API => {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (!apiInstance) {
        console.warn('⚠️  API 被訪問但尚未初始化，嘗試同步獲取...');
        try {
          return getAPI()[prop as keyof API];
        } catch (error) {
          console.error('❌ 無法同步獲取 API，請確保已調用初始化函數');
          throw error;
        }
      }
      return apiInstance[prop as keyof API];
    }
  };
  
  return new Proxy({}, handler) as API;
};

// 導出主要 API
export const api = createAPIProxy();
export default api;

// 導出初始化函數
export { initializeAPI };

// 導出類型
export * from './types';