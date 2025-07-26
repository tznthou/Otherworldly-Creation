#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 手動打包 Genesis Chronicle...\n');

// 檢查必要文件
const requiredFiles = [
  'dist/main.js',
  'dist/renderer/index.html',
  'package.json'
];

console.log('🔍 檢查構建文件...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 缺少必要文件: ${file}`);
    console.log('請先執行: npm run build');
    process.exit(1);
  }
}
console.log('✅ 構建文件檢查完成');

// 創建輸出目錄
const outDir = './out/genesis-chronicle-manual';
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true });
}
fs.mkdirSync(outDir, { recursive: true });

console.log('📁 創建應用程式目錄結構...');

// 複製必要文件
const filesToCopy = [
  { src: 'dist/', dest: 'dist/' },
  { src: 'package.json', dest: 'package.json' },
  { src: 'assets/', dest: 'assets/' },
  { src: 'node_modules/', dest: 'node_modules/' }
];

for (const file of filesToCopy) {
  const srcPath = file.src;
  const destPath = path.join(outDir, file.dest);
  
  if (fs.existsSync(srcPath)) {
    console.log(`   複製 ${srcPath} -> ${destPath}`);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      execSync(`cp -r "${srcPath}" "${destPath}"`, { stdio: 'pipe' });
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 創建啟動腳本
console.log('📝 創建啟動腳本...');

// macOS/Linux 啟動腳本
const startScript = `#!/bin/bash
cd "$(dirname "$0")"
echo "啟動 Genesis Chronicle..."
echo "檢查 Node.js..."
node --version
echo "檢查 npm..."
npm --version
echo "安裝依賴（如果需要）..."
npm install --production
echo "啟動應用程式..."
./node_modules/.bin/electron dist/main.js
`;

fs.writeFileSync(path.join(outDir, 'start.sh'), startScript);
fs.chmodSync(path.join(outDir, 'start.sh'), '755');

// Windows 啟動腳本
const startBat = `@echo off
cd /d "%~dp0"
echo 啟動 Genesis Chronicle...
echo 檢查 Node.js...
node --version
echo 檢查 npm...
npm --version
echo 安裝依賴（如果需要）...
npm install --production
echo 啟動應用程式...
.\\node_modules\\.bin\\electron.cmd dist\\main.js
pause
`;

fs.writeFileSync(path.join(outDir, 'start.bat'), startBat);

// 創建 README
const readme = `# Genesis Chronicle - 創世紀元：異世界創作神器

## 安裝說明

### 前置需求
- Node.js 16 或更高版本
- npm 或 yarn

### 啟動應用程式

#### macOS/Linux
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

#### Windows
雙擊 \`start.bat\` 或在命令提示字元中執行：
\`\`\`cmd
start.bat
\`\`\`

#### 手動啟動
\`\`\`bash
npm install
npx electron dist/main.js
\`\`\`

## 功能特色
- 基於 AI 的輕小說創作輔助
- 支援異世界、校園、科幻等多種題材
- 章節式寫作管理
- 角色關係管理
- 模板系統

## 系統需求
- 作業系統: Windows 10+, macOS 10.15+, 或 Linux (Ubuntu 18.04+)
- 記憶體: 最少 4GB RAM，建議 8GB+
- 儲存空間: 至少 500MB 可用空間
- 網路: 需要網路連接以使用 AI 功能（Ollama）

## 注意事項
- 首次使用前請確保已安裝並配置 Ollama
- 建議定期備份您的創作內容
- 如遇問題請查看應用程式內的幫助文檔

## 版本資訊
- 版本: ${JSON.parse(fs.readFileSync('package.json', 'utf8')).version}
- 構建日期: ${new Date().toLocaleString('zh-TW')}
- 平台: ${process.platform}
`;

fs.writeFileSync(path.join(outDir, 'README.md'), readme);

// 創建簡化的 package.json（只包含運行時依賴）
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const runtimePackage = {
  name: originalPackage.name,
  version: originalPackage.version,
  description: originalPackage.description,
  main: originalPackage.main,
  author: originalPackage.author,
  license: originalPackage.license,
  dependencies: originalPackage.dependencies
};

fs.writeFileSync(
  path.join(outDir, 'package.json'), 
  JSON.stringify(runtimePackage, null, 2)
);

console.log('\n🎉 手動打包完成！');
console.log(`📁 輸出位置: ${outDir}`);
console.log('\n📋 包含文件:');

function listFiles(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`${prefix}📂 ${file}/`);
      if (file !== 'node_modules') { // 不展開 node_modules
        listFiles(filePath, prefix + '  ');
      }
    } else {
      const size = (stats.size / 1024).toFixed(1);
      console.log(`${prefix}📄 ${file} (${size} KB)`);
    }
  });
}

listFiles(outDir);

console.log('\n💡 使用說明:');
console.log('   1. 進入輸出目錄');
console.log('   2. 執行 npm install（如果需要）');
console.log('   3. 執行啟動腳本或手動啟動');
console.log('   4. 可以將整個目錄打包分發');

// 計算總大小
function calculateSize(dir) {
  let totalSize = 0;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      totalSize += calculateSize(filePath);
    } else {
      totalSize += stats.size;
    }
  });
  return totalSize;
}

const totalSize = calculateSize(outDir);
console.log(`\n📊 總大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);