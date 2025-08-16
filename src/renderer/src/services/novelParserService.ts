// 小說解析服務
import nlp from 'compromise';
import type { NovelTemplate, WorldSetting, CharacterArchetypeTemplate, PlotFramework } from '../types/template';

// Compromise.js 人物實體類型
interface CompromisePerson {
  text: string;
  [key: string]: unknown; // 其他 Compromise.js 屬性
}

export interface NovelParseResult {
  title?: string;
  content: string;
  chapters: ChapterInfo[];
  statistics: NovelStatistics;
  basicAnalysis: BasicAnalysis;
}

export interface ChapterInfo {
  number: number;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  wordCount: number;
}

export interface NovelStatistics {
  totalWords: number;
  totalSentences: number;
  totalParagraphs: number;
  averageWordsPerSentence: number;
  averageWordsPerParagraph: number;
}

export interface BasicAnalysis {
  characters: CharacterInfo[];
  places: string[];
  timeReferences: string[];
  topics: string[];
}

export interface CharacterInfo {
  name: string;
  frequency: number;
  aliases: string[];
  firstAppearance: number;
}

export interface ParseOptions {
  chunkSize?: number;        // 每個分析片段的大小（字數）
  overlapSize?: number;      // 片段之間的重疊大小
  minChapterWords?: number;  // 最小章節字數
  encoding?: string;         // 文件編碼
}

const DEFAULT_OPTIONS: ParseOptions = {
  chunkSize: 2500,
  overlapSize: 200,
  minChapterWords: 500,
  encoding: 'utf-8'
};

export class NovelParserService {
  private options: ParseOptions;

  constructor(options: Partial<ParseOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 解析小說文本
   */
  async parseNovel(text: string, filename?: string): Promise<NovelParseResult> {
    // 基本清理
    const cleanedText = this.cleanText(text);
    
    // 提取章節
    const chapters = this.extractChapters(cleanedText);
    
    // 計算統計資訊
    const statistics = this.calculateStatistics(cleanedText);
    
    // 基礎 NLP 分析
    const basicAnalysis = this.performBasicAnalysis(cleanedText);
    
    // 嘗試提取標題
    const title = this.extractTitle(cleanedText, filename);

    return {
      title,
      content: cleanedText,
      chapters,
      statistics,
      basicAnalysis
    };
  }

  /**
   * 清理文本
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')           // 統一換行符
      .replace(/\u3000/g, ' ')          // 全形空格轉半形
      .replace(/\s+\n/g, '\n')          // 移除行尾空白
      .replace(/\n{3,}/g, '\n\n')       // 限制連續空行
      .trim();
  }

  /**
   * 提取章節資訊
   */
  private extractChapters(text: string): ChapterInfo[] {
    const chapters: ChapterInfo[] = [];
    
    // 章節標記正則表達式（支援多種格式）
    const chapterPatterns = [
      /^第[一二三四五六七八九十百千萬\d]+章[\s：:]*(.*)$/gm,
      /^Chapter\s+(\d+)[\s：:]*(.*)$/gim,
      /^第(\d+)章[\s：:]*(.*)$/gm,
      /^(\d+)[.、]\s*(.*)$/gm,
      /^【(.+?)】/gm,
      /^序章[\s：:]*(.*)/gm,
      /^終章[\s：:]*(.*)/gm
    ];

    const _lastEndIndex = 0;
    let chapterNumber = 0;

    // 嘗試每種模式
    for (const pattern of chapterPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length > 3) {  // 至少要有3個匹配才認為是有效的章節模式
        matches.forEach((match, _index) => {
          if (match.index === undefined) return;
          
          // 如果有前一章，設定其結束位置
          if (chapters.length > 0) {
            const prevChapter = chapters[chapters.length - 1];
            prevChapter.endIndex = match.index - 1;
            prevChapter.content = text.substring(prevChapter.startIndex, prevChapter.endIndex);
            prevChapter.wordCount = this.countWords(prevChapter.content);
          }

          chapterNumber++;
          const title = match[1] || match[2] || `第${chapterNumber}章`;
          
          chapters.push({
            number: chapterNumber,
            title: title.trim(),
            content: '', // 稍後填充
            startIndex: match.index + match[0].length,
            endIndex: text.length,
            wordCount: 0
          });
        });
        
        // 處理最後一章
        if (chapters.length > 0) {
          const lastChapter = chapters[chapters.length - 1];
          lastChapter.content = text.substring(lastChapter.startIndex);
          lastChapter.wordCount = this.countWords(lastChapter.content);
        }
        
        break; // 找到有效模式就停止
      }
    }

    // 如果沒有找到章節，將整個文本作為單一章節
    if (chapters.length === 0) {
      chapters.push({
        number: 1,
        title: '全文',
        content: text,
        startIndex: 0,
        endIndex: text.length,
        wordCount: this.countWords(text)
      });
    }

    // 過濾掉太短的章節
    return chapters.filter(ch => ch.wordCount >= this.options.minChapterWords!);
  }

  /**
   * 計算統計資訊
   */
  private calculateStatistics(text: string): NovelStatistics {
    const doc = nlp(text);
    const sentences = doc.sentences().json();
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const totalWords = this.countWords(text);

    return {
      totalWords,
      totalSentences: sentences.length,
      totalParagraphs: paragraphs.length,
      averageWordsPerSentence: sentences.length > 0 ? totalWords / sentences.length : 0,
      averageWordsPerParagraph: paragraphs.length > 0 ? totalWords / paragraphs.length : 0
    };
  }

  /**
   * 執行基礎 NLP 分析
   */
  private performBasicAnalysis(text: string): BasicAnalysis {
    const doc = nlp(text);
    
    // 提取人物（使用 Compromise 的人名識別）
    const peopleData = doc.people().json();
    const characterMap = new Map<string, CharacterInfo>();
    
    peopleData.forEach((person: CompromisePerson) => {
      const name = person.text;
      const normalizedName = name.toLowerCase();
      
      if (characterMap.has(normalizedName)) {
        characterMap.get(normalizedName)!.frequency++;
      } else {
        characterMap.set(normalizedName, {
          name,
          frequency: 1,
          aliases: [],
          firstAppearance: text.indexOf(name)
        });
      }
    });

    // 提取地點
    const places = Array.from(new Set(
      doc.places().out('array')
    )) as string[];

    // 提取時間參考
    const timeReferences = Array.from(new Set(
      (doc.match('#Date').out('array') as string[]).concat(
        doc.match('#Time').out('array') as string[]
      )
    ));

    // 提取主題（名詞短語）
    const topics = (doc.topics().out('array') as string[]).slice(0, 20);

    return {
      characters: Array.from(characterMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20), // 只保留前20個角色
      places,
      timeReferences,
      topics
    };
  }

  /**
   * 嘗試提取標題
   */
  private extractTitle(text: string, filename?: string): string | undefined {
    // 從文件名提取
    if (filename) {
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      if (nameWithoutExt && !nameWithoutExt.match(/^untitled|新建|document/i)) {
        return nameWithoutExt;
      }
    }

    // 從文本開頭提取（通常第一行是標題）
    const firstLine = text.split('\n')[0]?.trim();
    if (firstLine && firstLine.length < 50 && !firstLine.match(/^第|^chapter/i)) {
      return firstLine;
    }

    return undefined;
  }

  /**
   * 計算字數（支援中文）
   */
  private countWords(text: string): number {
    // 移除空白和標點
    const cleanText = text.replace(/[\s\p{P}]/gu, '');
    // 中文字符計數
    const chineseCount = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 英文單詞計數
    const englishWords = cleanText.match(/[a-zA-Z]+/g) || [];
    
    return chineseCount + englishWords.length;
  }

  /**
   * 將文本分割成用於 AI 分析的片段
   */
  createAnalysisChunks(text: string): string[] {
    const chunks: string[] = [];
    const { chunkSize, overlapSize } = this.options;
    
    if (!chunkSize || !overlapSize) return [text];

    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      const chunkEnd = Math.min(currentIndex + chunkSize, text.length);
      const chunk = text.substring(currentIndex, chunkEnd);
      chunks.push(chunk);
      
      // 移動到下一個片段，考慮重疊
      currentIndex += chunkSize - overlapSize;
      
      // 如果剩餘文本太少，就結束
      if (text.length - currentIndex < overlapSize) {
        break;
      }
    }

    return chunks;
  }

  /**
   * 從解析結果生成初步的模板數據
   */
  generateTemplatePreview(parseResult: NovelParseResult): Partial<NovelTemplate> {
    const { basicAnalysis } = parseResult;
    
    // 基於分析結果生成初步的世界觀設定
    const worldSetting: WorldSetting = {
      era: this.detectEra(parseResult.content),
      technology: this.detectTechnologyLevel(parseResult.content),
      society: '待分析',
      specialElements: this.detectSpecialElements(parseResult.content)
    };

    // 生成角色原型（基於高頻角色）
    const characterArchetypes: CharacterArchetypeTemplate[] = 
      basicAnalysis.characters.slice(0, 5).map(char => ({
        name: `${char.name}型角色`,
        description: `類似${char.name}的角色`,
        personality: '待分析',
        commonTraits: [],
        typicalRoles: [],
        tags: ['主要角色']
      }));

    // 基於章節生成劇情框架
    const plotFramework: PlotFramework[] = this.generatePlotFramework(parseResult.chapters);

    return {
      name: parseResult.title || '匯入的模板',
      type: this.detectNovelType(parseResult.content),
      description: `從《${parseResult.title || '未命名小說'}》生成的模板`,
      worldSetting,
      characterArchetypes,
      plotFramework,
      writingGuidelines: {
        tone: '待分析',
        style: '待分析',
        pacing: '待分析',
        themes: basicAnalysis.topics.slice(0, 5),
        commonTropes: [],
        avoidances: []
      },
      aiPromptTemplate: {
        context: '',
        characterPrompts: [],
        worldPrompts: [],
        stylePrompts: [],
        continuationPrompts: []
      }
    };
  }

  /**
   * 檢測時代背景
   */
  private detectEra(text: string): string {
    const modernKeywords = /手機|電腦|網路|汽車|飛機|現代|都市/;
    const ancientKeywords = /皇帝|王朝|武功|修仙|古代|朝廷/;
    const futureKeywords = /太空|星際|AI|機器人|虛擬|未來/;

    if (futureKeywords.test(text)) return '未來';
    if (ancientKeywords.test(text)) return '古代';
    if (modernKeywords.test(text)) return '現代';
    
    return '未知';
  }

  /**
   * 檢測科技水平
   */
  private detectTechnologyLevel(text: string): string {
    const magicKeywords = /魔法|法術|咒語|魔力|施法/;
    const cultivationKeywords = /修仙|修煉|靈氣|仙術|築基/;
    const scifiKeywords = /科技|機械|電子|數據|程式/;

    if (magicKeywords.test(text)) return '魔法';
    if (cultivationKeywords.test(text)) return '修仙';
    if (scifiKeywords.test(text)) return '科技';
    
    return '普通';
  }

  /**
   * 檢測特殊元素
   */
  private detectSpecialElements(text: string): string[] {
    const elements: string[] = [];
    
    const elementPatterns = [
      { pattern: /系統|面板|屬性|等級/, element: '遊戲系統' },
      { pattern: /轉生|重生|穿越/, element: '穿越重生' },
      { pattern: /異能|超能力|覺醒/, element: '超能力' },
      { pattern: /妖獸|魔物|靈獸/, element: '奇幻生物' },
      { pattern: /公會|冒險者|任務/, element: '冒險公會' },
      { pattern: /學院|學校|同學/, element: '學院' }
    ];

    elementPatterns.forEach(({ pattern, element }) => {
      if (pattern.test(text)) {
        elements.push(element);
      }
    });

    return elements;
  }

  /**
   * 檢測小說類型
   */
  private detectNovelType(text: string): 'isekai' | 'school' | 'scifi' | 'fantasy' {
    const isekaiScore = (text.match(/異世界|轉生|穿越|召喚/g) || []).length;
    const schoolScore = (text.match(/學校|同學|校園|青春/g) || []).length;
    const scifiScore = (text.match(/科技|太空|機器|未來/g) || []).length;
    const fantasyScore = (text.match(/魔法|冒險|勇者|魔王/g) || []).length;

    const scores = [
      { type: 'isekai' as const, score: isekaiScore },
      { type: 'school' as const, score: schoolScore },
      { type: 'scifi' as const, score: scifiScore },
      { type: 'fantasy' as const, score: fantasyScore }
    ];

    return scores.sort((a, b) => b.score - a.score)[0].type;
  }

  /**
   * 生成劇情框架
   */
  private generatePlotFramework(chapters: ChapterInfo[]): PlotFramework[] {
    if (chapters.length === 0) return [];

    const framework: PlotFramework[] = [];
    const totalChapters = chapters.length;

    // 簡單的三幕結構
    const act1End = Math.floor(totalChapters * 0.25);
    const act2End = Math.floor(totalChapters * 0.75);

    framework.push({
      phase: '開端（第一幕）',
      description: `第1-${act1End}章：故事背景介紹與角色登場`,
      keyEvents: chapters.slice(0, act1End).map(ch => ch.title),
      characterDevelopment: '角色介紹與初始狀態建立',
      worldBuilding: '世界觀基礎設定展示'
    });

    framework.push({
      phase: '發展（第二幕）',
      description: `第${act1End + 1}-${act2End}章：衝突升級與角色成長`,
      keyEvents: chapters.slice(act1End, act2End).map(ch => ch.title).slice(0, 5),
      characterDevelopment: '角色面對挑戰與內在成長',
      worldBuilding: '世界觀深入探索'
    });

    framework.push({
      phase: '高潮與結局（第三幕）',
      description: `第${act2End + 1}-${totalChapters}章：最終對決與問題解決`,
      keyEvents: chapters.slice(act2End).map(ch => ch.title),
      characterDevelopment: '角色完成轉變',
      worldBuilding: '世界觀完整呈現'
    });

    return framework;
  }
}

// 創建單例實例
export const novelParserService = new NovelParserService();