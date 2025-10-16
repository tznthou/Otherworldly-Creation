import React, { useState } from 'react';
import { api } from '../../api/tauri';
import LoadingSpinner from '../UI/LoadingSpinner';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('PollinationsAuthGuide');

interface PollinationsAuthGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthUpdate?: () => void;
}

const PollinationsAuthGuide: React.FC<PollinationsAuthGuideProps> = ({
  isOpen,
  onClose,
  onAuthUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'manage'>('guide');
  const [apiToken, setApiToken] = useState('');
  const [userName, setUserName] = useState('');
  const [tokenTier, setTokenTier] = useState<'seed' | 'flower' | 'nectar'>('seed');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    tier_access: string;
    error_details?: string;
  } | null>(null);

  // 層級配置信息
  const TIER_DETAILS = {
    anonymous: {
      label: '訪客',
      icon: '👤',
      price: '免費',
      rateLimit: '15秒',
      models: ['GptImage', 'SDXL'],
      features: ['基礎模型存取', '適合測試使用'],
      limitations: ['無法使用 Kontext 模型', '生成間隔較長']
    },
    seed: {
      label: 'Seed',
      icon: '🌱',
      price: '$5/月',
      rateLimit: '5秒',
      models: ['GptImage', 'SDXL', 'Kontext'],
      features: ['包含所有基礎模型', 'Kontext 圖像轉換', '更快的生成速度'],
      limitations: ['月度使用量限制']
    },
    flower: {
      label: 'Flower',
      icon: '🌸',
      price: '$15/月',
      rateLimit: '3秒',
      models: ['所有高級模型', 'Flux系列', 'Stable Diffusion 3.5'],
      features: ['所有高級模型存取', '無限使用量', '最高品質生成'],
      limitations: ['無']
    },
    nectar: {
      label: 'Nectar',
      icon: '🍯',
      price: '$50/月',
      rateLimit: '無限制',
      models: ['企業級模型', '定制模型', '優先存取新模型'],
      features: ['企業級支援', '收益分成', '定制化服務', 'API 優先級'],
      limitations: ['無']
    }
  };

  const handleSaveToken = async () => {
    if (!apiToken.trim()) {
      alert('請輸入有效的 API Token');
      return;
    }

    setLoading(true);
    try {
      // 先測試 token 有效性
      const testResponse = await api.invoke('test_pollinations_token', { token: apiToken }) as {
        valid: boolean;
        message: string;
        tier_access: string;
        error_details?: string;
      };
      setTestResult(testResponse);

      if (testResponse.valid) {
        // 儲存 token
        await api.invoke('save_pollinations_token', {
          token: apiToken,
          user_name: userName || undefined,
          token_tier: tokenTier
        });

        alert('API Token 已成功儲存！');
        setApiToken('');
        setUserName('');
        onAuthUpdate?.();
      } else {
        alert(`Token 無效: ${testResponse.message}`);
      }
    } catch (error) {
      log.error('儲存 token 失敗:', error);
      alert(`儲存失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveToken = async () => {
    if (!confirm('確定要移除當前的 API Token 嗎？')) return;

    setLoading(true);
    try {
      await api.invoke('remove_pollinations_token');
      alert('API Token 已移除');
      setTestResult(null);
      onAuthUpdate?.();
    } catch (error) {
      log.error('移除 token 失敗:', error);
      alert(`移除失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        {/* 標題欄 */}
        <div className="flex items-center justify-between p-6 border-b border-cosmic-700 bg-cosmic-900/95">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🔐</div>
            <div>
              <h2 className="text-xl font-cosmic text-gold-500">Pollinations 認證指南</h2>
              <p className="text-sm text-cosmic-400">升級到 Seed 或更高層級來使用 Kontext 等高級模型</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl transition-colors hover:bg-cosmic-800 rounded-lg w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* 標籤頁導航 */}
        <div className="flex border-b border-cosmic-700">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-gold-500 text-gold-500 bg-cosmic-800/50'
                : 'border-transparent text-cosmic-400 hover:text-cosmic-200'
            }`}
          >
            📚 認證指南
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'manage'
                ? 'border-gold-500 text-gold-500 bg-cosmic-800/50'
                : 'border-transparent text-cosmic-400 hover:text-cosmic-200'
            }`}
          >
            🔧 Token 管理
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'guide' ? (
            <div className="space-y-6">
              {/* 為什麼需要認證 */}
              <div className="bg-cosmic-800/50 border border-cosmic-700 rounded-lg p-4">
                <h3 className="text-lg font-cosmic text-gold-500 mb-3 flex items-center">
                  <span className="mr-2">💡</span>
                  為什麼需要認證？
                </h3>
                <div className="space-y-2 text-cosmic-300">
                  <p>• <strong className="text-green-400">Kontext 模型</strong>：需要 Seed 層級或更高認證才能存取</p>
                  <p>• <strong className="text-clay-orange">高級模型</strong>：Flux、Stable Diffusion 3.5 等需要付費層級</p>
                  <p>• <strong className="text-warm-gold">更快生成</strong>：付費用戶享受更短的等待時間</p>
                  <p>• <strong className="text-yellow-400">無限使用</strong>：高級層級無月度使用量限制</p>
                </div>
              </div>

              {/* 層級對比表 */}
              <div>
                <h3 className="text-lg font-cosmic text-gold-500 mb-4">🏆 層級對比</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(TIER_DETAILS).map(([tier, details]) => (
                    <div
                      key={tier}
                      className={`border rounded-lg p-4 ${
                        tier === 'seed' 
                          ? 'border-green-500 bg-green-900/20' 
                          : 'border-cosmic-600 bg-cosmic-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{details.icon}</span>
                          <span className="font-bold text-white">{details.label}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          details.price === '免費' ? 'bg-green-600' : 'bg-warm-gold'
                        }`}>
                          {details.price}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-cosmic-400">速率限制：</span>
                          <span className="text-white">{details.rateLimit}</span>
                        </div>
                        <div>
                          <span className="text-cosmic-400">可用模型：</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {details.models.map(model => (
                              <span key={model} className="px-2 py-0.5 bg-cosmic-700 text-xs rounded">
                                {model}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-cosmic-400">特色功能：</span>
                          <ul className="mt-1 space-y-0.5">
                            {details.features.map((feature, idx) => (
                              <li key={idx} className="text-green-400 text-xs">• {feature}</li>
                            ))}
                          </ul>
                        </div>
                        {details.limitations[0] !== '無' && (
                          <div>
                            <span className="text-cosmic-400">限制：</span>
                            <ul className="mt-1 space-y-0.5">
                              {details.limitations.map((limit, idx) => (
                                <li key={idx} className="text-yellow-400 text-xs">• {limit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 獲取步驟 */}
              <div>
                <h3 className="text-lg font-cosmic text-gold-500 mb-4">📋 獲取 API Token 步驟</h3>
                <div className="bg-cosmic-800/50 border border-cosmic-700 rounded-lg p-4">
                  <ol className="space-y-3 text-cosmic-300">
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gold-600 text-black text-sm font-bold rounded-full flex items-center justify-center">1</span>
                      <div>
                        <p className="font-medium text-white">訪問 Pollinations.ai</p>
                        <p className="text-sm text-cosmic-400">前往 <a href="https://pollinations.ai" className="text-warm-gold hover:text-warm-gold">https://pollinations.ai</a> 註冊帳號</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gold-600 text-black text-sm font-bold rounded-full flex items-center justify-center">2</span>
                      <div>
                        <p className="font-medium text-white">選擇訂閱方案</p>
                        <p className="text-sm text-cosmic-400">推薦選擇 <strong className="text-green-400">Seed ($5/月)</strong> 來使用 Kontext 模型</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gold-600 text-black text-sm font-bold rounded-full flex items-center justify-center">3</span>
                      <div>
                        <p className="font-medium text-white">獲取 API Token</p>
                        <p className="text-sm text-cosmic-400">在個人資料頁面或 API 設定中生成新的 API Token</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-gold-600 text-black text-sm font-bold rounded-full flex items-center justify-center">4</span>
                      <div>
                        <p className="font-medium text-white">在應用中設定</p>
                        <p className="text-sm text-cosmic-400">切換到「Token 管理」標籤，輸入您的 API Token</p>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>

              {/* 推薦方案 */}
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h4 className="flex items-center text-green-400 font-bold mb-2">
                  <span className="mr-2">✨</span>
                  推薦：Seed 層級
                </h4>
                <p className="text-cosmic-300 text-sm">
                  對於中文小說創作者，Seed 層級 ($5/月) 是最佳選擇。它提供了 Kontext 模型存取權限，
                  可以將文字描述轉換為高品質插畫，同時擁有更快的生成速度（5秒間隔）。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Token 管理表單 */}
              <div className="bg-cosmic-800/50 border border-cosmic-700 rounded-lg p-4">
                <h3 className="text-lg font-cosmic text-gold-500 mb-4">🔧 API Token 設定</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      API Token *
                    </label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="輸入您的 Pollinations API Token"
                      className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white placeholder-cosmic-400 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      用戶名稱 (可選)
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="用於識別的名稱"
                      className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white placeholder-cosmic-400 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cosmic-300 mb-2">
                      Token 層級
                    </label>
                    <select
                      value={tokenTier}
                      onChange={(e) => setTokenTier(e.target.value as 'seed' | 'flower' | 'nectar')}
                      className="w-full px-3 py-2 bg-cosmic-700 border border-cosmic-600 rounded-lg text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    >
                      <option value="seed">🌱 Seed</option>
                      <option value="flower">🌸 Flower</option>
                      <option value="nectar">🍯 Nectar</option>
                    </select>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveToken}
                      disabled={loading || !apiToken.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner size="small" />
                          <span className="ml-2">測試並儲存中...</span>
                        </>
                      ) : (
                        '💾 儲存 Token'
                      )}
                    </button>
                    <button
                      onClick={handleRemoveToken}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      🗑️ 移除
                    </button>
                  </div>
                </div>
              </div>

              {/* 測試結果 */}
              {testResult && (
                <div className={`border rounded-lg p-4 ${
                  testResult.valid ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'
                }`}>
                  <h4 className={`font-bold mb-2 flex items-center ${
                    testResult.valid ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span className="mr-2">{testResult.valid ? '✅' : '❌'}</span>
                    Token 測試結果
                  </h4>
                  <p className="text-cosmic-300 text-sm mb-2">{testResult.message}</p>
                  <p className="text-cosmic-400 text-xs">
                    存取層級: {testResult.tier_access}
                  </p>
                  {testResult.error_details && (
                    <details className="mt-2">
                      <summary className="text-xs text-cosmic-400 cursor-pointer">詳細錯誤信息</summary>
                      <pre className="text-xs text-red-400 mt-1 bg-cosmic-800/50 p-2 rounded overflow-x-auto">
                        {testResult.error_details}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* 使用提示 */}
              <div className="bg-warm-gold/10 border border-warm-gold rounded-lg p-4">
                <h4 className="flex items-center text-warm-gold font-bold mb-2">
                  <span className="mr-2">💡</span>
                  使用提示
                </h4>
                <ul className="text-cosmic-300 text-sm space-y-1">
                  <li>• API Token 會被加密儲存在本機資料庫中</li>
                  <li>• 儲存前會自動測試 Token 的有效性</li>
                  <li>• 設定 Token 後，系統會自動啟用 Kontext 等高級模型</li>
                  <li>• 如需更換 Token，直接輸入新的即可覆蓋舊的</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollinationsAuthGuide;