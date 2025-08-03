import { Chapter } from '../store/slices/chaptersSlice';
import { Character } from '../store/slices/charactersSlice';
import { Project } from '../store/slices/projectsSlice';
import { AppSettings } from '../store/slices/settingsSlice';
import api from '../api';

// 儲存資料類型聯合
type SaveData = Chapter | Character | Project | AppSettings | Record<string, unknown>;

export interface SaveOperation {
  id: string;
  type: 'chapter' | 'character' | 'project' | 'settings';
  data: SaveData;
  timestamp: Date;
  status: 'pending' | 'saving' | 'saved' | 'error';
  retryCount: number;
  error?: string;
}

export interface SaveManagerOptions {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  enableBatching: boolean;
}

class SaveManagerClass {
  private operations: Map<string, SaveOperation> = new Map();
  private saveQueue: string[] = [];
  private isProcessing = false;
  private options: SaveManagerOptions;
  private listeners: Array<(operations: SaveOperation[]) => void> = [];

  constructor(options: Partial<SaveManagerOptions> = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 5,
      enableBatching: true,
      ...options
    };
  }

  /**
   * 添加儲存操作到佇列
   */
  addSaveOperation(type: SaveOperation['type'], data: SaveData): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: SaveOperation = {
      id,
      type,
      data,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.operations.set(id, operation);
    this.saveQueue.push(id);
    
    this.notifyListeners();
    this.processQueue();
    
    return id;
  }

  /**
   * 處理儲存佇列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.saveQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      if (this.options.enableBatching) {
        await this.processBatch();
      } else {
        await this.processSingle();
      }
    } catch (error) {
      console.error('處理儲存佇列時發生錯誤:', error);
    } finally {
      this.isProcessing = false;
      
      // 如果還有待處理的操作，繼續處理
      if (this.saveQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * 批次處理儲存操作
   */
  private async processBatch(): Promise<void> {
    const batchIds = this.saveQueue.splice(0, this.options.batchSize);
    const batch = batchIds.map(id => this.operations.get(id)!).filter(Boolean);

    // 按類型分組
    const groupedOperations = batch.reduce((groups, op) => {
      if (!groups[op.type]) {
        groups[op.type] = [];
      }
      groups[op.type].push(op);
      return groups;
    }, {} as Record<string, SaveOperation[]>);

    // 並行處理不同類型的操作
    const promises = Object.entries(groupedOperations).map(([type, operations]) =>
      this.processByType(type as SaveOperation['type'], operations)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 單個處理儲存操作
   */
  private async processSingle(): Promise<void> {
    const operationId = this.saveQueue.shift();
    if (!operationId) return;

    const operation = this.operations.get(operationId);
    if (!operation) return;

    await this.processByType(operation.type, [operation]);
  }

  /**
   * 按類型處理儲存操作
   */
  private async processByType(type: SaveOperation['type'], operations: SaveOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        this.updateOperationStatus(operation.id, 'saving');
        
        switch (type) {
          case 'chapter':
            await this.saveChapter(operation.data as Chapter);
            break;
          case 'character':
            await this.saveCharacter(operation.data as Character);
            break;
          case 'project':
            await this.saveProject(operation.data as Project);
            break;
          case 'settings':
            await this.saveSettings(operation.data);
            break;
          default:
            throw new Error(`未知的儲存類型: ${type}`);
        }

        this.updateOperationStatus(operation.id, 'saved');
        
      } catch (error) {
        await this.handleSaveError(operation, error);
      }
    }
  }

  /**
   * 儲存章節
   */
  private async saveChapter(chapter: Chapter): Promise<void> {
    await api.chapters.update({
      ...chapter,
      content: JSON.stringify(chapter.content)
    });
  }

  /**
   * 儲存角色
   */
  private async saveCharacter(character: Character): Promise<void> {
    await api.characters.update(character);
  }

  /**
   * 儲存專案
   */
  private async saveProject(project: Project): Promise<void> {
    await api.projects.update(project);
  }

  /**
   * 儲存設定
   */
  private async saveSettings(settings: Record<string, unknown>): Promise<void> {
    // 將設定物件轉換為多個 set 操作
    for (const [key, value] of Object.entries(settings)) {
      await api.settings.set(key, value);
    }
  }

  /**
   * 處理儲存錯誤
   */
  private async handleSaveError(operation: SaveOperation, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    operation.retryCount += 1;
    operation.error = errorMessage;

    if (operation.retryCount < this.options.maxRetries) {
      // 重試
      operation.status = 'pending';
      this.saveQueue.push(operation.id);
      
      // 延遲重試
      await new Promise(resolve => 
        setTimeout(resolve, this.options.retryDelay * operation.retryCount)
      );
    } else {
      // 達到最大重試次數，標記為錯誤
      this.updateOperationStatus(operation.id, 'error', errorMessage);
    }
  }

  /**
   * 更新操作狀態
   */
  private updateOperationStatus(
    id: string, 
    status: SaveOperation['status'], 
    error?: string
  ): void {
    const operation = this.operations.get(id);
    if (operation) {
      operation.status = status;
      if (error) {
        operation.error = error;
      }
      this.notifyListeners();
    }
  }

  /**
   * 獲取所有操作
   */
  getOperations(): SaveOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * 獲取待處理的操作
   */
  getPendingOperations(): SaveOperation[] {
    return this.getOperations().filter(op => 
      op.status === 'pending' || op.status === 'saving'
    );
  }

  /**
   * 獲取失敗的操作
   */
  getFailedOperations(): SaveOperation[] {
    return this.getOperations().filter(op => op.status === 'error');
  }

  /**
   * 重試失敗的操作
   */
  retryFailedOperations(): void {
    const failedOperations = this.getFailedOperations();
    
    failedOperations.forEach(operation => {
      operation.status = 'pending';
      operation.retryCount = 0;
      operation.error = undefined;
      this.saveQueue.push(operation.id);
    });

    this.notifyListeners();
    this.processQueue();
  }

  /**
   * 清除已完成的操作
   */
  clearCompletedOperations(): void {
    const completedIds: string[] = [];
    
    this.operations.forEach((operation, id) => {
      if (operation.status === 'saved') {
        completedIds.push(id);
      }
    });

    completedIds.forEach(id => this.operations.delete(id));
    this.notifyListeners();
  }

  /**
   * 強制儲存所有待處理的操作
   */
  async forceSaveAll(): Promise<void> {
    const pendingOperations = this.getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        await this.processByType(operation.type, [operation]);
      } catch (error) {
        console.error(`強制儲存操作 ${operation.id} 失敗:`, error);
      }
    }
  }

  /**
   * 添加狀態監聽器
   */
  addListener(callback: (operations: SaveOperation[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除狀態監聽器
   */
  removeListener(callback: (operations: SaveOperation[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(): void {
    const operations = this.getOperations();
    this.listeners.forEach(callback => {
      try {
        callback(operations);
      } catch (error) {
        console.error('儲存管理器監聽器執行失敗:', error);
      }
    });
  }

  /**
   * 獲取儲存統計
   */
  getStatistics() {
    const operations = this.getOperations();
    
    return {
      total: operations.length,
      pending: operations.filter(op => op.status === 'pending').length,
      saving: operations.filter(op => op.status === 'saving').length,
      saved: operations.filter(op => op.status === 'saved').length,
      error: operations.filter(op => op.status === 'error').length,
      queueLength: this.saveQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

// 單例模式
export const SaveManager = new SaveManagerClass();

// 導出類型和實例
export default SaveManager;