import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const UpdateManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('updateManager'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">🔄 檢查更新</h2>
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
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-cosmic text-gold-400 mb-4">版本更新</h3>
            <div className="card max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">當前版本</span>
                  <span className="text-gold-400 font-medium">v0.4.6</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">最新版本</span>
                  <span className="text-green-400 font-medium">v0.4.6</span>
                </div>
                <div className="pt-4 border-t border-cosmic-700">
                  <div className="flex items-center text-green-400 mb-2">
                    <span className="text-xl mr-2">✅</span>
                    您使用的是最新版本
                  </div>
                  <p className="text-sm text-gray-400">
                    您的創世紀元已是最新版本，所有功能都已更新至最佳狀態。
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <button className="btn-primary">
                檢查更新
              </button>
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

export default UpdateManagerModal;