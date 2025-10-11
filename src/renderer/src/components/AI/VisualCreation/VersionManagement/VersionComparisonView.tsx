import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ImageVersion, VersionComparison } from '../../../../types/versionManagement';
import { useVersionComparison } from '../../../../hooks/illustration';
import { VERSION_MANAGEMENT_CONSTANTS } from './index';
import { createLogger } from '../../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('VersionComparisonView');

// 比較模式
export type ComparisonMode = 'visual' | 'parameters' | 'metadata' | 'all';

// 比較布局
export type ComparisonLayout = 'side-by-side' | 'overlay' | 'slider';

// 版本比較視圖屬性
export interface VersionComparisonViewProps {
  // 核心資料
  version1?: ImageVersion;
  version2?: ImageVersion;
  comparison?: VersionComparison;
  
  // 顯示配置
  mode?: ComparisonMode;
  layout?: ComparisonLayout;
  showDifferences?: boolean;
  showSimilarity?: boolean;
  showReport?: boolean;
  
  // 尺寸配置
  minPanelWidth?: number;
  splitRatio?: number;
  
  // 事件回調
  onVersionChange?: (position: 'left' | 'right', version: ImageVersion) => void;
  onComparisonSave?: (comparison: VersionComparison) => void;
  onReportGenerate?: (comparison: VersionComparison) => void;
  onSplitRatioChange?: (ratio: number) => void;
  
  // 樣式
  className?: string;
  style?: React.CSSProperties;
}

