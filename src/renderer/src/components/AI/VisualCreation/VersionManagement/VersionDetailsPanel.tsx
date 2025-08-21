import React, { useState, useCallback, useMemo } from 'react';
import { ImageVersion, VersionTag } from '../../../../types/versionManagement';
import { useVersionManager } from '../../../../hooks/illustration';
import { VERSION_MANAGEMENT_CONSTANTS } from './index';

// 詳細面板標籤頁
export type DetailTab = 'overview' | 'technical' | 'history' | 'tags' | 'relationships' | 'actions';

// 詳細面板區段
export interface DetailSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

// 版本詳細面板屬性
export interface VersionDetailsPanelProps {
  // 核心資料
  version?: ImageVersion;
  
  // 顯示配置
  activeTab?: DetailTab;
  showFullImage?: boolean;
  showStatistics?: boolean;
  showActions?: boolean;
  allowEdit?: boolean;
  
  // 事件回調
  onVersionUpdate?: (version: ImageVersion) => void;
  onVersionDelete?: (version: ImageVersion) => void;
  onVersionDuplicate?: (version: ImageVersion) => void;
  onVersionExport?: (version: ImageVersion) => void;
  onTabChange?: (tab: DetailTab) => void;
  onTagAdd?: (version: ImageVersion, tag: VersionTag) => void;
  onTagRemove?: (version: ImageVersion, tagId: string) => void;
  
  // 樣式
  className?: string;
  style?: React.CSSProperties;
}

