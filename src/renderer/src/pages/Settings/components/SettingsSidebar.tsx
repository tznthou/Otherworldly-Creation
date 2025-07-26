import React from 'react';
import { SettingsTab, SETTINGS_TABS } from '../types';

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
  return (
    <div className="w-64 bg-cosmic-800 border-r border-cosmic-700 flex flex-col">
      <div className="p-6 border-b border-cosmic-700">
        <h1 className="text-xl font-cosmic text-gold-500">系統設定</h1>
      </div>
      
      <nav className="flex-1 p-4">
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
            {tab.name}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-cosmic-700 space-y-2">
        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`w-full btn-primary ${
            !hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? '儲存中...' : '儲存設定'}
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={onExport}
            className="flex-1 btn-secondary text-sm"
          >
            匯出
          </button>
          <button
            onClick={onImport}
            className="flex-1 btn-secondary text-sm"
          >
            匯入
          </button>
        </div>
        
        <button
          onClick={onReset}
          className="w-full btn-danger text-sm"
        >
          重置設定
        </button>
      </div>
    </div>
  );
};

export default SettingsSidebar;