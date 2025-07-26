/**
 * 上下文壓縮器 - 負責壓縮上下文以符合模型限制
 */
export class ContextCompressor {
  
  /**
   * 壓縮上下文以符合模型的最大 token 限制
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
    const projectMatch = context.match(/^專案：[\s\S]*?(?=\n\n|$)/);
    if (projectMatch) {
      sections.push({
        type: 'project',
        text: projectMatch[0],
        importance: 10 // 專案資訊非常重要
      });
    }
    
    const worldMatch = context.match(/世界觀：[\s\S]*?(?=\n\n主要角色：|$)/);
    if (worldMatch) {
      sections.push({
        type: 'world',
        text: worldMatch[0],
        importance: 8 // 世界觀重要
      });
    }
    
    const charactersMatch = context.match(/主要角色：[\s\S]*?(?=\n\n當前章節：|$)/);
    if (charactersMatch) {
      sections.push({
        type: 'characters',
        text: charactersMatch[0],
        importance: 9 // 角色資訊很重要
      });
    }
    
    const chapterMatch = context.match(/當前章節：[\s\S]*?(?=\n\n相關內容：|$)/);
    if (chapterMatch) {
      sections.push({
        type: 'chapter_info',
        text: chapterMatch[0],
        importance: 7 // 章節資訊重要
      });
    }
    
    const contentMatch = context.match(/相關內容：[\s\S]*$/);
    if (contentMatch) {
      sections.push({
        type: 'content',
        text: contentMatch[0],
        importance: 6 // 內容相對不那麼重要
      });
    }
    
    return sections;
  }
  
  /**
   * 根據重要性分配 token
   */
  private allocateTokensByImportance(
    sections: { type: string; text: string; importance: number }[],
    maxTokens: number
  ): Record<string, number> {
    const totalImportance = sections.reduce((sum, section) => sum + section.importance, 0);
    const allocatedTokens: Record<string, number> = {};
    
    // 為每個部分分配 token
    sections.forEach(section => {
      const ratio = section.importance / totalImportance;
      allocatedTokens[section.type] = Math.floor(maxTokens * ratio);
    });
    
    return allocatedTokens;
  }
  
  /**
   * 根據分配的 token 壓縮各部分
   */
  private compressSectionsByAllocation(
    sections: { type: string; text: string; importance: number }[],
    allocatedTokens: Record<string, number>
  ): string[] {
    return sections.map(section => {
      const maxChars = allocatedTokens[section.type] * 4; // 估算字符數
      
      if (section.text.length <= maxChars) {
        return section.text;
      }
      
      // 根據部分類型選擇壓縮策略
      switch (section.type) {
        case 'project':
        case 'world':
        case 'chapter_info':
          // 保留關鍵資訊
          return this.compressKeyInformation(section.text, maxChars);
        case 'characters':
          // 壓縮角色描述
          return this.compressCharacterInfo(section.text, maxChars);
        case 'content':
          // 截取最相關的內容
          return this.truncateContent(section.text, maxChars);
        default:
          return section.text.substring(0, maxChars) + '...';
      }
    });
  }
  
  /**
   * 壓縮關鍵資訊
   */
  private compressKeyInformation(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    
    // 保留標題和第一句話
    const lines = text.split('\n');
    let compressed = lines[0]; // 保留標題
    
    for (let i = 1; i < lines.length && compressed.length < maxChars; i++) {
      const line = lines[i];
      if (compressed.length + line.length + 1 <= maxChars) {
        compressed += '\n' + line;
      } else {
        compressed += '\n...';
        break;
      }
    }
    
    return compressed;
  }
  
  /**
   * 壓縮角色資訊
   */
  private compressCharacterInfo(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    
    const lines = text.split('\n');
    let compressed = lines[0]; // 保留標題 "主要角色："
    
    // 保留最重要的角色資訊
    for (let i = 1; i < lines.length && compressed.length < maxChars; i++) {
      const line = lines[i];
      if (line.startsWith('- ')) { // 角色名稱和主要描述
        if (compressed.length + line.length + 1 <= maxChars) {
          compressed += '\n' + line;
        }
      } else if (line.includes('性格：') || line.includes('關係：')) { // 重要屬性
        if (compressed.length + line.length + 1 <= maxChars) {
          compressed += '\n' + line;
        }
      }
    }
    
    return compressed;
  }
  
  /**
   * 截取內容
   */
  private truncateContent(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    
    // 保留開頭，並嘗試在句子結尾截斷
    const truncated = text.substring(0, maxChars);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？')
    );
    
    if (lastSentenceEnd > maxChars * 0.8) {
      return text.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }
}