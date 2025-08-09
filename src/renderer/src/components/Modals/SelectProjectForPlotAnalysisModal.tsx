import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { closeModal } from '../../store/slices/uiSlice';

const SelectProjectForPlotAnalysisModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { projects } = useAppSelector(state => state.projects);

  const handleClose = () => {
    dispatch(closeModal('selectProjectForPlotAnalysis'));
  };

  const handleSelectProject = (projectId: string) => {
    dispatch(closeModal('selectProjectForPlotAnalysis'));
    // 導航到專案編輯器，並且會自動開啟劇情分析面板
    navigate(`/project/${projectId}?plotAnalysis=true`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-cosmic-900 border border-cosmic-700 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="p-6 border-b border-cosmic-700 flex items-center justify-between">
          <h2 className="text-xl font-cosmic text-gold-500">🎭 選擇專案進行劇情分析</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 內容 */}
        <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-cosmic text-gold-400 mb-4">還沒有專案</h3>
              <p className="text-gray-300 mb-6">
                請先建立一個專案並寫入一些內容，然後就可以進行劇情分析了。
              </p>
              <button
                onClick={() => {
                  dispatch(closeModal('selectProjectForPlotAnalysis'));
                  // 可以在這裡開啟建立專案的模態框
                }}
                className="btn-primary"
              >
                建立新專案
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 mb-4">請選擇要進行劇情分析的專案：</p>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <span className="text-purple-400 text-lg">🎭</span>
                  <div className="text-sm">
                    <div className="text-purple-300 font-medium mb-1">劇情分析引擎功能</div>
                    <ul className="text-purple-200 space-y-1 text-xs">
                      <li>• <strong>衝突檢測</strong> - 自動識別內在、外在、人際、社會衝突</li>
                      <li>• <strong>節奏分析</strong> - 評估故事節奏快慢和事件密度分布</li>
                      <li>• <strong>伏筆追蹤</strong> - 追蹤伏筆設置和回收狀況</li>
                      <li>• <strong>智能建議</strong> - AI 生成的劇情改善建議</li>
                      <li>• <strong>章節趨勢</strong> - 跨章節劇情發展趨勢分析</li>
                    </ul>
                  </div>
                </div>
              </div>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full text-left p-4 bg-cosmic-800 border border-cosmic-700 rounded-lg hover:border-purple-500 transition-colors group"
                >
                  <h4 className="font-medium text-white group-hover:text-purple-400">
                    {project.name}
                  </h4>
                  {project.description && (
                    <p className="text-sm text-gray-400 mt-1">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">
                        建立於 {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-cosmic-800 text-purple-400">
                        {project?.novelLength === 'short' && '短篇'}
                        {project?.novelLength === 'medium' && '中篇'}
                        {project?.novelLength === 'long' && '長篇'}
                        {!project?.novelLength && '中篇'}
                      </span>
                    </div>
                    <span className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      開始分析 🎭 →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="p-6 border-t border-cosmic-700 flex justify-end">
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

export default SelectProjectForPlotAnalysisModal;