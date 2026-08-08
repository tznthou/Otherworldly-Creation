const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { extractReleaseNotes } = require('../extract-release-notes');

const ROOT = path.join(__dirname, '..', '..');
const CHANGELOG = fs.readFileSync(path.join(ROOT, 'CHANGELOG_zh_TW.md'), 'utf8');
const SCRIPT = path.join(ROOT, 'scripts', 'extract-release-notes.js');

describe('extractReleaseNotes', () => {
  // 真實的 CHANGELOG，不是自己捏的樣本 —— 格式漂移了要在這裡就紅
  it('抽得出 2.0.1 的內容', () => {
    const notes = extractReleaseNotes(CHANGELOG, '2.0.1');

    expect(notes).toContain('### 新增');
    expect(notes).toContain('API 設定卡片');
    expect(notes).toContain('空白專案模板');
  });

  it('不會溢出到下一個版本', () => {
    const notes = extractReleaseNotes(CHANGELOG, '2.0.1');

    // 先確認真的抽到東西 —— 否則空字串也能通過下面兩個 not.toContain
    expect(notes).toContain('### 變更');
    // 2.0.0 是設計系統改版，特徵字串在 2.0.1 段落裡不該出現
    expect(notes).not.toContain('Tailwind CSS v4');
    expect(notes).not.toContain('## [2.0.0]');
  });

  it('版本號帶不帶 v 前綴都一樣', () => {
    const withV = extractReleaseNotes(CHANGELOG, 'v2.0.1');

    expect(withV.length).toBeGreaterThan(0);
    expect(withV).toBe(extractReleaseNotes(CHANGELOG, '2.0.1'));
  });

  it('版本不存在時丟錯，不回傳空字串', () => {
    // 靜默回傳空字串會讓 release notes 空著照樣發出去
    expect(() => extractReleaseNotes(CHANGELOG, '9.9.9')).toThrow(/9\.9\.9/);
  });

  it('抽最舊的版本時不會把檔尾的連結定義區一起吞進來', () => {
    const notes = extractReleaseNotes(CHANGELOG, '0.4.12-electron-stable');

    expect(notes.length).toBeGreaterThan(0);
    expect(notes).not.toMatch(/^\[[\d.]+.*\]: https?:\/\//m);
  });

  it('標題行本身不會出現在輸出裡', () => {
    const notes = extractReleaseNotes(CHANGELOG, '2.0.1');

    expect(notes.length).toBeGreaterThan(0);
    expect(notes).not.toContain('## [2.0.1]');
  });
});

describe('CLI', () => {
  const run = (args) =>
    execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8', cwd: ROOT });

  it('把版本內容印到 stdout', () => {
    expect(run(['2.0.1'])).toContain('API 設定卡片');
  });

  it('版本不存在時以非零狀態碼結束', () => {
    expect(() => run(['9.9.9'])).toThrow();

    try {
      run(['9.9.9']);
    } catch (err) {
      expect(err.status).not.toBe(0);
      expect(String(err.stderr)).toContain('9.9.9');
    }
  });

  it('沒給版本號時以非零狀態碼結束', () => {
    expect(() => run([])).toThrow();
  });
});
