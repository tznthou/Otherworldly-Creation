# 測試指南 - Genesis Chronicle

**建立日期**: 2025-10-11
**最後校正**: 2026-08-05（jest 基礎設施修復 + 殭屍測試清除）
**策略**: 方案 A - 保守派（漸進式改進），TDD 只往前套用

---

## 📋 測試策略總覽

### 核心原則
1. **測試是工具，不是枷鎖** - 測試失敗只警告，不阻止發布
2. **新功能優先** - 為新功能寫測試，舊程式碼可選
3. **簡單優先** - 優先寫單元測試，避免複雜的集成測試
4. **務實主義** - 不追求 100% 覆蓋率，只測關鍵路徑
5. **綠燈必須代表產品行為** - 測自己寫的 mock 比沒有測試更糟，
   它讓「有測試」變成假象。見下方〈2026-08-05 的清除〉

### 當前狀態
- **靜態檢查**: ✅ TypeScript / ESLint / Rust 全過（`src/__tests__` 不在 tsconfig include 內）
- **動態測試**: 11 passed / 1 skipped，全部真的碰到產品程式碼
- **Pre-release**: ✅ 測試失敗不阻止發布

---

## 🚀 快速開始

### 運行測試
```bash
# 運行所有測試
npm test

# 運行特定測試
npm test -- path/to/test.test.ts

# 運行測試並生成覆蓋率報告
npm test -- --coverage

# Watch 模式（開發時使用）
npm test -- --watch
```

### Pre-release 檢查
```bash
# 完整檢查（包括可選測試）
npm run pre-release

# 發布準備（統計 + README + 檢查）
npm run release-ready
```

---

## 📝 為新功能寫測試

### 測試模板：簡單單元測試

創建文件：`src/utils/__tests__/myNewFeature.test.ts`

```typescript
/**
 * 測試：[功能名稱]
 *
 * 這是一個簡單的單元測試範例
 * 不依賴 Tauri APIs，不依賴瀏覽器 APIs
 */

import { myNewFunction } from '../myNewFeature';

describe('myNewFunction', () => {
  it('應該正確處理正常輸入', () => {
    const result = myNewFunction('test');
    expect(result).toBe('expected output');
  });

  it('應該處理邊界條件', () => {
    expect(myNewFunction('')).toBe('');
    expect(myNewFunction(null)).toBe(null);
  });

  it('應該處理錯誤情況', () => {
    expect(() => myNewFunction(undefined)).toThrow();
  });
});
```

### 測試模板：React 組件測試

創建文件：`src/components/__tests__/MyComponent.test.tsx`

```typescript
/**
 * 測試：MyComponent
 *
 * 簡單的 React 組件測試
 * 使用 @testing-library/react
 */

import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('應該渲染基本內容', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('應該處理用戶互動', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## ⚠️ 避免的陷阱

### ❌ 不要把整個模組換成 mock 再測那個 mock

這是最危險的一種，因為它永遠是綠燈：

```typescript
// ❌ 這個測試什麼都沒驗證 —— 它驗證的是 jest.fn 有沒有記住自己的參數
jest.mock('../../renderer/src/api', () => ({
  api: { context: { buildSeparatedContext: jest.fn() } },
}));

it('should build context', async () => {
  (api.context.buildSeparatedContext as jest.Mock).mockResolvedValue(['a', 'b']);
  const result = await api.context.buildSeparatedContext(id, chapterId, pos);
  expect(result).toEqual(['a', 'b']);   // 當然相等，是同一個值繞了一圈
});
```

2026-08-05 刪掉的 `context-engineering.test.ts` 就是這樣，
而且它「測試」的三個 API 在前端根本不存在（後端有、前端沒接），
假綠燈整整掩蓋了這個缺口。

同理，也不要在測試裡 inline 寫一個 `<div onKeyDown={...}>` 再驗證自己的 handler 被呼叫，
那測的是 React 而不是產品。

### ✅ 要餵資料給元件，走 Tauri 命令通道

元件的資料一律經過 api 層 → `enhancedSafeInvoke` → `invoke`，
所以唯一有效的入口是 `mockTauriCommand()`：

```typescript
import { renderWithProviders } from '../utils/renderWithProviders';
import { mockTauriCommand, createMockTauriProject } from '../setup';

it('有專案時列出專案名稱', async () => {
  mockTauriCommand('get_all_projects', () => [
    createMockTauriProject({ id: '1', name: '專案一' }),
  ]);

  renderWithProviders(<Dashboard />);

  await waitFor(() => {
    expect(screen.getByText('專案一')).toBeInTheDocument();
  });
});
```

覆寫會在 `afterEach` 自動還原。完整範例見
`src/__tests__/integration/workflows/dashboard.test.tsx`。

### ❌ 不要寫依賴瀏覽器 API 的測試（現階段）
```typescript
// ❌ 避免這樣寫（需要 mock AudioContext 等）
test('播放聲音', () => {
  const sound = new SoundManager();
  sound.play('click');
});
```

### ✅ 應該寫的測試
```typescript
// ✅ 純邏輯測試（推薦）
import { calculateDiscount } from '../utils';

test('計算折扣', () => {
  expect(calculateDiscount(100, 10)).toBe(90);
  expect(calculateDiscount(100, 0)).toBe(100);
});
```

---

## 🔧 已知問題與解決方案

### 問題 1：import.meta.env 解析錯誤
**狀態**: ✅ 已修復
**方案**: 修改 `logService.ts` 使用 `process.env` 替代

### 問題 2：Tauri plugin-store 無法載入（`Class extends value undefined`）
**狀態**: ✅ 已修復（2026-08-05）
**根因**: 舊 setup 用 `jest.mock('@tauri-apps/api/core', () => ({ invoke }))`
把整個模組換成物件字面值，連帶弄丟 `Resource`，而 `class Store extends core.Resource` 靠它。
**方案**: 用 `jest.requireActual` 展開再覆寫特定 export，不要整個換掉。

### 問題 3：AudioContext 不存在
**狀態**: ✅ 已修復（2026-08-05）
**方案**: polyfill 移到環境層 `src/__tests__/setup-env.ts`

### 問題 4：`src/__tests__` 不在 tsconfig 的 include 內
**狀態**: ⏳ 未處理
**影響**: 測試碼不受型別檢查，編輯器對 `toBeInTheDocument` 等會顯示紅線，
`npx tsc --noEmit` 卻是綠的。納入檢查是好事，但要先確認不會噴出既有錯誤。

---

## 🗑️ 2026-08-05 的清除

jest 基礎設施修好後（`12a5823`），六個 suite 從「載入失敗」變成「真的執行」，
浮出 53 個失敗。逐個追下去發現它們不是選擇器過時，而是**對著想像中的 API 寫的**：

| 測試假設 | 真實架構 |
|---|---|
| `mockElectronAPI.projects.getAll` 餵資料 | 元件走 Tauri `invoke`，這份替身對畫面沒有作用 |
| `<CreateProjectModal isOpen onClose>` | 元件不吃 props，關閉走 `dispatch(closeModal())` |
| `getByTestId('modal-backdrop')` | 全 repo 不存在 |
| `ProjectGrid` 的「搜索專案...」 | `ProjectGrid` 是死碼，沒有任何元件 import |

**量化實證**：把資料流 mock 改對（讓 `get_all_projects` 真的回傳專案）之後，
53 個失敗**一個都沒有變綠**。修復成本等同重寫，卻要揹著錯誤前提。

這批測試建於 2025-08-24，因為 jest 一直是壞的，**從未通過過，也從未接住任何 regression**。
依「TDD 只往前套用」原則刪除：

- `workflows/projectManagement.test.tsx`（9）
- `workflows/characterManagement.test.tsx`（11）
- `workflows/editorWorkflow.test.tsx`（11）
- `e2e/completeWorkflow.test.tsx`（7）
- `components/componentInteractions.test.tsx`（17，其中 2 個「通過」的是渲染自己 inline 寫的 div 再驗證自己的 handler）
- `context-engineering.test.ts`（7，**全部是綠的**，但 `jest.mock` 掉整個 api 再測那份 mock）
- 連帶死碼：`components/TestApp.tsx`、`utils/testUtils.tsx`、setup 裡 90 行的 `mockElectronAPI`

清除後：**11 passed / 1 skipped**，每一個都真的碰到產品程式碼。
在此之前檯面上的「20 passing」，扣掉重複註冊的佔位測試、測自己 handler 的兩個、
以及整組測 mock 的七個，真正有效的只有 `CharacterModal` 的 8 個。

### 待補清單（原測試的意圖，功能本身仍在）

刪掉的是實作，不是需求。這些流程目前**沒有任何自動化覆蓋**：

- **專案**：建立流程、列表與搜尋、刪除、設定更新、匯入 / 匯出、載入失敗的重試
- **角色**：建立（含從模板）、編輯、能力管理、關係建立與一致性檢查、搜尋與原型過濾、引用檢查後刪除
- **編輯器**：章節 CRUD 與重新排序、AI 續寫（含參數調整與失敗處理）、自動儲存、閱讀模式
- **跨模組**：新使用者從建專案到寫作的完整路徑、錯誤恢復、大量資料下的響應性
- **通用互動**：模態框開關（ESC / 背景點擊）、表單驗證、通知系統、拖放排序、鍵盤導航與 ARIA

補的時候一個一個來，每個都要先確認 UI 真的長那樣，別再憑想像寫。

### 順帶挖出的產品缺口：Context Engineering 前端沒接

Rust 後端實作並在 `lib.rs` 註冊了三個命令，前端 `api/tauri.ts` 完全沒有對應方法，
`src/renderer` 底下也沒有任何地方 invoke 它們 —— 功能做好了但使用不到：

| 後端命令 | 位置 | 前端 |
|---|---|---|
| `build_separated_context` | `commands/context.rs:715` | ❌ 未接 |
| `estimate_separated_context_tokens` | `commands/context.rs` | ❌ 未接 |
| `generate_with_separated_context` | `commands/ai.rs:156` | ❌ 未接 |

相鄰的 `build_context` / `compress_context` / `get_context_stats` 都有接（`tauri.ts:720-723`），
唯獨 separated 這組漏掉。刪掉的那個假測試「測」的正是這三個 API，
它的綠燈讓缺口一直沒被看見。

**現況：只記錄，未處理**。要接的話屬功能開發，且接完要驗證後端行為才算完整。

---

## 📊 測試覆蓋率目標

### 不強制要求
- ❌ 不要求 100% 覆蓋率
- ❌ 不要求所有舊程式碼補測試
- ❌ 不阻止跳過測試發布

### 建議目標（可選）
- ✅ 新功能：50%+ 覆蓋率（關鍵邏輯）
- ✅ 關鍵模組：30%+ 覆蓋率（PathManager, Keyring, AI Providers）
- ✅ 工具函數：70%+ 覆蓋率（純函數，容易測試）

---

## 🎯 階段式改進計劃

### 階段 1：基礎建設（已完成）✅
- [x] 修復 Jest 配置（2026-08-05 才真正修好：`@/` 別名、testMatch、Tauri v2 的 `__TAURI_INTERNALS__`）
- [x] 修改 pre-release 為可選測試
- [x] 建立測試模板
- [x] 清除殭屍測試，讓綠燈代表產品行為
- [x] `mockTauriCommand()` 命令通道 + `createAppStore()` 共用 store 組裝

### 階段 2：新功能測試（進行中）
- [ ] 為下一個新功能寫測試
- [ ] CI 加上 `npm test` 與 `cargo test`，**含 Windows job**
- [ ] 逐步補回上方〈待補清單〉的流程

### 階段 3：關鍵路徑（未來）
- [ ] PathManager 測試（可選）
- [ ] Keyring Service 測試（可選）
- [ ] AI Provider trait 測試（可選）

---

## 💡 最佳實踐

### 1. 測試命名
```typescript
// ✅ 好的命名（描述行為）
it('should return empty array when no projects exist', () => {});

