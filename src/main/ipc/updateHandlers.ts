import { ipcMain, BrowserWindow } from 'electron';
import UpdateService, { UpdateCheckResult, UpdateProgress } from '../services/updateService';

class UpdateHandlers {
  private updateService: UpdateService;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.updateService = new UpdateService();
    this.registerHandlers();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private registerHandlers() {
    // 檢查更新
    ipcMain.handle('update:check', async (): Promise<UpdateCheckResult> => {
      try {
        return await this.updateService.checkForUpdates();
      } catch (error) {
        console.error('檢查更新失敗:', error);
        return {
          hasUpdate: false,
          currentVersion: this.updateService.getCurrentVersion(),
          error: error instanceof Error ? error.message : '檢查更新失敗'
        };
      }
    });

    // 下載更新
    ipcMain.handle('update:download', async (_, updateInfo) => {
      try {
        return await this.updateService.downloadUpdate(
          updateInfo,
          (progress: UpdateProgress) => {
            // 向渲染進程發送下載進度
            if (this.mainWindow) {
              this.mainWindow.webContents.send('update:download-progress', progress);
            }
          }
        );
      } catch (error) {
        console.error('下載更新失敗:', error);
        throw error;
      }
    });

    // 安裝更新
    ipcMain.handle('update:install', async (_, updateFilePath: string) => {
      try {
        await this.updateService.installUpdate(updateFilePath);
      } catch (error) {
        console.error('安裝更新失敗:', error);
        throw error;
      }
    });

    // 檢查待安裝的更新
    ipcMain.handle('update:check-pending', async () => {
      try {
        return await this.updateService.checkPendingUpdate();
      } catch (error) {
        console.error('檢查待安裝更新失敗:', error);
        return null;
      }
    });

    // 獲取當前版本
    ipcMain.handle('update:get-version', () => {
      return this.updateService.getCurrentVersion();
    });

    // 檢查更新狀態
    ipcMain.handle('update:get-status', () => {
      return {
        isChecking: this.updateService.isCheckingForUpdates(),
        isDownloading: this.updateService.isDownloadingUpdate(),
        currentVersion: this.updateService.getCurrentVersion()
      };
    });

    // 自動檢查更新（可配置）
    ipcMain.handle('update:auto-check', async () => {
      try {
        // 檢查用戶設置是否啟用自動更新
        const autoUpdateEnabled = await this.getAutoUpdateSetting();
        
        if (autoUpdateEnabled) {
          const result = await this.updateService.checkForUpdates();
          
          if (result.hasUpdate && this.mainWindow) {
            // 通知渲染進程有可用更新
            this.mainWindow.webContents.send('update:available', result);
          }
          
          return result;
        }
        
        return {
          hasUpdate: false,
          currentVersion: this.updateService.getCurrentVersion(),
          error: '自動更新已禁用'
        };
      } catch (error) {
        console.error('自動檢查更新失敗:', error);
        return {
          hasUpdate: false,
          currentVersion: this.updateService.getCurrentVersion(),
          error: error instanceof Error ? error.message : '自動檢查更新失敗'
        };
      }
    });
  }

  /**
   * 獲取自動更新設置
   */
  private async getAutoUpdateSetting(): Promise<boolean> {
    try {
      // 從設置服務獲取自動更新配置
      // 這裡應該與設置系統集成
      return true; // 默認啟用
    } catch (error) {
      console.error('獲取自動更新設置失敗:', error);
      return false;
    }
  }

  /**
   * 啟動時檢查待安裝的更新
   */
  async checkPendingUpdateOnStartup() {
    try {
      const pendingUpdatePath = await this.updateService.checkPendingUpdate();
      
      if (pendingUpdatePath && this.mainWindow) {
        // 通知渲染進程有待安裝的更新
        this.mainWindow.webContents.send('update:pending-install', pendingUpdatePath);
      }
    } catch (error) {
      console.error('檢查待安裝更新失敗:', error);
    }
  }

  /**
   * 定期檢查更新
   */
  startPeriodicUpdateCheck(intervalHours: number = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        const autoUpdateEnabled = await this.getAutoUpdateSetting();
        
        if (autoUpdateEnabled) {
          console.log('執行定期更新檢查...');
          const result = await this.updateService.checkForUpdates();
          
          if (result.hasUpdate && this.mainWindow) {
            this.mainWindow.webContents.send('update:available', result);
          }
        }
      } catch (error) {
        console.error('定期更新檢查失敗:', error);
      }
    }, intervalMs);
  }
}

export default UpdateHandlers;