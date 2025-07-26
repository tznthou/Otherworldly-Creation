import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockProject, mockElectronAPI } from '../utils/testUtils';
import Dashboard from '../../../renderer/src/pages/Dashboard/Dashboard';
import CreateProjectModal from '../../../renderer/src/components/Modals/CreateProjectModal';

describe('專案管理工作流程整合測試', () => {
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('專案創建流程', () => {
    it('應該能夠完成完整的專案創建流程', async () => {
      // 模擬初始狀態：沒有專案
      mockElectronAPI.projects.getAll.mockResolvedValue([]);
      
      const { store } = renderWithProviders(<Dashboard />);

      // 等待頁面載入
      await waitFor(() => {
        expect(screen.getByText('創建新專案')).toBeInTheDocument();
      });

      // 點擊創建專案按鈕
      fireEvent.click(screen.getByText('創建新專案'));

      // 等待模態框出現
      await waitFor(() => {
        expect(screen.getByText('創建新專案')).toBeInTheDocument();
      });

      // 填寫專案資訊
      const nameInput = screen.getByLabelText('專案名稱');
      fireEvent.change(nameInput, { target: { value: '我的異世界小說' } });

      const descriptionInput = screen.getByLabelText('專案描述');
      fireEvent.change(descriptionInput, { 
        target: { value: '一個關於轉生到異世界的故事' } 
      });

      // 選擇專案類型
      const typeSelect = screen.getByLabelText('專案類型');
      fireEvent.change(typeSelect, { target: { value: 'isekai' } });

      // 模擬專案創建成功
      const mockProject = createMockProject({
        name: '我的異世界小說',
        description: '一個關於轉生到異世界的故事',
        type: 'isekai',
      });
      mockElectronAPI.projects.create.mockResolvedValue(mockProject.id);
      mockElectronAPI.projects.getById.mockResolvedValue(mockProject);

      // 提交表單
      fireEvent.click(screen.getByText('創建專案'));

      // 等待專案創建完成
      await waitFor(() => {
        expect(mockElectronAPI.projects.create).toHaveBeenCalledWith({
          name: '我的異世界小說',
          description: '一個關於轉生到異世界的故事',
          type: 'isekai',
          settings: expect.any(Object),
        });
      });

      // 驗證 Redux store 狀態更新
      await waitFor(() => {
        const state = store.getState();
        expect(state.projects.items).toContainEqual(
          expect.objectContaining({
            name: '我的異世界小說',
            type: 'isekai',
          })
        );
      });
    });

    it('應該處理專案創建失敗的情況', async () => {
      renderWithProviders(<CreateProjectModal isOpen={true} onClose={jest.fn()} />);

      // 填寫專案資訊
      const nameInput = screen.getByLabelText('專案名稱');
      fireEvent.change(nameInput, { target: { value: '測試專案' } });

      // 模擬創建失敗
      mockElectronAPI.projects.create.mockRejectedValue(new Error('創建失敗'));

      // 提交表單
      fireEvent.click(screen.getByText('創建專案'));

      // 等待錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText(/創建失敗/)).toBeInTheDocument();
      });
    });
  });

  describe('專案列表和操作', () => {
    it('應該正確顯示專案列表並支援操作', async () => {
      const mockProjects = [
        createMockProject({ id: '1', name: '專案一' }),
        createMockProject({ id: '2', name: '專案二' }),
      ];

      mockElectronAPI.projects.getAll.mockResolvedValue(mockProjects);

      renderWithProviders(<Dashboard />);

      // 等待專案列表載入
      await waitFor(() => {
        expect(screen.getByText('專案一')).toBeInTheDocument();
        expect(screen.getByText('專案二')).toBeInTheDocument();
      });

      // 測試專案搜索
      const searchInput = screen.getByPlaceholderText('搜索專案...');
      fireEvent.change(searchInput, { target: { value: '專案一' } });

      await waitFor(() => {
        expect(screen.getByText('專案一')).toBeInTheDocument();
        expect(screen.queryByText('專案二')).not.toBeInTheDocument();
      });
    });

    it('應該支援專案刪除操作', async () => {
      const mockProject = createMockProject({ name: '要刪除的專案' });
      mockElectronAPI.projects.getAll.mockResolvedValue([mockProject]);

      renderWithProviders(<Dashboard />);

      // 等待專案載入
      await waitFor(() => {
        expect(screen.getByText('要刪除的專案')).toBeInTheDocument();
      });

      // 點擊專案選單
      const menuButton = screen.getByLabelText('專案選單');
      fireEvent.click(menuButton);

      // 點擊刪除選項
      fireEvent.click(screen.getByText('刪除專案'));

      // 確認刪除
      await waitFor(() => {
        expect(screen.getByText('確認刪除')).toBeInTheDocument();
      });

      mockElectronAPI.projects.delete.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('確認'));

      // 驗證刪除 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.projects.delete).toHaveBeenCalledWith(mockProject.id);
      });
    });
  });

  describe('專案設定管理', () => {
    it('應該能夠更新專案設定', async () => {
      const mockProject = createMockProject();
      mockElectronAPI.projects.getById.mockResolvedValue(mockProject);

      renderWithProviders(<Dashboard />);

      // 模擬進入專案設定
      // 這裡需要根據實際的 UI 結構調整
      // 假設有一個設定按鈕
      const settingsButton = screen.getByLabelText('專案設定');
      fireEvent.click(settingsButton);

      // 等待設定界面載入
      await waitFor(() => {
        expect(screen.getByText('專案設定')).toBeInTheDocument();
      });

      // 修改 AI 模型設定
      const modelSelect = screen.getByLabelText('AI 模型');
      fireEvent.change(modelSelect, { target: { value: 'codellama' } });

      // 儲存設定
      mockElectronAPI.projects.update.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('儲存設定'));

      // 驗證更新 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.projects.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockProject.id,
            settings: expect.objectContaining({
              aiModel: 'codellama',
            }),
          })
        );
      });
    });
  });

  describe('專案匯入/匯出', () => {
    it('應該支援專案匯出功能', async () => {
      const mockProject = createMockProject();
      mockElectronAPI.projects.getAll.mockResolvedValue([mockProject]);

      renderWithProviders(<Dashboard />);

      // 等待專案載入
      await waitFor(() => {
        expect(screen.getByText(mockProject.name)).toBeInTheDocument();
      });

      // 點擊匯出按鈕
      const exportButton = screen.getByText('匯出專案');
      fireEvent.click(exportButton);

      // 模擬匯出成功
      mockElectronAPI.database.export.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.json',
      });

      // 等待匯出完成
      await waitFor(() => {
        expect(mockElectronAPI.database.export).toHaveBeenCalled();
      });

      // 驗證成功訊息
      await waitFor(() => {
        expect(screen.getByText(/匯出成功/)).toBeInTheDocument();
      });
    });

    it('應該支援專案匯入功能', async () => {
      renderWithProviders(<Dashboard />);

      // 點擊匯入按鈕
      const importButton = screen.getByText('匯入專案');
      fireEvent.click(importButton);

      // 模擬文件選擇和匯入
      mockElectronAPI.database.import.mockResolvedValue({
        success: true,
        message: '匯入成功',
      });

      // 等待匯入完成
      await waitFor(() => {
        expect(mockElectronAPI.database.import).toHaveBeenCalled();
      });

      // 驗證成功訊息
      await waitFor(() => {
        expect(screen.getByText(/匯入成功/)).toBeInTheDocument();
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該正確處理網路錯誤', async () => {
      // 模擬網路錯誤
      mockElectronAPI.projects.getAll.mockRejectedValue(new Error('網路連接失敗'));

      renderWithProviders(<Dashboard />);

      // 等待錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText(/載入專案失敗/)).toBeInTheDocument();
      });

      // 測試重試功能
      const retryButton = screen.getByText('重試');
      
      // 模擬重試成功
      mockElectronAPI.projects.getAll.mockResolvedValue([]);
      fireEvent.click(retryButton);

      // 驗證重試後錯誤消失
      await waitFor(() => {
        expect(screen.queryByText(/載入專案失敗/)).not.toBeInTheDocument();
      });
    });

    it('應該處理資料驗證錯誤', async () => {
      renderWithProviders(<CreateProjectModal isOpen={true} onClose={jest.fn()} />);

      // 嘗試提交空表單
      fireEvent.click(screen.getByText('創建專案'));

      // 驗證錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument();
      });
    });
  });
});