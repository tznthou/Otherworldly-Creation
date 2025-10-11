// NLP 工具函數
import nlp from 'compromise';
import compromiseDates from 'compromise-dates';
import compromiseStats from 'compromise-stats';
import type { Descendant } from 'slate';
import { createLogger } from './/logger';

// 創建模組專用 logger
const log = createLogger('nlpUtils');

// 擴展 Compromise 功能
nlp.plugin(compromiseDates);
nlp.plugin(compromiseStats);

// Compromise.js 類型定義
interface CompromiseTerm {
  text: string;
  normal: string;
  tags: string[];
  index: number;
  id: string;
}

interface CompromiseSentence {
  text: string;
  terms: CompromiseTerm[];
}

interface ScoredSentence {
  text: string;
  score: number;
  index: number;
}

interface PersonEntity {
  text: string;
  normal: string;
}

interface SpeakerInfo {
  speakerName?: string;
  speakerId?: string;
  attribution?: string;
}

interface SlateText {
  text: string;
}

interface SlateElement {
  type: string;
  children: (SlateText | SlateElement)[];
}

export interface TextAnalysis {
  sentences: number;
  words: number;
  characters: number;
  paragraphs: number;
  readingTime: number; // 分鐘
  sentiment?: 'positive' | 'negative' | 'neutral';
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface EntityExtraction {
  people: string[];
  places: string[];
  organizations: string[];
  dates: string[];
  times: string[];
  numbers: string[];
}

export interface WritingMetrics {
  averageWordLength: number;
  averageSentenceLength: number;
  vocabularyRichness: number; // 唯一詞彙比例
  sentenceVariety: number; // 句子長度變異係數
  adverbUsage: number; // 副詞使用率
  adjectiveUsage: number; // 形容詞使用率
}

export interface POSTag {
  text: string;
  tag: string;
  normal: string;
}

/**
 * 基礎文本分析
 */
export function analyzeText(text: string): TextAnalysis {
  const doc = nlp(text);
  const sentences = doc.sentences().length;
  const words = doc.terms().length;
  const characters = text.length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
  
  // 估算閱讀時間（中文 500 字/分鐘，英文 200 詞/分鐘）
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = doc.match('#Value').length;
  const readingTime = Math.ceil(chineseChars / 500 + englishWords / 200);
  
  // 判斷複雜度
  const avgSentenceLength = words / sentences;
  const complexity = avgSentenceLength > 20 ? 'complex' : 
                    avgSentenceLength > 12 ? 'moderate' : 'simple';

  return {
    sentences,
    words,
    characters,
    paragraphs,
    readingTime,
    complexity
  };
}

/**
 * 提取實體
 */
export function extractEntities(text: string): EntityExtraction {
  const doc = nlp(text);
  
  return {
    people: Array.from(new Set(doc.people().out('array'))) as string[],
    places: Array.from(new Set(doc.places().out('array'))) as string[],
    organizations: Array.from(new Set(doc.organizations().out('array'))) as string[],
    dates: Array.from(new Set(doc.match('#Date').out('array'))) as string[],
    times: Array.from(new Set(doc.match('#Time').out('array'))) as string[],
    numbers: Array.from(new Set(doc.match('#Value').out('array'))) as string[]
  };
}

/**
 * 計算寫作指標
 */
export function calculateWritingMetrics(text: string): WritingMetrics {
  const doc = nlp(text);
  const words = doc.terms().out('array');
  const sentences = doc.sentences().json();
  
  // 平均詞長
  const totalWordLength = words.reduce((sum: number, word: string) => sum + word.length, 0);
  const averageWordLength = totalWordLength / words.length;
  
  // 平均句長
  const sentenceLengths = sentences.map((s: CompromiseSentence) => s.terms.length);
  const averageSentenceLength = sentenceLengths.reduce((a: number, b: number) => a + b, 0) / sentences.length;
  
  // 詞彙豐富度
  const uniqueWords = new Set(words.map((w: string) => w.toLowerCase()));
  const vocabularyRichness = uniqueWords.size / words.length;
  
  // 句子長度變異
  const variance = calculateVariance(sentenceLengths);
  const sentenceVariety = Math.sqrt(variance) / averageSentenceLength;
  
  // 詞性使用率
  const adverbs = doc.match('#Adverb').length;
  const adjectives = doc.match('#Adjective').length;
  const adverbUsage = adverbs / words.length;
  const adjectiveUsage = adjectives / words.length;

  return {
    averageWordLength,
    averageSentenceLength,
    vocabularyRichness,
    sentenceVariety,
    adverbUsage,
    adjectiveUsage
  };
}

/**
 * 獲取詞性標註
 */
export function getPartOfSpeech(text: string): POSTag[] {
  const doc = nlp(text);
  const terms = doc.json()[0]?.terms || [];
  
  return terms.map((term: CompromiseTerm) => ({
    text: term.text,
    tag: term.tags[0] || 'Unknown',
    normal: term.normal
  }));
}

/**
 * 檢測重複短語
 */
export function detectRepetitivePhases(text: string, minLength = 3): Map<string, number> {
  const doc = nlp(text);
  
  // 簡化版本：檢測重複的詞組
  const words = doc.terms().out('array');
  const phrases = new Map<string, number>();
  
  // 生成 n-gram
  for (let i = 0; i <= words.length - minLength; i++) {
    const phrase = words.slice(i, i + minLength).join(' ');
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }
  
  // 只保留重複的短語
  const repetitions = new Map<string, number>();
  phrases.forEach((count, phrase) => {
    if (count > 1) {
      repetitions.set(phrase, count);
    }
  });
  
  // 按頻率排序
  return new Map([...repetitions.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * 生成文本摘要（簡單版）
 */
export function generateSummary(text: string, sentenceCount = 3): string {
  const doc = nlp(text);
  const sentences = doc.sentences().json();
  
  if (sentences.length <= sentenceCount) {
    return text;
  }
  
  // 簡單策略：選擇包含最多名詞的句子
  const scoredSentences = sentences.map((s: CompromiseSentence, index: number) => {
    const sentDoc = nlp(s.text);
    const nounCount = sentDoc.match('#Noun').length;
    const verbCount = sentDoc.match('#Verb').length;
    const score = nounCount * 2 + verbCount;
    
    return { text: s.text, score, index };
  });
  
  // 選擇得分最高的句子，保持原始順序
  const selected = scoredSentences
    .sort((a: ScoredSentence, b: ScoredSentence) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a: ScoredSentence, b: ScoredSentence) => a.index - b.index);
  
  return selected.map((s: ScoredSentence) => s.text).join(' ');
}

/**
 * 檢測句子相似度
 */
export function calculateSentenceSimilarity(sentence1: string, sentence2: string): number {
  const doc1 = nlp(sentence1);
  const doc2 = nlp(sentence2);
  
  const words1 = new Set(doc1.terms().out('array').map((w: string) => w.toLowerCase()));
  const words2 = new Set(doc2.terms().out('array').map((w: string) => w.toLowerCase()));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  // Jaccard 相似度
  return intersection.size / union.size;
}

/**
 * 提取關鍵詞
 */
export function extractKeywords(text: string, limit = 10): string[] {
  const doc = nlp(text);
  
  // 提取名詞和名詞短語
  const nouns = doc.match('#Noun+').out('array');
  const nounPhrases = doc.match('#Adjective? #Noun+').out('array');
  
  // 計算詞頻
  const frequency = new Map<string, number>();
  [...nouns, ...nounPhrases].forEach(word => {
    const normalized = word.toLowerCase();
    frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
  });
  
  // 按頻率排序並返回
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * 檢測情感傾向（簡單版）
 */
export function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const _doc = nlp(text);
  
  // 簡單的情感詞典
  const positiveWords = /喜歡|愛|開心|快樂|美好|優秀|成功|幸福|讚|棒/;
  const negativeWords = /討厭|恨|難過|悲傷|失敗|糟糕|痛苦|憤怒|差|爛/;
  
  const positiveCount = (text.match(positiveWords) || []).length;
  const negativeCount = (text.match(negativeWords) || []).length;
  
  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
  return 'neutral';
}

/**
 * 建議同義詞
 */
export function suggestSynonyms(word: string): string[] {
  // 簡單的同義詞庫
  const synonyms: Record<string, string[]> = {
    '說': ['講', '談', '述', '言', '道'],
    '看': ['望', '觀', '視', '瞧', '瞄'],
    '想': ['思', '念', '考慮', '思考', '尋思'],
    '走': ['行', '步', '邁', '移', '前進'],
    '好': ['佳', '優', '良', '善', '美'],
    '大': ['巨', '宏', '廣', '寬', '闊']
  };
  
  return synonyms[word] || [];
}

/**
 * 檢測文本一致性問題
 */
export interface ConsistencyIssue {
  type: 'character_name' | 'number' | 'date' | 'terminology';
  term: string;
  variations: string[];
  locations: number[];
}

export interface DialogueExtraction {
  speakerId?: string;
  speakerName?: string;
  dialogue: string;
  position: number;
  context: string;
  confidence: number; // 0-1，識別準確度
  markers: {
    openQuote: string;
    closeQuote: string;
    attribution?: string; // 如："他說"、"她回答"
  };
}

export interface ChapterDialogueAnalysis {
  chapterId: string;
  characterDialogues: Map<string, DialogueExtraction[]>;
  totalDialogues: number;
  unassignedDialogues: DialogueExtraction[];
  confidence: number;
}

export function detectConsistencyIssues(text: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const doc = nlp(text);
  
  // 檢測人名變化
  const people = doc.people().json();
  const nameVariations = new Map<string, Set<string>>();
  
  people.forEach((person: PersonEntity) => {
    const normalized = person.text.toLowerCase();
    const similar = people.filter((p: PersonEntity) => 
      calculateSentenceSimilarity(p.text, person.text) > 0.6 &&
      p.text !== person.text
    );
    
    if (similar.length > 0) {
      if (!nameVariations.has(normalized)) {
        nameVariations.set(normalized, new Set([person.text]));
      }
      similar.forEach((s: PersonEntity) => nameVariations.get(normalized)!.add(s.text));
    }
  });
  
  // 轉換為 issues
  nameVariations.forEach((variations, name) => {
    if (variations.size > 1) {
      issues.push({
        type: 'character_name',
        term: name,
        variations: Array.from(variations),
        locations: [] // 可以擴展以包含位置信息
      });
    }
  });
  
  return issues;
}

// 輔助函數

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDifferences = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDifferences.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * 格式化詞性標籤為中文
 */
export function formatPOSTag(tag: string): string {
  const tagMap: Record<string, string> = {
    'Noun': '名詞',
    'Verb': '動詞',
    'Adjective': '形容詞',
    'Adverb': '副詞',
    'Pronoun': '代詞',
    'Preposition': '介詞',
    'Conjunction': '連詞',
    'Determiner': '限定詞',
    'Person': '人名',
    'Place': '地名',
    'Organization': '組織',
    'Date': '日期',
    'Value': '數值',
    'Unknown': '未知'
  };
  
  return tagMap[tag] || tag;
}

/**
 * 高亮文本中的實體
 */
export function highlightEntities(text: string): string {
  let result = text;
  const doc = nlp(text);
  
  // 簡化版本：標記實體
  const people = doc.people().out('array');
  const places = doc.places().out('array');

  people.forEach((person: string) => {
    result = result.replace(new RegExp(person, 'g'), `<span class="entity-person">${person}</span>`);
  });

  places.forEach((place: string) => {
    result = result.replace(new RegExp(place, 'g'), `<span class="entity-place">${place}</span>`);
  });
  
  return result;
}

// ==============================================
// 中文對話提取核心功能
// ==============================================

/**
 * 中文對話標點符號正則表達式
 */
const CHINESE_DIALOGUE_PATTERNS = {
  // 中文雙引號："..."、"..."
  doubleQuotes: /[""](.*?)[""]/g,
  // 中文單引號：'...'、'...'  
  singleQuotes: /[''](.*?)['']/g,
  // 中文書名號當對話使用：「...」
  cornerQuotes: /[「](.*?)[」]/g,
  // 雙書名號：『...』
  doubleCornerQuotes: /[『](.*?)[』]/g,
  // 英文引號在中文文本中
  englishQuotes: /"(.*?)"/g,
};

/**
 * 說話動詞和歸因表達式
 */
const DIALOGUE_ATTRIBUTION_PATTERNS = {
  // 說話動詞
  speakingVerbs: ['說', '道', '講', '問', '答', '回', '叫', '喊', '嘆', '驚', '笑', '哭', '罵', '吼', '念', '唸', '讀', '吟', '誦', '低語', '細語', '輕聲', '大聲', '高聲'],
  // 前歸因：他說："..."
  preAttribution: /([^。！？\n]*?)(說|道|講|問|答|回|叫|喊|嘆|驚|笑|哭|罵|吼)([：:]?)([""''「」『』"].*?[""''「」『』"])/g,
  // 後歸因："..."，他說
  postAttribution: /([""''「」『』"].*?[""''「」『』"])([，,]?)([^。！？\n]*?)(說|道|講|問|答|回|叫|喊|嘆|驚|笑|哭|罵|吼)/g,
  // 插入式歸因："...，"他說，"..."
  insertedAttribution: /([""''「」『』"][^""''「」『』"]*?[，,])([^，,""''「」『』"]*?)(說|道|講|問|答|回|叫|喊|嘆|驚|笑|哭|罵|吼)([，,])([^""''「」『』"]*?[""''「」『』"])/g
};

/**
 * 從文本中提取所有對話
 * @param text 輸入文本
 * @returns 對話提取結果數組
 */
export function extractDialogues(text: string): DialogueExtraction[] {
  const dialogues: DialogueExtraction[] = [];
  
  // 清理文本，移除多餘空白
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // 1. 使用各種對話標點符號提取對話
  Object.entries(CHINESE_DIALOGUE_PATTERNS).forEach(([_patternName, pattern]) => {
    let match;
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(cleanedText)) !== null) {
      const dialogueContent = match[1].trim();
      const startPos = match.index;
      const fullMatch = match[0];
      
      if (dialogueContent && dialogueContent.length > 0) {
        // 提取上下文（前後各50個字符）
        const contextStart = Math.max(0, startPos - 50);
        const contextEnd = Math.min(cleanedText.length, startPos + fullMatch.length + 50);
        const context = cleanedText.slice(contextStart, contextEnd);
        
        // 識別引號類型
        const openQuote = getOpenQuote(fullMatch);
        const closeQuote = getCloseQuote(fullMatch);
        
        // 初步分析說話者
        const speakerInfo = identifySpeaker(context, startPos, cleanedText);
        
        const dialogue: DialogueExtraction = {
          dialogue: dialogueContent,
          position: startPos,
          context: context,
          confidence: calculateDialogueConfidence(dialogueContent, context, speakerInfo),
          markers: {
            openQuote: openQuote,
            closeQuote: closeQuote,
            attribution: speakerInfo.attribution
          },
          speakerName: speakerInfo.speakerName,
          speakerId: speakerInfo.speakerId
        };
        
        dialogues.push(dialogue);
      }
    }
  });
  
  // 2. 去重和排序
  const uniqueDialogues = removeDuplicateDialogues(dialogues);
  
  // 3. 按位置排序
  uniqueDialogues.sort((a, b) => a.position - b.position);
  
  return uniqueDialogues;
}

/**
 * 分析章節對話並分配給角色
 * @param chapterContent 章節內容（Slate.js JSON）
 * @param chapterId 章節ID
 * @param knownCharacters 已知角色列表
 * @returns 章節對話分析結果
 */
export function analyzeChapterDialogues(
  chapterContent: Descendant[], 
  chapterId: string, 
  knownCharacters: Array<{ id: string; name: string; aliases?: string[] }>
): ChapterDialogueAnalysis {
  
  // 1. 將 Slate.js 內容轉換為純文本
  const plainText = slateToPlainText(chapterContent);
  
  // 2. 提取所有對話
  const dialogues = extractDialogues(plainText);
  
  // 3. 分配對話給角色
  const characterDialogues = new Map<string, DialogueExtraction[]>();
  const unassignedDialogues: DialogueExtraction[] = [];
  
  dialogues.forEach(dialogue => {
    const assignedCharacter = assignDialogueToCharacter(dialogue, knownCharacters);
    
    if (assignedCharacter) {
      if (!characterDialogues.has(assignedCharacter.id)) {
        characterDialogues.set(assignedCharacter.id, []);
      }
      
      // 更新對話信息
      dialogue.speakerId = assignedCharacter.id;
      dialogue.speakerName = assignedCharacter.name;
      
      characterDialogues.get(assignedCharacter.id)!.push(dialogue);
    } else {
      unassignedDialogues.push(dialogue);
    }
  });
  
  // 4. 計算整體置信度
  const overallConfidence = calculateOverallConfidence(dialogues);
  
  return {
    chapterId,
    characterDialogues,
    totalDialogues: dialogues.length,
    unassignedDialogues,
    confidence: overallConfidence
  };
}

// ==============================================
// 輔助函數
// ==============================================

/**
 * 獲取開始引號
 */
function getOpenQuote(fullMatch: string): string {
  const firstChar = fullMatch.charAt(0);
  return firstChar;
}

/**
 * 獲取結束引號
 */
function getCloseQuote(fullMatch: string): string {
  const lastChar = fullMatch.charAt(fullMatch.length - 1);
  return lastChar;
}

/**
 * 識別說話者
 */
function identifySpeaker(context: string, _dialoguePos: number, _fullText: string): {
  speakerName?: string;
  speakerId?: string;
  attribution?: string;
} {
  try {
    // 1. 嘗試前歸因模式
    const preAttributionMatch = context.match(DIALOGUE_ATTRIBUTION_PATTERNS.preAttribution);
    if (preAttributionMatch) {
      const speakerText = preAttributionMatch[1].trim();
      const verb = preAttributionMatch[2];
      return {
        speakerName: extractSpeakerName(speakerText),
        attribution: `${speakerText}${verb}`
      };
    }
    
    // 2. 嘗試後歸因模式
    const postAttributionMatch = context.match(DIALOGUE_ATTRIBUTION_PATTERNS.postAttribution);
    if (postAttributionMatch) {
      const speakerText = postAttributionMatch[3].trim();
      const verb = postAttributionMatch[4];
      return {
        speakerName: extractSpeakerName(speakerText),
        attribution: `${speakerText}${verb}`
      };
    }
    
    // 3. 嘗試從前文推斷說話者
    const inferredSpeaker = inferSpeakerFromContext(context, _dialoguePos);
    
    return inferredSpeaker;
  } catch (error) {
    log.warn('🚨 [對話分析] 識別說話者時發生錯誤:', error);
    return {};
  }
}

/**
 * 從歸因文本中提取說話者姓名
 */
function extractSpeakerName(speakerText: string): string | undefined {
  try {
    // 移除常見的修飾詞和代詞
    const cleanedSpeaker = speakerText
      .replace(/[的地得]/g, '')
      .replace(/[這那此]/g, '')
      .replace(/[一個位名]/g, '')
      .trim();
    
    // 檢查是否是人稱代詞
    const pronouns = ['我', '你', '他', '她', '它', '您', '咱', '我們', '你們', '他們', '她們', '它們'];
    if (pronouns.includes(cleanedSpeaker)) {
      return cleanedSpeaker;
    }
    
    // 使用 Compromise.js 嘗試識別人名
    const doc = nlp(speakerText);
    
    if (doc.people && typeof doc.people === 'function') {
      const people = doc.people().out('array');
      
      if (people && people.length > 0) {
        return people[0];
      }
    }
    
    // 如果清理後的文本長度合理（1-10個中文字符），認為是潛在姓名
    if (cleanedSpeaker.length >= 1 && cleanedSpeaker.length <= 10 && /[\u4e00-\u9fa5]/.test(cleanedSpeaker)) {
      return cleanedSpeaker;
    }
    
    return undefined;
  } catch (error) {
    log.warn('🚨 [對話分析] 提取說話者姓名時發生錯誤:', error);
    return undefined;
  }
}

/**
 * 從上下文推斷說話者
 */
function inferSpeakerFromContext(context: string, _dialoguePos: number): {
  speakerName?: string;
  speakerId?: string;
  attribution?: string;
} {
  try {
    // 簡化實現：查找前文中最近提到的角色名
    const sentences = context.split(/[。！？]/);
    const beforeDialogue = sentences.slice(0, -1).join('');
    
    // 使用 NLP 提取人名
    const doc = nlp(beforeDialogue);
    
    // 檢查 people 方法是否存在
    if (doc.people && typeof doc.people === 'function') {
      const people = doc.people().out('array');
      
      if (people && people.length > 0) {
        // 返回最後提到的人名
        return {
          speakerName: people[people.length - 1],
          attribution: '推斷'
        };
      }
    }
  } catch (error) {
    log.warn('🚨 [NLP] 推斷說話者時發生錯誤:', error);
  }
  
  return {};
}

/**
 * 計算對話識別的置信度
 */
function calculateDialogueConfidence(
  dialogueContent: string, 
  context: string, 
  speakerInfo: Partial<SpeakerInfo>
): number {
  let confidence = 0.5; // 基礎分數
  
  // 1. 對話長度合理性 (+0.1 to +0.2)
  if (dialogueContent.length >= 2 && dialogueContent.length <= 200) {
    confidence += 0.2;
  } else if (dialogueContent.length >= 1) {
    confidence += 0.1;
  }
  
  // 2. 有明確歸因 (+0.3)
  if (speakerInfo.attribution && speakerInfo.speakerName) {
    confidence += 0.3;
  } else if (speakerInfo.attribution || speakerInfo.speakerName) {
    confidence += 0.1;
  }
  
  // 3. 對話內容特徵 (+0.1 to +0.2)
  if (/[？！。，]/.test(dialogueContent)) {
    confidence += 0.1;
  }
  if (/[你我他她它您]/.test(dialogueContent)) {
    confidence += 0.1;
  }
  
  return Math.min(1.0, confidence);
}

/**
 * 分配對話給角色
 */
function assignDialogueToCharacter(
  dialogue: DialogueExtraction,
  knownCharacters: Array<{ id: string; name: string; aliases?: string[] }>
): { id: string; name: string } | null {
  
  if (!dialogue.speakerName) {
    return null;
  }
  
  // 1. 精確匹配角色名稱
  for (const character of knownCharacters) {
    if (character.name === dialogue.speakerName) {
      return character;
    }
    
    // 2. 匹配別名
    if (character.aliases) {
      for (const alias of character.aliases) {
        if (alias === dialogue.speakerName) {
          return character;
        }
      }
    }
  }
  
  // 3. 模糊匹配（包含關係）
  for (const character of knownCharacters) {
    if (character.name.includes(dialogue.speakerName) || 
        dialogue.speakerName.includes(character.name)) {
      return character;
    }
  }
  
  return null;
}

/**
 * 計算整體置信度
 */
function calculateOverallConfidence(dialogues: DialogueExtraction[]): number {
  if (dialogues.length === 0) return 0;
  
  const totalConfidence = dialogues.reduce((sum, d) => sum + d.confidence, 0);
  return totalConfidence / dialogues.length;
}

/**
 * 移除重複對話
 */
function removeDuplicateDialogues(dialogues: DialogueExtraction[]): DialogueExtraction[] {
  const seen = new Set<string>();
  return dialogues.filter(dialogue => {
    const key = `${dialogue.dialogue}-${dialogue.position}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 將 Slate.js 內容轉換為純文本
 */
export function slateToPlainText(nodes: Descendant[]): string {
  try {
    log.debug('🔄 [文本轉換] 輸入節點:', nodes);
    
    if (!Array.isArray(nodes)) {
      log.warn('⚠️ [文本轉換] 輸入不是數組，嘗試轉換:', typeof nodes);
      // 如果不是數組，嘗試包裝成數組
      nodes = [nodes as Descendant];
    }
    
    const result = nodes
      .map((node: Descendant, index) => {
        log.debug('📝 [文本轉換] 處理節點', { index, node });
        
        if (!node) {
          log.warn('⚠️ [文本轉換] 節點為空', { index });
          return '';
        }
        
        // 處理段落類型
        if ((node as SlateElement).type === 'paragraph') {
          const element = node as SlateElement;
          log.debug(`📄 [文本轉換] 段落節點，子元素數量:`, element.children?.length || 0);
          
          if (!element.children || !Array.isArray(element.children)) {
            log.warn(`⚠️ [文本轉換] 段落節點沒有有效的children`);
            return '';
          }
          
          return element.children
            .map((child: SlateText | SlateElement, childIndex) => {
              log.debug('  📝 [文本轉換] 子元素', { childIndex, child });
              const text = (child as SlateText).text || '';
              log.debug('  ✏️ [文本轉換] 提取文本', { text });
              return text;
            })
            .join('');
        }
        
        // 處理其他類型的節點
        if ((node as SlateText).text) {
          const text = (node as SlateText).text;
          log.debug('📝 [文本轉換] 文本節點', { text });
          return text;
        }
        
        log.warn(`⚠️ [文本轉換] 未知節點類型:`, node);
        return '';
      })
      .join('\n');
    
    log.debug('✅ [文本轉換] 轉換完成，結果長度:', result.length);
    log.debug('📄 [文本轉換] 轉換結果預覽:', result.substring(0, 200));
    
    return result;
    
  } catch (error) {
    log.error('💥 [文本轉換] 轉換失敗:', error);
    log.error('💥 [文本轉換] 輸入數據:', nodes);
    return '';
  }
}

// =================== 劇情分析引擎 ===================

/**
 * 衝突點檢測結果
 */
export interface ConflictPoint {
  position: number;        // 在文本中的位置
  intensity: number;       // 衝突強度 (1-10)
  type: 'internal' | 'external' | 'interpersonal' | 'societal'; // 衝突類型
  description: string;     // 衝突描述
  context: string;        // 上下文
  keywords: string[];     // 觸發關鍵詞
}

/**
 * 節奏分析結果
 */
export interface PaceAnalysis {
  overallPace: 'slow' | 'moderate' | 'fast';
  paceScore: number;      // 節奏評分 (1-10)
  segments: PaceSegment[];
  recommendations: string[];
}

export interface PaceSegment {
  startPosition: number;
  endPosition: number;
  pace: 'slow' | 'moderate' | 'fast';
  eventDensity: number;   // 事件密度
  dialogueRatio: number;  // 對話比例
  actionRatio: number;    // 動作描述比例
}

/**
 * 伏筆追蹤結果
 */
export interface ForeshadowingAnalysis {
  setups: ForeshadowingSetup[];
  payoffs: ForeshadowingPayoff[];
  orphanedSetups: ForeshadowingSetup[]; // 未回收的伏筆
  connections: ForeshadowingConnection[];
}

export interface ForeshadowingSetup {
  position: number;
  text: string;
  keywords: string[];
  intensity: number;      // 伏筆強度
  type: 'character' | 'plot' | 'theme' | 'object';
}

export interface ForeshadowingPayoff {
  position: number;
  text: string;
  keywords: string[];
  impact: number;         // 回收影響力
}

export interface ForeshadowingConnection {
  setupId: number;
  payoffId: number;
  distance: number;       // 伏筆到回收的距離
  strength: number;       // 關聯強度
}

/**
 * 劇情整體分析結果
 */
export interface PlotAnalysis {
  conflicts: ConflictPoint[];
  pace: PaceAnalysis;
  foreshadowing: ForeshadowingAnalysis;
  overallScore: number;   // 整體劇情評分
  recommendations: string[];
}

/**
 * 檢測文本中的衝突點
 */
export function detectConflictPoints(text: string): ConflictPoint[] {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  const conflicts: ConflictPoint[] = [];
  
  // 衝突關鍵詞模式
  const conflictPatterns = {
    internal: {
      keywords: ['掙扎', '猶豫', '矛盾', '困惑', '迷茫', '痛苦', '煎熬', '糾結', '抉擇', '衝突'],
      intensity: 6
    },
    external: {
      keywords: ['戰鬥', '攻擊', '威脅', '危險', '敵人', '對抗', '競爭', '挑戰', '阻礙', '障礙'],
      intensity: 8
    },
    interpersonal: {
      keywords: ['爭吵', '分歧', '誤解', '背叛', '欺騙', '嫉妒', '憤怒', '失望', '傷害', '報復'],
      intensity: 7
    },
    societal: {
      keywords: ['革命', '抗議', '壓迫', '不公', '制度', '權力', '階級', '歧視', '偏見', '體制'],
      intensity: 9
    }
  };
  
  sentences.forEach((sentence: string, index: number) => {
    const sentenceText = sentence.toLowerCase();
    let position = 0;
    for (let i = 0; i < index; i++) {
      position += sentences[i].length;
    }
    
    Object.entries(conflictPatterns).forEach(([type, pattern]) => {
      const matchedKeywords = pattern.keywords.filter(keyword => 
        sentenceText.includes(keyword)
      );
      
      if (matchedKeywords.length > 0) {
        conflicts.push({
          position,
          intensity: Math.min(10, pattern.intensity + matchedKeywords.length),
          type: type as ConflictPoint['type'],
          description: `檢測到${type === 'internal' ? '內心' : type === 'external' ? '外部' : type === 'interpersonal' ? '人際' : '社會'}衝突`,
          context: sentence,
          keywords: matchedKeywords
        });
      }
    });
  });
  
  return conflicts.sort((a, b) => b.intensity - a.intensity);
}

/**
 * 分析文本節奏
 */
export function analyzePace(text: string): PaceAnalysis {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  const totalLength = text.length;
  
  // 計算整體統計
  const avgSentenceLength = sentences.reduce((sum: number, s: string) => sum + s.length, 0) / sentences.length;
  const dialogueCount = (text.match(/「[^」]*」|"[^"]*"/g) || []).length;
  const dialogueRatio = dialogueCount / sentences.length;
  
  // 動作動詞檢測
  const actionVerbs = ['跑', '衝', '撞', '躍', '跳', '飛', '擊', '打', '踢', '推', '拉', '抓', '投'];
  const actionCount = actionVerbs.reduce((count, verb) => 
    count + (text.match(new RegExp(verb, 'g')) || []).length, 0);
  const actionRatio = actionCount / sentences.length;
  
  // 計算節奏評分
  let paceScore = 5; // 基準分
  
  // 短句增加節奏感
  if (avgSentenceLength < 15) paceScore += 2;
  else if (avgSentenceLength > 30) paceScore -= 2;
  
  // 對話增加節奏感
  paceScore += dialogueRatio * 3;
  
  // 動作描述增加節奏感
  paceScore += actionRatio * 4;
  
  paceScore = Math.max(1, Math.min(10, paceScore));
  
  // 確定整體節奏
  const overallPace: PaceAnalysis['overallPace'] = 
    paceScore > 7 ? 'fast' : paceScore > 4 ? 'moderate' : 'slow';
  
  // 分段分析（簡化版）
  const segmentSize = Math.max(100, Math.floor(totalLength / 5)); // 分成5段
  const segments: PaceSegment[] = [];
  
  for (let i = 0; i < totalLength; i += segmentSize) {
    const segment = text.slice(i, Math.min(i + segmentSize, totalLength));
    const segmentDialogueRatio = (segment.match(/「[^」]*」|"[^"]*"/g) || []).length / 
                                  (segment.match(/[。！？]/g) || []).length || 0;
    const segmentActionRatio = actionVerbs.reduce((count, verb) => 
      count + (segment.match(new RegExp(verb, 'g')) || []).length, 0) / 
      (segment.match(/[。！？]/g) || []).length || 0;
    
    const eventDensity = (segmentDialogueRatio + segmentActionRatio) * 10;
    const segmentPace: PaceSegment['pace'] = 
      eventDensity > 7 ? 'fast' : eventDensity > 3 ? 'moderate' : 'slow';
    
    segments.push({
      startPosition: i,
      endPosition: Math.min(i + segmentSize, totalLength),
      pace: segmentPace,
      eventDensity,
      dialogueRatio: segmentDialogueRatio,
      actionRatio: segmentActionRatio
    });
  }
  
  // 生成建議
  const recommendations: string[] = [];
  if (paceScore < 4) {
    recommendations.push('考慮增加對話或動作場景來提升節奏');
    recommendations.push('縮短句子長度可以增加緊張感');
  }
  if (paceScore > 8) {
    recommendations.push('可以添加一些描述性段落來讓讀者喘息');
    recommendations.push('適當的停頓能增強戲劇效果');
  }
  
  return {
    overallPace,
    paceScore: Math.round(paceScore * 10) / 10,
    segments,
    recommendations
  };
}

/**
 * 追蹤伏筆設置和回收
 */
export function trackForeshadowing(text: string): ForeshadowingAnalysis {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  
  // 伏筆關鍵詞和模式
  const foreshadowingPatterns = {
    character: {
      setup: ['神秘', '隱藏', '秘密', '過去', '身份', '來歷不明'],
      payoff: ['原來', '真相', '揭露', '發現', '事實上', '實際上']
    },
    plot: {
      setup: ['預言', '預兆', '暗示', '線索', '徵象', '前兆'],
      payoff: ['應驗', '實現', '成真', '證實', '果然', '如所料']
    },
    theme: {
      setup: ['象徵', '寓意', '隱喻', '暗喻', '比喻'],
      payoff: ['體現', '表達', '揭示', '展現', '闡述']
    },
    object: {
      setup: ['重要', '特殊', '古老', '神奇', '珍貴'],
      payoff: ['發揮', '使用', '關鍵', '救命', '決定性']
    }
  };
  
  const setups: ForeshadowingSetup[] = [];
  const payoffs: ForeshadowingPayoff[] = [];
  
  sentences.forEach((sentence: string, index: number) => {
    let position = 0;
    for (let i = 0; i < index; i++) {
      position += sentences[i].length;
    }
    
    Object.entries(foreshadowingPatterns).forEach(([type, patterns]) => {
      // 檢測伏筆設置
      const setupKeywords = patterns.setup.filter(keyword => 
        sentence.includes(keyword)
      );
      if (setupKeywords.length > 0) {
        setups.push({
          position,
          text: sentence,
          keywords: setupKeywords,
          intensity: Math.min(10, setupKeywords.length * 3),
          type: type as ForeshadowingSetup['type']
        });
      }
      
      // 檢測伏筆回收
      const payoffKeywords = patterns.payoff.filter(keyword => 
        sentence.includes(keyword)
      );
      if (payoffKeywords.length > 0) {
        payoffs.push({
          position,
          text: sentence,
          keywords: payoffKeywords,
          impact: Math.min(10, payoffKeywords.length * 4)
        });
      }
    });
  });
  
  // 建立連接關係
  const connections: ForeshadowingConnection[] = [];
  setups.forEach((setup, setupId) => {
    payoffs.forEach((payoff, payoffId) => {
      // 檢查關鍵詞相似度
      const commonKeywords = setup.keywords.filter(keyword => 
        payoff.keywords.some(pk => pk.includes(keyword) || keyword.includes(pk))
      );
      
      if (commonKeywords.length > 0 && payoff.position > setup.position) {
        connections.push({
          setupId,
          payoffId,
          distance: payoff.position - setup.position,
          strength: commonKeywords.length * 3
        });
      }
    });
  });
  
  // 找出孤立的伏筆
  const connectedSetupIds = new Set(connections.map(c => c.setupId));
  const orphanedSetups = setups.filter((_, index) => !connectedSetupIds.has(index));
  
  return {
    setups,
    payoffs,
    orphanedSetups,
    connections
  };
}

/**
 * 執行完整的劇情分析
 */
export function analyzePlot(text: string): PlotAnalysis {
  log.debug('🎭 開始劇情分析...');
  
  const conflicts = detectConflictPoints(text);
  const pace = analyzePace(text);
  const foreshadowing = trackForeshadowing(text);
  
  // 計算整體評分
  let overallScore = 5; // 基準分
  
  // 衝突點貢獻
  const avgConflictIntensity = conflicts.length > 0 ? 
    conflicts.reduce((sum, c) => sum + c.intensity, 0) / conflicts.length : 0;
  overallScore += avgConflictIntensity * 0.3;
  
  // 節奏貢獻
  overallScore += pace.paceScore * 0.4;
  
  // 伏筆完整性貢獻
  const foreshadowingCompleteness = foreshadowing.connections.length > 0 ? 
    (foreshadowing.connections.length / foreshadowing.setups.length) * 10 : 0;
  overallScore += foreshadowingCompleteness * 0.3;
  
  overallScore = Math.max(1, Math.min(10, overallScore));
  
  // 生成建議
  const recommendations: string[] = [...pace.recommendations];
  
  if (conflicts.length === 0) {
    recommendations.push('考慮添加更多衝突來增強戲劇張力');
  }
  
  if (foreshadowing.orphanedSetups.length > 0) {
    recommendations.push(`發現 ${foreshadowing.orphanedSetups.length} 個未回收的伏筆，建議安排回收`);
  }
  
  log.debug('✅ 劇情分析完成', {
    衝突點: conflicts.length,
    節奏評分: pace.paceScore,
    伏筆設置: foreshadowing.setups.length,
    整體評分: overallScore.toFixed(1)
  });
  
  return {
    conflicts,
    pace,
    foreshadowing,
    overallScore: Math.round(overallScore * 10) / 10,
    recommendations
  };
}

// 導出 nlp 實例供其他模組使用
export { nlp };