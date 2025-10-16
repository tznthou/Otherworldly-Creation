import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { SettingsTab } from './types';
import { useSettingsActions } from './hooks/useSettingsActions';
import SettingsSidebar from './components/SettingsSidebar';
import SettingsLoadingView from './components/SettingsLoadingView';
import UpdateSettings from '../../components/Update/UpdateSettings';
import { createLogger } from '../../utils/logger';
import {
GeneralSettings,
  UISettings,
  TemplateManagementSettings,
  BackupSettings,
  PrivacySettings,
  DatabaseMaintenanceSettings,
} from './tabs';

// 創建模組專用 logger
const log = createLogger('SettingsMain');

const SettingsMain: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, hasUnsavedChanges, isLoading } = useAppSelector(state => state.settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);

  const {
    loadUserSettings,
    saveSettings,
    resetAllSettings,
    exportSettings,
    importSettings,
  } = useSettingsActions();

  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await saveSettings(settings);
      if (!result) {
        log.error('❌ 設定儲存失敗');
      }
    } catch (error) {
      log.error('❌ 儲存設定時發生錯誤:', error);
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings, settings]);

  useEffect(() => {
    log.debug('SettingsMain: 開始載入設定...');
    let mounted = true;

    const loadSettings = async () => {
      try {
        if (mounted) {
          await loadUserSettings();
          log.debug('SettingsMain: 設定載入完成');
        }
      } catch (error) {
        log.error('SettingsMain: 設定載入失敗:', error);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 移除 loadUserSettings 依賴，避免無限循環

  // 鍵盤快捷鍵支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSaveSettings();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, isSaving, handleSaveSettings]);

  const renderTabContent = () => {
    const commonProps = { settings, dispatch };

    switch (activeTab) {
      case 'general':
        return <GeneralSettings {...commonProps} />;
      case 'ui':
        return <UISettings {...commonProps} />;
      case 'templates':
        return <TemplateManagementSettings />;
      case 'backup':
        return <BackupSettings {...commonProps} />;
      case 'database':
        return <DatabaseMaintenanceSettings />;
      case 'update':
        return <UpdateSettings />;
      case 'privacy':
        return <PrivacySettings {...commonProps} />;
      default:
        return <GeneralSettings {...commonProps} />;
    }
  };

  if (isLoading) {
    return <SettingsLoadingView />;
  }

  // 緊急錯誤處理
  try {

  return (
    <div className="h-full flex bg-bg-dark">
      <SettingsSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSaveSettings}
        onExport={exportSettings}
        onImport={importSettings}
        onReset={resetAllSettings}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
  } catch (error) {
    log.error('SettingsMain: 渲染錯誤:', error);
    return (
      <div className="h-full flex items-center justify-center bg-bg-dark">
        <div className="text-center">
          <h2 className="font-serif-tc text-2xl font-bold text-warm-gold mb-4">設定頁面載入失敗</h2>
          <p className="font-sans-tc text-text-secondary mb-4">發生了未預期的錯誤</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-warm-gold hover:bg-clay-orange text-bg-dark font-sans-tc px-6 py-2 rounded-2xl transition-colors duration-300"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }
};

export default SettingsMain;
