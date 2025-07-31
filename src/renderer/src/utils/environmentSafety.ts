// 環境安全檢測和故障保護系統
export interface EnvironmentInfo {
  isTauri: boolean;
  isElectron: boolean;
  isBrowser: boolean;
  hasWindow: boolean;
  userAgent: string;
  hostname: string;
  port: string;
  protocol: string;
  tauriApiAvailable: boolean;
  electronApiAvailable: boolean;
  safeMode: boolean;
  errorCount: number;
}

class EnvironmentSafety {
  private errorCount = 0;
  private maxErrors = 5;
  private safeMode = false;
  private environmentInfo: EnvironmentInfo | null = null;

  // 檢測當前運行環境
  detectEnvironment(): EnvironmentInfo {
    if (this.environmentInfo) {
      return this.environmentInfo;
    }

    const hasWindow = typeof window !== 'undefined';
    const userAgent = hasWindow ? navigator.userAgent : '';
    const hostname = hasWindow ? location.hostname : '';
    const port = hasWindow ? location.port : '';
    const protocol = hasWindow ? location.protocol : '';

    // 檢測 Electron
    const isElectron = hasWindow && 
      typeof window.electronAPI !== 'undefined' && 
      window.electronAPI !== null;

    // 檢測 Tauri
    const tauriApiAvailable = hasWindow && (
      typeof window.__TAURI__ !== 'undefined' ||
      typeof window.__TAURI_INTERNALS__ !== 'undefined' ||
      typeof window.__TAURI_INVOKE__ === 'function'
    );

    const isTauri = tauriApiAvailable || (
      hasWindow && 
      !isElectron && 
      (port === '3000' || port === '3001') &&
      (hostname === 'localhost' || hostname === '127.0.0.1')
    );

    const isBrowser = hasWindow && !isElectron && !isTauri;

    this.environmentInfo = {
      isTauri,
      isElectron,
      isBrowser,
      hasWindow,
      userAgent,
      hostname,
      port,
      protocol,
      tauriApiAvailable,
      electronApiAvailable: isElectron,
      safeMode: this.safeMode,
      errorCount: this.errorCount
    };

    console.log('環境檢測結果:', this.environmentInfo);
    return this.environmentInfo;
  }

  // 記錄錯誤並檢查是否需要啟用安全模式
  reportError(error: Error | string, context?: string): boolean {
    this.errorCount++;
    const errorMessage = error instanceof Error ? error.message : error;
    
    console.warn(`環境安全錯誤 #${this.errorCount}:`, errorMessage, context ? `(${context})` : '');

    // 檢查是否是 Tauri 相關錯誤
    const isTauriError = errorMessage.includes('callbackId') ||
                        errorMessage.includes('undefined is not an object') ||
                        errorMessage.includes('Tauri') ||
                        errorMessage.includes('__TAURI');

    if (isTauriError) {
      console.warn('檢測到 Tauri 相關錯誤，考慮啟用安全模式');
    }

    // 如果錯誤過多，自動啟用安全模式
    if (this.errorCount >= this.maxErrors || (isTauriError && this.errorCount >= 2)) {
      this.enableSafeMode();
      return true;
    }

    return false;
  }

  // 啟用安全模式
  enableSafeMode(): void {
    if (this.safeMode) return;
    
    this.safeMode = true;
    console.warn('🚨 啟用安全模式：禁用所有潛在危險的 API 調用');
    
    // 更新環境信息
    if (this.environmentInfo) {
      this.environmentInfo.safeMode = true;
    }

    // 廣播安全模式啟用事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safemode-enabled', {
        detail: { reason: 'too-many-errors', errorCount: this.errorCount }
      }));
    }
  }

  // 檢查是否處於安全模式
  isSafeMode(): boolean {
    return this.safeMode;
  }

  // 重置錯誤計數
  resetErrorCount(): void {
    this.errorCount = 0;
  }

  // 強制啟用安全模式
  forceSafeMode(): void {
    this.enableSafeMode();
  }

  // 檢查 API 是否安全可用
  isApiSafe(apiType: 'tauri' | 'electron'): boolean {
    if (this.safeMode) return false;
    
    const env = this.detectEnvironment();
    
    if (apiType === 'tauri') {
      return env.isTauri && env.tauriApiAvailable;
    } else if (apiType === 'electron') {
      return env.isElectron && env.electronApiAvailable;
    }
    
    return false;
  }

  // 安全執行函數
  async safeExecute<T>(
    fn: () => Promise<T>, 
    fallback: T, 
    context?: string
  ): Promise<T> {
    if (this.safeMode) {
      console.warn(`安全模式已啟用，跳過執行: ${context || 'unknown'}`);
      return fallback;
    }

    try {
      return await fn();
    } catch (error) {
      const shouldEnableSafeMode = this.reportError(error as Error, context);
      if (shouldEnableSafeMode) {
        console.warn(`由於錯誤啟用安全模式，返回預設值: ${context || 'unknown'}`);
      }
      return fallback;
    }
  }
}

// 單例實例
export const environmentSafety = new EnvironmentSafety();

// 便利函數
export const detectEnvironment = () => environmentSafety.detectEnvironment();
export const reportError = (error: Error | string, context?: string) => 
  environmentSafety.reportError(error, context);
export const isSafeMode = () => environmentSafety.isSafeMode();
export const isApiSafe = (apiType: 'tauri' | 'electron') => 
  environmentSafety.isApiSafe(apiType);
export const safeExecute = <T>(fn: () => Promise<T>, fallback: T, context?: string) =>
  environmentSafety.safeExecute(fn, fallback, context);