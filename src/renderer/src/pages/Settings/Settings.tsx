import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  loadSettings,
  updateAISettings,
  updateEditorSettings,
  updateUISettings,
  updateBackupSettings,
  updatePrivacySettings,
  updateShortcut,
  resetSettings,
  resetAISettings,
  resetEditorSettings,
  resetUISettings,
  markSettingsSaved,
  AppSettings,
} from '../../store/slices/settingsSlice';
import { SettingsService } from '../../services/settingsService';
import { addNotification } from '../../store/slices/uiSlice';
import BackupManager from '../../components/Backup/BackupManager';
import AutoBackupIndicator from '../../components/UI/AutoBackupIndicator';
import DatabaseMaintenance from '../DatabaseMaintenance/DatabaseMaintenance';
import UpdateSettings from '../../components/Update/UpdateSettings';

type SettingsTab = 'general' | 'ai' | 'editor' | 'ui' | 'backup' | 'database' | 'update' | 'privacy' | 'shortcuts';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, hasUnsavedChanges, isLoading } = useAppSelector(state => state.settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);

  // 載入設定
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const userSettings = await SettingsService.loadSettings();
        dispatch(loadSettings(userSettings));
      } catch (error) {
        console.error('載入設定失敗:', error);
        dispatch(addNotification({
          type: 'error',
          title: '載入設定失敗',
          message: '無法載入使用者設定，將使用預設設定',
          duration: 5000,
        }));
      }
    };

    loadUserSettings();
  }, [dispatch]);

  // 儲存設定
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await SettingsService.saveSettings(settings);
      dispatch(markSettingsSaved());
      dispatch(addNotification({
        type: 'success',
        title: '設定已儲存',
        message: '所有設定已成功儲存',
        duration: 3000,
      }));
    } catch (error) {
      console.error('儲存設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '儲存失敗',
        message: '儲存設定時發生錯誤',
        duration: 5000,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // 重置設定
  const handleResetSettings = async () => {
    if (confirm('確定要重置所有設定嗎？此操作無法復原。')) {
      try {
        await SettingsService.resetSettings();
        dispatch(resetSettings());
        dispatch(addNotification({
          type: 'success',
          title: '設定已重置',
          message: '所有設定已重置為預設值',
          duration: 3000,
        }));
      } catch (error) {
        console.error('重置設定失敗:', error);
        dispatch(addNotification({
          type: 'error',
          title: '重置失敗',
          message: '重置設定時發生錯誤',
          duration: 5000,
        }));
      }
    }
  };

  // 匯出設定
  const handleExportSettings = async () => {
    try {
      const settingsJson = await SettingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genesis-chronicle-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      dispatch(addNotification({
        type: 'success',
        title: '設定已匯出',
        message: '設定檔案已下載',
        duration: 3000,
      }));
    } catch (error) {
      console.error('匯出設定失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '匯出失敗',
        message: '匯出設定時發生錯誤',
        duration: 5000,
      }));
    }
  };

  // 匯入設定
  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const importedSettings = await SettingsService.importSettings(text);
          dispatch(loadSettings(importedSettings));
          dispatch(addNotification({
            type: 'success',
            title: '設定已匯入',
            message: '設定已成功匯入並套用',
            duration: 3000,
          }));
        } catch (error) {
          console.error('匯入設定失敗:', error);
          dispatch(addNotification({
            type: 'error',
            title: '匯入失敗',
            message: '設定檔案格式錯誤或損壞',
            duration: 5000,
          }));
        }
      }
    };
    input.click();
  };

  const tabs = [
    { id: 'general', name: '一般設定', icon: '⚙️' },
    { id: 'ai', name: 'AI 設定', icon: '🤖' },
    { id: 'editor', name: '編輯器', icon: '📝' },
    { id: 'ui', name: '界面', icon: '🎨' },
    { id: 'backup', name: '備份', icon: '💾' },
    { id: 'database', name: '資料庫維護', icon: '🗄️' },
    { id: 'update', name: '自動更新', icon: '🔄' },
    { id: 'privacy', name: '隱私', icon: '🔒' },
    { id: 'shortcuts', name: '快捷鍵', icon: '⌨️' },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-400">載入設定中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-cosmic-900">
      {/* 側邊欄 */}
      <div className="w-64 bg-cosmic-800 border-r border-cosmic-700 flex flex-col">
        <div className="p-6 border-b border-cosmic-700">
          <h1 className="text-xl font-cosmic text-gold-500">系統設定</h1>
        </div>
        
        <nav className="flex-1 p-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
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
        
        {/* 底部操作按鈕 */}
        <div className="p-4 border-t border-cosmic-700 space-y-2">
          <button
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className={`w-full btn-primary ${
              !hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? '儲存中...' : '儲存設定'}
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={handleExportSettings}
              className="flex-1 btn-secondary text-sm"
            >
              匯出
            </button>
            <button
              onClick={handleImportSettings}
              className="flex-1 btn-secondary text-sm"
            >
              匯入
            </button>
          </div>
          
          <button
            onClick={handleResetSettings}
            className="w-full btn-danger text-sm"
          >
            重置設定
          </button>
        </div>
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          {activeTab === 'general' && <GeneralSettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'ai' && <AISettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'editor' && <EditorSettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'ui' && <UISettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'backup' && <BackupSettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'database' && <DatabaseMaintenanceSettings />}
          {activeTab === 'update' && <UpdateSettings />}
          {activeTab === 'privacy' && <PrivacySettings settings={settings} dispatch={dispatch} />}
          {activeTab === 'shortcuts' && <ShortcutsSettings settings={settings} dispatch={dispatch} />}
        </div>
      </div>
    </div>
  );
};

// 一般設定組件
const GeneralSettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-cosmic text-gold-500 mb-6">一般設定</h2>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">語言與地區</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">界面語言</label>
          <select
            value={settings.language}
            onChange={(e) => dispatch(updateSettings({ language: e.target.value as any }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="zh-TW">繁體中文</option>
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">自動儲存</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoSave"
            checked={settings.autoSave}
            onChange={(e) => dispatch(updateSettings({ autoSave: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="autoSave" className="text-gray-300">啟用自動儲存</label>
        </div>
        
        {settings.autoSave && (
          <div>
            <label className="block text-gray-300 mb-2">自動儲存間隔 (秒)</label>
            <input
              type="number"
              value={settings.autoSaveInterval / 1000}
              onChange={(e) => dispatch(updateSettings({ autoSaveInterval: parseInt(e.target.value) * 1000 }))}
              min="1"
              max="300"
              className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

// AI 設定組件
const AISettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">AI 設定</h2>
      <button
        onClick={() => dispatch(resetAISettings())}
        className="btn-secondary text-sm"
      >
        重置 AI 設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">模型設定</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">預設模型</label>
          <input
            type="text"
            value={settings.ai.defaultModel}
            onChange={(e) => dispatch(updateAISettings({ defaultModel: e.target.value }))}
            placeholder="llama3"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">上下文長度</label>
          <input
            type="number"
            value={settings.ai.contextLength}
            onChange={(e) => dispatch(updateAISettings({ contextLength: parseInt(e.target.value) }))}
            min="1000"
            max="32000"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">生成參數</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">溫度 ({settings.ai.temperature})</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.ai.temperature}
            onChange={(e) => dispatch(updateAISettings({ temperature: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">Top P ({settings.ai.topP})</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.ai.topP}
            onChange={(e) => dispatch(updateAISettings({ topP: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">最大 Token 數</label>
          <input
            type="number"
            value={settings.ai.maxTokens}
            onChange={(e) => dispatch(updateAISettings({ maxTokens: parseInt(e.target.value) }))}
            min="50"
            max="2000"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">自動完成</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableAutoComplete"
            checked={settings.ai.enableAutoComplete}
            onChange={(e) => dispatch(updateAISettings({ enableAutoComplete: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableAutoComplete" className="text-gray-300">啟用自動完成</label>
        </div>
        
        {settings.ai.enableAutoComplete && (
          <div>
            <label className="block text-gray-300 mb-2">自動完成延遲 (毫秒)</label>
            <input
              type="number"
              value={settings.ai.autoCompleteDelay}
              onChange={(e) => dispatch(updateAISettings({ autoCompleteDelay: parseInt(e.target.value) }))}
              min="500"
              max="5000"
              className="w-32 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        )}
      </div>
    </div>
  </div>
);

// 編輯器設定組件
const EditorSettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">編輯器設定</h2>
      <button
        onClick={() => dispatch(resetEditorSettings())}
        className="btn-secondary text-sm"
      >
        重置編輯器設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">外觀</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">主題</label>
          <select
            value={settings.editor.theme}
            onChange={(e) => dispatch(updateEditorSettings({ theme: e.target.value as any }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="cosmic">宇宙深藍</option>
            <option value="light">純淨白色</option>
            <option value="dark">經典黑色</option>
            <option value="sepia">復古棕褐</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">字體</label>
          <select
            value={settings.editor.fontFamily}
            onChange={(e) => dispatch(updateEditorSettings({ fontFamily: e.target.value }))}
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value='"Noto Sans TC", sans-serif'>思源黑體</option>
            <option value='"Noto Serif TC", serif'>思源宋體</option>
            <option value='Inter, sans-serif'>Inter</option>
            <option value='Georgia, serif'>Georgia</option>
            <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">字體大小</label>
          <input
            type="number"
            value={settings.editor.fontSize}
            onChange={(e) => dispatch(updateEditorSettings({ fontSize: parseInt(e.target.value) }))}
            min="12"
            max="32"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-300 mb-2">行高</label>
          <input
            type="number"
            value={settings.editor.lineHeight}
            onChange={(e) => dispatch(updateEditorSettings({ lineHeight: parseFloat(e.target.value) }))}
            min="1.0"
            max="3.0"
            step="0.1"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">編輯器行為</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showLineNumbers"
            checked={settings.editor.showLineNumbers}
            onChange={(e) => dispatch(updateEditorSettings({ showLineNumbers: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showLineNumbers" className="text-gray-300">顯示行號</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="wordWrap"
            checked={settings.editor.wordWrap}
            onChange={(e) => dispatch(updateEditorSettings({ wordWrap: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="wordWrap" className="text-gray-300">自動換行</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="spellCheck"
            checked={settings.editor.spellCheck}
            onChange={(e) => dispatch(updateEditorSettings({ spellCheck: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="spellCheck" className="text-gray-300">拼字檢查</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableVimMode"
            checked={settings.editor.enableVimMode}
            onChange={(e) => dispatch(updateEditorSettings({ enableVimMode: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableVimMode" className="text-gray-300">Vim 模式</label>
        </div>
      </div>
    </div>
  </div>
);

// UI 設定組件
const UISettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-cosmic text-gold-500">界面設定</h2>
      <button
        onClick={() => dispatch(resetUISettings())}
        className="btn-secondary text-sm"
      >
        重置界面設定
      </button>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">布局</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">側邊欄寬度</label>
          <input
            type="number"
            value={settings.ui.sidebarWidth}
            onChange={(e) => dispatch(updateUISettings({ sidebarWidth: parseInt(e.target.value) }))}
            min="200"
            max="500"
            className="w-full bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
        </div>
      </div>
    </div>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">顯示選項</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showStatusBar"
            checked={settings.ui.showStatusBar}
            onChange={(e) => dispatch(updateUISettings({ showStatusBar: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showStatusBar" className="text-gray-300">顯示狀態欄</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMinimap"
            checked={settings.ui.showMinimap}
            onChange={(e) => dispatch(updateUISettings({ showMinimap: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="showMinimap" className="text-gray-300">顯示小地圖</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="animationsEnabled"
            checked={settings.ui.animationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ animationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="animationsEnabled" className="text-gray-300">啟用動畫效果</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="soundEnabled"
            checked={settings.ui.soundEnabled}
            onChange={(e) => dispatch(updateUISettings({ soundEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="soundEnabled" className="text-gray-300">啟用音效</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notificationsEnabled"
            checked={settings.ui.notificationsEnabled}
            onChange={(e) => dispatch(updateUISettings({ notificationsEnabled: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="notificationsEnabled" className="text-gray-300">啟用通知</label>
        </div>
      </div>
    </div>
  </div>
);

// 備份設定組件
const BackupSettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => {
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
      
      {/* 自動備份狀態 */}
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">備份狀態</h3>
        <AutoBackupIndicator size="medium" />
      </div>
      
      {/* 備份管理器 */}
      <BackupManager 
        isOpen={showBackupManager}
        onClose={() => setShowBackupManager(false)}
      />
    </div>
  );
};

// 隱私設定組件
const PrivacySettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-cosmic text-gold-500">隱私設定</h2>
    
    <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gold-400 mb-4">資料收集</h3>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableTelemetry"
            checked={settings.privacy.enableTelemetry}
            onChange={(e) => dispatch(updatePrivacySettings({ enableTelemetry: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableTelemetry" className="text-gray-300">啟用遙測資料收集</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableCrashReporting"
            checked={settings.privacy.enableCrashReporting}
            onChange={(e) => dispatch(updatePrivacySettings({ enableCrashReporting: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableCrashReporting" className="text-gray-300">啟用錯誤報告</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableUsageAnalytics"
            checked={settings.privacy.enableUsageAnalytics}
            onChange={(e) => dispatch(updatePrivacySettings({ enableUsageAnalytics: e.target.checked }))}
            className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
          />
          <label htmlFor="enableUsageAnalytics" className="text-gray-300">啟用使用情況分析</label>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-cosmic-700 rounded-lg">
        <p className="text-sm text-gray-400">
          這些設定幫助我們改善產品品質。所有資料都會匿名處理，不會包含您的創作內容。
        </p>
      </div>
    </div>
  </div>
);

// 快捷鍵設定組件
const ShortcutsSettings: React.FC<{ settings: AppSettings; dispatch: any }> = ({ settings, dispatch }) => {
  const shortcutLabels: { [key: string]: string } = {
    save: '儲存',
    newProject: '新建專案',
    openProject: '開啟專案',
    aiContinue: 'AI 續寫',
    toggleSidebar: '切換側邊欄',
    toggleFullscreen: '全螢幕',
    find: '尋找',
    replace: '取代',
    undo: '復原',
    redo: '重做',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-cosmic text-gold-500">快捷鍵設定</h2>
      
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gold-400 mb-4">自訂快捷鍵</h3>
        <div className="space-y-4">
          {Object.entries(settings.shortcuts).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-gray-300 w-32">{shortcutLabels[key] || key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => dispatch(updateShortcut({ key, value: e.target.value }))}
                className="w-48 bg-cosmic-700 border border-cosmic-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="按下快捷鍵..."
              />
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-cosmic-700 rounded-lg">
          <p className="text-sm text-gray-400">
            點擊輸入框並按下您想要的快捷鍵組合。支援 Ctrl、Alt、Shift 等修飾鍵。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;

// 資料庫維護設定組件
const DatabaseMaintenanceSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-cosmic text-gold-500">資料庫維護</h2>
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <DatabaseMaintenance />
      </div>
    </div>
  );
};