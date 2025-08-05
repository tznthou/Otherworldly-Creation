// 輕小說模板系統類型定義

export type TemplateType = 'isekai' | 'school' | 'scifi' | 'fantasy';

export interface WorldSetting {
  era: string;                    // 時代背景
  technology: string;             // 科技水平
  society: string;                // 社會結構
  specialElements: string[];      // 特殊元素
  geography?: string;             // 地理環境
  culture?: string;               // 文化特色
  magic?: MagicSystem;            // 魔法系統（如適用）
  levelSystem?: LevelSystem;      // 等級系統（如適用）
}

export interface MagicSystem {
  type: string;                   // 魔法類型
  rules: string[];                // 魔法規則
  limitations: string[];          // 魔法限制
  schools?: string[];             // 魔法學派
}

export interface LevelSystem {
  type: string;                   // 等級系統類型
  maxLevel?: number;              // 最高等級
  attributes: string[];           // 屬性列表
  skills?: string[];              // 技能列表
}

export interface CharacterArchetypeTemplate {
  name: string;                   // 原型名稱
  description: string;            // 原型描述
  personality: string;            // 預設性格
  appearance?: string;            // 預設外觀
  background?: string;            // 預設背景
  suggestedAge?: {                // 建議年齡範圍
    min: number;
    max: number;
  };
  suggestedGender?: string[];     // 建議性別
  commonTraits: string[];         // 常見特徵
  typicalRoles: string[];         // 典型角色
  tags: string[];                 // 標籤
}

export interface PlotFramework {
  phase: string;                  // 劇情階段
  description: string;            // 階段描述
  keyEvents: string[];            // 關鍵事件
  characterDevelopment?: string;  // 角色發展
  worldBuilding?: string;         // 世界觀建構
}

export interface WritingGuidelines {
  tone: string;                   // 寫作語調
  style: string;                  // 寫作風格
  pacing: string;                 // 節奏控制
  themes: string[];               // 主要主題
  commonTropes: string[];         // 常見套路
  avoidances: string[];           // 應避免的元素
}

export interface AIPromptTemplate {
  context: string;                // 上下文模板
  characterPrompts: string[];     // 角色相關提示
  worldPrompts: string[];         // 世界觀相關提示
  stylePrompts: string[];         // 風格相關提示
  continuationPrompts: string[];  // 續寫相關提示
}

export interface NovelTemplate {
  id: string;                     // 模板 ID
  name: string;                   // 模板名稱
  type: TemplateType;             // 模板類型
  description: string;            // 模板描述
  version: string;                // 模板版本
  createdAt: string;              // 創建時間
  updatedAt: string;              // 更新時間
  
  // 核心設定
  worldSetting: WorldSetting;     // 世界觀設定
  characterArchetypes: CharacterArchetypeTemplate[];  // 角色原型
  plotFramework: PlotFramework[]; // 劇情框架
  writingGuidelines: WritingGuidelines;  // 寫作指導
  aiPromptTemplate: AIPromptTemplate;    // AI 提示模板
  
  // 可選設定
  sampleContent?: {               // 範例內容
    opening: string;              // 開場範例
    dialogue: string[];           // 對話範例
    description: string[];        // 描述範例
  };
  
  // 自定義設定
  customSettings?: Record<string, unknown>;  // 自定義設定
  isCustom?: boolean;             // 是否為自定義模板
  isActive?: boolean;             // 是否啟用
}

// 模板應用結果
export interface TemplateApplicationResult {
  success: boolean;
  message: string;
  appliedSettings: {
    worldSetting: WorldSetting;
    createdCharacters: string[];  // 創建的角色 ID
    projectSettings: Record<string, unknown>;
  };
  errors?: string[];
}

// 模板管理相關
export interface TemplateFilters {
  type?: TemplateType;
  search?: string;
  isCustom?: boolean;
  isActive?: boolean;
}

export interface TemplateSortOptions {
  field: 'name' | 'type' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

// 模板驗證錯誤
export interface TemplateValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// 常量定義
export const TEMPLATE_TYPES: Record<TemplateType, string> = {
  isekai: '異世界轉生',
  school: '校園戀愛',
  scifi: '科幻冒險',
  fantasy: '奇幻冒險'
};

export const DEFAULT_TEMPLATE_VERSION = '1.0.0';

// 模板狀態
export interface TemplateState {
  templates: NovelTemplate[];
  currentTemplate: NovelTemplate | null;
  loading: boolean;
  error: string | null;
  filters: TemplateFilters;
  sortOptions: TemplateSortOptions;
}