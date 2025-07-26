import React, { useState } from 'react';
import { updateBackupSettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';
import BackupManager from '../../../components/Backup/BackupManager';
import AutoBackupIndicator from '../../../components/UI/AutoBackupIndicator';

const BackupSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => {
  const [showBackupManager, setShowBackupManager] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-cosmic text-gold-500">備份設定</h2>
        <button
          onClick={() => setShowBackupManager(true)}
          className="btn-primary text-sm"
        >
          備份管理
        </button>
      </div>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">自動備份</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoBackup"
              checked={settings.backup.autoBackup}
              onChange={(e) => dispatch(updateBackupSettings({ autoBackup: e.target.checked }))}
              className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
            />
            <label htmlFor="autoBackup" className="text-gray-300">啟用自動備份</label>
          </div>
          
          {settings.backup.autoBackup && (
            <>
              <div>
                <label className="block text-gray-300 mb-2">備份間隔 (小時)</label>
                <input
                  type="number"
                  value={settings.backup.backupInterval}
                  onChange={(e) => dispatch(updateBackupSettings({ backupInterval: parseInt(e.target.value) }))}
                  min="1"
                  max="168"
                  className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">最大備份檔案數</label>
                <input
                  type="number"
                  value={settings.backup.maxBackupFiles}
                  onChange={(e) => dispatch(updateBackupSettings({ maxBackupFiles: parseInt(e.target.value) }))}
                  min="1"
                  max="100"
                  className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">備份位置</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={settings.backup.backupLocation}
                    onChange={(e) => dispatch(updateBackupSettings({ backupLocation: e.target.value }))}
                    placeholder="選擇備份資料夾..."
                    className="flex-1 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    readOnly
                  />
                  <button className="btn-secondary">瀏覽</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">備份狀態</h3>
        <AutoBackupIndicator size="medium" />
      </div>
      
      <BackupManager 
        isOpen={showBackupManager}
        onClose={() => setShowBackupManager(false)}
      />
    </div>
  );
};

export default BackupSettings;