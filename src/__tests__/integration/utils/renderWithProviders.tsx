import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createAppStore } from '../../../renderer/src/store/store';
import ModalContainer from '../../../renderer/src/components/UI/ModalContainer';

/**
 * Integration 測試的統一渲染入口。
 *
 * store 用產品端的 createAppStore()，不另外列一份 reducer —— 舊的 helper
 * 自己維護清單，結果少掉四個 slice，測試環境與真實環境靜默漂移。
 *
 * 元件的資料一律走 Tauri invoke，要餵資料請用 setup.ts 的 mockTauriCommand()，
 * 不要期待 preloadedState 以外的捷徑。
 */

interface RenderOptions_ extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Record<string, unknown>;
  store?: ReturnType<typeof createAppStore>;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = createAppStore(preloadedState),
    initialEntries = ['/'],
    ...renderOptions
  }: RenderOptions_ = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
          <ModalContainer />
        </MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
