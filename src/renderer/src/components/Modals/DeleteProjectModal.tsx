import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { deleteProject } from '../../store/slices/projectsSlice';
import { closeModal, addNotification } from '../../store/slices/uiSlice';

const DeleteProjectModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentProject } = useAppSelector(state => state.projects);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleClose = () => {
    dispatch(closeModal('deleteProject'));
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    
    setIsSubmitting(true);

    try {
      await dispatch(deleteProject(currentProject.id)).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        title: '刪除成功',
        message: `專案「${currentProject.name}」已成功刪除`,
      }));
      
      handleClose();
    } catch (error) {
      console.error('刪除專案失敗:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: '刪除失敗',
        message: '刪除專案時發生錯誤，請稍後再試',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentProject) return null;

  const isConfirmValid = confirmText === currentProject.name;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-md">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700">
          <h2 className="text-xl font-cosmic text-red-500">永久刪除專案</h2>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 mb-6">
            <p className="text-gray-300 mb-4">
              您即將刪除專案「<span className="text-white font-medium">{currentProject.name}</span>」。此操作將永久刪除所有相關資料，包括章節和角色，且無法復原。
            </p>
            <p className="text-yellow-400">
              請輸入專案名稱「{currentProject.name}」以確認刪除。
            </p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`輸入「${currentProject.name}」確認刪除`}
              className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="text-sm text-gray-400">
            <p>刪除後將無法復原的資料：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>專案基本資訊和設定</li>
              <li>所有章節內容</li>
              <li>所有角色資料</li>
            </ul>
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
            onClick={handleDelete}
            disabled={!isConfirmValid || isSubmitting}
            className={`px-4 py-2 rounded-lg text-white ${
              isConfirmValid ? 'bg-red-500 hover:bg-red-600' : 'bg-red-500/50 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '刪除中...' : '永久刪除'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectModal;