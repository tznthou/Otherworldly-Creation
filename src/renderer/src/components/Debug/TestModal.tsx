import React from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const TestModal: React.FC = () => {
  const dispatch = useAppDispatch();

  // 添加調試日誌
  console.log('TestModal: 組件正在渲染');

  const handleClose = () => {
    console.log('TestModal: 關閉按鈕被點擊');
    dispatch(closeModal('testModal'));
  };

  // 添加 useEffect 來確認組件掛載
  React.useEffect(() => {
    console.log('TestModal: 組件已掛載');
    return () => {
      console.log('TestModal: 組件即將卸載');
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
          <h2 className="text-xl font-cosmic text-gold-500 mb-4">🎉 測試模態框成功！</h2>
          <p className="text-gray-300 mb-4">
            恭喜！模態框系統正常工作。這證明 Redux 狀態管理和組件渲染都沒有問題。
          </p>
          <p className="text-sm text-gold-400 mb-4">
            檢查控制台可以看到組件的生命週期日誌。
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gold-600 text-white rounded hover:bg-gold-700 transition-colors"
          >
            關閉測試模態框
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestModal;