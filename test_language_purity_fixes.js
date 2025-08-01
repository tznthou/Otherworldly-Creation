// 語言純度修復測試腳本
// 複製此整個腳本到瀏覽器 Console 中執行

(async function testLanguagePurityFixes() {
  console.log("🧪 開始語言純度修復測試...\n");
  
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
    
  } catch (error) {
    console.error("❌ 獲取項目失敗:", error);
    return;
  }
  
  // 測試結果存儲
  const testResults = {
    separatedSystemPrompt: null,
    separatedUserContext: null,
    legacyContext: null,
    newGeneration: null,
    errors: []
  };
  
  try {
    // 步驟 2: 測試修復後的分離上下文系統提示
    console.log("\n🔧 步驟 2: 測試修復後的系統提示...");
    const separatedContext = await window.__TAURI__.core.invoke("build_separated_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION
    });
    
    testResults.separatedSystemPrompt = separatedContext[0];
    testResults.separatedUserContext = separatedContext[1];
    
    console.log("✅ 分離上下文建構成功！");
    console.log("📝 系統提示內容預覽（前200字符）:");
    console.log("「" + testResults.separatedSystemPrompt.substring(0, 200) + "...」");
    
    // 檢查語言純度指令
    const hasCriticalInstruction = testResults.separatedSystemPrompt.includes("CRITICAL");
    const hasStrictInstruction = testResults.separatedSystemPrompt.includes("嚴格使用繁體中文");
    const hasProhibitionInstruction = testResults.separatedSystemPrompt.includes("絕對不允許混雜任何英文單詞或簡體字");
    
    console.log("\n🔍 語言純度指令檢查:");
    console.log("  ✓ CRITICAL 標記:", hasCriticalInstruction ? "存在" : "❌ 缺失");
    console.log("  ✓ 嚴格繁體中文指令:", hasStrictInstruction ? "存在" : "❌ 缺失");
    console.log("  ✓ 禁止混雜指令:", hasProhibitionInstruction ? "存在" : "❌ 缺失");
    
  } catch (error) {
    console.error("❌ 分離上下文測試失敗:", error);
    testResults.errors.push("separated_context: " + error.message);
  }
  
  try {
    // 步驟 3: 測試修復後的傳統上下文
    console.log("\n🔧 步驟 3: 測試修復後的傳統上下文...");
    testResults.legacyContext = await window.__TAURI__.core.invoke("build_context", {
      projectId: PROJECT_ID,
      chapterId: CHAPTER_ID,
      position: POSITION
    });
    
    console.log("✅ 傳統上下文建構成功！");
    
    // 檢查語言純度指令
    const legacyHasCritical = testResults.legacyContext.includes("CRITICAL");
    const legacyHasStrict = testResults.legacyContext.includes("嚴格使用繁體中文");
    const legacyHasProhibition = testResults.legacyContext.includes("絕對禁止任何英文單詞或簡體字");
    
    console.log("\n🔍 傳統方法語言純度指令檢查:");
    console.log("  ✓ CRITICAL 標記:", legacyHasCritical ? "存在" : "❌ 缺失");
    console.log("  ✓ 嚴格繁體中文指令:", legacyHasStrict ? "存在" : "❌ 缺失");
    console.log("  ✓ 絕對禁止指令:", legacyHasProhibition ? "存在" : "❌ 缺失");
    
  } catch (error) {
    console.error("❌ 傳統上下文測試失敗:", error);
    testResults.errors.push("legacy_context: " + error.message);
  }
  
  try {
    // 步驟 4: 測試修復後的 AI 生成（使用分離上下文）
    console.log("\n🤖 步驟 4: 測試修復後的 AI 生成...");
    console.log("⏳ 正在生成，請稍候...");
    
    const startTime = Date.now();
    testResults.newGeneration = await window.__TAURI__.core.invoke("generate_with_separated_context", {
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
    const generationTime = Date.now() - startTime;
    
    console.log("✅ AI 生成成功！耗時:", generationTime + "ms");
    console.log("📝 生成內容 (" + testResults.newGeneration.length + " 字符):");
    console.log("「" + testResults.newGeneration + "」");
    
    // 語言純度分析
    console.log("\n🔍 生成內容語言純度分析:");
    
    // 檢查英文單詞
    const englishWords = testResults.newGeneration.match(/[a-zA-Z]+/g);
    console.log("  英文單詞檢測:", englishWords ? 
      "❌ 發現 " + englishWords.length + " 個: [" + englishWords.join(", ") + "]" : 
      "✅ 無英文單詞");
    
    // 檢查簡體字（常見的簡體字樣本檢測）
    const simplifiedChars = ['为', '应', '说', '这', '那', '过', '来', '时', '长', '国', '会', '还', '见', '间', '关', '开'];
    const foundSimplified = simplifiedChars.filter(char => testResults.newGeneration.includes(char));
    console.log("  簡體字檢測:", foundSimplified.length > 0 ? 
      "❌ 發現簡體字: [" + foundSimplified.join(", ") + "]" : 
      "✅ 無簡體字");
    
    // 檢查繁體中文字符比例
    const chineseChars = testResults.newGeneration.match(/[\u4e00-\u9fff]/g) || [];
    const chineseRatio = (chineseChars.length / testResults.newGeneration.length * 100).toFixed(1);
    console.log("  中文字符比例:", chineseRatio + "%");
    
  } catch (error) {
    console.error("❌ AI 生成測試失敗:", error);
    testResults.errors.push("new_generation: " + error.message);
  }
  
  // 步驟 5: 生成測試報告
  console.log("\n" + "=".repeat(60));
  console.log("📋 語言純度修復測試報告");
  console.log("=".repeat(60));
  
  console.log("\n🎯 修復效果總結:");
  
  // 系統提示改進檢查
  if (testResults.separatedSystemPrompt) {
    const improvements = [
      testResults.separatedSystemPrompt.includes("CRITICAL"),
      testResults.separatedSystemPrompt.includes("嚴格"),
      testResults.separatedSystemPrompt.includes("絕對不允許")
    ];
    const improvementCount = improvements.filter(Boolean).length;
    console.log("  📝 系統提示改進:", improvementCount + "/3 項改進已實施");
  }
  
  // 傳統上下文改進檢查
  if (testResults.legacyContext) {
    const legacyImprovements = [
      testResults.legacyContext.includes("CRITICAL"),
      testResults.legacyContext.includes("嚴格"),
      testResults.legacyContext.includes("絕對禁止")
    ];
    const legacyImprovementCount = legacyImprovements.filter(Boolean).length;
    console.log("  📋 傳統上下文改進:", legacyImprovementCount + "/3 項改進已實施");
  }
  
  // 生成品質評估
  if (testResults.newGeneration) {
    const hasEnglish = /[a-zA-Z]+/.test(testResults.newGeneration);
    const hasSimplified = ['为', '应', '说', '这', '那', '过', '来', '时'].some(char => 
      testResults.newGeneration.includes(char));
    
    console.log("  🤖 AI 生成品質:");
    console.log("    - 英文混雜:", hasEnglish ? "❌ 仍存在問題" : "✅ 已解決");
    console.log("    - 簡體字混雜:", hasSimplified ? "❌ 仍存在問題" : "✅ 已解決");
  }
  
  console.log("\n✅ 成功的改進:");
  if (testResults.separatedSystemPrompt) console.log("  ✓ 分離上下文系統提示強化");
  if (testResults.separatedUserContext) console.log("  ✓ 用戶上下文建構正常");
  if (testResults.legacyContext) console.log("  ✓ 傳統上下文方法強化");
  if (testResults.newGeneration) console.log("  ✓ AI 生成功能正常");
  
  if (testResults.errors.length > 0) {
    console.log("\n❌ 需要處理的問題:");
    testResults.errors.forEach(error => console.log("  ✗", error));
  }
  
  console.log("\n🎉 語言純度修復測試完成！");
  
  // 對比建議
  console.log("\n💡 下一步建議:");
  console.log("1. 使用相同測試數據運行新的 AI 生成");
  console.log("2. 與原始測試報告中的結果對比");
  console.log("3. 檢查是否還有英文單詞 'Scribble' 類似的問題");
  console.log("4. 驗證簡體字混雜問題是否得到解決");
  
  // 將結果保存到全局變量
  window.languagePurityTestResults = testResults;
  console.log("\n💾 測試結果已保存到 window.languagePurityTestResults");
  
})().catch(error => {
  console.error("🚨 語言純度測試腳本執行失敗:", error);
});