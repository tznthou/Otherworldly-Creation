import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import { Card, CardContent } from '../../components/UI/Card';
import { chapterStatusService, ChapterStatus } from '../../services/chapterStatusService';
import { Chapter } from '../../api/models';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ChapterStatusPage');

const ChapterStatusPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalChapters: 0,
    completedCount: 0,
    completionRate: 0,
    statusDistribution: { draft: 0, writing: 0, reviewing: 0, completed: 0 }
  });

  // 載入章節資料
  useEffect(() => {
    const loadChapters = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { api } = await import('../../api');
        const chaptersData = await api.chapters.getByProjectId(projectId);
        
        // 計算字數的輔助函數
        const calculateWordCount = (content: unknown[]): number => {
          if (!content || !Array.isArray(content)) return 0;
          
          let totalCount = 0;
          const processNode = (node: Record<string, unknown>) => {
            if (node.text && typeof node.text === 'string') {
              // 計算中文字符數，移除空白字符
              totalCount += node.text.replace(/\s/g, '').length;
            }
            if (node.children && Array.isArray(node.children)) {
              node.children.forEach(processNode);
            }
          };
          
          content.forEach((item: unknown) => {
            if (typeof item === 'object' && item !== null) {
              processNode(item as Record<string, unknown>);
            }
          });
          return totalCount;
        };

        // 確保章節有狀態屬性和正確的字數
        const chaptersWithStatus = chaptersData.map(chapter => {
          // 從 metadata 中讀取狀態
          let status = ChapterStatus.DRAFT;
          try {
            if (chapter.metadata) {
              const metadata = JSON.parse(chapter.metadata);
              console.log(`🔍 [狀態解析] 章節 ${chapter.title}:`, { // TODO: 複雜模式，需人工轉換
                metadata: metadata,
                metadataStatus: metadata.status,
                chapterStatus: chapter.status,
                finalStatus: metadata.status || chapter.status || ChapterStatus.DRAFT
              });
              // 優先使用 metadata 中的狀態，只有當它不存在時才使用 chapter.status
              status = metadata.status as ChapterStatus || chapter.status as ChapterStatus || ChapterStatus.DRAFT;
            } else if (chapter.status) {
              console.log(`🔍 [狀態解析] 章節 ${chapter.title} 無 metadata，使用 chapter.status:`, chapter.status); // TODO: 複雜模式，需人工轉換
              status = chapter.status as ChapterStatus;
            } else {
              console.log(`🔍 [狀態解析] 章節 ${chapter.title} 無狀態信息，使用預設草稿狀態`); // TODO: 複雜模式，需人工轉換
            }
          } catch (error) {
            console.warn(`❌ [狀態解析] 章節 ${chapter.title} metadata 解析失敗:`, error, 'Raw metadata:', chapter.metadata); // TODO: 複雜模式，需人工轉換
            status = (chapter.status as ChapterStatus) || ChapterStatus.DRAFT;
          }

          return {
            ...chapter,
            status,
            wordCount: chapter.wordCount || calculateWordCount(chapter.content)
          };
        });
        
        setChapters(chaptersWithStatus);
        
        // 計算統計資料
        const totalChapters = chaptersWithStatus.length;
        const completedCount = chapterStatusService.calculateCompletedCount(chaptersWithStatus);
        const completionRate = chapterStatusService.calculateCompletionRate(chaptersWithStatus);
        const statusDistribution = chapterStatusService.getStatusDistribution(chaptersWithStatus);
        
        setStats({
          totalChapters,
          completedCount,
          completionRate,
          statusDistribution: {
            draft: statusDistribution.draft,
            writing: statusDistribution.writing,
            reviewing: statusDistribution.reviewing,
            completed: statusDistribution.completed
          }
        });
        
      } catch (err) {
        log.error('載入章節失敗:', err);
        setError('載入章節資料失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    loadChapters();
  }, [projectId]);

  // 狀態標籤樣式
  const _getStatusStyle = (status: string) => {
    switch (status) {
      case ChapterStatus.DRAFT:
        return 'bg-gray-600 text-gray-200';
      case ChapterStatus.WRITING:
        return 'bg-blue-600 text-blue-200';
      case ChapterStatus.REVIEWING:
        return 'bg-yellow-600 text-yellow-200';
      case ChapterStatus.COMPLETED:
        return 'bg-green-600 text-green-200';
      default:
        return 'bg-gray-600 text-gray-200';
    }
  };

  const _getStatusLabel = (status: string) => {
    return chapterStatusService.getStatusLabel(status as ChapterStatus);
  };

  // 🔧 修復：使用 Redux updateChapter action 來更新章節狀態
  const updateChapterStatus = async (chapterId: string, newStatus: ChapterStatus) => {
    try {
      const chapter = chapters.find(c => c.id === chapterId);
      if (!chapter) return;

      // 使用現有的 metadata，添加狀態
      const oldMetadata = chapter.metadata ? JSON.parse(chapter.metadata) : {};
      const newMetadata = { 
        ...oldMetadata,
        status: newStatus  // 確保 status 覆蓋舊值
      };
      
      const updatedChapter = {
        ...chapter,
        status: newStatus, // 同時更新直接的 status 屬性
        metadata: JSON.stringify(newMetadata)
      };

      console.log(`🔧 [Redux更新請求] 章節 ${chapter.title} 狀態更新:`, { // TODO: 複雜模式，需人工轉換
        chapterId: chapter.id,
        oldStatus: oldMetadata.status,
        newStatus: newStatus,
        oldMetadata: oldMetadata,
        newMetadata: newMetadata,
        finalMetadataString: updatedChapter.metadata
      });

      // 🚀 使用 Redux updateChapter action，這會自動通知所有依賴組件
      const { updateChapter } = await import('../../store/slices/chaptersSlice');
      await dispatch(updateChapter(updatedChapter)).unwrap();
      
      // 驗證數據庫更新 - 立即重新獲取章節數據
      console.log(`🔍 [驗證] 立即重新查詢章節 ${chapter.title} 數據...`); // TODO: 複雜模式，需人工轉換
      const { api } = await import('../../api');
      const verifyChapter = await api.chapters.getById(chapter.id);
      log.debug(`🔍 [驗證] 數據庫中的實際數據:`, {
        chapterId: verifyChapter.id,
        title: verifyChapter.title,
        metadata: verifyChapter.metadata,
        parsedMetadata: verifyChapter.metadata ? JSON.parse(verifyChapter.metadata) : null
      });

      // 更新本地狀態
      const updatedChapters = chapters.map(c => 
        c.id === chapterId 
          ? { ...c, status: newStatus, metadata: JSON.stringify(newMetadata) }
          : c
      );
      
      setChapters(updatedChapters);

      // 重新計算統計
      const totalChapters = updatedChapters.length;
      const completedCount = chapterStatusService.calculateCompletedCount(updatedChapters);
      const completionRate = chapterStatusService.calculateCompletionRate(updatedChapters);
      const statusDistribution = chapterStatusService.getStatusDistribution(updatedChapters);
      
      setStats({
        totalChapters,
        completedCount,
        completionRate,
        statusDistribution: {
          draft: statusDistribution.draft,
          writing: statusDistribution.writing,
          reviewing: statusDistribution.reviewing,
          completed: statusDistribution.completed
        }
      });

      console.log(`✅ [Redux成功] 章節 ${chapter.title} 狀態已通過Redux更新為: ${newStatus}`); // TODO: 複雜模式，需人工轉換
      
      // 顯示成功通知
      dispatch(addNotification({
        type: 'success',
        title: '狀態更新成功',
        message: `章節「${chapter.title}」狀態已更新為「${chapterStatusService.getStatusLabel(newStatus)}」`,
        duration: 3000,
      }));
      
      // 🔄 觸發全局統計重計算通知
      log.debug('📊 [全局通知] 章節狀態已更新，Dashboard等組件將自動重新計算統計');
      
      // 發送自定義事件通知Dashboard重新計算統計
      window.dispatchEvent(new CustomEvent('refreshGlobalStats', {
        detail: { 
          chapterId: chapter.id, 
          newStatus: newStatus,
          timestamp: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      log.error('更新章節狀態失敗:', error);
      
      // 顯示錯誤通知
      const chapter = chapters.find(c => c.id === chapterId);
      dispatch(addNotification({
        type: 'error',
        title: '狀態更新失敗',
        message: `無法更新章節「${chapter?.title || ''}」的狀態，請稍後再試`,
        duration: 5000,
      }));
    }
  };

  // 所有可選狀態
  const statusOptions = [
    { value: ChapterStatus.DRAFT, label: '📝 草稿', color: 'text-gray-300' },
    { value: ChapterStatus.WRITING, label: '✍️ 寫作中', color: 'text-blue-300' },
    { value: ChapterStatus.REVIEWING, label: '🔍 審核中', color: 'text-yellow-300' },
    { value: ChapterStatus.COMPLETED, label: '✅ 已完成', color: 'text-green-300' }
  ];

  if (loading) {
    return (
      <div className="h-full bg-cosmic-950 text-white p-6 flex items-center justify-center">
        <div className="text-gold-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-4"></div>
          載入章節資料中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-cosmic-950 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
            <h2 className="text-xl text-red-400 mb-2">⚠️ 載入錯誤</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-cosmic-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-cosmic text-gold-500 mb-2">
            📊 章節管理
          </h1>
          <p className="text-gray-300">
            管理專案章節的狀態和進度
          </p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-cosmic-800 border-cosmic-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.totalChapters}</div>
                <div className="text-sm text-gray-300">總章節數</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-cosmic-800 border-cosmic-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.completedCount}</div>
                <div className="text-sm text-gray-300">已完成</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-cosmic-800 border-cosmic-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gold-400">{Math.round(stats.completionRate * 100)}%</div>
                <div className="text-sm text-gray-300">完成率</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-cosmic-800 border-cosmic-700">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.statusDistribution.writing}</div>
                <div className="text-sm text-gray-300">寫作中</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 章節列表 */}
        <div className="bg-cosmic-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-gold-400">章節列表</h2>
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="bg-gold-600 hover:bg-gold-700 px-4 py-2 rounded transition-colors text-sm"
            >
              返回專案
            </button>
          </div>
          
          {chapters.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>這個專案還沒有章節</p>
              <button
                onClick={() => navigate(`/project/${projectId}`)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                去新增章節
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="bg-cosmic-700 border-cosmic-600 hover:border-gold-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">{chapter.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>字數: {(chapter.wordCount || 0).toLocaleString()}</span>
                          <span>建立: {new Date(chapter.createdAt).toLocaleDateString()}</span>
                          <span>更新: {new Date(chapter.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* 狀態選擇下拉選單 */}
                        <select
                          value={chapter.status || ChapterStatus.DRAFT}
                          onChange={(e) => updateChapterStatus(chapter.id, e.target.value as ChapterStatus)}
                          className="bg-cosmic-600 text-white text-xs px-2 py-1 rounded border border-cosmic-500 hover:border-gold-500 focus:border-gold-500 focus:outline-none transition-colors"
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value} className="bg-cosmic-700">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => navigate(`/project/${projectId}`)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs transition-colors"
                        >
                          編輯
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterStatusPage;