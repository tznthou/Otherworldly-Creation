/**
 * 電子書排版配置持久化 Hook
 * 自動儲存和載入 ebookPreparation 狀態到 localStorage
 */

import { useEffect, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useAppDispatch } from './redux';
import {
  initializeConfig,
  hydrateConfig,
  resetConfig,
  setError
} from '../store/slices/ebookPreparationSlice';
import { EbookPreparationConfig } from '../types/ebookPreparation';
import { createLogger } from '../utils/logger';

const log = createLogger('useEbookPreparationPersistence');

const STORAGE_KEY = 'genesis-chronicle-ebook-preparation';
/** 歸屬錯位的配置移放於此，避免直接捨棄使用者的排版工作 */
const QUARANTINE_KEY = 'genesis-chronicle-ebook-preparation-quarantine';

export interface SaveResult {
  ok: boolean;
  error?: string;
}

/**
 * 電子書排版配置持久化 Hook
 *
 * @param projectId 專案 ID（用於區分不同專案的配置）
 * @param autoSave 是否自動儲存（預設 true）
 */
export const useEbookPreparationPersistence = (
  projectId: string | null,
  autoSave: boolean = true
) => {
  const dispatch = useAppDispatch();
  const currentConfig = useSelector((state: RootState) => state.ebookPreparation.currentConfig);

  // 記錄已完成還原的專案 ID。還原完成前不得建立空白配置，否則呼叫端讀到的
  // isInitialized 還是上一輪 render 的 false，會立刻用空白設定蓋掉剛讀回來的資料。
  // 用專案 ID 而非布林值，切換專案時才會自動失效。
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(null);
  const isHydrated = !!projectId && hydratedProjectId === projectId;

  // 目前配置是否確實屬於這個專案：切換專案的瞬間，store 裡仍是前一個專案的配置
  const belongsToProject = !!currentConfig && !!projectId && currentConfig.projectId === projectId;

  /**
   * 驗證從 localStorage 載入的配置結構是否合法
   *
   * 逐層檢查到圖片項目為止：JSON round-trip 會把 undefined 變成 null，
   * 只驗到陣列層的話，`[null]` 這種內容會等到畫面上取用欄位時才炸開。
   */
  const isStructurallyValid = useCallback((config: unknown): config is EbookPreparationConfig => {
    if (!config || typeof config !== 'object') return false;
    const c = config as Record<string, unknown>;
    if (typeof c.projectId !== 'string' || c.projectId.length === 0) return false;
    if (!Array.isArray(c.chapterConfigurations)) return false;

    return c.chapterConfigurations.every(entry => {
      if (!entry || typeof entry !== 'object') return false;
      const chapter = entry as Record<string, unknown>;
      if (typeof chapter.chapterId !== 'string') return false;
      if (!Array.isArray(chapter.images)) return false;

      return chapter.images.every(item => {
        if (!item || typeof item !== 'object') return false;
        const image = item as Record<string, unknown>;
        return typeof image.imageId === 'string' && typeof image.position === 'string';
      });
    });
  }, []);

  /**
   * 將歸屬錯位的配置搬到隔離區
   *
   * 舊版的 saveToStorage 沒有歸屬檢查，切換專案時會把前一個專案的配置寫進
   * 新專案的 key，因此既有使用者的 localStorage 可能已存在錯位資料。
   * 直接捨棄會讓那份排版工作永久消失，所以先留一份再清空。
   *
   * 是「搬移」不是「複製」：寫入隔離區成功後即從原 key 移除，避免兩份完整
   * 資料同時佔用配額。回傳是否成功——呼叫端必須據此決定要不要往下走，
   * 隔離失敗卻繼續重設與自動儲存，等於親手毀掉這個機制要保護的東西。
   */
  const quarantineConfig = useCallback((key: string, config: unknown): boolean => {
    try {
      const stored = localStorage.getItem(QUARANTINE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const bucket = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      bucket[key] = { quarantinedAt: new Date().toISOString(), config };
      localStorage.setItem(QUARANTINE_KEY, JSON.stringify(bucket));

      // 隔離區寫入成功後才移除原 entry。這一步是縮減資料量，
      // 即使失敗也只是兩邊都留著，不會造成遺失。
      try {
        const mainStored = localStorage.getItem(STORAGE_KEY);
        if (mainStored) {
          const allConfigs = JSON.parse(mainStored);
          if (allConfigs && typeof allConfigs === 'object' && !Array.isArray(allConfigs)) {
            delete allConfigs[key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
          }
        }
      } catch (error) {
        log.warn('已隔離但未能清除原 entry，資料仍安全:', error);
      }

      log.warn('已將歸屬錯位的配置移至隔離區:', key);
      return true;
    } catch (error) {
      log.error('隔離錯位配置失敗:', error);
      return false;
    }
  }, []);

  /**
   * 從 localStorage 載入配置
   */
  const loadFromStorage = useCallback(() => {
    if (!projectId) return;

    // 只有確認不會毀掉既有資料時才標記還原完成。標記後呼叫端會建立空白配置
    // 並在一秒後自動存檔，所以任何「資料還沒安置好」的情況都不能標記。
    let safeToProceed = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let projectConfig: unknown = null;

      if (stored) {
        const allConfigs = JSON.parse(stored);
        if (allConfigs && typeof allConfigs === 'object' && !Array.isArray(allConfigs)) {
          projectConfig = (allConfigs as Record<string, unknown>)[projectId] ?? null;
        } else {
          log.warn('localStorage 資料格式異常，略過載入');
        }
      }

      if (isStructurallyValid(projectConfig)) {
        if (projectConfig.projectId === projectId) {
          // 必須用 hydrateConfig 直接取代：updateConfig 是 patch 語意且帶有
          // `if (state.currentConfig)` 守衛，冷啟動時會靜默失效
          dispatch(hydrateConfig(projectConfig));
          log.debug('已載入專案配置:', projectId);
        } else if (quarantineConfig(projectId, projectConfig)) {
          // 讀取端也要驗歸屬。只在寫入端擋的話，歷史上錯位寫入的資料仍會被
          // 當成本專案的設定載入，接著被判定為「不屬於本專案」而覆寫掉。
          dispatch(resetConfig());
          dispatch(setError(
            `專案 ${projectId} 的排版設定歸屬不符，已移至隔離區並重設。原設定屬於專案 ${projectConfig.projectId}。`
          ));
        } else {
          // 隔離失敗（多半是儲存空間不足）。此時絕不能往下走：後續的重設與
          // 自動存檔會直接覆寫這份還沒備份的配置。寧可讓功能停在這裡不可用，
          // 也不要靜默毀掉使用者排好的版面。
          safeToProceed = false;
          dispatch(setError(
            `專案 ${projectId} 的排版設定歸屬不符，且無法移至隔離區（可能是瀏覽器儲存空間不足）。` +
            `為避免覆寫，已暫停載入排版設定，請清理儲存空間後重試。`
          ));
        }
      } else {
        if (projectConfig) {
          log.warn('專案配置結構異常，略過載入:', projectId);
        } else {
          log.debug('專案沒有儲存的配置:', projectId);
        }
        // 沒有可用配置就清空，否則會沿用上一個專案的設定並寫進這個專案的 key
        dispatch(resetConfig());
      }
    } catch (error) {
      log.error('載入配置失敗:', error);
      dispatch(resetConfig());
    } finally {
      if (safeToProceed) {
        setHydratedProjectId(projectId);
      }
    }
  }, [projectId, dispatch, isStructurallyValid, quarantineConfig]);

  /**
   * 儲存配置到 localStorage
   *
   * 回傳儲存結果：配額用盡或序列化失敗時若只記 log，呼叫端會回報「已儲存」，
   * 使用者以為存檔成功而關掉專案，整段排版工作就沒了。
   */
  const saveToStorage = useCallback((): SaveResult => {
    if (!projectId || !currentConfig) {
      return { ok: false, error: '沒有可儲存的配置' };
    }

    // 配置必須屬於目前專案，否則會把前一個專案的設定寫進這個專案的 key
    if (currentConfig.projectId !== projectId) {
      log.warn('配置與目前專案不符，略過儲存', {
        configProjectId: currentConfig.projectId,
        projectId
      });
      return { ok: false, error: '配置與目前專案不符' };
    }

    try {
      // 讀取現有的所有專案配置
      const stored = localStorage.getItem(STORAGE_KEY);
      let allConfigs: Record<string, unknown> = {};
      if (stored) {
        const parsed = JSON.parse(stored);
        allConfigs = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      }

      // 更新當前專案的配置
      allConfigs[projectId] = currentConfig;

      // 儲存回 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
      log.debug('配置已儲存:', projectId);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('儲存配置失敗:', error);
      dispatch(setError(`排版配置儲存失敗：${message}`));
      return { ok: false, error: message };
    }
  }, [projectId, currentConfig, dispatch]);

  /**
   * 清除當前專案的配置
   */
  const clearStorage = useCallback(() => {
    if (!projectId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const allConfigs = JSON.parse(stored);
      delete allConfigs[projectId];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
      dispatch(resetConfig());
      log.debug('配置已清除:', projectId);
    } catch (error) {
      log.error('清除配置失敗:', error);
    }
  }, [projectId, dispatch]);

  /**
   * 初始化配置（如果不存在）
   */
  const initializeForProject = useCallback((bookTitle: string, bookAuthor: string) => {
    if (!projectId) return;

    dispatch(initializeConfig({
      projectId,
      bookTitle,
      bookAuthor
    }));
    log.debug('配置已初始化:', { projectId, bookTitle, bookAuthor });
  }, [projectId, dispatch]);

  // 元件 mount 或切換專案時載入配置
  useEffect(() => {
    if (projectId) {
      setHydratedProjectId(null);
      loadFromStorage();
    }
  }, [projectId, loadFromStorage]);

  // 自動儲存：監聽配置變化。還原完成且配置確實屬於本專案才寫入
  useEffect(() => {
    if (autoSave && isHydrated && belongsToProject) {
      // 延遲儲存，避免頻繁寫入
      const timeoutId = setTimeout(() => {
        saveToStorage();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [autoSave, isHydrated, belongsToProject, saveToStorage]);

  return {
    loadFromStorage,
    saveToStorage,
    clearStorage,
    initializeForProject,
    /** localStorage 還原是否已完成，完成前不應建立空白配置 */
    isHydrated,
    /** 目前是否已有屬於本專案的配置 */
    isInitialized: belongsToProject,
    currentConfig
  };
};
