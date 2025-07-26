#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 優化應用程式資源...\n');

// 創建 scripts 目錄（如果不存在）
const scriptsDir = path.dirname(__filename);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// 資源優化配置
const resourceConfig = {
  icons: {
    source: './assets/icon.svg',
    outputs: [
      { name: 'icon.png', size: 512 },
      { name: 'icon@2x.png', size: 1024 },
      { name: 'icon-16.png', size: 16 },
      { name: 'icon-32.png', size: 32 },
      { name: 'icon-48.png', size: 48 },
      { name: 'icon-64.png', size: 64 },
      { name: 'icon-128.png', size: 128 },
      { name: 'icon-256.png', size: 256 }
    ]
  }
};

// 檢查必要的資源文件
function checkResources() {
  console.log('📋 檢查資源文件...');
  
  const assetsDir = './assets';
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log('✅ 創建 assets 目錄');
  }
  
  // 檢查 SVG 圖標
  if (!fs.existsSync(resourceConfig.icons.source)) {
    console.log('⚠️  未找到 SVG 圖標，將創建預設圖標');
    createDefaultIcon();
  } else {
    console.log('✅ 找到 SVG 圖標');
  }
}

// 創建預設圖標（如果需要）
function createDefaultIcon() {
  const defaultSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1a1a2e"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="#ffd700" stroke-width="4"/>
  <path d="M256,156 L296,236 L376,236 L316,286 L336,366 L256,316 L176,366 L196,286 L136,236 L216,236 Z" fill="#ffd700"/>
  <rect x="216" y="320" width="80" height="40" rx="4" fill="#4a5568"/>
  <rect x="221" y="325" width="70" height="30" rx="2" fill="#e2e8f0"/>
</svg>`;
  
  fs.writeFileSync(resourceConfig.icons.source, defaultSvg);
  console.log('✅ 創建預設 SVG 圖標');
}

// 創建應用程式資訊文件
function createAppInfo() {
  console.log('📄 創建應用程式資訊文件...');
  
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  
  const appInfo = {
    name: packageJson.name,
    displayName: 'Genesis Chronicle',
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    license: packageJson.license,
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    electronVersion: packageJson.devDependencies.electron
  };
  
  fs.writeFileSync('./assets/app-info.json', JSON.stringify(appInfo, null, 2));
  console.log('✅ 創建應用程式資訊文件');
}

// 創建構建資訊
function createBuildInfo() {
  console.log('🔧 創建構建資訊...');
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production'
  };
  
  const buildInfoPath = './src/renderer/src/build-info.json';
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  console.log('✅ 創建構建資訊文件');
}

// 優化資源大小
function optimizeResources() {
  console.log('⚡ 優化資源...');
  
  // 這裡可以添加圖片壓縮、CSS 最小化等優化邏輯
  // 由於我們使用 Vite，大部分優化會自動處理
  
  console.log('✅ 資源優化完成');
}

// 主執行函數
function main() {
  try {
    checkResources();
    createAppInfo();
    createBuildInfo();
    optimizeResources();
    
    console.log('\n🎉 資源優化完成！');
    console.log('📁 資源文件位置: ./assets/');
    console.log('💡 提示: 現在可以執行 npm run build 進行構建');
    
  } catch (error) {
    console.error('❌ 資源優化失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { main };