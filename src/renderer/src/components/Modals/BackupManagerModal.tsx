import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const BackupManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('backupManager'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">💿 備份還原管理</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💾</div>
            <h3 className="text-xl font-cosmic text-gold-400 mb-4">備份還原功能</h3>
            <p className="text-gray-300 mb-6">
              管理您的專案備份，確保創作成果永不丟失。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
              <div className="card text-center p-4">
                <div className="text-3xl mb-2">📦</div>
                <h4 className="font-medium text-gold-400 mb-2">建立備份</h4>
                <p className="text-sm text-gray-400 mb-3">
                  備份當前所有專案資料
                </p>
                <button className="btn-primary w-full">
                  立即備份
                </button>
              </div>
              <div className="card text-center p-4">
                <div className="text-3xl mb-2">📂</div>
                <h4 className="font-medium text-gold-400 mb-2">還原備份</h4>
                <p className="text-sm text-gray-400 mb-3">
                  從備份檔案還原專案
                </p>
                <button className="btn-secondary w-full">
                  選擇備份檔案
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupManagerModal;