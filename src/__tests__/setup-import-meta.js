/**
 * Jest Setup: Mock import.meta for Vite compatibility
 *
 * 這個文件解決 Jest 無法解析 Vite 的 import.meta.env 的問題
 * 在測試環境中提供一個 mock 的 import.meta 物件
 */

// 定義 import.meta 的 mock
global.importMeta = {
  env: {
    PROD: false,
    DEV: true,
    MODE: 'test',
    BASE_URL: '/',
  },
};

// 嘗試直接注入 import.meta（雖然不一定有效，但不會報錯）
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'import', {
    value: {
      meta: global.importMeta,
    },
    writable: true,
    configurable: true,
  });
}
