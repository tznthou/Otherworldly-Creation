import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { api } from '../../api';
import type { PDFGenerationOptions, PageSizeType, PDFResult } from '../../api/models';
import { Icon } from '../UI/Icon';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('PDFGenerationModal');

interface PDFGenerationProgress {
  stage: 'preparing' | 'converting' | 'font-loading' | 'generating' | 'complete' | 'error';
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
    // === 基本設定 ===
    page_size: 'A4',
    font_family: 'Noto Sans TC',
    font_size: 12,
    line_height: 1.6,
    
    // === 邊距設定 ===
    margin_top: 25,
    margin_bottom: 25,
    margin_left: 20,
    margin_right: 20,
    
    // === 內容設定 ===
    include_cover: true,
    chapter_break_style: 'NewPage',
    author: '',
    
    // === AI 插畫預設選項 ===
    include_illustrations: true,
    illustration_layout: 'Gallery',
    illustration_quality: 'Original',
    character_filter: undefined,
    
    // === 進階功能 (預設啟用) ===
    enable_bookmarks: true,
    enable_toc: true,
    text_alignment: 'Left',
    paragraph_spacing: 6.0,
    chapter_title_size: 18.0,
    
    // === 排版進階設定 (中文優化) ===
    prevent_orphans: true,
    prevent_widows: true,
    smart_punctuation: true,
    optimize_line_breaks: true
  });
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const validateProject = useCallback(async () => {
    if (!selectedProjectId) return;
    
    try {
      const chapters = await api.chapters.getByProjectId(selectedProjectId);
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (chapters.length === 0) {
        errors.push('專案沒有章節內容');
      } else if (chapters.length === 1) {
        warnings.push('專案只有一個章節，建議至少有 2 個章節');
      }
      
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
      log.error('專案驗證失敗:', error);
      setValidation({
        valid: false,
        errors: ['專案驗證時發生錯誤'],
        warnings: []
      });
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      validateProject();
    }
  }, [selectedProjectId, validateProject]);

  const handleClose = () => {
    if (!generating) {
      dispatch(closeModal('pdfGeneration'));
    }
  };

  const handleGenerate = async () => {
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
      log.debug('⚔️ 開始真理銘刻，專案 ID:', selectedProjectId);
      
      // 更真實的進度反映實際後端處理時間
      const progressSteps = [
        { stage: 'preparing' as const, progress: 5, message: '🔍 準備真理銘刻...' },
        { stage: 'converting' as const, progress: 15, message: '🔄 解析章節內容...' },
        { stage: 'font-loading' as const, progress: 40, message: '📝 載入中文字體...' },
        { stage: 'generating' as const, progress: 85, message: '⚔️ 渲染PDF頁面...' },
        { stage: 'complete' as const, progress: 100, message: '🎉 絕對文書完成！' }
      ];

      // 模擬真實處理時間分布
      const timings = [300, 500, 1200, 800, 200]; // ms

      for (let i = 0; i < progressSteps.length - 1; i++) {
        const step = progressSteps[i];
        setProgress({
          ...step,
          totalChapters: 0
        });
        
        // 如果是字體載入或PDF渲染階段，顯示更詳細的進度
        if (step.stage === 'font-loading' || step.stage === 'generating') {
          await new Promise(resolve => setTimeout(resolve, timings[i] * 0.3));
          
          // 細分進度更新
          for (let subProgress = step.progress; subProgress < progressSteps[i + 1].progress; subProgress += 5) {
            setProgress({
              ...step,
              progress: Math.min(subProgress, progressSteps[i + 1].progress - 1),
              totalChapters: 0
            });
            await new Promise(resolve => setTimeout(resolve, timings[i] * 0.1));
          }
        } else {
          await new Promise(resolve => setTimeout(resolve, timings[i]));
        }
      }

      // 開始實際的PDF生成，顯示不確定進度
      setProgress({
        stage: 'generating',
        progress: 90,
        totalChapters: 0,
        message: '⚔️ 正在進行真理銘刻，請稍候...'
      });

      // 添加超時保護機制 - 延長到10分鐘以便調試字體處理問題
      const pdfGenerationPromise = api.pdf.generate(selectedProjectId, options);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF生成超時（超過10分鐘），可能字體處理遇到問題，請檢查後端日誌')), 600000)
      );

      const result = await Promise.race([pdfGenerationPromise, timeoutPromise]) as PDFResult;

      // 完成狀態
      setProgress({
        stage: 'complete',
        progress: 100,
        totalChapters: result.chapter_count,
        message: `🎉 真理銘刻完成：${result.title}`
      });

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
          log.error('開啟檔案夾失敗:', error);
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
      log.error('絕對文書具現化失敗:', error);
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

  const isIndeterminateProgress = () => {
    return progress && progress.stage === 'generating' && progress.progress >= 90;
  };

  const getStageText = () => {
    if (!progress) return '';
    
    const stageTexts = {
      preparing: '準備中',
      converting: '轉換中',
      'font-loading': '載入字體',
      generating: '生成中',
      complete: '完成',
      error: '錯誤'
    };
    
    return stageTexts[progress.stage as keyof typeof stageTexts] || progress.stage;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif-tc text-warm-gold">"
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
            <label className="block text-sm font-medium text-warm-gold mb-2">
              選擇專案
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 bg-bg-dark/80 border border-warm-gold/10 rounded-lg text-white focus:outline-none focus:border-warm-gold"
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
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <Icon name="CheckCircle" variant="solid" className="w-5 h-5" />
                  專案驗證通過，可以真理銘刻
                </p>
              )}
            </div>
          )}

          {/* 生成選項 */}
          {selectedProjectId && validation?.valid && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif-tc text-warm-gold">生成選項</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">頁面大小</label>
                  <select
                    value={options.page_size as string}
                    onChange={(e) => setOptions(prev => ({ ...prev, page_size: e.target.value as PageSizeType }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
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
                    className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.include_cover}
                      onChange={(e) => setOptions(prev => ({ ...prev, include_cover: e.target.checked }))}
                      disabled={generating}
                      className="mr-2 w-4 h-4 text-warm-gold bg-bg-dark/80 border-warm-gold/10 rounded focus:ring-gold-500"
                    />
                    <span className="text-sm text-gray-300">生成封面頁</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">章節分頁</label>
                  <select
                    value={options.chapter_break_style}
                    onChange={(e) => setOptions(prev => ({ ...prev, chapter_break_style: e.target.value as 'NewPage' | 'SectionBreak' | 'Continuous' }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
                  >
                    <option value="NewPage">每章新頁面</option>
                    <option value="SectionBreak">章節間距</option>
                    <option value="Continuous">連續不分頁</option>
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
                    className="w-full px-3 py-2 bg-bg-dark/80 border border-warm-gold/10 rounded-lg text-white focus:outline-none focus:border-warm-gold"
                  />
                </div>
              </div>
              
              {/* AI 插畫整合選項 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-clay-orange/20 rounded-lg">
                <h4 className="text-md font-serif-tc text-clay-orange mb-3 flex items-center gap-2">
                  <Icon name="PaintBrush" variant="solid" className="w-5 h-5" />
                  AI 插畫整合設定
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={options.include_illustrations}
                        onChange={(e) => setOptions(prev => ({ ...prev, include_illustrations: e.target.checked }))}
                        disabled={generating}
                        className="mr-2 w-4 h-4 text-clay-orange bg-bg-dark/80 border-warm-gold/10 rounded focus:ring-clay-orange"
                      />
                      <span className="text-sm text-gray-300">包含AI生成的插畫</span>
                    </label>
                  </div>
                  
                  {options.include_illustrations && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">插畫佈局方式</label>
                        <select
                          value={options.illustration_layout}
                          onChange={(e) => setOptions(prev => ({ ...prev, illustration_layout: e.target.value as 'Gallery' | 'Inline' | 'ChapterStart' | 'ChapterEnd' }))}
                          disabled={generating}
                          className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
                        >
                          <option value="Gallery">插畫集錦頁 (在開頭集中展示)</option>
                          <option value="ChapterStart">章節開始 (在每章標題下顯示相關插畫)</option>
                          <option value="ChapterEnd">章節結尾 (在每章結尾顯示相關插畫)</option>
                          <option value="Inline">內嵌模式 (文字中插入，開發中)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">插畫品質</label>
                        <select
                          value={options.illustration_quality}
                          onChange={(e) => setOptions(prev => ({ ...prev, illustration_quality: e.target.value as 'Original' | 'High' | 'Medium' | 'Compressed' }))}
                          disabled={generating}
                          className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
                        >
                          <option value="Original">原始品質 (檔案最大)</option>
                          <option value="High">高品質 (輕微壓縮)</option>
                          <option value="Medium">中等品質 (平衡大小)</option>
                          <option value="Compressed">壓縮品質 (檔案較小)</option>
                        </select>
                      </div>
                      
                      <div className="text-xs text-gray-400 bg-bg-dark/80/50 p-2 rounded">
                        💡 插畫功能說明：PDF 目前僅支援插畫資訊的文字顯示，包含文件名稱和角色資訊。實際圖片嵌入功能正在開發中。
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 生成進度 */}
          {progress && (
            <div className="bg-gradient-to-br from-bg-dark to-bg-light border border-warm-gold/30 rounded-lg p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-warm-gold font-semibold text-lg flex items-center">
                  <span className="animate-spin mr-2">⚙️</span>
                  {getStageText()} - {progress.progress}%
                </span>
                <span className="text-sm text-warm-gold bg-warm-gold/50/20 px-2 py-1 rounded">
                  {progress.totalChapters > 0 && `${progress.totalChapters} 章節`}
                </span>
              </div>
              
              <div className="w-full bg-bg-light rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className={`bg-gradient-to-r from-warm-gold via-gold-500 to-warm-gold-light h-3 rounded-full transition-all duration-500 ease-out relative ${
                    isIndeterminateProgress() ? 'animate-pulse' : ''
                  }`}
                  style={{ width: getProgressBarWidth() }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent ${
                    isIndeterminateProgress() ? 'animate-ping' : 'animate-pulse'
                  }`}></div>
                  {isIndeterminateProgress() && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-300/50 to-transparent animate-bounce"></div>
                  )}
                </div>
              </div>
              
              {progress.message && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-warm-gold/50 rounded-full mr-2 animate-pulse"></div>
                  <p className="text-sm text-gray-200 font-medium">{progress.message}</p>
                </div>
              )}

              {progress.currentChapter && (
                <p className="text-sm text-warm-gold mt-2 bg-warm-gold/10 px-2 py-1 rounded">
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
              onClick={async () => {
                if (!selectedProjectId) {
                  dispatch(addNotification({
                    type: 'warning',
                    title: '請選擇專案',
                    message: '請先選擇要測試的專案'
                  }));
                  return;
                }

                try {
                  setGenerating(true);
                  setProgress({
                    stage: 'preparing',
                    progress: 50,
                    totalChapters: 0,
                    message: '🧪 準備測試PDF生成...'
                  });

                  // 使用基本選項進行測試
                  const testOptions: PDFGenerationOptions = {
                    ...options,
                    include_illustrations: false, // 測試時關閉插畫
                  };

                  const result = await api.pdf.generate(selectedProjectId, testOptions);
                  log.debug('✅ 測試PDF生成成功:', result);
                  
                  setProgress({
                    stage: 'complete',
                    progress: 100,
                    totalChapters: 0,
                    message: '✅ 測試PDF生成完成！'
                  });

                  dispatch(addNotification({
                    type: 'success',
                    title: '測試完成',
                    message: 'PDF 測試生成成功！'
                  }));
                } catch (error: unknown) {
                  log.error('❌ 測試PDF生成失敗:', error);
                  const errorMessage = error instanceof Error ? error.message : '未知錯誤';
                  setProgress({
                    stage: 'error',
                    progress: 0,
                    totalChapters: 0,
                    message: '❌ 測試失敗: ' + errorMessage
                  });
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={!selectedProjectId || generating}
              className="px-4 py-2 bg-warm-gold text-white rounded-lg hover:bg-warm-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🧪 測試
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
                <span className="flex items-center gap-2">
                  <Icon name="DocumentArrowDown" variant="solid" className="w-4 h-4" />
                  真理銘刻
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFGenerationModal;