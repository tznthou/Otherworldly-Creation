// AI 寫作助手 - 整合 Compromise.js NLP 分析的智能續寫服務
import { 
  analyzeText, 
  extractEntities, 
  calculateWritingMetrics, 
  getPartOfSpeech as _getPartOfSpeech,
  type TextAnalysis,
  type EntityExtraction,
  type WritingMetrics 
} from '../utils/nlpUtils';

export interface ContextAnalysis {
  textAnalysis: TextAnalysis;
  entities: EntityExtraction;
  writingMetrics: WritingMetrics;
  dominantTense: 'past' | 'present' | 'future';
  narrativeStyle: 'first' | 'third' | 'mixed';
  emotionalTone: 'dramatic' | 'peaceful' | 'mysterious' | 'romantic' | 'action';
}

export interface SmartGenerationParams {
  temperature: number;
  maxTokens: number;
  style: string;
  contextHints: string[];
  characterNames: string[];
  locationNames: string[];
}

export interface QualityCheck {
  coherence: number; // 0-1, 連貫性評分
  styleConsistency: number; // 0-1, 風格一致性
  suggestions: string[];
  warnings: string[];
}

/**
 * 分析文本上下文，提取寫作風格和關鍵信息
 */
export function analyzeWritingContext(text: string): ContextAnalysis {
  console.log('🔍 開始 NLP 上下文分析...');
  
  // 基礎文本分析
  const textAnalysis = analyzeText(text);
  const entities = extractEntities(text);
  const writingMetrics = calculateWritingMetrics(text);
  
  // 分析時態
  const dominantTense = analyzeDominantTense(text);
  
  // 分析敘述風格
  const narrativeStyle = analyzeNarrativeStyle(text);
  
  // 分析情感基調
  const emotionalTone = analyzeEmotionalTone(text);
  
  console.log('📊 NLP 分析完成:', {
    words: textAnalysis.words,
    entities: Object.keys(entities).length,
    tense: dominantTense,
    style: narrativeStyle,
    tone: emotionalTone
  });
  
  return {
    textAnalysis,
    entities,
    writingMetrics,
    dominantTense,
    narrativeStyle,
    emotionalTone
  };
}

/**
 * 根據上下文分析生成智能續寫參數
 */
