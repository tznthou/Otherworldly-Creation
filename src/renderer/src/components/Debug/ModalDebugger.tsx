import React from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';

const ModalDebugger: React.FC = () => {
  const { modals } = useAppSelector(state => state.ui);
  const dispatch = useAppDispatch();

  // 記錄當前狀態到控制台
  React.useEffect(() => {
    console.log('ModalDebugger: 模態框狀態更新:', modals);
  }, [modals]);

  const testRedux = () => {
    console.log('ModalDebugger: 測試 Redux dispatch');
    dispatch(openModal('testModal'));
  };

  return (
    <div className="fixed top-4 right-4 bg-cosmic-900 border border-cosmic-700 rounded-lg p-4 max-w-xs z-50">
      <h3 className="text-sm font-bold text-gold-400 mb-2">模態框狀態調試</h3>
      <button 
        onClick={testRedux}
        className="mb-2 px-2 py-1 bg-gold-600 text-white text-xs rounded"
      >
        測試 Redux
      </button>
      <div className="space-y-1 text-xs">
        {Object.entries(modals).map(([key, value]) => (
          <div key={key} className={`flex justify-between ${value ? 'text-green-400' : 'text-gray-500'}`}>
            <span>{key}:</span>
            <span>{value ? '開啟' : '關閉'}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-cosmic-700 text-xs text-gray-400">
        更新時間: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ModalDebugger;