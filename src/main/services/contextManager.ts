import { Database } from 'better-sqlite3';

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
interface ContextQualityReport {
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
interface ConsistencyIssue {
  type: 'character' | 'setting' | 'plot';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * 專案介面
 */
interface Project {
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
interface ProjectSettings {
  aiModel: string;
  aiParams: AIParameters;
  templateSettings: TemplateSettings;
}

/**
 * AI 參數介面
 */
interface AIParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

/**
 * 模板設定介面
 */
interface TemplateSettings {
  [key: string]: any;
}

/**
 * 章節介面
 */
interface Chapter {
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
interface Character {
  id: string;
  projectId: string;
  name: string;
  archetype: string;
  age: number;
  gender: string;
  appearance: string;
  personality: string;
  background: string;
  abilities: string[];
  relationships: Relationship[];
}

/**
 * 角色關係介面
 */
interface Relationship {
  targetId: string;
  type: string;
  description: string;
}

/**
 * 上下文管理器實現
 */
export class ContextManagerImpl implements ContextManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 構建上下文
   * @param projectId 專案ID
   * @param chapterId 章節ID
   * @param position 當前位置
   * @returns 組裝好的上下文
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
   * 壓縮上下文以符合模型的最大 token 限制
   * @param context 原始上下文
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的上下文
   */
  compressContext(context: string, maxTokens: number): string {
    // 估算 token 數量（每 4 個字符約 1 個 token）
    const estimatedTokens = context.length / 4;
    
    if (estimatedTokens <= maxTokens) {
      return context;
    }
    
    // 將上下文分成不同部分進行處理
    const sections = this.splitContextIntoSections(context);
    
    // 根據重要性為每個部分分配 token
    const allocatedTokens = this.allocateTokensByImportance(sections, maxTokens);
    
    // 根據分配的 token 壓縮每個部分
    const compressedSections = this.compressSectionsByAllocation(sections, allocatedTokens);
    
    // 重新組合壓縮後的上下文
    return compressedSections.join('\n\n');
  }
  
  /**
   * 將上下文分成不同部分
   * @param context 原始上下文
   * @returns 分段後的上下文
   */
  private splitContextIntoSections(context: string): {
    type: 'project' | 'world' | 'characters' | 'chapter_info' | 'content';
    text: string;
    importance: number; // 1-10，數字越大越重要
  }[] {
    const sections: {
      type: 'project' | 'world' | 'characters' | 'chapter_info' | 'content';
      text: string;
      importance: number;
    }[] = [];
    
    // 使用正則表達式匹配不同部分
    const projectMatch = context.match(/^專案：.*?(?=\n\n|$)/s);
    if (projectMatch) {
      sections.push({
        type: 'project',
        text: projectMatch[0],
        importance: 10 // 專案資訊非常重要
      });
    }
    
    const worldMatch = context.match(/世界觀：.*?(?=\n\n主要角色：|$)/s);
    if (worldMatch) {
      sections.push({
        type: 'world',
        text: worldMatch[0],
        importance: 8 // 世界觀設定很重要
      });
    }
    
    const charactersMatch = context.match(/主要角色：.*?(?=\n\n當前章節：|$)/s);
    if (charactersMatch) {
      sections.push({
        type: 'characters',
        text: charactersMatch[0],
        importance: 9 // 角色資訊非常重要
      });
    }
    
    const chapterInfoMatch = context.match(/當前章節：.*?(?=\n\n)/s);
    if (chapterInfoMatch) {
      sections.push({
        type: 'chapter_info',
        text: chapterInfoMatch[0],
        importance: 7 // 章節資訊很重要
      });
    }
    
    // 剩餘的部分是內容
    const contentMatch = context.match(/(?<=當前章節：.*?\n\n)[\s\S]+$/);
    if (contentMatch) {
      sections.push({
        type: 'content',
        text: contentMatch[0],
        importance: 6 // 內容重要，但可以被壓縮
      });
    }
    
    return sections;
  }
  
  /**
   * 根據重要性為每個部分分配 token
   * @param sections 上下文的不同部分
   * @param maxTokens 最大 token 數
   * @returns 每個部分分配的 token 數
   */
  private allocateTokensByImportance(
    sections: {
      type: 'project' | 'world' | 'characters' | 'chapter_info' | 'content';
      text: string;
      importance: number;
    }[],
    maxTokens: number
  ): Map<string, number> {
    const allocation = new Map<string, number>();
    
    // 計算總重要性分數
    const totalImportance = sections.reduce((sum, section) => sum + section.importance, 0);
    
    // 計算每個部分的原始 token 數和基於重要性的理想分配
    const sectionDetails = sections.map(section => {
      const tokens = section.text.length / 4;
      const idealAllocation = (section.importance / totalImportance) * maxTokens;
      return {
        type: section.type,
        tokens,
        idealAllocation
      };
    });
    
    // 首先分配必要的 token（確保每個部分至少保留一些內容）
    let remainingTokens = maxTokens;
    sectionDetails.forEach(section => {
      // 為每個部分分配至少 10% 的理想分配或其原始大小（取較小值）
      const minAllocation = Math.min(section.tokens, Math.max(20, section.idealAllocation * 0.1));
      allocation.set(section.type, minAllocation);
      remainingTokens -= minAllocation;
    });
    
    // 根據重要性分配剩餘的 token
    if (remainingTokens > 0) {
      // 重新計算剩餘的理想分配
      const remainingImportance = sections.reduce((sum, section) => {
        const allocated = allocation.get(section.type) || 0;
        const originalTokens = section.text.length / 4;
        // 如果已經分配了足夠的 token，則不再考慮其重要性
        return allocated >= originalTokens ? sum : sum + section.importance;
      }, 0);
      
      sections.forEach(section => {
        const allocated = allocation.get(section.type) || 0;
        const originalTokens = section.text.length / 4;
        
        // 如果已經分配了足夠的 token，則不再分配
        if (allocated >= originalTokens) return;
        
        // 根據重要性分配剩餘的 token
        const additionalAllocation = Math.min(
          originalTokens - allocated, // 不超過原始大小
          (section.importance / remainingImportance) * remainingTokens // 根據重要性分配
        );
        
        allocation.set(section.type, allocated + additionalAllocation);
        remainingTokens -= additionalAllocation;
      });
    }
    
    // 如果還有剩餘的 token，優先分配給內容部分
    if (remainingTokens > 0) {
      const contentSection = sections.find(s => s.type === 'content');
      if (contentSection) {
        const currentAllocation = allocation.get('content') || 0;
        const originalTokens = contentSection.text.length / 4;
        const additionalAllocation = Math.min(remainingTokens, originalTokens - currentAllocation);
        allocation.set('content', currentAllocation + additionalAllocation);
      }
    }
    
    return allocation;
  }
  
  /**
   * 根據分配的 token 壓縮每個部分
   * @param sections 上下文的不同部分
   * @param allocation 每個部分分配的 token 數
   * @returns 壓縮後的部分
   */
  private compressSectionsByAllocation(
    sections: {
      type: 'project' | 'world' | 'characters' | 'chapter_info' | 'content';
      text: string;
      importance: number;
    }[],
    allocation: Map<string, number>
  ): string[] {
    return sections.map(section => {
      const allocatedTokens = allocation.get(section.type) || 0;
      const originalTokens = section.text.length / 4;
      
      // 如果分配的 token 足夠，則不需要壓縮
      if (allocatedTokens >= originalTokens) {
        return section.text;
      }
      
      // 根據部分類型使用不同的壓縮策略
      switch (section.type) {
        case 'project':
          return this.compressProjectInfo(section.text, allocatedTokens);
        case 'world':
          return this.compressWorldInfo(section.text, allocatedTokens);
        case 'characters':
          return this.compressCharactersInfo(section.text, allocatedTokens);
        case 'chapter_info':
          return this.compressChapterInfo(section.text, allocatedTokens);
        case 'content':
          return this.compressContent(section.text, allocatedTokens);
        default:
          // 默認壓縮：保留前面的部分
          return this.truncateToTokens(section.text, allocatedTokens);
      }
    });
  }
  
  /**
   * 壓縮專案資訊
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的文本
   */
  private compressProjectInfo(text: string, maxTokens: number): string {
    // 專案資訊通常較短且重要，盡量保留完整
    return this.truncateToTokens(text, maxTokens);
  }
  
  /**
   * 壓縮世界觀資訊
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的文本
   */
  private compressWorldInfo(text: string, maxTokens: number): string {
    // 如果需要壓縮，優先保留世界觀的核心設定
    const lines = text.split('\n');
    
    // 保留第一行（世界觀類型）
    let result = lines[0] + '\n';
    let currentTokens = result.length / 4;
    
    // 添加其他重要設定，直到達到 token 限制
    for (let i = 1; i < lines.length; i++) {
      const lineTokens = lines[i].length / 4;
      if (currentTokens + lineTokens <= maxTokens) {
        result += lines[i] + '\n';
        currentTokens += lineTokens;
      } else {
        break;
      }
    }
    
    return result.trim();
  }
  
  /**
   * 壓縮角色資訊
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的文本
   */
  private compressCharactersInfo(text: string, maxTokens: number): string {
    // 分析角色資訊，優先保留主要角色的核心特徵
    const lines = text.split('\n');
    const header = lines[0]; // "主要角色："
    
    // 提取角色塊
    const characterBlocks: string[][] = [];
    let currentBlock: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('- ') && currentBlock.length > 0) {
        characterBlocks.push([...currentBlock]);
        currentBlock = [line];
      } else if (line.trim() !== '') {
        currentBlock.push(line);
      }
    }
    
    if (currentBlock.length > 0) {
      characterBlocks.push(currentBlock);
    }
    
    // 計算每個角色的重要性（這裡簡單地假設排在前面的角色更重要）
    const characterImportance = characterBlocks.map((block, index) => ({
      block,
      importance: characterBlocks.length - index
    }));
    
    // 按重要性排序
    characterImportance.sort((a, b) => b.importance - a.importance);
    
    // 構建壓縮後的角色資訊
    let result = header + '\n';
    let currentTokens = result.length / 4;
    
    // 為每個角色分配 token
    for (const { block } of characterImportance) {
      // 計算這個角色塊的 token 數
      const blockTokens = block.join('\n').length / 4;
      
      // 如果完整添加這個角色會超出限制，則壓縮這個角色的資訊
      if (currentTokens + blockTokens > maxTokens) {
        // 至少保留角色的名稱和基本資訊
        const nameAndBasic = block[0]; // "- 角色名：年齡，性別，類型"
        
        if (currentTokens + nameAndBasic.length / 4 <= maxTokens) {
          result += nameAndBasic + '\n';
        }
        
        break;
      } else {
        // 完整添加這個角色
        result += block.join('\n') + '\n';
        currentTokens += blockTokens;
      }
    }
    
    return result.trim();
  }
  
  /**
   * 壓縮章節資訊
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的文本
   */
  private compressChapterInfo(text: string, maxTokens: number): string {
    // 章節資訊通常較短且重要，盡量保留完整
    return this.truncateToTokens(text, maxTokens);
  }
  
  /**
   * 壓縮內容
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 壓縮後的文本
   */
  private compressContent(text: string, maxTokens: number): string {
    // 對於內容，我們優先保留最近的部分，因為它對於續寫最為重要
    const textTokens = text.length / 4;
    
    if (textTokens <= maxTokens) {
      return text;
    }
    
    // 保留最近的內容
    return text.substring(text.length - maxTokens * 4);
  }
  
  /**
   * 將文本截斷到指定的 token 數
   * @param text 原始文本
   * @param maxTokens 最大 token 數
   * @returns 截斷後的文本
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const textTokens = text.length / 4;
    
    if (textTokens <= maxTokens) {
      return text;
    }
    
    return text.substring(0, maxTokens * 4);
  }

  /**
   * 整合角色資訊到上下文中
   * @param context 原始上下文
   * @param characters 角色列表
   * @returns 整合後的上下文
   */
  integrateCharacters(context: string, characters: Character[]): string {
    if (!characters || characters.length === 0) {
      return context;
    }

    let characterContext = '\n\n角色資訊：\n';
    
    characters.forEach(char => {
      characterContext += `- ${char.name}：${char.age}歲，${char.gender}，${char.archetype}類型\n`;
      characterContext += `  外貌：${char.appearance}\n`;
      characterContext += `  性格：${char.personality}\n`;
      characterContext += `  背景：${char.background}\n`;
      
      if (char.abilities && char.abilities.length > 0) {
        characterContext += `  能力：${char.abilities.join('、')}\n`;
      }
      
      if (char.relationships && char.relationships.length > 0) {
        characterContext += '  關係：\n';
        char.relationships.forEach(rel => {
          const targetName = this.getCharacterName(rel.targetId);
          characterContext += `    - 與${targetName}：${rel.type}，${rel.description}\n`;
        });
      }
      
      characterContext += '\n';
    });
    
    return context + characterContext;
  }

