// 圖片元數據管理系統
// 為電子書整合提供完整的圖片描述、命名、和組織功能

/** 圖片元數據核心介面 */
export interface ImageMetadata {
  // 基本識別資訊
  id: string;
  originalFilename: string;
  currentFilename: string;
  fileExtension: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif';
  fileSizeBytes: number;
  
  // 專案關聯
  projectId: string;
  chapterId?: string;
  characterId?: string;
  
  // 電子書整合必要欄位
  ebookInfo: {
    displayName: string;           // 人類友善的顯示名稱
    description: string;           // 詳細描述（支援HTML）
    altText: string;              // 無障礙替代文字
    caption?: string;             // 圖片說明
    placement: EbookImagePlacement; // 電子書中的位置
    category: ImageCategory;       // 圖片類別
    order?: number;               // 在章節中的排序
  };
  
  // AI生成資訊
  aiGeneration?: {
    originalPrompt: string;       // 原始提示詞
    enhancedPrompt?: string;      // 優化後提示詞
    model: string;                // 使用的AI模型
    provider: 'pollinations' | 'imagen' | 'custom';
    seed?: number;                // 種子值
    generationTime: number;       // 生成時間（毫秒）
    qualityScore?: number;        // 品質分數
    consistencyScore?: number;    // 一致性分數
    generatedAt: string;          // 生成時間戳
  };
  
  // 視覺屬性
  visual: {
    width: number;
    height: number;
    aspectRatio: string;          // 例如: "16:9", "4:3", "1:1"
    dominantColors?: string[];    // 主要顏色（十六進位）
    brightness?: number;          // 亮度 (0-1)
    contrast?: number;            // 對比度 (0-1)
  };
  
  // 標籤和分類
  tags: string[];                 // 自訂標籤
  themes: string[];               // 主題標籤（如："戰鬥", "浪漫", "風景"）
  emotions: string[];             // 情感標籤（如："開心", "緊張", "神秘"）
  
  // 版本管理
  version: {
    versionNumber: string;        // 如: "1.0", "2.1"
    isLatest: boolean;
    parentVersionId?: string;
    branchName?: string;
    versionTags?: string[];
  };
  
  // 使用統計
  usage: {
    viewCount: number;
    exportCount: number;
    lastViewed?: string;
    lastExported?: string;
    favoriteCount: number;
    isFavorite: boolean;
  };
  
  // 時間戳
  createdAt: string;
  updatedAt: string;
  lastModifiedBy?: string;
}

/** 電子書中的圖片位置類型 */
export enum EbookImagePlacement {
  ChapterHeader = 'chapter_header',      // 章節標題
  ChapterEnd = 'chapter_end',           // 章節結尾
  Inline = 'inline',                    // 文中插圖
  FullPage = 'full_page',               // 全頁插圖
  Cover = 'cover',                      // 封面
  BackCover = 'back_cover',             // 封底
  CharacterPortrait = 'character_portrait', // 角色肖像
  SceneIllustration = 'scene_illustration', // 場景插圖
  Map = 'map',                          // 地圖
  Diagram = 'diagram'                   // 圖表
}

/** 圖片類別 */
export enum ImageCategory {
  Character = 'character',               // 角色
  Scene = 'scene',                      // 場景
  Background = 'background',            // 背景
  Object = 'object',                    // 物品
  Concept = 'concept',                  // 概念圖
  Cover = 'cover',                      // 封面
  Decoration = 'decoration',            // 裝飾
  Map = 'map',                          // 地圖
  Technical = 'technical'               // 技術圖
}

/** 圖片命名規則配置 */
export interface ImageNamingConfig {
  template: string;                     // 命名模板，如: "{project}_{chapter}_{category}_{order}"
  includeTimestamp: boolean;            // 是否包含時間戳
  includeChapterInfo: boolean;          // 是否包含章節資訊
  includeCharacterInfo: boolean;        // 是否包含角色資訊
  customPrefix?: string;                // 自訂前綴
  customSuffix?: string;                // 自訂後綴
  maxLength: number;                    // 檔名最大長度
  sanitizeSpecialChars: boolean;        // 是否清理特殊字元
}

/** 批次重命名操作 */
export interface BatchRenameOperation {
  imageIds: string[];
  namingRule: ImageNamingConfig;
  previewMode: boolean;                 // 預覽模式，不實際執行
  confirmRequired: boolean;             // 是否需要確認
}

/** 重命名預覽結果 */
export interface RenamePreviewResult {
  originalName: string;
  newName: string;
  conflicts: boolean;                   // 是否有命名衝突
  warnings: string[];                   // 警告訊息
}

