import { tauriAPI } from './tauri';
import type { API } from './types';

// 直接使用 Tauri API，不再需要環境檢測
export const api: API = tauriAPI;
export default api;

// 保持向後兼容的函數（現在總是返回 true/false）
export const isTauri = (): boolean => true;
export const isElectron = (): boolean => false;

// 導出類型
export * from './types';