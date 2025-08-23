#!/usr/bin/env node
/**
 * Genesis Chronicle - 版本號統一同步腳本
 * 自動同步 package.json, Cargo.toml, tauri.conf.json 的版本號
 * 使用方法: 
 *   node scripts/version-sync.js [新版本號]
 *   npm run version:sync [新版本號]
 */

const fs = require('fs');
const path = require('path');

// 顏色輸出工具
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
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

class VersionSyncManager {
    constructor() {
        this.rootDir = process.cwd();
        this.configFiles = [
            {
                name: 'package.json',
                path: 'package.json',
                type: 'json',
                versionKey: 'version'
            },
            {
                name: 'Cargo.toml',
                path: 'src-tauri/Cargo.toml',
                type: 'toml',
                versionKey: 'version'
            },
            {
                name: 'tauri.conf.json',
                path: 'src-tauri/tauri.conf.json',
                type: 'json',
                versionKey: 'version'
            }
        ];
    }

    // 檢查當前版本號一致性
    checkVersionConsistency() {
        logInfo('檢查當前版本號一致性...');
        
        const versions = {};
        let allConsistent = true;

        for (const config of this.configFiles) {
            const filePath = path.join(this.rootDir, config.path);
            
            if (!fs.existsSync(filePath)) {
                logError(`配置文件不存在: ${config.path}`);
                return false;
            }

            const currentVersion = this.getCurrentVersion(config);
            versions[config.name] = currentVersion;
            
            if (currentVersion) {
                logInfo(`${config.name}: v${currentVersion}`);
            } else {
                logError(`無法讀取 ${config.name} 中的版本號`);
                allConsistent = false;
            }
        }

        // 檢查是否所有版本號都一致
        const uniqueVersions = new Set(Object.values(versions));
        if (uniqueVersions.size === 1) {
            logSuccess(`所有配置文件版本號一致: v${[...uniqueVersions][0]}`);
            return [...uniqueVersions][0];
        } else {
            logWarning('發現版本號不一致:');
            for (const [file, version] of Object.entries(versions)) {
                log(`  ${file}: v${version}`, version === [...uniqueVersions][0] ? 'green' : 'red');
            }
            allConsistent = false;
        }

        return allConsistent ? [...uniqueVersions][0] : false;
    }

    // 讀取當前版本號
    getCurrentVersion(config) {
        const filePath = path.join(this.rootDir, config.path);
        
        try {
            if (config.type === 'json') {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return content[config.versionKey];
            } else if (config.type === 'toml') {
                const content = fs.readFileSync(filePath, 'utf8');
                const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
                return versionMatch ? versionMatch[1] : null;
            }
        } catch (error) {
            logError(`讀取 ${config.name} 失敗: ${error.message}`);
            return null;
        }
    }

    // 驗證版本號格式
    validateVersionFormat(version) {
        const semverRegex = /^\d+\.\d+\.\d+$/;
        return semverRegex.test(version);
    }

    // 更新版本號
    updateVersion(config, newVersion) {
        const filePath = path.join(this.rootDir, config.path);
        
        try {
            if (config.type === 'json') {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                content[config.versionKey] = newVersion;
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
            } else if (config.type === 'toml') {
                let content = fs.readFileSync(filePath, 'utf8');
                content = content.replace(
                    /version\s*=\s*"[^"]+"/,
                    `version = "${newVersion}"`
                );
                fs.writeFileSync(filePath, content, 'utf8');
            }
            
            logSuccess(`已更新 ${config.name}: v${newVersion}`);
            return true;
        } catch (error) {
            logError(`更新 ${config.name} 失敗: ${error.message}`);
            return false;
        }
    }

    // 同步版本號
    syncVersion(targetVersion = null) {
        log('\n🚀 開始版本號同步作業...', 'bold');
        
        // 如果沒有指定目標版本，檢查當前一致性
        if (!targetVersion) {
            const currentVersion = this.checkVersionConsistency();
            if (currentVersion) {
                logSuccess('版本號已經一致，無需同步');
                return true;
            } else {
                logError('版本號不一致，請指定目標版本號進行同步');
                this.printUsage();
                return false;
            }
        }

        // 驗證版本號格式
        if (!this.validateVersionFormat(targetVersion)) {
            logError(`版本號格式錯誤: ${targetVersion}，請使用 x.y.z 格式（如：1.0.10）`);
            return false;
        }

        logInfo(`目標版本號: v${targetVersion}`);
        
        let successCount = 0;
        for (const config of this.configFiles) {
            if (this.updateVersion(config, targetVersion)) {
                successCount++;
            }
        }

        if (successCount === this.configFiles.length) {
            logSuccess(`\n🎉 版本號同步完成! 所有 ${successCount} 個配置文件已更新為 v${targetVersion}`);
            this.showNextSteps(targetVersion);
            return true;
        } else {
            logError(`\n💥 版本號同步失敗! 只有 ${successCount}/${this.configFiles.length} 個文件更新成功`);
            return false;
        }
    }

    // 顯示後續步驟
    showNextSteps(version) {
        log('\n📋 建議的後續步驟:', 'blue');
        log('1. 更新 README.md 版本相關描述', 'yellow');
        log('2. 執行程式碼統計: npm run stats', 'yellow');
        log('3. 執行發布前檢查: npm run pre-release', 'yellow');
        log(`4. 創建 Git 標籤: git tag v${version} && git push origin v${version}`, 'yellow');
    }

    // 顯示使用說明
    printUsage() {
        log('\n📖 使用說明:', 'blue');
        log('檢查版本一致性:', 'cyan');
        log('  node scripts/version-sync.js', 'reset');
        log('  npm run version:check', 'reset');
        log('\n同步版本號:', 'cyan');
        log('  node scripts/version-sync.js 1.0.11', 'reset');
        log('  npm run version:sync 1.0.11', 'reset');
        log('\n環境變數方式:', 'cyan');
        log('  RELEASE_VERSION=1.0.11 npm run version:sync', 'reset');
    }
}

// 主函數
function main() {
    const manager = new VersionSyncManager();
    
    // 獲取目標版本號
    let targetVersion = process.argv[2] || process.env.RELEASE_VERSION;
    
    // 顯示標題
    log('🔄 Genesis Chronicle - 版本號統一同步工具', 'bold');
    log('=' .repeat(50), 'blue');
    
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        manager.printUsage();
        process.exit(0);
    }

    const success = manager.syncVersion(targetVersion);
    process.exit(success ? 0 : 1);
}

// 執行腳本
if (require.main === module) {
    main();
}

module.exports = VersionSyncManager;