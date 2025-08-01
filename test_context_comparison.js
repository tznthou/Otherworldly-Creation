#!/usr/bin/env node

/**
 * Context Engineering 測試腳本
 * 比較傳統上下文 vs 分離上下文的效能差異
 */

const { spawn } = require('child_process');
const fs = require('fs');

class ContextComparisonTest {
  constructor() {
    this.results = {
      legacy: [],
      separated: [],
      timestamp: new Date().toISOString()
    };
    
    this.testCases = [
      {
        name: "簡單場景",
        projectId: "test_project_1",
        chapterId: "test_chapter_1", 
        position: 100,
        description: "短文本，少角色"
      },
      {
        name: "複雜場景",
        projectId: "test_project_2",
        chapterId: "test_chapter_2",
        position: 500,
        description: "長文本，多角色，複雜關係"
      }
    ];
  }

  async runTest() {
    console.log('🧪 開始 Context Engineering 比較測試...\n');

    for (const testCase of this.testCases) {
      console.log(`📋 測試場景: ${testCase.name} (${testCase.description})`);
      
      // 測試傳統方法
      console.log('  🔄 測試傳統上下文建構...');
      const legacyResult = await this.testLegacyContext(testCase);
      
      // 測試分離方法  
      console.log('  ✨ 測試分離上下文建構...');
      const separatedResult = await this.testSeparatedContext(testCase);
      
      // 比較結果
      this.compareResults(testCase, legacyResult, separatedResult);
      console.log('');
    }

    // 生成報告
    this.generateReport();
  }

  async testLegacyContext(testCase) {
    const startTime = Date.now();
    
    try {
      // 模擬調用傳統 build_context 命令
      const context = await this.simulateBuildContext(testCase);
      const endTime = Date.now();
      
      return {
        success: true,
        contextLength: context.length,
        estimatedTokens: Math.ceil(context.length / 2), // 中文約 2 字符 = 1 token
        duration: endTime - startTime,
        method: 'legacy'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'legacy'
      };
    }
  }

  async testSeparatedContext(testCase) {
    const startTime = Date.now();
    
    try {
      // 模擬調用分離 build_separated_context 命令
      const { systemPrompt, userContext } = await this.simulateBuildSeparatedContext(testCase);
      const endTime = Date.now();
      
      const totalLength = systemPrompt.length + userContext.length;
      
      return {
        success: true,
        systemPromptLength: systemPrompt.length,
        userContextLength: userContext.length,
        totalLength,
        estimatedTokens: Math.ceil(totalLength / 2),
        systemPromptTokens: Math.ceil(systemPrompt.length / 2),
        userContextTokens: Math.ceil(userContext.length / 2),
        duration: endTime - startTime,
        method: 'separated'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'separated'
      };
    }
  }

  // 模擬傳統上下文建構（基於觀察到的格式）
  async simulateBuildContext(testCase) {
    const mockData = this.getMockData(testCase);
    
    let context = '';
    
    // 傳統方式：冗長標籤 + 混合內容
    context += '【故事背景】\n';
    context += `書名：${mockData.project.name}\n`;
    context += `簡介：${mockData.project.description}\n`;
    context += `類型：${mockData.project.type}\n\n`;
    
    context += '【角色設定】\n';
    mockData.characters.forEach(char => {
      context += `◆ ${char.name}\n`;
      context += `  描述：${char.description}\n`;
      Object.entries(char.attributes).forEach(([key, value]) => {
        context += `  ${key}：${value}\n`;
      });
    });
    
    context += '\n【當前章節】\n';
    context += `章節標題：${mockData.chapter.title}\n`;
    context += '內容：\n';
    context += mockData.chapter.content.substring(0, 1500); // 較長內容
    
    context += '\n\n【請在此處續寫，使用純中文，不要混雜英文】\n\n';
    
    // 添加冗長的續寫要求
    context += '【續寫要求】\n';
    context += '重要：在標記的位置插入續寫內容。\n';
    context += '不要重複或重寫插入點前後的現有內容。\n';
    context += '你的回應應該只包含要插入的新文本。\n\n';
    context += '要求：\n';
    context += '1. 保持角色一致性和對話風格\n';
    context += '2. 從插入點平滑地繼續當前情節發展\n';
    context += '3. 保持相同的寫作風格和敘事視角\n';
    context += '4. 確保細節一致性（時間、地點、角色狀態）\n';
    context += '5. 只寫續寫文本，不要任何元評論或解釋\n';
    context += '6. 確保你的續寫與插入點前後的文本自然銜接\n';
    context += '7. 使用純中文寫作，不要混雜英文單詞\n';
    
    return context;
  }

  // 模擬分離上下文建構
  async simulateBuildSeparatedContext(testCase) {
    const mockData = this.getMockData(testCase);
    
    // 系統提示：固定指令
    const systemPrompt = `你是一個專業的中文小說續寫助手。你的任務是根據提供的上下文資訊，在指定位置插入合適的續寫內容。

核心要求:
- 在 [CONTINUE HERE] 標記處插入續寫內容
- 不要重複或重寫現有內容
- 保持角色一致性和對話風格
- 確保情節連貫和細節一致
- 使用純中文，不混雜英文
- 只提供續寫文本，無需解釋或評論`;

    // 用戶上下文：精簡內容
    let userContext = '';
    userContext += `Title: ${mockData.project.name}\n`;
    userContext += `Summary: ${mockData.project.description.substring(0, 150)}\n`;
    userContext += `Genre: ${mockData.project.type}\n\n`;
    
    userContext += 'Characters:\n';
    mockData.characters.forEach(char => {
      const shortDesc = char.description.substring(0, 80);
      userContext += `- ${char.name}: ${shortDesc}\n`;
      
      // 只顯示前3個關鍵屬性
      const keyAttrs = Object.entries(char.attributes).slice(0, 3)
        .map(([k, v]) => `${k}:${v}`).join(', ');
      if (keyAttrs) {
        userContext += `  (${keyAttrs})\n`;
      }
    });
    
    userContext += `\nChapter: ${mockData.chapter.title}\n`;
    userContext += 'Content:\n';
    userContext += mockData.chapter.content.substring(0, 800); // 較短內容
    userContext += '\n[CONTINUE HERE]';
    
    return { systemPrompt, userContext };
  }

  getMockData(testCase) {
    if (testCase.name === "簡單場景") {
      return {
        project: {
          name: "測試小說",
          description: "這是一個簡單的測試小說，用於驗證上下文建構效能。",
          type: "輕小說"
        },
        characters: [
          {
            name: "小明",
            description: "主角，一個普通的高中生。",
            attributes: { "年齡": "17", "性格": "開朗" }
          },
          {
            name: "小紅",
            description: "女主角，聰明的同班同學。",
            attributes: { "年齡": "16", "性格": "文靜" }
          }
        ],
        chapter: {
          title: "第一章 相遇",
          content: "春天的午後，陽光透過窗戶灑在教室裡。小明正在發呆，突然聽到一聲輕響。他轉頭看去，發現是小紅不小心掉了書本。小明走過去幫她撿起書本，兩人的手不小心碰到了。這個簡單的接觸讓兩人都臉紅了。小明結結巴巴地說：'這...這是你的書。'小紅點點頭，小聲說了聲謝謝。就在這時，".repeat(2)
        }
      };
    } else {
      return {
        project: {
          name: "異世界冒險記",
          description: "一個複雜的異世界奇幻小說，包含魔法、戰鬥、政治鬥爭等多種元素。主角從現代世界穿越到充滿魔法的異世界，必須在這個危險的世界中生存下去，同時尋找回家的方法。故事涉及多個種族、複雜的魔法體系、以及錯綜複雜的人際關係。",
          type: "奇幻"
        },
        characters: [
          {
            name: "林煒",
            description: "主角，來自現代世界的大學生，意外穿越到異世界。雖然沒有特殊的戰鬥能力，但憑藉著現代知識和頑強意志，逐漸在異世界站穩腳跟。",
            attributes: { "年齡": "22", "職業": "學生", "魔法親和": "無", "特殊能力": "現代知識", "性格": "謹慎而堅韌", "出身": "現代世界" }
          },
          {
            name: "艾蕾娜",
            description: "精靈族的公主，擁有強大的自然魔法能力。因為政治聯姻被迫離開故鄉，在路上遇到了主角。她高傲而優雅，但内心善良。",
            attributes: { "年齡": "150", "種族": "精靈", "職業": "公主", "魔法親和": "自然系", "地位": "王族", "性格": "高傲善良" }
          },
          {
            name: "格雷恩",
            description: "人類王國的騎士團長，實力強大，忠誠可靠。最初對穿越者林煒持懷疑態度，但後來成為重要的盟友。",
            attributes: { "年齡": "35", "種族": "人類", "職業": "騎士團長", "武器": "大劍", "魔法親和": "光系", "性格": "正直忠誠" }
          },
          {
            name: "暗影刺客",
            description: "神祕的刺客，身份不明，似乎與主角的穿越有關。時而幫助主角，時而成為敵人，動機難以琢磨。",
            attributes: { "年齡": "不明", "種族": "不明", "職業": "刺客", "武器": "雙刃", "魔法親和": "暗系", "性格": "神祕莫測" }
          }
        ],
        chapter: {
          title: "第十五章 危機四伏",
          content: "魔法森林的深處，林煒和艾蕾娜正在小心翼翼地前進。周圍的樹木異常高大，遮天蔽日的樹冠讓森林內部顯得陰暗而神祕。艾蕾娜的精靈血統讓她在這裡如魚得水，但她的表情依然凝重。'這裡的魔法波動很不穩定，'她低聲說道，'我感覺到了危險的氣息。'林煒點點頭，雖然他沒有魔法感知能力，但經過這段時間的冒險，他已經學會了相信同伴的直覺。就在這時，樹林中傳來了一陣詭異的笑聲。暗影刺客從陰影中現身，手中的雙刃在微弱的光線下閃著寒光。'又見面了，異世界的旅者。'他的聲音低沉而充滿威脅，'這次，你可沒有格雷恩騎士團長的保護了。'艾蕾娜立即進入戰鬥狀態，她的雙手開始凝聚自然魔法的光芒。林煒雖然緊張，但還是強迫自己保持冷靜，他知道在這個危險的時刻，任何恐慌都可能是致命的。森林中的氣氛變得異常緊張，一場戰鬥即將爆發。".repeat(3)
        }
      };
    }
  }

