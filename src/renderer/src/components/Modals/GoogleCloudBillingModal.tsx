import React from 'react';

interface GoogleCloudBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

export const GoogleCloudBillingModal: React.FC<GoogleCloudBillingModalProps> = ({
  isOpen,
  onClose,
  errorMessage
}) => {
  const handleOpenGoogleCloud = () => {
    // 在新視窗開啟 Google Cloud Console
    window.open('https://console.cloud.google.com/billing', '_blank');
  };

  const handleOpenImagenAPI = () => {
    // 在新視窗開啟 Imagen API 頁面
    window.open('https://console.cloud.google.com/marketplace/product/google/imagen.googleapis.com', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          {/* 標題 */}
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
              <svg 
                className="w-6 h-6 text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 20.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                ⚠️ Google Cloud 計費設定required
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Imagen API 需要啟用計費的 Google Cloud 帳戶
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl ml-4"
            >
              ✕
            </button>
          </div>

          {/* 錯誤訊息 */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm">
                <span className="font-semibold">錯誤詳情：</span> {errorMessage}
              </p>
            </div>
          )}

          {/* 問題說明 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">為什麼會發生這個錯誤？</h3>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-300 text-sm leading-relaxed">
                Google 的 Imagen API 是一個付費服務，只對啟用了計費功能的 Google Cloud 帳戶開放。
                即使您有有效的 API 金鑰，也需要設定付費方式才能使用圖像生成功能。
              </p>
            </div>
          </div>

          {/* 解決步驟 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">如何解決？</h3>
            <div className="space-y-4">
              
              {/* 步驟 1 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">設定 Google Cloud 計費帳戶</p>
                  <p className="text-gray-400 text-sm mt-1">
                    前往 Google Cloud Console 啟用計費功能
                  </p>
                  <button
                    onClick={handleOpenGoogleCloud}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    🔗 開啟 Google Cloud Console
                  </button>
                </div>
              </div>

              {/* 步驟 2 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">啟用 Imagen API</p>
                  <p className="text-gray-400 text-sm mt-1">
                    確保在您的專案中啟用了 Imagen API 服務
                  </p>
                  <button
                    onClick={handleOpenImagenAPI}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    🔗 開啟 Imagen API 頁面
                  </button>
                </div>
              </div>

              {/* 步驟 3 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">驗證 API 金鑰權限</p>
                  <p className="text-gray-400 text-sm mt-1">
                    確保您的 API 金鑰有權限訪問 Imagen API
                  </p>
                </div>
              </div>

              {/* 步驟 4 */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">重新嘗試生成</p>
                  <p className="text-gray-400 text-sm mt-1">
                    完成設定後，回到插畫面板重新開始生成
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* 重要提醒 */}
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-yellow-300 text-sm font-medium">💡 重要提醒</p>
                <p className="text-yellow-200 text-xs mt-1">
                  Google Cloud 會根據使用量收費。建議先了解 Imagen API 的收費標準，並設定適當的使用限制。
                </p>
              </div>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              稍後設定
            </button>
            <button
              onClick={() => {
                handleOpenGoogleCloud();
                // 不立即關閉模態，讓用戶可以參考說明
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              立即前往設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};