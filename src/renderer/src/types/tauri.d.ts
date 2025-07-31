// Tauri 全局類型定義
declare global {
  interface Window {
    __TAURI__?: {
      invoke?: (command: string, args?: any) => Promise<any>;
      [key: string]: any;
    };
    __TAURI_INTERNALS__?: {
      invoke?: (command: string, args?: any) => Promise<any>;
      [key: string]: any;
    };
    __TAURI_INVOKE__?: (command: string, args?: any) => Promise<any>;
  }
}

export {};