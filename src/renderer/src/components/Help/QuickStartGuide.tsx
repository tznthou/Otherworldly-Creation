import React, { useState } from 'react';
import { Zap, ChevronRight, ChevronLeft, CheckCircle, Circle } from 'lucide-react';
import CosmicButton from '../UI/CosmicButton';

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial?: (tutorialId: string) => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ 
  isOpen, 
  onClose, 
  onStartTutorial 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: Step[] = [
    {
      id: 'welcome',
      title: '歡迎使用創世紀元',
      description: '開始您的輕小說創作之旅',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-2xl font-semibold text-white mb-4">
              歡迎來到創世紀元：異世界創作神器
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              這是一個專為輕小說創作者設計的 AI 輔助寫作工具。<br />
              讓我們用 5 分鐘時間，快速了解如何開始您的創作！
            </p>
          </div>

          <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gold-400 mb-4">您將學到什麼：</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400 text-sm">1</span>
                </div>
                <span className="text-gray-300">創建您的第一個專案</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <span className="text-green-400 text-sm">2</span>
                </div>
                <span className="text-gray-300">使用編輯器寫作</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-sm">3</span>
                </div>
                <span className="text-gray-300">管理角色和設定</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-yellow-400 text-sm">4</span>
                </div>
                <span className="text-gray-300">使用 AI 輔助創作</span>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-400">
            <p>預計完成時間：5-8 分鐘</p>
          </div>
        </div>
      )
    },
    {
      id: 'create-project',
      title: '創建您的第一個專案',
      description: '選擇小說類型，設定基本資訊',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">步驟 1：創建新專案</h3>
            <p className="text-gray-300 mb-6">
              專案是您所有創作內容的容器。每個專案包含章節、角色、世界觀等完整要素。
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">選擇小說類型</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3">
                  <h5 className="text-white font-semibold">🌟 異世界轉生</h5>
                  <p className="text-gray-300 text-sm">包含轉生設定、魔法系統</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3">
                  <h5 className="text-white font-semibold">🏫 校園戀愛</h5>
                  <p className="text-gray-300 text-sm">現代校園背景故事</p>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3">
                  <h5 className="text-white font-semibold">🚀 科幻冒險</h5>
                  <p className="text-gray-300 text-sm">未來科技世界設定</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3">
                  <h5 className="text-white font-semibold">🗡️ 奇幻冒險</h5>
                  <p className="text-gray-300 text-sm">魔法世界冒險故事</p>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">填寫基本資訊</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-300 text-sm">專案標題</label>
                  <div className="mt-1 p-2 bg-cosmic-700 border border-cosmic-600 rounded text-gray-400 text-sm">
                    例如：異世界的魔法學院
                  </div>
                </div>
                <div>
                  <label className="text-gray-300 text-sm">簡介</label>
                  <div className="mt-1 p-2 bg-cosmic-700 border border-cosmic-600 rounded text-gray-400 text-sm">
                    簡短描述您的故事概念...
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">💡 小提示</h4>
            <p className="text-gray-300 text-sm">
              不用擔心一開始就要設定得很完美。您可以隨時修改專案資訊，
              系統的模板會幫助您快速建立基礎設定。
            </p>
          </div>
        </div>
      ),
      action: {
        label: '開始創建專案',
        onClick: () => {
          // 這裡可以觸發創建專案的動作
          console.log('開始創建專案');
        }
      }
    },
    {
      id: 'editor-basics',
      title: '使用編輯器寫作',
      description: '了解寫作界面和基本功能',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">步驟 2：掌握編輯器</h3>
            <p className="text-gray-300 mb-6">
              編輯器是您進行創作的主要工作區域，讓我們了解它的各個部分。
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">界面佈局</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-2xl">📚</span>
                  </div>
                  <h5 className="text-white font-semibold">章節列表</h5>
                  <p className="text-gray-300 text-sm">管理所有章節</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-400 text-2xl">✍️</span>
                  </div>
                  <h5 className="text-white font-semibold">寫作區域</h5>
                  <p className="text-gray-300 text-sm">主要編輯區域</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-2xl">🤖</span>
                  </div>
                  <h5 className="text-white font-semibold">AI 面板</h5>
                  <p className="text-gray-300 text-sm">AI 輔助工具</p>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">基本操作</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">自動儲存</span>
                  <span className="text-green-400 text-sm">每 3 秒自動儲存</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">字數統計</span>
                  <span className="text-blue-400 text-sm">即時顯示進度</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">格式工具</span>
                  <span className="text-purple-400 text-sm">豐富的文字格式</span>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">快捷鍵</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">儲存</span>
                  <kbd className="px-2 py-1 bg-cosmic-700 rounded text-gold-400">Ctrl+S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">AI 續寫</span>
                  <kbd className="px-2 py-1 bg-cosmic-700 rounded text-gold-400">Alt+A</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">搜尋</span>
                  <kbd className="px-2 py-1 bg-cosmic-700 rounded text-gold-400">Ctrl+F</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">新章節</span>
                  <kbd className="px-2 py-1 bg-cosmic-700 rounded text-gold-400">Ctrl+N</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: '開始互動教學',
        onClick: () => {
          onStartTutorial?.('editor');
        }
      }
    },
    {
      id: 'character-setup',
      title: '創建角色',
      description: '建立生動的角色形象',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">步驟 3：創建角色</h3>
            <p className="text-gray-300 mb-6">
              角色是故事的靈魂。完善的角色設定能讓故事更加生動，也能幫助 AI 更好地理解您的創作意圖。
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">角色資訊</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-white font-semibold mb-2">基本資料</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 姓名與稱呼</li>
                    <li>• 年齡與性別</li>
                    <li>• 職業與身份</li>
                    <li>• 重要關係</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-2">外貌特徵</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 身高體重</li>
                    <li>• 髮色眼色</li>
                    <li>• 特殊標記</li>
                    <li>• 服裝風格</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-2">性格特點</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 個性傾向</li>
                    <li>• 興趣愛好</li>
                    <li>• 價值觀念</li>
                    <li>• 行為習慣</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-2">背景故事</h5>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 成長經歷</li>
                    <li>• 重要事件</li>
                    <li>• 動機目標</li>
                    <li>• 秘密心事</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">角色原型模板</h4>
              <p className="text-gray-300 text-sm mb-3">使用預設模板可以快速創建角色：</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded p-3">
                  <h5 className="text-white font-semibold text-sm">主角類型</h5>
                  <p className="text-gray-300 text-xs">熱血、冷靜、天才、平凡</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded p-3">
                  <h5 className="text-white font-semibold text-sm">女主角類型</h5>
                  <p className="text-gray-300 text-xs">溫柔、傲嬌、天然、強勢</p>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded p-3">
                  <h5 className="text-white font-semibold text-sm">配角類型</h5>
                  <p className="text-gray-300 text-xs">導師、朋友、對手、路人</p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded p-3">
                  <h5 className="text-white font-semibold text-sm">反派類型</h5>
                  <p className="text-gray-300 text-xs">大魔王、貴族、組織、同學</p>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">角色關係</h4>
              <p className="text-gray-300 text-sm mb-3">設定角色間的關係有助於故事發展：</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">家人</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">朋友</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">戀人</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">敵人</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">師徒</span>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">同事</span>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <h5 className="text-blue-400 font-semibold text-sm mb-2">💡 關係設計巧思</h5>
                <p className="text-gray-300 text-xs leading-relaxed">
                  系統採用<strong>單向關係</strong>設計：為角色A設定對角色B的關係時，不會自動為B創建對A的反向關係。
                  這樣可以表達不對等的複雜關係（如單戀、敵視等），讓故事更具現實感和戲劇張力。
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: '學習角色管理',
        onClick: () => {
          onStartTutorial?.('character');
        }
      }
    },
    {
      id: 'ai-assistant',
      title: '使用 AI 輔助',
      description: '讓 AI 成為您的創作夥伴',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">步驟 4：AI 輔助創作</h3>
            <p className="text-gray-300 mb-6">
              AI 助手能理解您的故事背景和角色設定，提供個性化的創作建議。讓我們學習如何有效使用這個強大的工具。
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">AI 功能特色</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-blue-400 text-sm">🧠</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">上下文理解</h5>
                    <p className="text-gray-300 text-sm">分析專案設定、角色關係和已寫內容</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-green-400 text-sm">🎭</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">角色一致性</h5>
                    <p className="text-gray-300 text-sm">確保角色行為符合人設</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-purple-400 text-sm">📝</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">風格延續</h5>
                    <p className="text-gray-300 text-sm">保持與您寫作風格的一致性</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-yellow-400 text-sm">💡</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">創意建議</h5>
                    <p className="text-gray-300 text-sm">提供多樣化的續寫選項</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">使用步驟</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-gray-300">將游標放在想要續寫的位置</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span className="text-gray-300">點擊「AI 續寫」按鈕或按 Alt+A</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <span className="text-gray-300">調整生成參數（長度、風格、創意度）</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                  <span className="text-gray-300">檢視生成結果，選擇合適的內容</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">5</div>
                  <span className="text-gray-300">根據需要修改後插入到文章中</span>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">參數說明</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">生成長度</span>
                  <span className="text-blue-400 text-sm">短 / 中 / 長</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">創意程度</span>
                  <span className="text-green-400 text-sm">保守 / 平衡 / 創新</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">寫作風格</span>
                  <span className="text-purple-400 text-sm">描述 / 對話 / 動作</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <h4 className="text-amber-400 font-semibold mb-2">⚠️ 重要提醒</h4>
            <p className="text-gray-300 text-sm">
              AI 生成的內容僅供參考和靈感啟發。請根據您的創作意圖進行修改和完善，
              記住您才是故事的真正創作者！
            </p>
          </div>
        </div>
      ),
      action: {
        label: '學習 AI 輔助',
        onClick: () => {
          onStartTutorial?.('ai');
        }
      }
    },
    {
      id: 'congratulations',
      title: '恭喜完成快速入門！',
      description: '開始您的創作之旅',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-semibold text-white mb-4">
              太棒了！您已經準備好開始創作了
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              您已經了解了創世紀元的核心功能。<br />
              現在，讓您的想像力自由飛翔，創作出精彩的輕小說吧！
            </p>
          </div>

          <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gold-400 mb-4">接下來您可以：</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">創建您的第一個專案，開始寫作</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">探索更多進階功能和設定選項</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">查看詳細的使用手冊和教學指南</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">加入社群，與其他創作者交流</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">📚 持續學習</h4>
            <p className="text-gray-300 text-sm">
              創作是一個持續學習的過程。隨時使用幫助中心查看詳細文檔，
              或重新觀看教學指南來掌握更多技巧。
            </p>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              祝您創作愉快！ ✨
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const currentStepId = steps[currentStep].id;
      if (!completedSteps.includes(currentStepId)) {
        setCompletedSteps([...completedSteps, currentStepId]);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  const isStepCompleted = (stepId: string) => {
    return completedSteps.includes(stepId);
  };

  const currentStepData = steps[currentStep];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-cosmic-900/95 backdrop-blur-sm border border-gold-500/30 rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-gold-400" />
            <h2 className="text-2xl font-cosmic text-gold-400">快速入門指南</h2>
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

        <div className="flex flex-1 min-h-0">
          {/* 步驟導航 */}
          <div className="w-80 bg-cosmic-800/50 border-r border-cosmic-700 p-4 overflow-y-auto">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                    currentStep === index
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                      : 'text-gray-300 hover:bg-cosmic-700/50 hover:text-white'
                  }`}
                >
                  <div>
                    {isStepCompleted(step.id) ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : currentStep === index ? (
                      <div className="w-5 h-5 rounded-full bg-gold-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{step.title}</div>
                    <div className="text-xs text-gray-400 truncate">{step.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 主要內容 */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-8 overflow-y-auto flex-1">
              {currentStepData.content}
            </div>

            {/* 底部操作欄 */}
            <div className="p-6 border-t border-cosmic-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  步驟 {currentStep + 1} / {steps.length}
                </div>
                <div className="w-48 bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {currentStep > 0 && (
                  <CosmicButton
                    variant="secondary"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    上一步
                  </CosmicButton>
                )}

                {currentStepData.action && (
                  <CosmicButton
                    variant="secondary"
                    onClick={currentStepData.action.onClick}
                  >
                    {currentStepData.action.label}
                  </CosmicButton>
                )}

                {currentStep < steps.length - 1 ? (
                  <CosmicButton
                    variant="primary"
                    onClick={handleNext}
                  >
                    下一步
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </CosmicButton>
                ) : (
                  <CosmicButton
                    variant="primary"
                    onClick={onClose}
                  >
                    開始創作
                    <Zap className="w-4 h-4 ml-1" />
                  </CosmicButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;