#!/usr/bin/env node

/**
 * Genesis Chronicle 版本同步腳本
 * 
 * 用途：統一管理所有配置文件中的版本號
 * 支援：從環境變數、git tag 或 package.json 獲取版本號
 * 
 * 使用方式：
 * 1. 從環境變數：RELEASE_VERSION=1.0.5 node scripts/sync-version.js
 * 2. 從 git tag：GITHUB_REF=refs/tags/v1.0.5 node scripts/sync-version.js
 * 3. 使用當前版本：node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

function main() {
    console.log('🔄 Genesis Chronicle 版本同步開始...\n');

    // 從多個來源獲取版本號（優先級：RELEASE_VERSION > GITHUB_REF > package.json）
    let version = process.env.RELEASE_VERSION;
    
    if (!version && process.env.GITHUB_REF) {
        // 從 GitHub tag 提取版本號：refs/tags/v1.0.5 -> 1.0.5
        const tagMatch = process.env.GITHUB_REF.match(/refs\/tags\/v?(.+)$/);
        if (tagMatch) {
            version = tagMatch[1];
            console.log(`📋 從 GitHub tag 提取版本號: ${version}`);
        }
    }
    
    if (!version) {
        // 從 package.json 讀取當前版本
        try {
            const pkgPath = path.join(__dirname, '..', 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            version = pkg.version;
            console.log(`📦 從 package.json 讀取版本號: ${version}`);
        } catch (error) {
            console.error('❌ 無法讀取 package.json:', error.message);
            process.exit(1);
        }
    }

    if (!version) {
        console.error('❌ 無法確定版本號');
        process.exit(1);
    }

    console.log(`🎯 目標版本號: ${version}\n`);

    // 驗證版本號格式（語義化版本或帶預發布標籤）
    const versionPattern = /^\d+\.\d+\.\d+(?:-[\w\d\-\.]+)?$/;
    if (!versionPattern.test(version)) {
        console.error(`❌ 版本號格式不正確: ${version}`);
        console.error('   支援格式: 1.0.0 或 1.0.0-beta');
        process.exit(1);
    }

    let updateCount = 0;

    // 1. 更新 package.json
    try {
        const pkgPath = path.join(__dirname, '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        if (pkg.version !== version) {
            pkg.version = version;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
            console.log(`✅ 已更新 package.json: ${pkg.version} -> ${version}`);
            updateCount++;
        } else {
            console.log(`✓ package.json 版本已是最新: ${version}`);
        }
    } catch (error) {
        console.error('❌ 更新 package.json 失敗:', error.message);
        process.exit(1);
    }

    // 2. 更新 src-tauri/Cargo.toml
    try {
        const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
        let cargo = fs.readFileSync(cargoPath, 'utf8');
        
        const versionRegex = /^version = "([^"]+)"$/m;
        const currentMatch = cargo.match(versionRegex);
        const currentVersion = currentMatch ? currentMatch[1] : null;
        
        if (currentVersion !== version) {
            cargo = cargo.replace(versionRegex, `version = "${version}"`);
            fs.writeFileSync(cargoPath, cargo);
            console.log(`✅ 已更新 Cargo.toml: ${currentVersion} -> ${version}`);
            updateCount++;
        } else {
            console.log(`✓ Cargo.toml 版本已是最新: ${version}`);
        }
    } catch (error) {
        console.error('❌ 更新 Cargo.toml 失敗:', error.message);
        process.exit(1);
    }

    // 3. 更新 src-tauri/tauri.conf.json
    try {
        const tauriPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
        const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
        
        if (tauri.version !== version) {
            tauri.version = version;
            fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
            console.log(`✅ 已更新 tauri.conf.json: ${tauri.version} -> ${version}`);
            updateCount++;
        } else {
            console.log(`✓ tauri.conf.json 版本已是最新: ${version}`);
        }
    } catch (error) {
        console.error('❌ 更新 tauri.conf.json 失敗:', error.message);
        process.exit(1);
    }

    // 完成總結
    console.log('\n🎉 版本同步完成！');
    console.log(`📊 更新檔案數量: ${updateCount}`);
    console.log(`🎯 統一版本號: ${version}`);
    
    if (updateCount === 0) {
        console.log('💡 所有檔案版本已是最新，無需更新');
    }

    // 設置環境變數供後續使用
    if (process.env.GITHUB_ACTIONS) {
        console.log(`\n🔧 設置 GitHub Actions 環境變數:`);
        console.log(`PKG_VERSION=${version}`);
        console.log(`RELEASE_VERSION=${version}`);
        
        // 寫入 GitHub Actions 環境文件
        if (process.env.GITHUB_ENV) {
            fs.appendFileSync(process.env.GITHUB_ENV, `PKG_VERSION=${version}\n`);
            fs.appendFileSync(process.env.GITHUB_ENV, `RELEASE_VERSION=${version}\n`);
        }
    }
}

// 處理未捕獲的錯誤
process.on('uncaughtException', (error) => {
    console.error('❌ 發生未預期的錯誤:', error.message);
    process.exit(1);
});

// 執行主函數
if (require.main === module) {
    main();
}

module.exports = { main };