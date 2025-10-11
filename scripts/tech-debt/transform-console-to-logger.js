#!/usr/bin/env node

/**
 * Console 轉 Logger 半自動化腳本
 *
 * 功能：
 * 1. 讀取 TypeScript/TSX 檔案
 * 2. 自動添加 Logger import
 * 3. 轉換簡單模式的 console 調用
 * 4. 保留複雜情況（需人工處理）
 * 5. 生成備份檔案
 *
 * 使用方式：
 * node scripts/tech-debt/transform-console-to-logger.js <file-path> [--dry-run]
 *
 * 範例：
 * node scripts/tech-debt/transform-console-to-logger.js src/renderer/src/store/slices/aiSlice.ts
 * node scripts/tech-debt/transform-console-to-logger.js src/renderer/src/store/slices/aiSlice.ts --dry-run
 *
 * 創建日期：2025-10-11
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  loggerImportPath: '../../utils/logger',  // 預設路徑，會自動調整
  backupExtension: '.backup-console',
};

/**
 * 計算相對路徑（從檔案到 logger.ts）
 */
function calculateLoggerPath(filePath) {
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(__dirname, '../../src/renderer/src/utils/logger.ts');

  let relativePath = path.relative(fileDir, path.dirname(loggerPath));
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath + '/logger';
}

/**
 * 從檔案路徑提取模組名
 */
function extractModuleName(filePath) {
  const fileName = path.basename(filePath);
  // 移除副檔名
  return fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
}

/**
 * 檢查檔案是否已經引入 logger
 */
function hasLoggerImport(content) {
  return /import.*from.*['"].*logger['"]/.test(content);
}

/**
 * 添加 Logger import 和創建模組 logger
 */
function addLoggerImport(content, filePath) {
  const moduleName = extractModuleName(filePath);
  const loggerPath = calculateLoggerPath(filePath);

  // 找到最後一個 import 語句的位置
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // 沒有 import，添加到檔案開頭
    lastImportIndex = 0;
  }

  // 插入 logger import 和創建語句
  const loggerImport = `import { createLogger } from '${loggerPath}';`;
  const loggerCreate = `\n// 創建模組專用 logger\nconst log = createLogger('${moduleName}');`;

  lines.splice(lastImportIndex + 1, 0, loggerImport, loggerCreate);

  return lines.join('\n');
}

/**
 * 轉換 console 調用為 logger
 */
