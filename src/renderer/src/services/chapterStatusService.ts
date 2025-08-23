/**
 * 章節狀態管理服務
 * 基於備份的狀態管理模組，兼容現有專案接口
 */

import { Chapter } from '../api/models';

// ========== 狀態定義 ==========

export enum ChapterStatus {
  DRAFT = 'draft',
  WRITING = 'writing',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed'
}

// 擴展 Chapter 介面以確保類型安全
export interface ChapterWithStatus extends Chapter {
  status: ChapterStatus;
  completedAt?: Date;
}

// ========== 統計相關型別 ==========

export interface StatusDistribution {
  [ChapterStatus.DRAFT]: number;
  [ChapterStatus.WRITING]: number;
  [ChapterStatus.REVIEWING]: number;
  [ChapterStatus.COMPLETED]: number;
  total: number;
}

export interface ProgressMetrics {
  completedCount: number;
  totalCount: number;
  completionRate: number; // 0-1
  averageCompletionTime: number; // 天數
  estimatedTimeToCompletion: number; // 天數
  statusDistribution: StatusDistribution;
}

// ========== 統計計算器 ==========

export class ChapterStatusService {
  
  /**
   * 計算完成章節數量
   */
  calculateCompletedCount(chapters: Chapter[]): number {
    if (!Array.isArray(chapters)) {
      return 0;
    }
    return chapters.filter(chapter => chapter.status === ChapterStatus.COMPLETED).length;
  }

  /**
   * 計算完成率
   */
  calculateCompletionRate(chapters: Chapter[]): number {
    if (!chapters || chapters.length === 0) {
      return 0;
    }
    const completedCount = this.calculateCompletedCount(chapters);
    return Number((completedCount / chapters.length).toFixed(3));
  }

  /**
   * 取得狀態分佈統計
   */
  getStatusDistribution(chapters: Chapter[]): StatusDistribution {
    if (!Array.isArray(chapters)) {
      return {
        [ChapterStatus.DRAFT]: 0,
        [ChapterStatus.WRITING]: 0,
        [ChapterStatus.REVIEWING]: 0,
        [ChapterStatus.COMPLETED]: 0,
        total: 0
      };
    }

    const distribution: StatusDistribution = {
      [ChapterStatus.DRAFT]: 0,
      [ChapterStatus.WRITING]: 0,
      [ChapterStatus.REVIEWING]: 0,
      [ChapterStatus.COMPLETED]: 0,
      total: chapters.length
    };

    chapters.forEach(chapter => {
      if (chapter.status && Object.prototype.hasOwnProperty.call(distribution, chapter.status)) {
        distribution[chapter.status as ChapterStatus]++;
      }
    });

    return distribution;
  }

  /**
   * 生成進度指標
   */
  generateProgressMetrics(chapters: Chapter[]): ProgressMetrics {
    const statusDistribution = this.getStatusDistribution(chapters);
    const completedCount = statusDistribution[ChapterStatus.COMPLETED];
    const totalCount = statusDistribution.total;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    // 簡化版本，不包含複雜的時間計算
    return {
      completedCount,
      totalCount,
      completionRate: Number(completionRate.toFixed(3)),
      averageCompletionTime: 0, // 簡化版本
      estimatedTimeToCompletion: 0, // 簡化版本
      statusDistribution
    };
  }

  /**
   * 取得狀態的中文標籤
   */
  getStatusLabel(status: ChapterStatus): string {
    const labels = {
      [ChapterStatus.DRAFT]: '草稿',
      [ChapterStatus.WRITING]: '撰寫中',
      [ChapterStatus.REVIEWING]: '審閱中',
      [ChapterStatus.COMPLETED]: '已完成'
    };
    return labels[status];
  }

  /**
   * 取得所有狀態選項
   */
  getAllStatuses(): Array<{ value: ChapterStatus; label: string }> {
    return Object.values(ChapterStatus).map(status => ({
      value: status,
      label: this.getStatusLabel(status)
    }));
  }

  /**
   * 取得狀態樣式
   */
  getStatusStyle(status: ChapterStatus): {
    color: string;
    backgroundColor: string;
    borderColor: string;
  } {
    const styles = {
      [ChapterStatus.DRAFT]: {
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
        borderColor: '#D1D5DB'
      },
      [ChapterStatus.WRITING]: {
        color: '#2563EB',
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE'
      },
      [ChapterStatus.REVIEWING]: {
        color: '#D97706',
        backgroundColor: '#FFFBEB',
        borderColor: '#FED7AA'
      },
      [ChapterStatus.COMPLETED]: {
        color: '#059669',
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0'
      }
    };
    return styles[status];
  }

  /**
   * 計算字數統計
   */
  getWordCountStatistics(chapters: Chapter[]): {
    totalWords: number;
    averageWords: number;
    completedWords: number;
    draftWords: number;
  } {
    let totalWords = 0;
    let completedWords = 0;
    let draftWords = 0;

    chapters.forEach(chapter => {
      const wordCount = chapter.wordCount || 0;
      totalWords += wordCount;
      
      if (chapter.status === ChapterStatus.COMPLETED) {
        completedWords += wordCount;
      } else if (chapter.status === ChapterStatus.DRAFT) {
        draftWords += wordCount;
      }
    });

    return {
      totalWords,
      averageWords: chapters.length > 0 ? Number((totalWords / chapters.length).toFixed(0)) : 0,
      completedWords,
      draftWords
    };
  }
}

// 預設實例
export const chapterStatusService = new ChapterStatusService();