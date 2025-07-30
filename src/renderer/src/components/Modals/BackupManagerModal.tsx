import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import api from '../../api';

const BackupManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleClose = () => {
    dispatch(closeModal('backupManager'));
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      setMessage({ type: 'info', text: '正在選擇備份位置...' });
      
      // 顯示儲存對話框
      const saveResult = await api.system.showSaveDialog({
        title: '選擇備份檔案位置',
        defaultPath: `創世紀元備份_${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: '資料庫檔案', extensions: ['db'] },
          { name: '所有檔案', extensions: ['*'] }
        ]
      });
      
      if (saveResult.canceled) {
        setMessage(null);
        return;
      }
      
      setMessage({ type: 'info', text: '正在建立備份...' });
      
      // 調用統一 API 進行備份
      await api.database.backup(saveResult.filePath || saveResult.file_path);
      
      setMessage({ type: 'success', text: `備份已成功建立至：${saveResult.filePath || saveResult.file_path}` });
    } catch (error: any) {
      console.error('備份失敗:', error);
      setMessage({ type: 'error', text: error.message || '備份建立失敗，請稍後再試' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      setMessage({ type: 'info', text: '正在選擇備份檔案...' });
      
      // 顯示開啟對話框
      const openResult = await api.system.showOpenDialog({
        title: '選擇要還原的備份檔案',
        filters: [
          { name: '資料庫檔案', extensions: ['db'] },
          { name: '所有檔案', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      const filePaths = openResult.filePaths || openResult.file_paths;
      if (openResult.canceled || !filePaths || filePaths.length === 0) {
        setMessage(null);
        return;
      }
      
      const backupPath = filePaths[0];
      setMessage({ type: 'info', text: '正在還原備份...' });
      
      // 調用統一 API 進行還原
      await api.database.restore(backupPath);
      
      setMessage({ type: 'success', text: '專案已成功從備份還原！頁面將在2秒後重新載入...' });
      
      // 重新載入以反映還原的資料
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('還原失敗:', error);
      setMessage({ type: 'error', text: error.message || '還原失敗，請稍後再試' });
    } finally {
      setIsRestoring(false);
    }
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
          {/* 訊息顯示區域 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
              message.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
              'bg-blue-500/10 border-blue-500 text-blue-400'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

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
                <button 
                  onClick={handleBackup}
                  disabled={isBackingUp || isRestoring}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      備份中...
                    </span>
                  ) : (
                    '立即備份'
                  )}
                </button>
              </div>
              <div className="card text-center p-4">
                <div className="text-3xl mb-2">📂</div>
                <h4 className="font-medium text-gold-400 mb-2">還原備份</h4>
                <p className="text-sm text-gray-400 mb-3">
                  從備份檔案還原專案
                </p>
                <button 
                  onClick={handleRestore}
                  disabled={isBackingUp || isRestoring}
                  className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      還原中...
                    </span>
                  ) : (
                    '選擇備份檔案'
                  )}
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