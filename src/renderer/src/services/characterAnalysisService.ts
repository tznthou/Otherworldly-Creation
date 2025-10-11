// 角色分析服務
import type { Descendant } from 'slate';
import { analyzeChapterDialogues, ChapterDialogueAnalysis, DialogueExtraction, slateToPlainText } from '../utils/nlpUtils';
import { api } from '../api';
import type { Character } from '../types/character';
import { createLogger } from '../utils/logger';

// 創建模組專用 logger
const log = createLogger('characterAnalysisService');

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
    chapterContent: Descendant[],
    chapterId: string, 
    projectId: string
  ): Promise<ChapterDialogueAnalysis> {
    
    try {
      log.debug('📋 [對話分析] 開始分析章節對話');
      log.debug('📄 [對話分析] 章節內容:', chapterContent);
      
      // 1. 獲取專案中的所有角色
      const characters = await api.characters.getByProjectId(projectId);
      log.debug('👥 [對話分析] 載入角色:', { count: characters.length });
      
      // 2. 轉換角色格式，包含可能的別名
      const knownCharacters = characters.map(char => ({
        id: char.id,
        name: char.name,
        aliases: this.extractCharacterAliases(char.name, char.background || '')
      }));
      
      log.debug('🔧 [對話分析] 處理後的角色列表:', knownCharacters);
      
      // 3. 分析章節對話
      log.debug('🔍 [對話分析] 開始提取對話...');
      const analysis = analyzeChapterDialogues(chapterContent, chapterId, knownCharacters);
      
      log.debug('✅ [對話分析] 對話分析完成:', {
        總對話數: analysis.totalDialogues,
        已分配: analysis.characterDialogues.size,
        未分配: analysis.unassignedDialogues.length
      });
      
      return analysis;
      
    } catch (error) {
      log.error('💥 [對話分析] 對話分析失敗:', error);
      console.error('💥 [對話分析] 錯誤詳情:', error instanceof Error ? error.stack : String(error)); // TODO: 複雜模式，需人工轉換
      
      // 返回空的分析結果而不是拋出錯誤
      return {
        chapterId,
        characterDialogues: new Map(),
        totalDialogues: 0,
        unassignedDialogues: [],
        confidence: 0
      };
    }
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
      console.log(`🎭 [角色分析] 開始分析角色 ${characterId} 在章節 ${chapterId}`); // TODO: 複雜模式，需人工轉換
      
      // 1. 獲取章節內容
      const chapter = await api.chapters.getById(chapterId);
      if (!chapter) {
        log.error('❌ [角色分析] 章節不存在:', chapterId);
        throw new Error('章節不存在');
      }
      
      console.log(`📖 [角色分析] 章節載入成功: ${chapter.title || chapterId}`); // TODO: 複雜模式，需人工轉換
      log.debug(`📝 [角色分析] 原始章節內容類型:`, { contentType: typeof chapter.content, content: chapter.content });
      
      // 2. 【重要修復】解析章節內容
      let chapterContent: Descendant[];
      
      if (typeof chapter.content === 'string') {
        try {
          log.debug('🔧 [角色分析] 章節內容是字符串，嘗試JSON解析...');
          chapterContent = JSON.parse(chapter.content);
          log.debug('✅ [角色分析] JSON解析成功，類型:', { type: typeof chapterContent, isArray: Array.isArray(chapterContent) });
        } catch (parseError) {
          log.error('💥 [角色分析] JSON解析失敗:', parseError);
          log.error('💥 [角色分析] 原始內容:', chapter.content);
          throw new Error('章節內容JSON解析失敗');
        }
      } else if (Array.isArray(chapter.content)) {
        log.debug('✅ [角色分析] 章節內容已是陣列格式');
        chapterContent = chapter.content;
      } else {
        log.error('❌ [角色分析] 未知的章節內容格式:', typeof chapter.content);
        throw new Error('未知的章節內容格式');
      }
      
      log.debug(`📄 [角色分析] 解析後章節內容:`, chapterContent);
      log.debug(`📊 [角色分析] 章節內容陣列長度:`, chapterContent.length);
      
      // 3. 獲取角色信息
      const character = await api.characters.getById(characterId);
      if (!character) {
        log.error('❌ [角色分析] 角色不存在:', characterId);
        throw new Error('角色不存在');
      }
      
      console.log(`👤 [角色分析] 角色載入成功: ${character.name}`); // TODO: 複雜模式，需人工轉換
      
      // 4. 分析章節對話
      log.debug('🗣️ [角色分析] 開始分析章節對話...');
      const dialogueAnalysis = await this.analyzeChapterDialogues(
        chapterContent, 
        chapterId, 
        projectId
      );
      
      log.debug(`📊 [角色分析] 對話分析結果:`, {
        總對話數: dialogueAnalysis.totalDialogues,
        已分配對話: dialogueAnalysis.characterDialogues.size,
        未分配對話: dialogueAnalysis.unassignedDialogues.length,
        置信度: (dialogueAnalysis.confidence * 100).toFixed(1) + '%'
      });
      
      // 5. 提取該角色的對話（包含推斷對話）
      const characterDialogues = dialogueAnalysis.characterDialogues.get(characterId) || [];
      console.log(`💬 [角色分析] ${character.name} 的確定對話數:`, characterDialogues.length); // TODO: 複雜模式，需人工轉換
      
      // 6. 【新增】智能推斷可能屬於該角色的未分配對話
      const possibleDialogues = this.inferCharacterDialogues(
        dialogueAnalysis.unassignedDialogues,
        character,
        chapterContent
      );
      
      console.log(`🔮 [角色分析] ${character.name} 的推斷對話數:`, possibleDialogues.length); // TODO: 複雜模式，需人工轉換
      
      // 合併確定的和推斷的對話
      const allDialogues = [...characterDialogues, ...possibleDialogues];
      console.log(`📈 [角色分析] ${character.name} 的總對話數:`, allDialogues.length); // TODO: 複雜模式，需人工轉換
      
      // 7. 【放寬限制】即使對話很少也嘗試分析
      if (allDialogues.length === 0) {
        log.debug(`🔧 [角色分析] 沒有對話，嘗試基礎文本分析...`);
        // 如果完全沒有對話，嘗試基於全文進行基礎分析
        const basicResult = this.performBasicAnalysis(character, chapterContent, chapterId, projectId);
        console.log(`✅ [角色分析] 基礎分析完成，置信度: ${(basicResult.confidence * 100).toFixed(1)}%`); // TODO: 複雜模式，需人工轉換
        return basicResult;
      }
      
      log.debug(`🧠 [角色分析] 開始詳細特徵分析...`);
      
      // 8. 分析角色特徵
      const personality = this.analyzePersonality(allDialogues);
      const linguisticPattern = this.analyzeLinguisticPattern(allDialogues);
      const emotionalAnalysis = this.analyzeEmotionalPattern(allDialogues);
      const behaviorConsistency = this.calculateBehaviorConsistency(allDialogues);
      
      // 9. 計算整體置信度（調整算法）
      const confidence = this.calculateAnalysisConfidence(
        allDialogues,
        personality,
        linguisticPattern
      );
      
      const result: CharacterAnalysisResult = {
        characterId,
        characterName: character.name,
        chapterId,
        projectId,
        dialogues: allDialogues,
        dialogueCount: allDialogues.length,
        personality,
        linguisticPattern,
        emotionalTone: emotionalAnalysis.tone,
        emotionalIntensity: emotionalAnalysis.intensity,
        behaviorConsistency,
        analysisVersion: '1.1', // 版本升級
        confidence,
        analyzedAt: new Date()
      };
      
      console.log(`🎯 [角色分析] ${character.name} 分析完成:`, { // TODO: 複雜模式，需人工轉換
        對話數: result.dialogueCount,
        置信度: (result.confidence * 100).toFixed(1) + '%',
        情感色調: result.emotionalTone,
        說話風格: result.linguisticPattern.speakingStyle
      });
      
      return result;
      
    } catch (error) {
      log.error('💥 [角色分析] 分析失敗:', error);
      console.error('💥 [角色分析] 錯誤堆棧:', error instanceof Error ? error.stack : String(error)); // TODO: 複雜模式，需人工轉換
      return null;
    }
  }
  
  /**
   * 分析整個專案的角色一致性
   * @param projectId 專案ID
   * @returns 專案角色分析結果
   */
  async analyzeProjectCharacters(projectId: string): Promise<ProjectCharacterAnalysis> {
    
    log.debug('🔍 [專案角色分析] 開始分析專案:', projectId);
    
    // 1. 獲取專案的所有章節和角色
    const [chapters, characters] = await Promise.all([
      api.chapters.getByProjectId(projectId),
      api.characters.getByProjectId(projectId)
    ]);
    
    log.debug('📚 [專案角色分析] 找到章節:', { count: chapters.length });
    log.debug('👥 [專案角色分析] 找到角色:', { count: characters.length });
    
    if (characters.length === 0) {
      log.warn('⚠️ [專案角色分析] 專案中沒有角色設定');
      return {
        projectId,
        characterAnalyses: [],
        overallConsistency: 0,
        analysisDate: new Date()
      };
    }
    
    if (chapters.length === 0) {
      log.warn('⚠️ [專案角色分析] 專案中沒有章節內容');
      return {
        projectId,
        characterAnalyses: [],
        overallConsistency: 0,
        analysisDate: new Date()
      };
    }
    
    const characterAnalyses: CharacterAnalysisResult[] = [];
    
    // 2. 為每個角色分析每個章節
    for (const character of characters) {
      console.log(`🎭 [專案角色分析] 開始分析角色: ${character.name}`); // TODO: 複雜模式，需人工轉換
      
      for (const chapter of chapters) {
        console.log(`  📖 分析章節: ${chapter.title || chapter.id}`); // TODO: 複雜模式，需人工轉換
        
        try {
          const analysis = await this.analyzeCharacterInChapter(
            character.id,
            chapter.id,
            projectId
          );
          
          if (analysis) {
            console.log(`  ✅ 分析成功，對話數: ${analysis.dialogueCount}, 置信度: ${(analysis.confidence * 100).toFixed(1)}%`); // TODO: 複雜模式，需人工轉換
            characterAnalyses.push(analysis);
          } else {
            log.debug(`  ❌ 分析失敗，返回null`);
          }
        } catch (error) {
          log.error(`  💥 分析異常:`, error);
        }
      }
    }
    
    console.log(`🎯 [專案角色分析] 完成分析，總結果數: ${characterAnalyses.length}`); // TODO: 複雜模式，需人工轉換
    
    // 3. 計算整體一致性
    const overallConsistency = this.calculateOverallConsistency(characterAnalyses);
    
    const result = {
      projectId,
      characterAnalyses,
      overallConsistency,
      analysisDate: new Date()
    };
    
    log.debug('📊 [專案角色分析] 最終結果:', result);
    
    return result;
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
    
    log.debug('角色分析結果已準備儲存:', analysisData);
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
      const _nicknamePattern = /[被叫稱作]/g;
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
    _linguisticPattern: LinguisticPattern
  ): number {
    
    let confidence = 0.4; // 提高基礎置信度
    
    // 【改進】更寬鬆的對話數量要求
    if (dialogues.length >= 8) {
      confidence += 0.3;
    } else if (dialogues.length >= 4) {
      confidence += 0.25;
    } else if (dialogues.length >= 2) {
      confidence += 0.15;
    } else if (dialogues.length >= 1) {
      confidence += 0.1; // 即使只有1個對話也給予基本置信度
    }
    
    // 對話品質影響置信度（處理空數組情況）
    if (dialogues.length > 0) {
      const avgConfidence = dialogues.reduce((sum, d) => sum + d.confidence, 0) / dialogues.length;
      confidence += avgConfidence * 0.2; // 降低對話品質的權重
    }
    
    // 分析完整性影響置信度
    const hasPersonality = Object.values(personality).every(v => v > 0);
    if (hasPersonality) confidence += 0.1;
    
    // 【新增】推斷對話的處理
    const inferredDialogues = dialogues.filter(d => d.confidence < 0.8);
    if (inferredDialogues.length > 0) {
      confidence *= 0.9; // 稍微降低推斷對話的整體置信度
    }
    
    return Math.min(1.0, Math.max(0.2, confidence)); // 保證最低20%的置信度
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

  
  /**
   * 智能推斷可能屬於指定角色的對話
   */
  private inferCharacterDialogues(
    unassignedDialogues: DialogueExtraction[],
    character: Character,
    chapterContent: Descendant[]
  ): DialogueExtraction[] {
    
    const inferredDialogues: DialogueExtraction[] = [];
    const plainText = slateToPlainText(chapterContent);
    
    // 創建角色名稱的各種變體
    const nameVariants = this.generateNameVariants(character.name);
    
    unassignedDialogues.forEach(dialogue => {
      // 檢查對話前後文本中是否提到該角色
      const contextStart = Math.max(0, dialogue.position - 100);
      const contextEnd = Math.min(plainText.length, dialogue.position + dialogue.dialogue.length + 100);
      const surroundingText = plainText.slice(contextStart, contextEnd);
      
      // 如果上下文中出現角色名稱，推斷為該角色的對話
      for (const variant of nameVariants) {
        if (surroundingText.includes(variant)) {
          dialogue.speakerId = character.id;
          dialogue.speakerName = character.name;
          dialogue.confidence = Math.min(dialogue.confidence, 0.7); // 降低推斷對話的置信度
          inferredDialogues.push(dialogue);
          break;
        }
      }
    });
    
    return inferredDialogues;
  }
  
  /**
   * 生成角色名稱的各種變體
   */
  private generateNameVariants(fullName: string): string[] {
    const variants = [fullName];
    
    // 如果是中文名字，生成常見變體
    if (/[\u4e00-\u9fa5]/.test(fullName)) {
      if (fullName.length >= 2) {
        variants.push(fullName.substring(0, 1)); // 姓氏
        variants.push(fullName.substring(1)); // 名字
      }
      if (fullName.length >= 3) {
        variants.push(fullName.substring(0, 2)); // 姓+名的第一個字
        variants.push(fullName.substring(fullName.length - 1)); // 最後一個字
      }
    }
    
    // 添加常見稱呼
    variants.push(`小${fullName.substring(fullName.length - 1)}`);
    variants.push(`老${fullName.substring(0, 1)}`);
    
    return [...new Set(variants)]; // 去重
  }
  
  /**
   * 當沒有對話時，基於全文進行基礎分析
   */
  private performBasicAnalysis(
    character: Character,
    chapterContent: Descendant[],
    chapterId: string,
    projectId: string
  ): CharacterAnalysisResult {
    
    const plainText = slateToPlainText(chapterContent);
    const nameVariants = this.generateNameVariants(character.name);
    
    // 統計角色在文中的出現次數
    let mentionCount = 0;
    nameVariants.forEach(variant => {
      const matches = plainText.split(variant).length - 1;
      mentionCount += matches;
    });
    
    // 基於文本內容進行簡單的情感分析
    const textAnalysis = this.analyzeTextContent(plainText, nameVariants);
    
    return {
      characterId: character.id,
      characterName: character.name,
      chapterId,
      projectId,
      dialogues: [],
      dialogueCount: 0,
      personality: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: mentionCount > 5 ? 0.6 : 0.4, // 出現頻率暗示活躍度
        agreeableness: 0.5,
        neuroticism: textAnalysis.stressLevel
      },
      linguisticPattern: {
        vocabularyRichness: 0.5,
        sentenceComplexity: 0.5,
        averageDialogueLength: 0,
        commonWords: [],
        speakingStyle: '資料不足型：需要更多對話內容進行分析'
      },
      emotionalTone: textAnalysis.tone,
      emotionalIntensity: textAnalysis.intensity,
      behaviorConsistency: 0.5,
      analysisVersion: '1.1-basic',
      confidence: Math.min(0.3, mentionCount * 0.05), // 基於提及次數的低置信度
      analyzedAt: new Date()
    };
  }
  
  /**
   * 分析文本內容中與角色相關的情感
   */
  private analyzeTextContent(text: string, nameVariants: string[]): {
    tone: 'positive' | 'negative' | 'neutral' | 'mixed';
    intensity: number;
    stressLevel: number;
  } {
    
    // 在提到角色的句子中分析情感
    const sentences = text.split(/[。！？]/).filter(s => s.length > 0);
    const relevantSentences = sentences.filter(sentence => 
      nameVariants.some(variant => sentence.includes(variant))
    );
    
    if (relevantSentences.length === 0) {
      return { tone: 'neutral', intensity: 0.1, stressLevel: 0.5 };
    }
    
    // 簡單的情感詞統計
    const positiveWords = ['好', '棒', '開心', '高興', '成功', '勝利', '笑', '幸福'];
    const negativeWords = ['壞', '糟', '生氣', '難過', '失敗', '哭', '痛苦', '擔心'];
    const stressWords = ['緊張', '焦慮', '害怕', '恐懼', '壓力', '煩惱'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let stressCount = 0;
    
    relevantSentences.forEach(sentence => {
      positiveWords.forEach(word => {
        positiveCount += (sentence.match(new RegExp(word, 'g')) || []).length;
      });
      negativeWords.forEach(word => {
        negativeCount += (sentence.match(new RegExp(word, 'g')) || []).length;
      });
      stressWords.forEach(word => {
        stressCount += (sentence.match(new RegExp(word, 'g')) || []).length;
      });
    });
    
    const totalEmotional = positiveCount + negativeCount;
    const intensity = Math.min(1.0, totalEmotional / relevantSentences.length);
    const stressLevel = Math.min(1.0, stressCount / relevantSentences.length + 0.2);
    
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
    
    return { tone, intensity, stressLevel };
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