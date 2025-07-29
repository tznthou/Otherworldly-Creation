import React, { useState, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { openModal } from '../../store/slices/uiSlice';
import ProjectCard from './ProjectCard';
import { Project } from '../../store/slices/projectsSlice';
import { api } from '../../api';

const ProjectGrid: React.FC = () => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector(state => state.projects);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [projectStats, setProjectStats] = useState<Record<string, { chapterCount: number; characterCount: number }>>({});

  // 載入專案統計數據
  useEffect(() => {
    const loadProjectStats = async () => {
      const stats: Record<string, { chapterCount: number; characterCount: number }> = {};
      
      await Promise.all(
        projects.map(async (project) => {
          try {
            const [chapters, characters] = await Promise.all([
              api.chapters.getByProjectId(project.id),
              api.characters.getByProjectId(project.id),
            ]);
            
            stats[project.id] = {
              chapterCount: chapters.length,
              characterCount: characters.length,
            };
          } catch (error) {
            console.error(`Failed to load stats for project ${project.id}:`, error);
            stats[project.id] = {
              chapterCount: 0,
              characterCount: 0,
            };
          }
        })
      );
      
      setProjectStats(stats);
    };

    if (projects.length > 0) {
      loadProjectStats();
    }
  }, [projects]);

  const handleCreateProject = () => {
    console.log('創建專案按鈕被點擊');
    dispatch(openModal('createProject'));
    console.log('已 dispatch openModal action');
  };

  // 過濾和排序專案
  const filteredAndSortedProjects = useMemo(() => {
    // 先過濾
    let result = projects.filter(project => {
      // 搜索詞過濾
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 類型過濾
      const matchesType = filterType === 'all' || project.type === filterType;
      
      return matchesSearch && matchesType;
    });
    
    // 再排序
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [projects, searchTerm, filterType, sortBy, sortOrder]);

  // 切換排序順序
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // 切換排序欄位
  const handleSortChange = (field: 'name' | 'updatedAt' | 'createdAt') => {
    if (sortBy === field) {
      toggleSortOrder();
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 獲取排序圖標
  const getSortIcon = (field: 'name' | 'updatedAt' | 'createdAt') => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-6">📚</div>
        <h3 className="text-xl font-medium text-gray-300 mb-4">
          還沒有任何專案
        </h3>
        <p className="text-gray-400 mb-8">
          開始你的第一個異世界創作之旅吧！
        </p>
        <button
          onClick={handleCreateProject}
          className="btn-primary text-lg px-8 py-3"
        >
          創建新專案
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 搜索和過濾工具欄 */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* 搜索框 */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索專案..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cosmic-800 border border-cosmic-700 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 過濾和排序 */}
        <div className="flex gap-2">
          {/* 類型過濾 */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-cosmic-800 border border-cosmic-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="all">所有類型</option>
            <option value="isekai">異世界</option>
            <option value="school">校園</option>
            <option value="scifi">科幻</option>
            <option value="fantasy">奇幻</option>
          </select>

          {/* 排序方式 */}
          <div className="flex rounded-lg overflow-hidden border border-cosmic-700">
            <button
              onClick={() => handleSortChange('name')}
              className={`px-3 py-2 ${sortBy === 'name' ? 'bg-cosmic-700 text-gold-400' : 'bg-cosmic-800 text-gray-300'}`}
            >
              名稱 {getSortIcon('name')}
            </button>
            <button
              onClick={() => handleSortChange('updatedAt')}
              className={`px-3 py-2 ${sortBy === 'updatedAt' ? 'bg-cosmic-700 text-gold-400' : 'bg-cosmic-800 text-gray-300'}`}
            >
              更新時間 {getSortIcon('updatedAt')}
            </button>
            <button
              onClick={() => handleSortChange('createdAt')}
              className={`px-3 py-2 ${sortBy === 'createdAt' ? 'bg-cosmic-700 text-gold-400' : 'bg-cosmic-800 text-gray-300'}`}
            >
              創建時間 {getSortIcon('createdAt')}
            </button>
          </div>
        </div>
      </div>

      {/* 結果計數 */}
      {filteredAndSortedProjects.length !== projects.length && (
        <div className="mb-4 text-sm text-gray-400">
          顯示 {filteredAndSortedProjects.length} 個結果（共 {projects.length} 個專案）
        </div>
      )}

      {/* 專案網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 創建新專案卡片 */}
        <div
          onClick={handleCreateProject}
          className="card card-hover cursor-pointer group min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-cosmic-600 hover:border-gold-500"
        >
          <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
            ➕
          </div>
          <h3 className="text-lg font-medium text-gold-500 group-hover:text-gold-400">
            創建新專案
          </h3>
          <p className="text-sm text-gray-400 mt-2 text-center">
            開始新的創作之旅
          </p>
        </div>

        {/* 專案卡片 */}
        {filteredAndSortedProjects.map((project) => {
          const stats = projectStats[project.id] || { chapterCount: 0, characterCount: 0 };
          return (
            <ProjectCard 
              key={project.id} 
              project={project} 
              chapterCount={stats.chapterCount}
              characterCount={stats.characterCount}
            />
          );
        })}
      </div>

      {/* 無結果提示 */}
      {filteredAndSortedProjects.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-gray-300 mb-2">
            沒有找到符合條件的專案
          </h3>
          <p className="text-gray-400">
            嘗試調整搜索條件或清除過濾器
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
            }}
            className="mt-4 btn-secondary"
          >
            清除過濾器
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectGrid;