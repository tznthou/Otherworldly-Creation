import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockProject, mockElectronAPI } from '../utils/testUtils';
import App from '../../../renderer/src/App';

describe('完整工作流程端到端測試', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 設置初始狀態
    mockElectronAPI.projects.getAll.mockResolvedValue([]);
    mockElectronAPI.settings.loadSettings.mockResolvedValue({});
    mockElectronAPI.ai.getServiceStatus.mockResolvedValue({
      service: { available: true, version: '0.1.0' },
      models: { count: 2, list: ['llama3', 'codellama'] },
      lastChecked: new Date(),
    });
  });

  describe('新用戶完整創作流程', () => {
    it('應該能夠完成從創建專案到寫作的完整流程', async () => {
      renderWithProviders(<App />);

      // 步驟 1: 應用程式啟動，顯示歡迎界面
      await waitFor(() => {
        expect(screen.getByText('創世紀元：異世界創作神器')).toBeInTheDocument();
      });

      // 步驟 2: 創建新專案
      fireEvent.click(screen.getByText('創建新專案'));

      await waitFor(() => {
        expect(screen.getByText('創建新專案')).toBeInTheDocument();
      });

      // 填寫專案資訊
      fireEvent.change(screen.getByLabelText('專案名稱'), {
        target: { value: '我的異世界冒險' }
      });
      fireEvent.change(screen.getByLabelText('專案描述'), {
        target: { value: '一個普通高中生穿越到異世界成為勇者的故事' }
      });
      fireEvent.change(screen.getByLabelText('專案類型'), {
        target: { value: 'isekai' }
      });

      // 模擬專案創建成功
      const mockProject = createMockProject({
        id: 'new-project-id',
        name: '我的異世界冒險',
        type: 'isekai',
      });
      mockElectronAPI.projects.create.mockResolvedValue(mockProject.id);
      mockElectronAPI.projects.getById.mockResolvedValue(mockProject);

      fireEvent.click(screen.getByText('創建專案'));

      // 步驟 3: 專案創建成功，進入專案編輯器
      await waitFor(() => {
        expect(screen.getByText('我的異世界冒險')).toBeInTheDocument();
        expect(screen.getByText('章節列表')).toBeInTheDocument();
      });

      // 步驟 4: 創建第一個角色
      fireEvent.click(screen.getByText('角色管理'));

      await waitFor(() => {
        expect(screen.getByText('角色管理')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('新增角色'));

      // 填寫角色資訊
      await waitFor(() => {
        expect(screen.getByText('創建新角色')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('角色名稱'), {
        target: { value: '田中太郎' }
      });
      fireEvent.change(screen.getByLabelText('角色原型'), {
        target: { value: '勇者' }
      });
      fireEvent.change(screen.getByLabelText('年齡'), {
        target: { value: '17' }
      });
      fireEvent.change(screen.getByLabelText('性別'), {
        target: { value: '男' }
      });

      // 模擬角色創建成功
      mockElectronAPI.characters.create.mockResolvedValue('character-id');
      fireEvent.click(screen.getByText('創建角色'));

      // 步驟 5: 創建第一章
      fireEvent.click(screen.getByText('編輯器'));

      await waitFor(() => {
        expect(screen.getByText('章節列表')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('新增章節'));

      await waitFor(() => {
        expect(screen.getByText('創建新章節')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('章節標題'), {
        target: { value: '第一章：異世界的開始' }
      });

      // 模擬章節創建成功
      mockElectronAPI.chapters.create.mockResolvedValue('chapter-id');
      mockElectronAPI.chapters.getByProjectId.mockResolvedValue([{
        id: 'chapter-id',
        projectId: mockProject.id,
        title: '第一章：異世界的開始',
        content: '',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      fireEvent.click(screen.getByText('創建章節'));

      // 步驟 6: 開始寫作
      await waitFor(() => {
        expect(screen.getByText('第一章：異世界的開始')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('第一章：異世界的開始'));

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // 輸入一些內容
      const editor = screen.getByRole('textbox');
      const initialContent = '田中太郎是一個普通的高中生，直到那一天...';
      fireEvent.change(editor, { target: { value: initialContent } });

      // 步驟 7: 使用 AI 續寫
      await waitFor(() => {
        expect(screen.getByText('AI 續寫')).toBeInTheDocument();
      });

      // 模擬 AI 生成成功
      const aiGeneratedText = '突然，一道刺眼的光芒包圍了他，當他再次睜開眼睛時，發現自己身處一個完全陌生的世界。';
      mockElectronAPI.ai.generateWithContext.mockResolvedValue(aiGeneratedText);

      fireEvent.click(screen.getByText('AI 續寫'));

      // 等待 AI 生成完成
      await waitFor(() => {
        expect(screen.getByText(aiGeneratedText)).toBeInTheDocument();
      });

      // 接受 AI 生成的內容
      fireEvent.click(screen.getByText('接受'));

      // 步驟 8: 驗證內容已保存
      await waitFor(() => {
        expect(mockElectronAPI.chapters.update).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.stringContaining(initialContent),
          })
        );
      });

      // 步驟 9: 檢查自動儲存狀態
      await waitFor(() => {
        expect(screen.getByText('已儲存')).toBeInTheDocument();
      });

      // 步驟 10: 驗證完整流程完成
      expect(mockElectronAPI.projects.create).toHaveBeenCalled();
      expect(mockElectronAPI.characters.create).toHaveBeenCalled();
      expect(mockElectronAPI.chapters.create).toHaveBeenCalled();
      expect(mockElectronAPI.ai.generateWithContext).toHaveBeenCalled();
      expect(mockElectronAPI.chapters.update).toHaveBeenCalled();
    });
  });

  describe('專案管理完整流程', () => {
    it('應該能夠管理多個專案', async () => {
      // 模擬已有專案
      const existingProjects = [
        createMockProject({ id: '1', name: '專案一' }),
        createMockProject({ id: '2', name: '專案二' }),
      ];
      mockElectronAPI.projects.getAll.mockResolvedValue(existingProjects);

      renderWithProviders(<App />);

      // 等待專案列表載入
      await waitFor(() => {
        expect(screen.getByText('專案一')).toBeInTheDocument();
        expect(screen.getByText('專案二')).toBeInTheDocument();
      });

      // 創建新專案
      fireEvent.click(screen.getByText('創建新專案'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('專案名稱')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('專案名稱'), {
        target: { value: '專案三' }
      });

      const newProject = createMockProject({ id: '3', name: '專案三' });
      mockElectronAPI.projects.create.mockResolvedValue(newProject.id);
      mockElectronAPI.projects.getAll.mockResolvedValue([...existingProjects, newProject]);

      fireEvent.click(screen.getByText('創建專案'));

      // 驗證新專案出現在列表中
      await waitFor(() => {
        expect(screen.getByText('專案三')).toBeInTheDocument();
      });

      // 測試專案切換
      fireEvent.click(screen.getByText('專案一'));

      await waitFor(() => {
        expect(screen.getByText('專案一')).toBeInTheDocument();
      });

      // 測試專案刪除
      const deleteButton = screen.getByLabelText('刪除專案');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('確認刪除')).toBeInTheDocument();
      });

      mockElectronAPI.projects.delete.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('確認'));

      await waitFor(() => {
        expect(mockElectronAPI.projects.delete).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('協作功能流程', () => {
    it('應該支援專案匯出和匯入', async () => {
      const mockProject = createMockProject();
      mockElectronAPI.projects.getAll.mockResolvedValue([mockProject]);

      renderWithProviders(<App />);

      // 等待專案載入
      await waitFor(() => {
        expect(screen.getByText(mockProject.name)).toBeInTheDocument();
      });

      // 測試匯出功能
      fireEvent.click(screen.getByText('匯出專案'));

      mockElectronAPI.database.export.mockResolvedValue({
        success: true,
        filePath: '/path/to/export.json',
      });

      await waitFor(() => {
        expect(mockElectronAPI.database.export).toHaveBeenCalled();
      });

      // 驗證匯出成功訊息
      await waitFor(() => {
        expect(screen.getByText(/匯出成功/)).toBeInTheDocument();
      });

      // 測試匯入功能
      fireEvent.click(screen.getByText('匯入專案'));

      mockElectronAPI.database.import.mockResolvedValue({
        success: true,
        message: '匯入成功',
      });

      await waitFor(() => {
        expect(mockElectronAPI.database.import).toHaveBeenCalled();
      });

      // 驗證匯入成功訊息
      await waitFor(() => {
        expect(screen.getByText(/匯入成功/)).toBeInTheDocument();
      });
    });
  });

  describe('設定和偏好管理', () => {
    it('應該能夠管理應用程式設定', async () => {
      renderWithProviders(<App />);

      // 進入設定頁面
      fireEvent.click(screen.getByText('設定'));

      await waitFor(() => {
        expect(screen.getByText('系統設定')).toBeInTheDocument();
      });

      // 測試 AI 設定
      fireEvent.click(screen.getByText('AI 設定'));

      await waitFor(() => {
        expect(screen.getByLabelText('預設模型')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('預設模型'), {
        target: { value: 'codellama' }
      });

      // 測試編輯器設定
      fireEvent.click(screen.getByText('編輯器'));

      await waitFor(() => {
        expect(screen.getByLabelText('字體大小')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('字體大小'), {
        target: { value: '16' }
      });

      // 儲存設定
      mockElectronAPI.settings.saveSettings.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('儲存設定'));

      await waitFor(() => {
        expect(mockElectronAPI.settings.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            ai: expect.objectContaining({
              defaultModel: 'codellama',
            }),
            editor: expect.objectContaining({
              fontSize: 16,
            }),
          })
        );
      });
    });
  });

  describe('錯誤恢復流程', () => {
    it('應該能夠從錯誤中恢復', async () => {
      renderWithProviders(<App />);

      // 模擬網路錯誤
      mockElectronAPI.projects.getAll.mockRejectedValue(new Error('網路連接失敗'));

      // 等待錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText(/載入失敗/)).toBeInTheDocument();
      });

      // 測試重試功能
      mockElectronAPI.projects.getAll.mockResolvedValue([]);
      fireEvent.click(screen.getByText('重試'));

      // 驗證錯誤恢復
      await waitFor(() => {
        expect(screen.queryByText(/載入失敗/)).not.toBeInTheDocument();
      });
    });

    it('應該處理 AI 服務不可用的情況', async () => {
      const mockProject = createMockProject();
      mockElectronAPI.projects.getAll.mockResolvedValue([mockProject]);
      mockElectronAPI.chapters.getByProjectId.mockResolvedValue([{
        id: 'chapter-id',
        projectId: mockProject.id,
        title: '第一章',
        content: '測試內容',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      renderWithProviders(<App />);

      // 進入編輯器
      await waitFor(() => {
        expect(screen.getByText(mockProject.name)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(mockProject.name));

      await waitFor(() => {
        expect(screen.getByText('第一章')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('第一章'));

      // 模擬 AI 服務不可用
      mockElectronAPI.ai.generateWithContext.mockRejectedValue(
        new Error('AI 服務暫時不可用')
      );

      // 嘗試使用 AI 續寫
      await waitFor(() => {
        expect(screen.getByText('AI 續寫')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('AI 續寫'));

      // 驗證錯誤處理
      await waitFor(() => {
        expect(screen.getByText(/AI 服務暫時不可用/)).toBeInTheDocument();
      });

      // 測試服務恢復
      mockElectronAPI.ai.generateWithContext.mockResolvedValue('恢復後的生成文本');
      fireEvent.click(screen.getByText('重試'));

      await waitFor(() => {
        expect(screen.getByText('恢復後的生成文本')).toBeInTheDocument();
      });
    });
  });

  describe('性能和響應性', () => {
    it('應該在大量資料下保持響應', async () => {
      // 模擬大量專案
      const manyProjects = Array.from({ length: 100 }, (_, i) => 
        createMockProject({ id: `project-${i}`, name: `專案 ${i}` })
      );
      mockElectronAPI.projects.getAll.mockResolvedValue(manyProjects);

      renderWithProviders(<App />);

      // 驗證列表能夠載入
      await waitFor(() => {
        expect(screen.getByText('專案 0')).toBeInTheDocument();
      }, { timeout: 10000 });

      // 測試搜索功能
      const searchInput = screen.getByPlaceholderText('搜索專案...');
      fireEvent.change(searchInput, { target: { value: '專案 50' } });

      // 驗證搜索結果
      await waitFor(() => {
        expect(screen.getByText('專案 50')).toBeInTheDocument();
        expect(screen.queryByText('專案 0')).not.toBeInTheDocument();
      });
    });
  });
});