// ❌ 不好的命名（描述實現）
it('calls getProjects', () => {});
```

### 2. 測試隔離
```typescript
// ✅ 每個測試獨立
beforeEach(() => {
  // 重置狀態
});

// ❌ 測試間有依賴
let sharedState;
test('test 1', () => { sharedState = 1; });
test('test 2', () => { expect(sharedState).toBe(1); }); // 危險！
```

### 3. 測試覆蓋
```typescript
// ✅ 測試關鍵路徑 + 邊界條件
test('normal case', () => {});
test('empty input', () => {});
test('null input', () => {});
test('error case', () => {});

// ❌ 只測試 happy path
test('works', () => {});
```

---

## 📚 參考資源

### 內部文檔
- [critical-development-rules](serena://memory/critical-development-rules) - 開發規範
- [system-architecture-details](serena://memory/system-architecture-details) - 系統架構

### 外部資源
- [Jest 官方文檔](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🆘 遇到問題？

### 測試失敗不會阻止發布
- Pre-release 會顯示警告
- 但仍然可以繼續發布
- 可以稍後修復

### 不確定怎麼寫測試
- 從簡單的純函數開始
- 參考現有測試（CharacterModal.test.tsx）
- 不強制要求，可以先跳過

### 測試太複雜
- 考慮簡化功能設計
- 或者標記為 skip，稍後再補
- 記住：**測試是工具，不是目的**

---

**最後更新**: 2025-10-11
**維護者**: Genesis Chronicle Team
**問題回報**: 透過 GitHub Issues
