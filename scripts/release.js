#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 開始發布 Genesis Chronicle...\n');

// 讀取 package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

console.log(`📦 當前版本: ${version}`);
console.log(`🏷️  應用程式名稱: ${packageJson.name}`);

// 發布步驟
const steps = [
  {
    name: '版本檢查',
    action: () => {
      console.log('   檢查版本號格式...');
      if (!/^\d+\.\d+\.\d+/.test(version)) {
        throw new Error('版本號格式不正確，應為 x.y.z 格式');
      }
      console.log('   ✅ 版本號格式正確');
    }
  },
  {
    name: '清理環境',
    action: () => {
      console.log('   清理舊的構建文件...');
      execSync('npm run clean', { stdio: 'inherit' });
    }
  },
  {
    name: '優化資源',
    action: () => {
      console.log('   優化應用程式資源...');
      execSync('npm run optimize', { stdio: 'inherit' });
    }
  },
  {
    name: '代碼檢查',
    action: () => {
      console.log('   執行代碼檢查...');
      execSync('npm run lint', { stdio: 'inherit' });
    }
  },
  {
    name: '執行測試',
    action: () => {
      console.log('   執行單元測試...');
      execSync('npm run test:unit', { stdio: 'inherit' });
    }
  },
  {
    name: '構建應用程式',
    action: () => {
      console.log('   構建應用程式...');
      execSync('npm run build', { stdio: 'inherit' });
    }
  },
  {
    name: '創建安裝程式',
    action: () => {
      console.log('   創建各平台安裝程式...');
      
      // 根據當前平台決定構建目標
      const platform = process.platform;
      let makeCommand = 'npm run make';
      
      if (platform === 'darwin') {
        makeCommand = 'npm run make:mac';
      } else if (platform === 'win32') {
        makeCommand = 'npm run make:win';
      } else if (platform === 'linux') {
        makeCommand = 'npm run make:linux';
      }
      
      execSync(makeCommand, { stdio: 'inherit' });
    }
  },
  {
    name: '生成發布報告',
    action: () => {
      console.log('   生成發布報告...');
      generateReleaseReport();
    }
  }
];

// 生成發布報告
function generateReleaseReport() {
  const outDir = './out';
  const report = {
    version: version,
    buildDate: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    files: []
  };
  
  if (fs.existsSync(outDir)) {
    const files = fs.readdirSync(outDir, { recursive: true });
    files.forEach(file => {
      const filePath = path.join(outDir, file);
      if (fs.statSync(filePath).isFile()) {
        const stats = fs.statSync(filePath);
        report.files.push({
          name: file,
          size: stats.size,
          sizeFormatted: (stats.size / 1024 / 1024).toFixed(2) + ' MB'
        });
      }
    });
  }
  
  fs.writeFileSync('./RELEASE-REPORT.json', JSON.stringify(report, null, 2));
  
  // 生成 Markdown 報告
  const markdownReport = `# Genesis Chronicle 發布報告

## 版本資訊
- **版本**: ${version}
- **構建日期**: ${new Date().toLocaleString('zh-TW')}
- **平台**: ${process.platform}
- **架構**: ${process.arch}
- **Node.js 版本**: ${process.version}

## 構建文件

${report.files.map(file => `- **${file.name}** (${file.sizeFormatted})`).join('\n')}

## 安裝說明

### Windows
1. 下載 \`Genesis-Chronicle-Setup.exe\`
2. 執行安裝程式並按照指示完成安裝
3. 從開始選單或桌面啟動應用程式

### macOS
1. 下載 \`.dmg\` 文件
2. 雙擊掛載磁碟映像
3. 將 Genesis Chronicle 拖拽到 Applications 資料夾
4. 從 Launchpad 或 Applications 資料夾啟動應用程式

### Linux
1. 下載對應的 \`.deb\` 或 \`.rpm\` 文件
2. 使用套件管理器安裝：
   - Ubuntu/Debian: \`sudo dpkg -i genesis-chronicle_${version}_amd64.deb\`
   - CentOS/RHEL: \`sudo rpm -i genesis-chronicle-${version}.x86_64.rpm\`
3. 從應用程式選單啟動

## 系統需求
- **作業系統**: Windows 10+, macOS 10.15+, 或 Linux (Ubuntu 18.04+)
- **記憶體**: 最少 4GB RAM，建議 8GB+
- **儲存空間**: 至少 500MB 可用空間
- **網路**: 需要網路連接以使用 AI 功能（Ollama）

## 注意事項
- 首次使用前請確保已安裝並配置 Ollama
- 建議定期備份您的創作內容
- 如遇問題請查看應用程式內的幫助文檔
`;
  
  fs.writeFileSync('./RELEASE-REPORT.md', markdownReport);
}

// 執行發布流程
async function main() {
  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n📋 步驟 ${i + 1}/${steps.length}: ${step.name}`);
      
      await step.action();
      console.log(`✅ ${step.name} 完成`);
    }
    
    console.log('\n🎉 發布完成！');
    console.log('📁 安裝程式位置: ./out/');
    console.log('📄 發布報告: ./RELEASE-REPORT.md');
    console.log('\n💡 下一步:');
    console.log('   1. 測試安裝程式');
    console.log('   2. 準備發布說明');
    console.log('   3. 上傳到發布平台');
    
  } catch (error) {
    console.error(`\n❌ 發布失敗: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { main };