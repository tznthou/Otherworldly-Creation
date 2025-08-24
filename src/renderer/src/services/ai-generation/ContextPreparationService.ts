import { Editor, Range, Transforms } from 'slate';
import { analyzeChapterNotes, type ChapterNotesAnalysis } from '../../utils/chapterNotesAnalyzer';
import { api } from '../../api';

/**
 * 編輯器上下文類型
 */
export interface EditorContext {
  position: number;
  hasSelection: boolean;
  isCollapsed: boolean;
  currentText: string;
  textLength: number;
}

/**
 * 章節筆記類型
 */
export interface ChapterNotes {
  content: string;
  analysis?: ChapterNotesAnalysis;
}

/**
 * 上下文準備結果類型
 */
export interface PromptContext {
  basePrompt: string;
  systemPrompt: string;
  optimizedContext?: string;
  chapterNotes?: ChapterNotes;
  position: number;
}

/**
 * 上下文優化配置
 */
export interface ContextOptimizationConfig {
  maxTokens: number;
  focusCharacters?: string[];
  compressionLevel?: 'light' | 'medium' | 'smart';
  enableOptimization?: boolean;
}

/**
 * 上下文準備服務 - 處理編輯器狀態和上下文準備
 * 
 * 職責：
 * - 處理編輯器游標位置和選擇
 * - 獲取和分析章節筆記  
 * - 準備AI生成的上下文
 * - 整合超長上下文優化
 * - 建構智能化的prompt
 */
export class ContextPreparationService {

  /**
   * 準備編輯器上下文信息
   */
  prepareEditorContext(editor: Editor): EditorContext {
    let { selection } = editor;
    
    // 如果沒有選擇，自動設置到文檔末尾
    if (!selection) {
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
      selection = editor.selection;
    }
    
    // 確保選擇是折疊的（游標位置）
    if (selection && !Range.isCollapsed(selection)) {
      Transforms.collapse(editor, { edge: 'end' });
      selection = editor.selection;
    }

    // 獲取當前文本內容
    const currentText = Editor.string(editor, []);
    
    return {
      position: selection?.anchor.offset || 0,
      hasSelection: !!selection,
      isCollapsed: selection ? Range.isCollapsed(selection) : false,
      currentText,
      textLength: currentText.length
    };
  }

  /**
   * 獲取章節筆記
   */
  async getChapterNotes(chapterId: string): Promise<ChapterNotes | null> {
    try {
      const chapter = await api.chapters.getById(chapterId);
      if (!chapter?.metadata) {
        return null;
      }

      // 解析章節metadata獲取筆記
      let notes: string | null = null;
      try {
        const metadata = JSON.parse(chapter.metadata);
        notes = metadata.notes?.trim() || null;
      } catch (parseError) {
        console.warn('解析章節metadata失敗:', parseError);
        return null;
      }

      if (!notes) {
        return null;
      }

      return {
        content: notes,
        analysis: analyzeChapterNotes(notes)
      };
    } catch (error) {
      console.warn('獲取章節筆記失敗:', error);
      return null;
    }
  }

  /**
   * 優化超長上下文
   */
  async optimizeContext(
    originalContext: string, 
    config: ContextOptimizationConfig
  ): Promise<string> {
    // 如果文本長度不需要優化，直接返回
    if (!config.enableOptimization || originalContext.length < 50000) {
      return originalContext;
    }

    try {
      const optimized = await api.context.optimizeUltraLongContext({
        originalContext,
        maxTokens: config.maxTokens,
        focusCharacters: config.focusCharacters || [],
        currentPosition: 0 // 將在實際使用時設定
      });

      return optimized.content || originalContext;
    } catch (error) {
      console.warn('上下文優化失敗，使用原始內容:', error);
      return originalContext;
    }
  }

  /**
   * 建構基於章節筆記的系統提示詞
   */
  buildSystemPrompt(chapterNotes?: ChapterNotes): string {
    let systemPrompt = '你是一個專業的小說續寫助手。請直接輸出繁體中文的故事內容，不要包含任何英文說明、思考過程或指導語句。只輸出純粹的故事續寫內容。';

    if (chapterNotes?.analysis) {
      const { style, tone, suggestions } = chapterNotes.analysis;
      
      // 基於分析結果調整系統提示
      const stylePrompts: string[] = [];
      
      // 風格建議
      if (style.dialogue > 0.5) {
        stylePrompts.push('重點發展角色對話，展現個性差異');
      }
      if (style.action > 0.5) {
        stylePrompts.push('注重動作場景的節奏感和視覺效果');
      }
      if (style.description > 0.5) {
        stylePrompts.push('豐富環境描述，營造沉浸感');
      }
      if (style.emotion > 0.5) {
        stylePrompts.push('深入挖掘角色內心情感變化');
      }

      // 基調建議
      const maxTone = Object.entries(tone).sort(([,a], [,b]) => b - a)[0];
      if (maxTone[1] > 0.5) {
        switch (maxTone[0]) {
          case 'dramatic':
            stylePrompts.push('強化戲劇張力，突出衝突點');
            break;
          case 'romantic':
            stylePrompts.push('細膩描繪浪漫氛圍和情感互動');
            break;
          case 'humorous':
            stylePrompts.push('保持輕鬆幽默的敘述風格');
            break;
          case 'mysterious':
            stylePrompts.push('營造神秘感，保持讀者好奇心');
            break;
          case 'emotional':
            stylePrompts.push('著重情感共鳴和心理描寫');
            break;
        }
      }

      // 整合建議
      if (suggestions.length > 0) {
        stylePrompts.push(...suggestions);
      }

      if (stylePrompts.length > 0) {
        systemPrompt += '\n\n根據章節筆記的分析，請特別注意：\n' + 
                       stylePrompts.map(s => `- ${s}`).join('\n');
      }
    }

    return systemPrompt;
  }

  /**
   * 準備完整的prompt上下文
   */
  async preparePromptContext(
    editorContext: EditorContext,
    chapterId: string,
    optimizationConfig: ContextOptimizationConfig
  ): Promise<PromptContext> {
    // 獲取章節筆記
    const chapterNotes = await this.getChapterNotes(chapterId);
    
    // 優化上下文（如果需要）
    let optimizedContext: string | undefined;
    if (optimizationConfig.enableOptimization && editorContext.textLength > 50000) {
      optimizedContext = await this.optimizeContext(
        editorContext.currentText, 
        {
          ...optimizationConfig,
          focusCharacters: optimizationConfig.focusCharacters
        }
      );
    }

    // 建構系統提示
    const systemPrompt = this.buildSystemPrompt(chapterNotes || undefined);
    
    // 建構基礎prompt
    const basePrompt = `續寫位置: ${editorContext.position}`;

    return {
      basePrompt,
      systemPrompt,
      optimizedContext,
      chapterNotes: chapterNotes ?? undefined,
      position: editorContext.position
    };
  }
}

/**
 * 單例實例
 */
export const contextPreparationService = new ContextPreparationService();