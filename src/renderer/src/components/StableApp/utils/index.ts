import { STORAGE_KEYS } from '../constants';
import { Project, Character } from '../types';
import { NovelTemplate } from '../../../types/template';

// 備份數據類型定義
interface BackupData {
  projects: Project[];
  characters: Character[];
  content: string;
  template: NovelTemplate | null;
  stats: {
    totalWritingTime: string;
    savedTime: string;
  };
  exportTime: string;
}

// 本地儲存相關工具函數
export const storage = {
  // 專案相關
  getProjects: (): Project[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },
  
  saveProjects: (projects: Project[]): void => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },
  
  // 角色相關
  getCharacters: (): Character[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    return data ? JSON.parse(data) : [];
  },
  
  saveCharacters: (characters: Character[]): void => {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  },
  
  // 內容相關
  getContent: (): string => {
    return localStorage.getItem(STORAGE_KEYS.CONTENT) || '';
  },
  
  saveContent: (content: string): void => {
    localStorage.setItem(STORAGE_KEYS.CONTENT, content);
    localStorage.setItem(STORAGE_KEYS.SAVED_TIME, new Date().toLocaleString());
  },
  
  // 寫作時間相關
  getWritingTime: (): number => {
    const saved = localStorage.getItem(STORAGE_KEYS.WRITING_TIME);
    return saved ? parseInt(saved) : 0;
  },
  
  saveWritingTime: (time: number): void => {
    localStorage.setItem(STORAGE_KEYS.WRITING_TIME, time.toString());
  },
  
  // 模板相關
  getAppliedTemplate: (): NovelTemplate | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TEMPLATE);
    return data ? JSON.parse(data) : null;
  },
  
  saveAppliedTemplate: (template: NovelTemplate | null): void => {
    if (template) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATE, JSON.stringify(template));
    } else {
      localStorage.removeItem(STORAGE_KEYS.TEMPLATE);
    }
  }
};

// 文字統計工具函數
export const textStats = {
  // 計算字數
  countWords: (text: string): number => {
    return text.length;
  },
  
  // 計算段落數
  countParagraphs: (text: string): number => {
    return text.split('\n\n').filter(p => p.trim().length > 0).length;
  },
  
  // 計算寫作效率（字/分鐘）
  calculateEfficiency: (wordCount: number, minutes: number): number => {
    return minutes > 0 ? Math.round(wordCount / minutes) : 0;
  },
  
  // 計算進度百分比
  calculateProgress: (current: number, goal: number): number => {
    return Math.min((current / goal) * 100, 100);
  }
};

// 備份相關工具函數
export const backup = {
  // 創建備份資料
  createBackupData: () => {
    return {
      projects: storage.getProjects(),
      characters: storage.getCharacters(),
      content: storage.getContent(),
      template: storage.getAppliedTemplate(),
      stats: {
        totalWritingTime: storage.getWritingTime().toString(),
        savedTime: localStorage.getItem(STORAGE_KEYS.SAVED_TIME) || ''
      },
      exportTime: new Date().toISOString()
    };
  },
  
  // 還原備份
  restoreBackup: (data: BackupData): void => {
    if (data.projects) storage.saveProjects(data.projects);
    if (data.characters) storage.saveCharacters(data.characters);
    if (data.content) storage.saveContent(data.content);
    if (data.template) storage.saveAppliedTemplate(data.template);
    if (data.stats?.totalWritingTime) {
      storage.saveWritingTime(parseInt(data.stats.totalWritingTime));
    }
    if (data.stats?.savedTime) {
      localStorage.setItem(STORAGE_KEYS.SAVED_TIME, data.stats.savedTime);
    }
  },
  
  // 下載備份檔案
  downloadBackup: (data: BackupData, filename: string): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// 日期時間格式化
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
};

// 生成唯一 ID
export const generateId = (): string => {
  return Date.now().toString();
};