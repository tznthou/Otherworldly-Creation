import type { Chapter } from '../../api/models';
import { PlotAnalysisService } from '../plotAnalysisService';
import { ChapterStatusService, ChapterStatus } from '../chapterStatusService';
import { api } from '../../api';

/**
 * 章節分析結果
 */
interface ChapterAnalysis {
  chapter: Chapter;
  status: ChapterStatus;
  plotImportance: number;
  proximityWeight: number;
  statusWeight: number;
  finalWeight: number;
  extractedContent: string;
  keyElements: KeyElements;
}

/**
 * 關鍵要素提取
 */
interface KeyElements {
  characters: string[];
  plotPoints: string[];
  worldBuilding: string[];
  importantDialogue: string[];
  unresolvedPlots: string[];
}

/**
 * 上下文配置
 */
export interface IntelligentContextConfig {
  enableIntelligentOptimization: boolean;
  preserveDialogue: boolean;
  focusCharacters: string[];
  maxTokenBudget: number;
  contextOptimizationLevel: 'basic' | 'advanced' | 'experimental';
  plotAnalysisWeight: number;
  statusWeight: number;
  proximityWeight: number;
}

/**
 * 優化後的上下文結果
 */
export interface OptimizedContext {
  optimizedContent: string;
  tokenCount: number;
  compressionRatio: number;
  preservedElements: {
    charactersCount: number;
    plotPointsCount: number;
    dialogueCount: number;
  };
  usedChapters: Array<{
    chapterId: string;
    title: string;
    tokenAllocation: number;
    importanceReason: string;
  }>;
  performanceMetrics: {
    buildTime: number;
    cacheHit: boolean;
    analysisTime: number;
  };
}

/**
 * 緩存項目
 */
interface CachedContext {
  chapterAnalysis: ChapterAnalysis;
  timestamp: number;
  contentHash: string;
}

/**
 * 智能上下文構建器
 *
 * 核心功能：
 * 1. 多維度權重計算（章節狀態、劇情重要性、時間距離）
 * 2. 基於研究的U形注意力模式優化
 * 3. 性能優化（緩存、異步處理）
 * 4. 安全措施（向後兼容、功能開關）
 */
export class IntelligentContextBuilder {
  private cache: Map<string, CachedContext> = new Map();
  private plotAnalysisService: PlotAnalysisService;
  private chapterStatusService: ChapterStatusService;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘緩存
  private readonly MAX_CACHE_SIZE = 50; // 最大緩存項目數

  constructor() {
    this.plotAnalysisService = new PlotAnalysisService();
    this.chapterStatusService = new ChapterStatusService();
  }

  /**
   * 構建多維度智能上下文
   */
  async buildMultiDimensionalContext(
    projectId: string,
    currentChapterId: string,
    config: IntelligentContextConfig
  ): Promise<OptimizedContext> {
    const startTime = performance.now();

    try {
      // 1. 獲取所有章節
      const allChapters = await api.chapters.getByProjectId(projectId);
      const sortedChapters = this.sortChaptersByOrder(allChapters);
      const currentIndex = sortedChapters.findIndex(ch => ch.id === currentChapterId);

      if (currentIndex === -1) {
        throw new Error(`Chapter ${currentChapterId} not found in project`);
      }

      // 2. 分析每個章節（使用緩存優化）
      const chapterAnalyses = await this.analyzeChapters(
        sortedChapters,
        currentIndex,
        config
      );

      // 3. 計算權重並分配token
      const tokenAllocations = this.calculateTokenAllocations(
        chapterAnalyses,
        config.maxTokenBudget
      );

      // 4. 構建優化後的上下文
      const optimizedContext = await this.buildOptimizedContent(
        chapterAnalyses,
        tokenAllocations,
        config
      );

      const buildTime = performance.now() - startTime;

      return {
        ...optimizedContext,
        performanceMetrics: {
          buildTime,
          cacheHit: this.getCacheHitCount(chapterAnalyses) > 0,
          analysisTime: buildTime
        }
      };

    } catch (error) {
      console.error('🔥 IntelligentContextBuilder.buildMultiDimensionalContext 失敗:', error);
      throw error;
    }
  }

  /**
   * 按順序排列章節
   */
  private sortChaptersByOrder(chapters: Chapter[]): Chapter[] {
    return chapters.sort((a, b) => {
      // 優先使用 order 字段，如果沒有則使用 chapterNumber
      const aOrder = a.order ?? a.chapterNumber ?? 0;
      const bOrder = b.order ?? b.chapterNumber ?? 0;
      return aOrder - bOrder;
    });
  }

  /**
   * 分析章節（支持緩存）
   */
  private async analyzeChapters(
    chapters: Chapter[],
    currentIndex: number,
    config: IntelligentContextConfig
  ): Promise<ChapterAnalysis[]> {
    const analyses: ChapterAnalysis[] = [];
    const totalChapters = chapters.length; // 正確的章節總數

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      // 檢查緩存
      const cached = this.getFromCache(chapter.id);
      if (cached) {
        analyses.push(cached.chapterAnalysis);
        continue;
      }

      // 分析章節 - 修復：傳入正確的章節總數
      const analysis = await this.analyzeChapter(chapter, i, currentIndex, totalChapters, config);
      analyses.push(analysis);

      // 加入緩存
      this.addToCache(chapter.id, analysis);
    }

    return analyses;
  }

  /**
   * 分析單個章節
   */
  private async analyzeChapter(
    chapter: Chapter,
    chapterIndex: number,
    currentIndex: number,
    totalChapters: number,
    config: IntelligentContextConfig
  ): Promise<ChapterAnalysis> {
    // 1. 獲取章節狀態
    const status = this.chapterStatusService.parseChapterStatus(chapter);

    // 2. 計算狀態權重
    const statusWeight = this.calculateStatusWeight(status);

    // 3. 計算時間距離權重（U形模式）- 修復：使用正確的章節總數
    const proximityWeight = this.calculateProximityWeight(chapterIndex, currentIndex, totalChapters);

    // 4. 分析劇情重要性
    const plotImportance = await this.analyzePlotImportance(chapter, config);

    // 5. 提取關鍵要素
    const keyElements = this.extractKeyElements(chapter);

    // 6. 提取優化後的內容
    const extractedContent = this.extractOptimizedContent(chapter, keyElements, config);

    // 7. 計算最終權重
    const finalWeight = this.calculateFinalWeight({
      statusWeight,
      proximityWeight,
      plotImportance,
      config
    });

    return {
      chapter,
      status,
      plotImportance,
      proximityWeight,
      statusWeight,
      finalWeight,
      extractedContent,
      keyElements
    };
  }

  /**
   * 計算章節狀態權重
   */
  private calculateStatusWeight(status: ChapterStatus): number {
    const statusWeights = {
      [ChapterStatus.COMPLETED]: 1.0,   // 穩定內容，最高權重
      [ChapterStatus.REVIEWING]: 0.8,   // 接近完成
      [ChapterStatus.WRITING]: 0.6,     // 活躍編輯中
      [ChapterStatus.DRAFT]: 0.3        // 草稿，低優先級
    };

    return statusWeights[status] || 0.3;
  }

  /**
   * 計算時間距離權重（U形模式）
   * 基於研究：開頭和結尾信息更重要
   */
  private calculateProximityWeight(
    chapterIndex: number,
    currentIndex: number,
    totalChapters: number
  ): number {
    // 當前章節最高權重
    if (chapterIndex === currentIndex) {
      return 1.0;
    }

    // 緊鄰章節高權重
    const distance = Math.abs(chapterIndex - currentIndex);
    if (distance === 1) {
      return 0.9;
    }

    // U形模式：開頭章節高權重
    if (chapterIndex === 0) {
      return 0.8;
    }

    // U形模式：結尾章節較高權重
    if (chapterIndex === totalChapters - 1) {
      return 0.7;
    }

    // 距離越遠權重越低，但保持最低0.2
    return Math.max(0.2, 0.6 - (distance * 0.1));
  }

  /**
   * 分析劇情重要性
   */
  private async analyzePlotImportance(
    chapter: Chapter,
    config: IntelligentContextConfig
  ): Promise<number> {
    try {
      // 這裡將來整合PlotAnalysisService的結果
      // 現在先使用基礎邏輯
      let importance = 0.5; // 基礎重要性

      // 檢查是否包含關鍵角色
      if (config.focusCharacters.length > 0) {
        const content = this.extractTextFromChapter(chapter);
        const hasKeyCharacter = config.focusCharacters.some(char =>
          content.toLowerCase().includes(char.toLowerCase())
        );
        if (hasKeyCharacter) {
          importance += 0.3;
        }
      }

      // 檢查章節筆記中的重要性標記
      if (chapter.metadata) {
        try {
          const metadata = JSON.parse(chapter.metadata);
          if (metadata.notes) {
            const notes = metadata.notes.toLowerCase();
            if (notes.includes('重要') || notes.includes('關鍵') || notes.includes('伏筆')) {
              importance += 0.4;
            }
          }
        } catch (_error) {
          // 忽略metadata解析錯誤
        }
      }

      return Math.min(importance, 1.0);

    } catch (error) {
      console.warn('分析劇情重要性失敗:', error);
      return 0.5; // 默認中等重要性
    }
  }

  /**
   * 提取關鍵要素
   */
  private extractKeyElements(chapter: Chapter): KeyElements {
    const content = this.extractTextFromChapter(chapter);

    // 簡單的關鍵要素提取邏輯
    // 將來可以用更複雜的NLP分析
    return {
      characters: this.extractCharacters(content),
      plotPoints: this.extractPlotPoints(content),
      worldBuilding: this.extractWorldBuilding(content),
      importantDialogue: this.extractImportantDialogue(content),
      unresolvedPlots: this.extractUnresolvedPlots(content)
    };
  }

  /**
   * 從章節提取純文字內容
   */
  private extractTextFromChapter(chapter: Chapter): string {
    if (!chapter.content || !Array.isArray(chapter.content)) {
      return '';
    }

    return chapter.content
      .map(node => this.extractTextFromNode(node))
      .join('\n')
      .trim();
  }

  /**
   * 從Slate節點提取文字
   */
  private extractTextFromNode(node: unknown): string {
    if (typeof node === 'string') {
      return node;
    }

    if (typeof node !== 'object' || node === null) {
      return '';
    }

    const obj = node as Record<string, unknown>;

    if (typeof obj.text === 'string') {
      return obj.text;
    }

    if (Array.isArray(obj.children)) {
      return obj.children
        .map((child: unknown) => this.extractTextFromNode(child))
        .join('');
    }

    return '';
  }

  /**
   * 提取角色信息
   */
  private extractCharacters(content: string): string[] {
    // 簡單的角色提取邏輯
    // 尋找中文人名模式
    const characterPattern = /[「『]?([一-龯]{2,4})[」』]?[說道講問答回]/g;
    const characters = new Set<string>();
    let match;

    while ((match = characterPattern.exec(content)) !== null) {
      characters.add(match[1]);
    }

    return Array.from(characters);
  }

  /**
   * 提取劇情要點
   */
  private extractPlotPoints(content: string): string[] {
    // 簡單的劇情要點提取
    const plotKeywords = ['突然', '忽然', '決定', '發現', '意識到', '想起', '明白'];
    const plotPoints: string[] = [];

    for (const keyword of plotKeywords) {
      const sentences = content.split(/[。！？]/).filter(s => s.includes(keyword));
      plotPoints.push(...sentences.map(s => s.trim()).filter(s => s.length > 0));
    }

    return plotPoints.slice(0, 5); // 限制數量
  }

  /**
   * 提取世界觀信息
   */
  private extractWorldBuilding(content: string): string[] {
    // 簡單的世界觀提取
    const worldKeywords = ['王國', '帝國', '城市', '村莊', '宮殿', '學院', '魔法', '修真'];
    const worldInfo: string[] = [];

    for (const keyword of worldKeywords) {
      if (content.includes(keyword)) {
        // 提取包含該關鍵詞的句子
        const sentences = content.split(/[。！？]/).filter(s => s.includes(keyword));
        worldInfo.push(...sentences.slice(0, 2)); // 每個關鍵詞最多2句
      }
    }

    return worldInfo.slice(0, 5); // 限制數量
  }

  /**
   * 提取重要對話
   */
  private extractImportantDialogue(content: string): string[] {
    // 提取引號內的對話
    const dialoguePattern = /[「『"](.*?)[」』"]/g;
    const dialogues: string[] = [];
    let match;

    while ((match = dialoguePattern.exec(content)) !== null) {
      const dialogue = match[1].trim();
      if (dialogue.length > 5 && dialogue.length < 100) { // 過濾太短或太長的對話
        dialogues.push(dialogue);
      }
    }

    return dialogues.slice(0, 10); // 限制數量
  }

  /**
   * 提取未解決的伏筆
   */
  private extractUnresolvedPlots(content: string): string[] {
    // 簡單的伏筆提取邏輯
    const plotKeywords = ['秘密', '謎團', '隱藏', '疑問', '不解', '奇怪'];
    const unresolvedPlots: string[] = [];

    for (const keyword of plotKeywords) {
      const sentences = content.split(/[。！？]/).filter(s => s.includes(keyword));
      unresolvedPlots.push(...sentences.slice(0, 2));
    }

    return unresolvedPlots.slice(0, 5); // 限制數量
  }

  /**
   * 提取優化後的內容
   */
  private extractOptimizedContent(
    chapter: Chapter,
    keyElements: KeyElements,
    config: IntelligentContextConfig
  ): string {
    const fullContent = this.extractTextFromChapter(chapter);

    // 根據配置決定內容提取策略
    if (config.contextOptimizationLevel === 'basic') {
      return this.basicContentExtraction(fullContent, keyElements);
    } else if (config.contextOptimizationLevel === 'advanced') {
      return this.advancedContentExtraction(fullContent, keyElements, config);
    } else {
      return this.experimentalContentExtraction(fullContent, keyElements, config);
    }
  }

  /**
   * 基礎內容提取
   */
  private basicContentExtraction(content: string, _keyElements: KeyElements): string {
    // 簡單截取前500字
    return content.substring(0, 500) + (content.length > 500 ? '...' : '');
  }

  /**
   * 高級內容提取
   */
  private advancedContentExtraction(
    content: string,
    keyElements: KeyElements,
    config: IntelligentContextConfig
  ): string {
    let extractedContent = '';

    // 添加關鍵角色信息
    if (keyElements.characters.length > 0) {
      extractedContent += `角色: ${keyElements.characters.join(', ')}\n`;
    }

    // 添加重要劇情點
    if (keyElements.plotPoints.length > 0) {
      extractedContent += `劇情要點: ${keyElements.plotPoints.slice(0, 3).join('; ')}\n`;
    }

    // 添加重要對話
    if (config.preserveDialogue && keyElements.importantDialogue.length > 0) {
      extractedContent += `重要對話: ${keyElements.importantDialogue.slice(0, 3).join('; ')}\n`;
    }

    // 添加內容摘要
    const contentSummary = content.substring(0, 300);
    extractedContent += `內容摘要: ${contentSummary}`;

    return extractedContent;
  }

  /**
   * 實驗性內容提取
   */
  private experimentalContentExtraction(
    content: string,
    keyElements: KeyElements,
    config: IntelligentContextConfig
  ): string {
    // 將來可以實現更複雜的NLP分析
    return this.advancedContentExtraction(content, keyElements, config);
  }

  /**
   * 計算最終權重
   */
  private calculateFinalWeight(params: {
    statusWeight: number;
    proximityWeight: number;
    plotImportance: number;
    config: IntelligentContextConfig;
  }): number {
    const { statusWeight, proximityWeight, plotImportance, config } = params;

    // 驗證配置權重值
    const configStatusWeight = Math.max(0, Math.min(1, config.statusWeight));
    const configProximityWeight = Math.max(0, Math.min(1, config.proximityWeight));
    const configPlotWeight = Math.max(0, Math.min(1, config.plotAnalysisWeight));

    // 加權平均
    const finalWeight =
      (statusWeight * configStatusWeight) +
      (proximityWeight * configProximityWeight) +
      (plotImportance * configPlotWeight);

    // 確保結果在合理範圍內
    return Math.max(0, Math.min(finalWeight, 1.0));
  }

  /**
   * 計算Token分配
   */
  private calculateTokenAllocations(
    analyses: ChapterAnalysis[],
    totalBudget: number
  ): Array<{ chapterId: string; allocation: number }> {
    const totalWeight = analyses.reduce((sum, analysis) => sum + analysis.finalWeight, 0);

    if (totalWeight === 0) {
      // 如果總權重為0，平均分配
      const perChapter = Math.floor(totalBudget / analyses.length);
      return analyses.map(analysis => ({
        chapterId: analysis.chapter.id,
        allocation: perChapter
      }));
    }

    // 按權重比例分配
    return analyses.map(analysis => ({
      chapterId: analysis.chapter.id,
      allocation: Math.floor((analysis.finalWeight / totalWeight) * totalBudget)
    }));
  }

  /**
   * 構建優化後的內容
   */
  private async buildOptimizedContent(
    analyses: ChapterAnalysis[],
    tokenAllocations: Array<{ chapterId: string; allocation: number }>,
    _config: IntelligentContextConfig
  ): Promise<Omit<OptimizedContext, 'performanceMetrics'>> {
    let optimizedContent = '';
    let totalTokenCount = 0;
    const usedChapters: OptimizedContext['usedChapters'] = [];

    // 統計保留要素
    let charactersCount = 0;
    let plotPointsCount = 0;
    let dialogueCount = 0;

    // 按權重排序，優先處理重要章節
    const sortedAnalyses = analyses
      .sort((a, b) => b.finalWeight - a.finalWeight)
      .filter(analysis => {
        const allocation = tokenAllocations.find(ta => ta.chapterId === analysis.chapter.id);
        return allocation && allocation.allocation > 0;
      });

    for (const analysis of sortedAnalyses) {
      const allocation = tokenAllocations.find(ta => ta.chapterId === analysis.chapter.id);
      if (!allocation || allocation.allocation === 0) continue;

      // 根據token分配調整內容長度
      const maxLength = allocation.allocation * 2; // 假設平均1token = 2字符
      let chapterContent = analysis.extractedContent;

      if (chapterContent.length > maxLength) {
        chapterContent = chapterContent.substring(0, maxLength) + '...';
      }

      // 添加章節標識
      optimizedContent += `\n=== ${analysis.chapter.title} ===\n`;
      optimizedContent += chapterContent + '\n';

      totalTokenCount += allocation.allocation;

      // 統計保留要素
      charactersCount += analysis.keyElements.characters.length;
      plotPointsCount += analysis.keyElements.plotPoints.length;
      dialogueCount += analysis.keyElements.importantDialogue.length;

      // 記錄使用的章節
      usedChapters.push({
        chapterId: analysis.chapter.id,
        title: analysis.chapter.title,
        tokenAllocation: allocation.allocation,
        importanceReason: this.getImportanceReason(analysis)
      });
    }

    // 計算壓縮比例
    const originalTokenCount = analyses.reduce((sum, analysis) => {
      return sum + (analysis.extractedContent.length / 2); // 估算原始token數
    }, 0);

    const compressionRatio = originalTokenCount > 0 ? totalTokenCount / originalTokenCount : 1;

    return {
      optimizedContent: optimizedContent.trim(),
      tokenCount: totalTokenCount,
      compressionRatio,
      preservedElements: {
        charactersCount,
        plotPointsCount,
        dialogueCount
      },
      usedChapters
    };
  }

  /**
   * 獲取重要性原因描述
   */
  private getImportanceReason(analysis: ChapterAnalysis): string {
    const reasons: string[] = [];

    if (analysis.statusWeight > 0.8) {
      reasons.push('已完成章節');
    }
    if (analysis.proximityWeight > 0.8) {
      reasons.push('鄰近當前章節');
    }
    if (analysis.plotImportance > 0.7) {
      reasons.push('包含重要劇情');
    }
    if (analysis.keyElements.characters.length > 3) {
      reasons.push('角色豐富');
    }
    if (analysis.keyElements.unresolvedPlots.length > 0) {
      reasons.push('包含未解伏筆');
    }

    return reasons.length > 0 ? reasons.join(', ') : '一般重要性';
  }

  /**
   * 緩存管理方法
   */
  private getFromCache(chapterId: string): CachedContext | null {
    const cached = this.cache.get(chapterId);
    if (!cached) return null;

    // 檢查緩存是否過期
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(chapterId);
      return null;
    }

    return cached;
  }

  private addToCache(chapterId: string, analysis: ChapterAnalysis): void {
    // 限制緩存大小
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // 刪除最舊的緩存項
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const contentHash = this.generateContentHash(analysis.extractedContent);

    this.cache.set(chapterId, {
      chapterAnalysis: analysis,
      timestamp: Date.now(),
      contentHash
    });
  }

  private generateContentHash(content: string): string {
    // 簡單的內容哈希
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為32位整數
    }
    return hash.toString();
  }

  private getCacheHitCount(analyses: ChapterAnalysis[]): number {
    return analyses.filter(analysis =>
      this.cache.has(analysis.chapter.id)
    ).length;
  }

  /**
   * 清除緩存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 獲取緩存統計
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 將來實現命中率統計
    };
  }
}