const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  version1,
  version2,
  comparison,
  mode = 'all',
  layout = 'side-by-side',
  showDifferences = true,
  showSimilarity = true,
  showReport = true,
  minPanelWidth: _minPanelWidth = VERSION_MANAGEMENT_CONSTANTS.COMPARISON_CONFIG.minPanelWidth,
  splitRatio = VERSION_MANAGEMENT_CONSTANTS.COMPARISON_CONFIG.splitRatio,
  onVersionChange,
  onComparisonSave,
  onReportGenerate,
  onSplitRatioChange,
  className = '',
  style,
}) => {
  // Hooks
  const {
    comparisons,
    isComparing,
    compareVersions,
    calculateSimilarity,
    findDifferences,
    generateComparisonReport,
  } = useVersionComparison();

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);

  // 本地狀態
  const [_currentSplitRatio, setCurrentSplitRatio] = useState(splitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDiffType, setSelectedDiffType] = useState<string>('all');
  const [_showReportModal, setShowReportModal] = useState(false);

  // 計算當前比較
  const currentComparison = useMemo(() => {
    if (comparison) return comparison;
    if (!version1 || !version2) return null;
    
    // 查找現有比較
    const existing = comparisons.find(c => 
      (c.version1.id === version1.id && c.version2.id === version2.id) ||
      (c.version1.id === version2.id && c.version2.id === version1.id)
    );
    
    return existing || null;
  }, [comparison, version1, version2, comparisons]);

  // 計算實時相似度
  const similarity = useMemo(() => {
    if (currentComparison) return currentComparison.similarity;
    if (!version1 || !version2) return 0;
    return calculateSimilarity(version1, version2);
  }, [currentComparison, version1, version2, calculateSimilarity]);

  // 計算實時差異
  const differences = useMemo(() => {
    if (currentComparison) return currentComparison.differences;
    if (!version1 || !version2) return [];
    return findDifferences(version1, version2);
  }, [currentComparison, version1, version2, findDifferences]);

  // 篩選差異
  const filteredDifferences = useMemo(() => {
    if (selectedDiffType === 'all') return differences;
    return differences.filter(diff => diff.type === selectedDiffType);
  }, [differences, selectedDiffType]);

  // 處理分割條拖拽
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newRatio = (e.clientX - containerRect.left) / containerRect.width;
    const clampedRatio = Math.max(0.2, Math.min(0.8, newRatio));
    
    setCurrentSplitRatio(clampedRatio);
    onSplitRatioChange?.(clampedRatio);
  }, [isDragging, onSplitRatioChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 監聽全局鼠標事件
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 處理比較開始
  const handleStartComparison = useCallback(async () => {
    if (!version1 || !version2) return;
    
    try {
      await compareVersions(version1.id, version2.id);
    } catch (error) {
      log.error('比較失敗:', error);
    }
  }, [version1, version2, compareVersions]);

  // 處理報告生成
  const handleGenerateReport = useCallback(() => {
    if (!currentComparison) return;
    
    const _report = generateComparisonReport(currentComparison);
    setShowReportModal(true);
    onReportGenerate?.(currentComparison);
  }, [currentComparison, generateComparisonReport, onReportGenerate]);

  // 渲染版本選擇器
  const renderVersionSelector = (position: 'left' | 'right', version?: ImageVersion) => {
    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            版本 {position === 'left' ? 'A' : 'B'}
          </h3>
          <button
            onClick={() => version && onVersionChange?.(position, version)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            更換版本
          </button>
        </div>
        
        {version ? (
          <div className="mt-2 flex items-center space-x-3">
            <img
              src={version.imageUrl}
              alt={`版本 ${version.versionNumber}`}
              className="w-12 h-12 object-cover rounded border"
            />
            <div>
              <p className="font-medium text-sm">
                {version.metadata.title || `版本 ${version.versionNumber}`}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(version.metadata.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-sm text-gray-500">選擇一個版本進行比較</p>
          </div>
        )}
      </div>
    );
  };

  // 渲染視覺比較
  const renderVisualComparison = () => {
    if (!version1 || !version2) return null;

    if (layout === 'side-by-side') {
      return (
        <div className="flex h-full">
          {/* 左側版本 */}
          <div className="flex-1 p-4">
            <img
              src={version1.imageUrl}
              alt={`版本 ${version1.versionNumber}`}
              className="w-full h-auto max-h-96 object-contain border rounded"
            />
            <div className="mt-2 text-center text-sm text-gray-600">
              版本 {version1.versionNumber}
            </div>
          </div>
          
          {/* 分割線 */}
          <div
            ref={splitterRef}
            className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
            onMouseDown={handleSplitterMouseDown}
          />
          
          {/* 右側版本 */}
          <div className="flex-1 p-4">
            <img
              src={version2.imageUrl}
              alt={`版本 ${version2.versionNumber}`}
              className="w-full h-auto max-h-96 object-contain border rounded"
            />
            <div className="mt-2 text-center text-sm text-gray-600">
              版本 {version2.versionNumber}
            </div>
          </div>
        </div>
      );
    }

    // TODO: 實現 overlay 和 slider 布局
    return null;
  };

  // 渲染參數比較
  const renderParameterComparison = () => {
    if (!version1 || !version2) return null;

    const params1 = version1.metadata.aiParameters;
    const params2 = version2.metadata.aiParameters;

    const paramRows = [
      { label: '模型', key: 'model', value1: params1.model, value2: params2.model },
      { label: '提供商', key: 'provider', value1: params1.provider, value2: params2.provider },
      { label: '種子值', key: 'seed', value1: params1.seed, value2: params2.seed },
      { label: '指導強度', key: 'guidance', value1: params1.guidance, value2: params2.guidance },
      { label: '生成步數', key: 'steps', value1: params1.steps, value2: params2.steps },
      { label: '增強', key: 'enhance', value1: params1.enhance ? '是' : '否', value2: params2.enhance ? '是' : '否' },
      { label: '風格', key: 'style', value1: params1.style, value2: params2.style },
    ];

    return (
      <div className="p-4">
        <h4 className="text-lg font-medium mb-4">AI 參數比較</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3">參數</th>
                <th className="text-left py-2 px-3">版本 A</th>
                <th className="text-left py-2 px-3">版本 B</th>
                <th className="text-center py-2 px-3">狀態</th>
              </tr>
            </thead>
            <tbody>
              {paramRows.map((row) => {
                const isDifferent = row.value1 !== row.value2;
                return (
                  <tr key={row.key} className={`border-b border-gray-100 ${isDifferent ? 'bg-yellow-50' : ''}`}>
                    <td className="py-2 px-3 font-medium">{row.label}</td>
                    <td className="py-2 px-3">{row.value1 || '無'}</td>
                    <td className="py-2 px-3">{row.value2 || '無'}</td>
                    <td className="py-2 px-3 text-center">
                      {isDifferent ? (
                        <span className="text-yellow-600">⚠️ 不同</span>
                      ) : (
                        <span className="text-green-600">✓ 相同</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 渲染差異列表
  const renderDifferencesList = () => {
    if (!showDifferences || filteredDifferences.length === 0) return null;

    return (
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium">差異分析</h4>
          <select
            value={selectedDiffType}
            onChange={(e) => setSelectedDiffType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">所有差異</option>
            <option value="prompt">提示詞</option>
            <option value="parameters">參數</option>
            <option value="metadata">元資料</option>
            <option value="visual">視覺</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredDifferences.map((diff, index) => (
            <div
              key={index}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-yellow-800">{diff.description}</h5>
                  <p className="text-sm text-yellow-700 mt-1">欄位: {diff.field}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  diff.type === 'prompt' ? 'bg-blue-100 text-blue-800' :
                  diff.type === 'parameters' ? 'bg-green-100 text-green-800' :
                  diff.type === 'metadata' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {diff.type}
                </span>
              </div>
              
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">版本 A</p>
                  <p className="text-sm bg-white p-2 rounded border">
                    {String(diff.oldValue) || '無'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">版本 B</p>
                  <p className="text-sm bg-white p-2 rounded border">
                    {String(diff.newValue) || '無'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染相似度分析
  const renderSimilarityAnalysis = () => {
    if (!showSimilarity || !version1 || !version2) return null;

    const similarityPercentage = Math.round(similarity * 100);
    
    return (
      <div className="p-4 border-t border-gray-200">
        <h4 className="text-lg font-medium mb-4">相似度分析</h4>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">整體相似度</span>
              <span className="text-lg font-bold text-blue-600">{similarityPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  similarityPercentage >= 80 ? 'bg-green-500' :
                  similarityPercentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${similarityPercentage}%` }}
              />
            </div>
          </div>
          
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              similarityPercentage >= 80 ? 'bg-green-500' :
              similarityPercentage >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              {similarityPercentage >= 80 ? '😊' :
               similarityPercentage >= 60 ? '😐' :
               '😞'}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {similarityPercentage >= 80 ? '高度相似' :
               similarityPercentage >= 60 ? '中度相似' :
               '差異較大'}
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>發現 {differences.length} 項差異</p>
          <p>比較於 {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  if (!version1 || !version2) {
    return (
      <div className={`version-comparison-view h-full ${className}`} style={style}>
        <div className="h-full flex">
          <div className="flex-1 border-r border-gray-200">
            {renderVersionSelector('left', version1)}
          </div>
          <div className="flex-1">
            {renderVersionSelector('right', version2)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`version-comparison-view h-full bg-white ${className}`}
      style={style}
    >
      {/* 工具列 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium">版本比較</h3>
          
          <select
            value={mode}
            onChange={(_e) => {/* TODO: 處理模式切換 */}}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">完整比較</option>
            <option value="visual">視覺比較</option>
            <option value="parameters">參數比較</option>
            <option value="metadata">元資料比較</option>
          </select>
          
          <select
            value={layout}
            onChange={(_e) => {/* TODO: 處理布局切換 */}}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="side-by-side">並排顯示</option>
            <option value="overlay">覆蓋顯示</option>
            <option value="slider">滑動比較</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          {!currentComparison && (
            <button
              onClick={handleStartComparison}
              disabled={isComparing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isComparing ? '比較中...' : '開始比較'}
            </button>
          )}
          
          {currentComparison && showReport && (
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              生成報告
            </button>
          )}
          
          {currentComparison && (
            <button
              onClick={() => onComparisonSave?.(currentComparison)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              儲存比較
            </button>
          )}
        </div>
      </div>

      {/* 主要內容區域 */}
      <div className="flex-1 overflow-auto">
        {(mode === 'visual' || mode === 'all') && renderVisualComparison()}
        {(mode === 'parameters' || mode === 'all') && renderParameterComparison()}
        {mode === 'all' && renderSimilarityAnalysis()}
        {mode === 'all' && renderDifferencesList()}
      </div>
    </div>
  );
};

export default VersionComparisonView;