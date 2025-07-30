import { Project } from '../store/slices/projectsSlice';
import { Chapter } from '../store/slices/chaptersSlice';
import { Character } from '../store/slices/charactersSlice';
import { AppSettings } from '../store/slices/settingsSlice';
import api from '../api';

// 備份資料結構
export interface BackupData {
  version: string;
  timestamp: Date;
  metadata: {
    appVersion: string;
    platform: string;
    totalProjects: number;
    totalChapters: number;
    totalCharacters: number;
  };
  data: {
    projects: Project[];
    chapters: Chapter[];
    characters: Character[];
    settings: AppSettings;
    templates?: any[];
  };
}

// 備份檔案資訊
export interface BackupFileInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  timestamp: Date;
  version: string;
  metadata: BackupData['metadata'];
}

// 備份驗證結果
export interface BackupValidationResult {
  isValid: boolean;
  version: string;
  errors: string[];
  warnings: string[];
  metadata?: BackupData['metadata'];
}

// 還原選項
export interface RestoreOptions {
  includeProjects: boolean;
  includeChapters: boolean;
  includeCharacters: boolean;
  includeSettings: boolean;
  includeTemplates: boolean;
  overwriteExisting: boolean;
  selectedProjectIds?: string[];
}

class BackupServiceClass {
  private readonly BACKUP_VERSION = '1.0.0';
  private readonly BACKUP_FILE_EXTENSION = '.gcbackup';

  /**
   * 創建完整備份
   */
  async createFullBackup(): Promise<string> {
    try {
      // 獲取所有資料
      const [projects, allChapters, allCharacters, settings] = await Promise.all([
        api.projects.getAll(),
        this.getAllChapters(),
        this.getAllCharacters(),
        api.settings.getAll()
      ]);

      // 構建備份資料
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date(),
        metadata: {
          appVersion: await api.system.getAppVersion(),
          platform: navigator.platform,
          totalProjects: projects.length,
          totalChapters: allChapters.length,
          totalCharacters: allCharacters.length,
        },
        data: {
          projects,
          chapters: allChapters,
          characters: allCharacters,
          settings: settings || {},
        }
      };

      // 生成備份檔案
      const filename = this.generateBackupFilename();
      const backupJson = JSON.stringify(backupData, null, 2);
      
      // 下載備份檔案
      this.downloadBackupFile(backupJson, filename);
      
      return filename;
    } catch (error) {
      console.error('創建備份失敗:', error);
      throw new Error(`備份創建失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 創建專案備份
   */
  async createProjectBackup(projectId: string): Promise<string> {
    try {
      // 獲取專案相關資料
      const [project, chapters, characters, settings] = await Promise.all([
        api.projects.getById(projectId),
        api.chapters.getByProjectId(projectId),
        api.characters.getByProjectId(projectId),
        api.settings.getAll()
      ]);

      if (!project) {
        throw new Error('專案不存在');
      }

      // 構建專案備份資料
      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date(),
        metadata: {
          appVersion: await api.system.getAppVersion(),
          platform: navigator.platform,
          totalProjects: 1,
          totalChapters: chapters.length,
          totalCharacters: characters.length,
        },
        data: {
          projects: [project],
          chapters,
          characters,
          settings: settings || {},
        }
      };

      // 生成備份檔案
      const filename = this.generateBackupFilename(project.name);
      const backupJson = JSON.stringify(backupData, null, 2);
      
      // 下載備份檔案
      this.downloadBackupFile(backupJson, filename);
      
      return filename;
    } catch (error) {
      console.error('創建專案備份失敗:', error);
      throw new Error(`專案備份創建失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 驗證備份檔案
   */
  async validateBackup(file: File): Promise<BackupValidationResult> {
    try {
      const content = await this.readFileContent(file);
      const backupData = JSON.parse(content) as BackupData;
      
      const errors: string[] = [];
      const warnings: string[] = [];

      // 檢查基本結構
      if (!backupData.version) {
        errors.push('缺少版本資訊');
      }

      if (!backupData.timestamp) {
        errors.push('缺少時間戳記');
      }

      if (!backupData.data) {
        errors.push('缺少資料內容');
      }

      // 檢查版本相容性
      if (backupData.version !== this.BACKUP_VERSION) {
        warnings.push(`備份版本 (${backupData.version}) 與當前版本 (${this.BACKUP_VERSION}) 不同`);
      }

      // 檢查資料完整性
      if (backupData.data) {
        if (!Array.isArray(backupData.data.projects)) {
          errors.push('專案資料格式錯誤');
        }

        if (!Array.isArray(backupData.data.chapters)) {
          errors.push('章節資料格式錯誤');
        }

        if (!Array.isArray(backupData.data.characters)) {
          errors.push('角色資料格式錯誤');
        }

        // 檢查資料關聯性
        if (backupData.data.projects && backupData.data.chapters) {
          const projectIds = new Set(backupData.data.projects.map(p => p.id));
          const orphanChapters = backupData.data.chapters.filter(c => !projectIds.has(c.projectId));
          if (orphanChapters.length > 0) {
            warnings.push(`發現 ${orphanChapters.length} 個孤立章節`);
          }
        }

        if (backupData.data.projects && backupData.data.characters) {
          const projectIds = new Set(backupData.data.projects.map(p => p.id));
          const orphanCharacters = backupData.data.characters.filter(c => !projectIds.has(c.projectId));
          if (orphanCharacters.length > 0) {
            warnings.push(`發現 ${orphanCharacters.length} 個孤立角色`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        version: backupData.version || 'unknown',
        errors,
        warnings,
        metadata: backupData.metadata
      };

    } catch (error) {
      return {
        isValid: false,
        version: 'unknown',
        errors: [`檔案解析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`],
        warnings: []
      };
    }
  }

  /**
   * 還原備份
   */
  async restoreBackup(file: File, options: RestoreOptions): Promise<void> {
    try {
      // 先驗證備份
      const validation = await this.validateBackup(file);
      if (!validation.isValid) {
        throw new Error(`備份檔案無效: ${validation.errors.join(', ')}`);
      }

      const content = await this.readFileContent(file);
      const backupData = JSON.parse(content) as BackupData;

      // 執行還原操作
      await this.performRestore(backupData, options);

    } catch (error) {
      console.error('還原備份失敗:', error);
      throw new Error(`備份還原失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 獲取備份預覽資訊
   */
  async getBackupPreview(file: File): Promise<BackupData['metadata'] & { 
    projects: Array<{ id: string; name: string; type: string }>;
    dataSize: number;
  }> {
    try {
      const content = await this.readFileContent(file);
      const backupData = JSON.parse(content) as BackupData;

      return {
        ...backupData.metadata,
        projects: backupData.data.projects.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type
        })),
        dataSize: content.length
      };
    } catch (error) {
      throw new Error(`無法讀取備份預覽: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 執行還原操作
   */
  private async performRestore(backupData: BackupData, options: RestoreOptions): Promise<void> {
    const operations: Promise<any>[] = [];

    // 還原設定
    if (options.includeSettings && backupData.data.settings) {
      // 將設定物件轉換為多個 set 操作
      const settings = backupData.data.settings;
      for (const [key, value] of Object.entries(settings)) {
        operations.push(api.settings.set(key, value));
      }
    }

    // 還原專案
    if (options.includeProjects && backupData.data.projects) {
      const projectsToRestore = options.selectedProjectIds
        ? backupData.data.projects.filter(p => options.selectedProjectIds!.includes(p.id))
        : backupData.data.projects;

      for (const project of projectsToRestore) {
        if (options.overwriteExisting) {
          operations.push(
            api.projects.update(project).catch(() =>
              api.projects.create(project)
            )
          );
        } else {
          // 檢查專案是否已存在
          const existing = await api.projects.getById(project.id);
          if (!existing) {
            operations.push(api.projects.create(project));
          }
        }
      }
    }

    // 還原章節
    if (options.includeChapters && backupData.data.chapters) {
      const projectIds = options.selectedProjectIds || 
        backupData.data.projects.map(p => p.id);

      const chaptersToRestore = backupData.data.chapters.filter(c => 
        projectIds.includes(c.projectId)
      );

      for (const chapter of chaptersToRestore) {
        if (options.overwriteExisting) {
          operations.push(
            api.chapters.update(chapter).catch(() =>
              api.chapters.create(chapter)
            )
          );
        } else {
          const existing = await api.chapters.getById(chapter.id);
          if (!existing) {
            operations.push(api.chapters.create(chapter));
          }
        }
      }
    }

    // 還原角色
    if (options.includeCharacters && backupData.data.characters) {
      const projectIds = options.selectedProjectIds || 
        backupData.data.projects.map(p => p.id);

      const charactersToRestore = backupData.data.characters.filter(c => 
        projectIds.includes(c.projectId)
      );

      for (const character of charactersToRestore) {
        if (options.overwriteExisting) {
          operations.push(
            api.characters.update(character).catch(() =>
              api.characters.create(character)
            )
          );
        } else {
          const existing = await api.characters.getById(character.id);
          if (!existing) {
            operations.push(api.characters.create(character));
          }
        }
      }
    }

    // 執行所有操作
    await Promise.all(operations);
  }

  /**
   * 獲取所有章節
   */
  private async getAllChapters(): Promise<Chapter[]> {
    const projects = await api.projects.getAll();
    const allChapters: Chapter[] = [];

    for (const project of projects) {
      const chapters = await api.chapters.getByProjectId(project.id);
      allChapters.push(...chapters);
    }

    return allChapters;
  }

  /**
   * 獲取所有角色
   */
  private async getAllCharacters(): Promise<Character[]> {
    const projects = await api.projects.getAll();
    const allCharacters: Character[] = [];

    for (const project of projects) {
      const characters = await api.characters.getByProjectId(project.id);
      allCharacters.push(...characters);
    }

    return allCharacters;
  }

  /**
   * 生成備份檔案名稱
   */
  private generateBackupFilename(projectName?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = projectName ? `${projectName}-` : 'full-';
    return `genesis-chronicle-${prefix}backup-${timestamp}${this.BACKUP_FILE_EXTENSION}`;
  }

  /**
   * 下載備份檔案
   */
  private downloadBackupFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * 讀取檔案內容
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsText(file);
    });
  }

  /**
   * 格式化檔案大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化時間
   */
  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// 單例模式
export const BackupService = new BackupServiceClass();

export default BackupService;