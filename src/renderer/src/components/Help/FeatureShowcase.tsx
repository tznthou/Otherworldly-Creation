import React, { useState } from 'react';
import CosmicButton from '../UI/CosmicButton';
import { CircularProgress } from '../UI/ProgressIndicator';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  benefits: string[];
  demo?: {
    type: 'image' | 'video' | 'interactive';
    content: string;
  };
  category: 'writing' | 'ai' | 'management' | 'ui';
}

const features: Feature[] = [
  {
    id: 'ai-writing',
    title: 'AI 智能續寫',
    description: '基於上下文的智能文本生成，讓創作更加流暢',
    icon: '🤖',
    category: 'ai',
    benefits: [
      '理解故事背景和角色設定',
      '生成符合風格的續寫內容',
      '提供多種創作建議',
      '支援對話和場景描述'
    ],
    demo: {
      type: 'interactive',
      content: 'ai-demo'
    }
  },
  {
    id: 'character-management',
    title: '角色管理系統',
    description: '完整的角色資料庫，讓每個角色都栩栩如生',
    icon: '👥',
    category: 'management',
    benefits: [
      '詳細的角色檔案管理',
      '角色關係圖譜',
      '角色原型模板',
      '智能角色一致性檢查'
    ]
  },
  {
    id: 'project-templates',
    title: '專案模板系統',
    description: '多種小說類型模板，快速開始您的創作',
    icon: '📚',
    category: 'management',
    benefits: [
      '異世界、校園、科幻、奇幻模板',
      '預設世界觀和角色原型',
      '劇情框架指導',
      '寫作風格建議'
    ]
  },
  {
    id: 'chapter-editor',
    title: '章節式編輯器',
    description: '專為小說創作設計的富文本編輯器',
    icon: '✍️',
    category: 'writing',
    benefits: [
      '章節管理和排序',
      '自動儲存功能',
      '章節筆記系統',
      '寫作進度追蹤'
    ]
  },
  {
    id: 'cosmic-ui',
    title: '星空主題界面',
    description: '沉浸式的創作環境，激發無限靈感',
    icon: '✨',
    category: 'ui',
    benefits: [
      '深藍星空背景',
      '金色魔法陣元素',
      '流暢的動畫效果',
      '護眼的配色方案'
    ]
  },
  {
    id: 'auto-save',
    title: '智能自動儲存',
    description: '永不丟失您的創作靈感',
    icon: '💾',
    category: 'writing',
    benefits: [
      '每 3 秒自動儲存',
      '本地資料儲存',
      '版本歷史記錄',
      '資料備份功能'
    ]
  }
];

const categoryNames = {
  writing: '寫作功能',
  ai: 'AI 輔助',
  management: '專案管理',
  ui: '用戶界面'
};

interface FeatureShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ isOpen, onClose }) => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFeatures = selectedCategory === 'all' 
    ? features 
    : features.filter(f => f.category === selectedCategory);

  const handleFeatureSelect = (feature: Feature) => {
    setSelectedFeature(feature);
  };

  const renderDemo = (feature: Feature) => {
    if (!feature.demo) return null;

    switch (feature.demo.type) {
      case 'interactive':
        if (feature.demo.content === 'ai-demo') {
          return (
            <div className="bg-cosmic-800/50 rounded-lg p-4 mt-4">
              <h5 className="text-gold-400 font-semibold mb-3">AI 續寫示例</h5>
              <div className="space-y-3">
                <div className="bg-cosmic-700/50 rounded p-3">
                  <p className="text-gray-300 text-sm mb-2">您的文字：</p>
                  <p className="text-white text-sm italic">
                    "主角走進了神秘的森林，突然聽到了奇怪的聲音..."
                  </p>
                </div>
                <div className="flex items-center justify-center py-2">
                  <CircularProgress progress={75} size={40} showPercentage={false} />
                  <span className="ml-2 text-gold-400 text-sm">AI 分析中...</span>
                </div>
                <div className="bg-green-900/30 border border-green-500/30 rounded p-3">
                  <p className="text-gray-300 text-sm mb-2">AI 建議：</p>
                  <p className="text-white text-sm italic">
                    "那是一陣低沉的咆哮聲，似乎來自森林深處。主角握緊了手中的劍，小心翼翼地朝聲音的方向走去。月光透過樹葉的縫隙灑下，在地面上形成斑駁的光影..."
                  </p>
                </div>
              </div>
            </div>
          );
        }
        break;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-cosmic-900/95 backdrop-blur-sm border border-gold-500/30 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🌟</div>
            <h2 className="text-2xl font-cosmic text-gold-400">功能介紹</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-100px)]">
          {/* 功能列表 */}
          <div className="w-1/3 border-r border-cosmic-700 overflow-y-auto">
            {/* 分類篩選 */}
            <div className="p-4 border-b border-cosmic-700">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-cosmic-800 border border-cosmic-600 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              >
                <option value="all">所有功能</option>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* 功能卡片 */}
            <div className="p-4 space-y-3">
              {filteredFeatures.map((feature) => (
                <div
                  key={feature.id}
                  onClick={() => handleFeatureSelect(feature)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedFeature?.id === feature.id
                      ? 'bg-gold-500/20 border-gold-500'
                      : 'bg-cosmic-800/50 border-cosmic-600 hover:border-gold-500/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{feature.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                      <div className="mt-2">
                        <span className="text-xs text-gold-400 bg-gold-500/20 px-2 py-1 rounded">
                          {categoryNames[feature.category]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 功能詳情 */}
          <div className="flex-1 overflow-y-auto">
            {selectedFeature ? (
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="text-4xl">{selectedFeature.icon}</div>
                  <div>
                    <h3 className="text-2xl font-cosmic text-gold-400 mb-2">
                      {selectedFeature.title}
                    </h3>
                    <p className="text-gray-300">{selectedFeature.description}</p>
                  </div>
                </div>

                {/* 功能優勢 */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">功能優勢</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedFeature.benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-cosmic-800/30 rounded-lg"
                      >
                        <div className="text-gold-400 mt-0.5">✓</div>
                        <span className="text-gray-300 text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 功能演示 */}
                {renderDemo(selectedFeature)}

                {/* 使用建議 */}
                <div className="mt-6 p-4 bg-warm-gold/10 border border-warm-gold/20 rounded-lg">
                  <h5 className="text-warm-gold font-semibold mb-2">💡 使用建議</h5>
                  <p className="text-gray-300 text-sm">
                    {selectedFeature.id === 'ai-writing' && '建議先完善角色設定和故事背景，這樣 AI 能提供更準確的續寫建議。'}
                    {selectedFeature.id === 'character-management' && '為主要角色創建詳細檔案，包括外貌、性格、背景等，有助於保持角色一致性。'}
                    {selectedFeature.id === 'project-templates' && '選擇最符合您創作意圖的模板，可以根據需要修改模板內容。'}
                    {selectedFeature.id === 'chapter-editor' && '善用章節筆記功能記錄創作靈感和修改要點，有助於後續編輯。'}
                    {selectedFeature.id === 'cosmic-ui' && '在設定中可以調整主題亮度和動畫效果，找到最適合您的創作環境。'}
                    {selectedFeature.id === 'auto-save' && '雖然有自動儲存，但重要節點建議手動儲存，並定期備份專案。'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌟</div>
                  <h3 className="text-xl font-semibold text-white mb-2">選擇功能了解詳情</h3>
                  <p className="text-gray-400">點擊左側功能卡片查看詳細介紹</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="p-4 border-t border-cosmic-700 flex justify-end">
          <CosmicButton variant="primary" onClick={onClose}>
            開始使用
          </CosmicButton>
        </div>
      </div>
    </div>
  );
};

export default FeatureShowcase;