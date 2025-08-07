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

  const loadSettings = useCallback(async () => {
    try {
      const appSettings = await api.settings.getAll();
      if (appSettings.update) {
        setSettings({ ...settings, ...appSettings.update });
      }
      
      // 獲取上次檢查時間
      if (appSettings.lastUpdateCheck && typeof appSettings.lastUpdateCheck === 'number') {
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

  useEffect(() => {
    loadSettings();
    getCurrentVersion();
  }, [loadSettings]);

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
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">當前版本</h3>
            <p className="text-sm text-gray-300">Genesis Chronicle v{currentVersion}</p>
            {lastCheckTime && (
              <p className="text-xs text-gray-400 mt-1">
                上次檢查: {lastCheckTime}
              </p>
            )}
          </div>
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="bg-gold-600 hover:bg-gold-700 disabled:bg-gold-400 text-cosmic-950 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? '檢查中...' : '立即檢查'}</span>
          </button>
        </div>
      </div>

      {/* 自動更新設置 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gold-400 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-gold-400" />
          自動更新設置
        </h3>

        {/* 自動檢查更新 */}
        <div className="flex items-center justify-between p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg">
          <div className="flex items-center">
            <RefreshCw className="w-5 h-5 text-gold-500 mr-3" />
            <div>
              <h4 className="font-medium text-white">自動檢查更新</h4>
              <p className="text-sm text-gray-300">定期檢查是否有新版本可用</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCheck}
              onChange={(e) => handleSettingChange('autoCheck', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-cosmic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cosmic-900 after:border-cosmic-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
          </label>
        </div>

        {/* 檢查間隔 */}
        {settings.autoCheck && (
          <div className="flex items-center justify-between p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg">
            <div>
              <h4 className="font-medium text-white">檢查間隔</h4>
              <p className="text-sm text-gray-300">設置自動檢查更新的頻率</p>
            </div>
            <select
              value={settings.checkInterval}
              onChange={(e) => handleSettingChange('checkInterval', parseInt(e.target.value))}
              className="bg-cosmic-700 border border-cosmic-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
        <div className="flex items-center justify-between p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg opacity-60">
          <div className="flex items-center">
            <Download className="w-5 h-5 text-green-400 mr-3" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white">自動下載更新</h4>
                <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">開發中</span>
              </div>
              <p className="text-sm text-gray-300">發現更新時自動下載（仍需手動安裝）- 此功能正在開發中</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed">
            <input
              type="checkbox"
              checked={false}
              disabled={true}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-cosmic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cosmic-900 after:border-cosmic-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
          </label>
        </div>

        {/* 更新通知 */}
        <div className="flex items-center justify-between p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <h4 className="font-medium text-white">更新通知</h4>
              <p className="text-sm text-gray-300">發現更新時顯示通知</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifyOnUpdate}
              onChange={(e) => handleSettingChange('notifyOnUpdate', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-cosmic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cosmic-900 after:border-cosmic-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
          </label>
        </div>

        {/* 預發布版本 */}
        <div className="flex items-center justify-between p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg opacity-60">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-purple-400 mr-3" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white">預發布版本</h4>
                <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">開發中</span>
              </div>
              <p className="text-sm text-gray-300">接收 Beta 版本和預發布更新 - 此功能正在開發中</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-not-allowed">
            <input
              type="checkbox"
              checked={false}
              disabled={true}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-cosmic-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-cosmic-900 after:border-cosmic-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
          </label>
        </div>
      </div>

      {/* 更新說明 */}
      <div className="bg-cosmic-800 border border-gold-600/30 rounded-lg p-4">
        <h4 className="font-medium text-gold-400 mb-2">關於自動更新</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• 自動檢查更新功能已完全實現，可正常使用</li>
          <li>• 自動下載更新和預發布版本功能正在開發中</li>
          <li>• 更新通知功能已實現，可正常使用</li>
          <li>• 手動檢查更新功能正常，會模擬檢查過程</li>
          <li>• 建議定期備份您的創作內容</li>
        </ul>
      </div>
    </div>
  );
};

export default UpdateSettings;