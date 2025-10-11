import type { ExportQuality, ExportFormat, ResizeOptions } from '../hooks/illustration/useExportManager';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('imageCompressionService');

/**
 * 圖片壓縮服務
 * 提供智能圖片壓縮和優化功能
 */
export class ImageCompressionService {
  private static instance: ImageCompressionService;

  // 獲取單例
  static getInstance(): ImageCompressionService {
    if (!this.instance) {
      this.instance = new ImageCompressionService();
    }
    return this.instance;
  }

  /**
   * 智能壓縮圖片
   * @param canvas 原始 Canvas
   * @param quality 品質設定
   * @returns 壓縮後的 Blob
   */
  async compressImage(
    canvas: HTMLCanvasElement,
    quality: ExportQuality
  ): Promise<Blob> {
    console.log(`🔄 [ImageCompressionService] 開始壓縮圖片: ${quality.format}, 品質: ${quality.quality}`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換

    let processedCanvas = canvas;

    // 1. 調整尺寸（如需要）
    if (quality.resize?.enabled) {
      processedCanvas = await this.resizeCanvas(canvas, quality.resize);
      console.log(`📐 [ImageCompressionService] 尺寸調整完成: ${processedCanvas.width}x${processedCanvas.height}`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
    }

    // 2. 根據格式選擇壓縮策略
    let result: Blob;
    switch (quality.format) {
      case 'png':
        result = await this.compressPNG(processedCanvas, quality);
        break;
      case 'jpg':
        result = await this.compressJPEG(processedCanvas, quality);
        break;
      case 'webp':
        result = await this.compressWebP(processedCanvas, quality);
        break;
      default:
        throw new Error(`不支援的格式: ${quality.format}`);
    }

    console.log(`✅ [ImageCompressionService] 壓縮完成: ${result.size} bytes (${result.type})`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
    return result;
  }

  /**
   * 調整 Canvas 尺寸
   */
  private async resizeCanvas(
    canvas: HTMLCanvasElement,
    resize: ResizeOptions
  ): Promise<HTMLCanvasElement> {
    if (!resize.enabled) return canvas;

    const { maxWidth, maxHeight, maintainAspectRatio } = resize;
    let { width, height } = canvas;

    // 計算新尺寸
    if (maintainAspectRatio) {
      const aspectRatio = width / height;

      if (maxWidth && width > maxWidth) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
      }

      if (maxHeight && height > maxHeight) {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
    } else {
      if (maxWidth && width > maxWidth) width = maxWidth;
      if (maxHeight && height > maxHeight) height = maxHeight;
    }

    // 如果尺寸沒有改變，直接返回原 Canvas
    if (width === canvas.width && height === canvas.height) {
      return canvas;
    }

    // 創建新的 Canvas
    const newCanvas = document.createElement('canvas');
    const ctx = newCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('無法創建 Canvas context');
    }

    newCanvas.width = Math.round(width);
    newCanvas.height = Math.round(height);

    // 使用高品質縮放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 繪製調整後的圖片
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    return newCanvas;
  }

  /**
   * PNG 壓縮處理
   */
  private async compressPNG(
    canvas: HTMLCanvasElement,
    quality: ExportQuality
  ): Promise<Blob> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('無法取得 Canvas context');
    }

    // PNG 特殊處理：色彩量化（如果啟用調色板優化）
    if (quality.advanced?.optimizePalette) {
      log.debug('🎨 [ImageCompressionService] 執行 PNG 調色板優化');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const optimizedImageData = this.quantizeColors(imageData, 256);
      ctx.putImageData(optimizedImageData, 0, 0);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('PNG 壓縮失敗'));
        }
      }, 'image/png');
    });
  }

  /**
   * JPEG 壓縮處理
   */
  private async compressJPEG(
    canvas: HTMLCanvasElement,
    quality: ExportQuality
  ): Promise<Blob> {
    const qualityValue = quality.quality / 100;
    const { targetFileSize } = quality.advanced || {};

    // 如果有目標檔案大小，使用二分法找最佳品質
    if (targetFileSize) {
      console.log(`🎯 [ImageCompressionService] 使用目標檔案大小優化: ${targetFileSize} bytes`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
      return await this.optimizeForTargetSize(canvas, 'image/jpeg', targetFileSize);
    }

    // 標準 JPEG 壓縮
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('JPEG 壓縮失敗'));
        }
      }, 'image/jpeg', qualityValue);
    });
  }

  /**
   * WebP 壓縮處理
   */
  private async compressWebP(
    canvas: HTMLCanvasElement,
    quality: ExportQuality
  ): Promise<Blob> {
    const qualityValue = quality.quality / 100;
    const { targetFileSize } = quality.advanced || {};

    // 檢查 WebP 支援
    if (!this.isWebPSupported()) {
      log.warn('⚠️ [ImageCompressionService] WebP 不支援，降級到 JPEG');
      return await this.compressJPEG(canvas, { ...quality, format: 'jpg' });
    }

    // 如果有目標檔案大小
    if (targetFileSize) {
      console.log(`🎯 [ImageCompressionService] 使用目標檔案大小優化: ${targetFileSize} bytes`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
      return await this.optimizeForTargetSize(canvas, 'image/webp', targetFileSize);
    }

    // 標準 WebP 壓縮
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('WebP 壓縮失敗'));
        }
      }, 'image/webp', qualityValue);
    });
  }

  /**
   * 針對目標檔案大小優化（二分法）
   */
  private async optimizeForTargetSize(
    canvas: HTMLCanvasElement,
    mimeType: string,
    targetSize: number
  ): Promise<Blob> {
    let min = 0.1, max = 1.0;
    let bestBlob: Blob | null = null;
    let iterations = 0;
    const maxIterations = 10;

    while (max - min > 0.05 && iterations < maxIterations) {
      const mid = (min + max) / 2;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mimeType, mid);
      });

      if (blob) {
        console.log(`🔍 [ImageCompressionService] 嘗試品質 ${(mid * 100).toFixed(1)}%: ${blob.size} bytes`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換

        if (blob.size <= targetSize) {
          bestBlob = blob;
          min = mid;
        } else {
          max = mid;
        }
      }

      iterations++;
    }

    if (bestBlob) {
      console.log(`✅ [ImageCompressionService] 找到最佳壓縮: ${bestBlob.size} bytes (目標: ${targetSize} bytes)`); // TODO: 複雜模式，需人工轉換 // TODO: 複雜模式，需人工轉換
      return bestBlob;
    }

    // 如果找不到合適的壓縮，使用最低品質
    log.warn('⚠️ [ImageCompressionService] 無法達到目標檔案大小，使用最低品質');
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('無法壓縮到目標大小'));
        }
      }, mimeType, 0.1);
    });
  }

  /**
   * 色彩量化（減少色彩數量）
   */
  private quantizeColors(imageData: ImageData, maxColors: number): ImageData {
    // 簡化版色彩量化演算法
    const data = imageData.data;
    const colors = new Map<string, number>();

    // 收集所有顏色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const colorKey = `${r},${g},${b}`;
      colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
    }

    // 如果顏色數量已經少於目標，直接返回
    if (colors.size <= maxColors) {
      return imageData;
    }

    // 找出最常用的顏色
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxColors)
      .map(([color]) => color.split(',').map(Number));

    // 為每個像素找到最接近的顏色
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let minDistance = Infinity;
      let closestColor = [r, g, b];

      for (const [cr, cg, cb] of sortedColors) {
        const distance = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = [cr, cg, cb];
        }
      }

      data[i] = closestColor[0];
      data[i + 1] = closestColor[1];
      data[i + 2] = closestColor[2];
    }

    return imageData;
  }

  /**
   * 檢查 WebP 支援
   */
  private isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * 預設壓縮等級設定
   */
  static getCompressionPresets() {
    return {
      none: {
        description: '不壓縮',
        quality: { png: 100, jpg: 95, webp: 90 },
        resize: { enabled: false }
      },
      light: {
        description: '輕度壓縮（品質優先）',
        quality: { png: 100, jpg: 85, webp: 80 },
        resize: { enabled: false }
      },
      balanced: {
        description: '平衡壓縮',
        quality: { png: 100, jpg: 75, webp: 70 },
        resize: { enabled: true, maxWidth: 2048, maxHeight: 2048, maintainAspectRatio: true }
      },
      aggressive: {
        description: '高度壓縮（大小優先）',
        quality: { png: 100, jpg: 60, webp: 55 },
        resize: { enabled: true, maxWidth: 1920, maxHeight: 1920, maintainAspectRatio: true },
        advanced: { stripMetadata: true, optimizePalette: true }
      }
    };
  }

  /**
   * 估算壓縮後檔案大小
   */
  static estimateCompressedSize(
    width: number,
    height: number,
    format: ExportFormat,
    quality: number
  ): number {
    const pixels = width * height;

    switch (format) {
      case 'png':
        // PNG 通常是 2-4 bytes per pixel
        return pixels * 3;
      case 'jpg': {
        // JPEG 根據品質變化，大約 0.3-2 bytes per pixel
        const factor = (quality / 100) * 1.7 + 0.3;
        return pixels * factor;
      }
      case 'webp': {
        // WebP 通常比 JPEG 小 25-35%
        const jpegSize = pixels * ((quality / 100) * 1.7 + 0.3);
        return jpegSize * 0.7;
      }
      default:
        return pixels * 2;
    }
  }
}

// 匯出單例
export const imageCompressionService = ImageCompressionService.getInstance();
export default imageCompressionService;