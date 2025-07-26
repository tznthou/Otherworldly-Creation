#!/usr/bin/env node

/**
 * 創世紀元系統診斷腳本
 * 用於檢查系統狀態和排查問題
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 創世紀元系統診斷');
console.log('==================\n');

const report = {
  timestamp: new Date().toISOString(),
  system: {},
  environment: {},
  dependencies: {},
  files: {},
  services: {},
  issues: [],
  recommendations: []
};

// 執行命令並捕獲輸出
function runCommand(command, description) {
  try {
    const result = execSync(command, { encoding: 'utf8', timeout: 5000 }).trim();
    console.log(`✅ ${description}: ${result}`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ ${description}: 失敗`);
    report.issues.push(`${description}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 檢查文件是否存在
function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${description}: ${exists ? '存在' : '不存在'}`);
  
  if (!exists) {
    report.issues.push(`缺少文件: ${filePath}`);
  }
  
  return exists;
}

// 系統資訊
console.log('📊 系統資訊');
console.log('-----------');

report.system = {
  platform: os.platform(),
  arch: os.arch(),
  type: os.type(),
  release: os.release(),
  totalMemGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
  freeMemGB: Math.round(os.freemem() / 1024 / 1024 / 1024),
  cpus: os.cpus().length
};

console.log(`作業系統: ${report.system.type} ${report.system.release}`);
console.log(`CPU 架構: ${report.system.arch}`);
console.log(`CPU 核心數: ${report.system.cpus}`);
console.log(`總記憶體: ${report.system.totalMemGB}GB`);
console.log(`可用記憶體: ${report.system.freeMemGB}GB`);

if (report.system.freeMemGB < 2) {
  report.issues.push('可用記憶體不足，建議至少 2GB');
  report.recommendations.push('關閉不必要的應用程式釋放記憶體');
}

// 環境檢查
console.log('\n🔧 開發環境');
console.log('-----------');

const nodeResult = runCommand('node --version', 'Node.js 版本');
if (nodeResult.success) {
  const majorVersion = parseInt(nodeResult.output.replace('v', '').split('.')[0]);
  report.environment.nodeVersion = nodeResult.output;
  report.environment.nodeMajorVersion = majorVersion;
  
  if (majorVersion < 16) {
    report.issues.push('Node.js 版本過舊，需要 v16 或更高版本');
    report.recommendations.push('升級 Node.js 到最新 LTS 版本');
  }
}

const npmResult = runCommand('npm --version', 'npm 版本');
if (npmResult.success) {
  report.environment.npmVersion = npmResult.output;
}

const gitResult = runCommand('git --version', 'Git 版本');
if (gitResult.success) {
  report.environment.gitVersion = gitResult.output;
}

// 專案文件檢查
console.log('\n📁 專案文件');
console.log('-----------');

const criticalFiles = [
  'package.json',
  'src/main/main.ts',
  'src/renderer/src/App.tsx',
  'src/main/database/database.ts',
  'src/main/services/updateService.ts',
  'src/renderer/src/components/Help/HelpCenter.tsx'
];

report.files.critical = {};
criticalFiles.forEach(file => {
  report.files.critical[file] = checkFile(file, file);
});

// 依賴檢查
console.log('\n📦 關鍵依賴');
console.log('-----------');

if (fs.existsSync('package.json')) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    report.dependencies.version = packageJson.version;
    report.dependencies.name = packageJson.name;
    
    // 檢查關鍵依賴
    const keyDeps = ['electron', 'better-sqlite3', 'react', 'typescript'];
    keyDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`✅ ${dep}: 已安裝`);
        report.dependencies[dep] = true;
      } else {
        console.log(`❌ ${dep}: 未安裝`);
        report.dependencies[dep] = false;
        report.issues.push(`缺少關鍵依賴: ${dep}`);
      }
    });
  } catch (error) {
    report.issues.push('無法讀取 package.json');
  }
}

// better-sqlite3 特別檢查
console.log('\n🗄️  SQLite 檢查');
console.log('---------------');

const sqlitePaths = [
  'node_modules/better-sqlite3/build/better_sqlite3.node',
  'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
  'node_modules/better-sqlite3/lib/binding/node-v' + process.versions.modules + '-' + os.platform() + '-' + os.arch() + '/better_sqlite3.node'
];

let sqliteFound = false;
for (const sqlitePath of sqlitePaths) {
  if (fs.existsSync(sqlitePath)) {
    console.log(`✅ SQLite 綁定: ${sqlitePath}`);
    sqliteFound = true;
    report.dependencies.sqliteBinding = sqlitePath;
    break;
  }
}

if (!sqliteFound) {
  console.log('❌ SQLite 綁定: 未找到');
  report.issues.push('better-sqlite3 原生模組未正確編譯');
  report.recommendations.push('執行: npm rebuild better-sqlite3');
}

// 編譯測試
console.log('\n🔨 編譯測試');
console.log('-----------');

try {
  execSync('npm run build:main', { stdio: 'pipe', timeout: 30000 });
  console.log('✅ 主進程編譯: 成功');
  report.build = { main: true };
} catch (error) {
  console.log('❌ 主進程編譯: 失敗');
  report.build = { main: false };
  report.issues.push('主進程編譯失敗');
}

try {
  execSync('npm run build:renderer', { stdio: 'pipe', timeout: 30000 });
  console.log('✅ 渲染進程編譯: 成功');
  report.build.renderer = true;
} catch (error) {
  console.log('❌ 渲染進程編譯: 失敗');
  report.build.renderer = false;
  report.issues.push('渲染進程編譯失敗');
}

// Ollama 服務檢查
console.log('\n🤖 AI 服務');
console.log('----------');

const ollamaResult = runCommand('ollama --version', 'Ollama 版本');
if (ollamaResult.success) {
  report.services.ollama = { installed: true, version: ollamaResult.output };
  
  // 檢查服務是否運行
  try {
    execSync('curl -s http://localhost:11434/api/version', { timeout: 3000 });
    console.log('✅ Ollama 服務: 運行中');
    report.services.ollama.running = true;
  } catch (error) {
    console.log('❌ Ollama 服務: 未運行');
    report.services.ollama.running = false;
    report.recommendations.push('啟動 Ollama 服務: ollama serve');
  }
} else {
  report.services.ollama = { installed: false };
  report.recommendations.push('安裝 Ollama 以啟用 AI 功能: https://ollama.ai');
}

// 網路連接測試
console.log('\n🌐 網路連接');
console.log('-----------');

try {
  execSync('curl -s --connect-timeout 5 https://registry.npmjs.org/', { timeout: 8000 });
  console.log('✅ npm 註冊表: 可連接');
  report.network = { npm: true };
} catch (error) {
  console.log('❌ npm 註冊表: 無法連接');
  report.network = { npm: false };
  report.issues.push('無法連接到 npm 註冊表');
}

// 產生報告
console.log('\n📋 診斷摘要');
console.log('-----------');

console.log(`發現問題: ${report.issues.length} 個`);
console.log(`建議改進: ${report.recommendations.length} 個`);

if (report.issues.length > 0) {
  console.log('\n❌ 發現的問題:');
  report.issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
}

if (report.recommendations.length > 0) {
  console.log('\n💡 建議:');
  report.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
}

// 儲存診斷報告
const reportPath = path.join(os.tmpdir(), `genesis-diagnostic-${Date.now()}.json`);
try {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 完整報告已保存: ${reportPath}`);
} catch (error) {
  console.log('\n⚠️  無法保存診斷報告');
}

// 結論
console.log('\n🎯 結論');
console.log('-------');

if (report.issues.length === 0) {
  console.log('✅ 系統狀態良好，可以正常使用創世紀元！');
} else if (report.issues.length <= 3) {
  console.log('⚠️  發現一些小問題，建議修復後使用');
} else {
  console.log('❌ 發現多個問題，建議修復後再使用');
}

console.log('\n如需幫助，請查看 INSTALLATION_GUIDE.md 或提供上述診斷報告');

process.exit(report.issues.length > 0 ? 1 : 0);