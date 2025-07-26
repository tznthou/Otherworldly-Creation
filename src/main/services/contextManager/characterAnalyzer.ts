import { Database } from 'better-sqlite3';
import { Character } from './types';

/**
 * 角色分析器 - 負責角色相關的分析和檢測
 */
export class CharacterAnalyzer {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 獲取與內容相關的角色
   */
  async getRelevantCharacters(projectId: string, content: string): Promise<Character[]> {
    try {
      const allCharacters = this.getProjectCharacters(projectId);
      const relevantCharacters: Character[] = [];
      
      // 分析內容中提到的角色
      allCharacters.forEach(character => {
        if (this.isCharacterMentioned(content, character)) {
          relevantCharacters.push(character);
        }
      });
      
      return relevantCharacters;
    } catch (error) {
      console.error('獲取相關角色失敗:', error);
      return [];
    }
  }

  /**
   * 檢測內容中的新角色
   */
  detectNewCharacters(content: string): string[] {
    const newCharacters: string[] = [];
    
    // 使用正則表達式檢測可能的角色名稱
    const namePatterns = [
      /[A-Z][a-z]+/g, // 英文名字
      /[\u4e00-\u9fff]{2,4}(?=說|道|表示|回答|問|笑|哭|喊)/g, // 中文名字（後面跟動作）
      /(?:叫做|名為|是)([^\s，。！？]{2,4})/g // 「叫做」、「名為」後的名字
    ];
    
    namePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // 清理匹配結果
          const cleanName = match.replace(/說|道|表示|回答|問|笑|哭|喊/, '').trim();
          if (cleanName.length >= 2 && !newCharacters.includes(cleanName)) {
            newCharacters.push(cleanName);
          }
        });
      }
    });
    
    return newCharacters;
  }

  /**
   * 整合角色資訊到上下文中
   */
  integrateCharacters(context: string, characters: Character[]): string {
    if (characters.length === 0) {
      return context;
    }
    
    let characterContext = '\n相關角色詳細資訊：\n';
    
    characters.forEach(character => {
      characterContext += `\n${character.name}：\n`;
      characterContext += `  描述：${character.description}\n`;
      
      if (character.personality) {
        characterContext += `  性格：${character.personality}\n`;
      }
      
      if (character.background) {
        characterContext += `  背景：${character.background}\n`;
      }
      
      if (character.appearance) {
        characterContext += `  外貌：${character.appearance}\n`;
      }
      
      if (character.role) {
        characterContext += `  角色：${character.role}\n`;
      }
      
      if (character.relationships && character.relationships.length > 0) {
        characterContext += `  人際關係：\n`;
        character.relationships.forEach(rel => {
          characterContext += `    - ${rel.relationshipType}：${rel.description}\n`;
        });
      }
    });
    
    return context + characterContext;
  }

  /**
   * 檢查角色是否在內容中被提及
   */
  private isCharacterMentioned(content: string, character: Character): boolean {
    const name = character.name;
    
    // 檢查直接提及
    if (content.includes(name)) {
      return true;
    }
    
    // 檢查別名或暱稱
    const aliases = this.extractAliases(character);
    return aliases.some(alias => content.includes(alias));
  }

  /**
   * 提取角色的別名和暱稱
   */
  private extractAliases(character: Character): string[] {
    const aliases: string[] = [];
    
    // 從描述中提取可能的別名
    if (character.description) {
      const aliasMatches = character.description.match(/(?:別名|暱稱|外號)[：:]([^\s，。]{1,6})/g);
      if (aliasMatches) {
        aliasMatches.forEach(match => {
          const alias = match.replace(/(?:別名|暱稱|外號)[：:]/, '').trim();
          if (alias) aliases.push(alias);
        });
      }
    }
    
    return aliases;
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