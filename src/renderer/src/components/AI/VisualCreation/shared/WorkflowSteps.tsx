import React from 'react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
}

interface WorkflowStepsProps {
  currentStep: number;
  className?: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: '選擇角色',
    description: '選擇要繪製的角色',
    icon: '👥'
  },
  {
    id: 2,
    title: '設定場景',
    description: '描述場景和動作',
    icon: '🎬'
  },
  {
    id: 3,
    title: '生成圖片',
    description: 'AI 創作插畫',
    icon: '🎨'
  },
  {
    id: 4,
    title: '預覽保存',
    description: '選擇並保存結果',
    icon: '💾'
  }
];

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({ 
  currentStep, 
  className = '' 
}) => {
  return (
    <div className={`bg-cosmic-800/50 rounded-lg p-4 border border-cosmic-600 ${className}`}>
      <h3 className="text-sm font-cosmic text-gold-400 mb-3 flex items-center">
        <span className="mr-2">✨</span>
        創作流程
      </h3>
      
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* 步驟圓圈 */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step.id === currentStep
                    ? 'bg-gold-500 text-white'
                    : step.id < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-cosmic-600 text-gray-400'
                }`}
              >
                {step.id < currentStep ? '✓' : step.icon}
              </div>
              
              {/* 步驟標題 */}
              <div className="text-center mt-2 max-w-20">
                <p
                  className={`text-xs font-medium transition-colors ${
                    step.id === currentStep
                      ? 'text-gold-400'
                      : step.id < currentStep
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              </div>
            </div>
            
            {/* 連接線 */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-px mx-2 mt-[-20px]">
                <div
                  className={`h-full transition-colors ${
                    step.id < currentStep
                      ? 'bg-green-500'
                      : 'bg-cosmic-600'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSteps;