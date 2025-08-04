import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { SettingsTab } from './types';
import { useSettingsActions } from './hooks/useSettingsActions';
import SettingsSidebar from './components/SettingsSidebar';
import SettingsLoadingView from './components/SettingsLoadingView';
import UpdateSettings from '../../components/Update/UpdateSettings';
import {
  GeneralSettings,
  AISettings,
  EditorSettings,
  UISettings,
  TemplateManagementSettings,
  BackupSettings,
  PrivacySettings,
  ShortcutsSettings,
  DatabaseMaintenanceSettings,
} from './tabs';

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
      await saveSettings(settings);
    } finally {
      setIsSaving(false);
    }
  }, [saveSettings, settings]);

  useEffect(() => {
    console.log('SettingsMain: 開始載入設定...');
    let mounted = true;
    
    const loadSettings = async () => {
      try {
        if (mounted) {
          await loadUserSettings();
          console.log('SettingsMain: 設定載入完成');
        }
      } catch (error) {
        console.error('SettingsMain: 設定載入失敗:', error);
      }
    };
    
    loadSettings();
    
    return () => {
      mounted = false;
    };
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
      case 'ai':
        return <AISettings {...commonProps} />;
      case 'editor':
        return <EditorSettings {...commonProps} />;
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
      case 'shortcuts':
        return <ShortcutsSettings {...commonProps} />;
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
    <div className="h-full flex bg-cosmic-900">
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
        <div className="p-8">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('SettingsMain: 渲染錯誤:', error);
    return (
      <div className="h-full flex items-center justify-center bg-cosmic-900">
        <div className="text-center">
          <h2 className="text-2xl font-cosmic text-gold-500 mb-4">設定頁面載入失敗</h2>
          <p className="text-gray-300 mb-4">發生了未預期的錯誤</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gold-500 hover:bg-gold-600 text-cosmic-950 px-4 py-2 rounded"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }
};

export default SettingsMain;