// 角色分析服務
import { extractDialogues, analyzeChapterDialogues, ChapterDialogueAnalysis, DialogueExtraction } from '../utils/nlpUtils';
import { api } from '../api';

export interface CharacterPersonality {
  // Big Five 人格特徵
  openness: number;           // 開放性 (0-1)
  conscientiousness: number;  // 盡責性 (0-1)  
  extraversion: number;       // 外向性 (0-1)
  agreeableness: number;      // 親和性 (0-1)
  neuroticism: number;        // 神經質 (0-1)
}

export interface LinguisticPattern {
  vocabularyRichness: number;     // 詞彙豐富度
  sentenceComplexity: number;     // 句子複雜度
  averageDialogueLength: number;  // 平均對話長度
  commonWords: string[];          // 常用詞彙
  speakingStyle: string;          // 說話風格描述
}

export interface CharacterAnalysisResult {
  characterId: string;
  characterName: string;
  chapterId: string;
  projectId: string;
  
  // 對話數據
  dialogues: DialogueExtraction[];
  dialogueCount: number;
  
  // 人格分析
  personality: CharacterPersonality;
  
  // 語言模式
  linguisticPattern: LinguisticPattern;
  
  // 情感分析
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotionalIntensity: number;
  
  // 行為一致性
  behaviorConsistency: number;
  
  // 分析元數據
  analysisVersion: string;
  confidence: number;
  analyzedAt: Date;
}

export interface ProjectCharacterAnalysis {
  projectId: string;
  characterAnalyses: CharacterAnalysisResult[];
  overallConsistency: number;
  analysisDate: Date;
}

class CharacterAnalysisService {
  
