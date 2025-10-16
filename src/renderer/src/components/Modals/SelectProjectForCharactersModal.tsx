import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';
import { useNavigate } from 'react-router-dom';

const SelectProjectForCharactersModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { projects } = useAppSelector(state => state.projects);

  const handleClose = () => {
    dispatch(closeModal('selectProjectForCharacters'));
  };

  const handleSelectProject = (projectId: string) => {
    dispatch(closeModal('selectProjectForCharacters'));
    navigate(`/characters/${projectId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-dark border border-warm-gold/10 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-warm-gold/10 flex items-center justify-between">
          <h2 className="text-xl font-serif-tc text-warm-gold">⚔️ 選擇專案進行角色管理</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >

// 選擇專案進行劇情分析的模態框
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-serif-tc text-warm-gold mb-4">還沒有專案</h3>
              <p className="text-gray-300 mb-6">
                請先建立一個專案，然後就可以為專案創建角色了。
              </p>
              <button
                onClick={() => {
                  dispatch(closeModal('selectProjectForCharacters'));
                  // 可以在這裡開啟建立專案的模態框
                }}
                className="btn-primary"
              >
                建立新專案
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 mb-4">請選擇要管理角色的專案：</p>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full text-left p-4 bg-bg-light/50 backdrop-blur-sm border border-warm-gold/10 rounded-lg hover:border-warm-gold transition-colors group"
                >
                  <h4 className="font-medium text-white group-hover:text-warm-gold">
                    {project.name}
                  </h4>
                  {project.description && (
                    <p className="text-sm text-gray-400 mt-1">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      建立於 {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-warm-gold opacity-0 group-hover:opacity-100 transition-opacity">
                      管理角色 →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-warm-gold/10 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectProjectForCharactersModal;