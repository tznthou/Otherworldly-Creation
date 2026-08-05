/**
 * 通用測試環境設定
 *
 * 只放「任何測試在 jsdom 底下都需要」的環境補齊：瀏覽器 API polyfill、
 * Tauri 執行期介面、外部套件替身。應用層的假資料與命令回應屬於 integration
 * 專用，放在 `integration/setup.ts`，不要混進來。
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

configure({
  testIdAttribute: 'data-testid',
});

// === 基礎 polyfill ===

global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// === Storage ===
//
// 用真的有存取行為的實作，而非一律回 undefined 的 jest.fn()。
// 持久化邏輯（例如排版設定的存取與還原）若打在空殼上，測試會通過但什麼都沒驗到。
// 仍以 jest.fn() 包裹，保留 spy 能力。

const createStorageMock = (): Storage => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  } as unknown as Storage;
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock(),
});

// === AudioContext ===
//
// jsdom 沒有 Web Audio。`SoundManager` 在模組載入時就 new 一個 AudioContext，
// 缺這個會讓每個載入到它的測試噴 "AudioCtx is not a constructor"。

const createAudioParamMock = () => ({
  value: 0,
  setValueAtTime: jest.fn(),
  linearRampToValueAtTime: jest.fn(),
  exponentialRampToValueAtTime: jest.fn(),
  cancelScheduledValues: jest.fn(),
});

class AudioContextMock {
  state = 'running';
  currentTime = 0;
  destination = { connect: jest.fn(), disconnect: jest.fn() };

  resume = jest.fn().mockResolvedValue(undefined);
  suspend = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
  decodeAudioData = jest.fn().mockResolvedValue({ duration: 0 });

  createGain = jest.fn(() => ({
    gain: createAudioParamMock(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));

  createBufferSource = jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }));

  createOscillator = jest.fn(() => ({
    type: 'sine',
    frequency: createAudioParamMock(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }));
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: AudioContextMock,
});
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: AudioContextMock,
});

// === Tauri 執行期 ===
//
// Tauri v2 的 `@tauri-apps/api/core` 走 `window.__TAURI_INTERNALS__`（v1 是 `__TAURI__`）。
// 缺它會噴 "Cannot read properties of undefined (reading 'transformCallback')"。
// 這裡補的是執行期介面本身；個別命令要回什麼由各測試自行決定。

Object.defineProperty(window, '__TAURI_INTERNALS__', {
  writable: true,
  value: {
    transformCallback: jest.fn((callback?: (payload: unknown) => void) => {
      const id = Math.floor(Math.random() * 1_000_000);
      if (callback) {
        (window as unknown as Record<string, unknown>)[`_${id}`] = callback;
      }
      return id;
    }),
    invoke: jest.fn().mockResolvedValue(null),
    convertFileSrc: jest.fn((path: string) => `asset://localhost/${path}`),
  },
});

// === @tauri-apps/plugin-store ===
//
// `Store extends core.Resource`。只要有人把 `@tauri-apps/api/core` 換成不含 Resource
// 的替身，這個 extends 就會拿到 undefined，整個 suite 在載入階段就掛掉
// （TypeError: Class extends value undefined）。
// 這個 store 需要真實後端，測試環境一律換成記憶體版本。

jest.mock('@tauri-apps/plugin-store', () => {
  const data = new Map<string, unknown>();

  const storeInstance = {
    get: jest.fn(async (key: string) => (data.has(key) ? data.get(key) : null)),
    set: jest.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    }),
    delete: jest.fn(async (key: string) => data.delete(key)),
    has: jest.fn(async (key: string) => data.has(key)),
    keys: jest.fn(async () => Array.from(data.keys())),
    values: jest.fn(async () => Array.from(data.values())),
    entries: jest.fn(async () => Array.from(data.entries())),
    length: jest.fn(async () => data.size),
    clear: jest.fn(async () => {
      data.clear();
    }),
    reset: jest.fn(async () => {
      data.clear();
    }),
    save: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
    onKeyChange: jest.fn(async () => () => undefined),
    onChange: jest.fn(async () => () => undefined),
  };

  return {
    Store: {
      load: jest.fn(async () => storeInstance),
      get: jest.fn(async () => storeInstance),
      new: jest.fn(async () => storeInstance),
    },
    load: jest.fn(async () => storeInstance),
    getStore: jest.fn(async () => storeInstance),
  };
});
