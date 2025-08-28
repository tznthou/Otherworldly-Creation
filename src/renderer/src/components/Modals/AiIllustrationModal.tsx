import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { VisualCreationCenter } from '../AI/VisualCreation';

const AiIllustrationModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('aiIllustration'));
  };

  // 調試：確認組件渲染
  console.log('🎨 [AiIllustrationModal] 組件正在渲染');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-[calc(100vw-320px)] max-w-6xl max-h-[95vh] overflow-hidden ml-64 mr-4 my-4">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-4 border-b border-cosmic-700 bg-cosmic-900/95">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎨</div>
            <div>
              <h2 className="text-xl font-cosmic text-gold-500">幻想具現</h2>
              <p className="text-sm text-cosmic-400">視覺創作中心 v2.0</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl transition-colors hover:bg-cosmic-800 rounded-lg w-8 h-8 flex items-center justify-center"
            title="關閉 (Esc)"
          >
            ✕
          </button>
        </div>

        {/* 新的統一視覺創作中心 */}
        <div className="h-[calc(95vh-80px)]">
          <VisualCreationCenter className="h-full" />
        </div>
      </div>
    </div>
  );
};

export default AiIllustrationModal;