const { execSync } = require('child_process');

console.log('📦 安裝整合測試依賴...\n');

const dependencies = [
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@testing-library/user-event',
  'jest-environment-jsdom',
  'identity-obj-proxy'
];

try {
  const installCommand = `npm install --save-dev ${dependencies.join(' ')}`;
  
  console.log('執行命令:', installCommand);
  console.log('='.repeat(60));
  
  execSync(installCommand, {
    cwd: process.cwd(),
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ 測試依賴安裝完成！');
  
  console.log('\n📦 已安裝的依賴:');
  dependencies.forEach(dep => {
    console.log(`• ${dep}`);
  });
  
  console.log('\n💡 接下來可以執行:');
  console.log('• node run-integration-tests.js - 運行整合測試');
  console.log('• npm test - 運行所有測試');
  
} catch (error) {
  console.error('\n❌ 依賴安裝失敗:');
  console.error(error.message);
  process.exit(1);
}