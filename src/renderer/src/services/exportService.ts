import type { ExportTask, ExportFormat, ExportQuality, BatchExportConfig } from '../hooks/illustration/useExportManager';

// 導出錯誤類型
export class ExportError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

// 檔案命名變數
interface NameTemplateVars {
  project: string;
  character: string;
  date: string;
  time: string;
  index: string;
  format: string;
  original_name: string;
}

// 導出進度回調
export type ProgressCallback = (taskId: string, progress: number) => void;
export type StatusCallback = (taskId: string, status: ExportTask['status'], error?: string) => void;

/**
 * 圖片導出服務
 * 處理圖片格式轉換、檔案命名、目錄組織等核心邏輯
 */
export class ExportService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private processingQueue: Set<string> = new Set();

  constructor() {
    // 創建離屏 Canvas 用於圖片處理
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context for image processing');
    }
    this.ctx = ctx;
  }

  /**
   * 處理單個導出任務
   */
  async processExportTask(
    task: ExportTask,
    config: BatchExportConfig,
    onProgress: ProgressCallback,
    onStatusChange: StatusCallback
  ): Promise<void> {
    const { id: taskId } = task;

    try {
      // 檢查是否已在處理中
      if (this.processingQueue.has(taskId)) {
        throw new ExportError('Task is already being processed', taskId, 'ALREADY_PROCESSING');
      }

      this.processingQueue.add(taskId);
      onStatusChange(taskId, 'processing');
      onProgress(taskId, 0);

      // 1. 載入原始圖片
      const image = await this.loadImage(task.sourceImageUrl);
      onProgress(taskId, 20);

      // 2. 處理圖片（格式轉換、品質調整）
      const processedImageData = await this.processImage(image, task.quality);
      onProgress(taskId, 60);

      // 3. 生成檔案名稱
      const fileName = this.generateFileName(task, config);
      onProgress(taskId, 70);

      // 4. 組織目錄結構
      const outputPath = this.organizeOutputPath(fileName, task, config);
      onProgress(taskId, 80);

      // 5. 保存檔案（這裡用模擬的方式，實際應該調用 Tauri API）
      await this.saveFile(processedImageData, outputPath, task.format);
      onProgress(taskId, 100);

      onStatusChange(taskId, 'completed');
      
      console.log(`✅ [ExportService] 導出完成: ${fileName}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      console.error(`❌ [ExportService] 導出失敗 (${taskId}):`, errorMessage);
      onStatusChange(taskId, 'failed', errorMessage);
    } finally {
      this.processingQueue.delete(taskId);
    }
  }

  /**
   * 批次處理多個任務
   */
  async processBatchTasks(
    tasks: ExportTask[],
    config: BatchExportConfig,
    onProgress: ProgressCallback,
    onStatusChange: StatusCallback,
    maxConcurrent: number = 3
  ): Promise<void> {
    console.log(`🚀 [ExportService] 開始批次導出 ${tasks.length} 個任務，最大並行數: ${maxConcurrent}`);

    // 使用 Promise 池限制並行數
    const executeTask = async (task: ExportTask): Promise<void> => {
      await this.processExportTask(task, config, onProgress, onStatusChange);
    };

    // 分批處理
    const batches: ExportTask[][] = [];
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      batches.push(tasks.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      await Promise.allSettled(batch.map(executeTask));
    }

    console.log(`✅ [ExportService] 批次導出完成`);
  }

  /**
   * 載入圖片
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 處理跨域圖片
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
    });
  }

  /**
   * 處理圖片（格式轉換、品質調整）
   */
  private async processImage(
    image: HTMLImageElement, 
    quality: ExportQuality
  ): Promise<string> {
    // 設置 Canvas 尺寸
    this.canvas.width = image.naturalWidth;
    this.canvas.height = image.naturalHeight;

    // 清除 Canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 繪製圖片
    this.ctx.drawImage(image, 0, 0);

    // 根據格式和品質設定導出
    let mimeType: string;
    let qualityValue: number | undefined;

    switch (quality.format) {
      case 'png':
        mimeType = 'image/png';
        // PNG 不支援 quality 參數，但可以通過 compression 控制
        break;
      case 'jpg':
        mimeType = 'image/jpeg';
        qualityValue = quality.quality / 100;
        break;
      case 'webp':
        mimeType = 'image/webp';
        qualityValue = quality.quality / 100;
        break;
      default:
        throw new Error(`Unsupported format: ${quality.format}`);
    }

    // 導出為 Data URL
    const dataUrl = this.canvas.toDataURL(mimeType, qualityValue);
    return dataUrl;
  }

  /**
   * 生成檔案名稱
   */
  private generateFileName(task: ExportTask, config: BatchExportConfig): string {
    const now = new Date();
    const vars: NameTemplateVars = {
      project: 'current_project', // TODO: 從實際專案獲取
      character: 'character_name', // TODO: 從任務獲取角色名稱
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      time: now.toTimeString().split(' ')[0].replace(/:/g, '-'), // HH-MM-SS
      index: Date.now().toString().slice(-6), // 6位時間戳
      format: task.format,
      original_name: task.fileName || 'unnamed'
    };

    let fileName = config.nameTemplate;
    
    // 替換模板變數
    Object.entries(vars).forEach(([key, value]) => {
      fileName = fileName.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    // 確保檔案名稱安全
    fileName = this.sanitizeFileName(fileName);
    
    // 添加副檔名
    if (!fileName.endsWith(`.${task.format}`)) {
      fileName += `.${task.format}`;
    }

    return fileName;
  }

  /**
   * 組織輸出路徑
   */
  private organizeOutputPath(
    fileName: string,
    task: ExportTask,
    config: BatchExportConfig
  ): string {
    let outputPath = config.outputDirectory;

    switch (config.organizationMethod) {
      case 'flat':
        // 直接放在輸出目錄
        break;
        
      case 'by_character':
        // 按角色分類
        outputPath += '/characters/character_name'; // TODO: 實際角色名稱
        break;
        
      case 'by_date':
        // 按日期分類
        const date = new Date().toISOString().split('T')[0];
        outputPath += `/dates/${date}`;
        break;
        
      case 'by_project':
        // 按專案分類
        outputPath += '/projects/current_project'; // TODO: 實際專案名稱
        break;
    }

    return `${outputPath}/${fileName}`;
  }

  /**
   * 清理檔案名稱，移除非法字符
   */
  private sanitizeFileName(fileName: string): string {
    // 移除或替換非法字符
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_') // Windows 非法字符
      .replace(/\s+/g, '_') // 空格替換為下劃線
      .replace(/_{2,}/g, '_') // 多個連續下劃線合併
      .replace(/^_|_$/g, ''); // 移除開頭和結尾的下劃線
  }

  /**
   * 保存檔案（模擬實現，實際應該使用 Tauri API）
   */
  private async saveFile(
    dataUrl: string,
    outputPath: string,
    format: ExportFormat
  ): Promise<void> {
    // 這裡是模擬實現，實際應該：
    // 1. 將 data URL 轉換為 Blob
    // 2. 使用 Tauri 的檔案系統 API 保存到指定路徑
    
    console.log(`💾 [ExportService] 保存檔案: ${outputPath} (${format})`);
    
    // 模擬保存時間
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // TODO: 實際的 Tauri API 調用
    /*
    try {
      // 轉換 data URL 為 binary data
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 使用 Tauri API 保存檔案
      await api.files.writeFile(outputPath, uint8Array);
      
    } catch (error) {
      throw new ExportError(
        `Failed to save file: ${error.message}`,
        '',
        'FILE_SAVE_ERROR',
        { outputPath, error }
      );
    }
    */
  }

  /**
   * 獲取支援的格式
   */
  static getSupportedFormats(): ExportFormat[] {
    return ['png', 'jpg', 'webp'];
  }

  /**
   * 獲取格式的預設品質設定
   */
  static getDefaultQuality(format: ExportFormat): ExportQuality {
    switch (format) {
      case 'png':
        return { format, quality: 100, compression: 6 };
      case 'jpg':
        return { format, quality: 95, compression: 0 };
      case 'webp':
        return { format, quality: 90, compression: 0 };
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * 驗證導出配置
   */
  static validateConfig(config: BatchExportConfig): string[] {
    const errors: string[] = [];

    if (!config.outputDirectory) {
      errors.push('輸出目錄不能為空');
    }

    if (!config.nameTemplate) {
      errors.push('檔案命名模板不能為空');
    }

    if (config.maxConcurrent < 1 || config.maxConcurrent > 10) {
      errors.push('最大並行數必須在 1-10 之間');
    }

    if (!ExportService.getSupportedFormats().includes(config.defaultFormat)) {
      errors.push(`不支援的預設格式: ${config.defaultFormat}`);
    }

    return errors;
  }

  /**
   * 估算檔案大小
   */
  static estimateFileSize(
    width: number,
    height: number,
    format: ExportFormat,
    quality: number
  ): number {
    const pixels = width * height;
    
    switch (format) {
      case 'png':
        // PNG 通常是 3-4 bytes per pixel（無損壓縮）
        return pixels * 3.5;
      case 'jpg':
        // JPEG 根據品質變化，大約 0.5-2 bytes per pixel
        const factor = (quality / 100) * 1.5 + 0.5;
        return pixels * factor;
      case 'webp':
        // WebP 通常比 JPEG 小 25-35%
        const jpegSize = pixels * ((quality / 100) * 1.5 + 0.5);
        return jpegSize * 0.7;
      default:
        return pixels * 2; // 預設估算
    }
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.processingQueue.clear();
    // Canvas 會在物件銷毀時自動清理
  }
}

// 單例實例
let exportServiceInstance: ExportService | null = null;

/**
 * 獲取導出服務單例
 */
export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
}

/**
 * 清理導出服務實例
 */
export function cleanupExportService(): void {
  if (exportServiceInstance) {
    exportServiceInstance.cleanup();
    exportServiceInstance = null;
  }
}

export default ExportService;