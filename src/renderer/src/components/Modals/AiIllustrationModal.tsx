import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { VisualCreationCenter } from '../AI/VisualCreation';

const AiIllustrationModal: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleClose = () => {
    console.log('🚪 [AiIllustrationModal] 用戶主動關閉模態框');
    dispatch(closeModal('aiIllustration'));
  };

  // 調試：確認組件渲染（僅在組件首次渲染時）
  React.useEffect(() => {
    console.log('🎨 [AiIllustrationModal] 組件已掛載');
    return () => {
      console.log('🎨 [AiIllustrationModal] 組件即將卸載');
      console.warn('⚠️ 如果這不是用戶主動關閉，可能存在意外的模態框關閉');
    };
  }, []);

  // 錯誤邊界處理
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 [AiIllustrationModal] 捕獲錯誤:', event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-red-900 border border-red-700 rounded-xl p-8 max-w-md">
          <h2 className="text-red-300 text-xl mb-4">AI插畫模態框載入錯誤</h2>
          <p className="text-red-400 mb-4">視覺創作中心組件載入失敗，請檢查控制台錯誤訊息。</p>
          <button 
            onClick={handleClose}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            關閉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      {/* 大幅增加模態框尺寸 - 更寬敞的設計 */}
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-[calc(100vw-80px)] h-[calc(100vh-80px)] max-w-none overflow-hidden m-10">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700 bg-cosmic-900/95">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🎨</div>
            <div>
              <h2 className="text-2xl font-cosmic text-gold-500">幻想具現</h2>
              <p className="text-base text-cosmic-400">視覺創作中心 v2.0 - 寬敞版</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors hover:bg-cosmic-800 rounded-lg w-10 h-10 flex items-center justify-center"
            title="關閉 (Esc)"
          >
            ✕
          </button>
        </div>

        {/* 統一視覺創作中心 - 更大的內容區域 */}
        <div className="h-[calc(100vh-160px)]">
          <React.Suspense 
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-cosmic-400 text-lg">載入視覺創作中心...</div>
              </div>
            }
          >
            <VisualCreationCenter className="h-full" />
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};

export default AiIllustrationModal;