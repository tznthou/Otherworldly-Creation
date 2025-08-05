// API 模型定義
import { Descendant } from 'slate';

// 專案相關
export interface Project {
  id: string;
  name: string;
  type: 'isekai' | 'school' | 'scifi' | 'fantasy';
  description: string;
  novelLength: 'short' | 'medium' | 'long';
  createdAt: string;
  updatedAt: string;
  settings: {
    aiModel?: string;
    aiParams?: {
      temperature: number;
      topP: number;
      maxTokens: number;
    };
  };
}

// 章節相關
export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: Descendant[];
  order: number;
  chapterNumber?: number;
  createdAt: string;
  updatedAt: string;
  wordCount?: number;
  metadata?: {
    notes?: string;
    status?: 'draft' | 'in_progress' | 'review' | 'completed';
    [key: string]: unknown;
  };
}

// 角色相關
export interface Relationship {
  id?: string;
  targetId: string;
  type: string;
  description: string;
}

// API 創建關係請求的參數類型
export interface CreateRelationshipRequest {
  fromCharacterId: string;
  toCharacterId: string;
  relationshipType: string;
  description: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  archetype?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  relationships?: Relationship[];
  createdAt: string;
  updatedAt: string;
}

// AI 歷史記錄
export interface AIGenerationHistory {
  id: string;
  projectId: string;
  chapterId: string;
  model: string;
  prompt: string;
  generatedText: string;
  parameters?: AIGenerationParams;
  languagePurity?: number;
  tokenCount?: number;
  generationTimeMs?: number;
  selected: boolean;
  position?: number;
  createdAt: string;
}

// AI 相關
export interface AIGenerationParams {
  temperature: number;
  topP: number;
  maxTokens: number;
  repeatPenalty?: number;
  seed?: number;
}

export interface AIServiceStatus {
  isRunning: boolean;
  version?: string;
  models?: string[];
}

export interface AIModelInfo {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
}

export interface AIModelAvailability {
  isAvailable: boolean;
  name: string;
  size?: number;
  error?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  selectedModel: string;
  host?: string;
  port?: number;
}

// 上下文相關
export interface ContextStats {
  tokenCount: number;
  chapterCount: number;
  characterCount: number;
  wordCount: number;
}

// 設定相關
export interface Settings {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  aiConfig?: {
    defaultModel?: string;
    defaultParams?: AIGenerationParams;
  };
  [key: string]: unknown;
}

// 資料庫相關
export interface DatabaseStats {
  projectCount: number;
  chapterCount: number;
  characterCount: number;
  totalSize: number;
  lastBackup?: string;
}

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'error';
  message?: string;
  details?: Record<string, unknown>;
}

// 系統相關
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface DialogResult {
  filePath?: string;
  filePaths?: string[];
  canceled: boolean;
}

// 更新相關
export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl?: string;
  isAvailable: boolean;
  error?: string;
}

// AI 歷史查詢參數
export interface AIHistoryQueryParams {
  projectId?: string;
  chapterId?: string;
  model?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'tokenCount' | 'generationTimeMs';
  orderDirection?: 'asc' | 'desc';
}

// 字符屬性類型
export interface CharacterAttributes {
  archetype?: string;
  age?: number | null;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
}