import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { EPubService, EPubGenerationProgress } from '../../services/epubService';
import { Icon } from '../UI/Icon';
import { api } from '../../api';
import type { EPubGenerationOptions } from '../../api/models';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('EPubGenerationModal');

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
    author: '',
    // AI 插畫預設選項
    include_illustrations: true,
    illustration_layout: 'gallery',
    illustration_quality: 'original',
    character_filter: undefined
  });
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const validateProject = useCallback(async () => {
    if (!selectedProjectId) return;
    
    try {
      const result = await EPubService.validateProject(selectedProjectId);
      setValidation(result);
    } catch (error) {
      log.error('專案驗證失敗:', error);
    }
  }, [selectedProjectId]);

  // 當選擇專案時進行驗證
  useEffect(() => {
    if (selectedProjectId) {
      validateProject();
    }
  }, [selectedProjectId, validateProject]);

  const handleClose = () => {
    if (!generating) {
      dispatch(closeModal('epubGeneration'));
    }
  };

  const handleGenerate = async () => {
    // 更嚴格的驗證
    if (!selectedProjectId || selectedProjectId.trim() === '') {
      dispatch(addNotification({
        type: 'warning',
        title: '請選擇專案',
        message: '請先選擇要展開虛數空間的專案'
      }));
      return;
    }

    if (!validation?.valid) {
      dispatch(addNotification({
        type: 'error',
        title: '專案驗證失敗',
        message: '目前選擇的專案無法啟動次元物語，請檢查專案內容'
      }));
      return;
    }

    setGenerating(true);
    setProgress(null);

    try {
      log.debug('🌟 開始展開虛數空間，專案 ID:', selectedProjectId);
      const result = await EPubService.generateEPub(
        selectedProjectId,
        options,
        (progressData) => {
          setProgress(progressData);
        }
      );

      // 成功提示訊息
      dispatch(addNotification({
        type: 'success',
        title: '🌟 次元物語展開成功！',
        message: `✅ 文件：${result.title}\n📁 位置：${result.file_path}\n📊 大小：${EPubService.formatFileSize(result.file_size)}\n📖 章節：${result.chapter_count} 個\n\n💡 提示：檔案已保存到下載資料夾，您可以使用任何 EPUB 閱讀器開啟`
      }));

      // 自動開啟檔案位置（避免權限問題）
      setTimeout(async () => {
        try {
          // 獲取檔案所在目錄
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
            message: `EPUB 已保存至：${result.file_path}\n請手動開啟下載資料夾查看`
          }));
        }
      }, 1500);

      // 延遲關閉 modal
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error) {
      log.error('次元物語展開失敗:', error);
      dispatch(addNotification({
        type: 'error',
        title: '虛數空間展開失敗',
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
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif-tc text-warm-gold flex items-center gap-2">
            <Icon name="Sparkles" variant="solid" className="w-6 h-6" />
            次元物語・零式記錄
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
              <option value="">選擇要展開虛數空間的專案...</option>
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
                  專案驗證通過，可以展開虛數空間
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
                  <label className="block text-sm text-gray-300 mb-1">字體系列</label>
                  <select
                    value={options.font_family}
                    onChange={(e) => setOptions(prev => ({ ...prev, font_family: e.target.value }))}
                    disabled={generating}
                    className="w-full px-2 py-1 bg-bg-dark/80 border border-warm-gold/10 rounded text-white text-sm"
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
                    className="w-full px-3 py-2 bg-bg-dark/80 border border-warm-gold/10 rounded-lg text-white focus:outline-none focus:border-warm-gold"
                  />
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
                  className="bg-gradient-to-r from-warm-gold via-gold-500 to-warm-gold-light h-3 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: getProgressBarWidth() }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
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
                <span className="flex items-center gap-2">
                  <Icon name="BookOpen" variant="solid" className="w-4 h-4" />
                  展開虛數空間
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPubGenerationModal;