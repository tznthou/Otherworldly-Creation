/**
 * 上下文管理器相關的型別定義
 */

/**
 * 上下文管理器介面
 */
export interface ContextManager {
  buildContext(projectId: string, chapterId: string, position: number): Promise<string>;
  compressContext(context: string, maxTokens: number): string;
  integrateCharacters(context: string, characters: Character[]): string;
  extractRelevantContent(content: string, position: number): string;
  analyzeContextQuality(context: string): ContextQualityReport;
  getRelevantCharacters(projectId: string, content: string): Promise<Character[]>;
  detectNewCharacters(content: string): string[];
  checkConsistency(content: string, projectId: string): Promise<ConsistencyIssue[]>;
}

/**
 * 上下文品質報告介面
 */
export interface ContextQualityReport {
  totalTokens: number;
  characterInfoQuality: number; // 0-100 分
  worldBuildingQuality: number; // 0-100 分
  narrativeCoherenceQuality: number; // 0-100 分
  overallQuality: number; // 0-100 分
  suggestions: string[];
}

/**
 * 一致性問題介面
 */
export interface ConsistencyIssue {
  type: 'character' | 'setting' | 'plot';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * 專案介面
 */
export interface Project {
  id: string;
  name: string;
  type: 'isekai' | 'school' | 'scifi' | 'fantasy';
  description: string;
  createdAt: Date;
  updatedAt: Date;
  settings: ProjectSettings;
}

/**
 * 專案設定介面
 */
export interface ProjectSettings {
  aiParameters: AIParameters;
  templateSettings: TemplateSettings;
}

/**
 * AI 參數介面
 */
export interface AIParameters {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * 模板設定介面
 */
export interface TemplateSettings {
  selectedTemplate: string;
  customSettings: Record<string, any>;
}

/**
 * 章節介面
 */
export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 角色介面
 */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  personality: string;
  background: string;
  relationships: Relationship[];
  appearance: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 關係介面
 */
export interface Relationship {
  targetCharacterId: string;
  relationshipType: string;
  description: string;
}