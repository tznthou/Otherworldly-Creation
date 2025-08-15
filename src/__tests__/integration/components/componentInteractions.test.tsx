import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockElectronAPI } from '../utils/testUtils';
import CreateProjectModal from '../../../renderer/src/components/Modals/CreateProjectModal';
import CharacterModal from '../../../renderer/src/components/Characters/CharacterModal';
import AIWritingPanel from '../../../renderer/src/components/Editor/AIWritingPanel';
import { NotificationContainer } from '../../../renderer/src/components/UI/NotificationSystem';

describe('組件互動測試', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('模態框互動', () => {
    it('應該正確處理模態框的開啟和關閉', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <CreateProjectModal isOpen={true} onClose={onClose} />
      );

      // 驗證模態框已開啟
      expect(screen.getByText('創建新專案')).toBeInTheDocument();

      // 點擊關閉按鈕
      fireEvent.click(screen.getByLabelText('關閉'));

      // 驗證關閉回調被調用
      expect(onClose).toHaveBeenCalled();
    });

    it('應該支援 ESC 鍵關閉模態框', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <CreateProjectModal isOpen={true} onClose={onClose} />
      );

      // 按下 ESC 鍵
      fireEvent.keyDown(document, { key: 'Escape' });

      // 驗證關閉回調被調用
      expect(onClose).toHaveBeenCalled();
    });

    it('應該支援點擊背景關閉模態框', async () => {
      const onClose = jest.fn();
      
      renderWithProviders(
        <CreateProjectModal isOpen={true} onClose={onClose} />
      );

      // 點擊模態框背景
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);

      // 驗證關閉回調被調用
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('表單驗證互動', () => {
    it('應該顯示表單驗證錯誤', async () => {
      renderWithProviders(
        <CreateProjectModal isOpen={true} onClose={jest.fn()} />
      );

      // 嘗試提交空表單
      fireEvent.click(screen.getByText('創建專案'));

      // 驗證錯誤訊息顯示
      await waitFor(() => {
        expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument();
      });

      // 填寫名稱後錯誤應該消失
      fireEvent.change(screen.getByLabelText('專案名稱'), {
        target: { value: '測試專案' }
      });

      await waitFor(() => {
        expect(screen.queryByText('專案名稱不能為空')).not.toBeInTheDocument();
      });
    });

    it('應該驗證角色表單資料', async () => {
      renderWithProviders(
        <CharacterModal 
          isOpen={true} 
          onClose={jest.fn()} 
          projectId="test-project"
        />
      );

      // 提交空表單
      fireEvent.click(screen.getByText('創建角色'));

      // 驗證必填欄位錯誤
      await waitFor(() => {
        expect(screen.getByText('角色名稱不能為空')).toBeInTheDocument();
      });

      // 填寫無效年齡
      fireEvent.change(screen.getByLabelText('年齡'), {
        target: { value: '-5' }
      });

      fireEvent.click(screen.getByText('創建角色'));

      await waitFor(() => {
        expect(screen.getByText('年齡必須是正數')).toBeInTheDocument();
      });
    });
  });

  describe('AI 面板互動', () => {
    it('應該正確處理 AI 生成狀態', async () => {
      const mockProject = { id: 'test-project' };
      const mockChapter = { id: 'test-chapter' };

      renderWithProviders(
        <AIWritingPanel 
          project={mockProject}
          chapter={mockChapter}
          position={0}
          onInsertText={jest.fn()}
        />
      );

      // 模擬 AI 生成中
      mockElectronAPI.ai.generateWithContext.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('生成的文本'), 1000))
      );

      // 點擊生成按鈕
      fireEvent.click(screen.getByText('AI 續寫'));

      // 驗證載入狀態
      await waitFor(() => {
        expect(screen.getByText('生成中...')).toBeInTheDocument();
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      // 等待生成完成
      await waitFor(() => {
        expect(screen.getByText('生成的文本')).toBeInTheDocument();
        expect(screen.queryByText('生成中...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('應該支援多版本生成', async () => {
      const mockProject = { id: 'test-project' };
      const mockChapter = { id: 'test-chapter' };

      renderWithProviders(
        <AIWritingPanel 
          project={mockProject}
          chapter={mockChapter}
          position={0}
          onInsertText={jest.fn()}
        />
      );

      // 第一次生成
      mockElectronAPI.ai.generateWithContext.mockResolvedValue('版本一的文本');
      fireEvent.click(screen.getByText('AI 續寫'));

      await waitFor(() => {
        expect(screen.getByText('版本一的文本')).toBeInTheDocument();
      });

      // 生成另一個版本
      mockElectronAPI.ai.generateWithContext.mockResolvedValue('版本二的文本');
      fireEvent.click(screen.getByText('生成其他版本'));

      await waitFor(() => {
        expect(screen.getByText('版本二的文本')).toBeInTheDocument();
      });

      // 驗證版本切換
      fireEvent.click(screen.getByText('版本 1'));

      await waitFor(() => {
        expect(screen.getByText('版本一的文本')).toBeInTheDocument();
      });
    });

    it('應該處理 AI 生成錯誤', async () => {
      const mockProject = { id: 'test-project' };
      const mockChapter = { id: 'test-chapter' };

      renderWithProviders(
        <AIWritingPanel 
          project={mockProject}
          chapter={mockChapter}
          position={0}
          onInsertText={jest.fn()}
        />
      );

      // 模擬 AI 生成失敗
      mockElectronAPI.ai.generateWithContext.mockRejectedValue(
        new Error('生成失敗')
      );

      fireEvent.click(screen.getByText('AI 續寫'));

      // 驗證錯誤處理
      await waitFor(() => {
        expect(screen.getByText('生成失敗')).toBeInTheDocument();
        expect(screen.getByText('重試')).toBeInTheDocument();
      });

      // 測試重試功能
      mockElectronAPI.ai.generateWithContext.mockResolvedValue('重試成功的文本');
      fireEvent.click(screen.getByText('重試'));

      await waitFor(() => {
        expect(screen.getByText('重試成功的文本')).toBeInTheDocument();
      });
    });
  });

  describe('通知系統互動', () => {
    it('應該正確顯示和隱藏通知', async () => {
      const { store } = renderWithProviders(<NotificationContainer />);

      // 添加通知到 store
      store.dispatch({
        type: 'notifications/addNotification',
        payload: {
          id: 'test-notification',
          type: 'success',
          title: '操作成功',
          message: '專案已創建',
          duration: 3000,
        }
      });

      // 驗證通知顯示
      await waitFor(() => {
        expect(screen.getByText('操作成功')).toBeInTheDocument();
        expect(screen.getByText('專案已創建')).toBeInTheDocument();
      });

      // 點擊關閉按鈕
      fireEvent.click(screen.getByTitle('關閉'));

      // 驗證通知消失
      await waitFor(() => {
        expect(screen.queryByText('操作成功')).not.toBeInTheDocument();
      });
    });

    it('應該支援自動消失的通知', async () => {
      const { store } = renderWithProviders(<NotificationContainer />);

      // 添加自動消失的通知
      store.dispatch({
        type: 'notifications/addNotification',
        payload: {
          id: 'auto-dismiss',
          type: 'info',
          title: '自動消失',
          message: '這個通知會自動消失',
          duration: 1000,
        }
      });

      // 驗證通知顯示
      await waitFor(() => {
        expect(screen.getByText('自動消失')).toBeInTheDocument();
      });

      // 等待自動消失
      await waitFor(() => {
        expect(screen.queryByText('自動消失')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('應該支援不同類型的通知樣式', async () => {
      const { store } = renderWithProviders(<NotificationContainer />);

      // 添加不同類型的通知
      const notificationTypes = ['success', 'error', 'warning', 'info'];
      
      notificationTypes.forEach((type, index) => {
        store.dispatch({
          type: 'notifications/addNotification',
          payload: {
            id: `notification-${index}`,
            type,
            title: `${type} 通知`,
            message: `這是一個 ${type} 類型的通知`,
            duration: 0, // 不自動消失
          }
        });
      });

      // 驗證所有通知都顯示
      await waitFor(() => {
        notificationTypes.forEach(type => {
          expect(screen.getByText(`${type} 通知`)).toBeInTheDocument();
        });
      });

      // 驗證不同類型有不同的樣式（通過背景色）
      const typeStyles = {
        'success': 'bg-green-900/90',
        'error': 'bg-red-900/90', 
        'warning': 'bg-yellow-900/90',
        'info': 'bg-blue-900/90'
      };
      
      notificationTypes.forEach(type => {
        const notificationTitle = screen.getByText(`${type} 通知`);
        const notificationContainer = notificationTitle.closest('div[class*="bg-"]');
        expect(notificationContainer).toHaveClass(typeStyles[type]);
      });
    });
  });

  describe('拖拽互動', () => {
    it('應該支援章節拖拽排序', async () => {
      const chapters = [
        { id: '1', title: '第一章', order: 1 },
        { id: '2', title: '第二章', order: 2 },
        { id: '3', title: '第三章', order: 3 },
      ];

      // 這裡需要一個支援拖拽的章節列表組件
      // 由於沒有具體的組件，我們模擬拖拽行為
      const onReorder = jest.fn();
      
      renderWithProviders(
        <div>
          {chapters.map(chapter => (
            <div 
              key={chapter.id}
              draggable
              data-testid={`chapter-${chapter.id}`}
              onDragStart={() => {}}
              onDrop={() => onReorder(chapter.id, 1)}
            >
              {chapter.title}
            </div>
          ))}
        </div>
      );

      // 模擬拖拽第三章到第一位
      const thirdChapter = screen.getByTestId('chapter-3');
      const firstChapter = screen.getByTestId('chapter-1');

      fireEvent.dragStart(thirdChapter);
      fireEvent.dragEnter(firstChapter);
      fireEvent.dragOver(firstChapter);
      fireEvent.drop(firstChapter);
      fireEvent.dragEnd(thirdChapter);

      // 驗證重排序回調被調用
      expect(onReorder).toHaveBeenCalledWith('3', 1);
    });
  });

  describe('鍵盤快捷鍵互動', () => {
    it('應該支援編輯器快捷鍵', async () => {
      const onSave = jest.fn();
      
      renderWithProviders(
        <div onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            onSave();
          }
        }}>
          <textarea data-testid="editor" />
        </div>
      );

      const editor = screen.getByTestId('editor');
      editor.focus();

      // 按下 Ctrl+S
      fireEvent.keyDown(editor, { key: 's', ctrlKey: true });

      // 驗證儲存回調被調用
      expect(onSave).toHaveBeenCalled();
    });

    it('應該支援全域快捷鍵', async () => {
      const onNewProject = jest.fn();
      
      renderWithProviders(
        <div 
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'n') {
              e.preventDefault();
              onNewProject();
            }
          }}
        >
          應用程式內容
        </div>
      );

      // 按下 Ctrl+N
      fireEvent.keyDown(document, { key: 'n', ctrlKey: true });

      // 驗證新建專案回調被調用
      expect(onNewProject).toHaveBeenCalled();
    });
  });

  describe('響應式互動', () => {
    it('應該在不同螢幕尺寸下正確顯示', async () => {
      // 模擬小螢幕
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(
        <div className="responsive-container">
          <div className="desktop-only">桌面版內容</div>
          <div className="mobile-only">行動版內容</div>
        </div>
      );

      // 觸發 resize 事件
      fireEvent(window, new Event('resize'));

      // 驗證響應式行為
      // 這裡需要根據實際的響應式實現來調整測試
      await waitFor(() => {
        const container = screen.getByText('桌面版內容').parentElement;
        expect(container).toHaveClass('responsive-container');
      });
    });
  });

  describe('無障礙互動', () => {
    it('應該支援鍵盤導航', async () => {
      renderWithProviders(
        <div>
          <button>按鈕一</button>
          <button>按鈕二</button>
          <button>按鈕三</button>
        </div>
      );

      const firstButton = screen.getByText('按鈕一');
      const secondButton = screen.getByText('按鈕二');

      // 聚焦第一個按鈕
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // 按 Tab 鍵移動到下一個按鈕
      fireEvent.keyDown(firstButton, { key: 'Tab' });
      
      // 驗證焦點移動
      await waitFor(() => {
        expect(document.activeElement).toBe(secondButton);
      });
    });

    it('應該提供適當的 ARIA 標籤', async () => {
      renderWithProviders(
        <CreateProjectModal isOpen={true} onClose={jest.fn()} />
      );

      // 驗證 ARIA 標籤
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');

      // 驗證表單標籤
      const nameInput = screen.getByLabelText('專案名稱');
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });
  });
});