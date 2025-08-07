// 小說 AI 分析服務
import { api } from '../api';
import type { 
  NovelTemplate, 
  WorldSetting, 
  CharacterArchetypeTemplate, 
  PlotFramework,
  WritingGuidelines,
  AIPromptTemplate
} from '../types/template';
import type { NovelParseResult } from './novelParserService';

// 重新匯出相關類型
export type { NovelParseResult } from './novelParserService';
import { novelParserService } from './novelParserService';

export interface AnalysisProgress {
  stage: 'preparing' | 'analyzing' | 'aggregating' | 'generating' | 'complete';
  current: number;
  total: number;
  message: string;
}

export interface DetailedAnalysis {
  worldSetting: WorldSetting;
  characters: CharacterArchetypeTemplate[];
  plotStructure: PlotFramework[];
  writingStyle: WritingGuidelines;
  themes: string[];
  confidence: number;
}

export interface AnalysisOptions {
  projectId?: string;
  depth?: 'basic' | 'standard' | 'deep';
  focusAreas?: ('world' | 'character' | 'plot' | 'style')[];
  language?: 'zh-TW' | 'zh-CN' | 'en' | 'ja';
}

// AI 分析提示詞模板
const ANALYSIS_PROMPTS = {
  worldSetting: `分析以下小說片段的世界觀設定，請提取：
1. 時代背景（古代/現代/未來/架空）
2. 科技或魔法水平
3. 社會結構與制度
4. 地理環境特徵
5. 特殊元素或設定（如有）

請以 JSON 格式返回，包含以下字段：
{
  "era": "時代描述",
  "technology": "科技/魔法水平",
  "society": "社會結構",
  "geography": "地理環境",
  "specialElements": ["特殊元素1", "特殊元素2"],
  "culture": "文化特色"
}

小說片段：
`,

  characterAnalysis: `分析以下小說片段中的角色，請提取主要角色的：
1. 姓名和稱呼
2. 性格特徵（至少3個形容詞）
3. 外貌描述
4. 背景故事
5. 在故事中的角色定位

請以 JSON 格式返回角色列表：
{
  "characters": [
    {
      "name": "角色名",
      "personality": "性格描述",
      "appearance": "外貌描述",
      "background": "背景",
      "role": "主角/配角/反派/其他",
      "traits": ["特徵1", "特徵2"]
    }
  ]
}

小說片段：
`,

  plotAnalysis: `分析以下小說片段的劇情結構，識別：
1. 故事發展階段（開端/發展/高潮/結局）
2. 主要衝突類型
3. 關鍵事件
4. 轉折點

請以 JSON 格式返回：
{
  "stage": "故事階段",
  "conflicts": ["衝突1", "衝突2"],
  "keyEvents": ["事件1", "事件2"],
  "turningPoints": ["轉折1"]
}

小說片段：
`,

  styleAnalysis: `分析以下小說的寫作風格，包括：
1. 敘事視角（第一/第三人稱）
2. 語言風格（幽默/嚴肅/詩意等）
3. 節奏（緊湊/舒緩）
4. 常用修辭手法
5. 特色詞彙或句式

請以 JSON 格式返回：
{
  "perspective": "敘事視角",
  "tone": "語調",
  "style": "風格描述",
  "pacing": "節奏",
  "rhetoric": ["修辭1", "修辭2"],
  "vocabulary": ["特色詞彙"]
}

小說片段：
`
};

export class NovelAnalysisService {
  private analysisCache = new Map<string, DetailedAnalysis>();

