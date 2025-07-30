import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import api from '../../api';
import { isTauri } from '../../api';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  changelog: string[];
  mandatory: boolean;
  size: number;
  checksum: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: UpdateInfo;
  error?: string;
}

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

const UpdateManager: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgress | null>(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 在 Tauri 環境中，更新功能暫不支援
    if (isTauri()) {
      console.log('Tauri 環境中更新功能暫不支援');
      return;
    }

    // Electron 環境的更新事件監聽
    if (window.electronAPI?.update) {
      // 監聽更新事件
      window.electronAPI.update.onUpdateAvailable((updateInfo: UpdateCheckResult) => {
        setUpdateResult(updateInfo);
        setIsVisible(true);
      });

      window.electronAPI.update.onDownloadProgress((progress: UpdateProgress) => {
        setDownloadProgress(progress);
      });

      window.electronAPI.update.onPendingInstall((updatePath: string) => {
        setDownloadedFilePath(updatePath);
        setIsVisible(true);
      });

      // 檢查待安裝的更新
      checkPendingUpdate();

      return () => {
        window.electronAPI.update.removeAllListeners();
      };
    }
  }, []);

  const checkPendingUpdate = async () => {
    // Tauri 版本暫不支援檢查待安裝更新
    if (isTauri()) {
      return;
    }
    
    try {
      const pendingPath = await window.electronAPI?.update?.checkPendingUpdate?.();
      if (pendingPath) {
        setDownloadedFilePath(pendingPath);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('檢查待安裝更新失敗:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const result = await api.updates.checkForUpdates();
      setUpdateResult(result);
      
      if (result.hasUpdate) {
        setIsVisible(true);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '檢查更新失敗');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateResult?.updateInfo) return;

    setIsDownloading(true);
    setError(null);

    try {
      await api.updates.downloadUpdate();
      const filePath = 'update-downloaded'; // TODO: 實現正確的文件路徑返回
      setDownloadedFilePath(filePath);
      setDownloadProgress(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : '下載更新失敗');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!downloadedFilePath) return;

    try {
      await api.updates.installUpdate();
      // 安裝後應用程式會重新啟動，所以這裡不會執行到
    } catch (error) {
      setError(error instanceof Error ? error.message : '安裝更新失敗');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setUpdateResult(null);
    setDownloadedFilePath(null);
    setDownloadProgress(null);
    setError(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? '檢查中...' : '檢查更新'}</span>
        </button>
        
        {error && (
          <div className="mt-2 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {downloadedFilePath ? '安裝更新' : '應用程式更新'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-4">
          {downloadedFilePath ? (
            // 安裝更新界面
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                更新已下載完成
              </h4>
              <p className="text-gray-600 mb-6">
                點擊「立即安裝」來安裝更新。應用程式將會重新啟動。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleInstallUpdate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  立即安裝
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  稍後安裝
                </button>
              </div>
            </div>
          ) : updateResult?.hasUpdate ? (
            // 更新可用界面
            <div>
              <div className="flex items-center mb-4">
                <AlertCircle className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    發現新版本 {updateResult.latestVersion}
                  </h4>
                  <p className="text-sm text-gray-600">
                    當前版本: {updateResult.currentVersion}
                  </p>
                </div>
              </div>

              {updateResult.updateInfo && (
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    發布日期: {new Date(updateResult.updateInfo.releaseDate).toLocaleDateString('zh-TW')}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    大小: {formatBytes(updateResult.updateInfo.size)}
                  </div>
                  
                  {updateResult.updateInfo.changelog.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">更新內容:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {updateResult.updateInfo.changelog.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {isDownloading && downloadProgress && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>下載進度</span>
                    <span>{downloadProgress.percent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                    </span>
                    <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleDownloadUpdate}
                  disabled={isDownloading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? '下載中...' : '下載更新'}</span>
                </button>
                <button
                  onClick={handleClose}
                  disabled={isDownloading}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  稍後提醒
                </button>
              </div>
            </div>
          ) : (
            // 無更新界面
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                已是最新版本
              </h4>
              <p className="text-gray-600 mb-4">
                當前版本 {updateResult?.currentVersion} 已是最新版本
              </p>
              <button
                onClick={handleClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                關閉
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateManager;