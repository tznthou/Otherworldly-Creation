#!/usr/bin/env node

/**
 * Console 使用分析工具
 *
 * 功能：
 * 1. 掃描所有 TypeScript/TSX 檔案
 * 2. 統計 console 調用（log/error/warn/info）
 * 3. 分析複雜度（簡單/中等/複雜）
 * 4. 生成優先級清單
 *
 * 使用方式：
 * node scripts/tech-debt/analyze-console-usage.js
 *
 * 創建日期：2025-10-11
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  srcDir: path.join(__dirname, '../../src/renderer/src'),
  outputFile: path.join(__dirname, '../../docs/CONSOLE_ANALYSIS_REPORT.md'),
  excludeDirs: ['node_modules', 'dist', 'out', 'coverage', '__tests__'],
  fileExtensions: ['.ts', '.tsx'],
};

// 結果容器
const results = {
  files: [],
  totalConsoles: 0,
  byType: { log: 0, error: 0, warn: 0, info: 0, debug: 0 },
  byComplexity: { simple: 0, medium: 0, complex: 0 },
  byDirectory: {},
};

/**
 * 判斷 console 調用的複雜度
 */
function analyzeComplexity(line) {
  // 簡單：單個字串或字串+變數
  const simplePatterns = [
    /console\.\w+\(['"]/,  // console.log('...')
    /console\.\w+\([^,]+,\s*\w+\s*[,)]/, // console.log('msg', var)
  ];

  // 複雜：模板字串、三元運算、字串拼接
  const complexPatterns = [
    /console\.\w+\([^)]*`[^`]*\$\{/,  // 模板字串
    /console\.\w+\([^)]*\?[^)]*:/,    // 三元運算
    /console\.\w+\([^)]*\+[^)]*\+/,   // 多重字串拼接
    /^[\s]*if\s*\([^)]+\)\s*console/, // 條件 console
  ];

  if (complexPatterns.some(p => p.test(line))) {
    return 'complex';
  }

  if (simplePatterns.some(p => p.test(line))) {
    return 'simple';
  }

  return 'medium';
}

/**
 * 分析單個檔案
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const fileResult = {
    path: filePath.replace(CONFIG.srcDir, ''),
    consoles: [],
    hasLogger: content.includes('import') && content.includes('logger'),
    totalCount: 0,
  };

  lines.forEach((line, index) => {
    const consoleMatch = line.match(/console\.(log|error|warn|info|debug)/);
    if (consoleMatch) {
      const type = consoleMatch[1];
      const complexity = analyzeComplexity(line);

      fileResult.consoles.push({
        line: index + 1,
        type,
        complexity,
        code: line.trim(),
      });

      results.totalConsoles++;
      results.byType[type]++;
      results.byComplexity[complexity]++;
    }
  });

  fileResult.totalCount = fileResult.consoles.length;

  if (fileResult.totalCount > 0) {
    results.files.push(fileResult);

    // 統計目錄分布
    const dir = path.dirname(fileResult.path);
    if (!results.byDirectory[dir]) {
      results.byDirectory[dir] = 0;
    }
    results.byDirectory[dir] += fileResult.totalCount;
  }
}

/**
 * 遞迴掃描目錄
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (CONFIG.fileExtensions.includes(ext)) {
        analyzeFile(fullPath);
      }
    }
  }
}

/**
 * 生成 Markdown 報告
 */
