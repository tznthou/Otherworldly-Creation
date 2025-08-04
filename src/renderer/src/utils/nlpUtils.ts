// NLP 工具函數
import nlp from 'compromise';
import compromiseDates from 'compromise-dates';
import compromiseStats from 'compromise-stats';

// 擴展 Compromise 功能
nlp.plugin(compromiseDates);
nlp.plugin(compromiseStats);

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
  const sentenceLengths = sentences.map((s: any) => s.terms.length);
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
  
  return terms.map((term: any) => ({
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
  const scoredSentences = sentences.map((s: any, index: number) => {
    const sentDoc = nlp(s.text);
    const nounCount = sentDoc.match('#Noun').length;
    const verbCount = sentDoc.match('#Verb').length;
    const score = nounCount * 2 + verbCount;
    
    return { text: s.text, score, index };
  });
  
  // 選擇得分最高的句子，保持原始順序
  const selected = scoredSentences
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a: any, b: any) => a.index - b.index);
  
  return selected.map((s: any) => s.text).join(' ');
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

export function detectConsistencyIssues(text: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const doc = nlp(text);
  
  // 檢測人名變化
  const people = doc.people().json();
  const nameVariations = new Map<string, Set<string>>();
  
  people.forEach((person: any) => {
    const normalized = person.text.toLowerCase();
    const similar = people.filter((p: any) => 
      calculateSentenceSimilarity(p.text, person.text) > 0.6 &&
      p.text !== person.text
    );
    
    if (similar.length > 0) {
      if (!nameVariations.has(normalized)) {
        nameVariations.set(normalized, new Set([person.text]));
      }
      similar.forEach((s: any) => nameVariations.get(normalized)!.add(s.text));
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

// 導出 nlp 實例供其他模組使用
export { nlp };