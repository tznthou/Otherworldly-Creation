import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import { mockTauriCommand, createMockTauriProject } from '../setup';
import Dashboard from '../../../renderer/src/pages/Dashboard/Dashboard';

/**
 * Dashboard 的專案列表渲染。
 *
 * 同時是 integration 測試的參考寫法：資料一律經由 mockTauriCommand()
 * 餵給真實的 Tauri 命令通道，不繞過 api 層自己塞 Redux state。
 */
describe('Dashboard 專案列表', () => {
  it('沒有專案時不顯示「最近專案」區塊', async () => {
    mockTauriCommand('get_all_projects', () => []);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('創作是孤獨的旅程')).toBeInTheDocument();
    });

    expect(screen.queryByText('最近專案')).not.toBeInTheDocument();
  });

  it('有專案時列出專案名稱', async () => {
    mockTauriCommand('get_all_projects', () => [
      createMockTauriProject({ id: '1', name: '專案一' }),
      createMockTauriProject({ id: '2', name: '專案二' }),
    ]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('最近專案')).toBeInTheDocument();
    });

    expect(screen.getByText('專案一')).toBeInTheDocument();
    expect(screen.getByText('專案二')).toBeInTheDocument();
  });

  it('命令覆寫不會外洩到下一個測試', async () => {
    renderWithProviders(<Dashboard />);

    // 上一個測試蓋掉的 get_all_projects 應該已被 afterEach 還原成預設的空陣列，
    // 沒有這層隔離，測試順序就會變成隱藏的相依。
    await waitFor(() => {
      expect(screen.getByText('創作是孤獨的旅程')).toBeInTheDocument();
    });

    expect(screen.queryByText('專案一')).not.toBeInTheDocument();
  });
});
