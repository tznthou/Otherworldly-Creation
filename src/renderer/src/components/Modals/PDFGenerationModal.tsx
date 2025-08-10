import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../api';
import type { PDFGenerationOptions } from '../../api/models';

interface PDFGenerationProgress {
  stage: 'preparing' | 'converting' | 'generating' | 'complete' | 'error';
  progress: number; // 0-100
  currentChapter?: string;
  totalChapters: number;
  message?: string;
}

const PDFGenerationModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<PDFGenerationProgress | null>(null);
  const [options, setOptions] = useState<PDFGenerationOptions>({
    page_size: 'A4',
    font_family: 'Helvetica',
    font_size: 12,
    line_height: 1.5,
    margin_top: 20,
    margin_bottom: 20,
    margin_left: 20,
    margin_right: 20,
    include_cover: true,
    chapter_break_style: 'new_page',
    author: ''
  });
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // 當選擇專案時進行驗證
  useEffect(() => {
    if (selectedProjectId) {
      validateProject();
    }
  }, [selectedProjectId]);

  const validateProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      // 簡單驗證：檢查專案是否存在章節
      const chapters = await api.chapters.getByProjectId(selectedProjectId);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (chapters.length === 0) {
        errors.push('專案沒有章節內容');
      } else if (chapters.length === 1) {
        warnings.push('專案只有一個章節，建議至少有 2 個章節');
      }
      
      // 檢查章節內容
      let emptyChapters = 0;
      for (const chapter of chapters) {
        if (!chapter.content || chapter.content.length === 0) {
          emptyChapters++;
        }
      }
      
      if (emptyChapters > 0) {
        if (emptyChapters === chapters.length) {
          errors.push('所有章節都沒有內容');
        } else {
          warnings.push(`有 ${emptyChapters} 個章節沒有內容`);
        }
      }
      
      setValidation({
        valid: errors.length === 0,
        errors,
        warnings
      });
    } catch (error) {
      console.error('專案驗證失敗:', error);
      setValidation({
        valid: false,
        errors: ['專案驗證時發生錯誤'],
        warnings: []
      });
    }
  };

  const handleClose = () => {
    if (!generating) {
      dispatch(closeModal('pdfGeneration'));
    }
  };

  const handleGenerate = async () => {
    // 更嚴格的驗證
    if (!selectedProjectId || selectedProjectId.trim() === '') {
      dispatch(addNotification({
        type: 'warning',
        title: '請選擇專案',
        message: '請先選擇要解放最終形態的專案'
      }));
      return;
    }

    if (!validation?.valid) {
      dispatch(addNotification({
        type: 'error',
        title: '專案驗證失敗',
        message: '目前選擇的專案無法完全具現化，請檢查專案內容'
      }));
      return;
    }

    setGenerating(true);
    setProgress(null);

    try {
      console.log('⚔️ 開始真理銘刻，專案 ID:', selectedProjectId);
      
      // 模擬進度更新
      const progressSteps = [
        { stage: 'preparing' as const, progress: 10, message: '🔍 正在準備真理銘刻...' },
        { stage: 'converting' as const, progress: 30, message: '🔄 正在完全具現化...' },
        { stage: 'generating' as const, progress: 70, message: '⚔️ 正在解放最終形態...' },
        { stage: 'complete' as const, progress: 100, message: '🎉 絕對文書完成！' }
      ];

      for (let i = 0; i < progressSteps.length - 1; i++) {
        const step = progressSteps[i];
        setProgress({
          ...step,
          totalChapters: 0
        });
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const result = await api.pdf.generate(selectedProjectId, options);

      // 完成狀態
      setProgress({
        stage: 'complete',
        progress: 100,
        totalChapters: result.chapter_count,
        message: `🎉 真理銘刻完成：${result.title}`
      });

      // 成功提示訊息
      dispatch(addNotification({
        type: 'success',
        title: '⚔️ 絕對文書完全具現化成功！',
        message: `✅ 文件：${result.title}\n📁 位置：${result.file_path}\n📊 大小：${formatFileSize(result.file_size)}\n📖 章節：${result.chapter_count} 個\n📄 頁數：${result.page_count} 頁\n\n💡 提示：檔案已保存到下載資料夾，您可以使用任何 PDF 閱讀器開啟`
      }));

      // 自動開啟檔案位置
      setTimeout(async () => {
        try {
          const folderPath = result.file_path.substring(0, result.file_path.lastIndexOf('/'));
          await api.system.openExternal(folderPath);
          
          dispatch(addNotification({
            type: 'info',
            title: '📁 檔案位置已開啟',
            message: '下載資料夾已在 Finder 中開啟'
          }));
        } catch (error) {
          console.error('開啟檔案夾失敗:', error);
          dispatch(addNotification({
            type: 'info',
            title: '📁 檔案已保存',
            message: `PDF 已保存至：${result.file_path}\n請手動開啟下載資料夾查看`
          }));
        }
      }, 1500);

      // 延遲關閉 modal
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error) {
      console.error('絕對文書具現化失敗:', error);
      setProgress({
        stage: 'error',
        progress: 0,
        totalChapters: 0,
        message: `生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`
      });
      
      dispatch(addNotification({
        type: 'error',
        title: '真理銘刻失敗',
        message: `${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const getProgressBarWidth = () => {
    return progress ? `${progress.progress}%` : '0%';
  };

  const getStageText = () => {
    if (!progress) return '';
    
    const stageTexts = {
      preparing: '準備中',
      converting: '轉換中',
      generating: '生成中',
      complete: '完成',
      error: '錯誤'
    };
    
    return stageTexts[progress.stage];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-cosmic text-gold-500">
            ⚔️ 絕對文書・完全具現化
          </h2>
          {!generating && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* 專案選擇 */}
          <div>
            <label className="block text-sm font-medium text-gold-400 mb-2">
              選擇專案
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
            >
              <option value="">選擇要解放最終形態的專案...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.type})
                </option>
              ))}
            </select>
          </div>

          {/* 驗證結果 */}
          {validation && selectedProjectId && (
            <div className={`p-4 rounded-lg border ${
              validation.valid 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              {validation.errors.length > 0 && (
                <div className="mb-2">
                  <p className="text-red-400 font-medium mb-1">錯誤：</p>
                  <ul className="text-sm text-red-300 list-disc list-inside">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validation.warnings.length > 0 && (
                <div>
                  <p className="text-yellow-400 font-medium mb-1">警告：</p>
                  <ul className="text-sm text-yellow-300 list-disc list-inside">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.valid && validation.errors.length === 0 && (
                <p className="text-green-400 font-medium">✅ 專案驗證通過，可以真理銘刻</p>
              )}
            </div>
          )}

          {/* 生成選項 */}
          {selectedProjectId && validation?.valid && (
            <div className="space-y-4">
              <h3 className="text-lg font-cosmic text-gold-400">生成選項</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">頁面大小</label>
                  <select
                    value={options.page_size}
                    onChange={(e) => setOptions(prev => ({ ...prev, page_size: e.target.value }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
                  >
                    <option value="A4">A4 (210×297mm)</option>
                    <option value="Letter">Letter (8.5×11in)</option>
                    <option value="Legal">Legal (8.5×14in)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">字體大小</label>
                  <input
                    type="number"
                    value={options.font_size}
                    onChange={(e) => setOptions(prev => ({ ...prev, font_size: Number(e.target.value) }))}
                    disabled={generating}
                    min="8"
                    max="24"
                    className="w-full px-2 py-1 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.include_cover}
                      onChange={(e) => setOptions(prev => ({ ...prev, include_cover: e.target.checked }))}
                      disabled={generating}
                      className="mr-2 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-gray-300">生成封面頁</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">章節分頁</label>
                  <select
                    value={options.chapter_break_style}
                    onChange={(e) => setOptions(prev => ({ ...prev, chapter_break_style: e.target.value }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
                  >
                    <option value="new_page">每章新頁面</option>
                    <option value="section_break">章節間距</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">作者名稱（可選）</label>
                  <input
                    type="text"
                    value={options.author || ''}
                    onChange={(e) => setOptions(prev => ({ ...prev, author: e.target.value }))}
                    disabled={generating}
                    placeholder="留空將使用「創世紀元用戶」"
                    className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 生成進度 */}
          {progress && (
            <div className="bg-gradient-to-br from-cosmic-700 to-cosmic-800 border border-gold-500/30 rounded-lg p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gold-400 font-semibold text-lg flex items-center">
                  <span className="animate-spin mr-2">⚙️</span>
                  {getStageText()} - {progress.progress}%
                </span>
                <span className="text-sm text-gold-300 bg-gold-500/20 px-2 py-1 rounded">
                  {progress.totalChapters > 0 && `${progress.totalChapters} 章節`}
                </span>
              </div>
              
              <div className="w-full bg-cosmic-600 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: getProgressBarWidth() }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
              
              {progress.message && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-gold-500 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-sm text-gray-200 font-medium">{progress.message}</p>
                </div>
              )}

              {progress.currentChapter && (
                <p className="text-sm text-blue-400 mt-2 bg-blue-500/10 px-2 py-1 rounded">
                  📖 處理章節：{progress.currentChapter}
                </p>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleClose}
              disabled={generating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? '生成中...' : '取消'}
            </button>
            
            <button
              onClick={handleGenerate}
              disabled={!selectedProjectId || !validation?.valid || generating}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {generating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  生成中...
                </span>
              ) : (
                '⚔️ 真理銘刻'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFGenerationModal;