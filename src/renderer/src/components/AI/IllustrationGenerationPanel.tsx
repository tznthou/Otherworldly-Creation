import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { api } from '../../api';
import { 
  DetailedGenerationResult,
  StyleTemplate
} from '../../types/illustration';
import CosmicButton from '../UI/CosmicButton';
import CosmicInput from '../UI/CosmicInput';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Progress } from '../UI/Progress';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';

interface IllustrationGenerationPanelProps {
  className?: string;
  onGenerationComplete?: (result: DetailedGenerationResult) => void;
  onError?: (error: string) => void;
}

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
}

const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'anime-portrait',
    name: '動漫人物肖像',
    style_type: 'anime',
    prompt_template: 'anime style portrait, detailed face, expressive eyes, soft lighting',
    negative_prompt: 'blurry, low quality, distorted, bad anatomy',
    api_params: { guidance_scale: 7.5 },
    suitable_for: ['character']
  },
  {
    id: 'fantasy-scene',
    name: '奇幻場景',
    style_type: 'fantasy',
    prompt_template: 'fantasy scene, magical atmosphere, detailed background, epic composition',
    negative_prompt: 'modern, realistic, plain background',
    api_params: { guidance_scale: 8.0 },
    suitable_for: ['scene', 'background']
  },
  {
    id: 'manga-style',
    name: '漫畫風格',
    style_type: 'manga',
    prompt_template: 'manga style, black and white, detailed lineart, screentone effects',
    negative_prompt: 'colored, photorealistic, blurry lines',
    api_params: { guidance_scale: 7.0 },
    suitable_for: ['character', 'scene']
  },
  {
    id: 'illustration',
    name: '精美插畫',
    style_type: 'illustration',
    prompt_template: 'detailed illustration, vibrant colors, professional artwork, high quality',
    negative_prompt: 'sketch, unfinished, low detail, amateur',
    api_params: { guidance_scale: 8.5 },
    suitable_for: ['character', 'scene', 'cover']
  }
];

const ASPECT_RATIOS = [
  { value: 'square', label: '正方形 (1:1)', description: '適合頭像、肖像' },
  { value: 'portrait', label: '豎版 (9:16)', description: '適合人物全身、書籍封面' },
  { value: 'landscape', label: '橫版 (16:9)', description: '適合風景、場景' },
  { value: 'standard', label: '標準 (4:3)', description: '經典比例' },
  { value: 'tall', label: '高長版 (3:4)', description: '適合立繪' }
];

const QUALITY_PRESETS = [
  { value: 'speed', label: '快速', description: '生成速度快，品質一般' },
  { value: 'balanced', label: '平衡', description: '速度與品質兼顾' },
  { value: 'quality', label: '高品質', description: '生成時間長，品質最佳' }
];

