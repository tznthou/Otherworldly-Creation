// 模板匯入精靈組件
import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api';
import { createCustomTemplate } from '../../store/slices/templatesSlice';
import type { AppDispatch } from '../../store/store';
import type { NovelParseResult, AnalysisOptions } from '../../services/novelAnalysisService';
import type { AnalysisProgress } from '../../services/novelAnalysisService';
import type { NovelTemplate } from '../../types/template';

interface TemplateImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (template: NovelTemplate) => void;
}

type WizardStep = 'upload' | 'options' | 'analyzing' | 'preview' | 'saving';

interface ImportOptions {
  analysisDepth: 'basic' | 'standard' | 'deep';
  focusAreas: ('world' | 'character' | 'plot' | 'style')[];
  language: 'zh-TW' | 'zh-CN' | 'en' | 'ja';
}

const DEFAULT_OPTIONS: ImportOptions = {
  analysisDepth: 'standard',
  focusAreas: ['world', 'character', 'plot', 'style'],
  language: 'zh-TW'
};

export const TemplateImportWizard: React.FC<TemplateImportWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parseResult, setParseResult] = useState<NovelParseResult | null>(null);
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<NovelTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 重置狀態
  const resetWizard = useCallback(() => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setFileContent('');
    setParseResult(null);
    setOptions(DEFAULT_OPTIONS);
    setAnalysisProgress(null);
    setGeneratedTemplate(null);
    setError(null);
    setIsProcessing(false);
  }, []);

  // 處理文件選擇
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查文件類型
    const allowedTypes = ['text/plain', 'application/json'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|json)$/i)) {
      setError('只支援 TXT 和 JSON 格式的檔案');
      return;
    }

    // 檢查文件大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('檔案大小不能超過 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // 讀取文件內容
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setError('檔案讀取失敗');
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  // 處理文本粘貼
  const handleTextPaste = useCallback((content: string) => {
    if (!content.trim()) {
      setError('請輸入小說內容');
      return;
    }

    if (content.length < 500) {
      setError('內容太短，至少需要 500 個字符');
      return;
    }

    setFileContent(content);
    setSelectedFile(null);
    setError(null);
  }, []);

  // 下一步：文件解析
  const handleParseFile = useCallback(async () => {
    if (!fileContent) {
      setError('請先選擇檔案或輸入內容');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 判斷是否為 JSON 模板格式
      if (selectedFile?.name.endsWith('.json') || fileContent.trim().startsWith('{')) {
        try {
          const templateData = JSON.parse(fileContent);
          // 驗證是否為有效的模板格式
          if (templateData.worldSetting && templateData.characterArchetypes) {
            // 直接作為模板匯入
            const template: NovelTemplate = {
              ...templateData,
              id: `import-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isCustom: true,
              isActive: true
            };
            setGeneratedTemplate(template);
            setCurrentStep('preview');
            return;
          }
        } catch {
          // 如果 JSON 解析失敗，當作普通文本處理
        }
      }

      // 解析小說文本
      const result = await api.novelAnalysis.parseNovel(
        fileContent,
        selectedFile?.name
      );
      setParseResult(result);
      setCurrentStep('options');
    } catch (err) {
      setError(err instanceof Error ? err.message : '檔案解析失敗');
    } finally {
      setIsProcessing(false);
    }
  }, [fileContent, selectedFile]);

  // 開始分析
  const handleStartAnalysis = useCallback(async () => {
    if (!parseResult) return;

    setIsProcessing(true);
    setCurrentStep('analyzing');
    setError(null);

    try {
      const analysisOptions: AnalysisOptions = {
        depth: options.analysisDepth,
        focusAreas: options.focusAreas,
        language: options.language
      };

      const template = await api.novelAnalysis.analyzeNovel(
        parseResult,
        analysisOptions,
        setAnalysisProgress
      );

      setGeneratedTemplate(template);
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗');
      setCurrentStep('options');
    } finally {
      setIsProcessing(false);
    }
  }, [parseResult, options]);

  // 儲存模板
  const handleSaveTemplate = useCallback(async () => {
    if (!generatedTemplate) return;

    setIsProcessing(true);
    setCurrentStep('saving');

    try {
      await dispatch(createCustomTemplate(generatedTemplate)).unwrap();
      onComplete?.(generatedTemplate);
      onClose();
      resetWizard();
    } catch (err) {
      setError(err instanceof Error ? err.message : '模板儲存失敗');
      setCurrentStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [generatedTemplate, dispatch, onComplete, onClose, resetWizard]);

  // 關閉精靈
  const handleClose = useCallback(() => {
    onClose();
    resetWizard();
  }, [onClose, resetWizard]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]" style={{ isolation: 'isolate' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-cosmic-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gold-500/20"
      >
        {/* 標題列 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">小說模板匯入精靈</h2>
              <p className="text-warm-gold/60 mt-1">從小說內容自動生成創作模板</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 進度指示器 */}
          <div className="mt-6">
            <div className="flex items-center space-x-4">
              {[
                { key: 'upload', label: '上傳檔案', icon: '📁' },
                { key: 'options', label: '分析選項', icon: '⚙️' },
                { key: 'analyzing', label: '智能分析', icon: '🔍' },
                { key: 'preview', label: '預覽模板', icon: '👀' },
                { key: 'saving', label: '儲存完成', icon: '✅' }
              ].map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep === step.key
                      ? 'bg-white text-warm-gold border-white'
                      : index < ['upload', 'options', 'analyzing', 'preview', 'saving'].indexOf(currentStep)
                      ? 'bg-warm-gold/25 text-white border-warm-gold'
                      : 'border-warm-gold/50 text-warm-gold'
                  }`}>
                    <span className="text-sm">{step.icon}</span>
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep === step.key ? 'text-white font-medium' : 'text-warm-gold/80'
                  }`}>
                    {step.label}
                  </span>
                  {index < 4 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      index < ['upload', 'options', 'analyzing', 'preview', 'saving'].indexOf(currentStep)
                        ? 'bg-warm-gold/25'
                        : 'bg-warm-gold/15'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-6 max-h-[70vh] overflow-y-auto bg-cosmic-950">
          <AnimatePresence mode="wait">
            {/* 步驟 1: 檔案上傳 */}
            {currentStep === 'upload' && (
              <UploadStep
                onFileSelect={handleFileSelect}
                onTextPaste={handleTextPaste}
                selectedFile={selectedFile}
                fileContent={fileContent}
                error={error}
                isProcessing={isProcessing}
                onNext={handleParseFile}
              />
            )}

            {/* 步驟 2: 分析選項 */}
            {currentStep === 'options' && parseResult && (
              <OptionsStep
                parseResult={parseResult}
                options={options}
                onOptionsChange={setOptions}
                onBack={() => setCurrentStep('upload')}
                onNext={handleStartAnalysis}
                error={error}
              />
            )}

            {/* 步驟 3: 分析中 */}
            {currentStep === 'analyzing' && (
              <AnalyzingStep
                progress={analysisProgress}
                error={error}
              />
            )}

            {/* 步驟 4: 預覽模板 */}
            {currentStep === 'preview' && generatedTemplate && (
              <PreviewStep
                template={generatedTemplate}
                onTemplateChange={setGeneratedTemplate}
                onBack={() => setCurrentStep('options')}
                onSave={handleSaveTemplate}
                error={error}
              />
            )}

            {/* 步驟 5: 儲存中 */}
            {currentStep === 'saving' && (
              <SavingStep />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// 檔案上傳步驟組件
const UploadStep: React.FC<{
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTextPaste: (content: string) => void;
  selectedFile: File | null;
  fileContent: string;
  error: string | null;
  isProcessing: boolean;
  onNext: () => void;
}> = ({ onFileSelect, onTextPaste, selectedFile, fileContent, error, isProcessing, onNext }) => {
  const [pastedText, setPastedText] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white">選擇匯入方式</h3>
        <p className="text-gray-300 mt-1">
          您可以上傳小說檔案或貼上文本內容，系統將自動分析並生成創作模板
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 檔案上傳 */}
        <div className="relative border-2 border-dashed border-cosmic-600 rounded-lg p-6 hover:border-gold-400 transition-colors bg-cosmic-800">
          <div className="text-center pointer-events-none">
            <svg className="mx-auto h-12 w-12 text-cosmic-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-4">
              <span className="mt-2 block text-sm font-medium text-white">
                點擊上傳檔案
              </span>
              <span className="mt-1 block text-xs text-gray-300">
                支援 TXT、JSON 格式，最大 10MB
              </span>
            </div>
          </div>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept=".txt,.json"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={onFileSelect}
          />
          {selectedFile && (
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <div className="inline-block bg-green-900/50 text-green-300 text-sm px-3 py-1 rounded-full border border-green-600/50">
                已選擇：{selectedFile.name}
              </div>
            </div>
          )}
        </div>

        {/* 文本輸入 */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-white">
            或直接貼上小說內容
          </label>
          <textarea
            className="w-full h-32 px-3 py-2 bg-cosmic-800 border border-cosmic-600 rounded-md focus:ring-2 focus:ring-gold-400 focus:border-gold-400 resize-none text-white placeholder-gray-400"
            placeholder="在此貼上您的小說內容..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <button
            type="button"
            onClick={() => onTextPaste(pastedText)}
            disabled={!pastedText.trim()}
            className="w-full px-4 py-2 bg-gold-600 text-cosmic-900 font-medium rounded-md hover:bg-gold-500 focus:ring-2 focus:ring-gold-400 disabled:bg-cosmic-600 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            使用此內容
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!fileContent || isProcessing}
          className="px-6 py-2 bg-gold-600 text-cosmic-900 font-medium rounded-md hover:bg-gold-500 focus:ring-2 focus:ring-gold-400 disabled:bg-cosmic-600 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center"
        >
          {isProcessing && (
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-cosmic-800" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isProcessing ? '解析中...' : '下一步'}
        </button>
      </div>
    </motion.div>
  );
};

// 分析選項步驟組件 (簡化版)
const OptionsStep: React.FC<{
  parseResult: NovelParseResult;
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
}> = ({ parseResult, options, onOptionsChange, onBack, onNext, error }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white">設定分析選項</h3>
        <p className="text-gray-300 mt-1">
          自訂分析深度和重點領域，以獲得最適合的模板
        </p>
      </div>

      {/* 檔案資訊 */}
      <div className="bg-cosmic-800 rounded-lg p-4">
        <h4 className="font-medium text-gold-400 mb-2">檔案資訊</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">標題:</span>
            <span className="ml-2 font-medium text-white">{parseResult.title || '未知'}</span>
          </div>
          <div>
            <span className="text-gray-400">總字數:</span>
            <span className="ml-2 font-medium text-white">{parseResult.statistics.totalWords.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">章節數:</span>
            <span className="ml-2 font-medium text-white">{parseResult.chapters.length}</span>
          </div>
          <div>
            <span className="text-gray-400">角色數:</span>
            <span className="ml-2 font-medium text-white">{parseResult.basicAnalysis.characters.length}</span>
          </div>
        </div>
      </div>

      {/* 分析深度選擇 */}
      <div>
        <label className="block text-sm font-medium text-gold-400 mb-3">分析深度</label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'basic', label: '基礎', desc: '快速分析，提取核心元素' },
            { value: 'standard', label: '標準', desc: '平衡分析深度和速度' },
            { value: 'deep', label: '深度', desc: '詳細分析，生成豐富模板' }
          ].map((depth) => (
            <label key={depth.value} className="cursor-pointer">
              <input
                type="radio"
                name="depth"
                value={depth.value}
                checked={options.analysisDepth === depth.value}
                onChange={(e) => onOptionsChange({ 
                  ...options, 
                  analysisDepth: e.target.value as 'basic' | 'standard' | 'deep'
                })}
                className="sr-only"
              />
              <div className={`border-2 rounded-lg p-4 ${
                options.analysisDepth === depth.value
                  ? 'border-gold-400 bg-gold-900/20'
                  : 'border-cosmic-600 hover:border-cosmic-500 bg-cosmic-800'
              }`}>
                <div className="font-medium text-white">{depth.label}</div>
                <div className="text-sm text-gray-300 mt-1">{depth.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 分析重點 */}
      <div>
        <label className="block text-sm font-medium text-gold-400 mb-3">分析重點</label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'world', label: '世界觀設定', icon: '🌍' },
            { value: 'character', label: '角色分析', icon: '👥' },
            { value: 'plot', label: '劇情結構', icon: '📖' },
            { value: 'style', label: '寫作風格', icon: '✍️' }
          ].map((area) => (
            <label key={area.value} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={options.focusAreas.includes(area.value as 'world' | 'character' | 'plot' | 'style')}
                onChange={(e) => {
                  const newAreas = e.target.checked
                    ? [...options.focusAreas, area.value as 'world' | 'character' | 'plot' | 'style']
                    : options.focusAreas.filter(a => a !== area.value);
                  onOptionsChange({ ...options, focusAreas: newAreas });
                }}
                className="h-4 w-4 text-gold-600 focus:ring-gold-400 border-cosmic-600 rounded bg-cosmic-700"
              />
              <span className="ml-3 text-sm text-white">
                {area.icon} {area.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-md p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-cosmic-600 text-gray-300 rounded-md hover:bg-cosmic-700 focus:ring-2 focus:ring-warm-gold"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={options.focusAreas.length === 0}
          className="px-6 py-2 bg-gold-600 text-cosmic-900 font-medium rounded-md hover:bg-gold-500 focus:ring-2 focus:ring-gold-400 disabled:bg-cosmic-600 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          開始分析
        </button>
      </div>
    </motion.div>
  );
};

// 分析進行中步驟組件
const AnalyzingStep: React.FC<{
  progress: AnalysisProgress | null;
  error: string | null;
}> = ({ progress, error }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="text-center space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white">AI 智能分析中</h3>
        <p className="text-gray-300 mt-1">
          正在使用人工智能技術分析您的小說內容...
        </p>
      </div>

      {/* 動畫圖標 */}
      <div className="flex justify-center">
        <div className="relative">
          <svg className="animate-spin h-12 w-12 text-gold-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>

      {/* 進度資訊 */}
      {progress && (
        <div className="max-w-md mx-auto">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-300">{progress.message}</span>
            <span className="text-white font-medium">{progress.current}%</span>
          </div>
          <div className="w-full bg-cosmic-600 rounded-full h-2">
            <div 
              className="bg-gold-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.current}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            階段: {progress.stage === 'preparing' ? '準備中' :
                  progress.stage === 'analyzing' ? '分析中' :
                  progress.stage === 'aggregating' ? '整合中' :
                  progress.stage === 'generating' ? '生成中' : '完成'}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-md p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* 分析提示 */}
      <div className="text-sm text-gray-300 space-y-2">
        <p>✨ 正在分析世界觀設定和角色特徵</p>
        <p>📚 解析劇情結構和寫作風格</p>
        <p>🎯 生成個性化創作模板</p>
      </div>
    </motion.div>
  );
};

// 預覽步驟組件 (簡化版)
const PreviewStep: React.FC<{
  template: NovelTemplate;
  onTemplateChange: (template: NovelTemplate) => void;
  onBack: () => void;
  onSave: () => void;
  error: string | null;
}> = ({ template, onTemplateChange, onBack, onSave, error }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white">預覽生成的模板</h3>
        <p className="text-gray-300 mt-1">
          檢查並調整模板內容，確認無誤後即可儲存
        </p>
      </div>

      <div className="bg-cosmic-800 rounded-lg p-6 max-h-96 overflow-y-auto border border-cosmic-600">
        <div className="space-y-4">
          {/* 基本資訊 */}
          <div>
            <label className="block text-sm font-medium text-gold-400 mb-1">模板名稱</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => onTemplateChange({ ...template, name: e.target.value })}
              className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-md focus:ring-2 focus:ring-gold-400 text-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gold-400 mb-1">描述</label>
            <textarea
              value={template.description}
              onChange={(e) => onTemplateChange({ ...template, description: e.target.value })}
              className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-md focus:ring-2 focus:ring-gold-400 text-white placeholder-gray-400"
              rows={3}
            />
          </div>

          {/* 世界觀設定 */}
          <div>
            <h4 className="font-medium text-gold-400 mb-2">世界觀設定</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">時代:</span>
                <span className="ml-2 text-white">{template.worldSetting.era}</span>
              </div>
              <div>
                <span className="text-gray-400">科技:</span>
                <span className="ml-2 text-white">{template.worldSetting.technology}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">特殊元素:</span>
                <span className="ml-2">{template.worldSetting.specialElements.join('、')}</span>
              </div>
            </div>
          </div>

          {/* 角色原型 */}
          <div>
            <h4 className="font-medium text-gold-400 mb-2">角色原型 ({template.characterArchetypes.length})</h4>
            <div className="space-y-2">
              {template.characterArchetypes.slice(0, 3).map((char, index) => (
                <div key={index} className="text-sm border-l-4 border-gold-400 pl-3">
                  <div className="font-medium text-white">{char.name}</div>
                  <div className="text-gray-300">{char.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-md p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-cosmic-600 text-gray-300 rounded-md hover:bg-cosmic-700 focus:ring-2 focus:ring-warm-gold"
        >
          重新分析
        </button>
        <button
          onClick={onSave}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
        >
          儲存模板
        </button>
      </div>
    </motion.div>
  );
};

// 儲存中步驟組件
const SavingStep: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="text-center space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-white">儲存模板中</h3>
        <p className="text-gray-300 mt-1">
          正在將生成的模板儲存到您的模板庫...
        </p>
      </div>

      <div className="flex justify-center">
        <svg className="animate-spin h-8 w-8 text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </motion.div>
  );
};