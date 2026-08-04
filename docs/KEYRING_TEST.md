# 🔐 Keyring 加密功能測試指南

## 測試環境
- macOS 系統（使用 Keychain）
- Genesis Chronicle v1.2.7+

## 測試步驟

### 1️⃣ 基本功能測試

在應用程式的開發者控制台（F12）執行以下測試：

```javascript
// 測試 1: 寫入加密 API Key
await window.__TAURI_INVOKE__('set_secure_key', {
  key: 'ai.openaiApiKey',
  value: 'sk-test-12345'
});
// 預期：✅ 成功寫入到 macOS Keychain

// 測試 2: 讀取加密 API Key
const result = await window.__TAURI_INVOKE__('get_secure_key', {
  key: 'ai.openaiApiKey'
});
console.log('讀取結果:', result);
// 預期：✅ 返回 'sk-test-12345'

// 測試 3: 刪除加密 API Key
await window.__TAURI_INVOKE__('delete_secure_key', {
  key: 'ai.openaiApiKey'
});
// 預期：✅ 從 Keychain 刪除

// 測試 4: 讀取不存在的 Key
const empty = await window.__TAURI_INVOKE__('get_secure_key', {
  key: 'ai.nonexistent'
});
console.log('不存在的key:', empty);
// 預期：✅ 返回 null
```

### 2️⃣ 高層 API 測試（使用 SettingsService）

```javascript
// 測試 5: 使用 SettingsService 寫入
const { SettingsService } = await import('./services/settingsService');

await SettingsService.setSecureApiKey('ai.geminiApiKey', 'AIzaSy-test-67890');
// 預期：
// ✅ Keyring 寫入成功
// ✅ localStorage 備份成功（雙保險）

// 測試 6: 使用 SettingsService 讀取
const apiKey = await SettingsService.getSecureApiKey('ai.geminiApiKey');
console.log('讀取的 API Key:', apiKey);
// 預期：✅ 返回 'AIzaSy-test-67890'

// 測試 7: 刪除 API Key
await SettingsService.deleteSecureApiKey('ai.geminiApiKey');
// 預期：
// ✅ Keyring 刪除成功
// ✅ localStorage 也清空
```

### 3️⃣ Fallback 機制測試

```javascript
// 測試 8: 模擬 Keyring 不可用（只能手動模擬）
// 如果 Keyring 讀取失敗，應該自動降級到 localStorage

// 首先在 localStorage 設定一個值
const settings = await SettingsService.loadSettings();
settings.ai.openaiApiKey = 'sk-fallback-test';
await SettingsService.saveSettings(settings);

// 然後嘗試讀取
const fallbackKey = await SettingsService.getSecureApiKey('ai.openaiApiKey');
console.log('Fallback 讀取:', fallbackKey);
// 預期：✅ 即使 Keyring 失敗，仍能從 localStorage 讀取
```

### 4️⃣ 自動遷移測試

```javascript
// 測試 9: 自動遷移 localStorage → Keyring
// 1. 先在 localStorage 設定 API Key
const settings = await SettingsService.loadSettings();
settings.ai.claudeApiKey = 'sk-ant-migrate-test';
await SettingsService.saveSettings(settings);

// 2. 使用 getSecureApiKey 讀取（會自動遷移到 Keyring）
const migratedKey = await SettingsService.getSecureApiKey('ai.claudeApiKey');
console.log('遷移後的 Key:', migratedKey);
// 預期：
// ✅ 自動從 localStorage 複製到 Keyring
// ✅ 返回正確的值

// 3. 驗證 Keyring 中確實有資料
const fromKeyring = await window.__TAURI_INVOKE__('get_secure_key', {
  key: 'ai.claudeApiKey'
});
console.log('Keyring 中的資料:', fromKeyring);
// 預期：✅ 確認已成功遷移到 Keychain
```

### 5️⃣ macOS Keychain 驗證

在終端執行：

```bash
# 查看 Keychain 中的 Genesis Chronicle 條目
security find-generic-password -s "genesis-chronicle" -a "ai.openaiApiKey" -w

# 列出所有 Genesis Chronicle 相關的密鑰
security dump-keychain | grep -A 10 "genesis-chronicle"
```

預期：
- ✅ 能找到對應的 keychain 條目
- ✅ 密碼已加密儲存
- ✅ 服務名稱為 "genesis-chronicle"

## 成功標準

- [ ] 所有 9 個測試都通過
- [ ] macOS Keychain 中能看到加密的資料
- [ ] localStorage 仍有備份（雙保險）
- [ ] Keyring 失敗時能自動 fallback 到 localStorage
- [ ] 現有功能完全不受影響

## 已知限制

1. **localStorage 仍可見明文**：這是設計的 fallback 機制，確保程式在 Keyring 不可用時仍能運作
2. **需要使用者授權**：首次使用 Keychain 時，macOS 可能會請求授權
3. **跨平台差異**：Windows 使用 Credential Manager，Linux 使用 Secret Service

## 清理測試資料

```javascript
// 清除所有測試資料
await SettingsService.deleteSecureApiKey('ai.openaiApiKey');
await SettingsService.deleteSecureApiKey('ai.geminiApiKey');
await SettingsService.deleteSecureApiKey('ai.claudeApiKey');
```

```bash
# 從 Keychain 刪除測試資料
security delete-generic-password -s "genesis-chronicle" -a "ai.openaiApiKey"
security delete-generic-password -s "genesis-chronicle" -a "ai.geminiApiKey"
security delete-generic-password -s "genesis-chronicle" -a "ai.claudeApiKey"
```