  /**
   * 從內容中提取與當前位置相關的部分
   * @param content 完整內容
   * @param position 當前位置
   * @returns 相關內容
   */
  extractRelevantContent(content: string, position: number): string {
    if (!content) return '';
    
    // 如果位置為 0 或內容很短，直接返回空字符串
    if (position === 0 || content.length < 100) {
      return '';
    }
    
    // 獲取當前位置前的內容
    const precedingContent = content.substring(0, position);
    
    // 將內容分成段落
    const paragraphs = this.splitIntoParagraphs(precedingContent);
    
    // 如果段落數量很少，直接返回所有內容
    if (paragraphs.length <= 5) {
      return precedingContent;
    }
    
    // 提取最近的段落（最後 3 個段落）
    const recentParagraphs = paragraphs.slice(-3);
    
    // 提取包含關鍵角色或關鍵詞的段落
    const keyTerms = this.extractKeyTerms(precedingContent);
    const relevantParagraphs = paragraphs.filter(paragraph => 
      this.paragraphContainsKeyTerms(paragraph, keyTerms)
    );
    
    // 如果相關段落太多，只保留最相關的幾個
    const maxRelevantParagraphs = 5;
    const topRelevantParagraphs = this.rankParagraphsByRelevance(
      relevantParagraphs, 
      keyTerms
    ).slice(0, maxRelevantParagraphs);
    
    // 合併最近的段落和最相關的段落，去除重複
    const selectedParagraphs = [...recentParagraphs];
    
    topRelevantParagraphs.forEach(paragraph => {
      if (!selectedParagraphs.includes(paragraph)) {
        selectedParagraphs.push(paragraph);
      }
    });
    
    // 按照原始順序排序段落
    selectedParagraphs.sort((a, b) => 
      paragraphs.indexOf(a) - paragraphs.indexOf(b)
    );
    
    // 如果選擇的段落不包括最後一個段落，添加它（確保連續性）
    if (!selectedParagraphs.includes(paragraphs[paragraphs.length - 1])) {
      selectedParagraphs.push(paragraphs[paragraphs.length - 1]);
    }
    
    // 合併選擇的段落
    return selectedParagraphs.join('\n\n');
  }
  
  /**
   * 將文本分成段落
   * @param text 原始文本
   * @returns 段落數組
   */
  private splitIntoParagraphs(text: string): string[] {
    // 按照空行分割文本
    return text.split(/\n\s*\n/).filter(p => p.trim() !== '');
  }
  
  /**
   * 從文本中提取關鍵詞
   * @param text 原始文本
   * @returns 關鍵詞數組
   */
  private extractKeyTerms(text: string): string[] {
    // 提取可能的人名（假設人名是被引號或書名號包圍的文本）
    const namePattern = /[「」『』""'']([^「」『』""'']{1,10})[「」『』""'']/g;
    const names = new Set<string>();
    let match;
    
    while ((match = namePattern.exec(text)) !== null) {
      names.add(match[1]);
    }
    
    // 提取常見的關鍵動詞和名詞（這裡只是示例，實際應用中可能需要更複雜的 NLP）
    const keyVerbs = ['說', '走', '看', '想', '決定', '發現', '戰鬥', '魔法', '攻擊', '防禦'];
    const keyNouns = ['劍', '魔法', '怪物', '城堡', '公主', '王子', '魔王', '勇者', '冒險'];
    
    // 合併關鍵詞
    return [...Array.from(names), ...keyVerbs, ...keyNouns];
  }
  
  /**
   * 檢查段落是否包含關鍵詞
   * @param paragraph 段落
   * @param keyTerms 關鍵詞數組
   * @returns 是否包含關鍵詞
   */
  private paragraphContainsKeyTerms(paragraph: string, keyTerms: string[]): boolean {
    return keyTerms.some(term => paragraph.includes(term));
  }
  
  /**
   * 根據相關性對段落進行排序
   * @param paragraphs 段落數組
   * @param keyTerms 關鍵詞數組
   * @returns 排序後的段落數組
   */
  private rankParagraphsByRelevance(paragraphs: string[], keyTerms: string[]): string[] {
    // 計算每個段落包含的關鍵詞數量
    const paragraphScores = paragraphs.map(paragraph => {
      const termCount = keyTerms.filter(term => paragraph.includes(term)).length;
      return { paragraph, score: termCount };
    });
    
    // 按照分數降序排序
    paragraphScores.sort((a, b) => b.score - a.score);
    
    // 返回排序後的段落
    return paragraphScores.map(item => item.paragraph);
  }

