// 圖片命名系統服務
// 提供智能、可配置的圖片命名和重命名功能

import { 
  ImageMetadata, 
  ImageNamingConfig, 
  RenamePreviewResult, 
  BatchRenameOperation,
  ImageCategory,
  EbookImagePlacement 
} from '../types/imageMetadata';
import { api } from '../api';

export class ImageNamingService {
  private static instance: ImageNamingService;

  public static getInstance(): ImageNamingService {
    if (!ImageNamingService.instance) {
      ImageNamingService.instance = new ImageNamingService();
    }
    return ImageNamingService.instance;
  }

  /**
   * 預設命名模板
   */
  public readonly defaultTemplates = {
    // 基本模板
    basic: '{project}_{category}_{order}',
    // 章節詳細模板
    chapterDetailed: '{project}_Ch{chapterNum}_{category}_{characterName}_{order}',
    // 時間戳模板
    timestamped: '{project}_{category}_{timestamp}',
    // 電子書優化模板
    ebook: '{project}_Ch{chapterNum:02d}_{placement}_{order:03d}',
    // 角色專用模板
    character: '{project}_{characterName}_{category}_{expression}_{order}',
    // 場景專用模板
    scene: '{project}_Ch{chapterNum}_Scene{sceneNum}_{timeOfDay}_{order}'
  };

  /**
   * 根據配置生成圖片名稱
   */
  public async generateName(
    metadata: ImageMetadata, 
    config: ImageNamingConfig,
    context?: {
      projectName?: string;
      chapterNumber?: number;
      chapterTitle?: string;
      characterName?: string;
      sceneNumber?: number;
    }
  ): Promise<string> {
    try {
      // 獲取上下文資訊
      const fullContext = await this.buildNamingContext(metadata, context);
      
      // 處理命名模板
      let name = this.processTemplate(config.template, fullContext);
      
      // 添加前綴和後綴
      if (config.customPrefix) {
        name = `${config.customPrefix}_${name}`;
      }
      if (config.customSuffix) {
        name = `${name}_${config.customSuffix}`;
      }
      
      // 添加時間戳
      if (config.includeTimestamp) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        name = `${name}_${timestamp}`;
      }
      
      // 清理特殊字元
      if (config.sanitizeSpecialChars) {
        name = this.sanitizeFilename(name);
      }
      
      // 限制長度
      name = this.truncateName(name, config.maxLength);
      
      // 添加副檔名
      name = `${name}.${metadata.fileExtension}`;
      
      return name;
    } catch (error) {
      console.error('圖片命名生成失敗:', error);
      // 回退到基本命名
      return this.generateFallbackName(metadata);
    }
  }

  /**
   * 構建命名上下文
   */
  private async buildNamingContext(
    metadata: ImageMetadata,
    providedContext?: any
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      // 基本資訊
      imageId: metadata.id,
      category: metadata.ebookInfo.category,
      placement: metadata.ebookInfo.placement,
      order: metadata.ebookInfo.order || 1,
      
      // 檔案資訊
      originalFilename: metadata.originalFilename.replace(/\.[^/.]+$/, ''), // 移除副檔名
      extension: metadata.fileExtension,
      
      // 視覺屬性
      width: metadata.visual.width,
      height: metadata.visual.height,
      aspectRatio: metadata.visual.aspectRatio.replace(':', 'x'),
      
      // AI 生成資訊
      model: metadata.aiGeneration?.model || 'unknown',
      provider: metadata.aiGeneration?.provider || 'unknown',
      seed: metadata.aiGeneration?.seed || 0,
      
      // 時間資訊
      timestamp: new Date(metadata.createdAt).toISOString().slice(0, 10).replace(/-/g, ''),
      year: new Date(metadata.createdAt).getFullYear(),
      month: String(new Date(metadata.createdAt).getMonth() + 1).padStart(2, '0'),
      day: String(new Date(metadata.createdAt).getDate()).padStart(2, '0'),
      
      // 版本資訊
      version: metadata.version.versionNumber.replace('.', 'v'),
      versionMajor: metadata.version.versionNumber.split('.')[0],
      versionMinor: metadata.version.versionNumber.split('.')[1] || '0',
    };

    // 獲取專案資訊
    if (metadata.projectId) {
      try {
        const project = await api.projects.getById(metadata.projectId);
        context.project = this.sanitizeForFilename((project as any).title || project.name || 'project');
        context.projectId = project.id;
      } catch (_error) {
        context.project = 'unknown_project';
      }
    }

    // 獲取章節資訊
    if (metadata.chapterId) {
      try {
        const chapter = await api.chapters.getById(metadata.chapterId);
        context.chapterTitle = this.sanitizeForFilename(chapter.title);
        context.chapterNum = this.extractChapterNumber(chapter.title);
        context.chapterOrder = chapter.order || 1;
      } catch (_error) {
        context.chapterTitle = 'unknown_chapter';
        context.chapterNum = 1;
      }
    }

    // 獲取角色資訊
    if (metadata.characterId) {
      try {
        const character = await api.characters.getById(metadata.characterId);
        context.characterName = this.sanitizeForFilename(character.name);
        context.characterId = character.id;
      } catch (_error) {
        context.characterName = 'unknown_character';
      }
    }

    // 處理標籤和主題
    context.primaryTag = metadata.tags[0] || 'untagged';
    context.primaryTheme = metadata.themes[0] || 'general';
    context.primaryEmotion = metadata.emotions[0] || 'neutral';

    // 合併提供的上下文
    return { ...context, ...providedContext };
  }

  /**
   * 處理命名模板
   */
  private processTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      // 處理格式化選項 (如: {chapterNum:02d})
      const [varName, format] = key.split(':');
      const value = context[varName];
      
      if (value === undefined || value === null) {
        console.warn(`命名模板變數未找到: ${varName}`);
        return varName; // 回退到變數名
      }
      
      // 應用格式化
      if (format) {
        return this.applyFormat(value, format);
      }
      
      return String(value);
    });
  }

  /**
   * 應用格式化選項
   */
  private applyFormat(value: any, format: string): string {
    if (format.includes('d')) {
      // 數字格式化 (如: 02d)
      const width = parseInt(format.match(/(\d+)d/)?.[1] || '0');
      return String(value).padStart(width, '0');
    }
    
    if (format === 'lower') {
      return String(value).toLowerCase();
    }
    
    if (format === 'upper') {
      return String(value).toUpperCase();
    }
    
    if (format === 'title') {
      return String(value).replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }
    
    if (format.startsWith('max')) {
      // 最大長度限制 (如: max20)
      const maxLength = parseInt(format.replace('max', ''));
      return String(value).slice(0, maxLength);
    }
    
    return String(value);
  }

  /**
   * 批次重命名預覽
   */
  public async previewBatchRename(
    operation: BatchRenameOperation
  ): Promise<RenamePreviewResult[]> {
    const results: RenamePreviewResult[] = [];
    const usedNames = new Set<string>();

    for (const imageId of operation.imageIds) {
      try {
        // 這裡需要實際的 API 來獲取圖片元數據
        // const metadata = await api.imageMetadata.getById(imageId);
        
        // 臨時模擬數據
        const metadata: Partial<ImageMetadata> = {
          id: imageId,
          originalFilename: `image_${imageId}`,
          fileExtension: 'png',
          ebookInfo: {
            category: ImageCategory.Character,
            placement: EbookImagePlacement.Inline,
            displayName: `Image ${imageId}`,
            description: '',
            altText: '',
            order: 1
          }
        };

        const newName = await this.generateName(
          metadata as ImageMetadata, 
          operation.namingRule
        );
        
        const conflicts = usedNames.has(newName);
        usedNames.add(newName);
        
        const warnings: string[] = [];
        if (conflicts) {
          warnings.push('檔名衝突：此名稱已被使用');
        }
        if (newName.length > operation.namingRule.maxLength) {
          warnings.push('檔名過長，已自動截斷');
        }

        results.push({
          originalName: metadata.originalFilename || `image_${imageId}`,
          newName,
          conflicts,
          warnings
        });
      } catch (error) {
        console.error(`預覽重命名失敗 (${imageId}):`, error);
        results.push({
          originalName: `image_${imageId}`,
          newName: `error_${imageId}`,
          conflicts: false,
          warnings: ['重命名預覽失敗']
        });
      }
    }

    return results;
  }

  /**
   * 驗證檔名
   */
  public validateFilename(filename: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 檢查空檔名
    if (!filename || filename.trim() === '') {
      errors.push('檔名不能為空');
    }
    
    // 檢查長度
    if (filename.length > 255) {
      errors.push('檔名過長（最多255字元）');
    }
    
    // 檢查非法字元
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(filename)) {
      errors.push('檔名包含非法字元: < > : " / \\ | ? *');
    }
    
    // 檢查保留名稱
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    if (reservedNames.includes(nameWithoutExt.toUpperCase())) {
      errors.push('檔名使用了系統保留名稱');
    }
    
    // 檢查開頭和結尾的點或空格
    if (filename.startsWith('.') || filename.endsWith('.') || 
        filename.startsWith(' ') || filename.endsWith(' ')) {
      errors.push('檔名不能以點或空格開頭或結尾');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 清理檔名中的特殊字元
   */
  public sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')  // 替換非法字元
      .replace(/\s+/g, '_')          // 替換空格
      .replace(/_{2,}/g, '_')        // 合併連續底線
      .replace(/^_|_$/g, '')         // 移除開頭結尾底線
      .trim();
  }

  /**
   * 為檔名清理字串
   */
  private sanitizeForFilename(text: string): string {
    return text
      .replace(/[^\w\s-]/g, '')      // 只保留字母數字空格連字號
      .replace(/\s+/g, '_')          // 空格轉底線
      .toLowerCase();
  }

  /**
   * 截斷檔名到指定長度
   */
  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }
    
    // 保留重要部分，從中間截取
    const start = Math.floor(maxLength * 0.6);
    const end = maxLength - start - 3; // 為省略符保留3個字元
    
    return name.slice(0, start) + '...' + name.slice(-end);
  }

  /**
   * 從章節標題提取章節號
   */
  private extractChapterNumber(title: string): number {
    const match = title.match(/(?:第|Chapter|Ch\.?\s*)(\d+)/i);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * 生成回退檔名
   */
  private generateFallbackName(metadata: ImageMetadata): string {
    const timestamp = new Date(metadata.createdAt).toISOString().slice(0, 10);
    return `image_${metadata.id}_${timestamp}.${metadata.fileExtension}`;
  }

  /**
   * 取得可用的模板變數列表
   */
  public getAvailableVariables(): Array<{
    name: string;
    description: string;
    example: string;
    category: string;
  }> {
    return [
      // 基本資訊
      { name: 'project', description: '專案名稱', example: 'MyNovel', category: 'basic' },
      { name: 'category', description: '圖片類別', example: 'character', category: 'basic' },
      { name: 'placement', description: '電子書位置', example: 'inline', category: 'basic' },
      { name: 'order', description: '順序號', example: '001', category: 'basic' },
      
      // 章節資訊
      { name: 'chapterNum', description: '章節號', example: '5', category: 'chapter' },
      { name: 'chapterTitle', description: '章節標題', example: 'first_encounter', category: 'chapter' },
      { name: 'chapterOrder', description: '章節順序', example: '3', category: 'chapter' },
      
      // 角色資訊
      { name: 'characterName', description: '角色名稱', example: 'alice', category: 'character' },
      { name: 'characterId', description: '角色ID', example: 'char_001', category: 'character' },
      
      // 時間資訊
      { name: 'timestamp', description: '時間戳', example: '20241224', category: 'time' },
      { name: 'year', description: '年份', example: '2024', category: 'time' },
      { name: 'month', description: '月份', example: '12', category: 'time' },
      { name: 'day', description: '日期', example: '24', category: 'time' },
      
      // 視覺屬性
      { name: 'width', description: '寬度', example: '1024', category: 'visual' },
      { name: 'height', description: '高度', example: '768', category: 'visual' },
      { name: 'aspectRatio', description: '比例', example: '16x9', category: 'visual' },
      
      // AI 資訊
      { name: 'model', description: 'AI模型', example: 'flux', category: 'ai' },
      { name: 'provider', description: '提供商', example: 'pollinations', category: 'ai' },
      { name: 'seed', description: '種子值', example: '12345', category: 'ai' },
      
      // 標籤
      { name: 'primaryTag', description: '主要標籤', example: 'portrait', category: 'tags' },
      { name: 'primaryTheme', description: '主要主題', example: 'fantasy', category: 'tags' },
      { name: 'primaryEmotion', description: '主要情感', example: 'happy', category: 'tags' },
      
      // 版本
      { name: 'version', description: '版本', example: '1v2', category: 'version' },
      { name: 'versionMajor', description: '主版本', example: '1', category: 'version' },
      { name: 'versionMinor', description: '次版本', example: '2', category: 'version' }
    ];
  }

  /**
   * 生成智能命名建議
   */
  public async generateNamingSuggestions(
    metadata: ImageMetadata
  ): Promise<Array<{
    template: string;
    description: string;
    preview: string;
    suitableFor: string[];
  }>> {
    const suggestions = [];
    const _context = await this.buildNamingContext(metadata);

    // 根據圖片類型和用途提供不同建議
    const category = metadata.ebookInfo.category;
    const placement = metadata.ebookInfo.placement;

    if (category === ImageCategory.Character) {
      suggestions.push({
        template: this.defaultTemplates.character,
        description: '角色專用命名（包含角色名稱和表情）',
        preview: await this.generateName(metadata, { 
          template: this.defaultTemplates.character,
          maxLength: 100,
          sanitizeSpecialChars: true,
          includeTimestamp: false,
          includeChapterInfo: true,
          includeCharacterInfo: true
        }),
        suitableFor: ['角色肖像', '角色插圖', '角色設定圖']
      });
    }

    if (placement === EbookImagePlacement.Inline) {
      suggestions.push({
        template: this.defaultTemplates.ebook,
        description: '電子書優化命名（適合內嵌圖片）',
        preview: await this.generateName(metadata, { 
          template: this.defaultTemplates.ebook,
          maxLength: 100,
          sanitizeSpecialChars: true,
          includeTimestamp: false,
          includeChapterInfo: true,
          includeCharacterInfo: false
        }),
        suitableFor: ['內文插圖', '場景圖', '情節圖']
      });
    }

    // 通用建議
    suggestions.push({
      template: this.defaultTemplates.chapterDetailed,
      description: '詳細章節命名（包含完整上下文）',
      preview: await this.generateName(metadata, { 
        template: this.defaultTemplates.chapterDetailed,
        maxLength: 150,
        sanitizeSpecialChars: true,
        includeTimestamp: false,
        includeChapterInfo: true,
        includeCharacterInfo: true
      }),
      suitableFor: ['所有類型的圖片']
    });

    return suggestions;
  }
}

// 導出單例
export const imageNamingService = ImageNamingService.getInstance();