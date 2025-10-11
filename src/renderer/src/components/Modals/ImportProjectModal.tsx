import React, { useState, useRef } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { createProject } from '../../store/slices/projectsSlice';
import { closeModal, addNotification } from '../../store/slices/uiSlice';
import { createLogger } from '../../utils/logger';

// 創建模組專用 logger
const log = createLogger('ImportProjectModal');

const ImportProjectModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<{
    name: string;
    type: string;
    description?: string;
    settings?: {
      aiModel: string;
      aiParams: {
        temperature: number;
        topP: number;
        maxTokens: number;
      };
    };
    exportedAt?: string;
  } | null>(null);

  const handleClose = () => {
    dispatch(closeModal('importProject'));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // 讀取文件內容
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          validateImportData(data);
          setImportedData(data);
        } catch (_err) {
          setError('無法解析檔案，請確保是有效的 JSON 格式');
          setImportedData(null);
        }
      };
      reader.onerror = () => {
        setError('讀取檔案時發生錯誤');
        setImportedData(null);
      };
      reader.readAsText(file);
    } else {
      setSelectedFile(null);
      setImportedData(null);
    }
  };

  const validateImportData = (data: unknown): data is {
    name: string;
    type: string;
    description?: string;
    settings?: object;
    exportedAt?: string;
  } => {
    // 檢查必要欄位
    if (!data || typeof data !== 'object' || !('name' in data) || !('type' in data)) {
      setError('匯入檔案缺少必要欄位（名稱或類型）');
      return false;
    }
    
    const typedData = data as { name: unknown; type: unknown };
    if (typeof typedData.name !== 'string' || typeof typedData.type !== 'string') {
      setError('匯入檔案格式錯誤');
      return false;
    }
    
    // 檢查類型是否有效
    const validTypes = ['isekai', 'school', 'scifi', 'fantasy'];
    if (!validTypes.includes(typedData.type)) {
      setError('專案類型無效');
      return false;
    }
    
    return true;
  };

  const handleImport = async () => {
    if (!importedData) {
      setError('請先選擇有效的匯入檔案');
      return;
    }

    setIsSubmitting(true);

    try {
      // 創建新專案
      await dispatch(createProject({
        name: importedData.name,
        type: (importedData.type as 'isekai' | 'school' | 'scifi' | 'fantasy') || 'isekai',
        description: importedData.description || '',
        novelLength: 'medium',
        settings: importedData.settings || {
          aiModel: 'llama3',
          aiParams: {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 200,
          },
        },
      })).unwrap();

      dispatch(addNotification({
        type: 'success',
        title: '匯入成功',
        message: `專案「${importedData.name}」已成功匯入`,
      }));

      handleClose();
    } catch (error) {
      log.error('匯入專案失敗:', error);
      setError('匯入專案失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      // 模擬文件輸入變更
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    } else {
      setError('請選擇有效的 JSON 檔案');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">匯入專案</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          {/* 檔案上傳區域 */}
          <div
            className="border-2 border-dashed border-cosmic-700 rounded-lg p-8 mb-6 text-center cursor-pointer hover:border-gold-500 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/json"
              className="hidden"
            />
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gold-400 mb-2">
              {selectedFile ? selectedFile.name : '選擇檔案或拖放至此'}
            </h3>
            <p className="text-sm text-gray-400">
              支援 JSON 格式的專案匯出檔案
            </p>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* 匯入預覽 */}
          {importedData && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">匯入預覽</h3>
              <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                <div className="mb-4">
                  <h4 className="font-medium text-white">{importedData.name}</h4>
                  <p className="text-sm text-gray-400">
                    {importedData.type === 'isekai' && '異世界'}
                    {importedData.type === 'school' && '校園'}
                    {importedData.type === 'scifi' && '科幻'}
                    {importedData.type === 'fantasy' && '奇幻'}
                  </p>
                </div>
                <p className="text-sm text-gray-400 border-t border-cosmic-700 pt-4">
                  {importedData.description || '暫無描述'}
                </p>
                {importedData.exportedAt && (
                  <p className="text-xs text-gray-500 mt-4">
                    匯出時間：{new Date(importedData.exportedAt).toLocaleString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end space-x-4">
          <button
            onClick={handleClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!importedData || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? '匯入中...' : '匯入專案'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportProjectModal;