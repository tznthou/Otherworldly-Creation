import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  queryAIHistory,
  markHistorySelected,
  deleteAIHistory,
  cleanupAIHistory,
  setPagination,
  clearError,
} from '../../store/slices/aiHistorySlice';
import { AIGenerationHistory } from '../../api/models';
import { useI18n } from '../../hooks/useI18n';

interface AIHistoryPanelProps {
  projectId: string;
  chapterId?: string;
  onSelectHistory?: (history: AIGenerationHistory) => void;
}

const AIHistoryPanel: React.FC<AIHistoryPanelProps> = ({
  projectId,
  chapterId,
  onSelectHistory,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  
  const {
    histories,
    isLoading,
    error,
    totalCount,
    pagination,
  } = useSelector((state: RootState) => state.aiHistory);

  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 過濾歷史記錄
  const filteredHistories = useMemo(() => {
    let filtered = histories.filter(h => h.projectId === projectId);
    
    if (chapterId) {
      filtered = filtered.filter(h => h.chapterId === chapterId);
    }
    
    if (filterSelectedOnly) {
      filtered = filtered.filter(h => h.selected);
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [histories, projectId, chapterId, filterSelectedOnly]);

  // 載入歷史記錄
  useEffect(() => {
    const loadHistory = async () => {
      try {
        await dispatch(queryAIHistory({
          projectId,
          chapterId,
          selectedOnly: filterSelectedOnly,
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize,
        }));
      } catch (error) {
        console.error('載入 AI 歷史記錄失敗:', error);
      }
    };

    loadHistory();
  }, [dispatch, projectId, chapterId, filterSelectedOnly, pagination.page, pagination.pageSize]);

  // 處理標記選擇
  const handleMarkSelected = async (historyId: string) => {
    try {
      await dispatch(markHistorySelected({ historyId, projectId }));
    } catch (error) {
      console.error('標記歷史記錄失敗:', error);
    }
  };

  // 處理刪除
  const handleDelete = async (historyId: string) => {
    if (window.confirm(t('確定要刪除這個 AI 生成記錄嗎？'))) {
      try {
        await dispatch(deleteAIHistory(historyId));
      } catch (error) {
        console.error('刪除歷史記錄失敗:', error);
      }
    }
  };

  // 處理清理舊記錄
  const handleCleanup = async () => {
    const keepCount = parseInt(prompt(t('保留多少條最新記錄？'), '50') || '50');
    if (keepCount > 0) {
      try {
        await dispatch(cleanupAIHistory({ projectId, keepCount }));
        // 重新載入歷史記錄
        dispatch(queryAIHistory({
          projectId,
          chapterId,
          selectedOnly: filterSelectedOnly,
          limit: pagination.pageSize,
          offset: 0,
        }));
      } catch (error) {
        console.error('清理歷史記錄失敗:', error);
      }
    }
  };

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    dispatch(setPagination({ page: newPage }));
  };

  // 格式化時間
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 格式化生成時間
  const formatGenerationTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 處理選擇歷史記錄
  const handleSelectHistory = (history: AIGenerationHistory) => {
    onSelectHistory?.(history);
  };

  if (isLoading && filteredHistories.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
        <span className="ml-3 text-gold-400">{t('載入歷史記錄中...')}</span>
      </div>
    );
  }

  return (
    <div className="bg-cosmic-900 rounded-lg border border-cosmic-700 p-4">
      {/* 標題和操作按鈕 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gold-400">
          {t('AI 生成歷史')} ({filteredHistories.length})
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-md bg-cosmic-800 text-gold-400 hover:bg-cosmic-700 transition-colors"
            title={t('篩選選項')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586l-4-2V10a1 1 0 00-.293-.707L3.707 5.707A1 1 0 013 5V4z" />
            </svg>
          </button>
          <button
            onClick={handleCleanup}
            className="p-2 rounded-md bg-cosmic-800 text-gold-400 hover:bg-cosmic-700 transition-colors"
            title={t('清理舊記錄')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 篩選選項 */}
      {showFilters && (
        <div className="mb-4 p-3 bg-cosmic-800 rounded-md border border-cosmic-600">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filterSelectedOnly}
                onChange={(e) => setFilterSelectedOnly(e.target.checked)}
                className="rounded bg-cosmic-700 border-cosmic-600 text-gold-400 focus:ring-gold-400"
              />
              <span className="text-sm text-cosmic-300">{t('只顯示已選擇的記錄')}</span>
            </label>
          </div>
        </div>
      )}

      {/* 錯誤提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 歷史記錄列表 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredHistories.length === 0 ? (
          <div className="text-center py-8 text-cosmic-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-cosmic-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>{t('暫無 AI 生成歷史記錄')}</p>
          </div>
        ) : (
          filteredHistories.map((history) => (
            <div
              key={history.id}
              className={`p-3 rounded-md border transition-all cursor-pointer ${
                history.selected
                  ? 'bg-gold-900/20 border-gold-600 shadow-lg'
                  : 'bg-cosmic-800 border-cosmic-600 hover:bg-cosmic-750 hover:border-cosmic-500'
              }`}
              onClick={() => handleSelectHistory(history)}
            >
              {/* 記錄頭部信息 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-cosmic-700 px-2 py-1 rounded text-cosmic-300">
                    {history.model}
                  </span>
                  {history.selected && (
                    <span className="text-xs bg-gold-800 px-2 py-1 rounded text-gold-300">
                      {t('已選擇')}
                    </span>
                  )}
                  {history.languagePurity && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      history.languagePurity >= 95 
                        ? 'bg-green-800 text-green-300'
                        : history.languagePurity >= 85
                        ? 'bg-yellow-800 text-yellow-300'
                        : 'bg-red-800 text-red-300'
                    }`}>
                      純度 {Math.round(history.languagePurity)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSelected(history.id);
                    }}
                    className={`p-1 rounded ${
                      history.selected
                        ? 'text-gold-400 hover:text-gold-300'
                        : 'text-cosmic-400 hover:text-gold-400'
                    } transition-colors`}
                    title={history.selected ? t('取消選擇') : t('標記為選擇')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(history.id);
                    }}
                    className="p-1 rounded text-cosmic-400 hover:text-red-400 transition-colors"
                    title={t('刪除記錄')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 生成統計信息 */}
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-cosmic-400">
                <div>{t('時間')}: {formatTime(history.createdAt)}</div>
                <div>{t('生成時間')}: {formatGenerationTime(history.generationTimeMs)}</div>
                <div>{t('字數')}: {history.tokenCount || '-'}</div>
              </div>

              {/* 生成內容預覽 */}
              <div className="text-sm">
                <div className="text-cosmic-300 mb-1">
                  <span className="font-medium">{t('生成內容')}:</span>
                </div>
                <div className="text-cosmic-200 bg-cosmic-950 p-2 rounded text-xs max-h-20 overflow-hidden">
                  {history.generatedText.length > 150
                    ? `${history.generatedText.substring(0, 150)}...`
                    : history.generatedText}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分頁控制 */}
      {filteredHistories.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-cosmic-400">
          <div>
            {t('共')} {totalCount} {t('條記錄')}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded bg-cosmic-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cosmic-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-2">{pagination.page}</span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={filteredHistories.length < pagination.pageSize}
              className="p-2 rounded bg-cosmic-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cosmic-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHistoryPanel;