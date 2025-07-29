import { Database } from 'better-sqlite3';
import { ContextManager, Project, Chapter, Character } from './types';

/**
 * 上下文構建器 - 負責組裝完整的上下文
 */
export class ContextBuilder {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 構建上下文
   */
  async buildContext(projectId: string, chapterId: string, position: number): Promise<string> {
    try {
      // 1. 獲取專案資訊
      const project = this.getProject(projectId);
      if (!project) {
        throw new Error(`找不到專案: ${projectId}`);
      }

      // 2. 獲取當前章節
      const chapter = this.getChapter(chapterId);
      if (!chapter) {
        throw new Error(`找不到章節: ${chapterId}`);
      }

      // 3. 獲取相關角色
      const characters = this.getProjectCharacters(projectId);

      // 4. 組裝上下文
      let context = this.buildProjectContext(project);
      context += this.buildCharactersContext(characters);
      context += this.buildChapterContext(chapter, position);

      return context;
    } catch (error) {
      console.error('構建上下文失敗:', error);
      throw error;
    }
  }

  /**
   * 從上下文中提取相關內容
   */
  extractRelevantContent(content: string, position: number): string {
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    // 計算上下文範圍
    const contextLines = Math.min(50, Math.floor(totalLines * 0.3));
    const startLine = Math.max(0, position - contextLines);
    const endLine = Math.min(totalLines, position + contextLines);
    
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * 構建專案上下文
   */
  private buildProjectContext(project: Project): string {
    let context = `專案：${project.name}\n`;
    context += `類型：${this.getProjectTypeName(project.type)}\n`;
    context += `描述：${project.description}\n\n`;
    
    // 添加世界觀設定
    if (project.settings?.templateSettings?.selectedTemplate) {
      context += this.buildWorldContext(project);
    }
    
    return context;
  }

  /**
   * 構建角色上下文
   */
  private buildCharactersContext(characters: Character[]): string {
    if (characters.length === 0) return '';
    
    let context = '主要角色：\n';
    
    characters.forEach(character => {
      context += `- ${character.name}：${character.description}\n`;
      if (character.personality) {
        context += `  性格：${character.personality}\n`;
      }
      if (character.background) {
        context += `  背景：${character.background}\n`;
      }
      if (character.relationships && character.relationships.length > 0) {
        context += `  關係：${character.relationships.map(r => r.description).join('、')}\n`;
      }
    });
    
    return context + '\n';
  }

  /**
   * 構建章節上下文
   */
  private buildChapterContext(chapter: Chapter, position: number): string {
    let context = `當前章節：${chapter.title}\n`;
    
    // 添加相關內容
    const relevantContent = this.extractRelevantContent(chapter.content, position);
    if (relevantContent) {
      context += `相關內容：\n${relevantContent}\n\n`;
    }
    
    return context;
  }

  /**
   * 構建世界觀上下文
   */
  private buildWorldContext(project: Project): string {
    const type = project.type;
    let worldContext = '世界觀：\n';
    
    switch (type) {
      case 'isekai':
        worldContext += '- 異世界設定，主角從現代世界穿越而來\n';
        worldContext += '- 可能包含魔法、劍與魔法的世界觀\n';
        break;
      case 'school':
        worldContext += '- 校園背景，以學校生活為主\n';
        worldContext += '- 青春、友情、戀愛元素\n';
        break;
      case 'scifi':
        worldContext += '- 科幻背景，包含未來科技元素\n';
        worldContext += '- 可能涉及太空、人工智慧、時間旅行等\n';
        break;
      case 'fantasy':
        worldContext += '- 奇幻世界，包含魔法和神秘生物\n';
        worldContext += '- 劍與魔法的經典設定\n';
        break;
    }
    
    return worldContext + '\n';
  }

  /**
   * 獲取專案類型名稱
   */
  private getProjectTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      'isekai': '異世界',
      'school': '校園',
      'scifi': '科幻',
      'fantasy': '奇幻'
    };
    return typeNames[type] || type;
  }

  /**
   * 從資料庫獲取專案
   */
  private getProject(projectId: string): Project | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      const row = stmt.get(projectId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        settings: row.settings ? JSON.parse(row.settings) : {}
      };
    } catch (error) {
      console.error('獲取專案失敗:', error);
      return null;
    }
  }

  /**
   * 從資料庫獲取章節
   */
  private getChapter(chapterId: string): Chapter | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM chapters WHERE id = ?');
      const row = stmt.get(chapterId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        projectId: row.project_id,
        title: row.title,
        content: row.content,
        order: row.order_num,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('獲取章節失敗:', error);
      return null;
    }
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