export function generateSmartParams(context: ContextAnalysis, userTemp?: number, userMaxTokens?: number, currentModel?: string): SmartGenerationParams {
  console.log('🎯 生成智能續寫參數...');
  
  // 根據文本複雜度調整溫度
  let temperature = userTemp || 0.7;
  
  if (context.textAnalysis.complexity === 'complex') {
    temperature = Math.min(temperature + 0.1, 0.9); // 複雜文本需要更多創意
  } else if (context.textAnalysis.complexity === 'simple') {
    temperature = Math.max(temperature - 0.1, 0.3); // 簡單文本保持穩定
  }
  
  // 根據情感基調調整
  switch (context.emotionalTone) {
    case 'action':
      temperature = Math.min(temperature + 0.15, 0.95);
      break;
    case 'peaceful':
      temperature = Math.max(temperature - 0.1, 0.4);
      break;
    case 'mysterious':
      temperature = Math.min(temperature + 0.1, 0.85);
      break;
  }
  
  // 根據文本長度調整 maxTokens - 🔥 使用用戶設定值作為基礎，並考慮模型特定限制
  const avgSentenceLength = context.writingMetrics.averageSentenceLength;
  let maxTokens = userMaxTokens || 600; // 🔥 使用用戶設定的值，預設 600
  
  // 🎯 模型特定的 token 限制策略 - 根據官方文檔優化
  if (currentModel && currentModel.includes('gemini-2.5-flash')) {
    // 官方文檔：Gemini 2.5 Flash 支持 65,536 輸出 tokens
    // 但實際可能有嚴格的 API 配額限制，使用極度保守策略
    const ultraConservativeLimit = Math.min(100, Math.floor(maxTokens * 0.25)); // 極度保守：用戶設定的25%，最大100
    maxTokens = Math.max(60, ultraConservativeLimit); // 最小60，最大100
    console.log(`🎯 檢測到 Gemini 2.5 Flash，使用極度保守 token 限制: ${maxTokens} (官方支持65536，但實際API限制更嚴格)`);
  } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
    // Gemini 2.5 Pro：與 2.5 Flash 相同的官方限制，但推理能力更強
    // 採用中等保守策略，比 2.5 Flash 稍高但仍然謹慎
    const moderateConservativeLimit = Math.min(300, Math.floor(maxTokens * 0.5)); // 用戶設定的50%，最大300
    maxTokens = Math.max(200, moderateConservativeLimit); // 最小200，最大300
    console.log(`🧠 檢測到 Gemini 2.5 Pro，使用中等保守 token 限制: ${maxTokens} (比2.5-Flash寬鬆但仍謹慎)`);
  } else if (currentModel && (currentModel.includes('gemini-1.5-pro') || currentModel.includes('gemini-pro'))) {
    // Gemini 1.5 Pro 系列：較舊但穩定的模型，支持更高的token限制
    maxTokens = Math.min(maxTokens, 800); // 限制在800以內以確保穩定性
    console.log(`✨ 檢測到 Gemini 1.5 Pro 系列，使用標準 token 限制: ${maxTokens}`);
  }
  
  // 根據句長進行微調，但不超出合理範圍
  if (avgSentenceLength > 15) {
    maxTokens = Math.min(maxTokens + 30, maxTokens * 1.15); // 長句子適度增加（減少變化幅度）
  } else if (avgSentenceLength < 8) {
    maxTokens = Math.max(maxTokens - 30, maxTokens * 0.85); // 短句子適度減少
  }
  
  maxTokens = Math.round(maxTokens); // 確保為整數
  
  // 構建風格描述
  const styleElements = [];
  styleElements.push(`使用${context.dominantTense === 'past' ? '過去式' : context.dominantTense === 'present' ? '現在式' : '未來式'}敘述`);
  styleElements.push(`採用${context.narrativeStyle === 'first' ? '第一人稱' : '第三人稱'}視角`);
  styleElements.push(`保持${context.emotionalTone}的情感基調`);
  
  if (context.writingMetrics.adjectiveUsage > 0.15) {
    styleElements.push('豐富的形容詞描述');
  }
  
  if (context.writingMetrics.sentenceVariety > 0.3) {
    styleElements.push('多樣化的句式結構');
  }
  
  const style = styleElements.join('，');
  
  // 提取上下文提示
  const contextHints = [];
  
  if (context.entities.people.length > 0) {
    contextHints.push(`故事角色：${context.entities.people.slice(0, 3).join('、')}`);
  }
  
  if (context.entities.places.length > 0) {
    contextHints.push(`場景地點：${context.entities.places.slice(0, 2).join('、')}`);
  }
  
  if (context.entities.times.length > 0) {
    contextHints.push(`時間背景：${context.entities.times.slice(0, 2).join('、')}`);
  }
  
  console.log('✨ 智能參數生成完成:', {
    temperature,
    maxTokens,
    style,
    contextHints: contextHints.length
  });
  
  return {
    temperature,
    maxTokens,
    style,
    contextHints,
    characterNames: context.entities.people,
    locationNames: context.entities.places
  };
}

/**
 * 檢查生成文本的品質和一致性
 */
export function checkGeneratedQuality(originalText: string, generatedText: string, context: ContextAnalysis): QualityCheck {
  console.log('🔍 檢查生成文本品質...');
  
  const generatedAnalysis = analyzeWritingContext(generatedText);
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  // 檢查風格一致性
  let styleConsistency = 1.0;
  
  // 時態一致性
  if (context.dominantTense !== generatedAnalysis.dominantTense) {
    styleConsistency -= 0.3;
    warnings.push(`時態不一致：原文使用${context.dominantTense}式，生成文本使用${generatedAnalysis.dominantTense}式`);
  }
  
  // 敘述風格一致性
  if (context.narrativeStyle !== generatedAnalysis.narrativeStyle) {
    styleConsistency -= 0.2;
    warnings.push(`敘述視角不一致：原文是${context.narrativeStyle}人稱，生成文本是${generatedAnalysis.narrativeStyle}人稱`);
  }
  
  // 情感基調一致性
  if (context.emotionalTone !== generatedAnalysis.emotionalTone) {
    styleConsistency -= 0.1;
    suggestions.push(`情感基調有變化：從${context.emotionalTone}轉為${generatedAnalysis.emotionalTone}`);
  }
  
  // 檢查連貫性
  let coherence = 1.0;
  
  // 角色名稱一致性
  const originalCharacters = new Set(context.entities.people);
  const generatedCharacters = new Set(generatedAnalysis.entities.people);
  const newCharacters = [...generatedCharacters].filter(char => !originalCharacters.has(char));
  
  if (newCharacters.length > 0) {
    coherence -= 0.1;
    suggestions.push(`新增角色：${newCharacters.join('、')}`);
  }
  
  // 場景一致性
  const originalPlaces = new Set(context.entities.places);
  const generatedPlaces = new Set(generatedAnalysis.entities.places);
  const newPlaces = [...generatedPlaces].filter(place => !originalPlaces.has(place));
  
  if (newPlaces.length > 0) {
    coherence -= 0.05;
    suggestions.push(`新增場景：${newPlaces.join('、')}`);
  }
  
  // 文本長度合理性
  const lengthRatio = generatedAnalysis.textAnalysis.words / context.textAnalysis.words;
  if (lengthRatio > 2.0) {
    coherence -= 0.1;
    warnings.push('生成文本過長，可能偏離主題');
  } else if (lengthRatio < 0.1) {
    coherence -= 0.1;
    warnings.push('生成文本過短，內容可能不足');
  }
  
  console.log('📋 品質檢查完成:', {
    coherence: Math.max(0, coherence),
    styleConsistency: Math.max(0, styleConsistency),
    suggestions: suggestions.length,
    warnings: warnings.length
  });
  
  return {
    coherence: Math.max(0, coherence),
    styleConsistency: Math.max(0, styleConsistency),
    suggestions,
    warnings
  };
}

