#!/usr/bin/env node
/**
 * Genesis Chronicle - 程式碼統計分析工具
 * 使用 cloc 工具進行標準化程式碼統計，並生成詳細報告
 * 使用方法:
 *   node scripts/code-stats.js
 *   npm run stats
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 顏色輸出工具
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

class CodeStatsAnalyzer {
    constructor() {
        this.rootDir = process.cwd();
        this.outputDir = path.join(this.rootDir, '.stats');
        this.clocCommand = this.detectClocCommand();
        this.standardCommand = `${this.clocCommand} . --exclude-dir=node_modules,target,.git --include-lang=TypeScript,Rust,JavaScript`;
        this.timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    }

    // 檢測 cloc 命令
    detectClocCommand() {
        const commands = ['cloc', 'npx cloc'];
        
        for (const cmd of commands) {
            try {
                execSync(`${cmd} --version`, { stdio: 'pipe' });
                return cmd;
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    // 檢查 cloc 工具是否可用
    checkClocAvailability() {
        if (!this.clocCommand) {
            logError('cloc 工具未安裝!');
            log('\n📦 安裝方法:', 'blue');
            log('macOS: brew install cloc', 'cyan');
            log('Windows: choco install cloc 或下載 exe', 'cyan');
            log('Linux: sudo apt install cloc 或 sudo yum install cloc', 'cyan');
            log('npm: npm install -g cloc', 'cyan');
            return false;
        }
        
        try {
            const version = execSync(`${this.clocCommand} --version`, { encoding: 'utf8' });
            logInfo(`已檢測到 cloc 工具: ${version.trim()}`);
            return true;
        } catch (error) {
            logError(`cloc 工具檢查失敗: ${error.message}`);
            return false;
        }
    }

    // 執行標準化程式碼統計
    executeStandardStats() {
        logInfo('執行標準化程式碼統計...');
        logInfo(`命令: ${this.standardCommand}`);
        
        try {
            const output = execSync(this.standardCommand, { 
                encoding: 'utf8',
                cwd: this.rootDir 
            });
            
            return this.parseStatsOutput(output);
        } catch (error) {
            logError(`程式碼統計執行失敗: ${error.message}`);
            return null;
        }
    }

    // 解析統計輸出
    parseStatsOutput(output) {
        const lines = output.split('\n');
        const stats = {
            languages: {},
            totals: {},
            raw: output,
            timestamp: new Date().toISOString()
        };

        let inDataSection = false;
        let totalLine = null;

        for (const line of lines) {
            if (line.includes('Language') && line.includes('files') && line.includes('code')) {
                inDataSection = true;
                continue;
            }
            
            if (line.includes('----')) {
                continue;
            }
            
            if (line.startsWith('SUM:')) {
                totalLine = line;
                break;
            }
            
            if (inDataSection && line.trim()) {
                const match = line.match(/^(\w+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
                if (match) {
                    const [, language, files, blank, comment, code] = match;
                    stats.languages[language] = {
                        files: parseInt(files),
                        blank: parseInt(blank),
                        comment: parseInt(comment),
                        code: parseInt(code)
                    };
                }
            }
        }

        if (totalLine) {
            const totalMatch = totalLine.match(/SUM:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
            if (totalMatch) {
                const [, files, blank, comment, code] = totalMatch;
                stats.totals = {
                    files: parseInt(files),
                    blank: parseInt(blank),
                    comment: parseInt(comment),
                    code: parseInt(code)
                };
            }
        }

        return stats;
    }

    // 生成統計分析報告
    generateAnalysisReport(stats) {
        const report = {
            summary: this.generateSummary(stats),
            breakdown: this.generateBreakdown(stats),
            trends: this.calculateTrends(stats),
            recommendations: this.generateRecommendations(stats)
        };

        return report;
    }

    // 生成摘要
    generateSummary(stats) {
        const { totals, languages } = stats;
        
        return {
            totalLines: totals.code,
            totalFiles: totals.files,
            languages: Object.keys(languages).length,
            commentRatio: ((totals.comment / totals.code) * 100).toFixed(1) + '%',
            avgLinesPerFile: Math.round(totals.code / totals.files)
        };
    }

    // 生成語言分解
    generateBreakdown(stats) {
        const { languages, totals } = stats;
        const breakdown = [];

        for (const [lang, data] of Object.entries(languages)) {
            const percentage = ((data.code / totals.code) * 100).toFixed(1);
            breakdown.push({
                language: lang,
                lines: data.code,
                files: data.files,
                percentage: percentage + '%',
                avgLinesPerFile: Math.round(data.code / data.files),
                commentRatio: ((data.comment / data.code) * 100).toFixed(1) + '%'
            });
        }

        return breakdown.sort((a, b) => b.lines - a.lines);
    }

    // 計算趨勢（與歷史數據比較）
    calculateTrends(stats) {
        const historyFile = path.join(this.outputDir, 'history.json');
        let history = [];

        try {
            if (fs.existsSync(historyFile)) {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            }
        } catch (error) {
            logWarning('無法讀取歷史統計數據');
        }

        if (history.length === 0) {
            return { message: '首次統計，無趨勢數據' };
        }

        const lastStats = history[history.length - 1];
        const totalGrowth = stats.totals.code - lastStats.totals.code;
        const fileGrowth = stats.totals.files - lastStats.totals.files;
        const daysSince = Math.ceil((new Date() - new Date(lastStats.timestamp)) / (1000 * 60 * 60 * 24));

        return {
            totalGrowth,
            fileGrowth,
            daysSince,
            avgGrowthPerDay: daysSince > 0 ? Math.round(totalGrowth / daysSince) : 0,
            growthPercentage: ((totalGrowth / lastStats.totals.code) * 100).toFixed(2) + '%'
        };
    }

    // 生成建議
    generateRecommendations(stats) {
        const recommendations = [];
        const { totals } = stats;
        
        const commentRatio = (totals.comment / totals.code) * 100;
        if (commentRatio < 5) {
            recommendations.push('⚠️  注釋比例偏低（<5%），建議增加代碼註釋');
        } else if (commentRatio > 20) {
            recommendations.push('ℹ️  注釋比例較高（>20%），可考慮精簡');
        } else {
            recommendations.push('✅ 注釋比例良好（5-20%）');
        }

        const avgLines = totals.code / totals.files;
        if (avgLines > 300) {
            recommendations.push('⚠️  平均文件行數較多（>300行），建議考慮拆分大文件');
        } else if (avgLines < 100) {
            recommendations.push('ℹ️  平均文件行數較少（<100行），文件結構較精簡');
        } else {
            recommendations.push('✅ 平均文件行數適中（100-300行）');
        }

        return recommendations;
    }

    // 保存統計結果
    saveStats(stats, analysis) {
        // 確保輸出目錄存在
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // 保存詳細統計
        const detailFile = path.join(this.outputDir, `stats_${this.timestamp}.json`);
        fs.writeFileSync(detailFile, JSON.stringify({ stats, analysis }, null, 2));

        // 更新歷史記錄
        const historyFile = path.join(this.outputDir, 'history.json');
        let history = [];
        
        try {
            if (fs.existsSync(historyFile)) {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            }
        } catch (error) {
            // 如果讀取失敗，從空歷史開始
        }

        history.push(stats);
        // 只保留最近10次記錄
        if (history.length > 10) {
            history = history.slice(-10);
        }

        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

        // 保存最新統計（用於其他腳本）
        const latestFile = path.join(this.outputDir, 'latest.json');
        fs.writeFileSync(latestFile, JSON.stringify({ stats, analysis }, null, 2));

        logSuccess(`統計結果已保存到 ${detailFile}`);
    }

    // 顯示統計結果
    displayStats(stats, analysis) {
        log('\n📊 Genesis Chronicle 程式碼統計報告', 'bold');
        log('=' .repeat(60), 'blue');

        // 總體摘要
        log('\n📈 總體摘要', 'cyan');
        log(`總程式碼行數: ${analysis.summary.totalLines.toLocaleString()} 行`, 'green');
        log(`總檔案數量: ${analysis.summary.totalFiles} 個`, 'green');
        log(`程式語言: ${analysis.summary.languages} 種`, 'green');
        log(`註釋比例: ${analysis.summary.commentRatio}`, 'green');
        log(`平均檔案行數: ${analysis.summary.avgLinesPerFile} 行`, 'green');

        // 語言分解
        log('\n🔤 語言分解', 'cyan');
        for (const lang of analysis.breakdown) {
            log(`${lang.language.padEnd(12)} ${lang.lines.toLocaleString().padStart(8)} 行 (${lang.percentage.padStart(5)}) - ${lang.files} 個檔案`, 
                lang.language === 'TypeScript' ? 'blue' : lang.language === 'Rust' ? 'magenta' : 'yellow');
        }

        // 趨勢分析
        log('\n📊 趨勢分析', 'cyan');
        if (analysis.trends.message) {
            log(analysis.trends.message, 'yellow');
        } else {
            const growthColor = analysis.trends.totalGrowth > 0 ? 'green' : 'red';
            log(`自上次統計 (${analysis.trends.daysSince}天前):`, 'reset');
            log(`  程式碼增長: ${analysis.trends.totalGrowth > 0 ? '+' : ''}${analysis.trends.totalGrowth} 行 (${analysis.trends.growthPercentage})`, growthColor);
            log(`  檔案增長: ${analysis.trends.fileGrowth > 0 ? '+' : ''}${analysis.trends.fileGrowth} 個`, growthColor);
            log(`  平均日增長: ${analysis.trends.avgGrowthPerDay} 行/天`, 'cyan');
        }

        // 建議
        log('\n💡 建議', 'cyan');
        for (const rec of analysis.recommendations) {
            log(rec);
        }

        // 原始輸出
        if (process.argv.includes('--verbose')) {
            log('\n📋 詳細統計輸出', 'cyan');
            log(stats.raw, 'reset');
        }
    }

    // 生成 README 友好格式
    generateReadmeFormat(stats, analysis) {
        const readme = {
            totalCode: analysis.summary.totalLines,
            breakdown: {}
        };

        for (const lang of analysis.breakdown) {
            readme.breakdown[lang.language] = {
                lines: lang.lines,
                files: parseInt(lang.files),
                percentage: parseFloat(lang.percentage)
            };
        }

        // 保存 README 格式
        const readmeFile = path.join(this.outputDir, 'readme-format.json');
        fs.writeFileSync(readmeFile, JSON.stringify(readme, null, 2));

        log('\n📝 README 格式數據', 'cyan');
        log(`- **核心程式碼**: ${readme.totalCode.toLocaleString()}行（不含依賴包，純手寫代碼）`, 'green');
        for (const [lang, data] of Object.entries(readme.breakdown)) {
            log(`- **${lang === 'TypeScript' ? '前端程式碼' : lang === 'Rust' ? '後端程式碼' : '配置與腳本'}**: ${data.lines.toLocaleString()}行（${lang}，${data.files}個檔案）`, 'green');
        }

        return readme;
    }

    // 主執行函數
    async run() {
        log('🚀 Genesis Chronicle 程式碼統計分析工具', 'bold');
        log('=' .repeat(50), 'blue');

        // 檢查工具可用性
        if (!this.checkClocAvailability()) {
            process.exit(1);
        }

        // 執行統計
        const stats = this.executeStandardStats();
        if (!stats) {
            process.exit(1);
        }

        // 生成分析報告
        const analysis = this.generateAnalysisReport(stats);

        // 保存結果
        this.saveStats(stats, analysis);

        // 顯示結果
        this.displayStats(stats, analysis);

        // 生成 README 格式
        this.generateReadmeFormat(stats, analysis);

        logSuccess('\n🎉 程式碼統計分析完成！');
        log('\n📋 相關文件:', 'blue');
        log(`詳細報告: .stats/stats_${this.timestamp}.json`, 'cyan');
        log('歷史記錄: .stats/history.json', 'cyan');
        log('最新數據: .stats/latest.json', 'cyan');
        log('README格式: .stats/readme-format.json', 'cyan');
    }
}

// 主函數
function main() {
    const analyzer = new CodeStatsAnalyzer();
    analyzer.run().catch(error => {
        logError(`執行失敗: ${error.message}`);
        process.exit(1);
    });
}

// 執行腳本
if (require.main === module) {
    main();
}

module.exports = CodeStatsAnalyzer;