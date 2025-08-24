import React, { useState, useEffect, useMemo } from 'react';
import { 
  ImageNamingConfig, 
  RenamePreviewResult,
  BatchRenameOperation 
} from '../../../../types/imageMetadata';
import { imageNamingService } from '../../../../services/imageNamingService';

interface ImageNamingPanelProps {
  selectedImageIds: string[];
  onClose: () => void;
  onApply: (operation: BatchRenameOperation) => void;
  className?: string;
}

/**
 * 圖片命名面板 - 提供批次重命名和命名規則配置
 */
export const ImageNamingPanel: React.FC<ImageNamingPanelProps> = ({
  selectedImageIds,
  onClose,
  onApply,
  className = ''
}) => {
  const [namingConfig, setNamingConfig] = useState<ImageNamingConfig>({
    template: imageNamingService.defaultTemplates.basic,
    includeTimestamp: false,
    includeChapterInfo: true,
    includeCharacterInfo: true,
    maxLength: 100,
    sanitizeSpecialChars: true
  });

  const [previewResults, setPreviewResults] = useState<RenamePreviewResult[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('basic');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 可用的模板選項
  const templateOptions = [
    { id: 'basic', name: '基本模板', template: imageNamingService.defaultTemplates.basic },
    { id: 'chapterDetailed', name: '章節詳細', template: imageNamingService.defaultTemplates.chapterDetailed },
    { id: 'ebook', name: '電子書優化', template: imageNamingService.defaultTemplates.ebook },
    { id: 'character', name: '角色專用', template: imageNamingService.defaultTemplates.character },
    { id: 'scene', name: '場景專用', template: imageNamingService.defaultTemplates.scene },
    { id: 'timestamped', name: '時間戳', template: imageNamingService.defaultTemplates.timestamped }
  ];

  // 可用變數列表
  const availableVariables = useMemo(() => {
    return imageNamingService.getAvailableVariables();
  }, []);

  // 變數分類
  const variablesByCategory = useMemo(() => {
    return availableVariables.reduce((acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    }, {} as Record<string, typeof availableVariables>);
  }, [availableVariables]);

  // 生成預覽
  const generatePreview = async () => {
    if (selectedImageIds.length === 0) return;
    
    setIsPreviewLoading(true);
    try {
      const operation: BatchRenameOperation = {
        imageIds: selectedImageIds,
        namingRule: namingConfig,
        previewMode: true,
        confirmRequired: true
      };
      
      const results = await imageNamingService.previewBatchRename(operation);
      setPreviewResults(results);
    } catch (error) {
      console.error('生成重命名預覽失敗:', error);
      setPreviewResults([]);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 模板變更處理
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templateOptions.find(t => t.id === templateId)?.template || '';
    setNamingConfig(prev => ({
      ...prev,
      template
    }));
  };

  // 配置變更處理
  const handleConfigChange = (updates: Partial<ImageNamingConfig>) => {
    setNamingConfig(prev => ({ ...prev, ...updates }));
  };

  // 插入變數到模板
  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`;
    const template = namingConfig.template;
    setNamingConfig(prev => ({
      ...prev,
      template: template + (template ? '_' : '') + variable
    }));
  };

  // 應用重命名
  const handleApply = () => {
    const operation: BatchRenameOperation = {
      imageIds: selectedImageIds,
      namingRule: namingConfig,
      previewMode: false,
      confirmRequired: true
    };
    onApply(operation);
  };

  // 自動生成預覽
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePreview();
    }, 500);
    return () => clearTimeout(timer);
  }, [namingConfig, selectedImageIds]);

  const hasConflicts = previewResults.some(result => result.conflicts);
  const hasWarnings = previewResults.some(result => result.warnings.length > 0);

  return (
    <div className={`bg-cosmic-800/95 border border-cosmic-700 rounded-lg shadow-xl ${className}`}>
      {/* 標題列 */}
      <div className="flex items-center justify-between p-4 border-b border-cosmic-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gold-600/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-cosmic-100">批次重命名</h3>
            <p className="text-sm text-cosmic-400">已選擇 {selectedImageIds.length} 張圖片</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-cosmic-400 hover:text-cosmic-200 hover:bg-cosmic-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* 模板選擇 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-cosmic-300">命名模板</label>
          <div className="grid grid-cols-2 gap-2">
            {templateOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleTemplateChange(option.id)}
                className={`p-3 text-left rounded-lg border transition-all ${
                  selectedTemplate === option.id
                    ? 'border-gold-500 bg-gold-600/10 text-gold-200'
                    : 'border-cosmic-600 bg-cosmic-800/50 text-cosmic-300 hover:border-cosmic-500 hover:bg-cosmic-700/50'
                }`}
              >
                <div className="font-medium">{option.name}</div>
                <div className="text-xs text-cosmic-400 mt-1 font-mono">
                  {option.template}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 自訂模板 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-cosmic-300">自訂模板</label>
          <div className="relative">
            <input
              type="text"
              value={namingConfig.template}
              onChange={(e) => handleConfigChange({ template: e.target.value })}
              className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 text-cosmic-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent font-mono text-sm"
              placeholder="輸入命名模板..."
            />
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cosmic-400 hover:text-cosmic-200"
              title="顯示變數說明"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 變數說明 */}
        {showAdvanced && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-cosmic-300">可用變數</div>
            <div className="bg-cosmic-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              {Object.entries(variablesByCategory).map(([category, variables]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="text-xs font-medium text-cosmic-400 uppercase tracking-wide mb-2">
                    {category}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {variables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.name)}
                        className="text-left p-2 rounded hover:bg-cosmic-700 text-xs group"
                        title={variable.description}
                      >
                        <div className="font-mono text-gold-400 group-hover:text-gold-300">
                          {`{${variable.name}}`}
                        </div>
                        <div className="text-cosmic-500 group-hover:text-cosmic-400 truncate">
                          {variable.example}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 命名選項 */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={namingConfig.includeTimestamp}
              onChange={(e) => handleConfigChange({ includeTimestamp: e.target.checked })}
              className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
            />
            <span className="text-sm text-cosmic-300">包含時間戳</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={namingConfig.sanitizeSpecialChars}
              onChange={(e) => handleConfigChange({ sanitizeSpecialChars: e.target.checked })}
              className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
            />
            <span className="text-sm text-cosmic-300">清理特殊字元</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={namingConfig.includeChapterInfo}
              onChange={(e) => handleConfigChange({ includeChapterInfo: e.target.checked })}
              className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
            />
            <span className="text-sm text-cosmic-300">包含章節資訊</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={namingConfig.includeCharacterInfo}
              onChange={(e) => handleConfigChange({ includeCharacterInfo: e.target.checked })}
              className="w-4 h-4 text-gold-600 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
            />
            <span className="text-sm text-cosmic-300">包含角色資訊</span>
          </label>
        </div>

        {/* 檔名長度限制 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-cosmic-300">
            檔名最大長度: {namingConfig.maxLength}
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={namingConfig.maxLength}
            onChange={(e) => handleConfigChange({ maxLength: parseInt(e.target.value) })}
            className="w-full h-2 bg-cosmic-700 rounded-lg appearance-none slider"
          />
        </div>

        {/* 預覽區域 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-cosmic-300">重命名預覽</span>
            {isPreviewLoading && (
              <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          
          {previewResults.length > 0 && (
            <div className="bg-cosmic-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {previewResults.slice(0, 5).map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="text-cosmic-400 truncate">{result.originalName}</div>
                      <div className={`font-mono truncate ${
                        result.conflicts ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {result.newName}
                      </div>
                    </div>
                    {(result.conflicts || result.warnings.length > 0) && (
                      <div className="ml-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full ${
                          result.conflicts ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                      </div>
                    )}
                  </div>
                ))}
                {previewResults.length > 5 && (
                  <div className="text-xs text-cosmic-500 text-center pt-2 border-t border-cosmic-700">
                    還有 {previewResults.length - 5} 個檔案...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 警告訊息 */}
        {(hasConflicts || hasWarnings) && (
          <div className="space-y-2">
            {hasConflicts && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>發現檔名衝突，部分檔案可能無法重命名</span>
              </div>
            )}
            {hasWarnings && !hasConflicts && (
              <div className="flex items-center space-x-2 text-yellow-400 text-sm bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>部分檔案有命名警告，請檢查預覽結果</span>
              </div>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-cosmic-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-cosmic-300 hover:text-cosmic-100 hover:bg-cosmic-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={generatePreview}
            disabled={isPreviewLoading}
            className="px-4 py-2 bg-cosmic-600 text-cosmic-200 hover:bg-cosmic-500 hover:text-cosmic-100 rounded-lg transition-colors disabled:opacity-50"
          >
            重新預覽
          </button>
          <button
            onClick={handleApply}
            disabled={hasConflicts || isPreviewLoading || previewResults.length === 0}
            className="px-4 py-2 bg-gold-600 text-white hover:bg-gold-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            應用重命名
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageNamingPanel;