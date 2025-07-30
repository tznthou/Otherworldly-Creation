import React from 'react';
import { SettingsTab, SETTINGS_TABS } from '../types';
import { useI18n } from '../../../hooks/useI18n';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onTabChange,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onExport,
  onImport,
  onReset,
}) => {
  const { t } = useI18n();
  
  return (
    <div className="w-64 min-w-64 bg-cosmic-800 border-r border-cosmic-700 flex flex-col h-full">
      <div className="p-6 border-b border-cosmic-700">
        <h1 className="text-xl font-cosmic text-gold-500">{t('settings.title')}</h1>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        {SETTINGS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as SettingsTab)}
            className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg text-left transition-colors ${
              activeTab === tab.id
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                : 'text-gray-300 hover:bg-cosmic-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{tab.icon}</span>
            {t(`settings.tabs.${tab.id}`)}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-cosmic-700 space-y-2 flex-shrink-0">
        {/* 儲存狀態指示器 */}
        {hasUnsavedChanges && (
          <div className="flex items-center text-sm text-gold-400 mb-2">
            <div className="w-2 h-2 bg-gold-400 rounded-full mr-2 animate-pulse"></div>
            {t('settings.messages.unsavedChanges')}
          </div>
        )}
        
        {/* 儲存按鈕 */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`w-full btn-primary ${
            !hasUnsavedChanges ? 'opacity-75' : ''
          }`}
          title={`${t('settings.actions.save')} (Ctrl+S)`}
        >
          {isSaving ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {t('common.loading')}
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {t('settings.actions.save')}
              {hasUnsavedChanges && <span className="ml-1 text-xs">●</span>}
              <kbd className="ml-2 text-xs bg-cosmic-950/50 px-1 py-0.5 rounded">Ctrl+S</kbd>
            </span>
          )}
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={onExport}
            className="flex-1 btn-secondary text-sm"
          >
            {t('settings.actions.export')}
          </button>
          <button
            onClick={onImport}
            className="flex-1 btn-secondary text-sm"
          >
            {t('settings.actions.import')}
          </button>
        </div>
        
        <button
          onClick={onReset}
          className="w-full btn-danger text-sm"
        >
          {t('settings.actions.reset')}
        </button>
      </div>
    </div>
  );
};

export default SettingsSidebar;