import { api } from '../api';
import type { EPubGenerationOptions, EPubResult, EPubExportRecord } from '../api/models';

export interface EPubGenerationProgress {
  stage: 'preparing' | 'converting' | 'generating' | 'complete' | 'error';
  progress: number; // 0-100
  currentChapter?: string;
  totalChapters: number;
  message?: string;
}

export type EPubProgressCallback = (progress: EPubGenerationProgress) => void;

/**
 * EPUB 電子書生成服務
 * 提供 EPUB 生成、導出管理和進度追蹤功能
 */
export class EPubService {
  /**
   * 生成 EPUB 電子書
   * @param projectId 專案 ID
   * @param options 生成選項
   * @param onProgress 進度回調函數
   * @returns EPUB 生成結果
   */
  static async generateEPub(
    projectId: string, 
    options?: Partial<EPubGenerationOptions>,
    onProgress?: EPubProgressCallback
  ): Promise<EPubResult> {
    try {
      // 設置默認選項
      const defaultOptions: EPubGenerationOptions = {
        include_cover: true,
        font_family: 'Noto Sans TC',
        chapter_break_style: 'page-break',
        custom_css: this.getDefaultCSS(),
        ...options
      };

      // 報告開始狀態
      onProgress?.({
        stage: 'preparing',
        progress: 0,
        totalChapters: 0,
        message: '正在準備生成 EPUB...'
      });

      // 獲取專案信息以計算章節數
      const _project = await api.projects.getById(projectId);
      const chapters = await api.chapters.getByProjectId(projectId);
      
      onProgress?.({
        stage: 'preparing',
        progress: 20,
        totalChapters: chapters.length,
        message: `找到 ${chapters.length} 個章節`
      });

      // 轉換階段
      onProgress?.({
        stage: 'converting',
        progress: 40,
        totalChapters: chapters.length,
        message: '正在轉換章節內容...'
      });

      // 生成階段
      onProgress?.({
        stage: 'generating',
        progress: 70,
        totalChapters: chapters.length,
        message: '正在生成 EPUB 文件...'
      });

      // 調用 API 生成 EPUB
      const result = await api.epub.generate(projectId, defaultOptions);

      // 完成
      onProgress?.({
        stage: 'complete',
        progress: 100,
        totalChapters: chapters.length,
        message: `EPUB 生成完成：${result.title}`
      });

      return result;

    } catch (error) {
      // 錯誤處理
      onProgress?.({
        stage: 'error',
        progress: 0,
        totalChapters: 0,
        message: `生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
      });
      throw error;
    }
  }

  /**
   * 獲取專案的 EPUB 導出歷史
   * @param projectId 專案 ID
   * @returns 導出記錄列表
   */
  static async getExportHistory(projectId: string): Promise<EPubExportRecord[]> {
    return api.epub.getExports(projectId);
  }

  /**
   * 刪除 EPUB 導出記錄
   * @param exportId 導出記錄 ID
   */
  static async deleteExport(exportId: string): Promise<void> {
    return api.epub.deleteExport(exportId);
  }

  /**
   * 格式化文件大小顯示
   * @param bytes 位元組數
   * @returns 格式化的大小字符串
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * 驗證專案是否可以生成 EPUB
   * @param projectId 專案 ID
   * @returns 驗證結果
   */
  static async validateProject(projectId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 檢查專案存在
      const project = await api.projects.getById(projectId);
      if (!project) {
        errors.push('專案不存在');
        return { valid: false, errors, warnings };
      }

      // 檢查章節
      const chapters = await api.chapters.getByProjectId(projectId);
      if (chapters.length === 0) {
        errors.push('專案沒有章節內容');
      } else if (chapters.length === 1) {
        warnings.push('專案只有一個章節，建議至少有 2 個章節');
      }

      // 檢查章節內容
      let emptyChapters = 0;
      for (const chapter of chapters) {
        if (!chapter.content || chapter.content.length === 0) {
          emptyChapters++;
        }
      }

      if (emptyChapters > 0) {
        if (emptyChapters === chapters.length) {
          errors.push('所有章節都沒有內容');
        } else {
          warnings.push(`有 ${emptyChapters} 個章節沒有內容`);
        }
      }

      // 檢查專案信息完整性
      if (!project.name || project.name.trim().length === 0) {
        warnings.push('專案名稱為空，將使用預設名稱');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`驗證時發生錯誤：${error instanceof Error ? error.message : '未知錯誤'}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * 獲取預設的 EPUB CSS 樣式
   * @returns CSS 字符串
   */
  private static getDefaultCSS(): string {
    return `
      /* 創世紀元 EPUB 預設樣式 */
      
      body {
        font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", serif;
        line-height: 1.8;
        margin: 1em;
        color: #333;
        background: #fff;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #2c5aa0;
        font-weight: 600;
        margin: 1.5em 0 1em 0;
        line-height: 1.4;
      }
      
      h1 {
        font-size: 1.8em;
        text-align: center;
        border-bottom: 2px solid #D4AF37;
        padding-bottom: 0.5em;
        margin-bottom: 1.5em;
      }
      
      h2 {
        font-size: 1.5em;
        border-left: 4px solid #D4AF37;
        padding-left: 1em;
      }
      
      h3 {
        font-size: 1.3em;
      }
      
      p {
        margin: 0 0 1.2em 0;
        text-align: justify;
        text-indent: 2em;
      }
      
      blockquote {
        margin: 1em 2em;
        padding: 0.5em 1em;
        border-left: 3px solid #D4AF37;
        background-color: #f9f9f9;
        font-style: italic;
      }
      
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
      }
      
      li {
        margin: 0.5em 0;
      }
      
      .chapter-title {
        text-align: center;
        font-size: 1.8em;
        font-weight: bold;
        color: #D4AF37;
        margin: 2em 0 1.5em 0;
        page-break-before: always;
      }
      
      .chapter-break {
        page-break-before: always;
      }
      
      .text-center {
        text-align: center;
      }
      
      .generated-by {
        text-align: center;
        font-size: 0.9em;
        color: #666;
        margin-top: 2em;
        font-style: italic;
      }
    `;
  }

  /**
   * 生成 EPUB 封面 HTML
   * @param title 書籍標題
   * @param author 作者
   * @param description 描述
   * @returns 封面 HTML
   */
  static generateCoverHTML(title: string, author: string = '創世紀元用戶', description?: string): string {
    return `
      <div class="cover-page" style="
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2em;
      ">
        <div class="cover-title" style="
          font-size: 3em;
          font-weight: bold;
          margin-bottom: 0.5em;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        ">${title}</div>
        
        ${description ? `
        <div class="cover-subtitle" style="
          font-size: 1.2em;
          margin-bottom: 2em;
          opacity: 0.9;
          font-style: italic;
        ">${description}</div>
        ` : ''}
        
        <div class="cover-author" style="
          font-size: 1.5em;
          margin-bottom: 3em;
          border-top: 2px solid rgba(255,255,255,0.5);
          padding-top: 1em;
        ">作者：${author}</div>
        
        <div class="cover-generator" style="
          font-size: 1em;
          opacity: 0.7;
          position: absolute;
          bottom: 2em;
        ">由創世紀元生成</div>
      </div>
    `;
  }
}