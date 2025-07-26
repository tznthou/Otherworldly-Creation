import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { createChapter } from '../../store/slices/chaptersSlice';
import { closeModal, addNotification } from '../../store/slices/uiSlice';

interface CreateChapterModalProps {
  projectId: string;
  chaptersCount: number;
}

const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  projectId,
  chaptersCount,
}) => {
  const dispatch = useAppDispatch();
  
  const [chapterTitle, setChapterTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
  }>({});

  const handleClose = () => {
    dispatch(closeModal('createChapter'));
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
      await dispatch(createChapter({
        projectId,
        title: chapterTitle,
        order: chaptersCount + 1,
      })).unwrap();

      dispatch(addNotification({
        type: 'success',
        title: '創建成功',
        message: `章節「${chapterTitle}」已成功創建`,
        duration: 3000,
      }));

      handleClose();
    } catch (error) {
      console.error('創建章節失敗:', error);
      setErrors({
        title: '創建章節失敗，請稍後再試',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-md">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">創建新章節</h2>
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
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">章節順序</label>
            <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
              <p className="text-gray-300">
                此章節將被添加為第 {chaptersCount + 1} 章。
                <br />
                創建後可以在章節管理中調整順序。
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">快速模板</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChapterTitle(`第${chaptersCount + 1}章`)}
                className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-3 text-left hover:bg-cosmic-700"
              >
                <div className="font-medium text-gold-400">第N章</div>
                <div className="text-xs text-gray-400 mt-1">簡單章節編號</div>
              </button>
              
              <button
                type="button"
                onClick={() => setChapterTitle(`第${chaptersCount + 1}章：`)}
                className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-3 text-left hover:bg-cosmic-700"
              >
                <div className="font-medium text-gold-400">第N章：標題</div>
                <div className="text-xs text-gray-400 mt-1">帶冒號的章節格式</div>
              </button>
              
              <button
                type="button"
                onClick={() => setChapterTitle('序章')}
                className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-3 text-left hover:bg-cosmic-700"
              >
                <div className="font-medium text-gold-400">序章</div>
                <div className="text-xs text-gray-400 mt-1">故事的開始</div>
              </button>
              
              <button
                type="button"
                onClick={() => setChapterTitle('尾聲')}
                className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-3 text-left hover:bg-cosmic-700"
              >
                <div className="font-medium text-gold-400">尾聲</div>
                <div className="text-xs text-gray-400 mt-1">故事的結束</div>
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
            {isSubmitting ? '創建中...' : '創建章節'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateChapterModal;