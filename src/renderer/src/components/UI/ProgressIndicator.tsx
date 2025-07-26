import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import LoadingSpinner from './LoadingSpinner';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number; // 0-100
  description?: string;
  estimatedTime?: number; // 秒
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: string;
  showEstimatedTime?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  showEstimatedTime = true,
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'active':
        return (
          <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center">
            <LoadingSpinner size="small" color="cosmic" />
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-500"></div>
        );
    }
  };

  const getStepLineColor = (step: ProgressStep, nextStep?: ProgressStep) => {
    if (step.status === 'completed') {
      return 'bg-green-500';
    }
    if (step.status === 'active' && nextStep) {
      return 'bg-gradient-to-b from-gold-500 to-gray-600';
    }
    return 'bg-gray-600';
  };

  const calculateTotalProgress = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const activeStep = steps.find(step => step.status === 'active');
    const activeProgress = activeStep?.progress || 0;
    
    return ((completedSteps + activeProgress / 100) / steps.length) * 100;
  };

  const estimateRemainingTime = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    
    if (completedSteps === 0 || elapsedTime === 0) return null;
    
    const avgTimePerStep = elapsedTime / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    
    return Math.ceil(avgTimePerStep * remainingSteps);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const totalProgress = calculateTotalProgress();
  const remainingTime = estimateRemainingTime();

  return (
    <div className={`bg-cosmic-900/90 backdrop-blur-sm rounded-lg p-6 ${className}`}>
      {/* 總體進度條 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-white">處理進度</h3>
          <span className="text-sm text-gray-300">{Math.round(totalProgress)}%</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
        
        {showEstimatedTime && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>已用時間: {formatTime(elapsedTime)}</span>
            {remainingTime && (
              <span>預計剩餘: {formatTime(remainingTime)}</span>
            )}
          </div>
        )}
      </div>

      {/* 步驟列表 */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-start space-x-4">
              {/* 步驟圖標 */}
              <div className="relative z-10">
                {getStepIcon(step)}
              </div>
              
              {/* 步驟內容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    step.status === 'active' ? 'text-gold-400' :
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </h4>
                  
                  {step.status === 'active' && step.progress !== undefined && (
                    <span className="text-xs text-gray-300">
                      {step.progress}%
                    </span>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </p>
                )}
                
                {/* 步驟進度條 */}
                {step.status === 'active' && step.progress !== undefined && (
                  <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                    <div 
                      className="bg-gold-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 連接線 */}
            {index < steps.length - 1 && (
              <div className="absolute left-3 top-6 w-0.5 h-8 -z-10">
                <div className={`w-full h-full ${getStepLineColor(step, steps[index + 1])}`}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 簡化的進度條組件
interface SimpleProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'gold' | 'green' | 'blue' | 'red';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  color = 'gold',
  size = 'medium',
  className = ''
}) => {
  const colorClasses = {
    gold: 'from-gold-500 to-gold-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600'
  };

  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  };

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`bg-gradient-to-r ${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
};

// 圓形進度指示器
interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#F59E0B',
  backgroundColor = '#374151',
  showPercentage = true,
  className = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 背景圓 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* 進度圓 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;