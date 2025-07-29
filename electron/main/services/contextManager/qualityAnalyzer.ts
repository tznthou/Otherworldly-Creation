import { ContextQualityReport, ConsistencyIssue, Character } from './types';
import { Database } from 'better-sqlite3';

/**
 * 品質分析器 - 負責分析上下文品質和一致性
 */
export class QualityAnalyzer {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 分析上下文品質
   */
  analyzeContextQuality(context: string): ContextQualityReport {
    const totalTokens = this.estimateTokens(context);
    
    const characterInfoQuality = this.analyzeCharacterInfoQuality(context);
    const worldBuildingQuality = this.analyzeWorldBuildingQuality(context);
    const narrativeCoherenceQuality = this.analyzeNarrativeCoherence(context);
    
    const overallQuality = Math.round(
      (characterInfoQuality + worldBuildingQuality + narrativeCoherenceQuality) / 3
    );
    
    const suggestions = this.generateSuggestions(
      characterInfoQuality,
      worldBuildingQuality,
      narrativeCoherenceQuality
    );
    
    return {
      totalTokens,
      characterInfoQuality,
      worldBuildingQuality,
      narrativeCoherenceQuality,
      overallQuality,
      suggestions
    };
  }

  /**
   * 檢查一致性問題
   */
  async checkConsistency(content: string, projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // 檢查角色一致性
      const characterIssues = await this.checkCharacterConsistency(content, projectId);
      issues.push(...characterIssues);
      
      // 檢查設定一致性
      const settingIssues = this.checkSettingConsistency(content, projectId);
      issues.push(...settingIssues);
      
      // 檢查劇情一致性
      const plotIssues = this.checkPlotConsistency(content);
      issues.push(...plotIssues);
      
    } catch (error) {
      console.error('一致性檢查失敗:', error);
    }
    
    return issues;
  }

  /**
   * 估算 token 數量
   */
  private estimateTokens(context: string): number {
    return Math.ceil(context.length / 4);
  }

  /**
   * 分析角色資訊品質
   */
  private analyzeCharacterInfoQuality(context: string): number {
    let score = 0;
    
    // 檢查是否包含角色資訊
    if (context.includes('主要角色：')) {
      score += 30;
    }
    
    // 檢查角色描述的詳細程度
    const characterSections = context.match(/- [^：]+：[^\n]+/g);
    if (characterSections) {
      score += Math.min(40, characterSections.length * 10);
    }
    
    // 檢查是否包含角色關係
    if (context.includes('關係：')) {
      score += 20;
    }
    
    // 檢查是否包含性格描述
    if (context.includes('性格：')) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * 分析世界觀品質
   */
  private analyzeWorldBuildingQuality(context: string): number {
    let score = 0;
    
    // 檢查是否包含世界觀描述
    if (context.includes('世界觀：')) {
      score += 40;
    }
    
    // 檢查專案類型說明
    if (context.includes('類型：')) {
      score += 20;
    }
    
    // 檢查是否有具體的世界設定
    const worldElements = ['魔法', '科技', '學校', '異世界', '未來', '現代'];
    const foundElements = worldElements.filter(element => context.includes(element));
    score += foundElements.length * 10;
    
    return Math.min(100, score);
  }

  /**
   * 分析敘事連貫性
   */
  private analyzeNarrativeCoherence(context: string): number {
    let score = 50; // 基礎分數
    
    // 檢查是否有明確的章節資訊
    if (context.includes('當前章節：')) {
      score += 20;
    }
    
    // 檢查是否有相關內容
    if (context.includes('相關內容：')) {
      score += 20;
    }
    
    // 檢查內容長度是否適中
    const contentMatch = context.match(/相關內容：([\s\S]*)/);
    if (contentMatch) {
      const contentLength = contentMatch[1].length;
      if (contentLength > 100 && contentLength < 2000) {
        score += 10;
      }
    }
    
    return Math.min(100, score);
  }

  /**
   * 生成改善建議
   */
  private generateSuggestions(
    characterQuality: number,
    worldQuality: number,
    narrativeQuality: number
  ): string[] {
    const suggestions: string[] = [];
    
    if (characterQuality < 70) {
      suggestions.push('建議添加更詳細的角色描述和背景資訊');
      suggestions.push('考慮加入角色之間的關係說明');
    }
    
    if (worldQuality < 70) {
      suggestions.push('建議補充更豐富的世界觀設定');
      suggestions.push('添加更多關於故事背景的具體細節');
    }
    
    if (narrativeQuality < 70) {
      suggestions.push('建議提供更多相關的故事內容作為上下文');
      suggestions.push('確保章節資訊清晰完整');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('上下文品質良好，可以繼續創作');
    }
    
    return suggestions;
  }

  /**
   * 檢查角色一致性
   */
  private async checkCharacterConsistency(content: string, projectId: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      const characters = this.getProjectCharacters(projectId);
      
      characters.forEach(character => {
        if (content.includes(character.name)) {
          // 檢查角色描述是否一致
          if (this.hasInconsistentCharacterDescription(content, character)) {
            issues.push({
              type: 'character',
              description: `角色 ${character.name} 的描述可能與設定不一致`,
              severity: 'medium',
              suggestion: `檢查 ${character.name} 的性格和行為是否符合角色設定`
            });
          }
        }
      });
      
    } catch (error) {
      console.error('角色一致性檢查失敗:', error);
    }
    
    return issues;
  }

  /**
   * 檢查設定一致性
   */
  private checkSettingConsistency(content: string, projectId: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // 這裡可以添加更多設定一致性檢查
    // 例如：時間線一致性、地點一致性等
    
    return issues;
  }

  /**
   * 檢查劇情一致性
   */
  private checkPlotConsistency(content: string): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    // 檢查是否有明顯的邏輯錯誤
    if (this.hasLogicalInconsistencies(content)) {
      issues.push({
        type: 'plot',
        description: '內容中可能存在邏輯不一致的地方',
        severity: 'low',
        suggestion: '檢查故事情節的邏輯性和連貫性'
      });
    }
    
    return issues;
  }

  /**
   * 檢查角色描述是否不一致
   */
  private hasInconsistentCharacterDescription(content: string, character: Character): boolean {
    // 簡單的一致性檢查
    // 實際應用中可以使用更複雜的 NLP 分析
    
    if (character.personality && content.includes(character.name)) {
      const personalityWords = character.personality.split(/[，、]/);
      const contradictoryWords = ['冷漠', '熱情', '內向', '外向'];
      
      // 檢查是否有矛盾的性格描述
      // 這只是簡單示例，實際實作會更複雜
    }
    
    return false; // 簡化實作
  }

  /**
   * 檢查邏輯不一致
   */
  private hasLogicalInconsistencies(content: string): boolean {
    // 簡單的邏輯一致性檢查
    // 實際應用中需要更複雜的分析
    
    const timeWords = ['早上', '中午', '晚上', '深夜'];
    const placeWords = ['學校', '家裡', '街道', '商店'];
    
    // 檢查時間和地點的邏輯性
    // 這只是示例，實際實作會更詳細
    
    return false; // 簡化實作
  }

  /**
   * 從資料庫獲取專案角色
   */
  private getProjectCharacters(projectId: string): Character[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM characters WHERE project_id = ?');
      const rows = stmt.all(projectId) as any[];
      
      return rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        personality: row.personality,
        background: row.background,
        relationships: row.relationships ? JSON.parse(row.relationships) : [],
        appearance: row.appearance,
        role: row.role,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('獲取角色列表失敗:', error);
      return [];
    }
  }
}