const VersionDetailsPanel: React.FC<VersionDetailsPanelProps> = ({
  version,
  activeTab = 'overview',
  showFullImage = true,
  showStatistics = true,
  showActions = true,
  allowEdit = true,
  onVersionUpdate,
  onVersionDelete,
  onVersionDuplicate,
  onVersionExport,
  onTabChange,
  onTagAdd,
  onTagRemove,
  className = '',
  style,
}) => {
  // Hooks
  const { updateVersion, deleteVersion, duplicateVersion } = useVersionManager();

  // 本地狀態
  const [currentTab, setCurrentTab] = useState<DetailTab>(activeTab);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVersion, setEditedVersion] = useState<Partial<ImageVersion>>({});
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // 格式化檔案大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // 格式化時間
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // 處理標籤切換
  const handleTabChange = useCallback((tab: DetailTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  // 處理編輯模式切換
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // 保存更改
      if (version && Object.keys(editedVersion).length > 0) {
        const updatedVersion = { ...version, ...editedVersion };
        updateVersion(version.id, editedVersion);
        onVersionUpdate?.(updatedVersion as ImageVersion);
      }
      setEditedVersion({});
    } else {
      // 進入編輯模式
      setEditedVersion({});
    }
    setIsEditing(!isEditing);
  }, [isEditing, version, editedVersion, updateVersion, onVersionUpdate]);

  // 處理刪除版本
  const handleDelete = useCallback(async () => {
    if (!version) return;
    
    try {
      await deleteVersion(version.id);
      onVersionDelete?.(version);
      setShowConfirmDelete(false);
    } catch (error) {
      console.error('刪除版本失敗:', error);
    }
  }, [version, deleteVersion, onVersionDelete]);

  // 處理複製版本
  const handleDuplicate = useCallback(async () => {
    if (!version) return;
    
    try {
      await duplicateVersion(version.id);
      onVersionDuplicate?.(version);
    } catch (error) {
      console.error('複製版本失敗:', error);
    }
  }, [version, duplicateVersion, onVersionDuplicate]);

  // 處理新增標籤
  const handleAddTag = useCallback(() => {
    if (!version || !newTag.name.trim()) return;
    
    const tag: VersionTag = {
      id: Date.now().toString(),
      name: newTag.name.trim(),
      color: newTag.color,
      description: '',
    };
    
    onTagAdd?.(version, tag);
    setNewTag({ name: '', color: '#3B82F6' });
  }, [version, newTag, onTagAdd]);

  // 處理移除標籤
  const handleRemoveTag = useCallback((tagId: string) => {
    if (!version) return;
    onTagRemove?.(version, tagId);
  }, [version, onTagRemove]);

  // 標籤頁配置
  const tabs = useMemo(() => [
    {
      id: 'overview',
      title: '概覽',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'technical',
      title: '技術資訊',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'tags',
      title: '標籤',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'actions',
      title: '操作',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      ),
    },
  ], []);

  // 渲染概覽標籤頁
  const renderOverviewTab = () => {
    if (!version) return null;

    return (
      <div className="space-y-6">
        {/* 圖片預覽 */}
        {showFullImage && (
          <div className="text-center">
            <img
              src={version.imageUrl}
              alt={version.metadata.title || `版本 ${version.versionNumber}`}
              className="max-w-full max-h-96 mx-auto object-contain border rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* 基本資訊 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">基本資訊</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">標題</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedVersion.metadata?.title || version.metadata.title || ''}
                  onChange={(e) => setEditedVersion(prev => ({
                    ...prev,
                    metadata: { ...version.metadata, ...prev.metadata, title: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              ) : (
                <p className="text-sm text-gray-900">
                  {version.metadata.title || `版本 ${version.versionNumber}`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">版本號</label>
              <p className="text-sm text-gray-900">v{version.versionNumber}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
              <span
                className="inline-flex px-2 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: VERSION_MANAGEMENT_CONSTANTS.COLORS.status[version.status] }}
              >
                {version.status === 'active' && '活躍'}
                {version.status === 'archived' && '封存'}
                {version.status === 'deleted' && '已刪除'}
                {version.status === 'draft' && '草稿'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">類型</label>
              <span
                className="inline-flex px-2 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: VERSION_MANAGEMENT_CONSTANTS.COLORS.type[version.type] }}
              >
                {version.type === 'original' && '原始'}
                {version.type === 'revision' && '修訂'}
                {version.type === 'branch' && '分支'}
                {version.type === 'merge' && '合併'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">創建時間</label>
              <p className="text-sm text-gray-900">
                {formatDate(version.metadata.createdAt)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">更新時間</label>
              <p className="text-sm text-gray-900">
                {formatDate(version.metadata.updatedAt)}
              </p>
            </div>
          </div>

          {/* 描述 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            {isEditing ? (
              <textarea
                value={editedVersion.metadata?.description || version.metadata.description || ''}
                onChange={(e) => setEditedVersion(prev => ({
                  ...prev,
                  metadata: { ...version.metadata, ...prev.metadata, description: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="輸入版本描述..."
              />
            ) : (
              <p className="text-sm text-gray-900">
                {version.metadata.description || '無描述'}
              </p>
            )}
          </div>

          {/* 提示詞 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">提示詞</label>
            <div className="bg-white border rounded p-3">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {version.prompt}
              </p>
            </div>
          </div>
        </div>

        {/* 統計資訊 */}
        {showStatistics && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-lg font-medium mb-4">統計資訊</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{version.metadata.viewCount}</div>
                <div className="text-sm text-gray-600">查看次數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{version.metadata.likeCount}</div>
                <div className="text-sm text-gray-600">喜歡次數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{version.metadata.exportCount}</div>
                <div className="text-sm text-gray-600">導出次數</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{version.childVersionIds.length}</div>
                <div className="text-sm text-gray-600">子版本數</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染技術資訊標籤頁
  const renderTechnicalTab = () => {
    if (!version) return null;

    const { metadata } = version;
    const { aiParameters, dimensions } = metadata;

    return (
      <div className="space-y-6">
        {/* AI 參數 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">AI 生成參數</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
              <p className="text-sm text-gray-900">{aiParameters.model}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提供商</label>
              <p className="text-sm text-gray-900">{aiParameters.provider}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">種子值</label>
              <p className="text-sm text-gray-900">{aiParameters.seed || '隨機'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">指導強度</label>
              <p className="text-sm text-gray-900">{aiParameters.guidance || '未設定'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生成步數</label>
              <p className="text-sm text-gray-900">{aiParameters.steps || '默認'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">增強</label>
              <p className="text-sm text-gray-900">{aiParameters.enhance ? '是' : '否'}</p>
            </div>
            {aiParameters.style && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">風格</label>
                <p className="text-sm text-gray-900">{aiParameters.style}</p>
              </div>
            )}
          </div>
        </div>

        {/* 圖片資訊 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">圖片資訊</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
              <p className="text-sm text-gray-900">{dimensions.width} × {dimensions.height}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">檔案大小</label>
              <p className="text-sm text-gray-900">{formatFileSize(metadata.fileSize)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生成時間</label>
              <p className="text-sm text-gray-900">{metadata.generationTime} ms</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">圖片 URL</label>
              <p className="text-sm text-gray-900 truncate">{version.imageUrl}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染標籤標籤頁
  const renderTagsTab = () => {
    if (!version) return null;

    return (
      <div className="space-y-6">
        {/* 現有標籤 */}
        <div>
          <h4 className="text-lg font-medium mb-4">版本標籤</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {version.metadata.tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:bg-black/10 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {version.metadata.tags.length === 0 && (
              <p className="text-sm text-gray-500">尚未新增標籤</p>
            )}
          </div>
        </div>

        {/* 新增標籤 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-medium mb-3">新增標籤</h5>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTag.name}
              onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
              placeholder="標籤名稱"
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="color"
              value={newTag.color}
              onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              新增
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染操作標籤頁
  const renderActionsTab = () => {
    if (!version) return null;

    return (
      <div className="space-y-6">
        {/* 版本操作 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">版本操作</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleDuplicate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              複製版本
            </button>

            <button
              onClick={() => onVersionExport?.(version)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              導出版本
            </button>

            {allowEdit && (
              <button
                onClick={handleEditToggle}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded ${
                  isEditing 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditing ? '儲存編輯' : '編輯版本'}
              </button>
            )}

            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              刪除版本
            </button>
          </div>
        </div>

        {/* 版本資訊 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">版本資訊</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">版本 ID:</span>
              <span className="font-mono text-gray-900">{version.id}</span>
            </div>
            {version.parentVersionId && (
              <div className="flex justify-between">
                <span className="text-gray-600">父版本 ID:</span>
                <span className="font-mono text-gray-900">{version.parentVersionId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">根版本 ID:</span>
              <span className="font-mono text-gray-900">{version.rootVersionId}</span>
            </div>
            {version.branchName && (
              <div className="flex justify-between">
                <span className="text-gray-600">分支名稱:</span>
                <span className="text-gray-900">{version.branchName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!version) {
    return (
      <div className={`version-details-panel h-full flex items-center justify-center ${className}`} style={style}>
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">選擇版本</p>
          <p className="text-sm text-gray-400">選擇一個版本來查看詳細資訊</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`version-details-panel h-full flex flex-col bg-white ${className}`} style={style}>
      {/* 標頭 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src={version.imageUrl}
            alt={`版本 ${version.versionNumber}`}
            className="w-12 h-12 object-cover rounded border"
          />
          <div>
            <h3 className="text-lg font-medium">
              {version.metadata.title || `版本 ${version.versionNumber}`}
            </h3>
            <p className="text-sm text-gray-500">
              {formatDate(version.metadata.createdAt)}
            </p>
          </div>
        </div>
        
        {isEditing && (
          <div className="text-sm text-orange-600 font-medium">
            編輯模式
          </div>
        )}
      </div>

      {/* 標籤頁導航 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as DetailTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              currentTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.title}
          </button>
        ))}
      </div>

      {/* 標籤頁內容 */}
      <div className="flex-1 overflow-auto p-6">
        {currentTab === 'overview' && renderOverviewTab()}
        {currentTab === 'technical' && renderTechnicalTab()}
        {currentTab === 'tags' && renderTagsTab()}
        {currentTab === 'actions' && renderActionsTab()}
      </div>

      {/* 刪除確認對話框 */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-medium mb-4">確認刪除</h4>
            <p className="text-gray-600 mb-6">
              您確定要刪除版本 {version.versionNumber} 嗎？此操作無法復原。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionDetailsPanel;