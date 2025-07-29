import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux';
import { setCurrentProject } from '../../store/slices/projectsSlice';
import { Project } from '../../store/slices/projectsSlice';
import { openModal } from '../../store/slices/uiSlice';
import { Menu, MenuItem } from '../../components/UI/Menu';
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
        className="card card-hover cursor-pointer group min-h-[200px] flex flex-col relative"
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

        {/* 操作選單 */}
        <div className="absolute top-2 right-2 z-10">
          <Menu
            trigger={
              <button
                className="w-8 h-8 rounded-full bg-cosmic-800 hover:bg-cosmic-700 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-400 hover:text-gold-400">⋮</span>
              </button>
            }
            position="bottom-right"
          >
          <MenuItem icon="✏️" onClick={handleEditProject}>編輯專案</MenuItem>
          <MenuItem icon="📤" onClick={handleExportProject}>匯出專案</MenuItem>
          <MenuItem icon="🗑️" onClick={handleDeleteProject} className="text-red-400">刪除專案</MenuItem>
        </Menu>
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