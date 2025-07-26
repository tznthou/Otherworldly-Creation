// 專案相關型別
export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  createdAt: string;
  wordCount: number;
  chapterCount: number;
}

// 角色相關型別
export interface Character {
  id: string;
  name: string;
  age: string;
  gender: 'male' | 'female';
  archetype: string;
  description: string;
  createdAt: string;
}

// 模板相關型別
export interface Template {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  outline: string[];
}

// 原型定義
export interface Archetype {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// 專案類型定義
export interface ProjectType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// 統計數據型別
export interface WritingStats {
  wordCount: number;
  paragraphCount: number;
  totalWritingTime: number;
  currentSessionTime: number;
  dailyGoal: number;
  progress: number;
}

// 頁面類型
export type PageType = 'dashboard' | 'editor' | 'stats' | 'settings' | 'help' | 'data';