import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const HelpCenterModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('guide');

  const handleClose = () => {
    dispatch(closeModal('helpCenter'));
  };

  const tabs = [
    { id: 'guide', name: '使用指南', icon: '📚' },
    { id: 'faq', name: '常見問題', icon: '❓' },
    { id: 'shortcuts', name: '快捷鍵', icon: '⌨️' },
    { id: 'about', name: '關於', icon: 'ℹ️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'guide':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-cosmic text-gold-400">快速入門指南</h3>
            <div className="space-y-4">
              <div className="card">
                <h4 className="font-medium mb-2">1. 建立您的第一個專案</h4>
                <p className="text-sm text-gray-400">點擊「創世神模式」開始您的創作之旅</p>
              </div>
              <div className="card">
                <h4 className="font-medium mb-2">2. 創造角色</h4>
                <p className="text-sm text-gray-400">使用「英靈召喚」功能建立豐富的角色設定</p>
              </div>
              <div className="card">
                <h4 className="font-medium mb-2">3. 開始寫作</h4>
                <p className="text-sm text-gray-400">在章節編輯器中盡情發揮您的創意</p>
              </div>
              <div className="card">
                <h4 className="font-medium mb-2">4. AI 輔助續寫</h4>
                <p className="text-sm text-gray-400">使用「預言書寫」功能獲得 AI 的創作建議</p>
              </div>
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-cosmic text-gold-400">常見問題</h3>
            <div className="space-y-4">
              <div className="card">
                <h4 className="font-medium mb-2">Q: 如何設定 Ollama AI 服務？</h4>
                <p className="text-sm text-gray-400">A: 請先安裝 Ollama，然後在 AI 設定中配置連接參數。</p>
              </div>
              <div className="card">
                <h4 className="font-medium mb-2">Q: 我的專案資料儲存在哪裡？</h4>
                <p className="text-sm text-gray-400">A: 所有資料都安全地儲存在本地 SQLite 資料庫中。</p>
              </div>
              <div className="card">
                <h4 className="font-medium mb-2">Q: 如何備份我的創作？</h4>
                <p className="text-sm text-gray-400">A: 使用「備份還原」功能可以輕鬆備份和還原您的所有創作。</p>
              </div>
            </div>
          </div>
        );
      case 'shortcuts':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-cosmic text-gold-400">快捷鍵</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="font-medium mb-3">一般操作</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>儲存</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">Ctrl+S</code>
                  </div>
                  <div className="flex justify-between">
                    <span>新建專案</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">Ctrl+N</code>
                  </div>
                  <div className="flex justify-between">
                    <span>開啟專案</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">Ctrl+O</code>
                  </div>
                </div>
              </div>
              <div className="card">
                <h4 className="font-medium mb-3">編輯器</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>AI 續寫</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">Ctrl+Space</code>
                  </div>
                  <div className="flex justify-between">
                    <span>尋找</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">Ctrl+F</code>
                  </div>
                  <div className="flex justify-between">
                    <span>全螢幕</span>
                    <code className="bg-cosmic-700 px-2 py-1 rounded">F11</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-cosmic text-gold-400">關於創世紀元</h3>
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🌟</div>
              <h4 className="text-xl font-cosmic text-gold-400 mb-2">創世紀元：異世界創作神器</h4>
              <p className="text-gray-300 mb-4">版本 v0.4.6</p>
              <div className="card text-left max-w-md mx-auto">
                <p className="text-sm text-gray-400 leading-relaxed">
                  一款專為中文輕小說創作者設計的 AI 輔助寫作工具，整合 Ollama 本地 AI 引擎，
                  提供角色管理、章節編輯、智能續寫等功能，助您創造出精彩的異世界故事。
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <div>內容載入中...</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">❓ 使用說明</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* 標籤側邊欄 */}
          <div className="w-48 bg-cosmic-950 border-r border-cosmic-700 p-4">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                    activeTab === tab.id
                      ? 'bg-gold-500 text-cosmic-900'
                      : 'text-gray-300 hover:bg-cosmic-800'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* 主內容 */}
          <div className="flex-1 p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterModal;