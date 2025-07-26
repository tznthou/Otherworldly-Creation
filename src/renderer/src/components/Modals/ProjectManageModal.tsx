import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { updateProject, deleteProject } from '../../store/slices/projectsSlice';
import { closeModal } from '../../store/slices/uiSlice';
import { Project } from '../../store/slices/projectsSlice';
import ConfirmDialog from '../UI/ConfirmDialog';

interface ProjectManageModalProps {
  project: Project;
}

const ProjectManageModal: React.FC<ProjectManageModalProps> = ({ project }) => {
  const dispatch = useAppDispatch();
  const { availableModels, isOllamaConnected } = useAppSelector(state => state.ai);
  
  const [projectName, setProjectName] = useState(project.name);
  const [projectDescription, setProjectDescription] = useState(project.description || '');
  const [aiModel, setAiModel] = useState(project.settings?.aiModel || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
  }>({});

  // 載入可用的 AI 模型
  useEffect(() => {
    if (isOllamaConnected && !aiModel && availableModels.length > 0) {
      setAiModel(availableModels[0]);
    }
  }, [isOllamaConnected, availableModels, aiModel]);

  const handleClose = () => {
    dispatch(closeModal('projectManage'));
  };

  const validate = () => {
    const newErrors: { name?: string } = {};

    if (!projectName.trim()) {
      newErrors.name = '請輸入專案名稱';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await dispatch(updateProject({
        ...project,
        name: projectName,
        description: projectDescription,
        settings: {
          ...project.settings,
          aiModel,
        },
      })).unwrap();

      handleClose();
    } catch (error) {
      console.error('更新專案失敗:', error);
      setErrors({
        name: '更新專案失敗，請稍後再試',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      await dispatch(deleteProject(project.id)).unwrap();
      handleClose();
    } catch (error) {
      console.error('刪除專案失敗:', error);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = () => {
    // 將專案資料轉換為 JSON 字符串
    const projectData = JSON.stringify({
      name: project.name,
      type: project.type,
      description: project.description,
      settings: project.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    }, null, 2);

    // 創建 Blob 對象
    const blob = new Blob([projectData], { type: 'application/json' });
    
    // 創建下載連結
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_export.json`;
    
    // 觸發下載
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl">
          {/* 標題 */}
          <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
            <h2 className="text-xl font-cosmic text-gold-500">管理專案</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* 內容 */}
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">專案名稱</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="輸入專案名稱"
                className={`w-full bg-cosmic-800 border ${
                  errors.name ? 'border-red-500' : 'border-cosmic-700'
                } rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 mb-2">專案描述（選填）</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="輸入專案描述..."
                rows={3}
                className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              ></textarea>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 mb-2">AI 模型</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                disabled={!isOllamaConnected || availableModels.length === 0}
              >
                {!isOllamaConnected ? (
                  <option value="">Ollama 未連接</option>
                ) : availableModels.length === 0 ? (
                  <option value="">無可用模型</option>
                ) : (
                  <>
                    <option value="">選擇 AI 模型</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </>
                )}
              </select>
              {!isOllamaConnected && (
                <p className="text-yellow-500 text-sm mt-1">
                  Ollama 服務未連接，請先安裝並啟動 Ollama
                </p>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">專案資訊</h3>
              <div className="bg-cosmic-800 border border-cosmic-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">專案類型：</span>
                    <span className="text-white">
                      {project.type === 'isekai' && '異世界'}
                      {project.type === 'school' && '校園'}
                      {project.type === 'scifi' && '科幻'}
                      {project.type === 'fantasy' && '奇幻'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">創建時間：</span>
                    <span className="text-white">
                      {new Date(project.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">最後更新：</span>
                    <span className="text-white">
                      {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">專案 ID：</span>
                    <span className="text-white">{project.id.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">危險操作</h3>
              <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4">
                <p className="text-gray-300 mb-4">
                  刪除專案將永久移除所有相關資料，包括章節和角色。此操作無法復原。
                </p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  刪除專案
                </button>
              </div>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="p-6 border-t border-cosmic-700 flex justify-between">
            <button
              onClick={handleExport}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              匯出專案
            </button>
            <div className="space-x-4">
              <button
                onClick={handleClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="確認刪除"
        message={`確定要刪除專案「${project.name}」嗎？此操作將永久刪除所有相關資料，且無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default ProjectManageModal;