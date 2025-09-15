import type { ExportTask, ExportFormat, ExportQuality, BatchExportConfig } from '../hooks/illustration/useExportManager';
import { imageCompressionService } from './imageCompressionService';

// 導出錯誤類型
export class ExportError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExportError';
  }
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
      const fileName = await this.generateFileName(task, config);
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
  private async loadImage(url: string): Promise<HTMLImageElement> {
    console.log(`🔄 [ExportService] 開始載入圖片: ${url.substring(0, 80)}...`);

    // 對於 asset:// 協議，使用 Tauri API 讀取檔案
    if (url.startsWith('asset://')) {
      try {
        // 從 asset:// URL 提取並解碼實際檔案路徑
        const encodedPath = url.replace('asset://localhost/', '');
        const decodedFullPath = decodeURIComponent(encodedPath);
        
        console.log(`📁 [ExportService] 解碼路徑: ${decodedFullPath}`);
        
        // 提取檔案名（最後一個 / 之後的內容）
        const fileName = decodedFullPath.split('/').pop();
        if (!fileName) {
          throw new Error(`無法從路徑提取檔案名: ${decodedFullPath}`);
        }
        
        // 移除副檔名，只保留檔案 ID（因為 get_final_image_path 會自動加 .jpg）
        const fileId = fileName.replace(/\.[^/.]+$/, '');
        
        console.log(`📁 [ExportService] 檔案 ID: ${fileId}`);
        console.log(`📁 [ExportService] 原檔案名: ${fileName}`);

        // 動態導入 Tauri API
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 使用檔案 ID（不含副檔名）呼叫 Tauri 命令
        const base64Data: string = await invoke('read_image_as_base64', { 
          imagePath: fileId 
        });
        
        console.log(`📄 [ExportService] Base64 數據獲取成功，長度: ${base64Data.length}`);

        // 偵測檔案格式（基於原檔案名的擴展名）
        const extension = fileName.split('.').pop()?.toLowerCase();
        let mimeType = 'image/jpeg'; // 預設
        
        switch (extension) {
          case 'png':
            mimeType = 'image/png';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'bmp':
            mimeType = 'image/bmp';
            break;
          default:
            mimeType = 'image/jpeg';
        }

        // 創建 data URL
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        console.log(`🔄 [ExportService] Data URL 創建完成，MIME: ${mimeType}`);

        // 創建圖片元素並載入
        return new Promise((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => {
            console.log(`✅ [ExportService] 圖片載入成功: ${img.naturalWidth}x${img.naturalHeight}`);
            resolve(img);
          };

          img.onerror = () => {
            console.error(`❌ [ExportService] Data URL 圖片載入失敗`);
            reject(new Error(`Failed to load image from data URL: ${fileName}`));
          };

          img.src = dataUrl;
        });

      } catch (apiError) {
        console.error(`❌ [ExportService] Tauri API 讀取失敗:`, apiError);
        throw new Error(`Failed to read image file via Tauri API: ${url} - ${apiError}`);
      }
    }

    // 傳統方法：用於 http/https 和其他協議
    return new Promise((resolve, reject) => {
      const img = new Image();

      // 對於 http/https 圖片，設置 crossOrigin 以支援跨域
      if (url.startsWith('http://') || url.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        console.log(`✅ [ExportService] 傳統方法載入成功: ${img.naturalWidth}x${img.naturalHeight}`);
        resolve(img);
      };

      img.onerror = () => {
        console.error(`❌ [ExportService] 傳統方法載入失敗: ${url}`);
        reject(new Error(`Failed to load image: ${url}`));
      };

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
    try {
      // 設置 Canvas 尺寸
      this.canvas.width = image.naturalWidth;
      this.canvas.height = image.naturalHeight;

      // 清除 Canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 繪製圖片
      this.ctx.drawImage(image, 0, 0);

      console.log(`🖼️ [ExportService] 開始圖片處理: ${this.canvas.width}x${this.canvas.height}, 格式: ${quality.format}`);

      // 使用新的壓縮服務處理圖片
      const compressedBlob = await imageCompressionService.compressImage(this.canvas, quality);

      // 將 Blob 轉換為 Data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            console.log(`✅ [ExportService] 圖片處理完成: ${compressedBlob.size} bytes`);
            resolve(reader.result);
          } else {
            reject(new Error('讀取 Blob 失敗'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader 錯誤'));
        reader.readAsDataURL(compressedBlob);
      });

    } catch (error) {
      console.error('❌ [ExportService] 圖片處理失敗:', error);

      // 如果壓縮失敗，降級到傳統方法
      console.warn('⚠️ [ExportService] 降級到傳統壓縮方法');
      return this.fallbackProcessImage(quality);
    }
  }

  /**
   * 降級圖片處理方法（使用傳統 Canvas.toDataURL）
   */
  private fallbackProcessImage(quality: ExportQuality): string {
    // 根據格式和品質設定導出
    let mimeType: string;
    let qualityValue: number | undefined;

    switch (quality.format) {
      case 'png':
        mimeType = 'image/png';
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

    // 導出為 Data URL，添加 Canvas 污染檢測
    try {
      const dataUrl = this.canvas.toDataURL(mimeType, qualityValue);
      console.log(`✅ [ExportService] 降級處理完成`);
      return dataUrl;
    } catch (error) {
      if (error instanceof Error && error.message.includes('insecure')) {
        throw new Error(`Canvas security error: Unable to export image. This may be due to cross-origin restrictions. Image source: 'unknown'`);
      }
      throw error;
    }
  }

  /**
   * 生成檔案名稱
   */
  private async generateFileName(task: ExportTask, config: BatchExportConfig): Promise<string> {
    try {
      // 使用 ImageNamingService 生成檔案名稱
      // 簡化版本：直接使用模板替換
      const now = new Date();
      let generatedName = config.namingConfig.template
        .replace('{project}', 'current_project')
        .replace('{chapter}', 'chapter_01')
        .replace('{character}', 'character_name')
        .replace('{date}', now.toISOString().split('T')[0])
        .replace('{index}', Date.now().toString().slice(-6));

      // 清理檔案名稱
      generatedName = this.sanitizeFileName(generatedName);

      // 確保檔案副檔名正確
      const baseName = generatedName.replace(/\.[^/.]+$/, ''); // 移除原副檔名
      return `${baseName}.${task.format}`;

    } catch (error) {
      console.warn('使用 ImageNamingService 生成檔案名失敗，使用後備方案:', error);

      // 後備方案：簡單檔案名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      return `export_${timestamp}_${task.sourceImageId}.${task.format}`;
    }
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
        
      case 'by_date': {
        // 按日期分類
        const date = new Date().toISOString().split('T')[0];
        outputPath += `/dates/${date}`;
        break;
      }
        
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
   * 保存檔案（使用真實的 Tauri API）
   */
  private async saveFile(
    dataUrl: string,
    outputPath: string,
    format: ExportFormat
  ): Promise<void> {
    console.log(`💾 [ExportService] 保存檔案: ${outputPath} (${format})`);

    try {
      // 動態導入 Tauri API
      const { invoke } = await import('@tauri-apps/api/core');

      // 使用新的 save_export_file Tauri 命令保存檔案
      const savedPath: string = await invoke('save_export_file', {
        dataUrl,
        outputPath
      });

      console.log(`✅ [ExportService] 檔案保存成功: ${savedPath}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [ExportService] 檔案保存失敗:`, error);

      throw new ExportError(
        `Failed to save file: ${errorMessage}`,
        '',
        'FILE_SAVE_ERROR',
        { outputPath, error }
      );
    }
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

    if (!config.namingConfig || !config.namingConfig.template) {
      errors.push('檔案命名配置不能為空');
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
      case 'jpg': {
        // JPEG 根據品質變化，大約 0.5-2 bytes per pixel
        const factor = (quality / 100) * 1.5 + 0.5;
        return pixels * factor;
      }
      case 'webp': {
        // WebP 通常比 JPEG 小 25-35%
        const jpegSize = pixels * ((quality / 100) * 1.5 + 0.5);
        return jpegSize * 0.7;
      }
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