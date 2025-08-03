import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Settings, Bell, Download, Shield } from 'lucide-react';
import api from '../../api';

interface UpdateSettings {
  autoCheck: boolean;
  autoDownload: boolean;
  checkInterval: number; // 小時
  notifyOnUpdate: boolean;
  allowPrerelease: boolean;
}

const UpdateSettings: React.FC = () => {
  const [settings, setSettings] = useState<UpdateSettings>({
    autoCheck: true,
    autoDownload: false,
    checkInterval: 24,
    notifyOnUpdate: true,
    allowPrerelease: false,
  });
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadSettings();
    getCurrentVersion();
  }, [loadSettings]);

  const loadSettings = useCallback(async () => {
    try {
      const appSettings = await api.settings.getAll();
      if (appSettings.update) {
        setSettings({ ...settings, ...appSettings.update });
      }
      
      // 獲取上次檢查時間
      if (appSettings.lastUpdateCheck) {
        setLastCheckTime(new Date(appSettings.lastUpdateCheck).toLocaleString('zh-TW'));
      }
    } catch (error) {
      console.error('載入更新設置失敗:', error);
    }
  }, [settings]);

  const getCurrentVersion = async () => {
    try {
      const version = await api.system.getAppVersion();
      setCurrentVersion(version);
    } catch (error) {
      console.error('獲取版本失敗:', error);
    }
  };

  const saveSettings = async (newSettings: UpdateSettings) => {
    try {
      // 保存更新設定
      await api.settings.set('update', newSettings);
      await api.settings.set('lastUpdateCheck', Date.now());
      
      setSettings(newSettings);
      setLastCheckTime(new Date().toLocaleString('zh-TW'));
    } catch (error) {
      console.error('保存更新設置失敗:', error);
    }
  };

  const handleSettingChange = (key: keyof UpdateSettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await api.updates.checkForUpdates();
      setLastCheckTime(new Date().toLocaleString('zh-TW'));
    } catch (error) {
      console.error('手動檢查更新失敗:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const intervalOptions = [
    { value: 1, label: '每小時' },
    { value: 6, label: '每6小時' },
    { value: 12, label: '每12小時' },
    { value: 24, label: '每天' },
    { value: 168, label: '每週' },
    { value: 720, label: '每月' },
  ];

  return (
    <div className="space-y-6">
      {/* 當前版本信息 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">當前版本</h3>
            <p className="text-sm text-gray-600">Genesis Chronicle v{currentVersion}</p>
            {lastCheckTime && (
              <p className="text-xs text-gray-500 mt-1">
                上次檢查: {lastCheckTime}
              </p>
            )}
          </div>
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? '檢查中...' : '立即檢查'}</span>
          </button>
        </div>
      </div>

      {/* 自動更新設置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          自動更新設置
        </h3>

        {/* 自動檢查更新 */}
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <RefreshCw className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">自動檢查更新</h4>
              <p className="text-sm text-gray-600">定期檢查是否有新版本可用</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCheck}
              onChange={(e) => handleSettingChange('autoCheck', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 檢查間隔 */}
        {settings.autoCheck && (
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">檢查間隔</h4>
              <p className="text-sm text-gray-600">設置自動檢查更新的頻率</p>
            </div>
            <select
              value={settings.checkInterval}
              onChange={(e) => handleSettingChange('checkInterval', parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {intervalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 自動下載更新 */}
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <Download className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">自動下載更新</h4>
              <p className="text-sm text-gray-600">發現更新時自動下載（仍需手動安裝）</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoDownload}
              onChange={(e) => handleSettingChange('autoDownload', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 更新通知 */}
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">更新通知</h4>
              <p className="text-sm text-gray-600">發現更新時顯示通知</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifyOnUpdate}
              onChange={(e) => handleSettingChange('notifyOnUpdate', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* 預發布版本 */}
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-purple-500 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">預發布版本</h4>
              <p className="text-sm text-gray-600">接收 Beta 版本和預發布更新</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowPrerelease}
              onChange={(e) => handleSettingChange('allowPrerelease', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* 更新說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">關於自動更新</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 自動更新功能會在背景檢查新版本</li>
          <li>• 即使啟用自動下載，仍需要您的確認才會安裝</li>
          <li>• 安裝更新時應用程式會重新啟動</li>
          <li>• 建議定期備份您的創作內容</li>
        </ul>
      </div>
    </div>
  );
};

export default UpdateSettings;