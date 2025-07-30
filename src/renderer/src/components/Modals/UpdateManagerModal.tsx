import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { api } from '../../api';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
}

const UpdateManagerModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    currentVersion: '0.4.12'
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkCurrentVersion();
  }, []);

  const checkCurrentVersion = async () => {
    try {
      const version = await api.system.getAppVersion();
      setUpdateInfo(prev => ({
        ...prev,
        currentVersion: version,
        latestVersion: version
      }));
    } catch (error) {
      console.error('獲取當前版本失敗:', error);
    }
  };

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      const result = await api.updates.checkForUpdates();
      
      setUpdateInfo({
        hasUpdate: result.hasUpdate,
        currentVersion: result.currentVersion,
        latestVersion: result.latestVersion,
        error: result.error
      });
      
      if (result.error) {
        dispatch(addNotification({
          type: 'warning',
          title: '檢查更新時出現問題',
          message: result.error,
          duration: 5000
        }));
      } else if (result.hasUpdate) {
        dispatch(addNotification({
          type: 'info',
          title: '發現新版本',
          message: `新版本 v${result.latestVersion} 可用`,
          duration: 4000
        }));
      } else {
        dispatch(addNotification({
          type: 'success',
          title: '檢查完成',
          message: '您使用的是最新版本',
          duration: 3000
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '檢查更新失敗';
      setUpdateInfo(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      dispatch(addNotification({
        type: 'error',
        title: '檢查失敗',
        message: errorMessage,
        duration: 5000
      }));
    } finally {
      setIsChecking(false);
    }
  };

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
                  <span className="text-gold-400 font-medium">v{updateInfo.currentVersion}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">最新版本</span>
                  <span className={`font-medium ${
                    updateInfo.hasUpdate ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    v{updateInfo.latestVersion || updateInfo.currentVersion}
                  </span>
                </div>
                <div className="pt-4 border-t border-cosmic-700">
                  {updateInfo.error ? (
                    <div className="flex items-center text-red-400 mb-2">
                      <span className="text-xl mr-2">❌</span>
                      {updateInfo.error}
                    </div>
                  ) : updateInfo.hasUpdate ? (
                    <div className="flex items-center text-blue-400 mb-2">
                      <span className="text-xl mr-2">🔔</span>
                      發現新版本可用
                    </div>
                  ) : (
                    <div className="flex items-center text-green-400 mb-2">
                      <span className="text-xl mr-2">✅</span>
                      您使用的是最新版本
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    {updateInfo.error
                      ? '檢查更新時發生錯誤，請檢查網路連接後重試。'
                      : updateInfo.hasUpdate
                      ? '新版本包含功能改進和錯誤修復，建議及時更新。'
                      : '您的創世紀元已是最新版本，所有功能都已更新至最佳狀態。'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 space-x-4">
              <button 
                onClick={handleCheckUpdates}
                disabled={isChecking || isDownloading}
                className="btn-primary"
              >
                {isChecking ? '檢查中...' : '檢查更新'}
              </button>
              {updateInfo.hasUpdate && (
                <button 
                  onClick={() => {}}
                  disabled={isDownloading}
                  className="btn-secondary"
                >
                  {isDownloading ? '下載中...' : '立即更新'}
                </button>
              )}
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