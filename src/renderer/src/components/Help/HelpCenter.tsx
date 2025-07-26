import React, { useState } from 'react';
import { tutorialIndex, TutorialId } from '../../data/tutorialSteps';
import { useTutorial } from '../Tutorial/TutorialOverlay';
import CosmicButton from '../UI/CosmicButton';
import { useNotification } from '../UI/NotificationSystem';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'writing' | 'ai' | 'technical';
}

const faqData: FAQItem[] = [
  // 一般問題
  {
    id: 'what-is-genesis',
    question: '什麼是創世紀元？',
    answer: '創世紀元是一個專為輕小說創作者設計的 AI 輔助寫作工具。它提供了專案管理、章節編輯、角色管理和 AI 續寫等功能，幫助作者更高效地創作出精彩的輕小說作品。',
    category: 'general'
  },
  {
    id: 'how-to-start',
    question: '如何開始使用？',
    answer: '首先創建一個新專案，選擇適合的小說類型（異世界、校園、科幻或奇幻）。然後添加角色、設定世界觀，就可以開始寫作了。建議先完成新手教學來熟悉各項功能。',
    category: 'general'
  },
  {
    id: 'project-types',
    question: '支援哪些小說類型？',
    answer: '目前支援四種主要類型：異世界轉生、校園戀愛、科幻冒險和奇幻冒險。每種類型都有對應的模板和角色原型，幫助您快速開始創作。',
    category: 'general'
  },
  
  // 寫作相關
  {
    id: 'auto-save',
    question: '作品會自動儲存嗎？',
    answer: '是的，系統會每 3 秒自動儲存您的寫作進度。您也可以隨時手動儲存。所有資料都儲存在本地，確保您的創作安全。',
    category: 'writing'
  },
  {
    id: 'chapter-management',
    question: '如何管理章節？',
    answer: '在編輯器左側的章節列表中，您可以創建新章節、重新排序、編輯章節標題和添加章節筆記。支援拖拽排序，讓章節管理更加直觀。',
    category: 'writing'
  },
  {
    id: 'character-creation',
    question: '如何創建角色？',
    answer: '在角色管理頁面點擊「創建新角色」，填寫角色的基本資訊、外貌描述、性格特點和背景故事。您也可以使用角色原型模板快速創建。',
    category: 'writing'
  },
  
  // AI 相關
  {
    id: 'ai-how-works',
    question: 'AI 續寫是如何工作的？',
    answer: 'AI 會分析您的專案設定、角色資訊和已寫內容，理解故事的背景和風格，然後提供符合上下文的續寫建議。您可以選擇採用、修改或重新生成。',
    category: 'ai'
  },
  {
    id: 'ai-quality',
    question: 'AI 生成的內容品質如何？',
    answer: 'AI 生成的內容僅供參考和靈感啟發。建議您根據自己的創作意圖進行修改和完善。AI 是您的創作助手，但您才是故事的真正創作者。',
    category: 'ai'
  },
  {
    id: 'ai-settings',
    question: '可以調整 AI 的寫作風格嗎？',
    answer: '是的，您可以在 AI 設定中調整創作風格、內容長度和創意程度。不同的設定會影響 AI 生成內容的特點，找到最適合您的設定。',
    category: 'ai'
  },
  
  // 技術問題
  {
    id: 'system-requirements',
    question: '系統需求是什麼？',
    answer: '創世紀元是一個桌面應用程式，支援 Windows、macOS 和 Linux。建議至少 4GB RAM 和 2GB 可用磁碟空間。AI 功能需要安裝 Ollama 服務。',
    category: 'technical'
  },
  {
    id: 'data-backup',
    question: '如何備份我的作品？',
    answer: '在專案設定中可以匯出專案為 JSON 格式進行備份。建議定期備份重要作品。您也可以複製整個應用程式資料夾進行完整備份。',
    category: 'technical'
  },
  {
    id: 'troubleshooting',
    question: '遇到問題怎麼辦？',
    answer: '首先檢查系統狀態面板確認各服務是否正常。如果問題持續，可以重新啟動應用程式或查看錯誤日誌。嚴重問題請聯繫技術支援。',
    category: 'technical'
  }
];

const categoryNames = {
  general: '一般問題',
  writing: '寫作相關',
  ai: 'AI 功能',
  technical: '技術支援'
};

export const HelpCenter: React.FC<HelpCenterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tutorials' | 'faq' | 'shortcuts'>('tutorials');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  
  const { startTutorial, isTutorialCompleted, resetTutorials } = useTutorial();
  const notification = useNotification();

  // 過濾 FAQ
  const filteredFAQ = faqData.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 鍵盤快捷鍵資料
  const shortcuts = [
    { key: 'Ctrl + S', description: '儲存當前章節' },
    { key: 'Ctrl + N', description: '創建新章節' },
    { key: 'Ctrl + D', description: '複製當前行' },
    { key: 'Ctrl + /', description: '切換註釋' },
    { key: 'Ctrl + F', description: '搜尋文字' },
    { key: 'Ctrl + H', description: '取代文字' },
    { key: 'Ctrl + Z', description: '撤銷' },
    { key: 'Ctrl + Y', description: '重做' },
    { key: 'F11', description: '切換全螢幕' },
    { key: 'Ctrl + ,', description: '開啟設定' },
    { key: 'Ctrl + Shift + P', description: '開啟命令面板' },
    { key: 'Alt + A', description: '開啟 AI 續寫面板' }
  ];

  const handleStartTutorial = (tutorialId: TutorialId) => {
    startTutorial(tutorialId);
    onClose();
    notification.info('教學開始', `正在開始「${tutorialIndex[tutorialId].title}」教學`);
  };

  const handleResetTutorials = () => {
    resetTutorials();
    notification.success('重置完成', '所有教學狀態已重置，您可以重新體驗教學');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-cosmic-900/95 backdrop-blur-sm border border-gold-500/30 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📚</div>
            <h2 className="text-2xl font-cosmic text-gold-400">幫助中心</h2>
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
        <div className="flex border-b border-cosmic-700">
          {[
            { id: 'tutorials', label: '教學指南', icon: '🎓' },
            { id: 'faq', label: '常見問題', icon: '❓' },
            { id: 'shortcuts', label: '快捷鍵', icon: '⌨️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold-500/20 text-gold-400 border-b-2 border-gold-500'
                  : 'text-gray-400 hover:text-white hover:bg-cosmic-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 教學指南 */}
          {activeTab === 'tutorials' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">互動式教學指南</h3>
                <p className="text-gray-400">跟隨步驟式教學，快速掌握創世紀元的各項功能</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tutorialIndex).map(([id, tutorial]) => (
                  <div
                    key={id}
                    className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4 hover:border-gold-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">{tutorial.title}</h4>
                      {isTutorialCompleted(id) && (
                        <span className="text-green-400 text-sm">✓ 已完成</span>
                      )}
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4">{tutorial.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">預計時間: {tutorial.estimatedTime}</span>
                      <CosmicButton
                        size="small"
                        variant={isTutorialCompleted(id) ? 'secondary' : 'primary'}
                        onClick={() => handleStartTutorial(id as TutorialId)}
                      >
                        {isTutorialCompleted(id) ? '重新學習' : '開始教學'}
                      </CosmicButton>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-6 border-t border-cosmic-700">
                <CosmicButton
                  variant="secondary"
                  onClick={handleResetTutorials}
                >
                  重置所有教學狀態
                </CosmicButton>
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
                    className="w-full px-4 py-2 bg-cosmic-800 border border-cosmic-600 rounded-lg text-white placeholder-gray-400 focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-cosmic-800 border border-cosmic-600 rounded-lg text-white focus:border-gold-500 focus:outline-none"
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
                    className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-cosmic-700/50 transition-colors"
                    >
                      <span className="text-white font-medium">{item.question}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 bg-cosmic-700 px-2 py-1 rounded">
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
                      <div className="px-4 pb-4 text-gray-300 text-sm leading-relaxed border-t border-cosmic-600">
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

          {/* 快捷鍵 */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">鍵盤快捷鍵</h3>
                <p className="text-gray-400">使用快捷鍵提升您的創作效率</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-cosmic-800/50 border border-cosmic-600 rounded-lg"
                  >
                    <span className="text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-cosmic-700 border border-cosmic-600 rounded text-sm text-gold-400 font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">💡 提示</h4>
                <p className="text-gray-300 text-sm">
                  在 macOS 系統上，請將 Ctrl 替換為 Cmd 鍵。您也可以在設定中自定義快捷鍵。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;