function generateReport() {
  const topFiles = results.files
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 20);

  const topDirs = Object.entries(results.byDirectory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const simpleFiles = results.files
    .map(f => ({
      ...f,
      simpleCount: f.consoles.filter(c => c.complexity === 'simple').length,
      simplePercent: f.consoles.filter(c => c.complexity === 'simple').length / f.totalCount * 100,
    }))
    .filter(f => f.simplePercent > 80 && f.totalCount >= 5)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 15);

  const report = `# Console 使用分析報告

**分析日期**: ${new Date().toISOString().split('T')[0]}
**掃描目錄**: src/renderer/src
**總檔案數**: ${results.files.length} 個（包含 console 調用的檔案）

---

## 📊 總體統計

### Console 調用總數：${results.totalConsoles} 個

#### 按類型分布
- \`console.log\`: ${results.byType.log} 個 (${(results.byType.log / results.totalConsoles * 100).toFixed(1)}%)
- \`console.error\`: ${results.byType.error} 個 (${(results.byType.error / results.totalConsoles * 100).toFixed(1)}%)
- \`console.warn\`: ${results.byType.warn} 個 (${(results.byType.warn / results.totalConsoles * 100).toFixed(1)}%)
- \`console.info\`: ${results.byType.info} 個 (${(results.byType.info / results.totalConsoles * 100).toFixed(1)}%)
- \`console.debug\`: ${results.byType.debug} 個 (${(results.byType.debug / results.totalConsoles * 100).toFixed(1)}%)

#### 按複雜度分布
- 🟢 **簡單** (可自動化): ${results.byComplexity.simple} 個 (${(results.byComplexity.simple / results.totalConsoles * 100).toFixed(1)}%)
- 🟡 **中等** (半自動): ${results.byComplexity.medium} 個 (${(results.byComplexity.medium / results.totalConsoles * 100).toFixed(1)}%)
- 🔴 **複雜** (需人工): ${results.byComplexity.complex} 個 (${(results.byComplexity.complex / results.totalConsoles * 100).toFixed(1)}%)

---

## 🔥 Top 20 Console 最多的檔案

| 排名 | 檔案 | Console 數量 | 已有 Logger | 優先級 |
|------|------|-------------|------------|--------|
${topFiles.map((f, i) =>
  `| ${i + 1} | ${f.path} | ${f.totalCount} | ${f.hasLogger ? '✅' : '❌'} | ${f.totalCount > 30 ? '🔴 高' : f.totalCount > 15 ? '🟡 中' : '🟢 低'} |`
).join('\n')}

---

## 📁 Top 10 Console 最多的目錄

| 排名 | 目錄 | Console 數量 |
|------|------|-------------|
${topDirs.map((d, i) => `| ${i + 1} | ${d[0]} | ${d[1]} |`).join('\n')}

---

## 🎯 推薦清理優先級

### 優先級 1：簡單模式為主的檔案（可快速清理）

這些檔案 >80% 是簡單 console 調用，適合批量處理：

| 檔案 | Console 總數 | 簡單模式 | 簡單比例 |
|------|-------------|---------|---------|
${simpleFiles.map(f =>
  `| ${f.path} | ${f.totalCount} | ${f.simpleCount} | ${f.simplePercent.toFixed(0)}% |`
).join('\n')}

### 優先級 2：Hooks 目錄（已驗證模式）

✅ useCharacterSelection.ts 已完成（19 個 console → 0）

建議繼續清理：
${results.files
  .filter(f => f.path.includes('/hooks/'))
  .sort((a, b) => b.totalCount - a.totalCount)
  .slice(0, 10)
  .map(f => `- ${f.path} (${f.totalCount} 個)`)
  .join('\n')}

### 優先級 3：Services 目錄（需謹慎）

Services 層通常有業務邏輯，需要小心處理：
${results.files
  .filter(f => f.path.includes('/services/'))
  .sort((a, b) => b.totalCount - a.totalCount)
  .slice(0, 10)
  .map(f => `- ${f.path} (${f.totalCount} 個)`)
  .join('\n')}

---

## 📋 清理策略建議

### 階段 1：快速勝利（本週）
**目標**: 清理 200-300 個簡單 console
**方法**: 半自動化（正則 + 人工審查）
**範圍**:
- illustration hooks（類似 useCharacterSelection 的模式）
- 簡單模式比例 >80% 的檔案

### 階段 2：批量清理（下週）
**目標**: 清理 500-700 個 console
**方法**: 開發轉換腳本
**範圍**:
- Components 目錄（大部分是 UI 組件）
- Utils 目錄

### 階段 3：關鍵模組（需時間）
**目標**: 清理剩餘複雜 console
**方法**: 人工逐個處理
**範圍**:
- API layer (tauri.ts)
- Core services
- Redux slices

---

## 🛠️ 工具建議

### 立即可用
- ✅ 此分析報告（定位目標）
- ✅ 正則表達式輔助替換
- ✅ ESLint 驗證

### 短期開發
- 📝 批量轉換腳本（Node.js）
- 📝 自動備份和回滾機制

### 長期考慮
- 🤔 jscodeshift（如果需要處理 >500 個檔案）
- 🤔 ts-morph（TypeScript AST 操作）

---

## 📈 預期清理進度

基於當前統計：
- **已完成**: 19 個 (1.6%)
- **本週目標**: 200-300 個 (達到 25-30%)
- **兩週目標**: 500-700 個 (達到 50-60%)
- **一個月目標**: 全部清理完成

**關鍵成功因素**:
- 批量處理簡單情況
- 每次清理後立即測試
- 小步提交，降低風險

---

**報告生成時間**: ${new Date().toISOString()}
**下次更新建議**: 清理一批後重新分析進度
`;

  return report;
}

/**
 * 主函數
 */
function main() {
  console.log('🔍 開始分析 Console 使用情況...\n');

  console.log('📂 掃描目錄:', CONFIG.srcDir);
  scanDirectory(CONFIG.srcDir);

  console.log('\n📊 分析結果：');
  console.log('   - 總檔案數:', results.files.length);
  console.log('   - Console 總數:', results.totalConsoles);
  console.log('   - 簡單模式:', results.byComplexity.simple, `(${(results.byComplexity.simple / results.totalConsoles * 100).toFixed(1)}%)`);
  console.log('   - 中等模式:', results.byComplexity.medium, `(${(results.byComplexity.medium / results.totalConsoles * 100).toFixed(1)}%)`);
  console.log('   - 複雜模式:', results.byComplexity.complex, `(${(results.byComplexity.complex / results.totalConsoles * 100).toFixed(1)}%)`);

  console.log('\n📝 生成報告...');
  const report = generateReport();

  // 確保目錄存在
  const outputDir = path.dirname(CONFIG.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG.outputFile, report, 'utf-8');
  console.log('✅ 報告已生成:', CONFIG.outputFile);

  console.log('\n🎯 下一步建議：');
  console.log('   1. 查看報告：cat', CONFIG.outputFile);
  console.log('   2. 從「簡單模式為主的檔案」開始清理');
  console.log('   3. 每次處理 5-10 個檔案後測試和提交');
}

// 執行
if (require.main === module) {
  main();
}

module.exports = { analyzeFile, analyzeComplexity };
