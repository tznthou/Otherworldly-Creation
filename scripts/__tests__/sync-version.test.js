const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
    resolveVersion,
    readVersions,
    checkConsistency,
    syncVersion,
} = require('../sync-version');

const SCRIPT = path.join(__dirname, '..', 'sync-version.js');

// 每個測試都在自己的暫存目錄跑，絕不碰真實的 package.json / Cargo.toml
function makeFixture({ pkg = '1.0.0', cargo = '1.0.0', tauri = '1.0.0' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-version-'));
    fs.mkdirSync(path.join(root, 'src-tauri'));

    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'fixture', version: pkg }, null, 2) + '\n'
    );
    fs.writeFileSync(
        path.join(root, 'src-tauri', 'Cargo.toml'),
        [
            '[package]',
            'name = "fixture"',
            // rust-version 刻意排在 version 前面：真實的 Cargo.toml 是反過來的，
            // 照抄的話無錨定的 regex 也會先撞上正確那行，測不出錨定有沒有效
            'rust-version = "1.77.2"',
            `version = "${cargo}"`,
            'edition = "2021"',
            '',
        ].join('\n')
    );
    fs.writeFileSync(
        path.join(root, 'src-tauri', 'tauri.conf.json'),
        JSON.stringify({ productName: 'fixture', version: tauri }, null, 2) + '\n'
    );

    return root;
}

describe('resolveVersion — 版本來源的優先序', () => {
    const clean = { RELEASE_VERSION: undefined, GITHUB_REF: undefined };

    it('命令列參數優先於環境變數', () => {
        const got = resolveVersion(['1.2.3'], {
            ...clean,
            RELEASE_VERSION: '4.5.6',
            GITHUB_REF: 'refs/tags/v7.8.9',
        });

        expect(got.version).toBe('1.2.3');
    });

    it('沒有參數時用 RELEASE_VERSION', () => {
        const got = resolveVersion([], { ...clean, RELEASE_VERSION: '4.5.6', GITHUB_REF: 'refs/tags/v7.8.9' });

        expect(got.version).toBe('4.5.6');
    });

    // CI 就是走這條：release.yml 無參數呼叫，靠 GITHUB_REF
    it('只有 GITHUB_REF 時從 tag 取版本', () => {
        expect(resolveVersion([], { ...clean, GITHUB_REF: 'refs/tags/v7.8.9' }).version).toBe('7.8.9');
        expect(resolveVersion([], { ...clean, GITHUB_REF: 'refs/tags/7.8.9' }).version).toBe('7.8.9');
    });

    it('GITHUB_REF 不是 tag 時不算數（分支上的手動觸發）', () => {
        expect(resolveVersion([], { ...clean, GITHUB_REF: 'refs/heads/main' })).toBeNull();
    });

    it('三種來源都沒有時回傳 null，代表檢查模式', () => {
        expect(resolveVersion([], clean)).toBeNull();
    });
});

describe('checkConsistency — 檢查模式', () => {
    it('三個檔案版本一致時通過', () => {
        const root = makeFixture({ pkg: '2.0.1', cargo: '2.0.1', tauri: '2.0.1' });

        expect(checkConsistency(root)).toMatchObject({ consistent: true, version: '2.0.1' });
    });

    it('版本不一致時不通過', () => {
        const root = makeFixture({ pkg: '2.0.1', cargo: '1.9.9', tauri: '2.0.1' });

        expect(checkConsistency(root).consistent).toBe(false);
    });

    it('不會寫檔', () => {
        const root = makeFixture({ pkg: '2.0.1', cargo: '1.9.9', tauri: '2.0.1' });
        const before = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

        checkConsistency(root);

        expect(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).toBe(before);
    });
});

describe('syncVersion — 同步模式', () => {
    it('三個檔案都更新到目標版本', () => {
        const root = makeFixture({ pkg: '1.0.0', cargo: '1.0.0', tauri: '1.0.0' });

        syncVersion(root, '9.9.9');

        expect(readVersions(root)).toEqual({
            'package.json': '9.9.9',
            'Cargo.toml': '9.9.9',
            'tauri.conf.json': '9.9.9',
        });
    });

    it('不會動到 Cargo.toml 的 rust-version', () => {
        // 無錨定的 /version\s*=\s*"..."/ 會匹配到 rust-version 那行。
        // 目前僥倖沒出事只因為 version 剛好排在 rust-version 前面
        const root = makeFixture();

        syncVersion(root, '9.9.9');

        const cargo = fs.readFileSync(path.join(root, 'src-tauri', 'Cargo.toml'), 'utf8');
        expect(cargo).toContain('rust-version = "1.77.2"');
        expect(cargo).toContain('version = "9.9.9"');
    });

    it('支援帶 pre-release 標籤的版本號', () => {
        const root = makeFixture();

        syncVersion(root, '1.0.0-beta.1');

        expect(readVersions(root)['package.json']).toBe('1.0.0-beta.1');
    });

    it('版本號格式不合法時丟錯', () => {
        const root = makeFixture();

        expect(() => syncVersion(root, 'refs/heads/main')).toThrow();
        expect(() => syncVersion(root, 'abc')).toThrow();
    });
});

describe('CLI', () => {
    const REAL_PKG = path.join(__dirname, '..', '..', 'package.json');
    const realVersionBefore = JSON.parse(fs.readFileSync(REAL_PKG, 'utf8')).version;

    // 這道守衛救過一次：SYNC_VERSION_ROOT 還沒實作時，CLI 落回腳本寫死的
    // __dirname/..，把 repo 真實的三個版本檔改成了測試用的版本號。
    // 注入點哪天失效，要在這裡就紅，而不是靜默改壞工作區。
    afterEach(() => {
        const now = JSON.parse(fs.readFileSync(REAL_PKG, 'utf8')).version;
        expect(now).toBe(realVersionBefore);
    });

    const run = (args, env = {}) =>
        execFileSync('node', [SCRIPT, ...args], {
            encoding: 'utf8',
            env: { ...process.env, RELEASE_VERSION: '', GITHUB_REF: '', SYNC_VERSION_ROOT: env.root || '', ...env },
        });

    it('無參數且版本一致時以 0 結束', () => {
        const root = makeFixture({ pkg: '2.0.1', cargo: '2.0.1', tauri: '2.0.1' });

        expect(() => run([], { root })).not.toThrow();
    });

    it('無參數且版本不一致時以非零結束，而且不改檔案', () => {
        const root = makeFixture({ pkg: '2.0.1', cargo: '1.9.9', tauri: '2.0.1' });
        const before = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

        expect(() => run([], { root })).toThrow();
        expect(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).toBe(before);
    });

    it('給了版本號就同步', () => {
        const root = makeFixture({ pkg: '1.0.0', cargo: '1.0.0', tauri: '1.0.0' });

        run(['3.2.1'], { root });

        expect(readVersions(root)['Cargo.toml']).toBe('3.2.1');
    });

    it('CI 的無參數 + GITHUB_REF 呼叫仍然是同步模式', () => {
        // release.yml 的兩個 build job 就是這樣呼叫的，改壞了發版當場爆
        const root = makeFixture({ pkg: '1.0.0', cargo: '1.0.0', tauri: '1.0.0' });

        run([], { root, GITHUB_REF: 'refs/tags/v4.5.6' });

        expect(readVersions(root)['package.json']).toBe('4.5.6');
    });
});
