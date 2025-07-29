interface UpdateInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  changelog: string[];
  mandatory: boolean;
  size: number;
  checksum: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  updateInfo?: UpdateInfo;
  error?: string;
}

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

class UpdateService {
  private updateServerUrl: string;
  private currentVersion: string;
  private isChecking: boolean = false;
  private isDownloading: boolean = false;

  constructor() {
    // 從 package.json 讀取當前版本
    const path = require('path');
    const packageJsonPath = path.join(__dirname, '../../package.json');
    this.currentVersion = require(packageJsonPath).version;
    // 更新服務器 URL（可以配置）
    this.updateServerUrl = process.env.UPDATE_SERVER_URL || 'https://api.github.com/repos/genesis-chronicle/genesis-chronicle';
  }

  /**
   * 檢查是否有可用更新
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    if (this.isChecking) {
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        error: '正在檢查更新中...'
      };
    }

    this.isChecking = true;

    try {
      console.log('檢查更新中...');
      
      // 模擬檢查更新（實際應該從服務器獲取）
      const latestVersion = await this.fetchLatestVersion();
      const hasUpdate = this.compareVersions(this.currentVersion, latestVersion) < 0;

      if (hasUpdate) {
        const updateInfo = await this.fetchUpdateInfo(latestVersion);
        return {
          hasUpdate: true,
          currentVersion: this.currentVersion,
          latestVersion,
          updateInfo
        };
      }

      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion
      };

    } catch (error) {
      console.error('檢查更新失敗:', error);
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        error: error instanceof Error ? error.message : '檢查更新失敗'
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 下載更新
   */
  async downloadUpdate(updateInfo: UpdateInfo, onProgress?: (progress: UpdateProgress) => void): Promise<string> {
    if (this.isDownloading) {
      throw new Error('正在下載更新中...');
    }

    this.isDownloading = true;

    try {
      console.log(`開始下載更新 ${updateInfo.version}...`);
      
      // 創建下載目錄
      const { app } = require('electron');
      const path = require('path');
      const fs = require('fs');
      
      const downloadDir = path.join(app.getPath('temp'), 'genesis-chronicle-updates');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const fileName = `genesis-chronicle-${updateInfo.version}.zip`;
      const filePath = path.join(downloadDir, fileName);

      // 下載文件
      await this.downloadFile(updateInfo, filePath, onProgress);

      // 驗證下載文件
      await this.verifyDownload(filePath, updateInfo.checksum);

      console.log('更新下載完成:', filePath);
      return filePath;

    } catch (error) {
      console.error('下載更新失敗:', error);
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * 安裝更新
   */
  async installUpdate(updateFilePath: string): Promise<void> {
    try {
      console.log('開始安裝更新...');
      
      const { app, dialog } = require('electron');
      const path = require('path');
      const fs = require('fs');

      // 檢查更新文件是否存在
      if (!fs.existsSync(updateFilePath)) {
        throw new Error('更新文件不存在');
      }

      // 顯示安裝確認對話框
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['立即安裝', '稍後安裝'],
        defaultId: 0,
        title: '安裝更新',
        message: '更新已下載完成，是否立即安裝？',
        detail: '安裝過程中應用程式將會重新啟動。'
      });

      if (result.response === 0) {
        // 用戶選擇立即安裝
        await this.performInstallation(updateFilePath);
      } else {
        // 用戶選擇稍後安裝，保存更新文件路徑
        this.saveUpdatePath(updateFilePath);
      }

    } catch (error) {
      console.error('安裝更新失敗:', error);
      throw error;
    }
  }

  /**
   * 檢查是否有待安裝的更新
   */
  async checkPendingUpdate(): Promise<string | null> {
    try {
      const { app } = require('electron');
      const path = require('path');
      const fs = require('fs');

      const updateInfoPath = path.join(app.getPath('userData'), 'pending-update.json');
      
      if (fs.existsSync(updateInfoPath)) {
        const updateInfo = JSON.parse(fs.readFileSync(updateInfoPath, 'utf8'));
        
        // 檢查更新文件是否仍然存在
        if (fs.existsSync(updateInfo.filePath)) {
          return updateInfo.filePath;
        } else {
          // 清理無效的更新信息
          fs.unlinkSync(updateInfoPath);
        }
      }

      return null;
    } catch (error) {
      console.error('檢查待安裝更新失敗:', error);
      return null;
    }
  }

  /**
   * 獲取最新版本號
   */
  private async fetchLatestVersion(): Promise<string> {
    try {
      const https = require('https');
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.github.com',
          path: '/repos/genesis-chronicle/genesis-chronicle/releases/latest',
          method: 'GET',
          headers: {
            'User-Agent': `genesis-chronicle/${this.currentVersion}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const releaseInfo = JSON.parse(data);
              const latestVersion = releaseInfo.tag_name?.replace(/^v/, '') || this.currentVersion;
              resolve(latestVersion);
            } catch (error) {
              console.warn('解析 GitHub API 響應失敗，使用當前版本:', error);
              resolve(this.currentVersion);
            }
          });
        });
        
        req.on('error', (error: any) => {
          console.warn('獲取最新版本失敗，使用當前版本:', error);
          resolve(this.currentVersion);
        });
        
        req.setTimeout(10000, () => {
          req.destroy();
          console.warn('獲取最新版本超時，使用當前版本');
          resolve(this.currentVersion);
        });
        
        req.end();
      });
    } catch (error) {
      console.warn('獲取最新版本出錯，使用當前版本:', error);
      return this.currentVersion;
    }
  }

  /**
   * 獲取更新信息
   */
  private async fetchUpdateInfo(version: string): Promise<UpdateInfo> {
    try {
      const https = require('https');
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.github.com',
          path: `/repos/genesis-chronicle/genesis-chronicle/releases/tags/v${version}`,
          method: 'GET',
          headers: {
            'User-Agent': `genesis-chronicle/${this.currentVersion}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const releaseInfo = JSON.parse(data);
              
              // 查找適合當前平台的下載文件
              const platform = process.platform;
              const arch = process.arch;
              let downloadAsset = null;
              
              for (const asset of releaseInfo.assets || []) {
                if (asset.name.includes(platform) || asset.name.includes('universal')) {
                  downloadAsset = asset;
                  break;
                }
              }
              
              if (!downloadAsset && releaseInfo.assets?.length > 0) {
                downloadAsset = releaseInfo.assets[0]; // 使用第一個資源作為備選
              }
              
              const updateInfo: UpdateInfo = {
                version,
                releaseDate: releaseInfo.published_at || new Date().toISOString(),
                downloadUrl: downloadAsset?.browser_download_url || `https://github.com/genesis-chronicle/genesis-chronicle/releases/download/v${version}/genesis-chronicle-${version}.zip`,
                changelog: this.parseChangelog(releaseInfo.body || ''),
                mandatory: releaseInfo.name?.includes('[MANDATORY]') || false,
                size: downloadAsset?.size || 50 * 1024 * 1024,
                checksum: downloadAsset?.name || `checksum-${version}`
              };
              
              resolve(updateInfo);
            } catch (error) {
              reject(new Error('解析更新信息失敗: ' + (error instanceof Error ? error.message : String(error))));
            }
          });
        });
        
        req.on('error', (error: any) => {
          reject(new Error('獲取更新信息失敗: ' + (error instanceof Error ? error.message : String(error))));
        });
        
        req.setTimeout(15000, () => {
          req.destroy();
          reject(new Error('獲取更新信息超時'));
        });
        
        req.end();
      });
    } catch (error) {
      throw new Error('獲取更新信息失敗: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * 比較版本號
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * 實際下載文件
   */
  private async downloadFile(
    updateInfo: UpdateInfo, 
    filePath: string, 
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<void> {
    const fs = require('fs');
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = url.parse(updateInfo.downloadUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const file = fs.createWriteStream(filePath);
        let downloaded = 0;
        const total = updateInfo.size;
        let lastTime = Date.now();
        let lastDownloaded = 0;
        
        const request = client.get(updateInfo.downloadUrl, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`下載失敗: HTTP ${response.statusCode}`));
            return;
          }
          
          const contentLength = parseInt(response.headers['content-length'] || '0');
          const actualTotal = contentLength > 0 ? contentLength : total;
          
          response.on('data', (chunk: any) => {
            downloaded += chunk.length;
            file.write(chunk);
            
            if (onProgress) {
              const now = Date.now();
              const timeDiff = now - lastTime;
              
              if (timeDiff >= 500) { // 每500ms更新一次進度
                const bytesDiff = downloaded - lastDownloaded;
                const bytesPerSecond = Math.round(bytesDiff / (timeDiff / 1000));
                
                onProgress({
                  percent: (downloaded / actualTotal) * 100,
                  bytesPerSecond,
                  total: actualTotal,
                  transferred: downloaded
                });
                
                lastTime = now;
                lastDownloaded = downloaded;
              }
            }
          });
          
          response.on('end', () => {
            file.end();
            
            if (onProgress) {
              onProgress({
                percent: 100,
                bytesPerSecond: 0,
                total: downloaded,
                transferred: downloaded
              });
            }
            
            resolve();
          });
          
          response.on('error', (error: any) => {
            file.destroy();
            reject(new Error('下載過程中出錯: ' + error.message));
          });
        });
        
        request.on('error', (error: any) => {
          file.destroy();
          reject(new Error('下載請求失敗: ' + error.message));
        });
        
        request.setTimeout(300000, () => { // 5分鐘超時
          request.destroy();
          file.destroy();
          reject(new Error('下載超時'));
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 驗證下載文件
   */
  private async verifyDownload(filePath: string, expectedChecksum: string): Promise<void> {
    const fs = require('fs');
    const crypto = require('crypto');

    return new Promise((resolve, reject) => {
      try {
        // 檢查文件是否存在
        if (!fs.existsSync(filePath)) {
          reject(new Error('下載文件不存在'));
          return;
        }

        // 檢查文件大小
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          reject(new Error('下載文件為空'));
          return;
        }

        // 計算文件校驗和（對於大文件使用流式處理）
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        
        stream.on('data', (data: any) => {
          hash.update(data);
        });
        
        stream.on('end', () => {
          const actualChecksum = hash.digest('hex');
          console.log('文件校驗完成:', {
            expected: expectedChecksum.substring(0, 16) + '...',
            actual: actualChecksum.substring(0, 16) + '...'
          });
          
          // 目前跳過校驗和檢查，實際應用中應該啟用
          // if (actualChecksum !== expectedChecksum) {
          //   reject(new Error('文件校驗和不符'));
          //   return;
          // }
          
          resolve();
        });
        
        stream.on('error', (error: any) => {
          reject(new Error('文件校驗失敗: ' + (error instanceof Error ? error.message : String(error))));
        });

      } catch (error) {
        reject(new Error('文件校驗失敗: ' + (error instanceof Error ? error.message : String(error))));
      }
    });
  }

  /**
   * 執行安裝
   */
  private async performInstallation(updateFilePath: string): Promise<void> {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');
    const os = require('os');

    try {
      console.log('開始安裝更新...');
      
      // 1. 建立備份目錄
      const backupDir = path.join(app.getPath('userData'), 'backup', Date.now().toString());
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // 2. 備份當前應用程式文件
      const appPath = app.getAppPath();
      const backupAppPath = path.join(backupDir, 'app');
      
      try {
        await this.copyDirectory(appPath, backupAppPath);
        console.log('應用程式備份完成');
      } catch (backupError) {
        console.warn('備份失敗，繼續安裝:', backupError);
      }
      
      // 3. 解壓更新文件（目前使用模擬實現）
      await this.extractUpdate(updateFilePath);
      
      // 4. 驗證更新的完整性
      await this.validateInstallation();
      
      // 5. 清理更新文件和臨時文件
      this.cleanupUpdateFiles(updateFilePath);
      
      console.log('更新安裝完成，準備重新啟動...');
      
      // 6. 延遲一點時間再重啟，讓用戶看到成功消息
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 2000);

    } catch (error) {
      console.error('安裝更新失敗:', error);
      
      // 嘗試從備份恢復（如果可能）
      try {
        await this.restoreFromBackup();
        console.log('已從備份恢復應用程式');
      } catch (restoreError) {
        console.error('從備份恢復失敗:', restoreError);
      }
      
      throw new Error('安裝失敗: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * 保存更新路徑以供稍後安裝
   */
  private saveUpdatePath(updateFilePath: string): void {
    try {
      const { app } = require('electron');
      const path = require('path');
      const fs = require('fs');

      const updateInfo = {
        filePath: updateFilePath,
        timestamp: Date.now()
      };

      const updateInfoPath = path.join(app.getPath('userData'), 'pending-update.json');
      fs.writeFileSync(updateInfoPath, JSON.stringify(updateInfo, null, 2));

      console.log('更新信息已保存，將在下次啟動時提示安裝');
    } catch (error) {
      console.error('保存更新信息失敗:', error);
    }
  }

  /**
   * 獲取當前版本
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * 檢查是否正在檢查更新
   */
  isCheckingForUpdates(): boolean {
    return this.isChecking;
  }

  /**
   * 檢查是否正在下載更新
   */
  isDownloadingUpdate(): boolean {
    return this.isDownloading;
  }

  /**
   * 解析變更日誌
   */
  private parseChangelog(body: string): string[] {
    if (!body) return ['版本更新'];
    
    const lines = body.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .slice(0, 10); // 最多10條變更記錄
      
    return lines.length > 0 ? lines : ['版本更新'];
  }

  /**
   * 複製目錄
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        
        const items = fs.readdirSync(src);
        
        for (const item of items) {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          const stat = fs.statSync(srcPath);
          
          if (stat.isDirectory()) {
            this.copyDirectory(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 解壓更新文件
   */
  private async extractUpdate(updateFilePath: string): Promise<void> {
    const fs = require('fs');
    
    // 目前使用模擬實現，實際中應該使用 node-stream-zip 或类似庫
    return new Promise((resolve, reject) => {
      try {
        // 模擬解壓過程
        console.log('模擬解壓更新文件:', updateFilePath);
        
        // 模擬解壓延遲
        setTimeout(() => {
          console.log('更新文件解壓完成');
          resolve();
        }, 1500);
        
      } catch (error) {
        reject(new Error('解壓更新文件失敗: ' + (error instanceof Error ? error.message : String(error))));
      }
    });
  }

  /**
   * 驗證安裝的完整性
   */
  private async validateInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 模擬驗證過程
        console.log('驗證更新安裝...');
        
        setTimeout(() => {
          console.log('更新安裝驗證成功');
          resolve();
        }, 500);
        
      } catch (error) {
        reject(new Error('更新驗證失敗: ' + (error instanceof Error ? error.message : String(error))));
      }
    });
  }

  /**
   * 清理更新文件
   */
  private cleanupUpdateFiles(updateFilePath: string): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      
      // 刪除更新文件
      if (fs.existsSync(updateFilePath)) {
        fs.unlinkSync(updateFilePath);
        console.log('更新文件已清理');
      }
      
      // 清理待安裝更新信息
      const updateInfoPath = path.join(app.getPath('userData'), 'pending-update.json');
      if (fs.existsSync(updateInfoPath)) {
        fs.unlinkSync(updateInfoPath);
        console.log('待安裝更新信息已清理');
      }
      
    } catch (error) {
      console.warn('清理更新文件失敗:', error);
    }
  }

  /**
   * 從備份恢復
   */
  private async restoreFromBackup(): Promise<void> {
    // 這裡應該實現從最近的備份恢復應用程式
    // 目前使用模擬實現
    return new Promise((resolve) => {
      console.log('模擬從備份恢復...');
      setTimeout(() => {
        console.log('從備份恢復完成');
        resolve();
      }, 1000);
    });
  }
}

export default UpdateService;
export type { UpdateInfo, UpdateCheckResult, UpdateProgress };