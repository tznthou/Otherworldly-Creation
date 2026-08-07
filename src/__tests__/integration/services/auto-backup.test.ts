/**
 * 自動備份接線測試
 *
 * 這個服務在 2026-08-07 之前從未執行過一次：設定預設「已開啟」、UI 有倒數
 * 指示器，而 initialize() 全 codebase 零呼叫，setInterval 從未註冊。
 * 所以這裡守的第一件事不是備份內容對不對，是「時間到了到底會不會動」。
 *
 * 資料一律走 Tauri 命令通道（api 層 → enhancedSafeInvoke → invoke），
 * 用 mockTauriCommand 攔截；設定來源用 spyOn 覆寫單一方法，
 * 不整個換掉 SettingsService 模組。
 */

import { mockTauriCommand } from '../setup';
import { AutoBackupService } from '../../../renderer/src/services/autoBackupService';
import { SettingsService } from '../../../renderer/src/services/settingsService';
import type { AppSettings } from '../../../renderer/src/store/slices/settingsSlice';

const HOUR_MS = 60 * 60 * 1000;

type BackupSettings = AppSettings['backup'];

function stubBackupSettings(overrides: Partial<BackupSettings> = {}): void {
  jest.spyOn(SettingsService, 'loadSettings').mockResolvedValue({
    backup: {
      autoBackup: true,
      backupInterval: 24,
      maxBackupFiles: 10,
      backupLocation: '',
      ...overrides,
    },
  } as AppSettings);
}

/** 記錄每一次 create_auto_backup 收到的參數 */
function captureBackupCalls(): Array<Record<string, unknown> | undefined> {
  const calls: Array<Record<string, unknown> | undefined> = [];
  mockTauriCommand('create_auto_backup', args => {
    calls.push(args);
    return '/tmp/backups/genesis-chronicle-backup-20260807-143022.db';
  });
  return calls;
}

/**
 * 寫入一段備份歷史。要單獨觀察排程行為的測試得先蓋掉「從未備份過」的狀態，
 * 否則 initialize() 會依設計立刻補一次，混進計數裡。
 */
function seedBackupHistory(lastBackupAgoHours: number): void {
  localStorage.setItem(
    'genesis-chronicle-backup-history',
    JSON.stringify({
      lastBackup: new Date(Date.now() - lastBackupAgoHours * HOUR_MS).toISOString(),
      backupCount: 1,
    }),
  );
}

describe('自動備份', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    AutoBackupService.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('設定啟用時，initialize 會註冊排程並在間隔到期時真的寫出備份', async () => {
    const calls = captureBackupCalls();
    seedBackupHistory(1); // 剛備份過，隔離掉啟動補備份
    stubBackupSettings({ backupInterval: 24 });

    await AutoBackupService.initialize();
    expect(calls).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(24 * HOUR_MS);

    expect(calls).toHaveLength(1);
    expect(AutoBackupService.getStatus().lastBackup).not.toBeNull();
  });

  // 桌面 app 不是長駐服務。使用者每天開兩三個小時就關，24 小時的 setInterval
  // 永遠撐不到觸發——光註冊排程不補這一段，接了線照樣一次都不會備份。
  describe('啟動時的補備份', () => {
    it('從未備份過時，啟動就立刻補一次', async () => {
      const calls = captureBackupCalls();
      stubBackupSettings({ backupInterval: 24 });

      await AutoBackupService.initialize();

      expect(calls).toHaveLength(1);
    });

    it('距上次備份已超過間隔時，啟動立刻補一次', async () => {
      const calls = captureBackupCalls();
      seedBackupHistory(30);
      stubBackupSettings({ backupInterval: 24 });

      await AutoBackupService.initialize();

      expect(calls).toHaveLength(1);
    });

    it('距上次備份還沒到間隔時，啟動不重複備份', async () => {
      const calls = captureBackupCalls();
      seedBackupHistory(3);
      stubBackupSettings({ backupInterval: 24 });

      await AutoBackupService.initialize();

      expect(calls).toHaveLength(0);
    });

    it('自動備份關閉時，即使從未備份過也不補', async () => {
      const calls = captureBackupCalls();
      stubBackupSettings({ autoBackup: false });

      await AutoBackupService.initialize();

      expect(calls).toHaveLength(0);
    });
  });

  it('設定停用時不註冊排程，時間過去也不會備份', async () => {
    const calls = captureBackupCalls();
    stubBackupSettings({ autoBackup: false });

    await AutoBackupService.initialize();
    await jest.advanceTimersByTimeAsync(72 * HOUR_MS);

    expect(calls).toHaveLength(0);
    expect(AutoBackupService.getStatus().enabled).toBe(false);
  });

  it('備份帶入設定的位置與保留份數', async () => {
    const calls = captureBackupCalls();
    stubBackupSettings({ backupLocation: '/我的備份資料夾', maxBackupFiles: 3 });

    await AutoBackupService.triggerManualBackup();

    expect(calls).toEqual([{ location: '/我的備份資料夾', maxFiles: 3 }]);
  });

  it('未指定備份位置時不傳 location，交給後端決定預設目錄', async () => {
    const calls = captureBackupCalls();
    stubBackupSettings({ backupLocation: '', maxBackupFiles: 5 });

    await AutoBackupService.triggerManualBackup();

    expect(calls).toEqual([{ location: undefined, maxFiles: 5 }]);
  });

  it('備份失敗時記錄錯誤而不是無聲跳過，排程繼續存活', async () => {
    mockTauriCommand('create_auto_backup', () => {
      throw new Error('磁碟空間不足');
    });
    stubBackupSettings({ backupInterval: 1 });

    await AutoBackupService.initialize();
    await jest.advanceTimersByTimeAsync(1 * HOUR_MS);

    const status = AutoBackupService.getStatus();
    expect(status.error).toContain('磁碟空間不足');
    expect(status.lastBackup).toBeNull();
    expect(status.enabled).toBe(true);
  });

  it('間隔設定會反映在排程上，而不是永遠用 24 小時', async () => {
    const calls = captureBackupCalls();
    seedBackupHistory(1); // 剛備份過，隔離掉啟動補備份
    stubBackupSettings({ backupInterval: 6 });

    await AutoBackupService.initialize();

    await jest.advanceTimersByTimeAsync(5 * HOUR_MS);
    expect(calls).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(1 * HOUR_MS);
    expect(calls).toHaveLength(1);
  });
});
