import { useState, useEffect, useCallback } from 'react';
import { Editor, Node } from 'slate';
import { EditorStats } from '../components/Layout/StatusBar';

export const useEditorStats = (editor?: Editor, content?: Node[]): EditorStats => {
  const [stats, setStats] = useState<EditorStats>({
    wordCount: 0,
    characterCount: 0,
    lineCount: 0,
    cursorPosition: {
      line: 1,
      column: 1
    },
    selectedText: undefined
  });

  const calculateStats = useCallback(() => {
    if (!editor || !content) {
      return;
    }

    try {
      // 獲取編輯器的所有文本內容
      const fullText = Node.string({ children: content } as Node);
      
      // 計算字數（中文字符和英文單詞）
      const chineseCharacters = fullText.match(/[\u4e00-\u9fff]/g) || [];
      const englishWords = fullText.match(/[a-zA-Z]+/g) || [];
      const wordCount = chineseCharacters.length + englishWords.length;
      
      // 計算字符數（不包括空格）
      const characterCount = fullText.replace(/\s/g, '').length;
      
      // 計算行數
      const lineCount = fullText.split('\n').length;
      
      // 獲取光標位置
      let cursorPosition = { line: 1, column: 1 };
      if (editor.selection) {
        try {
          const { anchor } = editor.selection;
          if (anchor) {
            // 計算行號
            let currentLine = 1;
            let currentColumn = 1;
            
            // 遍歷到光標位置計算行列
            const beforeCursor = Editor.string(editor, {
              anchor: Editor.start(editor, []),
              focus: anchor
            });
            
            const lines = beforeCursor.split('\n');
            currentLine = lines.length;
            currentColumn = lines[lines.length - 1].length + 1;
            
            cursorPosition = { line: currentLine, column: currentColumn };
          }
        } catch (error) {
          console.warn('計算光標位置時發生錯誤:', error);
        }
      }
      
      // 獲取選中文本
      let selectedText: string | undefined;
      if (editor.selection && !(editor.selection.anchor.path.join('.') === editor.selection.focus.path.join('.') && editor.selection.anchor.offset === editor.selection.focus.offset)) {
        try {
          selectedText = Editor.string(editor, editor.selection);
        } catch (error) {
          console.warn('獲取選中文本時發生錯誤:', error);
        }
      }

      setStats({
        wordCount,
        characterCount,
        lineCount,
        cursorPosition,
        selectedText
      });
    } catch (error) {
      console.error('計算編輯器統計時發生錯誤:', error);
    }
  }, [editor, content]);

  // 當編輯器或內容變化時重新計算統計
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // 監聽編輯器選擇變化
  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      // 延遲計算以確保選擇已更新
      setTimeout(calculateStats, 10);
    };

    // 監聽編輯器選擇變化事件
    const originalOnChange = editor.onChange;
    editor.onChange = () => {
      if (originalOnChange) {
        originalOnChange();
      }
      handleSelectionChange();
    };

    return () => {
      editor.onChange = originalOnChange;
    };
  }, [editor, calculateStats]);

  return stats;
};