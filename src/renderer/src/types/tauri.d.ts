// Tauri 全局類型定義
declare global {
  interface Window {
    __TAURI__?: {
      invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
      [key: string]: unknown;
    };
    __TAURI_INTERNALS__?: {
      invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
      [key: string]: unknown;
    };
    __TAURI_INVOKE__?: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
  }
}

export {};