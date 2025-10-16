import React, { useState, useCallback } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/uiSlice';
import BackupService, { BackupValidationResult, RestoreOptions, BackupData } from '../../services/backupService';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupData['metadata'] & { dataStats: { projectCount: number; chapterCount: number; characterCount: number } } | null>(null);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    includeProjects: true,
    includeChapters: true,
    includeCharacters: true,
    includeSettings: false,
    includeTemplates: false,
    overwriteExisting: false,
  });

  // 創建完整備份
  const handleCreateFullBackup = useCallback(async () => {
    setIsCreatingBackup(true);
    try {
      const filename = await BackupService.createFullBackup();
      dispatch(addNotification({
        type: 'success',
        title: '備份創建成功',
        message: `備份檔案 ${filename} 已下載`,
        duration: 5000,
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '備份創建失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 5000,
      }));
    } finally {
      setIsCreatingBackup(false);
    }
  }, [dispatch]);

  // 處理檔案選擇
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setBackupPreview(null);

    try {
      // 驗證備份檔案
      const validation = await BackupService.validateBackup(file);
      setValidationResult(validation);

      if (validation.isValid) {
        // 獲取備份預覽
        const preview = await BackupService.getBackupPreview(file);
        setBackupPreview({
          ...preview,
          dataStats: {
            projectCount: preview.projects.length,
            chapterCount: preview.totalChapters,
            characterCount: preview.totalCharacters
          }
        });
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '檔案驗證失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 5000,
      }));
    }
  }, [dispatch]);

  // 執行還原
  const handleRestore = useCallback(async () => {
    if (!selectedFile || !validationResult?.isValid) return;

    setIsRestoring(true);
    try {
      await BackupService.restoreBackup(selectedFile, restoreOptions);
      dispatch(addNotification({
        type: 'success',
        title: '還原完成',
        message: '備份已成功還原',
        duration: 5000,
      }));
      onClose();
      // 重新載入頁面以反映變更
      window.location.reload();
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: '還原失敗',
        message: error instanceof Error ? error.message : '未知錯誤',
        duration: 5000,
      }));
    } finally {
      setIsRestoring(false);
    }
  }, [selectedFile, validationResult, restoreOptions, dispatch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 標題欄 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">備份與還原</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 分頁導航 */}
        <div className="border-b border-cosmic-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              創建備份
            </button>
            <button
              onClick={() => setActiveTab('restore')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'restore'
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              還原備份
            </button>
          </nav>
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'create' && (
            <CreateBackupTab
              isCreating={isCreatingBackup}
              onCreateFullBackup={handleCreateFullBackup}
            />
          )}

          {activeTab === 'restore' && (
            <RestoreBackupTab
              selectedFile={selectedFile}
              validationResult={validationResult}
              backupPreview={backupPreview}
              restoreOptions={restoreOptions}
              isRestoring={isRestoring}
              onFileSelect={handleFileSelect}
              onRestoreOptionsChange={setRestoreOptions}
              onRestore={handleRestore}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// 創建備份分頁
interface CreateBackupTabProps {
  isCreating: boolean;
  onCreateFullBackup: () => void;
}

const CreateBackupTab: React.FC<CreateBackupTabProps> = ({
  isCreating,
  onCreateFullBackup,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">💾</div>
        <h3 className="text-xl font-medium text-gold-400 mb-2">創建備份</h3>
        <p className="text-gray-400 mb-8">
          將您的所有創作內容打包成備份檔案，以防資料遺失
        </p>
      </div>

      {/* 完整備份 */}
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-lg font-medium text-white mb-2">完整備份</h4>
            <p className="text-gray-400 mb-4">
              包含所有專案、章節、角色和設定的完整備份
            </p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 所有專案和章節內容</li>
              <li>• 角色資料和關係</li>
              <li>• 應用程式設定</li>
              <li>• 模板和自訂配置</li>
            </ul>
          </div>
          <button
            onClick={onCreateFullBackup}
            disabled={isCreating}
            className="btn-primary ml-4"
          >
            {isCreating ? '創建中...' : '創建完整備份'}
          </button>
        </div>
      </div>

      {/* 備份說明 */}
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gold-400 mb-2">備份說明</h4>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• 備份檔案將以 JSON 格式儲存，包含所有必要的資料</p>
          <p>• 建議定期創建備份，特別是在重要創作節點</p>
          <p>• 備份檔案可以在不同裝置間轉移和還原</p>
          <p>• 請將備份檔案儲存在安全的位置</p>
        </div>
      </div>
    </div>
  );
};

// 還原備份分頁
interface RestoreBackupTabProps {
  selectedFile: File | null;
  validationResult: BackupValidationResult | null;
  backupPreview: BackupData['metadata'] & { dataStats: { projectCount: number; chapterCount: number; characterCount: number }; projects?: { id: string; name: string; type: string }[] } | null;
  restoreOptions: RestoreOptions;
  isRestoring: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreOptionsChange: (options: RestoreOptions) => void;
  onRestore: () => void;
}

const RestoreBackupTab: React.FC<RestoreBackupTabProps> = ({
  selectedFile,
  validationResult,
  backupPreview,
  restoreOptions,
  isRestoring,
  onFileSelect,
  onRestoreOptionsChange,
  onRestore,
}) => {
  return (
    <div className="space-y-6">
      {/* 檔案選擇 */}
      <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-white mb-4">選擇備份檔案</h4>
        <div className="border-2 border-dashed border-cosmic-600 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".gcbackup,.json"
            onChange={onFileSelect}
            className="hidden"
            id="backup-file-input"
          />
          <label
            htmlFor="backup-file-input"
            className="cursor-pointer block"
          >
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-300 mb-2">點擊選擇備份檔案</p>
            <p className="text-sm text-gray-400">支援 .gcbackup 和 .json 格式</p>
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-cosmic-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">
                  {BackupService.formatFileSize(selectedFile.size)} • 
                  {BackupService.formatTimestamp(new Date(selectedFile.lastModified))}
                </p>
              </div>
              <div className={`px-3 py-1 rounded text-xs ${
                validationResult?.isValid 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {validationResult?.isValid ? '有效' : '無效'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 驗證結果 */}
      {validationResult && (
        <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-white mb-4">驗證結果</h4>
          
          {validationResult.errors.length > 0 && (
            <div className="mb-4">
              <h5 className="text-red-400 font-medium mb-2">錯誤</h5>
              <ul className="text-sm text-red-300 space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mb-4">
              <h5 className="text-yellow-400 font-medium mb-2">警告</h5>
              <ul className="text-sm text-yellow-300 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.isValid && backupPreview && (
            <div>
              <h5 className="text-green-400 font-medium mb-2">備份內容預覽</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-cosmic-700 rounded p-3">
                  <div className="text-2xl font-bold text-warm-gold">{backupPreview.totalProjects}</div>
                  <div className="text-gray-400">專案</div>
                </div>
                <div className="bg-cosmic-700 rounded p-3">
                  <div className="text-2xl font-bold text-green-400">{backupPreview.totalChapters}</div>
                  <div className="text-gray-400">章節</div>
                </div>
                <div className="bg-cosmic-700 rounded p-3">
                  <div className="text-2xl font-bold text-clay-orange">{backupPreview.totalCharacters}</div>
                  <div className="text-gray-400">角色</div>
                </div>
                <div className="bg-cosmic-700 rounded p-3">
                  <div className="text-2xl font-bold text-gold-400">{validationResult.version}</div>
                  <div className="text-gray-400">版本</div>
                </div>
              </div>

              {backupPreview.projects && backupPreview.projects.length > 0 && (
                <div className="mt-4">
                  <h6 className="text-white font-medium mb-2">專案列表</h6>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {backupPreview.projects.map((project: { id: string; name: string; type: string }) => (
                      <div key={project.id} className="flex items-center justify-between bg-cosmic-700 rounded p-2">
                        <span className="text-white">{project.name}</span>
                        <span className="text-xs text-gray-400">{project.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 還原選項 */}
      {validationResult?.isValid && (
        <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-6">
          <h4 className="text-lg font-medium text-white mb-4">還原選項</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.includeProjects}
                onChange={(e) => onRestoreOptionsChange({
                  ...restoreOptions,
                  includeProjects: e.target.checked
                })}
                className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
              />
              <span className="text-gray-300">還原專案</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.includeChapters}
                onChange={(e) => onRestoreOptionsChange({
                  ...restoreOptions,
                  includeChapters: e.target.checked
                })}
                className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
              />
              <span className="text-gray-300">還原章節</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.includeCharacters}
                onChange={(e) => onRestoreOptionsChange({
                  ...restoreOptions,
                  includeCharacters: e.target.checked
                })}
                className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
              />
              <span className="text-gray-300">還原角色</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.includeSettings}
                onChange={(e) => onRestoreOptionsChange({
                  ...restoreOptions,
                  includeSettings: e.target.checked
                })}
                className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
              />
              <span className="text-gray-300">還原設定</span>
            </label>
          </div>

          <div className="border-t border-cosmic-700 pt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.overwriteExisting}
                onChange={(e) => onRestoreOptionsChange({
                  ...restoreOptions,
                  overwriteExisting: e.target.checked
                })}
                className="mr-3 w-4 h-4 text-gold-500 bg-cosmic-700 border-cosmic-600 rounded focus:ring-gold-500"
              />
              <span className="text-gray-300">覆蓋現有資料</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-7">
              如果不勾選，只會還原不存在的項目
            </p>
          </div>
        </div>
      )}

      {/* 還原按鈕 */}
      {validationResult?.isValid && (
        <div className="flex justify-end">
          <button
            onClick={onRestore}
            disabled={isRestoring}
            className="btn-primary"
          >
            {isRestoring ? '還原中...' : '開始還原'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BackupManager;