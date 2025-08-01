#!/usr/bin/env node

/**
 * 真實功能測試 - 測試新的分離上下文命令
 * 需要在 Tauri 應用運行時執行
 */

const { spawn } = require('child_process');

class RealFunctionalityTest {
  constructor() {
    this.testResults = [];
  }

  async runTests() {
    console.log('🔧 開始真實功能測試...\n');

    // 測試 1: 基本的分離上下文建構
    await this.testBuildSeparatedContext();
    
    // 測試 2: Token 統計功能
    await this.testTokenEstimation();
    
    // 測試 3: 與傳統方法對比
    await this.testComparison();

    this.generateSummary();
  }

  async testBuildSeparatedContext() {
    console.log('🧪 測試 1: build_separated_context 命令');
    
    try {
      // 這裡需要實際的項目和章節 ID
      // 在真實測試中，需要從應用的數據庫獲取
      console.log('  📝 準備測試數據...');
      console.log('  ⚠️  注意：此測試需要真實的項目數據');
      console.log('  💡 建議：在應用中創建測試項目和章節');
      
      this.testResults.push({
        test: 'build_separated_context',
        status: 'skipped',
        reason: '需要真實項目數據'
      });
      
    } catch (error) {
      console.log('  ❌ 測試失敗:', error.message);
      this.testResults.push({
        test: 'build_separated_context',
        status: 'failed',
        error: error.message
      });
    }
  }

  async testTokenEstimation() {
    console.log('\n🧪 測試 2: estimate_separated_context_tokens 命令');
    
    try {
      console.log('  📊 測試 token 統計功能...');
      console.log('  ⚠️  注意：此測試需要真實的項目數據');
      
      this.testResults.push({
        test: 'token_estimation',
        status: 'skipped',
        reason: '需要真實項目數據'
      });
      
    } catch (error) {
      console.log('  ❌ 測試失敗:', error.message);
      this.testResults.push({
        test: 'token_estimation',
        status: 'failed',
        error: error.message
      });
    }
  }

  async testComparison() {
    console.log('\n🧪 測試 3: 新舊方法對比');
    
    try {
      console.log('  ⚖️  對比分離上下文 vs 傳統上下文...');
      console.log('  ⚠️  注意：此測試需要真實的項目數據');
      
      this.testResults.push({
        test: 'method_comparison',
        status: 'skipped',
        reason: '需要真實項目數據'
      });
      
    } catch (error) {
      console.log('  ❌ 測試失敗:', error.message);
      this.testResults.push({
        test: 'method_comparison',
        status: 'failed',
        error: error.message
      });
    }
  }

  generateSummary() {
    console.log('\n📋 功能測試總結');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    
    console.log(`✅ 通過: ${passed}`);
    console.log(`❌ 失敗: ${failed}`);
    console.log(`⏭️  跳過: ${skipped}`);
    
    console.log('\n💡 測試建議:');
    console.log('1. 在應用中創建測試項目：');
    console.log('   - 項目名稱: "Context Engineering 測試"');
    console.log('   - 類型: "輕小說"');
    console.log('   - 添加 2-3 個角色');
    console.log('   - 創建包含內容的測試章節');
    
    console.log('\n2. 手動測試步驟:');
    console.log('   a) 開啟應用開發者工具 (F12)');
    console.log('   b) 在 Console 中執行以下命令:');
    console.log('');
    console.log('   // 測試分離上下文建構');
    console.log('   window.__TAURI__.core.invoke("build_separated_context", {');
    console.log('     project_id: "你的項目ID",');
    console.log('     chapter_id: "你的章節ID",');
    console.log('     position: 100,');
    console.log('     language: "zh-TW"');
    console.log('   }).then(result => {');
    console.log('     console.log("分離上下文結果:", result);');
    console.log('     console.log("系統提示長度:", result[0].length);');
    console.log('     console.log("用戶上下文長度:", result[1].length);');
    console.log('   });');
    console.log('');
    console.log('   // 測試 token 統計');
    console.log('   window.__TAURI__.core.invoke("estimate_separated_context_tokens", {');
    console.log('     project_id: "你的項目ID"');
    console.log('   }).then(result => {');
    console.log('     console.log("Token 統計:", result);');
    console.log('   });');
    console.log('');
    console.log('   // 測試新的生成命令');
    console.log('   window.__TAURI__.core.invoke("generate_with_separated_context", {');
    console.log('     project_id: "你的項目ID",');
    console.log('     chapter_id: "你的章節ID",');
    console.log('     position: 100,');
    console.log('     model: "llama3.2:latest",');
    console.log('     params: {');
    console.log('       temperature: 0.7,');
    console.log('       max_tokens: 200');
    console.log('     },');
    console.log('     language: "zh-TW"');
    console.log('   }).then(result => {');
    console.log('     console.log("生成結果:", result);');
    console.log('   });');
  }
}

// 執行測試
const test = new RealFunctionalityTest();
test.runTests().catch(console.error);