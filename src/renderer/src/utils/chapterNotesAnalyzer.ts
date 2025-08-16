// 章節筆記智能分析器
// Phase 4: 智慧續寫策略系統

export interface ChapterNotesAnalysis {
  style: {
    dialogue: number;    // 對話重點 (0-1)
    action: number;      // 動作場景 (0-1)
    description: number; // 描述性 (0-1)
    emotion: number;     // 情感表達 (0-1)
  };
  tone: {
    dramatic: number;    // 戲劇性 (0-1)
    romantic: number;    // 浪漫 (0-1)
    humorous: number;    // 幽默 (0-1)
    mysterious: number;  // 神秘 (0-1)
    emotional: number;   // 情感強度 (0-1)
  };
  content: {
    plot: number;        // 情節重要性 (0-1)
    character: number;   // 角色發展 (0-1)
    world: number;       // 世界構建 (0-1)
  };
  keywords: string[];    // 提取的關鍵詞
  suggestions: string[]; // 寫作建議
}

/**
 * 分析章節筆記，提取寫作策略指導
 */
export function analyzeChapterNotes(notes: string): ChapterNotesAnalysis {
  console.log('📝 開始分析章節筆記:', notes.substring(0, 100) + '...');
  
  const lowerNotes = notes.toLowerCase();
  
  // 風格分析關鍵詞
  const styleKeywords = {
    dialogue: ['對話', '說話', '聊天', '交談', '問答', '討論', '談話', '對白', '言語', '溝通'],
    action: ['動作', '戰鬥', '追逐', '跑步', '打架', '移動', '行動', '攻擊', '逃跑', '奔跑', '衝刺'],
    description: ['描述', '環境', '景色', '外觀', '建築', '風景', '場景', '氛圍', '背景', '細節'],
    emotion: ['情感', '心情', '感情', '愛情', '痛苦', '快樂', '悲傷', '憤怒', '恐懼', '焦慮', '興奮']
  };
  
  // 基調分析關鍵詞
  const toneKeywords = {
    dramatic: ['戲劇', '緊張', '衝突', '危機', '轉折', '高潮', '震撼', '驚人', '意外', '關鍵'],
    romantic: ['浪漫', '愛情', '約會', '親密', '溫柔', '甜蜜', '心動', '暧昧', '深情', '纏綿'],
    humorous: ['幽默', '搞笑', '有趣', '好笑', '輕鬆', '詼諧', '調皮', '俏皮', '逗趣', '歡樂'],
    mysterious: ['神秘', '謎團', '秘密', '隱藏', '未知', '奇怪', '詭異', '不明', '懸疑', '疑惑'],
    emotional: ['感動', '深刻', '內心', '心理', '思考', '回憶', '懷念', '眷戀', '不捨', '珍惜']
  };
  
  // 內容分析關鍵詞
  const contentKeywords = {
    plot: ['情節', '劇情', '故事', '發展', '推進', '轉折', '結局', '開始', '過程', '進展'],
    character: ['角色', '人物', '性格', '個性', '成長', '變化', '發展', '關係', '互動', '塑造'],
    world: ['世界', '設定', '背景', '環境', '社會', '文化', '歷史', '規則', '體系', '架構']
  };
  
  // 計算各類別得分
  const calculateScore = (keywords: string[], text: string): number => {
    let score = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const found = text.match(regex);
      if (found) {
        score += found.length * (keyword.length / 10); // 長關鍵詞權重更高
      }
    });
    
    // 正規化到 0-1 範圍
    return Math.min(1, score / Math.max(1, text.length / 50));
  };
  
  // 分析風格
  const style = {
    dialogue: calculateScore(styleKeywords.dialogue, lowerNotes),
    action: calculateScore(styleKeywords.action, lowerNotes),
    description: calculateScore(styleKeywords.description, lowerNotes),
    emotion: calculateScore(styleKeywords.emotion, lowerNotes)
  };
  
  // 分析基調
  const tone = {
    dramatic: calculateScore(toneKeywords.dramatic, lowerNotes),
    romantic: calculateScore(toneKeywords.romantic, lowerNotes),
    humorous: calculateScore(toneKeywords.humorous, lowerNotes),
    mysterious: calculateScore(toneKeywords.mysterious, lowerNotes),
    emotional: calculateScore(toneKeywords.emotional, lowerNotes)
  };
  
  // 分析內容焦點
  const content = {
    plot: calculateScore(contentKeywords.plot, lowerNotes),
    character: calculateScore(contentKeywords.character, lowerNotes),
    world: calculateScore(contentKeywords.world, lowerNotes)
  };
  
  // 提取關鍵詞（簡化版本）
  const keywords: string[] = [];
  const allKeywords = [
    ...styleKeywords.dialogue,
    ...styleKeywords.action,
    ...styleKeywords.description,
    ...styleKeywords.emotion,
    ...toneKeywords.dramatic,
    ...toneKeywords.romantic,
    ...toneKeywords.humorous,
    ...toneKeywords.mysterious,
    ...toneKeywords.emotional,
    ...contentKeywords.plot,
    ...contentKeywords.character,
    ...contentKeywords.world
  ];
  
  allKeywords.forEach(keyword => {
    if (lowerNotes.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  // 生成寫作建議
  const suggestions: string[] = [];
  
  // 基於風格分析的建議
  const maxStyle = Object.entries(style).sort(([,a], [,b]) => b - a)[0];
  if (maxStyle[1] > 0.5) {
    switch (maxStyle[0]) {
      case 'dialogue':
        suggestions.push('重點發展角色對話，展現個性差異');
        break;
      case 'action':
        suggestions.push('注重動作場景的節奏感和視覺效果');
        break;
      case 'description':
        suggestions.push('豐富環境描述，營造沉浸感');
        break;
      case 'emotion':
        suggestions.push('深入挖掘角色內心情感變化');
        break;
    }
  }
  
  // 基於基調分析的建議
  const maxTone = Object.entries(tone).sort(([,a], [,b]) => b - a)[0];
  if (maxTone[1] > 0.5) {
    switch (maxTone[0]) {
      case 'dramatic':
        suggestions.push('強化戲劇張力，突出衝突點');
        break;
      case 'romantic':
        suggestions.push('細膩描繪浪漫氛圍和情感互動');
        break;
      case 'humorous':
        suggestions.push('保持輕鬆幽默的敘述風格');
        break;
      case 'mysterious':
        suggestions.push('營造神秘感，保持讀者好奇心');
        break;
      case 'emotional':
        suggestions.push('著重情感共鳴和心理描寫');
        break;
    }
  }
  
  // 基於內容焦點的建議
  const maxContent = Object.entries(content).sort(([,a], [,b]) => b - a)[0];
  if (maxContent[1] > 0.6) {
    switch (maxContent[0]) {
      case 'plot':
        suggestions.push('推進主線劇情，增加情節密度');
        break;
      case 'character':
        suggestions.push('展現角色成長和關係發展');
        break;
      case 'world':
        suggestions.push('豐富世界觀細節和背景設定');
        break;
    }
  }
  
  const analysis: ChapterNotesAnalysis = {
    style,
    tone,
    content,
    keywords: keywords.slice(0, 10), // 限制關鍵詞數量
    suggestions: suggestions.slice(0, 3) // 限制建議數量
  };
  
  console.log('📊 章節筆記分析完成:', {
    主要風格: maxStyle[0],
    主要基調: maxTone[0],
    主要內容: maxContent[0],
    關鍵詞數量: keywords.length,
    建議數量: suggestions.length
  });
  
  return analysis;
}

/**
 * 根據章節筆記分析調整 AI 生成參數
 */
export function adjustParametersBasedOnNotes(
  baseParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
    presencePenalty: number;
    frequencyPenalty: number;
  },
  analysis: ChapterNotesAnalysis
): typeof baseParams {
  const adjusted = { ...baseParams };
  
  // 根據風格調整參數
  if (analysis.style.dialogue > 0.6) {
    adjusted.temperature = Math.min(1.0, adjusted.temperature + 0.1); // 對話需要更多變化
    adjusted.presencePenalty = Math.max(0, adjusted.presencePenalty - 0.1); // 減少重複懲罰
  }
  
  if (analysis.style.action > 0.6) {
    adjusted.maxTokens = Math.min(800, adjusted.maxTokens + 100); // 動作場景需要更多描述
    adjusted.topP = Math.min(0.9, adjusted.topP + 0.1); // 增加多樣性
  }
  
  if (analysis.style.emotion > 0.7) {
    adjusted.temperature = Math.min(1.2, adjusted.temperature + 0.15); // 情感場景需要更多創意
    adjusted.frequencyPenalty = Math.max(0, adjusted.frequencyPenalty - 0.1); // 允許重複情感詞彙
  }
  
  // 根據基調調整參數
  if (analysis.tone.dramatic > 0.6) {
    adjusted.maxTokens = Math.min(900, adjusted.maxTokens + 150); // 戲劇場景需要更多篇幅
    adjusted.temperature = Math.min(1.1, adjusted.temperature + 0.1); // 增加創意性
  }
  
  if (analysis.tone.romantic > 0.6) {
    adjusted.temperature = Math.min(1.0, adjusted.temperature + 0.05); // 浪漫場景需要細膩
    adjusted.presencePenalty = Math.max(0, adjusted.presencePenalty - 0.15); // 允許重複浪漫詞彙
  }
  
  // 根據內容焦點調整參數
  if (analysis.content.plot > 0.8) {
    adjusted.temperature = Math.min(1.2, adjusted.temperature + 0.1); // 重要情節需要創意
    adjusted.maxTokens = Math.min(850, adjusted.maxTokens + 100); // 給予更多篇幅發展
  }
  
  console.log('🎯 參數調整完成:', {
    '溫度變化': (adjusted.temperature - baseParams.temperature).toFixed(2),
    'Token變化': adjusted.maxTokens - baseParams.maxTokens,
    'TopP變化': (adjusted.topP - baseParams.topP).toFixed(2)
  });
  
  return adjusted;
}