export const IllustrationGenerationPanel: React.FC<IllustrationGenerationPanelProps> = ({
  className = '',
  onGenerationComplete,
  onError
}) => {
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);

  // 組件狀態
  const [sceneDescription, setSceneDescription] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('anime-portrait');
  const [aspectRatio, setAspectRatio] = useState<string>('square');
  const [qualityPreset, setQualityPreset] = useState<string>('balanced');
  const [customNegativePrompt, setCustomNegativePrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [useCharacterConsistency, setUseCharacterConsistency] = useState(true);
  
  // 生成狀態
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<DetailedGenerationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionValid, setConnectionValid] = useState<boolean | null>(null);

  // 初始化生成步驟
  const initializeSteps = () => {
    const steps: GenerationStep[] = [
      {
        id: 'validation',
        title: '驗證輸入',
        description: '檢查場景描述和參數設定',
        progress: 0,
        status: 'pending'
      },
      {
        id: 'translation',
        title: '翻譯優化',
        description: '將中文描述翻譯為英文提示詞',
        progress: 0,
        status: 'pending'
      },
      {
        id: 'consistency',
        title: '一致性處理',
        description: '應用角色一致性設定和種子值',
        progress: 0,
        status: 'pending'
      },
      {
        id: 'generation',
        title: 'AI 生成',
        description: 'Gemini Imagen API 生成插畫',
        progress: 0,
        status: 'pending'
      },
      {
        id: 'processing',
        title: '後處理',
        description: '儲存結果和品質分析',
        progress: 0,
        status: 'pending'
      }
    ];
    setGenerationSteps(steps);
  };

  // 更新步驟狀態
  const updateStepStatus = (stepId: string, status: GenerationStep['status'], progress: number = 0) => {
    setGenerationSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress } : step
    ));
  };

  // 驗證 API 連接
  const validateConnection = async () => {
    if (!apiKey.trim()) {
      setError('請輸入 Google Cloud API 金鑰');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const result = await api.illustration.validateImagenConnection(apiKey);
      
      if (result.success && result.valid) {
        setConnectionValid(true);
        setError('');
      } else {
        setConnectionValid(false);
        setError(result.error || 'API 連接驗證失敗');
      }
    } catch (err) {
      setConnectionValid(false);
      setError(`連接驗證錯誤: ${err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // 生成插畫
  const handleGenerate = async () => {
    if (!currentProject) {
      setError('請先選擇一個專案');
      return;
    }

    if (!sceneDescription.trim()) {
      setError('請輸入場景描述');
      return;
    }

    if (!apiKey.trim()) {
      setError('請輸入 Google Cloud API 金鑰');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGenerationResult(null);
    initializeSteps();

    try {
      // 步驟 1: 驗證輸入
      updateStepStatus('validation', 'active', 20);
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStepStatus('validation', 'completed', 100);

      // 步驟 2-5: 調用 API
      updateStepStatus('translation', 'active', 0);
      
      const selectedCharacterObj = characters.find(c => c.id === selectedCharacter);
      
      const result = await api.illustration.generateIllustration(
        currentProject.id,
        selectedCharacter || null,
        sceneDescription,
        selectedTemplate,
        'anime', // translation style
        qualityPreset, // optimization level
        aspectRatio,
        'block_most', // safety level
        customNegativePrompt || undefined,
        apiKey
      );

      // 模擬步驟進度
      updateStepStatus('translation', 'completed', 100);
      updateStepStatus('consistency', 'active', 50);
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus('consistency', 'completed', 100);
      updateStepStatus('generation', 'active', 75);
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStepStatus('generation', 'completed', 100);
      updateStepStatus('processing', 'active', 90);
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStepStatus('processing', 'completed', 100);

      if (result.success) {
        const detailedResult: DetailedGenerationResult = {
          basic_response: {
            id: result.task_id,
            status: result.status,
            image_url: result.image_url,
            translated_prompt: result.translated_prompt,
            seed_value: result.seed_value,
            consistency_score: result.consistency_score,
            quality_score: result.quality_score,
            generation_time_ms: result.generation_time_ms
          },
          generated_images: result.images || [],
          translation_result: result.translation_info,
          optimization_result: result.optimization_info,
          consistency_analysis: result.consistency_analysis,
          generation_metadata: result.metadata
        };

        setGenerationResult(detailedResult);
        setCurrentTaskId(result.task_id);
        
        if (onGenerationComplete) {
          onGenerationComplete(detailedResult);
        }
      } else {
        throw new Error(result.error || '插畫生成失敗');
      }
    } catch (err) {
      const errorMessage = `插畫生成失敗: ${err}`;
      setError(errorMessage);
      
      // 標記當前步驟為錯誤
      const activeStep = generationSteps.find(step => step.status === 'active');
      if (activeStep) {
        updateStepStatus(activeStep.id, 'error');
      }
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 重置表單
  const handleReset = () => {
    setSceneDescription('');
    setSelectedCharacter('');
    setSelectedTemplate('anime-portrait');
    setAspectRatio('square');
    setQualityPreset('balanced');
    setCustomNegativePrompt('');
    setUseCharacterConsistency(true);
    setGenerationResult(null);
    setError('');
    setGenerationSteps([]);
  };

  // 項目角色列表
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  return (
    <div className={`illustration-generation-panel ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">🎨</span>
            AI 插畫生成
          </h2>
          
          {generationResult && (
            <CosmicButton
              variant="secondary"
              size="small"
              onClick={handleReset}
              className="ml-4"
            >
              重新設定
            </CosmicButton>
          )}
        </div>

        {/* API 連接設定 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Google Cloud API 金鑰
          </label>
          <div className="flex space-x-3">
            <CosmicInput
              type="password"
              value={apiKey}
              onChange={(value) => setApiKey(value)}
              placeholder="請輸入您的 Google Cloud API 金鑰"
              className="flex-1"
            />
            <CosmicButton
              onClick={validateConnection}
              disabled={!apiKey.trim() || isConnecting}
              variant="secondary"
            >
              {isConnecting ? <LoadingSpinner size="small" /> : '驗證連接'}
            </CosmicButton>
          </div>
          
          {connectionValid !== null && (
            <div className={`mt-2 text-sm ${connectionValid ? 'text-green-400' : 'text-red-400'}`}>
              {connectionValid ? '✓ API 連接驗證成功' : '✗ API 連接驗證失敗'}
            </div>
          )}
        </div>

        {/* 場景描述 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            場景描述 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            placeholder="請用中文詳細描述您想要生成的插畫場景，例如：一位穿著藍色連衣裙的少女站在櫻花樹下，陽光透過花瓣灑落在她的臉上..."
            rows={4}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            maxLength={500}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {sceneDescription.length}/500 字元
          </div>
        </div>

        {/* 角色選擇 */}
        {projectCharacters.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              關聯角色（可選）
            </label>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">不選擇特定角色</option>
              {projectCharacters.map(character => (
                <option key={character.id} value={character.id}>
                  {character.name}
                  {character.background && ` - ${character.background.substring(0, 30)}...`}
                </option>
              ))}
            </select>
            
            {selectedCharacter && useCharacterConsistency && (
              <div className="mt-2 text-sm text-blue-400">
                <span className="mr-1">ℹ️</span>
                將使用角色的視覺一致性設定和種子值
              </div>
            )}
          </div>
        )}

        {/* 參數設定行 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 風格模板 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              風格模板
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {STYLE_TEMPLATES.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* 圖像比例 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              圖像比例
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {ASPECT_RATIOS.map(ratio => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>

          {/* 品質預設 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              品質預設
            </label>
            <select
              value={qualityPreset}
              onChange={(e) => setQualityPreset(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {QUALITY_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label} - {preset.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 進階選項 */}
        <div className="mb-6">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-300 mb-3 select-none">
              🔧 進階選項
            </summary>
            
            <div className="space-y-4 pl-4 border-l-2 border-gray-600">
              {/* 自定義負面提示詞 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  自定義負面提示詞
                </label>
                <CosmicInput
                  value={customNegativePrompt}
                  onChange={(value) => setCustomNegativePrompt(value)}
                  placeholder="例如：blurry, low quality, distorted..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  指定不希望出現在圖像中的元素
                </p>
              </div>

              {/* 角色一致性 */}
              {selectedCharacter && (
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="consistency"
                    checked={useCharacterConsistency}
                    onChange={(e) => setUseCharacterConsistency(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="consistency" className="text-sm text-gray-300">
                    啟用角色視覺一致性
                  </label>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {/* 生成按鈕 */}
        <div className="flex justify-center mb-6">
          <CosmicButton
            onClick={handleGenerate}
            disabled={isGenerating || !sceneDescription.trim() || !apiKey.trim() || connectionValid === false}
            size="large"
            className="min-w-[200px]"
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="small" />
                <span>生成中...</span>
              </div>
            ) : (
              '🚀 生成插畫'
            )}
          </CosmicButton>
        </div>

        {/* 生成進度 */}
        {generationSteps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">生成進度</h3>
            <div className="space-y-3">
              {generationSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700">
                    {step.status === 'completed' ? (
                      <span className="text-green-400">✓</span>
                    ) : step.status === 'error' ? (
                      <span className="text-red-400">✗</span>
                    ) : step.status === 'active' ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <span className="text-gray-500">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      step.status === 'completed' ? 'text-green-400' :
                      step.status === 'error' ? 'text-red-400' :
                      step.status === 'active' ? 'text-blue-400' :
                      'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-sm text-gray-500">{step.description}</div>
                    {step.status === 'active' && step.progress > 0 && (
                      <Progress value={step.progress} className="mt-1 h-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 生成結果 */}
        {generationResult && (
          <div className="border-t border-gray-600 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">生成結果</h3>
            
            {/* 基本資訊 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {generationResult.basic_response.quality_score?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-sm text-gray-400">品質分數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {generationResult.basic_response.consistency_score?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-sm text-gray-400">一致性分數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {generationResult.basic_response.generation_time_ms ? 
                    `${(generationResult.basic_response.generation_time_ms / 1000).toFixed(1)}s` : 'N/A'}
                </div>
                <div className="text-sm text-gray-400">生成時間</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  ${generationResult.generation_metadata.estimated_cost.toFixed(3)}
                </div>
                <div className="text-sm text-gray-400">預估費用</div>
              </div>
            </div>

            {/* 圖像顯示 */}
            {generationResult.basic_response.image_url && (
              <div className="mb-6">
                <img
                  src={generationResult.basic_response.image_url}
                  alt="生成的插畫"
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* 詳細資訊 */}
            {generationResult.translation_result && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-300 mb-2">翻譯結果</h4>
                <div className="bg-gray-800 p-3 rounded text-sm">
                  <div className="text-gray-400">原始中文：</div>
                  <div className="text-white mb-2">{generationResult.translation_result.original_chinese}</div>
                  <div className="text-gray-400">翻譯提示詞：</div>
                  <div className="text-white">{generationResult.translation_result.translated_prompt}</div>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-400">
              任務 ID: {generationResult.basic_response.id}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IllustrationGenerationPanel;