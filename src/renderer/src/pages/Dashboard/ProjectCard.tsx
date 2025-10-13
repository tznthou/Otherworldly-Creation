import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { setCurrentProject } from '../../store/slices/projectsSlice';
import { Project } from '../../store/slices/projectsSlice';
import { openModal } from '../../store/slices/uiSlice';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { formatDate, safeParseDate, isRecentDate } from '../../utils/dateUtils';

interface ProjectCardProps {
  project: Project;
  chapterCount?: number;
  characterCount?: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  chapterCount = 0, 
  characterCount = 0 
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleProjectClick = () => {
    dispatch(setCurrentProject(project));
    navigate(`/project/${project.id}`);
  };

  const handleDeleteProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleEditProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setCurrentProject(project));
    dispatch(openModal('projectManage'));
  };

  const handleExportProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    
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

  const getProjectTypeInfo = (type: string) => {
    switch (type) {
      case 'isekai':
        return { name: '異世界', icon: '🌟', color: 'from-purple-500 to-pink-500' };
      case 'school':
        return { name: '校園', icon: '🏫', color: 'from-blue-500 to-cyan-500' };
      case 'scifi':
        return { name: '科幻', icon: '🚀', color: 'from-green-500 to-teal-500' };
      case 'fantasy':
        return { name: '奇幻', icon: '⚔️', color: 'from-orange-500 to-red-500' };
      default:
        return { name: '未知', icon: '📖', color: 'from-gray-500 to-gray-600' };
    }
  };

  const typeInfo = getProjectTypeInfo(project.type);
  const updatedDate = safeParseDate(project.updatedAt);
  const lastEditedDays = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  const isRecentlyEdited = isRecentDate(project.updatedAt, 3);

  return (
    <>
      <div
        onClick={handleProjectClick}
        className="card card-hover cursor-pointer group min-h-[200px] flex flex-col relative overflow-visible"
      >
        {/* 專案類型標籤 */}
        <div className="flex items-center justify-between mb-4">
          <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${typeInfo.color} text-white`}>
            <span className="mr-1">{typeInfo.icon}</span>
            {typeInfo.name}
          </div>
          
          <div className="text-xs text-gray-500">
            {formatDate(project.updatedAt)}
          </div>
        </div>

        {/* 專案標題 */}
        <h3 className="text-lg font-medium text-gold-400 group-hover:text-gold-300 mb-2 line-clamp-2">
          {project.name}
        </h3>

        {/* 專案描述 */}
        <p className="text-sm text-gray-400 flex-1 line-clamp-3 mb-4">
          {project.description || '暫無描述'}
        </p>

        {/* 專案統計 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-cosmic-700">
          <div className="flex items-center space-x-4">
            <span>📝 {chapterCount} 章節</span>
            <span>👥 {characterCount} 角色</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 ${isRecentlyEdited ? 'bg-green-500' : 'bg-gray-500'} rounded-full`}></div>
            <span>{isRecentlyEdited ? '最近編輯' : `${lastEditedDays}天前`}</span>
          </div>
        </div>

        {/* 操作按鈕群組 - 確保顯示在最上層 */}
        <div className="absolute top-2 right-2 z-50 flex gap-2" style={{ zIndex: 999 }}>
          <button
            onClick={handleEditProject}
            className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 border border-blue-700"
            title="編輯專案設定"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleExportProject}
            className="w-9 h-9 rounded-lg bg-green-600 hover:bg-green-500 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 border border-green-700"
            title="匯出專案資料"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </button>
          <button
            onClick={handleDeleteProject}
            className="w-9 h-9 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-110 border border-red-700"
            title="刪除專案"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="確認刪除"
        message={`確定要刪除專案「${project.name}」嗎？此操作將永久刪除所有相關資料，且無法復原。`}
        confirmText="刪除"
        cancelText="取消"
        onConfirm={() => {
          dispatch(setCurrentProject(project));
          dispatch(openModal('deleteProject'));
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default ProjectCard;