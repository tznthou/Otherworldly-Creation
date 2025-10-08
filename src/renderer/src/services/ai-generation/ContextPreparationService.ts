import { Editor, Range, Transforms } from 'slate';
import { analyzeChapterNotes, type ChapterNotesAnalysis } from '../../utils/chapterNotesAnalyzer';
import { api } from '../../api';

// 🐛 開發模式 debug logging (生產環境會被優化掉)
const DEBUG_INTELLIGENT_CONTEXT = process.env.NODE_ENV === 'development';

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
  // 原有的基礎配置
  maxTokens: number;
  focusCharacters?: string[];
  compressionLevel?: 'light' | 'medium' | 'smart';
  enableOptimization?: boolean;
  
  // 新增的智能優化配置
  enableIntelligentOptimization?: boolean;
  preserveDialogue?: boolean;
  contextOptimizationLevel?: 'basic' | 'advanced' | 'experimental';
  
  // 多維度權重配置
  plotAnalysisWeight?: number;
  statusWeight?: number;
  proximityWeight?: number;
  
  // Token預算管理
  maxTokenBudget?: number;
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
import { IntelligentContextBuilder, type OptimizedContext } from './IntelligentContextBuilder';

export class ContextPreparationService {
  private intelligentContextBuilder: IntelligentContextBuilder;

  constructor() {
    this.intelligentContextBuilder = new IntelligentContextBuilder();
  }

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
   * 智能多維度上下文建構
   * 
   * 核心功能：
   * - 跨章節上下文整合
   * - 基於章節狀態、劇情重要性的權重分配
   * - U形注意力模式優化
   * - 智能Token分配
   */
  async prepareIntelligentContext(
    projectId: string,
    chapterId: string,
    config: ContextOptimizationConfig
  ): Promise<OptimizedContext> {
    // 檢查是否啟用智能優化
    if (!config.enableIntelligentOptimization) {
      throw new Error('智能上下文優化未啟用');
    }

    // 構建智能上下文配置
    const intelligentConfig = {
      enableIntelligentOptimization: true,
      preserveDialogue: config.preserveDialogue ?? true,
      focusCharacters: config.focusCharacters ?? [],
      maxTokenBudget: config.maxTokenBudget ?? config.maxTokens ?? 8000,
      contextOptimizationLevel: config.contextOptimizationLevel ?? 'advanced',
      plotAnalysisWeight: config.plotAnalysisWeight ?? 0.4,
      statusWeight: config.statusWeight ?? 0.3,
      proximityWeight: config.proximityWeight ?? 0.3
    };

    try {
      if (DEBUG_INTELLIGENT_CONTEXT) {
        console.log('🧠 開始智能多維度上下文建構:', {
          projectId,
          chapterId,
          maxTokenBudget: intelligentConfig.maxTokenBudget,
          level: intelligentConfig.contextOptimizationLevel
        });
      }

      const optimizedContext = await this.intelligentContextBuilder.buildMultiDimensionalContext(
        projectId,
        chapterId,
        intelligentConfig
      );

      if (DEBUG_INTELLIGENT_CONTEXT) {
        console.log('✅ 智能上下文建構完成:', {
          tokenCount: optimizedContext.tokenCount,
          compressionRatio: optimizedContext.compressionRatio,
          usedChapters: optimizedContext.usedChapters.length,
          buildTime: optimizedContext.performanceMetrics.buildTime
        });
      }

      return optimizedContext;

    } catch (error) {
      console.error('🔥 智能上下文建構失敗:', error);
      throw new Error(`智能上下文建構失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
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
        stylePrompts.push('豐富環境描述，營造沈浸感');
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
   * 
   * 重要改進：現在支援智能多章節上下文建構
   */
  async preparePromptContext(
    editorContext: EditorContext,
    chapterId: string,
    projectId: string,
    optimizationConfig: ContextOptimizationConfig
  ): Promise<PromptContext> {
    // 獲取章節筆記
    const chapterNotes = await this.getChapterNotes(chapterId);
    
    let optimizedContext: string | undefined;

    // 檢查是否使用智能優化模式
    if (optimizationConfig.enableIntelligentOptimization) {
      try {
        if (DEBUG_INTELLIGENT_CONTEXT) {
          console.log('🧠 使用智能多維度上下文建構模式');
        }
        
        const intelligentResult = await this.prepareIntelligentContext(
          projectId,
          chapterId,
          optimizationConfig
        );

        // 使用智能建構的結果
        optimizedContext = intelligentResult.optimizedContent;
        
        if (DEBUG_INTELLIGENT_CONTEXT) {
          console.log('✅ 智能上下文建構成功:', {
            originalMode: false,
            tokenCount: intelligentResult.tokenCount,
            compression: `${(intelligentResult.compressionRatio * 100).toFixed(1)}%`,
            chapters: intelligentResult.usedChapters.length
          });
        }

      } catch (error) {
        console.warn('⚠️ 智能上下文建構失敗，回退到傳統模式:', error);
        
        // 回退到傳統優化模式
        if (optimizationConfig.enableOptimization && editorContext.textLength > 50000) {
          optimizedContext = await this.optimizeContext(
            editorContext.currentText, 
            optimizationConfig
          );
        }
      }

    } else {
      // 傳統優化模式（向後兼容）
      if (optimizationConfig.enableOptimization && editorContext.textLength > 50000) {
        optimizedContext = await this.optimizeContext(
          editorContext.currentText, 
          {
            ...optimizationConfig,
            focusCharacters: optimizationConfig.focusCharacters
          }
        );
      }
    }

    // 建構系統提示
    const systemPrompt = this.buildSystemPrompt(chapterNotes || undefined);
    
    // 建構基礎prompt
    let basePrompt = `續寫位置: ${editorContext.position}`;
    
    // 如果沒有智能上下文，使用當前編輯器內容
    if (!optimizedContext) {
      basePrompt = `${editorContext.currentText}\n\n續寫位置: ${editorContext.position}`;
    }

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