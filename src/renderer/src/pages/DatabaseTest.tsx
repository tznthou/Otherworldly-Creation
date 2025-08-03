import React, { useState, useEffect } from 'react';
import { api, isTauri } from '../api';
import { Project } from '../api/models';

const DatabaseTest: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 載入專案列表
  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await api.projects.getAll();
      setProjects(projectList);
      setMessage('專案載入成功');
    } catch (error) {
      setMessage(`載入專案失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 建立新專案
  const createProject = async () => {
    if (!newProjectName.trim()) {
      setMessage('請輸入專案名稱');
      return;
    }

    try {
      setLoading(true);
      const projectId = await api.projects.create({
        name: newProjectName,
        description: '這是一個測試專案',
        type: 'fantasy',
        settings: {
          aiModel: 'llama3.2',
          aiParams: {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 400
          }
        }
      });
      setMessage(`專案建立成功，ID: ${projectId}`);
      setNewProjectName('');
      await loadProjects(); // 重新載入列表
    } catch (error) {
      setMessage(`建立專案失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 刪除專案
  const deleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`確定要刪除專案「${projectName}」嗎？`)) {
      return;
    }

    try {
      setLoading(true);
      await api.projects.delete(projectId);
      setMessage(`專案「${projectName}」刪除成功`);
      await loadProjects(); // 重新載入列表
    } catch (error) {
      setMessage(`刪除專案失敗: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 頁面載入時載入專案
  useEffect(() => {
    if (isTauri()) {
      loadProjects();
    }
  }, []);

  if (!isTauri()) {
    return (
      <div className="p-8 bg-cosmic-900 min-h-screen text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gold-400">
            資料庫測試頁面
          </h1>
          <div className="bg-red-800 p-4 rounded-lg">
            <p>此頁面只能在 Tauri 環境中運行。請使用 `npm run dev:tauri` 啟動 Tauri 版本。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-cosmic-900 min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gold-400">
          Tauri 資料庫功能測試
        </h1>

        {/* 狀態訊息 */}
        {message && (
          <div className="mb-6 p-4 bg-cosmic-800 border border-gold-400 rounded-lg">
            <p className="text-gold-300">{message}</p>
          </div>
        )}

        {/* 新增專案區域 */}
        <div className="mb-8 bg-cosmic-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gold-400">建立新專案</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="輸入專案名稱"
              className="flex-1 px-4 py-2 bg-cosmic-700 border border-cosmic-600 rounded text-white"
              disabled={loading}
            />
            <button
              onClick={createProject}
              disabled={loading}
              className="px-6 py-2 bg-gold-600 hover:bg-gold-700 disabled:bg-gray-600 rounded text-white font-medium transition-colors"
            >
              {loading ? '建立中...' : '建立專案'}
            </button>
          </div>
        </div>

        {/* 專案列表 */}
        <div className="bg-cosmic-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gold-400">專案列表</h2>
            <button
              onClick={loadProjects}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white transition-colors"
            >
              {loading ? '載入中...' : '重新載入'}
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              {loading ? '載入中...' : '尚無專案，請建立第一個專案'}
            </p>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-cosmic-700 p-4 rounded border border-cosmic-600"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-gray-300 mt-2">{project.description}</p>
                      )}
                      <div className="mt-3 text-sm text-gray-400">
                        <p>ID: {project.id}</p>
                        <p>類型: {project.type || '無'}</p>
                        <p>建立時間: {new Date(project.createdAt).toLocaleString('zh-TW')}</p>
                        <p>更新時間: {new Date(project.updatedAt).toLocaleString('zh-TW')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteProject(project.id, project.name)}
                      disabled={loading}
                      className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white text-sm transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 功能狀態 */}
        <div className="mt-8 bg-cosmic-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gold-400">資料庫功能狀態</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              <span>SQLite 資料庫連接</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              <span>資料庫 migrations</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              <span>專案 CRUD 操作</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-400 mr-2">⏳</span>
              <span>章節管理 (已實現，待測試)</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-400 mr-2">⏳</span>
              <span>角色管理 (已實現，待測試)</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-400 mr-2">⏳</span>
              <span>設定管理 (待實現)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTest;