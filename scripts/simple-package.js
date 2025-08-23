#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 簡單打包 Genesis Chronicle...\n');

// 檢查必要文件
const requiredFiles = [
  'dist/main.js',
  'dist/renderer/index.html'
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

// 創建簡單的打包配置
const simpleConfig = `
module.exports = {
  packagerConfig: {
    name: 'Genesis Chronicle',
    executableName: 'genesis-chronicle',
    asar: false,
    ignore: [
      /^\\/src\\//,
      /^\\/\\.git/,
      /^\\/\\.vscode/,
      /^\\/coverage/,
      /^\\/node_modules\\/.*\\/test/,
      /^\\/node_modules\\/.*\\/tests/,
      /^\\/.*\\.test\\./,
      /^\\/.*\\.spec\\./,
      /^\\/test-.*\\.js$/,
      /^\\/run-.*\\.js$/,
      /^\\/TASK-.*\\.md$/,
      /^\\/scripts\\//,
    ],
    appBundleId: 'com.genesischronicle.app',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
  ],
  plugins: [],
};
`;

// 備份原配置
if (fs.existsSync('forge.config.js')) {
  fs.copyFileSync('forge.config.js', 'forge.config.js.backup');
}

// 寫入簡單配置
fs.writeFileSync('forge.config.simple.js', simpleConfig);

try {
  console.log('📦 開始打包...');
  // 臨時替換配置文件
  fs.renameSync('forge.config.js', 'forge.config.js.temp');
  fs.renameSync('forge.config.simple.js', 'forge.config.js');
  
  execSync('npx electron-forge package', { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      ELECTRON_REBUILD_SKIP: '1'
    }
  });
  
  console.log('\n🎉 打包完成！');
  
  // 檢查輸出
  const outDir = './out';
  if (fs.existsSync(outDir)) {
    const files = fs.readdirSync(outDir);
    console.log('📁 打包輸出:');
    files.forEach(file => {
      const filePath = path.join(outDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`   📂 ${file}/`);
      } else {
        const size = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📄 ${file} (${size} MB)`);
      }
    });
  }
  
} catch (error) {
  console.error('❌ 打包失敗:', error.message);
  process.exit(1);
} finally {
  // 恢復原配置
  if (fs.existsSync('forge.config.js')) {
    fs.unlinkSync('forge.config.js');
  }
  if (fs.existsSync('forge.config.js.temp')) {
    fs.renameSync('forge.config.js.temp', 'forge.config.js');
  }
  if (fs.existsSync('forge.config.simple.js')) {
    fs.unlinkSync('forge.config.simple.js');
  }
}

console.log('\n💡 提示:');
console.log('   - 打包的應用程式位於 ./out/ 目錄');
console.log('   - 可以直接執行測試應用程式');
console.log('   - 如需創建安裝程式，請使用 npm run make');