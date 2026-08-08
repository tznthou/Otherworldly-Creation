#!/usr/bin/env node

/**
 * Genesis Chronicle 版本號同步
 *
 * 兩種模式，依有沒有指定版本號自動分派：
 *
 *   node scripts/sync-version.js            檢查模式 —— 只讀不寫，版本不一致就以 1 結束
 *   node scripts/sync-version.js 2.0.1      同步模式
 *   RELEASE_VERSION=2.0.1 node scripts/...  同步模式
 *   GITHUB_REF=refs/tags/v2.0.1 node ...    同步模式（CI 的兩個 build job 走這條）
 *
 * 這支腳本是 scripts/version-sync.js 與本檔合併的結果。兩支檔名互為倒置、
 * 內容不同、目標檔案相同，一個給本地一個給 CI，改了其中一份而忘了另一份
 * 不會有任何東西發現。
 */

const fs = require('fs');
const path = require('path');

// 允許 1.0.0 與 1.0.0-beta.1；合併前只有本檔支援 pre-release 標籤
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[\w\d\-.]+)?$/;

// 錨定行首：無錨定的 /version\s*=\s*"[^"]+"/ 也會匹配 rust-version = "1.77.2"，
// 目前僥倖沒出事只因為 version 剛好排在 rust-version 前面
const CARGO_VERSION_RE = /^version = "([^"]+)"$/m;
const CARGO_NAME_RE = /^name = "([^"]+)"$/m;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CONFIG_FILES = [
    { name: 'package.json', rel: 'package.json', type: 'json' },
    { name: 'Cargo.toml', rel: path.join('src-tauri', 'Cargo.toml'), type: 'toml' },
    { name: 'tauri.conf.json', rel: path.join('src-tauri', 'tauri.conf.json'), type: 'json' },
];

const colors = {
    green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
    blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m',
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);
const logSuccess = (msg) => log(`✅ ${msg}`, 'green');
const logError = (msg) => log(`❌ ${msg}`, 'red');
const logInfo = (msg) => log(`ℹ️  ${msg}`, 'cyan');

/**
 * 版本號的來源，優先序：命令列參數 > RELEASE_VERSION > GITHUB_REF 的 tag。
 * 三者皆無回傳 null，代表使用者要的是檢查而不是同步。
 */
function resolveVersion(argv = [], env = process.env) {
    if (argv[0]) {
        return { version: argv[0], source: '命令列參數' };
    }
    if (env.RELEASE_VERSION) {
        return { version: env.RELEASE_VERSION, source: '環境變數 RELEASE_VERSION' };
    }
    if (env.GITHUB_REF) {
        const tagMatch = env.GITHUB_REF.match(/^refs\/tags\/v?(.+)$/);
        if (tagMatch) {
            return { version: tagMatch[1], source: 'GitHub tag' };
        }
    }
    return null;
}

function readVersions(rootDir) {
    const versions = {};

    for (const config of CONFIG_FILES) {
        const filePath = path.join(rootDir, config.rel);
        const content = fs.readFileSync(filePath, 'utf8');

        if (config.type === 'json') {
            versions[config.name] = JSON.parse(content).version;
        } else {
            const match = content.match(CARGO_VERSION_RE);
            versions[config.name] = match ? match[1] : null;
        }
    }

    return versions;
}

function checkConsistency(rootDir) {
    const versions = readVersions(rootDir);
    const unique = new Set(Object.values(versions));

    return {
        consistent: unique.size === 1 && !unique.has(null),
        version: unique.size === 1 ? [...unique][0] : null,
        versions,
    };
}

/**
 * Cargo.lock 裡自己那個 package 的版本條目。
 *
 * Cargo.toml 改了而 lock 檔沒改，`cargo build --locked` 就會拒絕建置。
 * 從前靠一條「記得另外跑 cargo check」的人工規則補償，CI 上沒有那一步。
 *
 * 只動 `name = "<自己>"` 緊接著的那一行，一個字元都不碰依賴 —— 全量
 * cargo update 會把 tauri-runtime-wry 升到與 wry 不相容的組合。
 */
function syncCargoLock(rootDir, version) {
    const lockPath = path.join(rootDir, 'src-tauri', 'Cargo.lock');

    if (!fs.existsSync(lockPath)) {
        return false;
    }

    const cargoToml = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
    const nameMatch = cargoToml.match(CARGO_NAME_RE);

    if (!nameMatch) {
        throw new Error('Cargo.toml 讀不到 package name，無法定位 Cargo.lock 的條目');
    }

    const packageName = nameMatch[1];
    const content = fs.readFileSync(lockPath, 'utf8');
    const entryRe = new RegExp(`(name = "${escapeRegExp(packageName)}"\\r?\\nversion = ")[^"]+(")`);
    const current = content.match(entryRe);

    if (!current) {
        // 靜默跳過的話，--locked 會在 CI 建置時才爆，而且錯誤訊息跟版本無關
        throw new Error(`Cargo.lock 找不到 ${packageName} 的版本條目（格式可能變了）`);
    }

    if (current[0].includes(`"${version}"`)) {
        return false;
    }

    fs.writeFileSync(lockPath, content.replace(entryRe, `$1${version}$2`));
    return true;
}

function syncVersion(rootDir, version) {
    if (!VERSION_PATTERN.test(version)) {
        throw new Error(`版本號格式不正確: ${version}（支援 1.0.0 或 1.0.0-beta）`);
    }

    const updated = [];

    for (const config of CONFIG_FILES) {
        const filePath = path.join(rootDir, config.rel);
        const content = fs.readFileSync(filePath, 'utf8');

        if (config.type === 'json') {
            const parsed = JSON.parse(content);
            if (parsed.version === version) continue;
            parsed.version = version;
            fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n');
        } else {
            const current = content.match(CARGO_VERSION_RE);
            if (current && current[1] === version) continue;
            fs.writeFileSync(filePath, content.replace(CARGO_VERSION_RE, `version = "${version}"`));
        }

        updated.push(config.name);
    }

    if (syncCargoLock(rootDir, version)) {
        updated.push('Cargo.lock');
    }

    return { updated };
}

function main() {
    const rootDir = process.env.SYNC_VERSION_ROOT || path.join(__dirname, '..');
    const resolved = resolveVersion(process.argv.slice(2), process.env);

    log('🔄 Genesis Chronicle 版本號同步', 'bold');
    log('='.repeat(50), 'blue');

    // 檢查模式：沒有人告訴我們要同步到哪一版，那就只回報現況
    if (!resolved) {
        const { consistent, version, versions } = checkConsistency(rootDir);

        if (consistent) {
            logSuccess(`所有配置文件版本號一致: v${version}`);
            process.exit(0);
        }

        logError('版本號不一致:');
        for (const [name, v] of Object.entries(versions)) {
            log(`  ${name}: ${v === null ? '(讀不到)' : 'v' + v}`, 'yellow');
        }
        log('\n指定目標版本號即可同步，例如: npm run version:sync 2.0.1', 'cyan');
        process.exit(1);
    }

    logInfo(`版本號來源: ${resolved.source}`);
    logInfo(`目標版本號: v${resolved.version}`);

    let updated;
    try {
        ({ updated } = syncVersion(rootDir, resolved.version));
    } catch (error) {
        logError(error.message);
        process.exit(1);
    }

    if (updated.length === 0) {
        logSuccess(`所有檔案版本已是 v${resolved.version}，無需更新`);
    } else {
        for (const name of updated) {
            logSuccess(`已更新 ${name}: v${resolved.version}`);
        }
    }

    // CI 的後續步驟靠這兩個環境變數組安裝檔名
    if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `PKG_VERSION=${resolved.version}\n`);
        fs.appendFileSync(process.env.GITHUB_ENV, `RELEASE_VERSION=${resolved.version}\n`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { resolveVersion, readVersions, checkConsistency, syncVersion, syncCargoLock, VERSION_PATTERN };
