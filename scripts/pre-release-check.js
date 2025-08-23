#!/usr/bin/env node
/**
 * Genesis Chronicle - 版本發布前檢查工具
 * 執行完整的發布前檢查，確保版本一致性、代碼品質和功能完整性
 * 使用方法:
 *   node scripts/pre-release-check.js
 *   npm run pre-release
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

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

function logStep(step, message) {
    log(`\n🔍 [步驟 ${step}] ${message}`, 'bold');
    log('-'.repeat(60), 'blue');
}

class PreReleaseChecker {
    constructor() {
        this.rootDir = process.cwd();
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
        this.criticalErrors = [];
    }

    // 執行命令並捕獲輸出
    executeCommand(command, description, options = {}) {
        try {
            const output = execSync(command, {
                encoding: 'utf8',
                cwd: this.rootDir,
                stdio: options.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
                ...options
            });
            return { success: true, output: output.trim() };
        } catch (error) {
            return { 
                success: false, 
                error: error.message, 
                output: error.stdout ? error.stdout.trim() : '',
                stderr: error.stderr ? error.stderr.trim() : ''
            };
        }
    }

    // 檢查版本號一致性
    checkVersionConsistency() {
        logStep(1, '檢查版本號一致性');

        const configFiles = [
            { name: 'package.json', path: 'package.json', type: 'json' },
            { name: 'Cargo.toml', path: 'src-tauri/Cargo.toml', type: 'toml' },
            { name: 'tauri.conf.json', path: 'src-tauri/tauri.conf.json', type: 'json' }
        ];

        const versions = {};
        let allValid = true;

        for (const config of configFiles) {
            const filePath = path.join(this.rootDir, config.path);
            
            if (!fs.existsSync(filePath)) {
                this.results.failed.push(`配置文件不存在: ${config.name}`);
                allValid = false;
                continue;
            }

            try {
                let version;
                if (config.type === 'json') {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    version = content.version;
                } else if (config.type === 'toml') {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const match = content.match(/version\s*=\s*"([^"]+)"/);
                    version = match ? match[1] : null;
                }

                if (version) {
                    versions[config.name] = version;
                    logInfo(`${config.name}: v${version}`);
                } else {
                    this.results.failed.push(`無法讀取 ${config.name} 中的版本號`);
                    allValid = false;
                }
            } catch (error) {
                this.results.failed.push(`讀取 ${config.name} 失敗: ${error.message}`);
                allValid = false;
            }
        }

        // 檢查版本號是否一致
        const uniqueVersions = new Set(Object.values(versions));
        if (uniqueVersions.size === 1) {
            logSuccess(`版本號一致: v${[...uniqueVersions][0]}`);
            this.results.passed.push('版本號一致性檢查');
            return [...uniqueVersions][0];
        } else {
            this.results.failed.push('版本號不一致');
            this.criticalErrors.push('版本號不一致');
            logError('版本號不一致，請執行 npm run version:sync 修復');
            return null;
        }
    }

    // 檢查 Git 狀態
    checkGitStatus() {
        logStep(2, '檢查 Git 狀態');

        // 檢查是否有未提交的變更
        const statusResult = this.executeCommand('git status --porcelain', 'Git 狀態檢查');
        
        if (!statusResult.success) {
            this.results.failed.push('無法執行 Git 狀態檢查');
            return false;
        }

        if (statusResult.output.trim()) {
            logWarning('發現未提交的變更:');
            const changes = statusResult.output.split('\n');
            for (const change of changes) {
                log(`  ${change}`, 'yellow');
            }
            this.results.warnings.push('存在未提交的變更');
        } else {
            logSuccess('工作目錄乾淨');
            this.results.passed.push('Git 狀態檢查');
        }

        // 檢查當前分支
        const branchResult = this.executeCommand('git branch --show-current', '分支檢查');
        if (branchResult.success) {
            const currentBranch = branchResult.output;
            logInfo(`當前分支: ${currentBranch}`);
            
            if (currentBranch !== 'main') {
                this.results.warnings.push(`當前不在 main 分支 (${currentBranch})`);
                logWarning(`建議在 main 分支發布版本 (當前: ${currentBranch})`);
            } else {
                logSuccess('在 main 分支');
                this.results.passed.push('分支檢查');
            }
        }

        return true;
    }

    // 檢查代碼品質
    checkCodeQuality() {
        logStep(3, '檢查代碼品質');

        // TypeScript 類型檢查
        logInfo('執行 TypeScript 類型檢查...');
        const tscResult = this.executeCommand('npx tsc --noEmit', 'TypeScript 類型檢查', { silent: true });
        
        if (tscResult.success) {
            logSuccess('TypeScript 類型檢查通過');
            this.results.passed.push('TypeScript 類型檢查');
        } else {
            logError('TypeScript 類型檢查失敗');
            this.results.failed.push('TypeScript 類型檢查失敗');
            this.criticalErrors.push('TypeScript 類型檢查失敗');
            
            if (tscResult.stderr) {
                log('錯誤詳情:', 'red');
                log(tscResult.stderr.slice(0, 1000), 'reset'); // 限制輸出長度
            }
        }

        // ESLint 檢查
        logInfo('執行 ESLint 檢查...');
        const lintResult = this.executeCommand('npm run lint', 'ESLint 檢查', { silent: true });
        
        if (lintResult.success) {
            logSuccess('ESLint 檢查通過');
            this.results.passed.push('ESLint 檢查');
        } else {
            logWarning('ESLint 發現問題');
            this.results.warnings.push('ESLint 警告');
            
            if (lintResult.output) {
                log('ESLint 輸出:', 'yellow');
                log(lintResult.output.slice(0, 1000), 'reset');
            }
        }

        // Rust 編譯檢查
        logInfo('執行 Rust 編譯檢查...');
        const cargoResult = this.executeCommand('cargo check --manifest-path src-tauri/Cargo.toml', 'Rust 編譯檢查', { silent: true });
        
        if (cargoResult.success) {
            logSuccess('Rust 編譯檢查通過');
            this.results.passed.push('Rust 編譯檢查');
        } else {
            logError('Rust 編譯檢查失敗');
            this.results.failed.push('Rust 編譯檢查失敗');
            this.criticalErrors.push('Rust 編譯檢查失敗');
            
            if (cargoResult.stderr) {
                log('錯誤詳情:', 'red');
                log(cargoResult.stderr.slice(0, 1000), 'reset');
            }
        }
    }

    // 檢查依賴和安全性
    checkDependencies() {
        logStep(4, '檢查依賴和安全性');

        // 檢查 npm 依賴
        logInfo('檢查 npm 依賴...');
        const npmAuditResult = this.executeCommand('npm audit --audit-level=high', 'npm 安全審計', { silent: true });
        
        if (npmAuditResult.success) {
            logSuccess('npm 安全審計通過');
            this.results.passed.push('npm 安全審計');
        } else {
            logWarning('npm 安全審計發現問題');
            this.results.warnings.push('npm 安全審計警告');
            
            if (npmAuditResult.output) {
                log('審計結果:', 'yellow');
                log(npmAuditResult.output.slice(0, 1000), 'reset');
            }
        }

        // 檢查 Rust 依賴（如果有 cargo-audit）
        const cargoAuditResult = this.executeCommand('cargo audit --version', '檢查 cargo-audit', { silent: true });
        if (cargoAuditResult.success) {
            logInfo('執行 Rust 安全審計...');
            const rustAuditResult = this.executeCommand('cargo audit --file src-tauri/Cargo.lock', 'Rust 安全審計', { silent: true });
            
            if (rustAuditResult.success) {
                logSuccess('Rust 安全審計通過');
                this.results.passed.push('Rust 安全審計');
            } else {
                this.results.warnings.push('Rust 安全審計警告');
                logWarning('Rust 安全審計發現問題');
            }
        } else {
            logInfo('cargo-audit 未安裝，跳過 Rust 安全審計');
        }
    }

    // 檢查構建
    checkBuild() {
        logStep(5, '檢查構建');

        // 檢查前端構建
        logInfo('檢查前端構建...');
        const buildResult = this.executeCommand('npm run build:renderer', '前端構建檢查', { silent: true });
        
        if (buildResult.success) {
            logSuccess('前端構建成功');
            this.results.passed.push('前端構建檢查');
        } else {
            logError('前端構建失敗');
            this.results.failed.push('前端構建失敗');
            this.criticalErrors.push('前端構建失敗');
            
            if (buildResult.stderr) {
                log('構建錯誤:', 'red');
                log(buildResult.stderr.slice(0, 1000), 'reset');
            }
        }

        // 檢查 Rust 構建（快速檢查，不生成完整二進位）
        logInfo('檢查 Rust 構建...');
        const rustBuildResult = this.executeCommand('cargo build --manifest-path src-tauri/Cargo.toml --lib', 'Rust 庫構建檢查', { silent: true });
        
        if (rustBuildResult.success) {
            logSuccess('Rust 構建成功');
            this.results.passed.push('Rust 構建檢查');
        } else {
            logError('Rust 構建失敗');
            this.results.failed.push('Rust 構建失敗');
            this.criticalErrors.push('Rust 構建失敗');
            
            if (rustBuildResult.stderr) {
                log('構建錯誤:', 'red');
                log(rustBuildResult.stderr.slice(0, 1000), 'reset');
            }
        }
    }

    // 檢查關鍵文件
    checkCriticalFiles() {
        logStep(6, '檢查關鍵文件');

        const criticalFiles = [
            'README.md',
            'package.json',
            'src-tauri/Cargo.toml',
            'src-tauri/tauri.conf.json',
            'CLAUDE.md',
            'src/renderer/src/main-stable.tsx',
            'src-tauri/src/lib.rs'
        ];

        let allFilesExist = true;

        for (const file of criticalFiles) {
            const filePath = path.join(this.rootDir, file);
            if (fs.existsSync(filePath)) {
                logInfo(`✓ ${file}`);
            } else {
                logError(`✗ ${file}`);
                this.results.failed.push(`關鍵文件缺失: ${file}`);
                allFilesExist = false;
            }
        }

        if (allFilesExist) {
            logSuccess('所有關鍵文件存在');
            this.results.passed.push('關鍵文件檢查');
        } else {
            this.criticalErrors.push('關鍵文件缺失');
        }
    }

    // 執行測試
    runTests() {
        logStep(7, '執行測試');

        // 檢查是否有測試配置
        const jestConfigExists = fs.existsSync(path.join(this.rootDir, 'jest.config.js'));
        
        if (!jestConfigExists) {
            logWarning('未找到 Jest 配置，跳過測試');
            this.results.warnings.push('無測試配置');
            return;
        }

        // 執行測試
        logInfo('執行單元測試...');
        const testResult = this.executeCommand('npm test -- --passWithNoTests', '單元測試', { silent: true });
        
        if (testResult.success) {
            logSuccess('測試通過');
            this.results.passed.push('單元測試');
        } else {
            logError('測試失敗');
            this.results.failed.push('測試失敗');
            this.criticalErrors.push('測試失敗');
            
            if (testResult.output || testResult.stderr) {
                log('測試輸出:', 'red');
                log((testResult.output || testResult.stderr).slice(0, 1000), 'reset');
            }
        }
    }

    // 生成發布前報告
    generateReport(version) {
        log('\n📋 發布前檢查報告', 'bold');
        log('=' .repeat(60), 'blue');

        log(`\n版本: v${version}`, 'cyan');
        log(`檢查時間: ${new Date().toLocaleString('zh-TW')}`, 'cyan');

        // 通過的檢查
        if (this.results.passed.length > 0) {
            log('\n✅ 通過的檢查:', 'green');
            for (const item of this.results.passed) {
                log(`  ✓ ${item}`, 'green');
            }
        }

        // 警告
        if (this.results.warnings.length > 0) {
            log('\n⚠️  警告項目:', 'yellow');
            for (const item of this.results.warnings) {
                log(`  ! ${item}`, 'yellow');
            }
        }

        // 失敗的檢查
        if (this.results.failed.length > 0) {
            log('\n❌ 失敗的檢查:', 'red');
            for (const item of this.results.failed) {
                log(`  ✗ ${item}`, 'red');
            }
        }

        // 總結
        log('\n📊 檢查總結:', 'bold');
        log(`通過: ${this.results.passed.length}`, 'green');
        log(`警告: ${this.results.warnings.length}`, 'yellow');
        log(`失敗: ${this.results.failed.length}`, 'red');

        // 發布建議
        if (this.criticalErrors.length === 0) {
            if (this.results.warnings.length === 0) {
                log('\n🎉 所有檢查都通過！可以安全發布版本', 'green');
            } else {
                log('\n⚠️  檢查通過但有警告，建議先處理警告項目再發布', 'yellow');
            }
        } else {
            log('\n🚫 存在關鍵錯誤，不建議發布版本！', 'red');
            log('\n🔧 建議的修復步驟:', 'cyan');
            log('1. 修復所有關鍵錯誤', 'reset');
            log('2. 重新執行發布前檢查', 'reset');
            log('3. 確保所有檢查通過後再發布', 'reset');
        }

        // 保存報告
        this.saveReport(version);

        return this.criticalErrors.length === 0;
    }

    // 保存檢查報告
    saveReport(version) {
        const reportDir = path.join(this.rootDir, '.stats');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportPath = path.join(reportDir, `pre-release-check_${Date.now()}.json`);
        const report = {
            version: version,
            timestamp: new Date().toISOString(),
            results: this.results,
            criticalErrors: this.criticalErrors,
            readyForRelease: this.criticalErrors.length === 0
        };

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            logInfo(`\n檢查報告已保存至: ${reportPath}`);
        } catch (error) {
            logWarning(`保存報告失敗: ${error.message}`);
        }
    }

    // 主要執行函數
    async run() {
        log('🚀 Genesis Chronicle 發布前檢查工具', 'bold');
        log('=' .repeat(50), 'blue');

        const startTime = Date.now();

        // 執行所有檢查
        const version = this.checkVersionConsistency();
        if (!version) {
            logError('版本號檢查失敗，停止後續檢查');
            process.exit(1);
        }

        this.checkGitStatus();
        this.checkCodeQuality();
        this.checkDependencies();
        this.checkBuild();
        this.checkCriticalFiles();
        this.runTests();

        // 生成報告
        const readyForRelease = this.generateReport(version);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        log(`\n⏱️  檢查完成，耗時 ${duration}s`, 'cyan');

        // 退出狀態碼
        process.exit(readyForRelease ? 0 : 1);
    }
}

// 主函數
function main() {
    const checker = new PreReleaseChecker();
    checker.run().catch(error => {
        logError(`執行失敗: ${error.message}`);
        process.exit(1);
    });
}

// 執行腳本
if (require.main === module) {
    main();
}

module.exports = PreReleaseChecker;