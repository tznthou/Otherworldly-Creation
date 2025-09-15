/**
 * 電子書排版預備相關類型定義
 * 完全獨立於現有的 EPUB/PDF 輸出系統
 */

export interface EbookImageMetadata {
  id: string;
  filename: string;
  originalFilename: string;
  path: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  prompt?: string;
  characterId?: string;
  chapterId?: string;
}

export interface EbookImageCategory {
  id: string;
  name: string;
  description: string;
  position: EbookImagePosition;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  images: EbookImageMetadata[];
}

export enum EbookImagePosition {
  Cover = 'cover',
  BackCover = 'back_cover',
  ChapterHeader = 'chapter_header',
  ChapterEnd = 'chapter_end',
  InlineText = 'inline_text',
  FullPage = 'full_page',
  CharacterPortrait = 'character_portrait',
  SceneIllustration = 'scene_illustration',
  Map = 'map',
  Diagram = 'diagram'
}

export interface EbookChapterConfiguration {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  images: {
    position: EbookImagePosition;
    imageId: string;
    order: number;
    customSize?: {
      width: number;
      height: number;
    };
    caption?: string;
    altText?: string;
  }[];
}

export interface EbookPreparationConfig {
  projectId: string;
  bookTitle: string;
  bookAuthor: string;

  // 圖片組織配置
  imageCategories: EbookImageCategory[];

  // 章節配置
  chapterConfigurations: EbookChapterConfiguration[];

  // 命名規則配置
  namingRules: {
    template: string;
    includeChapterInfo: boolean;
    includePositionInfo: boolean;
    includeIndex: boolean;
    maxLength: number;
  };

  // 品質配置
  qualitySettings: {
    [key in EbookImagePosition]: {
      maxWidth: number;
      maxHeight: number;
      quality: number; // 1-100
      compression: 'none' | 'light' | 'medium' | 'heavy';
    };
  };

  // 預覽配置
  previewSettings: {
    deviceType: 'tablet' | 'phone' | 'desktop' | 'kindle';
    showGrid: boolean;
    showMargins: boolean;
  };

  // 導出配置
  exportSettings: {
    outputPath: string;
    createSubfolders: boolean;
    preserveOriginals: boolean;
    generateMetadata: boolean;
  };

  // 時間戳
  createdAt: string;
  updatedAt: string;
}

export interface EbookPreparationResult {
  configId: string;
  processedImages: {
    imageId: string;
    originalPath: string;
    processedPath: string;
    category: EbookImagePosition;
    metadata: EbookImageMetadata;
    processingTime: number;
    success: boolean;
    error?: string;
  }[];

  summary: {
    totalImages: number;
    processedSuccessfully: number;
    failed: number;
    totalSizeBefore: number;
    totalSizeAfter: number;
    compressionRatio: number;
    processingTime: number;
  };

  // 供現有 EPUB/PDF 系統使用的數據結構（可選）
  exportData?: {
    coverImage?: EbookImageMetadata;
    chapterImages: Record<string, EbookImageMetadata[]>;
    characterPortraits: EbookImageMetadata[];
    globalImages: EbookImageMetadata[];
  };
}

export interface EbookPreparationState {
  // 當前配置
  currentConfig: EbookPreparationConfig | null;

  // 處理狀態
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;

  // 處理結果
  lastResult: EbookPreparationResult | null;

  // UI 狀態
  activeTab: 'organize' | 'configure' | 'preview';
  selectedImages: string[];

  // 預覽狀態
  previewMode: boolean;
  previewDevice: 'tablet' | 'phone' | 'desktop' | 'kindle';

  // 錯誤狀態
  error: string | null;
  warnings: string[];
}

// 預設配置模板
export const DEFAULT_EBOOK_PREPARATION_CONFIG: Partial<EbookPreparationConfig> = {
  namingRules: {
    template: '{bookTitle}_{position}_{chapter}_{index}',
    includeChapterInfo: true,
    includePositionInfo: true,
    includeIndex: true,
    maxLength: 100
  },

  qualitySettings: {
    [EbookImagePosition.Cover]: {
      maxWidth: 1600,
      maxHeight: 2400,
      quality: 95,
      compression: 'light'
    },
    [EbookImagePosition.BackCover]: {
      maxWidth: 1600,
      maxHeight: 2400,
      quality: 95,
      compression: 'light'
    },
    [EbookImagePosition.ChapterHeader]: {
      maxWidth: 1200,
      maxHeight: 800,
      quality: 90,
      compression: 'light'
    },
    [EbookImagePosition.ChapterEnd]: {
      maxWidth: 800,
      maxHeight: 600,
      quality: 85,
      compression: 'medium'
    },
    [EbookImagePosition.InlineText]: {
      maxWidth: 1000,
      maxHeight: 800,
      quality: 80,
      compression: 'medium'
    },
    [EbookImagePosition.FullPage]: {
      maxWidth: 1600,
      maxHeight: 2400,
      quality: 95,
      compression: 'light'
    },
    [EbookImagePosition.CharacterPortrait]: {
      maxWidth: 800,
      maxHeight: 1000,
      quality: 90,
      compression: 'light'
    },
    [EbookImagePosition.SceneIllustration]: {
      maxWidth: 1400,
      maxHeight: 1000,
      quality: 90,
      compression: 'light'
    },
    [EbookImagePosition.Map]: {
      maxWidth: 1800,
      maxHeight: 1200,
      quality: 95,
      compression: 'light'
    },
    [EbookImagePosition.Diagram]: {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 90,
      compression: 'medium'
    }
  },

  previewSettings: {
    deviceType: 'tablet',
    showGrid: true,
    showMargins: true
  },

  exportSettings: {
    outputPath: '',
    createSubfolders: true,
    preserveOriginals: true,
    generateMetadata: true
  }
};