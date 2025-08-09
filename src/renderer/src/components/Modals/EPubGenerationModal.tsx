import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { EPubService, EPubGenerationProgress } from '../../services/epubService';
import type { EPubGenerationOptions } from '../../api/models';

const EPubGenerationModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<EPubGenerationProgress | null>(null);
  const [options, setOptions] = useState<EPubGenerationOptions>({
    include_cover: true,
    font_family: 'Noto Sans TC',
    chapter_break_style: 'page-break',
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
  }, [selectedProjectId]); // validateProject 是內部函數，不需要作為依賴

  const validateProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      const result = await EPubService.validateProject(selectedProjectId);
      setValidation(result);
    } catch (error) {
      console.error('專案驗證失敗:', error);
    }
  };

  const handleClose = () => {
    if (!generating) {
      dispatch(closeModal('epubGeneration'));
    }
  };

  const handleGenerate = async () => {
    if (!selectedProjectId || !validation?.valid) return;

    setGenerating(true);
    setProgress(null);

    try {
      const result = await EPubService.generateEPub(
        selectedProjectId,
        options,
        (progressData) => {
          setProgress(progressData);
        }
      );

      dispatch(addNotification({
        type: 'success',
        title: 'EPUB 生成成功',
        message: `文件：${result.title}\n大小：${EPubService.formatFileSize(result.file_size)}\n章節：${result.chapter_count} 個`
      }));

      // 自動關閉 modal
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('EPUB 生成失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'EPUB 生成失敗',
        message: `${error instanceof Error ? error.message : '未知錯誤'}`
      }));
    } finally {
      setGenerating(false);
      setProgress(null);
    }
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
            📚 傳說編纂 - EPUB 生成
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
              <option value="">選擇要生成 EPUB 的專案...</option>
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
                <p className="text-green-400 font-medium">✅ 專案驗證通過，可以生成 EPUB</p>
              )}
            </div>
          )}

          {/* 生成選項 */}
          {selectedProjectId && validation?.valid && (
            <div className="space-y-4">
              <h3 className="text-lg font-cosmic text-gold-400">生成選項</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm text-gray-300 mb-1">字體系列</label>
                  <select
                    value={options.font_family}
                    onChange={(e) => setOptions(prev => ({ ...prev, font_family: e.target.value }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-cosmic-700 border border-cosmic-600 rounded text-white text-sm"
                  >
                    <option value="Noto Sans TC">思源黑體</option>
                    <option value="Microsoft JhengHei">微軟正黑體</option>
                    <option value="PingFang TC">蘋方體</option>
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
            <div className="bg-cosmic-700 border border-cosmic-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gold-400 font-medium">
                  {getStageText()} - {progress.progress}%
                </span>
                <span className="text-sm text-gray-400">
                  {progress.totalChapters > 0 && `${progress.totalChapters} 章節`}
                </span>
              </div>
              
              <div className="w-full bg-cosmic-600 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: getProgressBarWidth() }}
                />
              </div>
              
              {progress.message && (
                <p className="text-sm text-gray-300">{progress.message}</p>
              )}

              {progress.currentChapter && (
                <p className="text-sm text-blue-400">處理章節：{progress.currentChapter}</p>
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
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
                '🚀 開始生成 EPUB'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPubGenerationModal;