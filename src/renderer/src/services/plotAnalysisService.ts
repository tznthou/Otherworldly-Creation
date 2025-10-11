// 劇情分析服務 - Phase 2: 進階 AI 功能
import type { Descendant } from 'slate';
import { 
  analyzePlot, 
  detectConflictPoints, 
  analyzePace, 
  trackForeshadowing,
  PlotAnalysis,
  ConflictPoint,
  PaceAnalysis,
  ForeshadowingAnalysis
} from '../utils/nlpUtils';
import { slateToPlainText } from '../utils/nlpUtils';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('plotAnalysisService');

/**
 * 劇情分析服務 - 整合劇情分析功能的統一入口
 */
export class PlotAnalysisService {
  /**
   * 分析單個章節的劇情
   */
  static analyzeChapterPlot(chapterContent: Descendant[]): PlotAnalysis {
    log.debug('📖 開始章節劇情分析...');
    
    // 將 Slate.js 內容轉換為純文字
    const plainText = slateToPlainText(chapterContent);
    
    if (!plainText || plainText.length < 100) {
      log.warn('⚠️ 章節內容過短，跳過劇情分析');
      return this.getEmptyAnalysis();
    }
    
    // 執行完整的劇情分析
    return analyzePlot(plainText);
  }
  
  /**
   * 分析專案整體劇情
   */
  static analyzeProjectPlot(chapters: Array<{ content: Descendant[] }>): PlotAnalysis {
    log.debug('📚 開始專案整體劇情分析...');
    
    // 合併所有章節內容
    const allContent = chapters
      .map(chapter => slateToPlainText(chapter.content))
      .filter(text => text && text.length > 50) // 過濾太短的章節
      .join('\n\n');
    
    if (!allContent || allContent.length < 500) {
      log.warn('⚠️ 專案內容過少，無法進行有效的劇情分析');
      return this.getEmptyAnalysis();
    }
    
    // 執行完整的劇情分析
    return analyzePlot(allContent);
  }
  
  /**
   * 分析指定文本的衝突點
   */
  static analyzeConflicts(text: string): ConflictPoint[] {
    return detectConflictPoints(text);
  }
  
  /**
   * 分析指定文本的節奏
   */
  static analyzePacing(text: string): PaceAnalysis {
    return analyzePace(text);
  }
  
  /**
   * 分析指定文本的伏筆
   */
  static analyzeForeshadowing(text: string): ForeshadowingAnalysis {
    return trackForeshadowing(text);
  }
  
  /**
   * 批量分析多個章節的劇情趨勢
   */
  static analyzeChapterTrends(chapters: Array<{ id: string; title: string; content: Descendant[] }>): ChapterTrendAnalysis[] {
    log.debug('📈 開始章節劇情趨勢分析...');
    
    return chapters.map((chapter, index) => {
      const plainText = slateToPlainText(chapter.content);
      
      if (!plainText || plainText.length < 50) {
        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterIndex: index + 1,
          analysis: this.getEmptyAnalysis(),
          trend: 'stable'
        };
      }
      
      const analysis = analyzePlot(plainText);
      
      // 根據分析結果確定趨勢
      let trend: ChapterTrendAnalysis['trend'] = 'stable';
      if (analysis.overallScore > 7) trend = 'rising';
      else if (analysis.overallScore < 4) trend = 'declining';
      
      return {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterIndex: index + 1,
        analysis,
        trend
      };
    });
  }
  
  /**
   * 生成劇情改善建議
   */
  static generatePlotImprovementSuggestions(analysis: PlotAnalysis): PlotSuggestion[] {
    const suggestions: PlotSuggestion[] = [];
    
    // 衝突相關建議
    if (analysis.conflicts.length === 0) {
      suggestions.push({
        type: 'conflict',
        priority: 'high',
        title: '缺乏戲劇衝突',
        description: '故事中未檢測到明顯的衝突點',
        suggestion: '建議增加角色間的對立、內心掙扎或外部威脅來增強戲劇張力',
        impact: '高度提升讀者參與度和故事吸引力'
      });
    } else if (analysis.conflicts.length < 3) {
      suggestions.push({
        type: 'conflict',
        priority: 'medium',
        title: '衝突密度偏低',
        description: '檢測到的衝突點較少，可能影響故事節奏',
        suggestion: '考慮在關鍵情節點添加更多衝突元素',
        impact: '提升故事的緊張感和戲劇效果'
      });
    }
    
    // 節奏相關建議
    if (analysis.pace.overallPace === 'slow' && analysis.pace.paceScore < 4) {
      suggestions.push({
        type: 'pace',
        priority: 'high',
        title: '敘事節奏緩慢',
        description: '故事節奏偏慢，可能影響讀者閱讀體驗',
        suggestion: '增加對話、動作場景或縮短句子長度來提升節奏',
        impact: '改善讀者的閱讀流暢度和參與感'
      });
    } else if (analysis.pace.overallPace === 'fast' && analysis.pace.paceScore > 8) {
      suggestions.push({
        type: 'pace',
        priority: 'medium',
        title: '節奏過於急促',
        description: '故事節奏過快，讀者可能需要更多停頓',
        suggestion: '適當添加描述性段落或內心獨白來調節節奏',
        impact: '提供更好的閱讀體驗和情感沈澱'
      });
    }
    
    // 伏筆相關建議
    if (analysis.foreshadowing.orphanedSetups.length > 0) {
      suggestions.push({
        type: 'foreshadowing',
        priority: 'medium',
        title: '未回收的伏筆',
        description: `發現 ${analysis.foreshadowing.orphanedSetups.length} 個未回收的伏筆設置`,
        suggestion: '建議在後續章節中安排伏筆的回收和解答',
        impact: '提升故事的完整性和讀者滿足感'
      });
    }
    
    // 整體評分建議
    if (analysis.overallScore < 5) {
      suggestions.push({
        type: 'overall',
        priority: 'high',
        title: '整體劇情品質需提升',
        description: `劇情整體評分為 ${analysis.overallScore}/10，低於平均水準`,
        suggestion: '建議重點關注衝突設計、節奏控制和伏筆運用',
        impact: '全面提升作品的文學品質和商業價值'
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  /**
   * 獲取空的分析結果
   */
  private static getEmptyAnalysis(): PlotAnalysis {
    return {
      conflicts: [],
      pace: {
        overallPace: 'moderate',
        paceScore: 5,
        segments: [],
        recommendations: []
      },
      foreshadowing: {
        setups: [],
        payoffs: [],
        orphanedSetups: [],
        connections: []
      },
      overallScore: 5,
      recommendations: ['內容不足，無法進行詳細分析']
    };
  }
}

/**
 * 章節趨勢分析結果
 */
export interface ChapterTrendAnalysis {
  chapterId: string;
  chapterTitle: string;
  chapterIndex: number;
  analysis: PlotAnalysis;
  trend: 'rising' | 'declining' | 'stable';
}

/**
 * 劇情改善建議
 */
export interface PlotSuggestion {
  type: 'conflict' | 'pace' | 'foreshadowing' | 'overall';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
  impact: string;
}

// 導出服務實例
export const plotAnalysisService = PlotAnalysisService;