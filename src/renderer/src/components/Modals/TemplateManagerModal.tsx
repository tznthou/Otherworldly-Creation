import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const TemplateManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('templateManager'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">🎭 輕小說模板</h2>
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
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-cosmic text-gold-400 mb-4">模板管理功能</h3>
            <p className="text-gray-300 mb-6">
              這裡將提供異世界、校園、科幻、奇幻等輕小說模板，幫助您快速開始創作。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {['異世界', '校園', '科幻', '奇幻'].map(genre => (
                <div key={genre} className="card text-center p-4">
                  <div className="text-2xl mb-2">📖</div>
                  <h4 className="font-medium text-gold-400">{genre}</h4>
                  <p className="text-sm text-gray-400 mt-1">即將推出</p>
                </div>
              ))}
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

export default TemplateManagerModal;