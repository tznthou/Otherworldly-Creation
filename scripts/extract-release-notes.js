#!/usr/bin/env node

/**
 * 從 CHANGELOG_zh_TW.md 抽出指定版本的段落，印到 stdout。
 *
 * release.yml 從前把「本版本改進」整段寫死在 YAML 裡，內容停在 v1.3.9，
 * 而專案維護著 40 個版本的雙語 CHANGELOG，發布流程一次也沒讀過它。
 *
 * 用法：
 *   node scripts/extract-release-notes.js 2.0.1
 *   node scripts/extract-release-notes.js v2.0.1
 *   RELEASE_VERSION=2.0.1 node scripts/extract-release-notes.js
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_FILE = 'CHANGELOG_zh_TW.md';

function extractReleaseNotes(content, version) {
    const normalized = String(version || '').trim().replace(/^v/, '');

    if (!normalized) {
        throw new Error('未指定版本號');
    }

    const lines = content.split('\n');
    const heading = `## [${normalized}]`;
    const start = lines.findIndex((line) => line.startsWith(heading));

    if (start === -1) {
        throw new Error(`${CHANGELOG_FILE} 找不到版本 ${normalized} 的段落`);
    }

    // 到下一個版本標題為止；沒有下一個就到檔尾
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].startsWith('## [')) {
            end = i;
            break;
        }
    }

    const body = lines.slice(start + 1, end);

    // 檔尾那一整區 `[1.2.9]: https://...` 的連結定義不屬於任何版本的內容，
    // 但它跟在最後一個版本後面，切段時會被一起帶走
    const isLinkDefinition = (line) => /^\[[^\]]+\]:\s*https?:\/\//.test(line);
    while (body.length > 0) {
        const last = body[body.length - 1];
        if (last.trim() === '' || isLinkDefinition(last)) {
            body.pop();
        } else {
            break;
        }
    }

    return body.join('\n').trim();
}

function main() {
    const version = process.argv[2] || process.env.RELEASE_VERSION;

    try {
        const changelogPath = path.join(__dirname, '..', CHANGELOG_FILE);
        const content = fs.readFileSync(changelogPath, 'utf8');
        process.stdout.write(extractReleaseNotes(content, version) + '\n');
    } catch (error) {
        // 這裡絕不能吞掉錯誤改印空字串 —— release notes 空著照樣發出去，
        // 比整個發布被擋下來糟糕得多
        console.error(`❌ ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { extractReleaseNotes };
