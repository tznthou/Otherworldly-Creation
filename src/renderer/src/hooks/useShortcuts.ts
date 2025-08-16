import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { openModal } from '../store/slices/uiSlice';

/**
 * 全局快捷鍵管理 Hook
 * 處理應用程式級別的快捷鍵功能
 */
export const useShortcuts = () => {
  const dispatch = useAppDispatch();
  const shortcuts = useAppSelector(state => state.settings.settings.shortcuts);

  // 解析快捷鍵字串 (例如 "Ctrl+S" -> { ctrl: true, key: 's' })
  const parseShortcut = useCallback((shortcut: string) => {
    const parts = shortcut.toLowerCase().split('+');
    return {
      ctrl: parts.includes('ctrl'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('cmd') || parts.includes('meta'),
      key: parts[parts.length - 1].toLowerCase()
    };
  }, []);

  // 檢查按鍵事件是否匹配快捷鍵
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: string) => {
    const parsed = parseShortcut(shortcut);
    return (
      event.ctrlKey === parsed.ctrl &&
      event.altKey === parsed.alt &&
      event.shiftKey === parsed.shift &&
      event.metaKey === parsed.meta &&
      event.key.toLowerCase() === parsed.key
    );
  }, [parseShortcut]);

  // 快捷鍵處理函數
  const handleShortcut = useCallback((action: string) => {
    console.log(`執行快捷鍵動作: ${action}`);
    
    switch (action) {
      case 'save':
        // 觸發當前頁面的儲存功能
        document.dispatchEvent(new CustomEvent('shortcut:save'));
        break;
        
      case 'newProject':
        dispatch(openModal('createProject'));
        break;
        
      case 'openProject':
        // TODO: 實現開啟專案對話框
        console.log('開啟專案功能待實現');
        break;
        
      case 'aiContinue':
        // 觸發 AI 續寫（如果在編輯器中）
        document.dispatchEvent(new CustomEvent('shortcut:aiContinue'));
        break;
        
      case 'toggleSidebar':
        // 觸發側邊欄切換
        document.dispatchEvent(new CustomEvent('shortcut:toggleSidebar'));
        break;
        
      case 'toggleFullscreen':
        // 切換全螢幕
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
        
      case 'find':
        // 觸發搜尋功能
        document.dispatchEvent(new CustomEvent('shortcut:find'));
        break;
        
      case 'replace':
        // 觸發替換功能
        document.dispatchEvent(new CustomEvent('shortcut:replace'));
        break;
        
      case 'undo':
        // 觸發撤銷
        document.dispatchEvent(new CustomEvent('shortcut:undo'));
        break;
        
      case 'redo':
        // 觸發重做
        document.dispatchEvent(new CustomEvent('shortcut:redo'));
        break;
        
      default:
        console.warn(`未知的快捷鍵動作: ${action}`);
    }
  }, [dispatch]);

  // 鍵盤事件處理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 排除輸入框等元素
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true') {
      return;
    }

    // 檢查每個快捷鍵
    for (const [action, shortcut] of Object.entries(shortcuts)) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        handleShortcut(action);
        break;
      }
    }
  }, [shortcuts, matchesShortcut, handleShortcut]);

  // 註冊全局鍵盤事件監聽器
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  // 提供給其他組件使用的快捷鍵信息
  return {
    shortcuts,
    isShortcut: (event: KeyboardEvent, action: string) => {
      const shortcut = shortcuts[action];
      return shortcut ? matchesShortcut(event, shortcut) : false;
    },
    triggerShortcut: handleShortcut,
  };
};