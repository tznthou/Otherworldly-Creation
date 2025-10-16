import React, { useState } from 'react';
import { tutorialIndex, TutorialId } from '../../data/tutorialSteps';
import { categoryNames, searchFAQ } from '../../data/faqData';
import { useTutorial } from '../Tutorial/TutorialOverlay';
import { useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';
import CosmicButton from '../UI/CosmicButton';
import { useNotification } from '../UI/NotificationSystem';
import UserManual from './UserManual';
import QuickStartGuide from './QuickStartGuide';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'manual' | 'quickstart'>('quickstart');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showUserManual, setShowUserManual] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);

  const dispatch = useAppDispatch();
  const { startTutorial, resetTutorials: _resetTutorials } = useTutorial();
  const notification = useNotification();

  const handleCreateProject = () => {
    dispatch(openModal('createProject'));
  };

  // 使用新的搜索函數
  const filteredFAQ = searchFAQ(searchQuery, selectedCategory === 'all' ? undefined : selectedCategory);

  const handleStartTutorial = (tutorialId: TutorialId) => {
    startTutorial(tutorialId);
    onClose();
    notification.info('教學開始', `正在開始「${tutorialIndex[tutorialId].title}」教學`);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-dark/95 backdrop-blur-sm border border-warm-gold/30 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-warm-gold/10">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📚</div>
            <h2 className="text-2xl font-serif-tc text-warm-gold">幫助中心</h2>
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

        {/* 標籤頁 */}
        <div className="flex border-b border-warm-gold/10 overflow-x-auto">
          {[
            { id: 'quickstart', label: '快速入門', icon: '🚀' },
            { id: 'manual', label: '使用手冊', icon: '📖' },
            { id: 'faq', label: '常見問題', icon: '❓' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'faq' | 'manual' | 'quickstart')}
              className={`flex items-center space-x-2 px-6 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-warm-gold/50/20 text-warm-gold border-b-2 border-warm-gold'
                  : 'text-gray-400 hover:text-white hover:bg-bg-light/50 backdrop-blur-sm/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 快速入門 */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">快速入門指南</h3>
                <p className="text-gray-400">5 分鐘快速了解創世紀元的核心功能</p>
              </div>

              <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">互動式快速入門</h4>
                    <p className="text-gray-400">
                      跟隨步驟式指南，快速掌握專案創建、編輯器使用、角色管理和 AI 輔助功能。
                    </p>
                  </div>
                  <CosmicButton
                    onClick={() => setShowQuickStart(true)}
                    className="ml-4"
                  >
                    開始入門
                  </CosmicButton>
                </div>
              </div>

              <div className="bg-warm-gold/10 border border-warm-gold/20 rounded-lg p-6">
                <h4 className="text-warm-gold font-semibold mb-4">💡 如何開始教學</h4>
                <div className="space-y-3 text-gray-300 text-sm">
                  <p>• <strong>首次使用教學</strong>：點擊右下角的 ❓ 幫助按鈕 → 互動教學 → 首次使用教學</p>
                  <p>• <strong>編輯器教學</strong>：在專案編輯器頁面，點擊 ❓ 幫助按鈕 → 互動教學 → 編輯器使用教學</p>
                  <p>• <strong>角色管理教學</strong>：在角色管理頁面，點擊 ❓ 幫助按鈕 → 互動教學 → 角色管理教學</p>
                  <p>• <strong>AI 輔助教學</strong>：在專案編輯器頁面，點擊 ❓ 幫助按鈕 → 互動教學 → AI 輔助教學</p>
                </div>
              </div>
            </div>
          )}

          {/* 使用手冊 */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">詳細使用手冊</h3>
                <p className="text-gray-400">完整的功能說明和使用指南</p>
              </div>

              <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">完整使用手冊</h4>
                    <p className="text-gray-400">
                      詳細的功能說明、操作步驟和最佳實踐，幫助您充分利用創世紀元的所有功能。
                    </p>
                  </div>
                  <CosmicButton
                    onClick={() => setShowUserManual(true)}
                    className="ml-4"
                  >
                    查看手冊
                  </CosmicButton>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">📝</div>
                  <h4 className="text-white font-semibold mb-2">專案管理</h4>
                  <p className="text-gray-400 text-sm">創建、管理和組織您的創作專案</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">✍️</div>
                  <h4 className="text-white font-semibold mb-2">寫作編輯</h4>
                  <p className="text-gray-400 text-sm">使用編輯器進行創作和文字處理</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">🤖</div>
                  <h4 className="text-white font-semibold mb-2">AI 輔助</h4>
                  <p className="text-gray-400 text-sm">有效使用 AI 功能提升創作效率</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">👥</div>
                  <h4 className="text-white font-semibold mb-2">角色管理</h4>
                  <p className="text-gray-400 text-sm">創建和管理故事中的角色</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">⚙️</div>
                  <h4 className="text-white font-semibold mb-2">設定配置</h4>
                  <p className="text-gray-400 text-sm">個人化設定和系統配置</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">📚</div>
                  <h4 className="text-white font-semibold mb-2">電子書格式</h4>
                  <p className="text-gray-400 text-sm">選擇適合的電子書格式和使用建議</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">🎨</div>
                  <h4 className="text-white font-semibold mb-2">AI 插畫系統</h4>
                  <p className="text-gray-400 text-sm">使用AI生成角色插畫和場景圖片</p>
                </div>
                <div className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-3">🔧</div>
                  <h4 className="text-white font-semibold mb-2">故障排除</h4>
                  <p className="text-gray-400 text-sm">解決常見問題和技術支援</p>
                </div>
              </div>
            </div>
          )}


          {/* 常見問題 */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              {/* 搜尋和篩選 */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="搜尋問題..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg text-white placeholder-gray-400 focus:border-warm-gold focus:outline-none"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg text-white focus:border-warm-gold focus:outline-none"
                >
                  <option value="all">所有分類</option>
                  {Object.entries(categoryNames).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>

              {/* FAQ 列表 */}
              <div className="space-y-3">
                {filteredFAQ.map((item) => (
                  <div
                    key={item.id}
                    className="bg-bg-light/50 backdrop-blur-sm/50 border border-warm-gold/10 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-bg-dark/80/50 transition-colors"
                    >
                      <span className="text-white font-medium">{item.question}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 bg-bg-dark/80 px-2 py-1 rounded">
                          {categoryNames[item.category]}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            expandedFAQ === item.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {expandedFAQ === item.id && (
                      <div className="px-4 pb-4 text-gray-300 text-sm leading-relaxed border-t border-warm-gold/10">
                        <div className="pt-3">{item.answer}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredFAQ.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-400">沒有找到相關問題</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 用戶手冊模態框 */}
      <UserManual 
        isOpen={showUserManual}
        onClose={() => setShowUserManual(false)}
      />

      {/* 快速入門指南模態框 */}
      <QuickStartGuide
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onStartTutorial={(tutorialId) => {
          setShowQuickStart(false);
          handleStartTutorial(tutorialId as TutorialId);
        }}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
};

export default HelpCenter;