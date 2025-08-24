import { useCallback, useMemo } from 'react';
import { Editor, Transforms, Range } from 'slate';
import type { Selection } from 'slate';

/**
 * 編輯器上下文狀態類型
 */
export interface EditorContextState {
  hasEditor: boolean;
  hasSelection: boolean;
  isCollapsed: boolean;
  position: number;
  textLength: number;
  selectedText: string;
  currentText: string;
}

/**
 * 編輯器上下文操作類型
 */
export interface EditorContextActions {
  getPosition: () => number;
  setPosition: (position: number) => void;
  getSelection: () => Selection | null;
  collapseSelection: (edge?: 'start' | 'end') => void;
  ensureSelection: () => boolean;
  moveToEnd: () => void;
  insertText: (text: string) => void;
  getTextStats: () => { words: number; characters: number; paragraphs: number };
}

/**
 * 編輯器上下文Hook返回類型
 */
export interface EditorContextHook {
  state: EditorContextState;
  actions: EditorContextActions;
  isReady: boolean;
}

/**
 * 編輯器上下文Hook - 管理編輯器狀態和操作
 * 
 * 功能：
 * - 提供編輯器狀態信息
 * - 封裝常用編輯器操作
 * - 統一的游標和選擇管理
 * - 文本統計和分析
 * - 安全的編輯器操作封裝
 */
export function useEditorContext(editor: Editor | null): EditorContextHook {
  
  /**
   * 計算編輯器狀態
   */
  const state: EditorContextState = useMemo(() => {
    if (!editor) {
      return {
        hasEditor: false,
        hasSelection: false,
        isCollapsed: false,
        position: 0,
        textLength: 0,
        selectedText: '',
        currentText: ''
      };
    }

    const { selection } = editor;
    const currentText = Editor.string(editor, []);
    
    let selectedText = '';
    let position = 0;
    let isCollapsed = false;
    
    if (selection) {
      isCollapsed = Range.isCollapsed(selection);
      position = selection.anchor.offset;
      
      if (!isCollapsed) {
        try {
          selectedText = Editor.string(editor, selection);
        } catch (error) {
          console.warn('獲取選擇文本失敗:', error);
          selectedText = '';
        }
      }
    }

    return {
      hasEditor: true,
      hasSelection: !!selection,
      isCollapsed,
      position,
      textLength: currentText.length,
      selectedText,
      currentText
    };
  }, [editor]);

  /**
   * 獲取當前游標位置
   */
  const getPosition = useCallback((): number => {
    if (!editor?.selection) return 0;
    return editor.selection.anchor.offset;
  }, [editor]);

  /**
   * 設置游標位置
   */
  const setPosition = useCallback((position: number): void => {
    if (!editor) return;
    
    try {
      // 確保位置在有效範圍內
      const textLength = Editor.string(editor, []).length;
      const safePosition = Math.max(0, Math.min(position, textLength));
      
      // 創建新的選擇範圍
      const point = { path: [0], offset: safePosition };
      Transforms.select(editor, { anchor: point, focus: point });
    } catch (error) {
      console.warn('設置游標位置失敗:', error);
    }
  }, [editor]);

  /**
   * 獲取當前選擇範圍
   */
  const getSelection = useCallback((): Selection | null => {
    return editor?.selection || null;
  }, [editor]);

  /**
   * 折疊選擇到游標
   */
  const collapseSelection = useCallback((edge: 'start' | 'end' = 'end'): void => {
    if (!editor?.selection) return;
    
    try {
      Transforms.collapse(editor, { edge });
    } catch (error) {
      console.warn('折疊選擇失敗:', error);
    }
  }, [editor]);

  /**
   * 確保有選擇範圍（如果沒有則移到末尾）
   */
  const ensureSelection = useCallback((): boolean => {
    if (!editor) return false;
    
    if (!editor.selection) {
      try {
        const end = Editor.end(editor, []);
        Transforms.select(editor, end);
        return !!editor.selection;
      } catch (error) {
        console.warn('確保選擇失敗:', error);
        return false;
      }
    }
    
    return true;
  }, [editor]);

  /**
   * 移動到文檔末尾
   */
  const moveToEnd = useCallback((): void => {
    if (!editor) return;
    
    try {
      const end = Editor.end(editor, []);
      Transforms.select(editor, end);
    } catch (error) {
      console.warn('移動到末尾失敗:', error);
    }
  }, [editor]);

  /**
   * 在當前位置插入文本
   */
  const insertText = useCallback((text: string): void => {
    if (!editor || !text) return;
    
    try {
      // 確保有選擇範圍
      if (!ensureSelection()) return;
      
      // 插入文本
      Transforms.insertText(editor, text);
    } catch (error) {
      console.warn('插入文本失敗:', error);
    }
  }, [editor, ensureSelection]);

  /**
   * 獲取文本統計信息
   */
  const getTextStats = useCallback(() => {
    if (!editor) {
      return { words: 0, characters: 0, paragraphs: 0 };
    }

    const text = Editor.string(editor, []);
    
    // 計算字符數（不包括空白）
    const characters = text.replace(/\s/g, '').length;
    
    // 計算詞數（對中文按字符計算，對英文按單詞計算）
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const words = chineseChars.length + englishWords.length;
    
    // 計算段落數
    const paragraphs = text.split('\n').filter(line => line.trim().length > 0).length || 1;

    return { words, characters, paragraphs };
  }, [editor]);

  /**
   * 編輯器操作集合
   */
  const actions: EditorContextActions = useMemo(() => ({
    getPosition,
    setPosition,
    getSelection,
    collapseSelection,
    ensureSelection,
    moveToEnd,
    insertText,
    getTextStats
  }), [getPosition, setPosition, getSelection, collapseSelection, ensureSelection, moveToEnd, insertText, getTextStats]);

  /**
   * 是否準備就緒
   */
  const isReady = useMemo(() => {
    return !!editor && state.hasEditor;
  }, [editor, state.hasEditor]);

  return {
    state,
    actions,
    isReady
  };
}