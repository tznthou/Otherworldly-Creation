import { electronAPI } from './electron';
import { tauriAPI } from './tauri';
import type { API } from './types';

// 檢測運行環境
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const isTauri = () => {
  // 檢查多個 Tauri 相關的標識
  return typeof window !== 'undefined' && (
    window.__TAURI__ !== undefined ||
    window.__TAURI_INTERNALS__ !== undefined ||
    // 檢查是否在 Tauri webview 中運行
    navigator.userAgent.includes('Tauri') ||
    // 檢查是否存在 Tauri API
    typeof window.__TAURI_INVOKE__ === 'function'
  );
};

// 動態檢測和載入 API
const getAPI = (): API => {
  console.log('環境檢測開始...');
  console.log('window.electronAPI:', typeof window?.electronAPI);
  console.log('window.__TAURI__:', typeof window?.__TAURI__);
  console.log('window.__TAURI_INTERNALS__:', typeof window?.__TAURI_INTERNALS__);
  console.log('navigator.userAgent:', navigator.userAgent);
  
  if (isElectron()) {
    console.log('檢測到 Electron 環境');
    return electronAPI;
  } else if (isTauri()) {
    console.log('檢測到 Tauri 環境');
    return tauriAPI;
  } else {
    console.warn('未檢測到已知環境，預設使用 Tauri API');
    return tauriAPI;
  }
};

// 統一的 API 接口
export const api: API = getAPI();

// 導出類型
export * from './types';