import { ElectronAPI } from '../../../electron/main/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __TAURI__?: Record<string, unknown>;
  }
}

export {};