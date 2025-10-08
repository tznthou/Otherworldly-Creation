#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 開始構建 Genesis Chronicle...\n');

// 檢查 Node.js 版本
const nodeVersion = process.version;
console.log(`📋 Node.js 版本: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 16) {
  console.error('❌ 需要 Node.js 16 或更高版本');
  process.exit(1);
}

// 構建步驟
const steps = [
  {
    name: '清理舊文件',
    command: 'npm run clean',
    description: '清理 dist 和 out 目錄'
  },
  {
    name: '代碼檢查',
    command: 'npm run lint',
    description: '執行 ESLint 代碼檢查'
  },
  {
    name: '單元測試',
    command: 'npm run test:unit',
    description: '執行單元測試確保代碼品質'
  },
  {
    name: '構建主進程',
    command: 'npm run build:main',
    description: '編譯 TypeScript 主進程代碼'
  },
  {
    name: '構建渲染進程',
    command: 'npm run build:renderer',
    description: '構建 React 應用程式'
  },
  {
    name: '打包應用程式',
    command: 'npm run package',
    description: '使用 Electron Forge 打包應用程式'
  }
];

// 執行構建步驟
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`\n📦 步驟 ${i + 1}/${steps.length}: ${step.name}`);
  console.log(`   ${step.description}`);
  
  try {
    execSync(step.command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${step.name} 完成`);
  } catch (error) {
    console.error(`❌ ${step.name} 失敗:`);
    console.error(error.message);
    process.exit(1);
  }
}

// 檢查輸出文件
console.log('\n🔍 檢查構建輸出...');

const outDir = path.join(process.cwd(), 'out');
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir);
  console.log('📁 構建輸出文件:');
  files.forEach(file => {
    const filePath = path.join(outDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   - ${file} (${size} MB)`);
  });
} else {
  console.log('⚠️  未找到輸出目錄');
}

console.log('\n🎉 構建完成！');
console.log('📍 輸出位置: ./out/');
console.log('💡 提示: 使用 npm run make 創建安裝程式');