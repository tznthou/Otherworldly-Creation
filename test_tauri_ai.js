// 測試 Tauri AI 功能的腳本
const { invoke } = require('@tauri-apps/api/core');

console.log('開始測試 Tauri AI 功能...');

// 測試檢查 Ollama 服務
invoke('check_ollama_service')
  .then(result => {
    console.log('check_ollama_service 結果:', result);
    return invoke('get_service_status');
  })
  .then(status => {
    console.log('get_service_status 結果:', status);
    return invoke('list_models');
  })
  .then(models => {
    console.log('list_models 結果:', models);
  })
  .catch(error => {
    console.error('測試失敗:', error);
  });
EOF < /dev/null