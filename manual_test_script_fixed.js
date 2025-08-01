// Context Engineering 手動測試腳本 (修復版)
// 複製此整個腳本到瀏覽器 Console 中執行

(async function runContextEngineeringTest() {
  console.log("🚀 開始 Context Engineering 完整測試 (修復版)...\n");
  
  const CHAPTER_ID = "1b8fa658-b21c-4752-8bd9-2a97bd1570c5";
  const POSITION = 200;
  const LANGUAGE = "zh-TW";
  const MODEL = "llama3.2:latest";
  
  let PROJECT_ID = null;
  
  try {
    // 步驟 1: 獲取項目 ID
    console.log("📋 步驟 1: 獲取測試項目 ID...");
    const projects = await window.__TAURI__.core.invoke("get_all_projects");
    const testProject = projects.find(p => p.name.includes("Context Engineering") || p.name.includes("測試"));
    
    if (!testProject) {
      console.error("❌ 未找到測試項目！請先創建包含 'Context Engineering' 或 '測試' 的項目");
      return;
    }
    
    PROJECT_ID = testProject.id;
    console.log("✅ 找到測試項目:", testProject.name);
    console.log("📌 項目 ID:", PROJECT_ID);
    
  } catch (error) {
    console.error("❌ 獲取項目失敗:", error);
    return;
  }
  
  // 測試結果存儲
  const testResults = {
    separatedContext: null,
    legacyContext: null,
    tokenStats: null,
    separatedGeneration: null,
    legacyGeneration: null,
    errors: []
  };
  
  try {
    // 步驟 2: 測試分離上下文建構 (修復參數名稱)
    console.log("\n🧪 步驟 2: 測試分離上下文建構...");
    testResults.separatedContext = await window.__TAURI__.core.invoke("build_separated_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION
    });
    
    const separatedTotal = testResults.separatedContext[0].length + testResults.separatedContext[1].length;
    console.log("✅ 分離上下文建構成功！");
    console.log("  系統提示:", testResults.separatedContext[0].length, "字符");
    console.log("  用戶上下文:", testResults.separatedContext[1].length, "字符");
    console.log("  總計:", separatedTotal, "字符,", Math.ceil(separatedTotal / 2), "tokens");
    
  } catch (error) {
    console.error("❌ 分離上下文測試失敗:", error);
    testResults.errors.push("separated_context: " + error.message);
  }
  
  try {
    // 步驟 3: 測試傳統上下文建構 (修復參數名稱)
    console.log("\n🧪 步驟 3: 測試傳統上下文建構...");
    testResults.legacyContext = await window.__TAURI__.core.invoke("build_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION
    });
    
    console.log("✅ 傳統上下文建構成功！");
    console.log("  內容長度:", testResults.legacyContext.length, "字符,", Math.ceil(testResults.legacyContext.length / 2), "tokens");
    
  } catch (error) {
    console.error("❌ 傳統上下文測試失敗:", error);
    testResults.errors.push("legacy_context: " + error.message);
  }
  
  // 步驟 4: 對比分析
  if (testResults.separatedContext && testResults.legacyContext) {
    console.log("\n⚖️ 步驟 4: 上下文對比分析");
    const separatedTotal = testResults.separatedContext[0].length + testResults.separatedContext[1].length;
    const legacyTotal = testResults.legacyContext.length;
    
    const separatedTokens = Math.ceil(separatedTotal / 2);
    const legacyTokens = Math.ceil(legacyTotal / 2);
    const tokenSavings = legacyTokens - separatedTokens;
    const savingsPercent = ((tokenSavings / legacyTokens) * 100).toFixed(1);
    
    console.log("📊 對比結果:");
    console.log("  傳統方法:", legacyTokens, "tokens");
    console.log("  分離方法:", separatedTokens, "tokens");
    console.log("  💰 節省:", tokenSavings, "tokens (" + savingsPercent + "%)");
    
    if (parseFloat(savingsPercent) > 15) {
      console.log("  🎉 效率評級: ✅ 優秀 (>15% 節省)");
    } else if (parseFloat(savingsPercent) > 5) {
      console.log("  👍 效率評級: ✅ 良好 (5-15% 節省)");
    } else if (parseFloat(savingsPercent) > 0) {
      console.log("  ⚠️ 效率評級: 🔶 一般 (<5% 節省)");
    } else {
      console.log("  ❌ 效率評級: ❌ 需改進 (無節省)");
    }
  }
  
  try {
    // 步驟 5: 測試 Token 統計 (修復參數名稱)
    console.log("\n🧪 步驟 5: 測試 Token 統計功能...");
    testResults.tokenStats = await window.__TAURI__.core.invoke("estimate_separated_context_tokens", {
      projectId: PROJECT_ID
    });
    
    console.log("✅ Token 統計成功！");
    console.log("📊 統計結果:");
    console.log("  系統提示 tokens:", testResults.tokenStats.system_prompt_tokens);
    console.log("  用戶上下文 tokens:", testResults.tokenStats.user_context_tokens);
    console.log("  總計 tokens:", testResults.tokenStats.total_tokens);
    console.log("  效率百分比:", testResults.tokenStats.efficiency_percentage.toFixed(1) + "%");
    console.log("  預估節省:", testResults.tokenStats.estimated_savings_vs_legacy + "%");
    
  } catch (error) {
    console.error("❌ Token 統計測試失敗:", error);
    testResults.errors.push("token_stats: " + error.message);
  }
  
  try {
    // 步驟 6: 測試新的 AI 生成 (修復參數名稱)
    console.log("\n🧪 步驟 6: 測試新的 AI 生成功能...");
    console.log("⏳ 正在生成，請稍候...");
    
    const startTime = Date.now();
    testResults.separatedGeneration = await window.__TAURI__.core.invoke("generate_with_separated_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION,
      model: MODEL,
      params: {
        temperature: 0.7,
        max_tokens: 150,
        top_p: 0.9
      }
    });
    const separatedTime = Date.now() - startTime;
    
    console.log("✅ 新 AI 生成成功！耗時:", separatedTime + "ms");
    console.log("📝 生成內容 (" + testResults.separatedGeneration.length + " 字符):");
    console.log("「" + testResults.separatedGeneration + "」");
    
  } catch (error) {
    console.error("❌ 新 AI 生成測試失敗:", error);
    testResults.errors.push("separated_generation: " + error.message);
  }
  
  try {
    // 步驟 7: 測試傳統 AI 生成 (修復參數名稱)
    console.log("\n🧪 步驟 7: 測試傳統 AI 生成功能...");
    console.log("⏳ 正在生成，請稍候...");
    
    const startTime = Date.now();
    testResults.legacyGeneration = await window.__TAURI__.core.invoke("generate_with_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION,
      model: MODEL,
      params: {
        temperature: 0.7,
        max_tokens: 150,
        top_p: 0.9
      }
    });
    const legacyTime = Date.now() - startTime;
    
    console.log("✅ 傳統 AI 生成成功！耗時:", legacyTime + "ms");
    console.log("📝 生成內容 (" + testResults.legacyGeneration.length + " 字符):");
    console.log("「" + testResults.legacyGeneration + "」");
    
  } catch (error) {
    console.error("❌ 傳統 AI 生成測試失敗:", error);
    testResults.errors.push("legacy_generation: " + error.message);
  }
  
  // 步驟 8: 生成最終報告
  console.log("\n" + "=".repeat(60));
  console.log("📋 Context Engineering 測試報告");
  console.log("=".repeat(60));
  
  console.log("\n🎯 核心指標:");
  if (testResults.separatedContext && testResults.legacyContext) {
    const separatedTotal = testResults.separatedContext[0].length + testResults.separatedContext[1].length;
    const tokenSavings = Math.ceil(testResults.legacyContext.length / 2) - Math.ceil(separatedTotal / 2);
    const savingsPercent = ((tokenSavings / Math.ceil(testResults.legacyContext.length / 2)) * 100).toFixed(1);
    console.log("  Token 節省:", tokenSavings, "tokens (" + savingsPercent + "%)");
  }
  
  console.log("\n✅ 成功的測試:");
  if (testResults.separatedContext) console.log("  ✓ 分離上下文建構");
  if (testResults.legacyContext) console.log("  ✓ 傳統上下文建構");
  if (testResults.tokenStats) console.log("  ✓ Token 統計功能");
  if (testResults.separatedGeneration) console.log("  ✓ 新 AI 生成功能");
  if (testResults.legacyGeneration) console.log("  ✓ 傳統 AI 生成功能");
  
  if (testResults.errors.length > 0) {
    console.log("\n❌ 失敗的測試:");
    testResults.errors.forEach(error => console.log("  ✗", error));
  }
  
  console.log("\n🎉 測試完成！");
  
  if (testResults.separatedGeneration && testResults.legacyGeneration) {
    console.log("\n📝 生成品質對比:");
    console.log("請人工評估兩種生成結果的品質差異：");
    console.log("- 語言純度 (是否混雜英文)");
    console.log("- 角色行為一致性");
    console.log("- 情節連貫性");
    console.log("- 文風匹配度");
  }
  
  // 將結果保存到全局變量供後續分析
  window.contextTestResults = testResults;
  console.log("\n💾 測試結果已保存到 window.contextTestResults");
  
})().catch(error => {
  console.error("🚨 測試腳本執行失敗:", error);
});