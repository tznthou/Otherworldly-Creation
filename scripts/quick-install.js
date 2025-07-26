#!/usr/bin/env node

/**
 * 創世紀元快速安裝腳本
 * 自動檢查系統環境並安裝必要依賴
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 創世紀元快速安裝腳本');
console.log('================================\n');

// 顏色輸出函數
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 檢查系統需求
async function checkSystemRequirements() {
  console.log('📋 檢查系統需求...\n');
  
  // 檢查 Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion >= 16) {
      success(`Node.js 版本: ${nodeVersion}`);
    } else {
      error(`Node.js 版本過舊: ${nodeVersion}，需要 v16 或更高版本`);
      return false;
    }
  } catch (err) {
    error('Node.js 未安裝或無法執行');
    return false;
  }
  
  // 檢查 npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    success(`npm 版本: ${npmVersion}`);
  } catch (err) {
    error('npm 未安裝或無法執行');
    return false;
  }
  
  // 檢查 Git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    success(`${gitVersion}`);
  } catch (err) {
    warning('Git 未安裝，某些功能可能受限');
  }
  
  // 系統資訊
  info(`作業系統: ${os.type()} ${os.release()}`);
  info(`CPU 架構: ${os.arch()}`);
  info(`總記憶體: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  
  const freeMemGB = Math.round(os.freemem() / 1024 / 1024 / 1024);
  if (freeMemGB >= 4) {
    success(`可用記憶體: ${freeMemGB}GB`);
  } else {
    warning(`可用記憶體不足: ${freeMemGB}GB，建議至少 4GB`);
  }
  
  return true;
}

// 安裝依賴
async function installDependencies() {
  console.log('\n📦 安裝專案依賴...\n');
  
  return new Promise((resolve, reject) => {
    info('正在執行 npm install...');
    
    const install = spawn('npm', ['install'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    install.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write('.');
    });
    
    install.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    install.on('close', (code) => {
      console.log(''); // 換行
      
      if (code === 0) {
        success('依賴安裝完成');
        resolve();
      } else {
        error('依賴安裝失敗');
        if (errorOutput) {
          console.log('\n錯誤輸出:');
          console.log(errorOutput);
        }
        reject(new Error('npm install failed'));
      }
    });
  });
}

// 重建原生模組
async function rebuildNativeModules() {
  console.log('\n🔧 重建原生模組...\n');
  
  try {
    info('正在重建 better-sqlite3...');
    execSync('npm rebuild better-sqlite3', { stdio: 'inherit' });
    success('better-sqlite3 重建完成');
  } catch (err) {
    error('better-sqlite3 重建失敗');
    warning('嘗試替代方案...');
    
    try {
      execSync('npm install better-sqlite3 --build-from-source', { stdio: 'inherit' });
      success('better-sqlite3 重新安裝完成');
    } catch (err2) {
      error('無法修復 better-sqlite3，請手動處理');
      throw err2;
    }
  }
}

// 測試編譯
async function testBuild() {
  console.log('\n🧪 測試編譯...\n');
  
  try {
    info('正在編譯專案...');
    execSync('npm run build', { stdio: 'pipe' });
    success('編譯測試通過');
  } catch (err) {
    error('編譯測試失敗');
    throw err;
  }
}

// 檢查 Ollama（可選）
async function checkOllama() {
  console.log('\n🤖 檢查 AI 功能...\n');
  
  try {
    const ollamaVersion = execSync('ollama --version', { encoding: 'utf8' }).trim();
    success(`Ollama 已安裝: ${ollamaVersion}`);
    
    try {
      // 檢查 Ollama 服務是否運行
      execSync('curl -s http://localhost:11434/api/version', { timeout: 3000 });
      success('Ollama 服務正在運行');
    } catch (err) {
      warning('Ollama 服務未運行，請執行: ollama serve');
    }
    
    return true;
  } catch (err) {
    warning('Ollama 未安裝，AI 功能將不可用');
    info('安裝 Ollama: https://ollama.ai');
    return false;
  }
}

// 創建快速啟動腳本
function createStartScript() {
  const scriptContent = {
    windows: `@echo off
echo 啟動創世紀元開發環境...
npm run dev
pause`,
    
    unix: `#!/bin/bash
echo "啟動創世紀元開發環境..."
npm run dev`
  };
  
  try {
    if (os.platform() === 'win32') {
      fs.writeFileSync('start-dev.bat', scriptContent.windows);
      success('創建啟動腳本: start-dev.bat');
    } else {
      fs.writeFileSync('start-dev.sh', scriptContent.unix);
      execSync('chmod +x start-dev.sh');
      success('創建啟動腳本: start-dev.sh');
    }
  } catch (err) {
    warning('無法創建啟動腳本');
  }
}

// 顯示完成信息
function showCompletionInfo(hasOllama) {
  console.log('\n🎉 安裝完成!\n');
  
  success('創世紀元已準備就緒');
  
  console.log('\n📚 下一步:');
  console.log('1. 啟動開發環境:');
  if (os.platform() === 'win32') {
    console.log('   雙擊 start-dev.bat 或執行 npm run dev');
  } else {
    console.log('   執行 ./start-dev.sh 或 npm run dev');
  }
  
  console.log('2. 在瀏覽器中打開應用程式');
  
  if (!hasOllama) {
    console.log('3. (可選) 安裝 Ollama 以啟用 AI 功能:');
    console.log('   - 下載: https://ollama.ai');
    console.log('   - 安裝後執行: ollama pull llama3.2');
    console.log('   - 啟動服務: ollama serve');
  }
  
  console.log('\n📖 獲取幫助:');
  console.log('- 查看 INSTALLATION_GUIDE.md 了解詳細說明');
  console.log('- 應用程式內有完整的使用教學和文檔');
  
  console.log('\n✨ 祝您創作愉快！');
}

// 主安裝流程
async function main() {
  try {
    // 檢查系統需求
    const systemOk = await checkSystemRequirements();
    if (!systemOk) {
      process.exit(1);
    }
    
    // 安裝依賴
    await installDependencies();
    
    // 重建原生模組
    await rebuildNativeModules();
    
    // 測試編譯
    await testBuild();
    
    // 檢查 Ollama
    const hasOllama = await checkOllama();
    
    // 創建快速啟動腳本
    createStartScript();
    
    // 顯示完成信息
    showCompletionInfo(hasOllama);
    
  } catch (err) {
    error(`安裝失敗: ${err.message}`);
    console.log('\n💡 建議:');
    console.log('1. 檢查網路連線');
    console.log('2. 確認 Node.js 版本 >= 16');
    console.log('3. 查看 INSTALLATION_GUIDE.md 了解詳細解決方案');
    console.log('4. 如需幫助，請提供完整的錯誤信息');
    process.exit(1);
  }
}

// 檢查是否在正確的目錄中運行
if (!fs.existsSync('package.json')) {
  error('請在專案根目錄中運行此腳本');
  process.exit(1);
}

// 執行安裝
main();