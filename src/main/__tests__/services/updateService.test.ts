import UpdateService from '../../services/updateService';

describe('UpdateService', () => {
  let updateService: UpdateService;

  beforeEach(() => {
    updateService = new UpdateService();
  });

  describe('版本比較', () => {
    it('應該正確比較版本號', () => {
      // 使用反射獲取私有方法進行測試
      const compareVersions = (updateService as any).compareVersions.bind(updateService);
      
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });

    it('應該處理不同長度的版本號', () => {
      const compareVersions = (updateService as any).compareVersions.bind(updateService);
      
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    });
  });

  describe('基本功能', () => {
    it('應該返回當前版本', () => {
      const version = updateService.getCurrentVersion();
      expect(typeof version).toBe('string');
      expect(version).toBeTruthy();
    });

    it('應該正確報告檢查狀態', () => {
      expect(updateService.isCheckingForUpdates()).toBe(false);
      expect(updateService.isDownloadingUpdate()).toBe(false);
    });
  });

  describe('更新檢查', () => {
    it('應該能夠檢查更新而不會拋出錯誤', async () => {
      // 這個測試可能會因為沒有真實的服務器而失敗，但不應該拋出未捕獲的異常
      const result = await updateService.checkForUpdates();
      
      expect(result).toHaveProperty('hasUpdate');
      expect(result).toHaveProperty('currentVersion');
      expect(typeof result.hasUpdate).toBe('boolean');
      expect(typeof result.currentVersion).toBe('string');
    });

    it('應該防止重複的檢查請求', async () => {
      // 啟動第一個檢查
      const firstCheck = updateService.checkForUpdates();
      
      // 在第一個檢查完成之前嘗試第二個檢查
      const secondCheck = updateService.checkForUpdates();
      
      const firstResult = await firstCheck;
      const secondResult = await secondCheck;
      
      // 第二次檢查應該返回錯誤消息，指示正在檢查中
      expect(secondResult.error).toContain('正在檢查更新中');
    });
  });

  describe('變更日誌解析', () => {
    it('應該正確解析變更日誌', () => {
      const parseChangelog = (updateService as any).parseChangelog.bind(updateService);
      
      const changelog1 = 'Fix bug\nAdd feature\nImprove performance';
      const result1 = parseChangelog(changelog1);
      expect(result1).toEqual(['Fix bug', 'Add feature', 'Improve performance']);
      
      const changelog2 = '';
      const result2 = parseChangelog(changelog2);
      expect(result2).toEqual(['版本更新']);
      
      const changelog3 = '# Release Notes\n\nFix bug\n\nAdd feature';
      const result3 = parseChangelog(changelog3);
      expect(result3).toEqual(['Fix bug', 'Add feature']);
    });

    it('應該限制變更日誌條目數量', () => {
      const parseChangelog = (updateService as any).parseChangelog.bind(updateService);
      
      const longChangelog = Array.from({ length: 15 }, (_, i) => `Change ${i + 1}`).join('\n');
      const result = parseChangelog(longChangelog);
      
      expect(result.length).toBe(10); // 最多10條
    });
  });
});