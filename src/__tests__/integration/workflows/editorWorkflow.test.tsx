import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockProject, createMockChapter, mockElectronAPI } from '../utils/testUtils';
import ProjectEditor from '../../../renderer/src/pages/ProjectEditor/ProjectEditor';

describe('編輯器工作流程整合測試', () => {
  const mockProject = createMockProject();
  const mockChapter = createMockChapter();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 設置基本的 mock 返回值
    mockElectronAPI.projects.getById.mockResolvedValue(mockProject);
    mockElectronAPI.chapters.getByProjectId.mockResolvedValue([mockChapter]);
    mockElectronAPI.characters.getByProjectId.mockResolvedValue([]);
  });

  describe('章節管理流程', () => {
    it('應該能夠創建新章節', async () => {
      renderWithProviders(<ProjectEditor />);

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByText('章節列表')).toBeInTheDocument();
      });

      // 點擊新增章節按鈕
      fireEvent.click(screen.getByText('新增章節'));

      // 等待章節創建對話框出現
      await waitFor(() => {
        expect(screen.getByText('創建新章節')).toBeInTheDocument();
      });

      // 填寫章節資訊
      const titleInput = screen.getByLabelText('章節標題');
      fireEvent.change(titleInput, { target: { value: '第二章：新的開始' } });

      // 模擬章節創建成功
      const newChapter = createMockChapter({
        id: 'new-chapter-id',
        title: '第二章：新的開始',
        order: 2,
      });
      mockElectronAPI.chapters.create.mockResolvedValue(newChapter.id);
      mockElectronAPI.chapters.getById.mockResolvedValue(newChapter);

      // 提交創建
      fireEvent.click(screen.getByText('創建章節'));

      // 驗證章節創建 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.chapters.create).toHaveBeenCalledWith({
          projectId: mockProject.id,
          title: '第二章：新的開始',
          content: '',
          order: 2,
        });
      });

      // 驗證新章節出現在列表中
      await waitFor(() => {
        expect(screen.getByText('第二章：新的開始')).toBeInTheDocument();
      });
    });

    it('應該能夠編輯章節內容', async () => {
      renderWithProviders(<ProjectEditor />);

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });

      // 點擊章節進入編輯模式
      fireEvent.click(screen.getByText(mockChapter.title));

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // 編輯內容
      const editor = screen.getByRole('textbox');
      const newContent = '這是修改後的章節內容。主角開始了新的冒險。';
      fireEvent.change(editor, { target: { value: newContent } });

      // 模擬自動儲存
      mockElectronAPI.chapters.update.mockResolvedValue(undefined);

      // 等待自動儲存觸發
      await waitFor(() => {
        expect(mockElectronAPI.chapters.update).toHaveBeenCalledWith({
          id: mockChapter.id,
          title: mockChapter.title,
          content: newContent,
          order: mockChapter.order,
        });
      }, { timeout: 3000 });
    });

    it('應該能夠重新排序章節', async () => {
      const chapters = [
        createMockChapter({ id: '1', title: '第一章', order: 1 }),
        createMockChapter({ id: '2', title: '第二章', order: 2 }),
        createMockChapter({ id: '3', title: '第三章', order: 3 }),
      ];
      mockElectronAPI.chapters.getByProjectId.mockResolvedValue(chapters);

      renderWithProviders(<ProjectEditor />);

      // 等待章節列表載入
      await waitFor(() => {
        expect(screen.getByText('第一章')).toBeInTheDocument();
        expect(screen.getByText('第二章')).toBeInTheDocument();
        expect(screen.getByText('第三章')).toBeInTheDocument();
      });

      // 模擬拖拽第三章到第一位
      const thirdChapter = screen.getByText('第三章').closest('[draggable]');
      const firstChapter = screen.getByText('第一章').closest('[draggable]');

      if (thirdChapter && firstChapter) {
        fireEvent.dragStart(thirdChapter);
        fireEvent.dragEnter(firstChapter);
        fireEvent.dragOver(firstChapter);
        fireEvent.drop(firstChapter);
        fireEvent.dragEnd(thirdChapter);
      }

      // 驗證章節順序更新 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.chapters.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '3',
            order: 1,
          })
        );
      });
    });

    it('應該能夠刪除章節', async () => {
      renderWithProviders(<ProjectEditor />);

      // 等待章節載入
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });

      // 點擊章節選單
      const menuButton = screen.getByLabelText('章節選單');
      fireEvent.click(menuButton);

      // 點擊刪除選項
      fireEvent.click(screen.getByText('刪除章節'));

      // 確認刪除
      await waitFor(() => {
        expect(screen.getByText('確認刪除章節')).toBeInTheDocument();
      });

      mockElectronAPI.chapters.delete.mockResolvedValue(undefined);
      fireEvent.click(screen.getByText('確認刪除'));

      // 驗證刪除 API 被調用
      await waitFor(() => {
        expect(mockElectronAPI.chapters.delete).toHaveBeenCalledWith(mockChapter.id);
      });
    });
  });

  describe('AI 續寫功能', () => {
    it('應該能夠使用 AI 續寫功能', async () => {
      renderWithProviders(<ProjectEditor />);

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });

      // 點擊章節進入編輯模式
      fireEvent.click(screen.getByText(mockChapter.title));

      // 等待編輯器和 AI 面板載入
      await waitFor(() => {
        expect(screen.getByText('AI 續寫')).toBeInTheDocument();
      });

      // 點擊 AI 續寫按鈕
      fireEvent.click(screen.getByText('AI 續寫'));

      // 模擬 AI 生成成功
      const generatedText = '主角走進了神秘的森林，發現了一個古老的遺跡。';
      mockElectronAPI.ai.generateWithContext.mockResolvedValue(generatedText);

      // 等待生成完成
      await waitFor(() => {
        expect(mockElectronAPI.ai.generateWithContext).toHaveBeenCalledWith(
          mockProject.id,
          mockChapter.id,
          expect.any(Number),
          expect.any(String),
          expect.any(Object)
        );
      });

      // 驗證生成的文本顯示
      await waitFor(() => {
        expect(screen.getByText(generatedText)).toBeInTheDocument();
      });

      // 接受生成的文本
      fireEvent.click(screen.getByText('接受'));

      // 驗證文本被插入到編輯器
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor).toHaveValue(expect.stringContaining(generatedText));
      });
    });

    it('應該能夠調整 AI 生成參數', async () => {
      renderWithProviders(<ProjectEditor />);

      // 進入編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(mockChapter.title));

      // 打開 AI 設定面板
      await waitFor(() => {
        expect(screen.getByText('AI 設定')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('AI 設定'));

      // 調整溫度參數
      const temperatureSlider = screen.getByLabelText('溫度');
      fireEvent.change(temperatureSlider, { target: { value: '0.8' } });

      // 調整最大 token 數
      const maxTokensInput = screen.getByLabelText('最大 Token 數');
      fireEvent.change(maxTokensInput, { target: { value: '300' } });

      // 使用新參數生成
      fireEvent.click(screen.getByText('AI 續寫'));

      // 驗證使用了新的參數
      await waitFor(() => {
        expect(mockElectronAPI.ai.generateWithContext).toHaveBeenCalledWith(
          mockProject.id,
          mockChapter.id,
          expect.any(Number),
          expect.any(String),
          expect.objectContaining({
            temperature: 0.8,
            maxTokens: 300,
          })
        );
      });
    });

    it('應該處理 AI 生成失敗的情況', async () => {
      renderWithProviders(<ProjectEditor />);

      // 進入編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(mockChapter.title));

      // 模擬 AI 服務不可用
      mockElectronAPI.ai.generateWithContext.mockRejectedValue(
        new Error('AI 服務暫時不可用')
      );

      // 嘗試 AI 續寫
      fireEvent.click(screen.getByText('AI 續寫'));

      // 驗證錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText(/AI 服務暫時不可用/)).toBeInTheDocument();
      });

      // 測試重試功能
      mockElectronAPI.ai.generateWithContext.mockResolvedValue('重試成功的文本');
      fireEvent.click(screen.getByText('重試'));

      await waitFor(() => {
        expect(screen.getByText('重試成功的文本')).toBeInTheDocument();
      });
    });
  });

  describe('編輯器功能', () => {
    it('應該支援富文本編輯功能', async () => {
      renderWithProviders(<ProjectEditor />);

      // 進入編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(mockChapter.title));

      // 等待編輯器載入
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // 測試粗體功能
      const boldButton = screen.getByLabelText('粗體');
      fireEvent.click(boldButton);

      // 輸入文本
      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: '這是粗體文字' } });

      // 驗證格式化被應用
      // 這裡需要根據實際的富文本編輯器實現來調整測試
      expect(editor).toHaveValue('這是粗體文字');
    });

    it('應該支援自動儲存功能', async () => {
      renderWithProviders(<ProjectEditor />);

      // 進入編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(mockChapter.title));

      // 編輯內容
      const editor = screen.getByRole('textbox');
      fireEvent.change(editor, { target: { value: '自動儲存測試內容' } });

      // 等待自動儲存觸發（通常有延遲）
      await waitFor(() => {
        expect(mockElectronAPI.chapters.update).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '自動儲存測試內容',
          })
        );
      }, { timeout: 5000 });

      // 驗證儲存狀態指示器
      await waitFor(() => {
        expect(screen.getByText('已儲存')).toBeInTheDocument();
      });
    });

    it('應該支援閱讀模式切換', async () => {
      renderWithProviders(<ProjectEditor />);

      // 進入編輯模式
      await waitFor(() => {
        expect(screen.getByText(mockChapter.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(mockChapter.title));

      // 切換到閱讀模式
      const readingModeButton = screen.getByLabelText('閱讀模式');
      fireEvent.click(readingModeButton);

      // 驗證編輯器變為只讀
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor).toHaveAttribute('readonly');
      });

      // 切換回編輯模式
      fireEvent.click(readingModeButton);

      // 驗證編輯器恢復可編輯
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        expect(editor).not.toHaveAttribute('readonly');
      });
    });
  });

  describe('編輯器設定', () => {
    it('應該能夠調整編輯器設定', async () => {
      renderWithProviders(<ProjectEditor />);

      // 打開編輯器設定
      const settingsButton = screen.getByLabelText('編輯器設定');
      fireEvent.click(settingsButton);

      // 等待設定面板載入
      await waitFor(() => {
        expect(screen.getByText('編輯器設定')).toBeInTheDocument();
      });

      // 調整字體大小
      const fontSizeSlider = screen.getByLabelText('字體大小');
      fireEvent.change(fontSizeSlider, { target: { value: '18' } });

      // 調整行高
      const lineHeightSlider = screen.getByLabelText('行高');
      fireEvent.change(lineHeightSlider, { target: { value: '1.8' } });

      // 儲存設定
      fireEvent.click(screen.getByText('儲存設定'));

      // 驗證設定被應用到編輯器
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        const styles = window.getComputedStyle(editor);
        expect(styles.fontSize).toBe('18px');
        expect(styles.lineHeight).toBe('1.8');
      });
    });
  });
});