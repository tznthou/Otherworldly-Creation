#!/usr/bin/env node
/**
 * Genesis Chronicle - README.md 自動更新工具
 * 根據程式碼統計結果和版本信息自動更新 README.md
 * 使用方法:
 *   node scripts/readme-updater.js
 *   npm run readme:update
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

class ReadmeUpdater {
    constructor() {
        this.rootDir = process.cwd();
        this.readmePath = path.join(this.rootDir, 'README.md');
        this.statsPath = path.join(this.rootDir, '.stats', 'latest.json');
        this.packageJsonPath = path.join(this.rootDir, 'package.json');
        this.currentDate = new Date();
    }

    // 讀取當前版本號
    getCurrentVersion() {
        try {
            const packageContent = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
            return packageContent.version;
        } catch (error) {
            logError(`讀取 package.json 失敗: ${error.message}`);
            return null;
        }
    }

    // 讀取程式碼統計數據
    getCodeStats() {
        try {
            if (!fs.existsSync(this.statsPath)) {
                logWarning('統計數據文件不存在，請先執行 npm run stats');
                return null;
            }

            const statsContent = JSON.parse(fs.readFileSync(this.statsPath, 'utf8'));
            return statsContent;
        } catch (error) {
            logError(`讀取統計數據失敗: ${error.message}`);
            return null;
        }
    }

    // 讀取 README.md
    readReadme() {
        try {
            return fs.readFileSync(this.readmePath, 'utf8');
        } catch (error) {
            logError(`讀取 README.md 失敗: ${error.message}`);
            return null;
        }
    }

    // 格式化日期
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}年${month}月${day}日`;
    }

    // 格式化時間戳
    formatTimestamp(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${year}年${month}月${day}日 ${hour}:${minute} CST`;
    }

    // 生成語言統計格式
    generateLanguageStats(stats) {
        const { analysis } = stats;
        const breakdown = analysis.breakdown;
        
        const results = {
            totalCode: analysis.summary.totalLines,
            typescript: breakdown.find(l => l.language === 'TypeScript') || { lines: 0, files: 0, percentage: '0.0%' },
            rust: breakdown.find(l => l.language === 'Rust') || { lines: 0, files: 0, percentage: '0.0%' },
            javascript: breakdown.find(l => l.language === 'JavaScript') || { lines: 0, files: 0, percentage: '0.0%' }
        };

        return results;
    }

    // 更新版本標籤
    updateVersionBadge(content, version) {
        const badgePattern = /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-v[\d.]+/;
        const newBadge = `![Version](https://img.shields.io/badge/version-v${version}`;
        
        if (badgePattern.test(content)) {
            content = content.replace(badgePattern, newBadge);
            logSuccess('已更新版本標籤');
        } else {
            logWarning('未找到版本標籤模式');
        }

        return content;
    }

    // 更新程式碼統計數據
    updateCodeStats(content, langStats) {
        const updates = [
            {
                pattern: /(\*\*核心程式碼\*\*:\s*)[\d,]+(\s*行)/g,
                replacement: `$1${langStats.totalCode.toLocaleString()}$2`,
                description: '核心程式碼行數'
            },
            {
                pattern: /(\*\*前端程式碼\*\*:\s*)[\d,]+(\s*行.*TypeScript\/React.*?)(\d+)(\s*個檔案)/g,
                replacement: `$1${langStats.typescript.lines.toLocaleString()}$2${langStats.typescript.files}$4`,
                description: '前端程式碼統計'
            },
            {
                pattern: /(\*\*後端程式碼\*\*:\s*)[\d,]+(\s*行.*Rust\/Tauri.*?)(\d+)(\s*個檔案)/g,
                replacement: `$1${langStats.rust.lines.toLocaleString()}$2${langStats.rust.files}$4`,
                description: '後端程式碼統計'
            },
            {
                pattern: /(Genesis Chronicle \(總計：)[\d,]+(\s*行核心程式碼)/g,
                replacement: `$1${langStats.totalCode.toLocaleString()}$2`,
                description: '架構圖總計行數'
            },
            {
                pattern: /(├── ⚛️ src\/renderer\/.*?# React前端 \()[\d,]+(\s*行\))/g,
                replacement: `$1${langStats.typescript.lines.toLocaleString()}$2`,
                description: '架構圖前端行數'
            },
            {
                pattern: /(├── 🦀 src-tauri\/.*?# Rust後端 \()[\d,]+(\s*行\))/g,
                replacement: `$1${langStats.rust.lines.toLocaleString()}$2`,
                description: '架構圖後端行數'
            },
            {
                pattern: /(\*\*專案架構\*\*:.*?前端)[\d,]+(\s*行.*?\()[\d.]+(%.*?後端)[\d,]+(\s*行.*?\()[\d.]+(%.*?腳本)[\d,]+(\s*行.*?\()[\d.]+(%.*?\))/g,
                replacement: `$1${langStats.typescript.lines.toLocaleString()}$2${langStats.typescript.percentage}$3${langStats.rust.lines.toLocaleString()}$4${langStats.rust.percentage}$5${langStats.javascript.lines.toLocaleString()}$6${langStats.javascript.percentage}$7`,
                description: '專案架構統計'
            }
        ];

        let updateCount = 0;
        for (const update of updates) {
            const beforeContent = content;
            content = content.replace(update.pattern, update.replacement);
            
            if (content !== beforeContent) {
                logSuccess(`已更新: ${update.description}`);
                updateCount++;
            } else {
                logWarning(`未找到模式: ${update.description}`);
            }
        }

        logInfo(`共更新了 ${updateCount} 個統計項目`);
        return content;
    }

    // 更新版本歷史
    updateVersionHistory(content, version) {
        const today = this.formatDate(this.currentDate);
        
        // 更新當前版本標題
        const currentVersionPattern = /(### v)[\d.]+(\s*\(\d{4}-\d{2}-\d{2}\)\s*-\s*當前版本)/;
        if (currentVersionPattern.test(content)) {
            content = content.replace(currentVersionPattern, `$1${version}$2`);
            logSuccess('已更新當前版本標題');
        }

        // 更新版本發布歷程
        const versionHistoryPattern = /(### v)[\d.]+(\s*\(\d{4}-\d{2}-\d{2}\))/g;
        content = content.replace(versionHistoryPattern, `$1${version} (${this.currentDate.getFullYear()}-${(this.currentDate.getMonth() + 1).toString().padStart(2, '0')}-${this.currentDate.getDate().toString().padStart(2, '0')})$2`);

        return content;
    }

    // 更新時間戳
    updateTimestamp(content) {
        const timestamp = this.formatTimestamp(this.currentDate);
        
        const timestampPattern = /(\*更新時間：)\d{4}年\d{2}月\d{2}日\s*\d{2}:\d{2}\s*CST(\*)/;
        if (timestampPattern.test(content)) {
            content = content.replace(timestampPattern, `$1${timestamp}$2`);
            logSuccess('已更新時間戳');
        } else {
            logWarning('未找到時間戳模式');
        }

        return content;
    }

    // 更新專案狀態
    updateProjectStatus(content, version) {
        const statusPattern = /(\*專案狀態：v)[\d.]+(\s*版本[^*]*\*)/;
        const newStatus = `$1${version}$2`;
        
        if (statusPattern.test(content)) {
            content = content.replace(statusPattern, newStatus);
            logSuccess('已更新專案狀態');
        } else {
            logWarning('未找到專案狀態模式');
        }

        return content;
    }

    // 備份原始文件
    backupReadme() {
        const backupPath = path.join(this.rootDir, '.stats', `README_backup_${Date.now()}.md`);
        
        try {
            // 確保 .stats 目錄存在
            const statsDir = path.dirname(backupPath);
            if (!fs.existsSync(statsDir)) {
                fs.mkdirSync(statsDir, { recursive: true });
            }

            fs.copyFileSync(this.readmePath, backupPath);
            logSuccess(`README.md 已備份至: ${backupPath}`);
            return backupPath;
        } catch (error) {
            logError(`備份失敗: ${error.message}`);
            return null;
        }
    }

    // 生成更新報告
    generateUpdateReport(changes) {
        const reportPath = path.join(this.rootDir, '.stats', `readme_update_${Date.now()}.json`);
        const report = {
            timestamp: this.currentDate.toISOString(),
            changes: changes,
            version: this.getCurrentVersion()
        };

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            logSuccess(`更新報告已保存至: ${reportPath}`);
        } catch (error) {
            logWarning(`保存更新報告失敗: ${error.message}`);
        }
    }

    // 主要更新函數
    async update() {
        log('🔄 README.md 自動更新工具', 'bold');
        log('=' .repeat(50), 'blue');

        // 讀取當前版本和統計數據
        const version = this.getCurrentVersion();
        if (!version) {
            process.exit(1);
        }

        const stats = this.getCodeStats();
        if (!stats) {
            logError('請先執行 npm run stats 生成統計數據');
            process.exit(1);
        }

        // 讀取 README.md
        let content = this.readReadme();
        if (!content) {
            process.exit(1);
        }

        // 備份原始文件
        const backupPath = this.backupReadme();
        if (!backupPath) {
            logError('無法創建備份，停止更新');
            process.exit(1);
        }

        logInfo(`當前版本: v${version}`);
        logInfo(`程式碼總行數: ${stats.analysis.summary.totalLines.toLocaleString()}`);

        // 生成語言統計
        const langStats = this.generateLanguageStats(stats);

        // 執行更新
        const changes = [];
        
        try {
            // 1. 更新版本標籤
            const newContent1 = this.updateVersionBadge(content, version);
            if (newContent1 !== content) {
                changes.push('版本標籤');
                content = newContent1;
            }

            // 2. 更新程式碼統計
            const newContent2 = this.updateCodeStats(content, langStats);
            if (newContent2 !== content) {
                changes.push('程式碼統計');
                content = newContent2;
            }

            // 3. 更新版本歷史
            const newContent3 = this.updateVersionHistory(content, version);
            if (newContent3 !== content) {
                changes.push('版本歷史');
                content = newContent3;
            }

            // 4. 更新時間戳
            const newContent4 = this.updateTimestamp(content);
            if (newContent4 !== content) {
                changes.push('時間戳');
                content = newContent4;
            }

            // 5. 更新專案狀態
            const newContent5 = this.updateProjectStatus(content, version);
            if (newContent5 !== content) {
                changes.push('專案狀態');
                content = newContent5;
            }

            // 寫入更新後的內容
            fs.writeFileSync(this.readmePath, content, 'utf8');
            
            if (changes.length > 0) {
                logSuccess(`✨ README.md 更新完成！更新項目: ${changes.join(', ')}`);
                this.generateUpdateReport(changes);
                
                log('\n📋 更新摘要:', 'cyan');
                log(`版本號: v${version}`, 'green');
                log(`程式碼行數: ${langStats.totalCode.toLocaleString()}`, 'green');
                log(`前端: ${langStats.typescript.lines.toLocaleString()}行 (${langStats.typescript.files}檔案)`, 'blue');
                log(`後端: ${langStats.rust.lines.toLocaleString()}行 (${langStats.rust.files}檔案)`, 'magenta');
                log(`腳本: ${langStats.javascript.lines.toLocaleString()}行 (${langStats.javascript.files}檔案)`, 'yellow');
            } else {
                logWarning('未檢測到需要更新的內容');
            }

        } catch (error) {
            logError(`更新過程中發生錯誤: ${error.message}`);
            logInfo('正在恢復備份...');
            fs.copyFileSync(backupPath, this.readmePath);
            logSuccess('已恢復原始文件');
            process.exit(1);
        }
    }
}

// 主函數
function main() {
    const updater = new ReadmeUpdater();
    updater.update().catch(error => {
        logError(`執行失敗: ${error.message}`);
        process.exit(1);
    });
}

// 執行腳本
if (require.main === module) {
    main();
}

module.exports = ReadmeUpdater;