function transformConsoleCalls(content) {
  const lines = content.split('\n');
  const transformedLines = [];
  const stats = {
    transformed: 0,
    skipped: 0,
    errors: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;

    // 檢查是否包含 console 調用
    if (/console\.(log|error|warn|info|debug)/.test(line)) {
      try {
        // 檢測複雜模式（跳過不處理）
        const isComplex = /console\.\w+\([^)]*`[^`]*\$\{/.test(line) ||  // 模板字串
                          /console\.\w+\([^)]*\?[^)]*:/.test(line) ||     // 三元運算
                          /console\.\w+\([^)]*\+[^)]*\+/.test(line);      // 多重字串拼接

        if (isComplex) {
          transformedLines.push(line + ' // TODO: 複雜模式，需人工轉換');
          stats.skipped++;
          continue;
        }

        // 簡單模式轉換
        // 1. console.log → log.debug
        line = line.replace(/console\.log\(/g, 'log.debug(');

        // 2. console.info → log.info
        line = line.replace(/console\.info\(/g, 'log.info(');

        // 3. console.warn → log.warn
        line = line.replace(/console\.warn\(/g, 'log.warn(');

        // 4. console.error → log.error
        line = line.replace(/console\.error\(/g, 'log.error(');

        // 5. console.debug → log.debug
        line = line.replace(/console\.debug\(/g, 'log.debug(');

        if (line !== originalLine) {
          stats.transformed++;
        }
      } catch (error) {
        console.error(`❌ 轉換第 ${i + 1} 行時發生錯誤:`, error.message);
        line = originalLine + ' // ERROR: 自動轉換失敗';
        stats.errors++;
      }
    }

    transformedLines.push(line);
  }

  return {
    content: transformedLines.join('\n'),
    stats,
  };
}

/**
 * 處理單個檔案
 */
function processFile(filePath, dryRun = false) {
  console.log(`\n📄 處理檔案: ${filePath}`);

  // 檢查檔案是否存在
  if (!fs.existsSync(filePath)) {
    console.error('❌ 檔案不存在:', filePath);
    return false;
  }

  // 讀取檔案內容
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 檢查是否已經有 logger
  const hasLogger = hasLoggerImport(content);

  if (!hasLogger) {
    console.log('➕ 添加 Logger import...');
    content = addLoggerImport(content, filePath);
  } else {
    console.log('✅ Logger import 已存在');
  }

  // 轉換 console 調用
  console.log('🔄 轉換 console 調用...');
  const { content: transformedContent, stats } = transformConsoleCalls(content);

  // 輸出統計
  console.log('\n📊 轉換統計:');
  console.log(`   ✅ 成功轉換: ${stats.transformed} 個`);
  console.log(`   ⏭️  跳過複雜: ${stats.skipped} 個`);
  console.log(`   ❌ 錯誤: ${stats.errors} 個`);

  if (dryRun) {
    console.log('\n🔍 Dry-run 模式：不寫入檔案');
    console.log('\n--- 變更預覽（前 50 行） ---');
    const previewLines = transformedContent.split('\n').slice(0, 50);
    previewLines.forEach((line, i) => {
      if (line.includes('log.')) {
        console.log(`${i + 1}: ${line}`);
      }
    });
    return true;
  }

  // 創建備份
  const backupPath = filePath + CONFIG.backupExtension;
  console.log(`\n💾 創建備份: ${backupPath}`);
  fs.writeFileSync(backupPath, originalContent, 'utf-8');

  // 寫入轉換後的內容
  console.log('💿 寫入轉換後的內容...');
  fs.writeFileSync(filePath, transformedContent, 'utf-8');

  console.log('✅ 完成！');
  console.log(`\n💡 下一步:`);
  console.log(`   1. 檢查檔案: ${filePath}`);
  console.log(`   2. 運行編譯: npx tsc --noEmit ${filePath}`);
  console.log(`   3. 測試功能`);
  console.log(`   4. 如果有問題，恢復備份: cp ${backupPath} ${filePath}`);

  return true;
}

/**
 * 批量處理多個檔案
 */
function processBatch(filePaths, dryRun = false) {
  console.log(`\n🚀 批量處理 ${filePaths.length} 個檔案...\n`);

  const results = [];
  for (const filePath of filePaths) {
    const success = processFile(filePath, dryRun);
    results.push({ filePath, success });
  }

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('📊 批量處理總結');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ 成功: ${successCount} 個`);
  console.log(`❌ 失敗: ${failCount} 個`);

  if (failCount > 0) {
    console.log('\n失敗的檔案:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.filePath}`);
    });
  }
}

/**
 * 主函數
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Console 轉 Logger 半自動化工具

用法:
  node transform-console-to-logger.js <file-path> [--dry-run]
  node transform-console-to-logger.js --batch file1.ts file2.ts file3.ts [--dry-run]

選項:
  --dry-run    只顯示預覽，不修改檔案
  --batch      批量處理多個檔案

範例:
  # 單個檔案
  node transform-console-to-logger.js src/store/slices/aiSlice.ts

  # Dry-run 預覽
  node transform-console-to-logger.js src/store/slices/aiSlice.ts --dry-run

  # 批量處理
  node transform-console-to-logger.js --batch file1.ts file2.ts file3.ts
    `);
    return;
  }

  const dryRun = args.includes('--dry-run');
  const isBatch = args.includes('--batch');

  if (isBatch) {
    const filePaths = args.filter(arg => !arg.startsWith('--'));
    processBatch(filePaths, dryRun);
  } else {
    const filePath = args.find(arg => !arg.startsWith('--'));
    if (filePath) {
      processFile(filePath, dryRun);
    } else {
      console.error('❌ 請提供檔案路徑');
    }
  }
}

// 執行
if (require.main === module) {
  main();
}

module.exports = { processFile, processBatch, transformConsoleCalls };
