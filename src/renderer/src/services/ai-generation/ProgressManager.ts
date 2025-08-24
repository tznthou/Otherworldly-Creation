/**
 * 進度狀態類型
 */
export interface ProgressState {
  isActive: boolean;
  currentStep: string;
  totalVersions: number;
  completedVersions: number;
  failedVersions: number;
  progress: number; // 0-100
  errors: string[];
  startTime?: Date;
  estimatedTimeRemaining?: number; // 秒
}

/**
 * 進度更新類型
 */
export type ProgressUpdate = Partial<ProgressState>;

/**
 * 進度回調函數類型
 */
export type ProgressCallback = (progress: ProgressState) => void;

/**
 * 進度事件類型
 */
export interface ProgressEvent {
  type: 'start' | 'update' | 'step' | 'success' | 'error' | 'complete';
  data: ProgressState;
  timestamp: Date;
}

/**
 * 進度管理器 - 統一管理進度狀態
 * 
 * 職責：
 * - 統一管理所有進度狀態
 * - 提供進度更新和計算邏輯  
 * - 支援多個監聽者同時訂閱
 * - 自動計算預估完成時間
 * - 提供進度歷史和事件日誌
 */
export class ProgressManager {
  private currentProgress: ProgressState;
  private callbacks: Set<ProgressCallback> = new Set();
  private eventHistory: ProgressEvent[] = [];

  constructor() {
    this.currentProgress = this.createInitialState();
  }

  /**
   * 創建初始進度狀態
   */
  private createInitialState(): ProgressState {
    return {
      isActive: false,
      currentStep: '準備中...',
      totalVersions: 0,
      completedVersions: 0,
      failedVersions: 0,
      progress: 0,
      errors: []
    };
  }

  /**
   * 初始化進度
   */
  initProgress(totalVersions: number, initialStep?: string): void {
    const startTime = new Date();
    
    this.currentProgress = {
      isActive: true,
      currentStep: initialStep || '準備生成...',
      totalVersions,
      completedVersions: 0,
      failedVersions: 0,
      progress: 0,
      errors: [],
      startTime,
      estimatedTimeRemaining: undefined
    };

    this.emitEvent('start');
    this.notifyCallbacks();
  }

  /**
   * 更新當前步驟
   */
  updateStep(step: string, additionalUpdates?: ProgressUpdate): void {
    this.currentProgress = {
      ...this.currentProgress,
      currentStep: step,
      ...additionalUpdates
    };

    this.updateEstimatedTime();
    this.emitEvent('step');
    this.notifyCallbacks();
  }

  /**
   * 更新進度
   */
  updateProgress(update: ProgressUpdate): void {
    const previousCompleted = this.currentProgress.completedVersions;
    
    this.currentProgress = {
      ...this.currentProgress,
      ...update
    };

    // 自動計算百分比進度
    if (this.currentProgress.totalVersions > 0) {
      const completed = this.currentProgress.completedVersions + this.currentProgress.failedVersions;
      this.currentProgress.progress = (completed / this.currentProgress.totalVersions) * 100;
    }

    // 如果有新完成的項目，更新預估時間
    if (this.currentProgress.completedVersions > previousCompleted) {
      this.updateEstimatedTime();
    }

    this.emitEvent('update');
    this.notifyCallbacks();
  }

  /**
   * 標記單個版本完成
   */
  markVersionComplete(versionIndex: number, success: boolean = true): void {
    if (success) {
      this.updateProgress({
        completedVersions: this.currentProgress.completedVersions + 1,
        currentStep: `版本 ${versionIndex + 1} 生成完成`
      });
    } else {
      this.updateProgress({
        failedVersions: this.currentProgress.failedVersions + 1,
        currentStep: `版本 ${versionIndex + 1} 生成失敗`
      });
    }
  }

  /**
   * 添加錯誤
   */
  addError(error: string): void {
    const updatedErrors = [...this.currentProgress.errors, error];
    
    this.updateProgress({
      errors: updatedErrors,
      failedVersions: this.currentProgress.failedVersions + 1
    });

    this.emitEvent('error');
  }

