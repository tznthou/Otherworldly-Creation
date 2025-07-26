import { contextBridge, ipcRenderer } from 'electron';

// 定義基本 API 接口
export interface BasicElectronAPI {
  // 專案管理
  projects: {
    getAll: () => Promise<any[]>;
    create: (project: any) => Promise<string>;
    update: (project: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };
  
  // 章節管理
  chapters: {
    getByProjectId: (projectId: string) => Promise<any[]>;
    create: (chapter: any) => Promise<string>;
    update: (chapter: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
  };
}

// 暴露 API 到渲染進程
const electronAPI: BasicElectronAPI = {
  projects: {
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    create: (project) => ipcRenderer.invoke('projects:create', project),
    update: (project) => ipcRenderer.invoke('projects:update', project),
    delete: (id) => ipcRenderer.invoke('projects:delete', id),
    getById: (id) => ipcRenderer.invoke('projects:getById', id),
  },
  chapters: {
    getByProjectId: (projectId) => ipcRenderer.invoke('chapters:getByProjectId', projectId),
    create: (chapter) => ipcRenderer.invoke('chapters:create', chapter),
    update: (chapter) => ipcRenderer.invoke('chapters:update', chapter),
    delete: (id) => ipcRenderer.invoke('chapters:delete', id),
    getById: (id) => ipcRenderer.invoke('chapters:getById', id),
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

console.log('基本 Preload 腳本載入完成');

// 擴展全域類型定義
declare global {
  interface Window {
    electronAPI: BasicElectronAPI;
  }
}