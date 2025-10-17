import { AppSettings } from '../../store/slices/settingsSlice';
import { AppDispatch } from '../../store/store';

export type SettingsTab = 'general' | 'ui' | 'backup' | 'database' | 'update' | 'privacy' | 'templates';

export interface SettingsTabConfig {
  id: string;
  name: string;
  iconName: string;
  iconVariant: 'outline' | 'solid';
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
  { id: 'general', name: '一般設定', iconName: 'Cog6Tooth', iconVariant: 'outline' },
  { id: 'ui', name: '界面', iconName: 'PaintBrush', iconVariant: 'solid' },
  { id: 'templates', name: '模板管理', iconName: 'DocumentText', iconVariant: 'outline' },
  { id: 'backup', name: '備份', iconName: 'CloudArrowUp', iconVariant: 'solid' },
  { id: 'database', name: '資料庫維護', iconName: 'CircleStack', iconVariant: 'solid' },
  { id: 'update', name: '自動更新', iconName: 'ArrowPath', iconVariant: 'outline' },
  { id: 'privacy', name: '隱私', iconName: 'LockClosed', iconVariant: 'solid' },
];

export const SHORTCUT_LABELS: Record<string, string> = {
  'focusMode': '專注模式',
  'save': '儲存',
  'newChapter': '新章節',
  'find': '尋找',
  'replace': '取代',
  'toggleSidebar': '切換側邊欄',
  'aiContinue': 'AI續寫',
  'characterAnalysis': '角色分析',
  'export': '匯出',
};

