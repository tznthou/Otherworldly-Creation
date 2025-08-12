import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import LazyBatchIllustrationPanel from '../AI/LazyBatchIllustrationPanel';

const AiIllustrationModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('aiIllustration'));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-[calc(100vw-320px)] max-w-5xl max-h-[90vh] overflow-y-auto ml-64 mr-4 my-4">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">🎨 幻想具現 - AI 插畫生成系統</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          <LazyBatchIllustrationPanel />
        </div>
      </div>
    </div>
  );
};

export default AiIllustrationModal;