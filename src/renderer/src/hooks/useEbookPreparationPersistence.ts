/**
 * 電子書排版配置持久化 Hook
 * 自動保存和載入 ebookPreparation 狀態到 localStorage
 */

import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useAppDispatch } from './redux';
import { initializeConfig, updateConfig, resetConfig } from '../store/slices/ebookPreparationSlice';
import { createLogger } from '../utils/logger';

const log = createLogger('useEbookPreparationPersistence');

const STORAGE_KEY = 'genesis-chronicle-ebook-preparation';

/**
 * 電子書排版配置持久化 Hook
 *
 * @param projectId 專案 ID（用於區分不同專案的配置）
 * @param autoSave 是否自動保存（默認 true）
 */
export const useEbookPreparationPersistence = (
  projectId: string | null,
  autoSave: boolean = true
) => {
  const dispatch = useAppDispatch();
  const currentConfig = useSelector((state: RootState) => state.ebookPreparation.currentConfig);
  const ebookState = useSelector((state: RootState) => state.ebookPreparation);

  /**
   * 從 localStorage 載入配置
   */
  const loadFromStorage = useCallback(() => {
    if (!projectId) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        log.debug('📦 沒有找到儲存的配置');
        return;
      }

      const allConfigs = JSON.parse(stored);
      const projectConfig = allConfigs[projectId];

      if (projectConfig) {
        log.debug('📂 載入專案配置:', { projectId, config: projectConfig });
        dispatch(updateConfig(projectConfig));
      } else {
        log.debug('📦 專案沒有儲存的配置:', projectId);
      }
    } catch (error) {
      log.error('❌ 載入配置失敗:', error);
    }
  }, [projectId, dispatch]);

  /**
   * 保存配置到 localStorage
   */
  const saveToStorage = useCallback(() => {
    if (!projectId || !currentConfig) return;

    try {
      // 讀取現有的所有專案配置
      const stored = localStorage.getItem(STORAGE_KEY);
      const allConfigs = stored ? JSON.parse(stored) : {};

      // 更新當前專案的配置
      allConfigs[projectId] = currentConfig;

      // 保存回 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allConfigs));
      log.debug('💾 配置已保存:', { projectId, config: currentConfig });
    } catch (error) {
      log.error('❌ 保存配置失敗:', error);
    }
  }, [projectId, currentConfig]);

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
      log.debug('🗑️ 配置已清除:', projectId);
    } catch (error) {
      log.error('❌ 清除配置失敗:', error);
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
    log.debug('🎉 配置已初始化:', { projectId, bookTitle, bookAuthor });
  }, [projectId, dispatch]);

  // 組件 mount 時載入配置
  useEffect(() => {
    if (projectId) {
      loadFromStorage();
    }
  }, [projectId, loadFromStorage]);

  // 自動保存：監聽配置變化
  useEffect(() => {
    if (autoSave && projectId && currentConfig) {
      // 延遲保存，避免頻繁寫入
      const timeoutId = setTimeout(() => {
        saveToStorage();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [autoSave, projectId, currentConfig, saveToStorage]);

  return {
    loadFromStorage,
    saveToStorage,
    clearStorage,
    initializeForProject,
    isInitialized: !!currentConfig,
    currentConfig,
    ebookState
  };
};
