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
    loadUserSettings();
  }, [loadUserSettings]);

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
};

export default SettingsMain;