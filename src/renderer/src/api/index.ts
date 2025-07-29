import { electronAPI } from './electron';
import { tauriAPI } from './tauri';
import type { API } from './types';

// 檢測運行環境
export const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

// 統一的 API 接口
export const api: API = isElectron() ? electronAPI : tauriAPI;

// 導出類型
export * from './types';