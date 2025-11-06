import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';
import { EbookExportConfig, EbookImageIntegration } from '../../../../../types/imageMetadata';
import { SafeImage } from '../../../../UI/SafeImage';
import { createLogger } from '../../../../../utils/logger';

const log = createLogger('FullEbookPreviewPanel');

interface FullEbookPreviewPanelProps {
  projectId: string;
  exportConfig: EbookExportConfig;
  integrationData: EbookImageIntegration | null;
}

type PageType = 'cover' | 'toc' | 'chapter' | 'info';

interface CoverPageContent {
  bookTitle: string;
  author: string;
  coverImage?: {
    imageId: string;
    filename: string;
    description: string;
  };
}

interface InfoPageContent {
  stats?: {
    totalSizeMB: number;
    compressionRatio: number;
  };
  totalImages: number;
  totalChapters: number;
}

interface TocPageContent {
  chapters: Array<{
    number: number;
    title: string;
    id: string;
  }>;
}

interface ChapterPageContent {
  chapter: {
    id: string;
    title: string;
    wordCount?: number;
  };
  chapterNumber: number;
  images: Array<{
    placement: string;
    images: Array<{
      imageId: string;
      filename: string;
      description: string;
      order: number;
    }>;
  }>;
  totalImages: number;
}

type PageContent = CoverPageContent | InfoPageContent | TocPageContent | ChapterPageContent;

interface PreviewPage {
  id: string;
  type: PageType;
  title: string;
  content: PageContent;
  pageNumber: number;
}

const FullEbookPreviewPanel: React.FC<FullEbookPreviewPanelProps> = ({
  projectId,
  exportConfig,
  integrationData
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(true);

  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const chapters = useSelector((state: RootState) => state.chapters.chapters);

  const projectChapters = useMemo(() => {
    return chapters
      .filter(ch => ch.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }, [chapters, projectId]);

  // 生成预览页面序列
  const previewPages = useMemo((): PreviewPage[] => {
    const pages: PreviewPage[] = [];
    let pageNum = 1;

    // 1. 封面页
    const coverImage = integrationData?.globalImages.find(img => img.placement === 'cover');
    if (coverImage || currentProject) {
      pages.push({
        id: 'cover',
        type: 'cover',
        title: '封面',
        content: {
          bookTitle: currentProject?.name || '未命名作品',
          author: '作者名',
          coverImage
        },
        pageNumber: pageNum++
      });
    }

    // 2. 信息页（元数据检查）
    pages.push({
      id: 'info',
      type: 'info',
      title: '图书信息',
      content: {
        stats: integrationData?.statistics,
        totalImages: integrationData?.totalImages || 0,
        totalChapters: projectChapters.length
      },
      pageNumber: pageNum++
    });

    // 3. 目录页
    if (projectChapters.length > 0) {
      pages.push({
        id: 'toc',
        type: 'toc',
        title: '目录',
        content: {
          chapters: projectChapters.map((ch, idx) => ({
            number: idx + 1,
            title: ch.title,
            id: ch.id
          }))
        },
        pageNumber: pageNum++
      });
    }

    // 4. 章节页
    projectChapters.forEach((chapter, idx) => {
      const chapterData = integrationData?.byChapter.find(bc => bc.chapterId === chapter.id);

      pages.push({
        id: `chapter-${chapter.id}`,
        type: 'chapter',
        title: `第${idx + 1}章`,
        content: {
          chapter,
          chapterNumber: idx + 1,
          images: chapterData?.placements || [],
          totalImages: chapterData?.imageCount || 0
        },
        pageNumber: pageNum++
      });
    });

    return pages;
  }, [integrationData, currentProject, projectChapters]);

  const currentPage = previewPages[currentPageIndex];
  const totalPages = previewPages.length;

  // 元数据检查
  const metadataIssues = useMemo(() => {
    const issues: string[] = [];

    if (!integrationData) {
      issues.push('无图片整合数据');
      return issues;
    }

    // 检查图片缺失
    if (integrationData.totalImages === 0) {
      issues.push('未配置任何图片');
    }

    // 检查章节配置
    const unconfiguredChapters = projectChapters.filter(
      ch => !integrationData.byChapter.find(bc => bc.chapterId === ch.id)
    );
    if (unconfiguredChapters.length > 0) {
      issues.push(`${unconfiguredChapters.length} 个章节未配置图片`);
    }

    // 检查图片质量设置
    if (exportConfig.imageQuality < 70) {
      issues.push(`图片质量较低 (${exportConfig.imageQuality}%)`);
    }

    // 检查文件大小
    if (integrationData.statistics.totalSizeMB > 100) {
      issues.push(`总文件大小较大 (${integrationData.statistics.totalSizeMB.toFixed(1)} MB)`);
    }

    return issues;
  }, [integrationData, projectChapters, exportConfig]);

  const goToPage = (index: number) => {
    if (index >= 0 && index < totalPages) {
      setCurrentPageIndex(index);
      log.debug('切换到页面:', index + 1);
    }
  };

  const goToPrevPage = () => goToPage(currentPageIndex - 1);
  const goToNextPage = () => goToPage(currentPageIndex + 1);

  // 渲染封面页
  const renderCoverPage = (content: CoverPageContent) => (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-warm-gold/20 to-clay-orange/20 p-12">
      {content.coverImage ? (
        <div className="w-3/4 max-w-md mb-8 shadow-2xl rounded-lg overflow-hidden">
          <SafeImage
            imageUrl={content.coverImage.filename}
            localFilePath={content.coverImage.filename}
            alt="封面"
            className="w-full h-auto"
            fallbackIcon="📚"
          />
        </div>
      ) : (
        <div className="w-3/4 max-w-md mb-8 h-96 bg-gradient-to-br from-warm-gold to-clay-orange rounded-lg shadow-2xl flex items-center justify-center">
          <span className="text-8xl">📚</span>
        </div>
      )}

      <h1 className="text-4xl font-bold text-text-secondary/20 mb-4 text-center">
        {content.bookTitle}
      </h1>
      <p className="text-xl text-text-secondary/80">作者：{content.author}</p>
    </div>
  );

  // 渲染信息页
  const renderInfoPage = (content: InfoPageContent) => (
    <div className="h-full p-12 overflow-y-auto">
      <h2 className="text-3xl font-bold text-text-secondary/20 mb-8">图书信息</h2>

      <div className="space-y-6">
        {/* 统计信息 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-text-secondary/40 mb-4">统计</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-text-secondary/80 text-sm">总章节数</div>
              <div className="text-2xl font-bold text-warm-gold">{content.totalChapters}</div>
            </div>
            <div>
              <div className="text-text-secondary/80 text-sm">总图片数</div>
              <div className="text-2xl font-bold text-warm-gold">{content.totalImages}</div>
            </div>
            {content.stats && (
              <>
                <div>
                  <div className="text-text-secondary/80 text-sm">文件大小</div>
                  <div className="text-2xl font-bold text-warm-gold">
                    {content.stats.totalSizeMB.toFixed(1)} MB
                  </div>
                </div>
                <div>
                  <div className="text-text-secondary/80 text-sm">压缩比例</div>
                  <div className="text-2xl font-bold text-warm-gold">
                    {(content.stats.compressionRatio * 100).toFixed(0)}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 元数据检查 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-text-secondary/40 mb-4">元数据检查</h3>
          {metadataIssues.length === 0 ? (
            <div className="flex items-center space-x-2 text-green-400">
              <span className="text-2xl">✅</span>
              <span>所有检查项通过</span>
            </div>
          ) : (
            <div className="space-y-2">
              {metadataIssues.map((issue, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-orange-400">
                  <span className="text-xl">⚠️</span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 导出配置 */}
        <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-text-secondary/40 mb-4">导出配置</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary/80">图片质量</span>
              <span className="text-text-secondary/40">{exportConfig.imageQuality}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary/80">最大宽度</span>
              <span className="text-text-secondary/40">{exportConfig.maxImageWidth}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary/80">最大高度</span>
              <span className="text-text-secondary/40">{exportConfig.maxImageHeight}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary/80">压缩级别</span>
              <span className="text-text-secondary/40">{exportConfig.compressionLevel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染目录页
  const renderTocPage = (content: TocPageContent) => (
    <div className="h-full p-12 overflow-y-auto">
      <h2 className="text-3xl font-bold text-text-secondary/20 mb-8 text-center">目录</h2>

      <div className="max-w-2xl mx-auto space-y-3">
        {content.chapters.map((ch) => (
          <div
            key={ch.id}
            className="flex items-center justify-between p-4 bg-bg-light/50 backdrop-blur-sm rounded-lg hover:bg-bg-dark/80 transition-colors cursor-pointer"
            onClick={() => {
              const chapterPageIndex = previewPages.findIndex(p => p.id === `chapter-${ch.id}`);
              if (chapterPageIndex >= 0) goToPage(chapterPageIndex);
            }}
          >
            <div className="flex items-center space-x-3">
              <span className="text-warm-gold font-semibold">{ch.number}</span>
              <span className="text-text-secondary/40">{ch.title}</span>
            </div>
            <span className="text-text-secondary/80">→</span>
          </div>
        ))}
      </div>
    </div>
  );

  // 渲染章节页
  const renderChapterPage = (content: ChapterPageContent) => (
    <div className="h-full p-12 overflow-y-auto">
      <h2 className="text-2xl font-bold text-text-secondary/20 mb-2">
        第 {content.chapterNumber} 章
      </h2>
      <h3 className="text-xl text-text-secondary/40 mb-8 pb-4 border-b border-warm-gold/20">
        {content.chapter.title}
      </h3>

      {content.totalImages === 0 ? (
        <div className="text-center py-16 text-text-secondary/80">
          <div className="text-6xl mb-4">📄</div>
          <p>此章节未配置图片</p>
        </div>
      ) : (
        <div className="space-y-8">
          {content.images.map((placement, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="text-lg font-semibold text-warm-gold flex items-center space-x-2">
                <span>🖼️</span>
                <span>{placement.placement.replace(/_/g, ' ')}</span>
                <span className="text-sm text-text-secondary/80">({placement.images.length})</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placement.images.map((img, imgIdx) => (
                  <div key={imgIdx} className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
                    <div className="aspect-video bg-bg-dark/80 rounded mb-2 flex items-center justify-center">
                      <span className="text-4xl">🎨</span>
                    </div>
                    <h5 className="font-medium text-text-secondary/40 text-sm mb-1">{img.filename}</h5>
                    <p className="text-xs text-text-secondary/80">{img.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 渲染当前页面
  const renderCurrentPage = () => {
    if (!currentPage) return null;

    switch (currentPage.type) {
      case 'cover':
        return renderCoverPage(currentPage.content);
      case 'info':
        return renderInfoPage(currentPage.content);
      case 'toc':
        return renderTocPage(currentPage.content);
      case 'chapter':
        return renderChapterPage(currentPage.content);
      default:
        return <div>未知页面类型</div>;
    }
  };

  if (totalPages === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16 text-text-secondary/80">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">无预览内容</h3>
          <p className="text-sm">请先配置图片并生成整合数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevPage}
            disabled={currentPageIndex === 0}
            className="px-4 py-2 bg-bg-light/40 hover:bg-bg-dark/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>◀</span>
            <span>上一页</span>
          </button>

          <div className="text-center">
            <div className="text-sm text-text-secondary/80">
              {currentPage?.title}
            </div>
            <div className="text-lg font-semibold text-text-secondary/40">
              第 {currentPageIndex + 1} / {totalPages} 页
            </div>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPageIndex === totalPages - 1}
            className="px-4 py-2 bg-bg-light/40 hover:bg-bg-dark/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>下一页</span>
            <span>▶</span>
          </button>
        </div>
      </div>

      {/* 元数据显示切换 */}
      <div className="flex items-center justify-between bg-bg-light/50 backdrop-blur-sm rounded-lg p-3">
        <span className="text-sm text-text-secondary/80">显示元数据信息</span>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showMetadata}
            onChange={(e) => setShowMetadata(e.target.checked)}
            className="w-4 h-4 text-warm-gold bg-bg-dark/80 border-warm-gold/10 rounded focus:ring-gold-500"
          />
        </label>
      </div>

      {/* 元数据警告 */}
      {showMetadata && metadataIssues.length > 0 && (
        <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
          <h4 className="text-orange-400 font-medium mb-2 flex items-center">
            <span className="text-xl mr-2">⚠️</span>
            发现 {metadataIssues.length} 个问题
          </h4>
          <ul className="space-y-1 text-sm text-orange-300">
            {metadataIssues.map((issue, idx) => (
              <li key={idx}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 预览区域 */}
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="relative" style={{ height: '600px' }}>
          {renderCurrentPage()}
        </div>
      </div>

      {/* 页面导航 */}
      <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-4">
        <h4 className="text-sm font-medium text-text-secondary/40 mb-3">快速导航</h4>
        <div className="flex flex-wrap gap-2">
          {previewPages.map((page, idx) => (
            <button
              key={page.id}
              onClick={() => goToPage(idx)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                currentPageIndex === idx
                  ? 'bg-warm-gold text-white'
                  : 'bg-bg-light/40 text-text-secondary hover:bg-bg-dark/80'
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FullEbookPreviewPanel;
