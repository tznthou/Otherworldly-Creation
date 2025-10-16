import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, ChevronRight, ChevronLeft, CheckCircle, Circle } from 'lucide-react';
import CosmicButton from '../UI/CosmicButton';

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTutorial?: (tutorialId: string) => void;
  onCreateProject?: () => void;
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
  onStartTutorial,
  onCreateProject: _onCreateProject
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
                <div className="w-8 h-8 bg-warm-gold/20 rounded-full flex items-center justify-center">
                  <span className="text-warm-gold text-sm">1</span>
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
                <div className="w-8 h-8 bg-clay-orange/20 rounded-full flex items-center justify-center">
                  <span className="text-clay-orange text-sm">3</span>
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
      id: 'api-setup',
      title: '環境準備：配置 AI 服務',
      description: '選擇並配置 AI 提供商（必需步驟）',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">重要：為什麼需要配置 AI 服務？</h3>
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4">
              <p className="text-amber-200 font-semibold mb-2">⚠️ 創世紀元本身不包含 AI 模型</p>
              <p className="text-gray-300 text-sm">
                軟體需要連接外部 AI 服務才能提供續寫、角色分析、劇情建議等核心功能。
                未配置 AI 服務將無法使用這些功能。
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">五大 AI 提供商對比（2025 最新）</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-cosmic-700">
                    <th className="border border-cosmic-600 p-2 text-left text-white">提供商</th>
                    <th className="border border-cosmic-600 p-2 text-left text-white">類型</th>
                    <th className="border border-cosmic-600 p-2 text-left text-white">免費選項</th>
                    <th className="border border-cosmic-600 p-2 text-left text-white">難度</th>
                    <th className="border border-cosmic-600 p-2 text-left text-white">推薦對象</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-green-900/10">
                    <td className="border border-cosmic-600 p-2 text-green-400 font-semibold">🟢 Gemini</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">雲端</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">1,500 請求/天</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">⭐ 簡單</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">新手首選</td>
                  </tr>
                  <tr className="bg-warm-gold/5">
                    <td className="border border-cosmic-600 p-2 text-warm-gold font-semibold">🔵 Ollama</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">本地</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">完全免費</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">⭐⭐ 中等</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">隱私優先</td>
                  </tr>
                  <tr>
                    <td className="border border-cosmic-600 p-2 text-yellow-400 font-semibold">🟡 OpenAI</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">雲端</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">無（付費）</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">⭐ 簡單</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">專業作家</td>
                  </tr>
                  <tr>
                    <td className="border border-cosmic-600 p-2 text-clay-orange font-semibold">🟣 Claude</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">雲端</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">無（付費）</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">⭐ 簡單</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">長文本創作</td>
                  </tr>
                  <tr>
                    <td className="border border-cosmic-600 p-2 text-orange-400 font-semibold">🟠 OpenRouter</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">網關</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">50-1000/天</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">⭐ 簡單</td>
                    <td className="border border-cosmic-600 p-2 text-gray-300">多模型切換</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">🎯 新手快速開始推薦</h4>

            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h5 className="text-green-400 font-semibold mb-2 flex items-center">
                  <span className="mr-2">✅</span>
                  推薦選項 1：Google Gemini（最簡單）
                </h5>
                <ul className="text-gray-300 text-sm space-y-1 mb-3">
                  <li>✓ 完全免費（1,500 請求/天）</li>
                  <li>✓ 無需安裝軟體</li>
                  <li>✓ 5 分鐘完成配置</li>
                  <li>✓ 允許商業使用</li>
                </ul>
                <div className="bg-cosmic-800/50 rounded p-3 text-xs text-gray-300">
                  <p className="font-semibold mb-1">快速步驟：</p>
                  <ol className="space-y-1 ml-4">
                    <li>1. 訪問 <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-warm-gold underline">Google AI Studio</a></li>
                    <li>2. 登入 Google 帳號</li>
                    <li>3. 點擊「Get API Key」→「Create API Key」</li>
                    <li>4. 複製 API Key</li>
                    <li>5. 回到創世紀元 → 設定 → AI 供應商配置 → Gemini</li>
                    <li>6. 貼上 API Key → 測試連接 → 完成！</li>
                  </ol>
                </div>
              </div>

              <div className="bg-warm-gold/10 border border-warm-gold/20 rounded-lg p-4">
                <h5 className="text-warm-gold font-semibold mb-2 flex items-center">
                  <span className="mr-2">✅</span>
                  推薦選項 2：Ollama（完全本地）
                </h5>
                <ul className="text-gray-300 text-sm space-y-1 mb-3">
                  <li>✓ 完全免費且無限制</li>
                  <li>✓ 完全隱私（數據不離開電腦）</li>
                  <li>✓ 支援 100+ 模型</li>
                  <li>⚠️ 需要較好硬體（8GB+ RAM）</li>
                </ul>
                <div className="bg-cosmic-800/50 rounded p-3 text-xs text-gray-300">
                  <p className="font-semibold mb-1">快速步驟：</p>
                  <ol className="space-y-1 ml-4">
                    <li>1. 訪問 <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-warm-gold underline">ollama.com/download</a></li>
                    <li>2. 下載並安裝（Windows/macOS/Linux）</li>
                    <li>3. 開啟終端機，執行：<code className="bg-cosmic-700 px-1 rounded">ollama pull llama3.2</code></li>
                    <li>4. 回到創世紀元，Ollama 會自動檢測並連接</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gold-400 mb-3">其他提供商簡介</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-cosmic-800/50 border border-cosmic-600 rounded p-3 text-sm">
                <h5 className="text-yellow-400 font-semibold mb-1">OpenAI</h5>
                <p className="text-gray-300 text-xs">業界標準，需信用卡，適合專業用途</p>
              </div>
              <div className="bg-cosmic-800/50 border border-cosmic-600 rounded p-3 text-sm">
                <h5 className="text-clay-orange font-semibold mb-1">Claude</h5>
                <p className="text-gray-300 text-xs">超長上下文（200K tokens），適合長篇小說</p>
              </div>
              <div className="bg-cosmic-800/50 border border-cosmic-600 rounded p-3 text-sm">
                <h5 className="text-orange-400 font-semibold mb-1">OpenRouter</h5>
                <p className="text-gray-300 text-xs">300+ 模型統一網關，適合多模型切換</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <h5 className="text-amber-400 font-semibold mb-2">💡 稍後配置？</h5>
            <p className="text-gray-300 text-sm mb-2">
              您可以選擇跳過此步驟，稍後在「設定 → AI 供應商配置」中完成設定。
            </p>
            <p className="text-amber-200 text-sm">
              ⚠️ 但請注意：未配置 AI 服務將無法使用 AI 續寫、角色分析、劇情建議等功能。
            </p>
          </div>
        </div>
      ),
      action: {
        label: '前往設定 AI',
        onClick: () => {
          // 這裡不實際跳轉，只是標記完成步驟
          const currentStepId = steps[currentStep].id;
          if (!completedSteps.includes(currentStepId)) {
            setCompletedSteps([...completedSteps, currentStepId]);
          }
          setCurrentStep(currentStep + 1);
        }
      }
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
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-clay-orange/20 rounded-lg p-3">
                  <h5 className="text-white font-semibold">🌟 異世界轉生</h5>
                  <p className="text-gray-300 text-sm">包含轉生設定、魔法系統</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-warm-gold/20 rounded-lg p-3">
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

          <div className="bg-warm-gold/10 border border-warm-gold/20 rounded-lg p-4">
            <h4 className="text-warm-gold font-semibold mb-2">💡 小提示</h4>
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
          // 在快速入門教學中，直接進入下一步而不是真正創建專案
          // 這避免了流程中斷的問題
          const currentStepId = steps[currentStep].id;
          if (!completedSteps.includes(currentStepId)) {
            setCompletedSteps([...completedSteps, currentStepId]);
          }
          setCurrentStep(currentStep + 1);
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
                  <div className="w-16 h-16 bg-warm-gold/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-warm-gold text-2xl">📚</span>
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
                  <div className="w-16 h-16 bg-clay-orange/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-clay-orange text-2xl">🤖</span>
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
                  <span className="text-warm-gold text-sm">即時顯示進度</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">格式工具</span>
                  <span className="text-clay-orange text-sm">豐富的文字格式</span>
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
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-warm-gold/20 rounded p-3">
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
                <span className="px-3 py-1 bg-warm-gold/20 text-warm-gold rounded-full text-sm">家人</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">朋友</span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">戀人</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">敵人</span>
                <span className="px-3 py-1 bg-clay-orange/20 text-clay-orange rounded-full text-sm">師徒</span>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">同事</span>
              </div>
              
              <div className="bg-warm-gold/10 border border-warm-gold/20 rounded-lg p-3">
                <h5 className="text-warm-gold font-semibold text-sm mb-2">💡 關係設計巧思</h5>
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
            <h3 className="text-xl font-semibold text-white mb-4">步驟 4：多供應商AI輔助創作</h3>
            <p className="text-gray-300 mb-6">
              創世紀元支援5大AI供應商系統，包括本地Ollama和雲端服務（OpenAI、Google Gemini、Anthropic Claude、OpenRouter）。每個供應商都有獨特優勢，讓我們學習如何配置和使用這個強大的AI創作平台。
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">多供應商AI系統特色</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-warm-gold/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-warm-gold text-sm">🧠</span>
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
                  <div className="w-8 h-8 bg-clay-orange/20 rounded-full flex items-center justify-center mt-1">
                    <span className="text-clay-orange text-sm">📝</span>
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
                  <div className="w-6 h-6 bg-warm-gold/30 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <span className="text-gray-300">配置AI供應商（系統設定 → AI供應商配置）</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-warm-gold/30 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span className="text-gray-300">選擇合適的AI供應商和模型</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <span className="text-gray-300">將游標放在想要續寫的位置</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-clay-orange/30 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                  <span className="text-gray-300">點擊「AI 續寫」按鈕或按 Alt+A</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">5</div>
                  <span className="text-gray-300">調整生成參數（長度、風格、創意度）</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">6</div>
                  <span className="text-gray-300">檢視生成結果，選擇合適的內容</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">7</div>
                  <span className="text-gray-300">根據需要修改後插入到文章中</span>
                </div>
              </div>
            </div>

            <div className="bg-cosmic-800/50 border border-cosmic-600 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gold-400 mb-3">參數說明</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">生成長度</span>
                  <span className="text-warm-gold text-sm">短 / 中 / 長</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">創意程度</span>
                  <span className="text-green-400 text-sm">保守 / 平衡 / 創新</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-cosmic-700/50 rounded">
                  <span className="text-gray-300">寫作風格</span>
                  <span className="text-clay-orange text-sm">描述 / 對話 / 動作</span>
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
          // 在快速入門教學中，直接進入下一步
          const currentStepId = steps[currentStep].id;
          if (!completedSteps.includes(currentStepId)) {
            setCompletedSteps([...completedSteps, currentStepId]);
          }
          setCurrentStep(currentStep + 1);
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

          <div className="bg-warm-gold/10 border border-warm-gold/20 rounded-lg p-4">
            <h4 className="text-warm-gold font-semibold mb-2">📚 持續學習</h4>
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

  const modalContent = (
    <div 
      className="isolate fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center p-4"
      style={{ 
        zIndex: 99999,
        isolation: 'isolate'
      }}
    >
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

  return createPortal(modalContent, document.body);
};

export default QuickStartGuide;