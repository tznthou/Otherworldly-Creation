import { AppSettings } from '../../store/slices/settingsSlice';
import { AppDispatch } from '../../store';

export type SettingsTab = 'general' | 'ai' | 'editor' | 'ui' | 'backup' | 'database' | 'update' | 'privacy' | 'shortcuts';

export interface SettingsTabConfig {
  id: string;
  name: string;
  icon: string;
}

export interface SettingsComponentProps {
  settings: AppSettings;
  dispatch: AppDispatch;
}

export interface SettingsState {
  activeTab: SettingsTab;
  isSaving: boolean;
}

export const SETTINGS_TABS: SettingsTabConfig[] = [
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

export const SHORTCUT_LABELS: { [key: string]: string } = {
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