  /**
   * 完成進度
   */
  completeProgress(finalStep?: string): void {
    const totalTime = this.calculateTotalTime();
    const successRate = this.calculateSuccessRate();
    
    this.currentProgress = {
      ...this.currentProgress,
      isActive: false,
      currentStep: finalStep || this.generateCompletionMessage(),
      progress: 100,
      estimatedTimeRemaining: 0
    };

    this.emitEvent('complete');
    this.notifyCallbacks();

    // 記錄統計信息
    console.log(`📊 生成完成統計:`, {
      總版本: this.currentProgress.totalVersions,
      成功: this.currentProgress.completedVersions,
      失敗: this.currentProgress.failedVersions,
      成功率: `${successRate.toFixed(1)}%`,
      總耗時: `${totalTime}秒`,
      錯誤數: this.currentProgress.errors.length
    });
  }

  /**
   * 重置進度
   */
  resetProgress(): void {
    this.currentProgress = this.createInitialState();
    this.eventHistory = [];
    this.notifyCallbacks();
  }

  /**
   * 獲取當前進度狀態
   */
  getCurrentProgress(): ProgressState {
    return { ...this.currentProgress };
  }

  /**
   * 訂閱進度更新
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);
    
    // 立即發送當前狀態
    callback(this.getCurrentProgress());
    
    // 返回取消訂閱函數
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 獲取進度歷史事件
   */
  getEventHistory(): ProgressEvent[] {
    return [...this.eventHistory];
  }

  /**
   * 私有方法：更新預估完成時間
   */
  private updateEstimatedTime(): void {
    if (!this.currentProgress.startTime || this.currentProgress.completedVersions === 0) {
      return;
    }

    const elapsed = (Date.now() - this.currentProgress.startTime.getTime()) / 1000; // 秒
    const avgTimePerVersion = elapsed / this.currentProgress.completedVersions;
    const remainingVersions = this.currentProgress.totalVersions - this.currentProgress.completedVersions - this.currentProgress.failedVersions;
    
    this.currentProgress.estimatedTimeRemaining = Math.round(avgTimePerVersion * remainingVersions);
  }

  /**
   * 私有方法：計算總耗時
   */
  private calculateTotalTime(): number {
    if (!this.currentProgress.startTime) return 0;
    return Math.round((Date.now() - this.currentProgress.startTime.getTime()) / 1000);
  }

  /**
   * 私有方法：計算成功率
   */
  private calculateSuccessRate(): number {
    const total = this.currentProgress.completedVersions + this.currentProgress.failedVersions;
    if (total === 0) return 0;
    return (this.currentProgress.completedVersions / total) * 100;
  }

  /**
   * 私有方法：生成完成消息
   */
  private generateCompletionMessage(): string {
    const { completedVersions, failedVersions, totalVersions } = this.currentProgress;
    
    if (failedVersions === 0) {
      return `生成完成 - 成功生成 ${completedVersions} 個版本`;
    } else if (completedVersions === 0) {
      return `生成失敗 - 所有 ${totalVersions} 個版本都失敗了`;
    } else {
      return `生成完成 - 成功 ${completedVersions} 個，失敗 ${failedVersions} 個`;
    }
  }

  /**
   * 私有方法：發出事件
   */
  private emitEvent(type: ProgressEvent['type']): void {
    const event: ProgressEvent = {
      type,
      data: { ...this.currentProgress },
      timestamp: new Date()
    };

    this.eventHistory.push(event);
    
    // 限制事件歷史長度
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-50);
    }
  }

  /**
   * 私有方法：通知所有回調
   */
  private notifyCallbacks(): void {
    const progressCopy = this.getCurrentProgress();
    this.callbacks.forEach(callback => {
      try {
        callback(progressCopy);
      } catch (error) {
        console.error('進度回調執行失敗:', error);
      }
    });
  }

  /**
   * 獲取格式化的進度信息
   */
  getFormattedProgress(): string {
    const { completedVersions, failedVersions, totalVersions, progress, estimatedTimeRemaining } = this.currentProgress;
    
    let info = `進度: ${progress.toFixed(1)}% (${completedVersions + failedVersions}/${totalVersions})`;
    
    if (estimatedTimeRemaining && estimatedTimeRemaining > 0) {
      info += ` - 預估剩餘: ${estimatedTimeRemaining}秒`;
    }
    
    return info;
  }
}

/**
 * 單例實例
 */
export const progressManager = new ProgressManager();