  compareResults(testCase, legacy, separated) {
    if (!legacy.success || !separated.success) {
      console.log('  ❌ 測試失敗');
      return;
    }

    const tokenSavings = legacy.estimatedTokens - separated.estimatedTokens;
    const savingsPercentage = ((tokenSavings / legacy.estimatedTokens) * 100).toFixed(1);
    
    console.log(`  📊 結果比較:`);
    console.log(`    傳統方法: ${legacy.contextLength} 字符, ~${legacy.estimatedTokens} tokens`);
    console.log(`    分離方法: ${separated.totalLength} 字符, ~${separated.estimatedTokens} tokens`);
    console.log(`      - 系統提示: ${separated.systemPromptLength} 字符, ~${separated.systemPromptTokens} tokens`);
    console.log(`      - 用戶上下文: ${separated.userContextLength} 字符, ~${separated.userContextTokens} tokens`);
    console.log(`    💰 Token 節省: ${tokenSavings} tokens (${savingsPercentage}%)`);
    console.log(`    ⚡ 效率提升: ${savingsPercentage > 0 ? '✅' : '❌'} ${savingsPercentage > 0 ? '改善' : '退化'}`);

    // 記錄結果
    this.results.legacy.push({ testCase: testCase.name, ...legacy });
    this.results.separated.push({ testCase: testCase.name, ...separated, tokenSavings, savingsPercentage });
  }

  generateReport() {
    console.log('\n📋 測試報告總結');
    console.log('='.repeat(50));
    
    const totalLegacyTokens = this.results.legacy.reduce((sum, r) => sum + r.estimatedTokens, 0);
    const totalSeparatedTokens = this.results.separated.reduce((sum, r) => sum + r.estimatedTokens, 0);
    const overallSavings = totalLegacyTokens - totalSeparatedTokens;
    const overallSavingsPercentage = ((overallSavings / totalLegacyTokens) * 100).toFixed(1);
    
    console.log(`🎯 整體 Token 效率:`);
    console.log(`  傳統方法總計: ${totalLegacyTokens} tokens`);
    console.log(`  分離方法總計: ${totalSeparatedTokens} tokens`);
    console.log(`  總節省: ${overallSavings} tokens (${overallSavingsPercentage}%)`);
    
    console.log(`\n📈 效益分析:`);
    if (overallSavingsPercentage > 40) {
      console.log(`  ✅ 優秀：超過預期 40% 節省目標`);
    } else if (overallSavingsPercentage > 20) {
      console.log(`  ✅ 良好：達到可觀的效率改善`);
    } else if (overallSavingsPercentage > 0) {
      console.log(`  ⚠️  一般：有改善但不顯著`);
    } else {
      console.log(`  ❌ 需改進：未達到效率改善目標`);
    }

    // 保存詳細報告
    const reportPath = './context_comparison_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 詳細報告已保存至: ${reportPath}`);
  }
}

// 運行測試
const test = new ContextComparisonTest();
test.runTest().catch(console.error);