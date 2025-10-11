# 測試指南 - Genesis Chronicle

**建立日期**: 2025-10-11
**策略**: 方案 A - 保守派（漸進式改進）

---

## 📋 測試策略總覽

### 核心原則
1. **測試是工具，不是枷鎖** - 測試失敗只警告，不阻止發布
2. **新功能優先** - 為新功能寫測試，舊程式碼可選
3. **簡單優先** - 優先寫單元測試，避免複雜的集成測試
4. **務實主義** - 不追求 100% 覆蓋率，只測關鍵路徑

### 當前狀態
- **靜態檢查**: ✅ 100% 覆蓋（TypeScript, ESLint, Rust）
- **動態測試**: ⚠️ 部分覆蓋（5+ passed, 6 failed due to env config）
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

### ❌ 不要寫依賴 Tauri 的測試（現階段）
```typescript
// ❌ 避免這樣寫（需要複雜的 mock）
import { invoke } from '@tauri-apps/api/tauri';

test('呼叫 Tauri command', async () => {
  const result = await invoke('get_projects');
  expect(result).toBeDefined();
});
```

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

### 問題 2：Tauri plugin-store 無法載入
**狀態**: ⏳ 已標記為可選測試
**方案**: 測試失敗只警告，未來可補 mock

### 問題 3：AudioContext 不存在
**狀態**: ⏳ 已標記為可選測試
**方案**: 測試失敗只警告，未來可補 mock

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
- [x] 修復 Jest 配置
- [x] 修改 pre-release 為可選測試
- [x] 建立測試模板

### 階段 2：新功能測試（進行中）
- [ ] 為下一個新功能寫測試
- [ ] 累積測試經驗
- [ ] 優化測試模板

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