  /**
   * 分析單個章節的角色對話
   * @param chapterContent Slate.js 章節內容
   * @param chapterId 章節ID  
   * @param projectId 專案ID
   * @returns 章節對話分析結果
   */
  async analyzeChapterDialogues(
    chapterContent: any[],
    chapterId: string, 
    projectId: string
  ): Promise<ChapterDialogueAnalysis> {
    
    // 1. 獲取專案中的所有角色
    const characters = await api.characters.getByProjectId(projectId);
    
    // 2. 轉換角色格式，包含可能的別名
    const knownCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      aliases: this.extractCharacterAliases(char.name, char.description)
    }));
    
    // 3. 分析章節對話
    const analysis = analyzeChapterDialogues(chapterContent, chapterId, knownCharacters);
    
    return analysis;
  }
  
  /**
   * 分析單個角色在特定章節中的表現
   * @param characterId 角色ID
   * @param chapterId 章節ID  
   * @param projectId 專案ID
   * @returns 角色分析結果
   */
  async analyzeCharacterInChapter(
    characterId: string,
    chapterId: string,
    projectId: string
  ): Promise<CharacterAnalysisResult | null> {
    
    try {
      // 1. 獲取章節內容
      const chapter = await api.chapters.getById(chapterId);
      if (!chapter) {
        throw new Error('章節不存在');
      }
      
      // 2. 獲取角色信息
      const character = await api.characters.getById(characterId);
      if (!character) {
        throw new Error('角色不存在');
      }
      
      // 3. 分析章節對話
      const dialogueAnalysis = await this.analyzeChapterDialogues(
        JSON.parse(chapter.content), 
        chapterId, 
        projectId
      );
      
      // 4. 提取該角色的對話
      const characterDialogues = dialogueAnalysis.characterDialogues.get(characterId) || [];
      
      if (characterDialogues.length === 0) {
        return null; // 該角色在此章節無對話
      }
      
      // 5. 分析角色特徵
      const personality = this.analyzePersonality(characterDialogues);
      const linguisticPattern = this.analyzeLinguisticPattern(characterDialogues);
      const emotionalAnalysis = this.analyzeEmotionalPattern(characterDialogues);
      const behaviorConsistency = this.calculateBehaviorConsistency(characterDialogues);
      
      // 6. 計算整體置信度
      const confidence = this.calculateAnalysisConfidence(
        characterDialogues,
        personality,
        linguisticPattern
      );
      
      const result: CharacterAnalysisResult = {
        characterId,
        characterName: character.name,
        chapterId,
        projectId,
        dialogues: characterDialogues,
        dialogueCount: characterDialogues.length,
        personality,
        linguisticPattern,
        emotionalTone: emotionalAnalysis.tone,
        emotionalIntensity: emotionalAnalysis.intensity,
        behaviorConsistency,
        analysisVersion: '1.0',
        confidence,
        analyzedAt: new Date()
      };
      
      return result;
      
    } catch (error) {
      console.error('角色分析失敗:', error);
      return null;
    }
  }
  
  /**
   * 分析整個專案的角色一致性
   * @param projectId 專案ID
   * @returns 專案角色分析結果
   */
  async analyzeProjectCharacters(projectId: string): Promise<ProjectCharacterAnalysis> {
    
    // 1. 獲取專案的所有章節和角色
    const [chapters, characters] = await Promise.all([
      api.chapters.getByProjectId(projectId),
      api.characters.getByProjectId(projectId)
    ]);
    
    const characterAnalyses: CharacterAnalysisResult[] = [];
    
    // 2. 為每個角色分析每個章節
    for (const character of characters) {
      for (const chapter of chapters) {
        const analysis = await this.analyzeCharacterInChapter(
          character.id,
          chapter.id,
          projectId
        );
        
        if (analysis) {
          characterAnalyses.push(analysis);
        }
      }
    }
    
    // 3. 計算整體一致性
    const overallConsistency = this.calculateOverallConsistency(characterAnalyses);
    
    return {
      projectId,
      characterAnalyses,
      overallConsistency,
      analysisDate: new Date()
    };
  }
  
  /**
   * 儲存角色分析結果到資料庫
   * @param analysis 分析結果
   */
  async saveAnalysisResult(analysis: CharacterAnalysisResult): Promise<void> {
    
    const analysisData = {
      id: `${analysis.characterId}-${analysis.chapterId}-${Date.now()}`,
      character_id: analysis.characterId,
      chapter_id: analysis.chapterId,
      project_id: analysis.projectId,
      
      // JSON 數據
      dialogue_samples: JSON.stringify(analysis.dialogues),
      dialogue_count: analysis.dialogueCount,
      avg_dialogue_length: analysis.linguisticPattern.averageDialogueLength,
      
      // Big Five 人格特徵
      openness: analysis.personality.openness,
      conscientiousness: analysis.personality.conscientiousness,
      extraversion: analysis.personality.extraversion,
      agreeableness: analysis.personality.agreeableness,
      neuroticism: analysis.personality.neuroticism,
      
      // 語言模式
      linguistic_patterns: JSON.stringify({
        commonWords: analysis.linguisticPattern.commonWords,
        speakingStyle: analysis.linguisticPattern.speakingStyle
      }),
      vocabulary_richness: analysis.linguisticPattern.vocabularyRichness,
      sentence_complexity: analysis.linguisticPattern.sentenceComplexity,
      
      // 情感分析
      emotional_tone: analysis.emotionalTone,
      emotional_intensity: analysis.emotionalIntensity,
      
      // 行為模式
      action_patterns: JSON.stringify([]), // TODO: 實現行為模式提取
      behavior_consistency: analysis.behaviorConsistency,
      
      // 元數據
      analysis_version: analysis.analysisVersion,
      confidence_score: analysis.confidence,
      analyzed_at: analysis.analyzedAt.toISOString()
    };
    
    // TODO: 實現儲存到資料庫的 API 調用
    // await api.characterAnalysis.save(analysisData);
    
    console.log('角色分析結果已準備儲存:', analysisData);
  }
  
  // ==============================================
  // 私有分析方法
  // ==============================================
  
  /**
   * 提取角色可能的別名
   */
  private extractCharacterAliases(name: string, description?: string): string[] {
    const aliases: string[] = [];
    
    // 從名字提取可能的暱稱
    if (name.length > 2) {
      aliases.push(name.substring(0, 2)); // 前兩個字
      aliases.push(name.substring(name.length - 1)); // 最後一個字
    }
    
    // 從描述中提取可能的稱呼
    if (description) {
      const nicknamePattern = /[被叫稱作]/g;
      // 簡化實現，實際可以更複雜
    }
    
    return aliases;
  }
  
  /**
   * 分析人格特徵（Big Five 模型）
   */
  private analyzePersonality(dialogues: DialogueExtraction[]): CharacterPersonality {
    
    const allDialogueText = dialogues.map(d => d.dialogue).join(' ');
    
    // 簡化實現 - 基於關鍵詞頻率分析
    // 實際應用可以使用更複雜的 NLP 模型
    
    const openness = this.calculateOpenness(allDialogueText);
    const conscientiousness = this.calculateConscientiousness(allDialogueText);
    const extraversion = this.calculateExtraversion(allDialogueText);
    const agreeableness = this.calculateAgreeableness(allDialogueText);
    const neuroticism = this.calculateNeuroticism(allDialogueText);
    
    return {
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism
    };
  }
  
  /**
   * 分析語言模式
   */
  private analyzeLinguisticPattern(dialogues: DialogueExtraction[]): LinguisticPattern {
    
    const allDialogues = dialogues.map(d => d.dialogue);
    const totalLength = allDialogues.reduce((sum, d) => sum + d.length, 0);
    const averageDialogueLength = totalLength / allDialogues.length;
    
    // 計算詞彙豐富度（不同詞彙數 / 總詞彙數）
    const allWords = allDialogues.join('').split('');
    const uniqueWords = new Set(allWords);
    const vocabularyRichness = uniqueWords.size / allWords.length;
    
    // 計算句子複雜度（平均字數）
    const sentenceComplexity = averageDialogueLength / 10; // 簡化計算
    
    // 提取常用詞彙
    const wordFreq = new Map<string, number>();
    allWords.forEach(word => {
      if (/[\u4e00-\u9fa5]/.test(word)) { // 只統計中文字符
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    const commonWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // 分析說話風格
    const speakingStyle = this.analyzeSpeakingStyle(allDialogues);
    
    return {
      vocabularyRichness,
      sentenceComplexity,
      averageDialogueLength,
      commonWords,
      speakingStyle
    };
  }
  
  /**
   * 分析情感模式
   */
  private analyzeEmotionalPattern(dialogues: DialogueExtraction[]): {
    tone: 'positive' | 'negative' | 'neutral' | 'mixed';
    intensity: number;
  } {
    
    const allText = dialogues.map(d => d.dialogue).join(' ');
    
    // 簡化的情感分析
    const positiveWords = ['好', '棒', '對', '是', '行', '可以', '沒問題', '開心', '高興', '笑'];
    const negativeWords = ['不', '沒', '別', '錯', '壞', '討厭', '生氣', '難過', '哭'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      positiveCount += (allText.match(new RegExp(word, 'g')) || []).length;
    });
    
    negativeWords.forEach(word => {
      negativeCount += (allText.match(new RegExp(word, 'g')) || []).length;
    });
    
    const totalEmotional = positiveCount + negativeCount;
    const intensity = Math.min(1.0, totalEmotional / allText.length * 10);
    
    let tone: 'positive' | 'negative' | 'neutral' | 'mixed';
    
    if (positiveCount > negativeCount * 1.5) {
      tone = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      tone = 'negative';
    } else if (totalEmotional > 0) {
      tone = 'mixed';
    } else {
      tone = 'neutral';
    }
    
    return { tone, intensity };
  }
  
  /**
   * 計算行為一致性
   */
  private calculateBehaviorConsistency(dialogues: DialogueExtraction[]): number {
    // 簡化實現：基於對話長度和風格的變化
    if (dialogues.length < 2) return 1.0;
    
    const lengths = dialogues.map(d => d.dialogue.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    // 計算長度變異係數
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgLength; // 變異係數
    
    // 一致性分數（變異係數越小，一致性越高）
    const consistency = Math.max(0, 1 - cv);
    
    return Math.min(1.0, consistency);
  }
  
  /**
   * 計算分析置信度
   */
  private calculateAnalysisConfidence(
    dialogues: DialogueExtraction[],
    personality: CharacterPersonality,
    linguisticPattern: LinguisticPattern
  ): number {
    
    let confidence = 0.3; // 基礎置信度
    
    // 對話數量影響置信度
    if (dialogues.length >= 10) {
      confidence += 0.3;
    } else if (dialogues.length >= 5) {
      confidence += 0.2;
    } else if (dialogues.length >= 2) {
      confidence += 0.1;
    }
    
    // 對話品質影響置信度
    const avgConfidence = dialogues.reduce((sum, d) => sum + d.confidence, 0) / dialogues.length;
    confidence += avgConfidence * 0.3;
    
    // 分析完整性影響置信度
    const hasPersonality = Object.values(personality).every(v => v > 0);
    if (hasPersonality) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * 計算整體一致性
   */
  private calculateOverallConsistency(analyses: CharacterAnalysisResult[]): number {
    if (analyses.length === 0) return 0;
    
    // 按角色分組
    const byCharacter = new Map<string, CharacterAnalysisResult[]>();
    analyses.forEach(analysis => {
      if (!byCharacter.has(analysis.characterId)) {
        byCharacter.set(analysis.characterId, []);
      }
      byCharacter.get(analysis.characterId)!.push(analysis);
    });
    
    // 計算每個角色的一致性
    const characterConsistencies: number[] = [];
    
    byCharacter.forEach((characterAnalyses) => {
      if (characterAnalyses.length < 2) {
        characterConsistencies.push(1.0); // 只有一個分析，認為完全一致
        return;
      }
      
      // 計算 Big Five 特徵的標準差
      const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
      let totalVariance = 0;
      
      traits.forEach(trait => {
        const values = characterAnalyses.map(a => a.personality[trait]);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        totalVariance += variance;
      });
      
      const avgVariance = totalVariance / traits.length;
      const consistency = Math.max(0, 1 - avgVariance * 2); // 調整係數
      
      characterConsistencies.push(consistency);
    });
    
    // 返回所有角色的平均一致性
    return characterConsistencies.reduce((a, b) => a + b, 0) / characterConsistencies.length;
  }
  
  // Big Five 特徵分析的簡化實現
  private calculateOpenness(text: string): number {
    const openWords = ['想', '覺得', '認為', '可能', '也許', '新', '不同', '創'];
    const count = openWords.reduce((sum, word) => 
      sum + (text.match(new RegExp(word, 'g')) || []).length, 0);
    return Math.min(1.0, count / text.length * 10 + 0.3);
  }
  
  private calculateConscientiousness(text: string): number {
    const conscWords = ['應該', '必須', '一定', '準時', '完成', '責任', '計畫'];
    const count = conscWords.reduce((sum, word) => 
      sum + (text.match(new RegExp(word, 'g')) || []).length, 0);
    return Math.min(1.0, count / text.length * 10 + 0.3);
  }
  
  private calculateExtraversion(text: string): number {
    const extraWords = ['我們', '一起', '聊', '說', '開心', '朋友', '派對'];
    const count = extraWords.reduce((sum, word) => 
      sum + (text.match(new RegExp(word, 'g')) || []).length, 0);
    return Math.min(1.0, count / text.length * 10 + 0.3);
  }
  
  private calculateAgreeableness(text: string): number {
    const agreeWords = ['好', '對', '沒問題', '幫助', '關心', '謝謝', '不好意思'];
    const count = agreeWords.reduce((sum, word) => 
      sum + (text.match(new RegExp(word, 'g')) || []).length, 0);
    return Math.min(1.0, count / text.length * 10 + 0.3);
  }
  
  private calculateNeuroticism(text: string): number {
    const neuroWords = ['擔心', '害怕', '緊張', '焦慮', '不安', '壓力', '難過'];
    const count = neuroWords.reduce((sum, word) => 
      sum + (text.match(new RegExp(word, 'g')) || []).length, 0);
    return Math.min(1.0, count / text.length * 10 + 0.1);
  }
  
  private analyzeSpeakingStyle(dialogues: string[]): string {
    const totalLength = dialogues.reduce((sum, d) => sum + d.length, 0);
    const avgLength = totalLength / dialogues.length;
    
    if (avgLength > 20) {
      return '詳細型：喜歡詳細說明，表達完整';
    } else if (avgLength > 10) {
      return '平衡型：表達適中，邏輯清晰';
    } else {
      return '簡潔型：言簡意賅，直接表達';
    }
  }
}

export const characterAnalysisService = new CharacterAnalysisService();
export default characterAnalysisService;