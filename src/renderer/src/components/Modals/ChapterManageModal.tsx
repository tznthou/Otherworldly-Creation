import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { updateChapter, deleteChapter, Chapter } from '../../store/slices/chaptersSlice';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import ConfirmDialog from '../UI/ConfirmDialog';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ChapterManageModal');

interface ChapterManageModalProps {
  chapter: Chapter;
  allChapters: Chapter[];
  onReorder: (chapters: Chapter[]) => void;
}

const ChapterManageModal: React.FC<ChapterManageModalProps> = ({
  chapter,
  allChapters,
  onReorder,
}) => {
  const dispatch = useAppDispatch();
  
  const [chapterTitle, setChapterTitle] = useState(chapter.title);
  const [chapterOrder, setChapterOrder] = useState(chapter.order);
  const [chapterStatus, setChapterStatus] = useState<'draft' | 'in_progress' | 'review' | 'completed'>(() => {
    try {
      const metadata = chapter.metadata ? JSON.parse(chapter.metadata) : {};
      return metadata.status || 'draft';
    } catch {
      return 'draft';
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
  }>({});

  // 當章節變更時更新表單
  useEffect(() => {
    setChapterTitle(chapter.title);
    setChapterOrder(chapter.order);
    try {
      const metadata = chapter.metadata ? JSON.parse(chapter.metadata) : {};
      setChapterStatus(metadata.status || 'draft');
    } catch {
      setChapterStatus('draft');
    }
  }, [chapter]);

  const handleClose = () => {
    dispatch(closeModal('chapterManage'));
  };

  const validate = () => {
    const newErrors: { title?: string } = {};

    if (!chapterTitle.trim()) {
      newErrors.title = '請輸入章節標題';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await dispatch(updateChapter({
        ...chapter,
        title: chapterTitle,
        order: chapterOrder,
        metadata: JSON.stringify({
          ...(chapter.metadata ? JSON.parse(chapter.metadata) : {}),
          status: chapterStatus,
        }),
      })).unwrap();

      // 如果順序變更，重新排序所有章節
      if (chapterOrder !== chapter.order) {
        const updatedChapters = [...allChapters]
          .filter(c => c.id !== chapter.id)
          .sort((a, b) => a.order - b.order);
        
        // 在新位置插入章節
        updatedChapters.splice(chapterOrder - 1, 0, {
          ...chapter,
          order: chapterOrder,
        });
        
        // 更新所有章節的順序
        const reorderedChapters = updatedChapters.map((c, index) => ({
          ...c,
          order: index + 1,
        }));
        
        onReorder(reorderedChapters);
      }

      dispatch(addNotification({
        type: 'success',
        title: '更新成功',
        message: '章節已成功更新',
        duration: 3000,
      }));

      handleClose();
    } catch (error) {
      log.error('更新章節失敗:', error);
      setErrors({
        title: '更新章節失敗，請稍後再試',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      await dispatch(deleteChapter(chapter.id)).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        title: '刪除成功',
        message: `章節「${chapter.title}」已成功刪除`,
        duration: 3000,
      }));
      
      handleClose();
    } catch (error) {
      log.error('刪除章節失敗:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: '刪除失敗',
        message: '刪除章節時發生錯誤，請稍後再試',
      }));
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-md">
          {/* 標題 */}
          <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
            <h2 className="text-xl font-cosmic text-gold-500">管理章節</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* 內容 */}
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">章節標題</label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="輸入章節標題"
                className={`w-full bg-cosmic-800 border ${
                  errors.title ? 'border-red-500' : 'border-cosmic-700'
                } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 mb-2">章節順序</label>
              <div className="flex items-center">
                <button
                  onClick={() => setChapterOrder(Math.max(1, chapterOrder - 1))}
                  disabled={chapterOrder <= 1}
                  className="bg-cosmic-800 text-gray-300 px-3 py-2 rounded-l-lg hover:bg-cosmic-700 disabled:opacity-50"
                >
                  -
                </button>
                <input
                  type="number"
                  value={chapterOrder}
                  onChange={(e) => setChapterOrder(Math.max(1, Math.min(allChapters.length, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={allChapters.length}
                  className="w-16 bg-cosmic-800 border-y border-cosmic-700 px-3 py-2 text-white text-center focus:outline-none"
                />
                <button
                  onClick={() => setChapterOrder(Math.min(allChapters.length, chapterOrder + 1))}
                  disabled={chapterOrder >= allChapters.length}
                  className="bg-cosmic-800 text-gray-300 px-3 py-2 rounded-r-lg hover:bg-cosmic-700 disabled:opacity-50"
                >
                  +
                </button>
                <span className="ml-3 text-gray-400">
                  共 {allChapters.length} 章
                </span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">章節資訊</h3>
              <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">創建時間：</span>
                    <span className="text-white">
                      {new Date(chapter.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">最後更新：</span>
                    <span className="text-white">
                      {new Date(chapter.updatedAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">字數：</span>
                    <span className="text-white">
                      {chapter.wordCount || 0} 字
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">章節 ID：</span>
                    <span className="text-white">{chapter.id.substring(0, 8)}...</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-cosmic-700">
                  <h4 className="text-sm font-medium text-gold-400 mb-2">章節操作</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(chapter.title)}
                      className="bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs px-3 py-1 rounded-lg flex items-center"
                    >
                      <span className="mr-1">📋</span>
                      複製標題
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(chapter.content))}
                      className="bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs px-3 py-1 rounded-lg flex items-center"
                    >
                      <span className="mr-1">📋</span>
                      複製內容
                    </button>
                    <button
                      onClick={() => {
                        const date = new Date();
                        setChapterTitle(`${chapter.title} (複本 ${date.getMonth() + 1}/${date.getDate()})`);
                      }}
                      className="bg-cosmic-700 hover:bg-cosmic-600 text-white text-xs px-3 py-1 rounded-lg flex items-center"
                    >
                      <span className="mr-1">🔄</span>
                      標記為複本
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-red-400 mb-4">危險操作</h3>
              <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4">
                <p className="text-gray-300 mb-4">
                  刪除章節將永久移除所有內容。此操作無法復原。
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  刪除章節
                </button>
              </div>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="p-6 border-t border-cosmic-700 flex justify-end space-x-4">
            <button
              onClick={handleClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="確認刪除"
        message={`確定要刪除章節「${chapter.title}」嗎？此操作將永久刪除所有內容，且無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default ChapterManageModal;