/**
 * 分析主要時態
 */
function analyzeDominantTense(text: string): 'past' | 'present' | 'future' {
  // 簡化的時態分析，基於關鍵詞
  const pastIndicators = ['了', '過', '曾經', '已經', '剛才', '昨天', '去年'];
  const presentIndicators = ['正在', '現在', '目前', '當下', '此刻'];
  const futureIndicators = ['將', '會', '要', '即將', '未來', '明天', '下週'];
  
  let pastScore = 0;
  let presentScore = 0;
  let futureScore = 0;
  
  pastIndicators.forEach(indicator => {
    pastScore += (text.match(new RegExp(indicator, 'g')) || []).length;
  });
  
  presentIndicators.forEach(indicator => {
    presentScore += (text.match(new RegExp(indicator, 'g')) || []).length;
  });
  
  futureIndicators.forEach(indicator => {
    futureScore += (text.match(new RegExp(indicator, 'g')) || []).length;
  });
  
  if (pastScore >= presentScore && pastScore >= futureScore) return 'past';
  if (futureScore >= presentScore) return 'future';
  return 'present';
}

/**
 * 分析敘述風格
 */
function analyzeNarrativeStyle(text: string): 'first' | 'third' | 'mixed' {
  const firstPersonIndicators = ['我', '我們', '我的', '我們的'];
  const thirdPersonIndicators = ['他', '她', '它', '他們', '她們', '它們'];
  
  let firstPersonCount = 0;
  let thirdPersonCount = 0;
  
  firstPersonIndicators.forEach(indicator => {
    firstPersonCount += (text.match(new RegExp(indicator, 'g')) || []).length;
  });
  
  thirdPersonIndicators.forEach(indicator => {
    thirdPersonCount += (text.match(new RegExp(indicator, 'g')) || []).length;
  });
  
  const ratio = firstPersonCount / (thirdPersonCount + 1);
  
  if (ratio > 2) return 'first';
  if (ratio < 0.5) return 'third';
  return 'mixed';
}

/**
 * 分析情感基調
 */
function analyzeEmotionalTone(text: string): 'dramatic' | 'peaceful' | 'mysterious' | 'romantic' | 'action' {
  const emotionalKeywords = {
    dramatic: ['驚訝', '震驚', '激動', '憤怒', '悲傷', '痛苦', '絕望', '狂歡'],
    peaceful: ['平靜', '寧靜', '安詳', '溫和', '舒適', '放鬆', '和諧', '輕鬆'],
    mysterious: ['神秘', '詭異', '奇怪', '隱藏', '秘密', '未知', '陰暗', '謎團'],
    romantic: ['愛情', '浪漫', '溫柔', '甜蜜', '心動', '深情', '擁抱', '親吻'],
    action: ['戰鬥', '追逐', '奔跑', '攻擊', '防禦', '速度', '力量', '衝突']
  };
  
  const scores: Record<string, number> = {};
  
  Object.entries(emotionalKeywords).forEach(([emotion, keywords]) => {
    scores[emotion] = 0;
    keywords.forEach(keyword => {
      scores[emotion] += (text.match(new RegExp(keyword, 'g')) || []).length;
    });
  });
  
  const maxEmotion = Object.entries(scores).reduce((max, [emotion, score]) => 
    score > max.score ? { emotion, score } : max
  , { emotion: 'peaceful', score: 0 });
  
  return maxEmotion.emotion as 'dramatic' | 'peaceful' | 'mysterious' | 'romantic' | 'action';
}