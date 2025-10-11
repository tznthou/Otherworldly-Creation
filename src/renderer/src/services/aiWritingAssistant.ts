// AI 寫作助手 - 整合 Compromise.js NLP 分析的智能續寫服務
import { createLogger } from '../utils/logger';
import {
analyzeText, 
  extractEntities, 
  calculateWritingMetrics, 
  getPartOfSpeech as _getPartOfSpeech,
  type TextAnalysis,
  type EntityExtraction,
  type WritingMetrics
} from '../utils/nlpUtils';

// 創建模組專用 logger
const log = createLogger('aiWritingAssistant');

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
  log.debug('🔍 開始 NLP 上下文分析...');
  
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
  
  log.debug('📊 NLP 分析完成:', {
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
 * 檢測是否為免費 API
 */
export function isFreeAPI(currentModel: string, providerType: string): boolean {
  // 🔥 OpenRouter 免費模型檢測（模型名包含 'free'）
  if (providerType === 'openrouter' || currentModel.includes('openrouter')) {
    return currentModel.toLowerCase().includes('free');
  }
  
  // Gemini 免費版檢測
  if (providerType === 'gemini' || currentModel.includes('gemini')) {
    // OpenRouter 的 Gemini 是付費的（除非明確標註 free）
    if (currentModel.includes('google/') || currentModel.includes('openrouter')) {
      return currentModel.toLowerCase().includes('free');
    }
    // 直接使用 Gemini API 的情況，大多數是免費版
    return true;
  }
  
  // Ollama 本地模型視為免費
  if (providerType === 'ollama') {
    return true;
  }
  
  // 其他 API 提供者的免費模型檢測
  if (currentModel.toLowerCase().includes('free')) {
    return true;
  }
  
  // 其他情況預設為付費
  return false;
}

/**
 * 根據 API 類型建議版本數量
 */
export function getRecommendedVersionCount(currentModel: string, providerType: string): number {
  if (isFreeAPI(currentModel, providerType)) {
    return 1; // 免費 API 建議單版本
  }
  return 3; // 付費 API 保持多版本
}

/**
 * 根據上下文分析生成智能續寫參數
 */
export function generateSmartParams(
  context: ContextAnalysis, 
  baseTemperature: number = 0.8, 
  baseMaxTokens: number = 500,
  currentModel: string = '',
  providerType: string = ''
): { 
  temperature: number; 
  maxTokens: number; 
  style: string; 
  contextHints: string[]; 
  characterNames: string[];
  locationNames: string[];
  recommendedVersions: number;
  isFreeTier: boolean;
} {
  const { emotionalTone, entities, textAnalysis } = context;
  
  let temperature = baseTemperature;
  let maxTokens = baseMaxTokens;
  
  // 根據情緒調整參數
  if (emotionalTone === 'romantic' || emotionalTone === 'peaceful') {
    temperature *= 1.1; // 提高創造性
    maxTokens = Math.min(maxTokens * 1.2, 800);
  } else if (emotionalTone === 'action' || emotionalTone === 'dramatic') {
    temperature *= 0.9; // 保持連貫
    maxTokens = Math.min(maxTokens * 0.8, 400); // 短句更有力
  }
  
  // 根據文本複雜度調整
  if (textAnalysis.complexity === 'complex') {
    temperature *= 1.05; // 複雜文本需要多樣性
  }
  
  // 🔥 修復 Gemini token 限制 - 根據實際配額提高限制值
  if (currentModel && currentModel.includes('gemini-2.5-flash')) {
    // Gemini 2.5 Flash 實際支持更高的輸出 tokens
    maxTokens = Math.max(maxTokens, 1000); // 🚀 從 650 提升到 1000
    log.debug(`🎯 檢測到 Gemini 2.5 Flash，使用優化 token 限制: ${maxTokens}`);
  } else if (currentModel && currentModel.includes('gemini-2.5-pro')) {
    // Gemini 2.5 Pro 支持更高的 token 數
    maxTokens = Math.max(maxTokens, 1200); // 🚀 從 1000 提升到 1200
    log.debug(`🧠 檢測到 Gemini 2.5 Pro，使用高性能 token 限制: ${maxTokens}`);
  } else if (currentModel && (currentModel.includes('gemini-1.5-pro') || currentModel.includes('gemini-pro'))) {
    // Gemini 1.5 Pro 系列：較舊但穩定的模型
    maxTokens = Math.max(maxTokens, 1000); // 保持 1000
    log.debug(`✨ 檢測到 Gemini 1.5 Pro 系列，使用標準 token 限制: ${maxTokens}`);
  } else if (currentModel && currentModel.includes('claude')) {
    // Claude 模型通常支持較長的輸出
    maxTokens = Math.max(maxTokens, 1500);
    log.debug(`🤖 檢測到 Claude 模型，使用擴展 token 限制: ${maxTokens}`);
  } else if (currentModel && currentModel.includes('gpt-4')) {
    // GPT-4 模型
    maxTokens = Math.max(maxTokens, 1200);
    log.debug(`🚀 檢測到 GPT-4 模型，使用擴展 token 限制: ${maxTokens}`);
  }
  
  // 確保最小值
  temperature = Math.max(0.3, Math.min(1.2, temperature));
  maxTokens = Math.max(300, maxTokens); // 🚀 提高最小值從 200 到 300 tokens
  
  // 生成風格描述
  const styleElements = [];
  if (emotionalTone) styleElements.push(`${emotionalTone}風格`);
  if (context.narrativeStyle) styleElements.push(`${context.narrativeStyle}人稱敘事`);
  if (textAnalysis.complexity === 'complex') styleElements.push('複雜敘述');
  
  const style = styleElements.length > 0 
    ? styleElements.join('、')
    : '標準敘事風格';
  
  // 生成上下文提示
  const contextHints = [];
  if (emotionalTone === 'peaceful') contextHints.push('保持平和積極的語調');
  if (emotionalTone === 'dramatic') contextHints.push('營造緊張戲劇化的氛圍');
  if (entities.people.length > 2) contextHints.push('注意多角色互動');
  if (textAnalysis.sentences > 10) contextHints.push('保持長篇敘述的連貫性');
  
  // 🔥 檢測 API 類型並計算建議設置
  const isFreeTier = isFreeAPI(currentModel, providerType);
  const recommendedVersions = getRecommendedVersionCount(currentModel, providerType);
  
  return {
    temperature,
    maxTokens,
    style,
    contextHints,
    characterNames: entities.people || [],
    locationNames: entities.places || [],
    recommendedVersions,
    isFreeTier
  };
}

/**
 * 檢查生成文本的品質和一致性
 */
export function checkGeneratedQuality(originalText: string, generatedText: string, context: ContextAnalysis): QualityCheck {
  log.debug('🔍 檢查生成文本品質...');
  
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
  
  log.debug('📋 品質檢查完成:', {
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