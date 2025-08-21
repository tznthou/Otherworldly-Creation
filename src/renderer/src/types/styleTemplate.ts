/**
 * 風格模板系統類型定義
 */

// 風格類別
export type StyleCategory = 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art' | 'custom';

// 預設風格模板介面
export interface StyleTemplate {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  preview?: string; // 預覽圖像 URL
  isBuiltIn: boolean; // 是否為內建模板
  createdAt: string;
  updatedAt: string;
  
  // 風格參數
  parameters: {
    // Pollinations 相關設定
    pollinationsStyle?: 'anime' | 'realistic' | 'fantasy' | 'watercolor' | 'digital_art';
    pollinationsModel?: 'flux' | 'gptimage' | 'kontext' | 'sdxl';
    
    // 通用圖像設定
    width?: number;
    height?: number;
    aspectRatio?: 'square' | 'portrait' | 'landscape' | '16:9' | '9:16' | '4:3' | '3:4';
    quality?: number; // 1-100
    
    // 風格關鍵字
    positivePrompts: string[]; // 正面提示詞
    negativePrompts: string[]; // 負面提示詞
    
    // 進階設定
    colorPalette?: string[]; // 顏色調色盤 (hex colors)
    mood?: string; // 情緒描述
    lighting?: string; // 光照風格
    composition?: string; // 構圖風格
  };
  
  // 使用統計
  usage: {
    count: number; // 使用次數
    lastUsed?: string; // 最後使用時間
    rating?: number; // 用戶評分 (1-5)
  };
  
  // 標籤和分類
  tags: string[];
  
  // 兼容性
  supportedProviders: ('pollinations' | 'imagen')[];
}

// 風格模板類別資訊
export interface StyleTemplateCategory {
  id: StyleCategory;
  name: string;
  description: string;
  icon: string;
  templates: StyleTemplate[];
}

// 模板搜索過濾器
export interface StyleTemplateFilter {
  category?: StyleCategory;
  provider?: 'pollinations' | 'imagen';
  isBuiltIn?: boolean;
  tags?: string[];
  searchTerm?: string;
}

// 模板排序選項
export type StyleTemplateSortBy = 'name' | 'category' | 'usage' | 'rating' | 'created' | 'updated';

// 模板建立/更新請求
export interface CreateStyleTemplateRequest {
  name: string;
  category: StyleCategory;
  description: string;
  parameters: StyleTemplate['parameters'];
  tags: string[];
  supportedProviders: ('pollinations' | 'imagen')[];
}

export interface UpdateStyleTemplateRequest extends Partial<CreateStyleTemplateRequest> {
  id: string;
}

// 模板匯入/匯出
export interface ExportedStyleTemplate extends Omit<StyleTemplate, 'id' | 'usage' | 'createdAt' | 'updatedAt'> {
  exportVersion: string;
  exportedAt: string;
}

export interface ImportStyleTemplateResult {
  success: boolean;
  template?: StyleTemplate;
  errors?: string[];
  warnings?: string[];
}

// 內建模板定義
export const BUILT_IN_TEMPLATES: Omit<StyleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usage'>[] = [
  {
    name: '動漫風格',
    category: 'anime',
    description: '經典動漫插畫風格，適合角色立繪',
    isBuiltIn: true,
    parameters: {
      pollinationsStyle: 'anime',
      pollinationsModel: 'flux',
      aspectRatio: 'portrait',
      positivePrompts: ['anime', 'detailed', 'high quality', 'masterpiece'],
      negativePrompts: ['blurry', 'low quality', 'distorted'],
      mood: 'vibrant',
      lighting: 'soft natural light',
      composition: 'centered portrait'
    },
    tags: ['anime', 'character', 'portrait'],
    supportedProviders: ['pollinations']
  },
  {
    name: '寫實人像',
    category: 'realistic',
    description: '真實感人像風格，適合現實題材',
    isBuiltIn: true,
    parameters: {
      pollinationsStyle: 'realistic',
      pollinationsModel: 'sdxl',
      aspectRatio: 'portrait',
      positivePrompts: ['photorealistic', 'detailed', 'sharp focus'],
      negativePrompts: ['cartoon', 'anime', 'artistic'],
      mood: 'natural',
      lighting: 'professional lighting',
      composition: 'portrait photography'
    },
    tags: ['realistic', 'portrait', 'human'],
    supportedProviders: ['pollinations', 'imagen']
  },
  {
    name: '奇幻風格',
    category: 'fantasy',
    description: '魔幻奇幻插畫風格，適合魔法世界',
    isBuiltIn: true,
    parameters: {
      pollinationsStyle: 'fantasy',
      pollinationsModel: 'flux',
      aspectRatio: 'landscape',
      positivePrompts: ['fantasy art', 'magical', 'epic', 'detailed environment'],
      negativePrompts: ['modern', 'sci-fi', 'realistic'],
      mood: 'mystical',
      lighting: 'magical glow',
      composition: 'epic landscape'
    },
    tags: ['fantasy', 'magical', 'environment'],
    supportedProviders: ['pollinations']
  },
  {
    name: '水彩畫風',
    category: 'watercolor',
    description: '溫馨水彩畫風格，適合溫暖場景',
    isBuiltIn: true,
    parameters: {
      pollinationsStyle: 'watercolor',
      pollinationsModel: 'gptimage',
      aspectRatio: 'square',
      positivePrompts: ['watercolor', 'soft colors', 'gentle brushstrokes'],
      negativePrompts: ['harsh lines', 'digital art', 'photorealistic'],
      mood: 'peaceful',
      lighting: 'soft diffused light',
      composition: 'artistic composition'
    },
    tags: ['watercolor', 'soft', 'artistic'],
    supportedProviders: ['pollinations']
  },
  {
    name: '數位藝術',
    category: 'digital_art',
    description: '現代數位插畫風格，色彩豐富',
    isBuiltIn: true,
    parameters: {
      pollinationsStyle: 'digital_art',
      pollinationsModel: 'flux',
      aspectRatio: 'landscape',
      positivePrompts: ['digital art', 'vibrant colors', 'detailed', 'modern style'],
      negativePrompts: ['traditional art', 'watercolor', 'sketch'],
      mood: 'energetic',
      lighting: 'dramatic lighting',
      composition: 'dynamic composition'
    },
    tags: ['digital', 'modern', 'vibrant'],
    supportedProviders: ['pollinations']
  }
];

// 預設類別定義
export const STYLE_CATEGORIES: StyleTemplateCategory[] = [
  {
    id: 'anime',
    name: '動漫風格',
    description: '日式動漫插畫風格',
    icon: '🎨',
    templates: []
  },
  {
    id: 'realistic',
    name: '寫實風格', 
    description: '真實感照片風格',
    icon: '📸',
    templates: []
  },
  {
    id: 'fantasy',
    name: '奇幻風格',
    description: '魔幻奇幻藝術風格',
    icon: '🧙‍♂️',
    templates: []
  },
  {
    id: 'watercolor',
    name: '水彩風格',
    description: '傳統水彩畫風格',
    icon: '🖌️',
    templates: []
  },
  {
    id: 'digital_art',
    name: '數位藝術',
    description: '現代數位插畫風格',
    icon: '💻',
    templates: []
  },
  {
    id: 'custom',
    name: '自定義',
    description: '用戶創建的風格模板',
    icon: '⚙️',
    templates: []
  }
];