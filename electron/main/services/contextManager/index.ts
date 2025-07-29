import { Database } from 'better-sqlite3';
import { ContextManager } from './types';
import { ContextBuilder } from './contextBuilder';
import { ContextCompressor } from './contextCompressor';
import { CharacterAnalyzer } from './characterAnalyzer';
import { QualityAnalyzer } from './qualityAnalyzer';

/**
 * 上下文管理器實作 - 整合所有子模組
 */
export class ContextManagerImpl implements ContextManager {
  private contextBuilder: ContextBuilder;
  private contextCompressor: ContextCompressor;
  private characterAnalyzer: CharacterAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;

  constructor(db: Database) {
    this.contextBuilder = new ContextBuilder(db);
    this.contextCompressor = new ContextCompressor();
    this.characterAnalyzer = new CharacterAnalyzer(db);
    this.qualityAnalyzer = new QualityAnalyzer(db);
  }

  async buildContext(projectId: string, chapterId: string, position: number): Promise<string> {
    return this.contextBuilder.buildContext(projectId, chapterId, position);
  }

  compressContext(context: string, maxTokens: number): string {
    return this.contextCompressor.compressContext(context, maxTokens);
  }

  integrateCharacters(context: string, characters: any[]): string {
    return this.characterAnalyzer.integrateCharacters(context, characters);
  }

  extractRelevantContent(content: string, position: number): string {
    return this.contextBuilder.extractRelevantContent(content, position);
  }

  analyzeContextQuality(context: string) {
    return this.qualityAnalyzer.analyzeContextQuality(context);
  }

  async getRelevantCharacters(projectId: string, content: string) {
    return this.characterAnalyzer.getRelevantCharacters(projectId, content);
  }

  detectNewCharacters(content: string): string[] {
    return this.characterAnalyzer.detectNewCharacters(content);
  }

  async checkConsistency(content: string, projectId: string) {
    return this.qualityAnalyzer.checkConsistency(content, projectId);
  }
}

// 全域實例
let contextManagerInstance: ContextManager | null = null;

/**
 * 設定上下文管理器實例
 */
export function setContextManager(db: Database): void {
  contextManagerInstance = new ContextManagerImpl(db);
}

/**
 * 獲取上下文管理器實例
 */
export function getContextManager(): ContextManager {
  if (!contextManagerInstance) {
    throw new Error('上下文管理器尚未初始化');
  }
  return contextManagerInstance;
}

// 導出型別和類別
export * from './types';
export { ContextManagerImpl as ContextManager };