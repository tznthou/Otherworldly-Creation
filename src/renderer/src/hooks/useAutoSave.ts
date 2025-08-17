import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { updateChapter, setSaving, setLastSaved } from '../store/slices/chaptersSlice';
import { addNotification } from '../store/slices/uiSlice';
import { useSettings } from './useSettings';

interface UseAutoSaveOptions {
  delay?: number; // 延遲時間（毫秒）
  enabled?: boolean; // 是否啟用自動儲存
  onSave?: () => void; // 儲存成功回調
  onError?: (error: Error) => void; // 儲存失敗回調
}

interface AutoSaveStatus {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  nextSaveIn: number; // 下次儲存倒數（秒）
  error: string | null;
}

export const useAutoSave = (options: UseAutoSaveOptions = {}) => {
  const { delay, enabled: optionsEnabled = true, onSave, onError } = options;
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const { currentChapter, saving, lastSaved } = useAppSelector(state => state.chapters);
  
  // 使用設定中的自動儲存配置
  const autoSaveEnabled = optionsEnabled && settings.backup.autoBackup;
  const autoSaveDelay = delay || (settings.backup.backupInterval * 1000); // 轉換為毫秒
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const lastTitleRef = useRef<string>('');
  const hasChangesRef = useRef(false);
  const saveAttemptRef = useRef(0);
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSaved: null,
    nextSaveIn: 0,
    error: null,
  });

  // 更新自動儲存狀態
  const updateStatus = useCallback((status: Partial<AutoSaveStatus>) => {
    setAutoSaveStatus(prev => ({ ...prev, ...status }));
  }, []);

  // 倒數計時器
  const startCountdown = useCallback((seconds: number) => {
    updateStatus({ nextSaveIn: seconds });
    
    const countdown = () => {
      setAutoSaveStatus(prev => {
        if (prev.nextSaveIn <= 1) {
          return { ...prev, nextSaveIn: 0 };
        }
        return { ...prev, nextSaveIn: prev.nextSaveIn - 1 };
      });
    };
    
    countdownRef.current = setInterval(countdown, 1000);
  }, [updateStatus]);

  // 停止倒數計時器
  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    updateStatus({ nextSaveIn: 0 });
  }, [updateStatus]);

  // 手動儲存
  const saveNow = useCallback(async (showNotification = true) => {
    if (!currentChapter || saving) return false;

    try {
      updateStatus({ status: 'saving', error: null });
      stopCountdown();
      
      dispatch(setSaving(true));
      await dispatch(updateChapter(currentChapter)).unwrap();
      
      const now = new Date().toISOString();
      dispatch(setLastSaved(now));
      hasChangesRef.current = false;
      saveAttemptRef.current = 0;
      
      updateStatus({ 
        status: 'saved', 
        lastSaved: new Date(now),
        error: null 
      });
      
      if (showNotification) {
        dispatch(addNotification({
          type: 'success',
          title: '儲存成功',
          message: '章節已儲存',
          duration: 2000,
        }));
      }
      
      onSave?.();
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '儲存時發生未知錯誤';
      console.error('儲存失敗:', error);
      
      saveAttemptRef.current += 1;
      
      updateStatus({ 
        status: 'error', 
        error: errorMessage 
      });
      
      if (showNotification) {
        dispatch(addNotification({
          type: 'error',
          title: '儲存失敗',
          message: `章節儲存失敗: ${errorMessage}`,
          duration: 5000,
        }));
      }
      
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      
      // 如果儲存失敗次數少於3次，嘗試重新儲存
      if (saveAttemptRef.current < 3) {
        setTimeout(() => {
          if (hasChangesRef.current) {
            saveNow(false);
          }
        }, 5000 * saveAttemptRef.current); // 遞增延遲
      }
      
      return false;
      
    } finally {
      dispatch(setSaving(false));
    }
  }, [currentChapter, saving, dispatch, updateStatus, stopCountdown, onSave, onError]);

  // 檢查內容是否有變化
  const checkForChanges = useCallback(() => {
    if (!currentChapter) return false;
    
    const currentContent = JSON.stringify(currentChapter.content);
    const currentTitle = currentChapter.title;
    
    const contentChanged = currentContent !== lastContentRef.current;
    const titleChanged = currentTitle !== lastTitleRef.current;
    const hasChanged = contentChanged || titleChanged;
    
    if (hasChanged) {
      lastContentRef.current = currentContent;
      lastTitleRef.current = currentTitle;
      hasChangesRef.current = true;
      
      // 重置儲存嘗試次數
      saveAttemptRef.current = 0;
    }
    
    return hasChanged;
  }, [currentChapter]);

  // 觸發自動儲存
  const triggerAutoSave = useCallback(() => {
    if (!autoSaveEnabled || !currentChapter || saving) return;

    // 清除之前的定時器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    stopCountdown();

    // 檢查是否有變化
    if (checkForChanges()) {
      updateStatus({ status: 'pending' });
      
      // 開始倒數
      const delayInSeconds = Math.ceil(autoSaveDelay / 1000);
      startCountdown(delayInSeconds);
      
      // 設置新的定時器
      timeoutRef.current = setTimeout(() => {
        if (hasChangesRef.current) {
          saveNow(false); // 自動儲存不顯示通知
        }
      }, autoSaveDelay);
    }
  }, [autoSaveEnabled, currentChapter, saving, autoSaveDelay, checkForChanges, saveNow, updateStatus, startCountdown, stopCountdown]);

  // 強制儲存（忽略變更檢查）
  const forceSave = useCallback(async () => {
    if (!currentChapter) return false;
    hasChangesRef.current = true;
    return await saveNow(true);
  }, [currentChapter, saveNow]);

  // 監聽章節內容變化
  useEffect(() => {
    if (currentChapter) {
      triggerAutoSave();
    }
  }, [currentChapter?.content, currentChapter?.title, currentChapter, triggerAutoSave]);

  // 監聽設定變化
  useEffect(() => {
    if (!autoSaveEnabled) {
      // 如果自動儲存被禁用，清除定時器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      stopCountdown();
      updateStatus({ status: 'idle', nextSaveIn: 0 });
    }
  }, [autoSaveEnabled, stopCountdown, updateStatus]);

  // 組件卸載時清理定時器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopCountdown();
    };
  }, [stopCountdown]);

  // 頁面卸載前儲存
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChangesRef.current && currentChapter) {
        event.preventDefault();
        event.returnValue = '您有未儲存的變更，確定要離開嗎？';
        
        // 嘗試同步儲存
        if (navigator.sendBeacon) {
          try {
            const data = JSON.stringify({
              action: 'save',
              chapter: {
                ...currentChapter,
                content: JSON.stringify(currentChapter.content),
              }
            });
            navigator.sendBeacon('/api/emergency-save', data);
          } catch (error) {
            console.error('緊急儲存失敗:', error);
          }
        }
        
        return event.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasChangesRef.current) {
        // 頁面隱藏時立即儲存
        saveNow(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentChapter, saveNow]);

  // 監聽快捷鍵儲存
  useEffect(() => {
    const handleShortcutSave = () => {
      forceSave();
    };

    document.addEventListener('shortcut:save', handleShortcutSave);
    
    return () => {
      document.removeEventListener('shortcut:save', handleShortcutSave);
    };
  }, [forceSave]);

  return {
    saveNow: forceSave,
    hasUnsavedChanges: hasChangesRef.current,
    isSaving: saving,
    autoSaveEnabled,
    autoSaveStatus,
    lastSaved: lastSaved || autoSaveStatus.lastSaved,
  };
};