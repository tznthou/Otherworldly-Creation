import React, { useState, useEffect } from 'react';
import { updateSettings, updateAISettings } from '../../../store/slices/settingsSlice';
import { SettingsComponentProps } from '../types';
import { useI18n } from '../../../hooks/useI18n';
import { logsApi } from '../../../api/logs';
import { logger } from '../../../services/logService';
import { createLogger } from '../../../utils/logger';

// 創建模組專用 logger
const log = createLogger('GeneralSettings');

const GeneralSettings: React.FC<SettingsComponentProps> = ({ settings, dispatch }) => {
  const { t } = useI18n();

  // 日誌管理狀態 (v1.3.3)
  const [logDirectory, setLogDirectory] = useState<string>('');
  const [isExportingLogs, setIsExportingLogs] = useState(false);

  // 載入日誌目錄
  useEffect(() => {
    logsApi.getLogDirectory()
      .then(setLogDirectory)
      .catch(err => {
        log.error('獲取日誌目錄失敗:', err);
        logger.error('Settings', '獲取日誌目錄失敗', err);
      });
  }, []);

  // 處理打開日誌目錄
  const handleOpenLogDirectory = async () => {
    try {
      await logsApi.openLogDirectory();
      logger.info('Settings', '打開日誌目錄');
    } catch (error) {
      logger.error('Settings', '打開日誌目錄失敗', error);
      alert('無法打開日誌目錄');
    }
  };

  // 處理複製日誌
  const handleCopyLogs = async () => {
    setIsExportingLogs(true);
    try {
      const success = await logsApi.copyLogsToClipboard(2000);
      if (success) {
        alert('✅ 日誌已複製到剪貼板！\n\n請貼到 GitHub Issue 或提供給開發者。');
        logger.info('Settings', '日誌已複製到剪貼板');
      } else {
        throw new Error('複製失敗');
      }
    } catch (error) {
      logger.error('Settings', '複製日誌失敗', error);
      alert('❌ 複製日誌失敗，請手動打開日誌目錄');
    } finally {
      setIsExportingLogs(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-serif-tc text-2xl font-bold text-warm-gold mb-6">{t('settings.general.title')}</h2>

      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="font-serif-tc text-lg font-medium text-warm-gold mb-4">語言與地區設定</h3>
        <div className="space-y-4">
          <div>
            <label className="font-sans-tc block text-text-primary mb-2">界面語言</label>
            <div className="relative">
              <select
                value={settings.language}
                onChange={(e) => dispatch(updateSettings({ language: e.target.value as 'zh-TW' | 'zh-CN' | 'en' | 'ja' }))}
                className="font-sans-tc w-full bg-bg-dark border border-warm-gold/20 rounded-2xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-warm-gold/50 appearance-none cursor-pointer"
                disabled
              >
                <option value="zh-TW">繁體中文</option>
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="font-sans-tc text-sm text-text-secondary mt-2">
              ⚠️ 語言切換功能開發中，目前僅支援繁體中文界面
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">編輯器設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-text-primary">自動儲存</span>
              <p className="text-sm text-gray-400">編輯器內容每 2 秒自動儲存</p>
            </div>
            <div className="flex items-center text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-sm">已啟用</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">
            💡 自動儲存功能已內建於編輯器中，無需手動設定
          </p>
        </div>
      </div>

      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">🎨 AI 插畫功能設定</h3>
        <div className="space-y-6">
          <div className="flex items-start justify-between opacity-50">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-gray-500 font-medium">擴展AI插圖服務 (已遷移)</span>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/50">
                  🔄 已遷移
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input
                type="checkbox"
                checked={false}
                disabled={true}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="border-t border-warm-gold/20 pt-4">
            <div className="flex items-start justify-between opacity-50">
              <div className="flex-1 mr-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-gray-500 font-medium">智能API檢測 (已遷移)</span>
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/50">
                    🔄 已遷移
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={false}
                  disabled={true}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">📚 電子書功能設定</h3>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-text-primary font-medium">電子書虛擬檔名對應系統</span>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warm-gold/20 text-warm-gold border border-warm-gold/40">
                  🧪 實驗功能
                </div>
              </div>
              <p className="text-sm text-gray-400">
                允許為圖片設定語意化檔名（如 "ch01-hero-awakening.jpg"）而不修改原始檔案。
                導出電子書時動態重命名，保持原檔案安全。
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>• <strong>安全性：</strong>原始檔案保持 UUID 名稱不變</div>
                <div>• <strong>便利性：</strong>電子書中顯示語意化檔名</div>
                <div>• <strong>靈活性：</strong>支援批次重命名和分類管理</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ebookVirtualNaming || false}
                onChange={(e) => dispatch(updateSettings({ ebookVirtualNaming: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warm-gold/50/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
            </label>
          </div>

          {settings.ebookVirtualNaming && (
            <div className="border-t border-warm-gold/20 pt-4 bg-warm-gold/5 rounded-lg p-4">
              <h4 className="text-sm font-medium text-warm-gold mb-3">⚙️ 功能配置</h4>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex items-center justify-between">
                  <span>自動生成語意化檔名</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>保留原始檔案不變</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>導出時動態重命名</span>
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span>已啟用</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-yellow-400 text-xs font-medium">實驗功能提醒</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      此功能目前為實驗性質，建議在重要專案使用前先進行測試。
                      所有虛擬檔名資料儲存在資料庫中，不會影響原始圖片檔案。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">🧠 智能上下文優化</h3>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-text-primary font-medium">啟用智能多維度上下文優化</span>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-clay-orange/20 text-clay-orange border border-clay-orange/40">
                  🚀 最新功能
                </div>
              </div>
              <p className="text-sm text-gray-400">
                基於章節狀態、劇情重要性和時間距離的智能權重計算，
                為AI續寫提供更連貫的跨章節上下文。採用U形注意力模式優化。
              </p>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <div>• <strong>多維度權重：</strong>章節狀態 + 劇情重要性 + 位置接近度</div>
                <div>• <strong>U形模式：</strong>開頭和結尾章節獲得更高權重</div>
                <div>• <strong>智能壓縮：</strong>保留85%+連貫性，節省20-30%Token</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.features?.intelligentContextOptimization || false}
                onChange={(e) => dispatch(updateSettings({
                  features: {
                    ...settings.features,
                    intelligentContextOptimization: e.target.checked
                  }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warm-gold/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warm-gold"></div>
            </label>
          </div>

          {settings.features?.intelligentContextOptimization && (
            <div className="border-t border-warm-gold/20 pt-4 bg-warm-gold/5 rounded-lg p-4">
              <h4 className="text-sm font-medium text-warm-gold mb-3">⚙️ 智能上下文配置</h4>

              <div className="space-y-4">
                {/* 主要開關 */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-text-primary text-sm">啟用智能上下文分析</span>
                    <p className="text-xs text-gray-500">為AI續寫建構跨章節上下文</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ai?.intelligentContext?.enabled || false}
                      onChange={(e) => dispatch(updateAISettings({
                        intelligentContext: {
                          ...settings.ai?.intelligentContext,
                          enabled: e.target.checked
                        }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-warm-gold/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-warm-gold"></div>
                  </label>
                </div>

                {settings.ai?.intelligentContext?.enabled && (
                  <>
                    {/* 優化等級 */}
                    <div>
                      <label className="block text-text-primary text-sm mb-2">優化等級</label>
                      <select
                        value={settings.ai?.intelligentContext?.optimizationLevel || 'advanced'}
                        onChange={(e) => dispatch(updateAISettings({
                          intelligentContext: {
                            ...settings.ai?.intelligentContext,
                            optimizationLevel: e.target.value as 'basic' | 'advanced' | 'experimental'
                          }
                        }))}
                        className="w-full bg-bg-dark border border-warm-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-clay-orange appearance-none cursor-pointer"
                      >
                        <option value="basic">基礎 - 簡單摘要</option>
                        <option value="advanced">高級 - 多維度分析（推薦）</option>
                        <option value="experimental">實驗 - 完整NLP分析</option>
                      </select>
                    </div>

                    {/* Token預算 */}
                    <div>
                      <label className="block text-text-primary text-sm mb-2">
                        Token預算: {settings.ai?.intelligentContext?.maxTokenBudget || 8000}
                      </label>
                      <input
                        type="range"
                        min={4000}
                        max={16000}
                        step={1000}
                        value={settings.ai?.intelligentContext?.maxTokenBudget || 8000}
                        onChange={(e) => dispatch(updateAISettings({
                          intelligentContext: {
                            ...settings.ai?.intelligentContext,
                            maxTokenBudget: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer slider-purple"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>4K</span>
                        <span>8K (推薦)</span>
                        <span>16K</span>
                      </div>
                    </div>

                    {/* 高級設定 */}
                    <div className="border-t border-warm-gold/20 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-text-primary text-sm">保留對話內容</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.ai?.intelligentContext?.preserveDialogue ?? true}
                            onChange={(e) => dispatch(updateAISettings({
                              intelligentContext: {
                                ...settings.ai?.intelligentContext,
                                preserveDialogue: e.target.checked
                              }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-warm-gold/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-warm-gold"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-text-primary text-sm">性能模式</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.ai?.intelligentContext?.enablePerformanceMode || false}
                            onChange={(e) => dispatch(updateAISettings({
                              intelligentContext: {
                                ...settings.ai?.intelligentContext,
                                enablePerformanceMode: e.target.checked
                              }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-warm-gold/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-warm-gold"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        降低分析複雜度以提升響應速度
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 p-3 bg-warm-gold/10 border border-warm-gold/30 rounded">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-warm-gold mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-warm-gold text-xs font-medium">智能上下文提醒</p>
                    <p className="text-warm-gold text-xs mt-1">
                      此功能會分析專案中的所有章節來建構智能上下文。
                      第一次啟用時可能需要較長的處理時間來建立分析緩存。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 日誌管理區塊 (v1.3.3) */}
      <div className="bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-warm-gold mb-4">🗂️ 日誌管理</h3>
        <div className="space-y-4">
          <div>
            <p className="text-text-primary mb-2">
              當應用出現問題時，日誌檔案可以幫助開發者診斷問題。
            </p>
            <div className="bg-bg-dark rounded px-3 py-2 mb-3">
              <p className="text-xs text-gray-400">日誌位置：</p>
              <code className="text-sm text-warm-gold break-all">{logDirectory || '載入中...'}</code>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleOpenLogDirectory}
              className="flex-1 bg-bg-dark hover:bg-cosmic-600 border border-warm-gold/20 hover:border-gold-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📂 打開日誌目錄
            </button>
            <button
              onClick={handleCopyLogs}
              disabled={isExportingLogs}
              className="flex-1 bg-warm-gold hover:bg-clay-orange text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingLogs ? '⏳ 複製中...' : '📋 複製最新日誌'}
            </button>
          </div>

          <div className="bg-bg-dark/50 border border-warm-gold/20 rounded-lg p-3">
            <p className="text-sm text-text-primary mb-2">💡 如何使用日誌：</p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-2">
              <li>點擊「複製最新日誌」複製最近 2000 行日誌</li>
              <li>將日誌貼到 GitHub Issue 或郵件中發給開發者</li>
              <li>日誌包含錯誤資訊、操作記錄等診斷資料</li>
              <li>不包含任何 API keys 或密碼等敏感資訊</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;