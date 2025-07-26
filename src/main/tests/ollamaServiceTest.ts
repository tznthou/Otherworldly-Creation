import { ollamaService } from '../services/ollamaService';

/**
 * 測試 Ollama 服務
 */
async function testOllamaService() {
  console.log('測試 Ollama 服務...');
  
  // 1. 檢查服務可用性
  console.log('1. 檢查服務可用性');
  const serviceCheck = await ollamaService.checkServiceAvailability();
  console.log('服務可用性:', serviceCheck);
  
  if (!serviceCheck.available) {
    console.log('Ollama 服務不可用，測試結束');
    return;
  }
  
  // 2. 獲取模型列表
  console.log('\n2. 獲取模型列表');
  const modelsResult = await ollamaService.listModels();
  console.log('模型列表結果:', modelsResult);
  
  if (!modelsResult.success || modelsResult.models.length === 0) {
    console.log('無法獲取模型列表或沒有可用模型，測試結束');
    return;
  }
  
  // 3. 檢查最小的模型的可用性
  // 找出最小的模型（通常運行更快）
  const smallestModel = modelsResult.models.reduce((smallest, current) => 
    current.size < smallest.size ? current : smallest, modelsResult.models[0]);
  
  console.log(`\n3. 檢查模型 "${smallestModel.name}" 的可用性`);
  const modelCheck = await ollamaService.checkModelAvailability(smallestModel.name);
  console.log('模型可用性:', modelCheck);
  
  if (!modelCheck.available) {
    console.log(`模型 "${smallestModel.name}" 不可用，測試結束`);
    return;
  }
  
  // 4. 生成簡單的文本
  console.log(`\n4. 使用模型 "${smallestModel.name}" 生成文本`);
  
  // 增加超時時間
  ollamaService.updateConfig({
    timeout: 60000, // 60秒
  });
  
  const generateResult = await ollamaService.generateText(
    smallestModel.name,
    '你好，請用中文簡單介紹一下自己。',
    {
      temperature: 0.7,
      maxTokens: 100,
    }
  );
  console.log('生成結果:', generateResult);
  
  console.log('\n測試完成!');
}

// 執行測試
testOllamaService().catch(error => {
  console.error('測試過程中發生錯誤:', error);
});