  /**
   * 分析小說並生成模板
   */
  async analyzeNovel(
    parseResult: NovelParseResult,
    options: AnalysisOptions = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<NovelTemplate> {
    const { 
      depth = 'standard',
      focusAreas = ['world', 'character', 'plot', 'style'],
      projectId: _projectId
    } = options;

    // 開始分析
    onProgress?.({
      stage: 'preparing',
      current: 0,
      total: 100,
      message: '準備分析小說內容...'
    });

    // 創建分析片段
    const chunks = novelParserService.createAnalysisChunks(parseResult.content);
    const totalChunks = chunks.length * focusAreas.length;
    let processedChunks = 0;

    onProgress?.({
      stage: 'analyzing',
      current: 10,
      total: 100,
      message: `開始分析 ${chunks.length} 個文本片段...`
    });

    // 分析每個片段
    const analysisResults: DetailedAnalysis[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkAnalysis = await this.analyzeChunk(
        chunk, 
        focusAreas,
        _projectId,
        (area) => {
          processedChunks++;
          const progress = 10 + (processedChunks / totalChunks) * 70;
          onProgress?.({
            stage: 'analyzing',
            current: Math.round(progress),
            total: 100,
            message: `分析第 ${i + 1}/${chunks.length} 片段 - ${area}`
          });
        }
      );
      
      analysisResults.push(chunkAnalysis);
    }

    // 聚合分析結果
    onProgress?.({
      stage: 'aggregating',
      current: 80,
      total: 100,
      message: '整合分析結果...'
    });

    const aggregatedAnalysis = this.aggregateAnalysis(analysisResults);

    // 生成模板
    onProgress?.({
      stage: 'generating',
      current: 90,
      total: 100,
      message: '生成小說模板...'
    });

    const template = this.generateTemplate(parseResult, aggregatedAnalysis, depth);

    onProgress?.({
      stage: 'complete',
      current: 100,
      total: 100,
      message: '分析完成！'
    });

    return template;
  }

  /**
   * 分析單個文本片段
   */
  private async analyzeChunk(
    chunk: string,
    focusAreas: string[],
    projectId?: string,
    onAreaComplete?: (area: string) => void
  ): Promise<DetailedAnalysis> {
    const analysis: Partial<DetailedAnalysis> = {
      confidence: 0
    };

    let successCount = 0;

    // 分析世界觀
    if (focusAreas.includes('world')) {
      try {
        const worldResult = await this.analyzeWithAI(
          ANALYSIS_PROMPTS.worldSetting + chunk,
          projectId
        );
        analysis.worldSetting = this.parseWorldSetting(worldResult);
        successCount++;
      } catch (error) {
        console.error('世界觀分析失敗:', error);
      }
      onAreaComplete?.('世界觀');
    }

    // 分析角色
    if (focusAreas.includes('character')) {
      try {
        const characterResult = await this.analyzeWithAI(
          ANALYSIS_PROMPTS.characterAnalysis + chunk,
          projectId
        );
        analysis.characters = this.parseCharacters(characterResult);
        successCount++;
      } catch (error) {
        console.error('角色分析失敗:', error);
      }
      onAreaComplete?.('角色');
    }

    // 分析劇情
    if (focusAreas.includes('plot')) {
      try {
        const plotResult = await this.analyzeWithAI(
          ANALYSIS_PROMPTS.plotAnalysis + chunk,
          projectId
        );
        analysis.plotStructure = this.parsePlotStructure(plotResult);
        successCount++;
      } catch (error) {
        console.error('劇情分析失敗:', error);
      }
      onAreaComplete?.('劇情');
    }

    // 分析風格
    if (focusAreas.includes('style')) {
      try {
        const styleResult = await this.analyzeWithAI(
          ANALYSIS_PROMPTS.styleAnalysis + chunk,
          projectId
        );
        analysis.writingStyle = this.parseWritingStyle(styleResult);
        successCount++;
      } catch (error) {
        console.error('風格分析失敗:', error);
      }
      onAreaComplete?.('風格');
    }

    // 計算置信度
    analysis.confidence = successCount / focusAreas.length;

    return analysis as DetailedAnalysis;
  }

  /**
   * 調用 AI 進行分析
   */
  private async analyzeWithAI(prompt: string, _projectId?: string): Promise<string> {
    try {
      const response = await api.ai.generateText(
        prompt,
        'llama3.2', // 使用默認模型
        {
          temperature: 0.3, // 降低溫度以獲得更穩定的結果
          maxTokens: 800,
          topP: 0.9
        }
      );

      return response;
    } catch (error) {
      console.error('AI 分析失敗:', error);
      throw error;
    }
  }

  /**
   * 解析世界觀設定
   */
  private parseWorldSetting(aiResponse: string): WorldSetting {
    try {
      // 提取 JSON 部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('無法找到 JSON 格式的回應');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        era: parsed.era || '未知時代',
        technology: parsed.technology || '普通',
        society: parsed.society || '未知社會結構',
        specialElements: parsed.specialElements || [],
        geography: parsed.geography,
        culture: parsed.culture
      };
    } catch (error) {
      console.error('解析世界觀設定失敗:', error);
      return {
        era: '未知時代',
        technology: '普通',
        society: '未知社會結構',
        specialElements: []
      };
    }
  }

  /**
   * 解析角色資訊
   */
  private parseCharacters(aiResponse: string): CharacterArchetypeTemplate[] {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      const characters = parsed.characters || [];

      return characters.map((char: any) => ({
        name: char.name || '未命名角色',
        description: `${char.role || '角色'}：${char.personality || ''}`,
        personality: char.personality || '',
        appearance: char.appearance,
        background: char.background,
        commonTraits: char.traits || [],
        typicalRoles: [char.role || '未定義'],
        tags: this.generateCharacterTags(char)
      }));
    } catch (error) {
      console.error('解析角色資訊失敗:', error);
      return [];
    }
  }

  /**
   * 解析劇情結構
   */
  private parsePlotStructure(aiResponse: string): PlotFramework[] {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      
      return [{
        phase: parsed.stage || '未知階段',
        description: `主要衝突：${(parsed.conflicts || []).join('、')}`,
        keyEvents: parsed.keyEvents || [],
        characterDevelopment: parsed.turningPoints?.join('、') || ''
      }];
    } catch (error) {
      console.error('解析劇情結構失敗:', error);
      return [];
    }
  }

  /**
   * 解析寫作風格
   */
  private parseWritingStyle(aiResponse: string): WritingGuidelines {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.getDefaultWritingGuidelines();
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        tone: parsed.tone || '中性',
        style: parsed.style || '標準',
        pacing: parsed.pacing || '適中',
        themes: parsed.themes || [],
        commonTropes: parsed.rhetoric || [],
        avoidances: []
      };
    } catch (error) {
      console.error('解析寫作風格失敗:', error);
      return this.getDefaultWritingGuidelines();
    }
  }

  /**
   * 聚合多個分析結果
   */
  private aggregateAnalysis(results: DetailedAnalysis[]): DetailedAnalysis {
    if (results.length === 0) {
      throw new Error('沒有可聚合的分析結果');
    }

    // 世界觀設定聚合（選擇最常見的）
    const worldSettings = results
      .filter(r => r.worldSetting)
      .map(r => r.worldSetting);
    
    const aggregatedWorldSetting = this.aggregateWorldSettings(worldSettings);

    // 角色聚合（合併並去重）
    const allCharacters = results
      .flatMap(r => r.characters || []);
    
    const aggregatedCharacters = this.aggregateCharacters(allCharacters);

    // 劇情框架聚合
    const allPlotFrameworks = results
      .flatMap(r => r.plotStructure || []);
    
    const aggregatedPlotStructure = this.aggregatePlotFrameworks(allPlotFrameworks);

    // 寫作風格聚合
    const writingStyles = results
      .filter(r => r.writingStyle)
      .map(r => r.writingStyle);
    
    const aggregatedWritingStyle = this.aggregateWritingStyles(writingStyles);

    // 計算平均置信度
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      worldSetting: aggregatedWorldSetting,
      characters: aggregatedCharacters,
      plotStructure: aggregatedPlotStructure,
      writingStyle: aggregatedWritingStyle,
      themes: this.extractThemes(results),
      confidence: avgConfidence
    };
  }

  /**
   * 聚合世界觀設定
   */
  private aggregateWorldSettings(settings: WorldSetting[]): WorldSetting {
    if (settings.length === 0) {
      return {
        era: '未知',
        technology: '普通',
        society: '未知',
        specialElements: []
      };
    }

    // 使用投票機制選擇最常見的設定
    const eraVotes = this.countVotes(settings.map(s => s.era));
    const techVotes = this.countVotes(settings.map(s => s.technology));
    const societyVotes = this.countVotes(settings.map(s => s.society));
    
    // 合併所有特殊元素
    const allSpecialElements = settings.flatMap(s => s.specialElements);
    const uniqueElements = Array.from(new Set(allSpecialElements));

    return {
      era: this.getMostFrequent(eraVotes),
      technology: this.getMostFrequent(techVotes),
      society: this.getMostFrequent(societyVotes),
      specialElements: uniqueElements.slice(0, 10), // 限制數量
      geography: settings.find(s => s.geography)?.geography,
      culture: settings.find(s => s.culture)?.culture
    };
  }

  /**
   * 聚合角色資訊
   */
  private aggregateCharacters(characters: CharacterArchetypeTemplate[]): CharacterArchetypeTemplate[] {
    // 按名稱分組
    const characterMap = new Map<string, CharacterArchetypeTemplate[]>();
    
    characters.forEach(char => {
      const key = char.name.toLowerCase();
      if (!characterMap.has(key)) {
        characterMap.set(key, []);
      }
      characterMap.get(key)!.push(char);
    });

    // 合併相同角色的資訊
    const aggregated: CharacterArchetypeTemplate[] = [];
    
    characterMap.forEach((chars, _name) => {
      if (chars.length === 1) {
        aggregated.push(chars[0]);
      } else {
        // 合併多個版本的角色資訊
        aggregated.push({
          name: chars[0].name,
          description: this.mergeDescriptions(chars.map(c => c.description)),
          personality: this.mergePersonalities(chars.map(c => c.personality)),
          appearance: chars.find(c => c.appearance)?.appearance,
          background: chars.find(c => c.background)?.background,
          commonTraits: Array.from(new Set(chars.flatMap(c => c.commonTraits))),
          typicalRoles: Array.from(new Set(chars.flatMap(c => c.typicalRoles))),
          tags: Array.from(new Set(chars.flatMap(c => c.tags)))
        });
      }
    });

    // 按重要性排序（基於標籤）
    return aggregated
      .sort((a, b) => {
        const aScore = a.tags.includes('主角') ? 10 : a.tags.includes('主要角色') ? 5 : 1;
        const bScore = b.tags.includes('主角') ? 10 : b.tags.includes('主要角色') ? 5 : 1;
        return bScore - aScore;
      })
      .slice(0, 10); // 限制角色數量
  }

  /**
   * 聚合劇情框架
   */
  private aggregatePlotFrameworks(frameworks: PlotFramework[]): PlotFramework[] {
    // 按階段分組
    const stageMap = new Map<string, PlotFramework[]>();
    
    frameworks.forEach(framework => {
      const stage = framework.phase;
      if (!stageMap.has(stage)) {
        stageMap.set(stage, []);
      }
      stageMap.get(stage)!.push(framework);
    });

    // 為每個階段創建聚合版本
    const aggregated: PlotFramework[] = [];
    const stageOrder = ['開端', '發展', '高潮', '結局'];
    
    stageOrder.forEach(stage => {
      const stageFrameworks = Array.from(stageMap.entries())
        .find(([key]) => key.includes(stage))?.[1];
      
      if (stageFrameworks && stageFrameworks.length > 0) {
        aggregated.push({
          phase: stage,
          description: this.mergeDescriptions(stageFrameworks.map(f => f.description)),
          keyEvents: Array.from(new Set(stageFrameworks.flatMap(f => f.keyEvents))),
          characterDevelopment: stageFrameworks
            .map(f => f.characterDevelopment)
            .filter(Boolean)
            .join('；'),
          worldBuilding: stageFrameworks
            .map(f => f.worldBuilding)
            .filter(Boolean)
            .join('；')
        });
      }
    });

    return aggregated;
  }

  /**
   * 聚合寫作風格
   */
  private aggregateWritingStyles(styles: WritingGuidelines[]): WritingGuidelines {
    if (styles.length === 0) {
      return this.getDefaultWritingGuidelines();
    }

    const toneVotes = this.countVotes(styles.map(s => s.tone));
    const styleVotes = this.countVotes(styles.map(s => s.style));
    const pacingVotes = this.countVotes(styles.map(s => s.pacing));

    return {
      tone: this.getMostFrequent(toneVotes),
      style: this.getMostFrequent(styleVotes),
      pacing: this.getMostFrequent(pacingVotes),
      themes: Array.from(new Set(styles.flatMap(s => s.themes))).slice(0, 10),
      commonTropes: Array.from(new Set(styles.flatMap(s => s.commonTropes))).slice(0, 10),
      avoidances: Array.from(new Set(styles.flatMap(s => s.avoidances)))
    };
  }

  /**
   * 生成最終模板
   */
  private generateTemplate(
    parseResult: NovelParseResult,
    analysis: DetailedAnalysis,
    depth: 'basic' | 'standard' | 'deep'
  ): NovelTemplate {
    const baseTemplate = novelParserService.generateTemplatePreview(parseResult);
    
    // 根據分析深度調整內容
    const template: NovelTemplate = {
      id: `import-${Date.now()}`,
      name: baseTemplate.name || '匯入的模板',
      type: baseTemplate.type || 'fantasy',
      description: baseTemplate.description || '',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      worldSetting: analysis.worldSetting || baseTemplate.worldSetting,
      characterArchetypes: analysis.characters.length > 0 
        ? analysis.characters 
        : baseTemplate.characterArchetypes || [],
      plotFramework: analysis.plotStructure.length > 0
        ? analysis.plotStructure
        : baseTemplate.plotFramework || [],
      writingGuidelines: analysis.writingStyle || baseTemplate.writingGuidelines,
      
      aiPromptTemplate: this.generateAIPromptTemplate(analysis, depth),
      
      isCustom: true,
      isActive: true,
      
      // 添加分析元數據
      customSettings: {
        analysisConfidence: analysis.confidence,
        analysisDepth: depth,
        sourceNovel: parseResult.title,
        importDate: new Date().toISOString(),
        statistics: parseResult.statistics
      }
    };

    // 深度分析時添加更多細節
    if (depth === 'deep') {
      template.sampleContent = this.generateSampleContent(parseResult, analysis);
    }

    return template;
  }

  /**
   * 生成 AI 提示模板
   */
  private generateAIPromptTemplate(
    analysis: DetailedAnalysis,
    _depth: string
  ): AIPromptTemplate {
    const worldContext = `
故事設定在${analysis.worldSetting.era}時代，
科技/魔法水平為${analysis.worldSetting.technology}，
社會結構：${analysis.worldSetting.society}。
${analysis.worldSetting.specialElements.length > 0 
  ? `特殊元素包括：${analysis.worldSetting.specialElements.join('、')}` 
  : ''}
`.trim();

    const characterPrompts = analysis.characters.slice(0, 3).map(char => 
      `創建一個${char.personality}的角色，類似於${char.name}`
    );

    const stylePrompts = [
      `使用${analysis.writingStyle.tone}的語調`,
      `保持${analysis.writingStyle.pacing}的節奏`,
      `風格偏向${analysis.writingStyle.style}`
    ];

    return {
      context: worldContext,
      characterPrompts,
      worldPrompts: [
        `描述${analysis.worldSetting.era}時代的場景`,
        `展現${analysis.worldSetting.technology}水平的細節`
      ],
      stylePrompts,
      continuationPrompts: [
        '延續既定的敘事風格',
        '保持角色性格的一致性',
        '符合世界觀設定'
      ]
    };
  }

  /**
   * 生成範例內容
   */
  private generateSampleContent(
    parseResult: NovelParseResult,
    _analysis: DetailedAnalysis
  ): NovelTemplate['sampleContent'] {
    // 從原文中提取範例
    const sentences = parseResult.content.split(/[。！？]/);
    
    // 尋找開場範例
    const opening = sentences.slice(0, 3).join('。') + '。';
    
    // 尋找對話範例
    const dialogues = sentences
      .filter(s => s.includes('「') || s.includes('"'))
      .slice(0, 5)
      .map(s => s.trim() + '。');
    
    // 尋找描述範例
    const descriptions = sentences
      .filter(s => s.length > 20 && !s.includes('「') && !s.includes('"'))
      .slice(0, 5)
      .map(s => s.trim() + '。');

    return {
      opening,
      dialogue: dialogues,
      description: descriptions
    };
  }

  // 輔助方法

  private generateCharacterTags(character: any): string[] {
    const tags: string[] = [];
    
    if (character.role?.includes('主角')) tags.push('主角');
    else if (character.role?.includes('配角')) tags.push('配角');
    else if (character.role?.includes('反派')) tags.push('反派');
    
    if (character.traits?.length > 3) tags.push('複雜角色');
    if (character.background) tags.push('有背景故事');
    
    return tags;
  }

  private countVotes(items: string[]): Map<string, number> {
    const votes = new Map<string, number>();
    items.forEach(item => {
      votes.set(item, (votes.get(item) || 0) + 1);
    });
    return votes;
  }

  private getMostFrequent(votes: Map<string, number>): string {
    let maxVotes = 0;
    let winner = '';
    
    votes.forEach((count, item) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = item;
      }
    });
    
    return winner;
  }

  private mergeDescriptions(descriptions: string[]): string {
    const unique = Array.from(new Set(descriptions.filter(Boolean)));
    if (unique.length === 0) return '';
    if (unique.length === 1) return unique[0];
    
    // 選擇最長的描述作為主要描述
    return unique.sort((a, b) => b.length - a.length)[0];
  }

  private mergePersonalities(personalities: string[]): string {
    const all = personalities.filter(Boolean).join('、');
    const traits = all.split(/[、，,]/)
      .map(t => t.trim())
      .filter(Boolean);
    
    // 去重並限制數量
    return Array.from(new Set(traits)).slice(0, 5).join('、');
  }

  private extractThemes(results: DetailedAnalysis[]): string[] {
    const allThemes = results.flatMap(r => r.writingStyle?.themes || []);
    
    // 計算主題頻率
    const themeCount = new Map<string, number>();
    allThemes.forEach(theme => {
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
    });
    
    // 按頻率排序
    return Array.from(themeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme)
      .slice(0, 10);
  }

  private getDefaultWritingGuidelines(): WritingGuidelines {
    return {
      tone: '中性',
      style: '標準敘事',
      pacing: '適中',
      themes: [],
      commonTropes: [],
      avoidances: []
    };
  }
}

// 創建單例實例
export const novelAnalysisService = new NovelAnalysisService();