  /**
   * 獲取專案資訊
   * @param projectId 專案ID
   * @returns 專案資訊
   */
  private getProject(projectId: string): Project | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
      const row = stmt.get(projectId);
      
      if (!row) return null;
      
      return {
        id: (row as any).id,
        name: (row as any).name,
        type: (row as any).type as 'isekai' | 'school' | 'scifi' | 'fantasy',
        description: (row as any).description,
        createdAt: new Date((row as any).created_at),
        updatedAt: new Date((row as any).updated_at),
        settings: JSON.parse((row as any).settings || '{}')
      };
    } catch (error) {
      console.error('獲取專案資訊失敗:', error);
      return null;
    }
  }

  /**
   * 獲取章節資訊
   * @param chapterId 章節ID
   * @returns 章節資訊
   */
  private getChapter(chapterId: string): Chapter | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM chapters WHERE id = ?');
      const row = stmt.get(chapterId);
      
      if (!row) return null;
      
      return {
        id: (row as any).id,
        projectId: (row as any).project_id,
        title: (row as any).title,
        content: (row as any).content || '',
        order: (row as any).order_num,
        createdAt: new Date((row as any).created_at),
        updatedAt: new Date((row as any).updated_at)
      };
    } catch (error) {
      console.error('獲取章節資訊失敗:', error);
      return null;
    }
  }

  /**
   * 獲取專案的所有角色
   * @param projectId 專案ID
   * @returns 角色列表
   */
  private getProjectCharacters(projectId: string): Character[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM characters WHERE project_id = ?');
      const rows = stmt.all(projectId);
      
      if (!rows || rows.length === 0) return [];
      
      return rows.map(row => {
        const character: Character = {
          id: (row as any).id,
          projectId: (row as any).project_id,
          name: (row as any).name,
          archetype: (row as any).archetype || '',
          age: (row as any).age || 0,
          gender: (row as any).gender || '',
          appearance: (row as any).appearance || '',
          personality: (row as any).personality || '',
          background: (row as any).background || '',
          abilities: [],
          relationships: []
        };
        
        // 獲取角色能力
        const abilitiesStmt = this.db.prepare('SELECT * FROM character_abilities WHERE character_id = ?');
        const abilitiesRows = abilitiesStmt.all(character.id);
        if (abilitiesRows && abilitiesRows.length > 0) {
          character.abilities = abilitiesRows.map(a => (a as any).name);
        }
        
        // 獲取角色關係
        const relationshipsStmt = this.db.prepare('SELECT * FROM character_relationships WHERE source_id = ?');
        const relationshipsRows = relationshipsStmt.all(character.id);
        if (relationshipsRows && relationshipsRows.length > 0) {
          character.relationships = relationshipsRows.map(r => ({
            targetId: (r as any).target_id,
            type: (r as any).type,
            description: (r as any).description || ''
          }));
        }
        
        return character;
      });
    } catch (error) {
      console.error('獲取專案角色失敗:', error);
      return [];
    }
  }

  /**
   * 獲取角色名稱
   * @param characterId 角色ID
   * @returns 角色名稱
   */
  private getCharacterName(characterId: string): string {
    try {
      const stmt = this.db.prepare('SELECT name FROM characters WHERE id = ?');
      const row = stmt.get(characterId);
      return row ? (row as any).name : '未知角色';
    } catch (error) {
      console.error('獲取角色名稱失敗:', error);
      return '未知角色';
    }
  }

  /**
   * 構建專案上下文
   * @param project 專案資訊
   * @returns 專案上下文
   */
  private buildProjectContext(project: Project): string {
    let context = `專案：${project.name}\n`;
    context += `類型：${this.getProjectTypeName(project.type)}\n`;
    
    if (project.description) {
      context += `描述：${project.description}\n`;
    }
    
    // 添加模板特定設定
    if (project.settings?.templateSettings) {
      context += this.buildTemplateContext(project.type, project.settings.templateSettings);
    }
    
    return context + '\n';
  }

  /**
   * 獲取專案類型名稱
   * @param type 專案類型
   * @returns 類型名稱
   */
  private getProjectTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      'isekai': '異世界',
      'school': '校園',
      'scifi': '科幻',
      'fantasy': '奇幻'
    };
    
    return typeMap[type] || type;
  }

  /**
   * 構建模板上下文
   * @param type 專案類型
   * @param settings 模板設定
   * @returns 模板上下文
   */
  private buildTemplateContext(type: string, settings: TemplateSettings): string {
    let context = '';
    
    switch (type) {
      case 'isekai':
        context += '世界觀：異世界\n';
        if (settings.levelSystem) {
          context += `等級系統：${settings.levelSystem}\n`;
        }
        if (settings.magicSystem) {
          context += `魔法系統：${settings.magicSystem}\n`;
        }
        if (settings.reincarnation) {
          context += `轉生設定：${settings.reincarnation}\n`;
        }
        break;
        
      case 'school':
        context += '世界觀：現代日式校園\n';
        if (settings.schoolName) {
          context += `學校名稱：${settings.schoolName}\n`;
        }
        if (settings.schoolType) {
          context += `學校類型：${settings.schoolType}\n`;
        }
        break;
        
      case 'scifi':
        context += '世界觀：科幻未來\n';
        if (settings.techLevel) {
          context += `科技水平：${settings.techLevel}\n`;
        }
        if (settings.worldSetting) {
          context += `世界設定：${settings.worldSetting}\n`;
        }
        break;
        
      case 'fantasy':
        context += '世界觀：奇幻\n';
        if (settings.magicSystem) {
          context += `魔法系統：${settings.magicSystem}\n`;
        }
        if (settings.races) {
          context += `種族：${settings.races}\n`;
        }
        break;
    }
    
    return context;
  }

  /**
   * 構建角色上下文
   * @param characters 角色列表
   * @returns 角色上下文
   */
  private buildCharactersContext(characters: Character[]): string {
    if (!characters || characters.length === 0) {
      return '';
    }
    
    let context = '主要角色：\n';
    
    characters.forEach(char => {
      context += `- ${char.name}：${char.age}歲，${char.gender}，${char.archetype}類型\n`;
      context += `  外貌：${char.appearance}\n`;
      context += `  性格：${char.personality}\n`;
      
      // 只添加簡短的背景摘要
      if (char.background) {
        const shortBackground = this.truncateText(char.background, 100);
        context += `  背景：${shortBackground}\n`;
      }
    });
    
    return context + '\n';
  }

  /**
   * 構建章節上下文
   * @param chapter 章節資訊
   * @param position 當前位置
   * @returns 章節上下文
   */
  private buildChapterContext(chapter: Chapter, position: number): string {
    let context = `當前章節：${chapter.title}\n\n`;
    
    // 提取當前位置之前的內容
    if (chapter.content) {
      const relevantContent = this.extractRelevantContent(chapter.content, position);
      context += relevantContent;
    }
    
    return context;
  }

  /**
   * 截斷文本
   * @param text 原始文本
   * @param maxLength 最大長度
   * @returns 截斷後的文本
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 分析上下文品質
   * @param context 上下文
   * @returns 品質報告
   */
  analyzeContextQuality(context: string): ContextQualityReport {
    // 簡化實現
    return {
      totalTokens: Math.floor(context.length / 4),
      characterInfoQuality: 80,
      worldBuildingQuality: 75,
      narrativeCoherenceQuality: 85,
      overallQuality: 80,
      suggestions: []
    };
  }

  /**
   * 獲取相關角色
   * @param projectId 專案ID
   * @param content 內容
   * @returns 相關角色列表
   */
  async getRelevantCharacters(projectId: string, content: string): Promise<Character[]> {
    try {
      const allCharacters = this.getProjectCharacters(projectId);
      return allCharacters.slice(0, 3); // 返回前3個角色
    } catch (error) {
      console.error('獲取相關角色失敗:', error);
      return [];
    }
  }

  /**
   * 檢測新角色
   * @param content 內容
   * @returns 可能的新角色名稱列表
   */
  detectNewCharacters(content: string): string[] {
    return []; // 簡化實現
  }

  /**
   * 檢查一致性
   * @param content 內容
   * @param projectId 專案ID
   * @returns 一致性問題列表
   */
  async checkConsistency(content: string, projectId: string): Promise<ConsistencyIssue[]> {
    return []; // 簡化實現
  }
}

// 單例實例（需要在資料庫初始化後設置）
let contextManagerInstance: ContextManager | null = null;

/**
 * 設置上下文管理器實例
 * @param db 資料庫實例
 */
export function setContextManager(db: Database): void {
  contextManagerInstance = new ContextManagerImpl(db);
}

/**
 * 獲取上下文管理器實例
 * @returns 上下文管理器實例
 */
export function getContextManager(): ContextManager {
  if (!contextManagerInstance) {
    throw new Error('上下文管理器尚未初始化');
  }
  return contextManagerInstance;
}