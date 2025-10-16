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
    <div className="w-64 min-w-64 bg-bg-light/50 backdrop-blur-sm border-r border-warm-gold/10 flex flex-col h-full">
      <div className="p-6 border-b border-warm-gold/10">
        <h1 className="font-serif-tc text-xl font-bold text-warm-gold">{t('settings.title')}</h1>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {SETTINGS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as SettingsTab)}
            className={`w-full flex items-center px-4 py-3 mb-2 rounded-2xl text-left transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-warm-gold/20 text-warm-gold border border-warm-gold/30 shadow-md'
                : 'text-text-secondary hover:bg-bg-light hover:text-text-primary hover:-translate-y-0.5'
            }`}
          >
            <span className="mr-3 text-lg">{tab.icon}</span>
            <span className="font-sans-tc">{t(`settings.tabs.${tab.id}`)}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-warm-gold/10 space-y-2 flex-shrink-0">
        {/* 儲存狀態指示器 */}
        {hasUnsavedChanges && (
          <div className="flex items-center text-sm text-warm-gold mb-2 font-sans-tc">
            <div className="w-2 h-2 bg-warm-gold rounded-full mr-2 animate-pulse"></div>
            {t('settings.messages.unsavedChanges')}
          </div>
        )}

        {/* 儲存按鈕 */}
        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`w-full bg-warm-gold hover:bg-clay-orange text-bg-dark font-sans-tc font-medium px-4 py-2.5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 shadow-md ${
            !hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={hasUnsavedChanges ? `${t('settings.actions.save')} (Ctrl+S)` : '沒有變更需要儲存'}
        >
          {isSaving ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-bg-dark mr-2"></div>
              {t('common.loading')}
            </span>
          ) : (
            <span className="flex items-center justify-center">
              {t('settings.actions.save')}
              {hasUnsavedChanges && <span className="ml-1 text-xs">●</span>}
              <kbd className="ml-2 text-xs bg-bg-dark/30 px-1.5 py-0.5 rounded">Ctrl+S</kbd>
            </span>
          )}
        </button>

        <div className="flex space-x-2">
          <button
            onClick={onExport}
            className="flex-1 bg-bg-light/80 hover:bg-bg-light text-text-primary font-sans-tc text-sm px-3 py-2 rounded-2xl border border-warm-gold/20 hover:border-warm-gold/40 transition-all duration-300 hover:-translate-y-0.5"
          >
            {t('settings.actions.export')}
          </button>
          <button
            onClick={onImport}
            className="flex-1 bg-bg-light/80 hover:bg-bg-light text-text-primary font-sans-tc text-sm px-3 py-2 rounded-2xl border border-warm-gold/20 hover:border-warm-gold/40 transition-all duration-300 hover:-translate-y-0.5"
          >
            {t('settings.actions.import')}
          </button>
        </div>

        <button
          onClick={onReset}
          className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 font-sans-tc text-sm px-3 py-2 rounded-2xl border border-red-500/30 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-0.5"
        >
          {t('settings.actions.reset')}
        </button>
      </div>
    </div>
  );
};

export default SettingsSidebar;