/** 電子書導出配置 */
export interface EbookExportConfig {
  includeImages: boolean;
  imageQuality: number;                 // 0-100
  maxImageWidth: number;                // 最大寬度（像素）
  maxImageHeight: number;               // 最大高度（像素）
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  includeImageMetadata: boolean;        // 是否包含元數據
  includeAltText: boolean;             // 是否包含替代文字
  includeDescriptions: boolean;         // 是否包含描述
  imagePlacementRules: {
    [key in EbookImagePlacement]: {
      enabled: boolean;
      maxSize?: number;                 // 該位置的最大圖片大小
      quality?: number;                 // 該位置的圖片品質
    };
  };
}

/** 圖片組織方案 */
export interface ImageOrganizationScheme {
  id: string;
  name: string;
  description: string;
  
  // 分組規則
  groupBy: 'chapter' | 'character' | 'category' | 'theme' | 'custom';
  sortBy: 'name' | 'created_date' | 'order' | 'usage' | 'quality';
  sortOrder: 'asc' | 'desc';
  
  // 篩選規則
  filters: {
    categories?: ImageCategory[];
    placements?: EbookImagePlacement[];
    tags?: string[];
    themes?: string[];
    minQuality?: number;
    dateRange?: {
      from: string;
      to: string;
    };
  };
  
  // 命名規則
  namingConfig: ImageNamingConfig;
  
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

/** 圖片元數據服務介面 */
export interface ImageMetadataService {
  // 基本CRUD操作
  create(metadata: Omit<ImageMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  update(id: string, metadata: Partial<ImageMetadata>): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<ImageMetadata | null>;
  
  // 查詢操作
  getByProjectId(projectId: string): Promise<ImageMetadata[]>;
  getByChapterId(chapterId: string): Promise<ImageMetadata[]>;
  getByCharacterId(characterId: string): Promise<ImageMetadata[]>;
  searchByTags(tags: string[]): Promise<ImageMetadata[]>;
  searchByDescription(query: string): Promise<ImageMetadata[]>;
  
  // 批次操作
  batchUpdate(updates: Array<{ id: string; metadata: Partial<ImageMetadata> }>): Promise<void>;
  batchDelete(ids: string[]): Promise<void>;
  batchRename(operation: BatchRenameOperation): Promise<RenamePreviewResult[]>;
  
  // 組織和管理
  getOrganizationSchemes(): Promise<ImageOrganizationScheme[]>;
  createOrganizationScheme(scheme: Omit<ImageOrganizationScheme, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  applyOrganizationScheme(schemeId: string, imageIds: string[]): Promise<void>;
  
  // 電子書整合
  prepareForEbookExport(projectId: string, config: EbookExportConfig): Promise<{
    images: ImageMetadata[];
    totalSize: number;
    estimatedExportSize: number;
    warnings: string[];
  }>;
  
  // 統計和分析
  getUsageStatistics(projectId: string): Promise<{
    totalImages: number;
    byCategory: Record<ImageCategory, number>;
    byPlacement: Record<EbookImagePlacement, number>;
    averageQuality: number;
    totalSize: number;
    mostUsedTags: Array<{ tag: string; count: number }>;
  }>;
}

/** 圖片命名工具函式 */
export interface ImageNamingUtils {
  generateName(metadata: ImageMetadata, config: ImageNamingConfig): string;
  validateName(name: string): { valid: boolean; errors: string[] };
  sanitizeFilename(filename: string): string;
  extractTemplateVariables(template: string): string[];
  previewBatchRename(imageIds: string[], config: ImageNamingConfig): Promise<RenamePreviewResult[]>;
}

/** 圖片品質分析 */
export interface ImageQualityAnalysis {
  imageId: string;
  overallScore: number;                 // 0-100
  
  technical: {
    resolution: number;                 // 解析度分數
    sharpness: number;                  // 清晰度
    compression: number;                // 壓縮品質
    colorAccuracy: number;              // 色彩準確度
  };
  
  artistic: {
    composition: number;                // 構圖
    lighting: number;                   // 光線
    styleConsistency: number;           // 風格一致性
    detailLevel: number;                // 細節豐富度
  };
  
  suitability: {
    ebookReadiness: number;             // 電子書適用性
    printReadiness: number;             // 印刷適用性
    webOptimization: number;            // 網頁優化
  };
  
  recommendations: string[];            // 改進建議
  analyzedAt: string;
}

/** 電子書圖片整合狀態 */
export interface EbookImageIntegration {
  projectId: string;
  totalImages: number;
  processedImages: number;
  
  byChapter: Array<{
    chapterId: string;
    chapterTitle: string;
    imageCount: number;
    totalSize: number;
    placements: Array<{
      placement: EbookImagePlacement;
      images: Array<{
        imageId: string;
        filename: string;
        description: string;
        order: number;
      }>;
    }>;
  }>;
  
  globalImages: Array<{
    imageId: string;
    category: ImageCategory;
    placement: EbookImagePlacement;
    filename: string;
    description: string;
  }>;
  
  statistics: {
    totalSizeMB: number;
    averageImageSize: number;
    compressionRatio: number;
    estimatedEbookIncrease: number;
  };
  
  lastUpdated: string;
}