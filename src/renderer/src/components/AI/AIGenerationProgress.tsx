import React, { useState, useEffect } from 'react';
import { ProgressIndicator as ProgressIndicatorType } from '../../types/error';

interface AIGenerationProgressProps {
  progress: ProgressIndicatorType;
  generationCount?: number;
  currentGenerationIndex?: number;
  className?: string;
  showDetailedStats?: boolean;
}

interface GenerationStats {
  tokensGenerated: number;
  averageSpeed: number;
  estimatedQuality: number;
  languagePurity: number;
}

const AIGenerationProgress: React.FC<AIGenerationProgressProps> = ({
  progress,
  generationCount = 1,
  currentGenerationIndex = 0,
  className = '',
  showDetailedStats = true
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [stats, setStats] = useState<GenerationStats>({
    tokensGenerated: 0,
    averageSpeed: 0,
    estimatedQuality: 85,
    languagePurity: 95
  });

  // 動畫效果
  useEffect(() => {
    if (progress.status === 'running') {
      const interval = setInterval(() => {
        setAnimationStep(prev => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [progress.status]);

  // 計算生成統計
  useEffect(() => {
    if (progress.status === 'running') {
      const elapsedTime = Date.now() - progress.startTime.getTime();
      const progressPercent = progress.progress;
      
      // 模擬統計更新
      setStats(prev => ({
        ...prev,
        tokensGenerated: Math.floor((progressPercent / 100) * 200), // 預估 200 tokens
        averageSpeed: elapsedTime > 0 ? (prev.tokensGenerated / (elapsedTime / 1000)) : 0,
        estimatedQuality: Math.min(95, 75 + (progressPercent / 100) * 20),
        languagePurity: Math.min(98, 90 + (progressPercent / 100) * 8)
      }));
    }
  }, [progress.progress, progress.status, progress.startTime]);

  const getStageInfo = (stage: string) => {
    const stages = {
      preparing: {
        name: '準備階段',
        description: '正在建構上下文和系統提示...',
        icon: '📝',
        color: 'text-warm-gold',
        bgColor: 'bg-warm-gold/20'
      },
      generating: {
        name: '生成階段',
        description: 'AI 正在創作內容...',
        icon: '🤖',
        color: 'text-green-400',
        bgColor: 'bg-green-600/20'
      },
      processing: {
        name: '處理階段',
        description: '正在分析和優化生成結果...',
        icon: '⚙️',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-600/20'
      },
      complete: {
        name: '完成',
        description: '內容生成完成！',
        icon: '✅',
        color: 'text-green-400',
        bgColor: 'bg-green-600/20'
      }
    };
    
    return stages[stage as keyof typeof stages] || stages.preparing;
  };

  const stageInfo = getStageInfo(progress.currentStep || 'preparing');

  const getThinkingAnimation = () => {
    const dots = '.'.repeat((animationStep % 3) + 1);
    return `思考中${dots}`;
  };

  const formatSpeed = (speed: number) => {
    if (speed < 1) return '< 1 tokens/s';
    return `${speed.toFixed(1)} tokens/s`;
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'text-green-400';
    if (quality >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-bg-dark border border-warm-gold/30 rounded-xl p-4 shadow-lg ${className}`}>
      {/* 標題區域 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{stageInfo.icon}</div>
          <div>
            <h3 className="font-semibold text-warm-gold">
              AI 內容生成
              {generationCount > 1 && (
                <span className="ml-2 text-sm text-text-secondary">
                  ({currentGenerationIndex + 1}/{generationCount})
                </span>
              )}
            </h3>
            <p className="text-sm text-text-secondary/40">
              {progress.status === 'running' ? stageInfo.description : progress.description}
            </p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${stageInfo.bgColor} ${stageInfo.color}`}>
          {stageInfo.name}
        </div>
      </div>

      {/* 主進度條 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-secondary/40">整體進度</span>
          <span className="text-sm font-medium text-warm-gold">
            {progress.progress.toFixed(0)}%
          </span>
        </div>
        
        <div className="w-full bg-bg-dark/80 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.status === 'running' 
                ? 'bg-gradient-to-r from-gold-500 via-gold-400 to-gold-300 animate-pulse' 
                : 'bg-green-500'
            }`}
            style={{ 
              width: `${progress.progress}%`,
              backgroundSize: progress.status === 'running' ? '200% 100%' : '100% 100%',
              animation: progress.status === 'running' ? 'shimmer 2s infinite' : 'none'
            }}
          />
        </div>
      </div>

      {/* 生成狀態動畫 */}
      {progress.status === 'running' && (
        <div className="mb-4 p-3 bg-bg-dark/50 rounded-lg border border-warm-gold/10">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    animationStep === i 
                      ? 'bg-gold-400 scale-125' 
                      : 'bg-bg-light'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-text-secondary/40">
              {getThinkingAnimation()}
            </span>
          </div>
        </div>
      )}

      {/* 詳細統計 */}
      {showDetailedStats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-3 border border-warm-gold/10">
            <div className="text-xs text-text-secondary mb-1">生成速度</div>
            <div className="text-sm font-medium text-warm-gold">
              {formatSpeed(stats.averageSpeed)}
            </div>
          </div>
          
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-3 border border-warm-gold/10">
            <div className="text-xs text-text-secondary mb-1">Token 數量</div>
            <div className="text-sm font-medium text-warm-gold">
              {stats.tokensGenerated}
            </div>
          </div>
          
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-3 border border-warm-gold/10">
            <div className="text-xs text-text-secondary mb-1">預估品質</div>
            <div className={`text-sm font-medium ${getQualityColor(stats.estimatedQuality)}`}>
              {stats.estimatedQuality.toFixed(0)}%
            </div>
          </div>
          
          <div className="bg-bg-light/50 backdrop-blur-sm rounded-lg p-3 border border-warm-gold/10">
            <div className="text-xs text-text-secondary mb-1">語言純度</div>
            <div className={`text-sm font-medium ${getQualityColor(stats.languagePurity)}`}>
              {stats.languagePurity.toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* 步驟進度 */}
      {progress.totalSteps && progress.completedSteps !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">步驟進度</span>
            <span className="text-xs text-text-secondary/40">
              {progress.completedSteps}/{progress.totalSteps}
            </span>
          </div>
          <div className="flex space-x-1">
            {Array.from({ length: progress.totalSteps }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                  i < (progress.completedSteps || 0) 
                    ? 'bg-green-500' 
                    : i === progress.completedSteps && progress.status === 'running'
                    ? 'bg-warm-gold/30 animate-pulse'
                    : 'bg-bg-light'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 時間信息 */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          開始時間: {progress.startTime.toLocaleTimeString('zh-TW')}
        </span>
        {progress.endTime && (
          <span>
            完成時間: {progress.endTime.toLocaleTimeString('zh-TW')}
          </span>
        )}
      </div>

      {/* 錯誤顯示 */}
      {progress.status === 'failed' && progress.error && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-red-400 text-lg">⚠️</span>
            <div>
              <div className="text-red-400 font-medium text-sm">生成失敗</div>
              <div className="text-red-200 text-xs mt-1">{progress.error.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* 成功完成 */}
      {progress.status === 'completed' && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-400 text-lg">🎉</span>
            <div className="text-green-400 font-medium text-sm">
              內容生成完成！共生成 {stats.tokensGenerated} 個 tokens
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default AIGenerationProgress;