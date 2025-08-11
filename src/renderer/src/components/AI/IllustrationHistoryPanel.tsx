import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  IllustrationGalleryItem,
  IllustrationFilter,
  DetailedGenerationResult 
} from '../../types/illustration';
import { Character } from '../../api/models';
import CosmicButton from '../UI/CosmicButton';
import CosmicInput from '../UI/CosmicInput';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Alert } from '../UI/Alert';
import { Card } from '../UI/Card';
import { Badge } from '../UI/Badge';

interface IllustrationHistoryPanelProps {
  className?: string;
}

interface ViewMode {
  type: 'grid' | 'list' | 'timeline';
}

const IllustrationHistoryPanel: React.FC<IllustrationHistoryPanelProps> = ({
  className = ''
}) => {
  // Redux 狀態
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);

  // 組件狀態
  const [viewMode, setViewMode] = useState<ViewMode['type']>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 篩選狀態
  const [filter, setFilter] = useState<IllustrationFilter>({
    character_ids: [],
    style_types: [],
    quality_range: [0, 1],
    date_range: undefined,
    tags: [],
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // 數據狀態
  const [illustrations, setIllustrations] = useState<IllustrationGalleryItem[]>([]);
  const [selectedIllustration, setSelectedIllustration] = useState<IllustrationGalleryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(12);

  // 模擬數據
  const mockIllustrations: IllustrationGalleryItem[] = [
    {
      id: '1',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '櫻花樹下的少女',
      description: '一位穿著藍色連衣裙的少女站在盛開的櫻花樹下，陽光透過花瓣灑在她的臉上',
      character_name: '艾莉絲',
      style_template: '動漫人物肖像',
      created_at: '2024-01-15T10:30:00Z',
      metadata: {
        seed_value: 1234567890,
        quality_score: 8.7,
        consistency_score: 9.2,
        generation_time_ms: 45000,
        cost: 0.04
      },
      tags: ['櫻花', '春天', '少女', '陽光']
    },
    {
      id: '2',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '魔法學院的圖書館',
      description: '古老的魔法學院圖書館，書架高聳入雲，神秘的光芒從古籍中散發',
      character_name: undefined,
      style_template: '奇幻場景',
      created_at: '2024-01-14T15:45:00Z',
      metadata: {
        seed_value: 9876543210,
        quality_score: 9.1,
        consistency_score: undefined,
        generation_time_ms: 67000,
        cost: 0.04
      },
      tags: ['魔法', '圖書館', '神秘', '古籍']
    },
    {
      id: '3',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '戰士的決心',
      description: '身穿銀色盔甲的戰士握緊長劍，眼神堅定地望向遠方的戰場',
      character_name: '萊昂',
      style_template: '精美插畫',
      created_at: '2024-01-13T09:20:00Z',
      metadata: {
        seed_value: 5555555555,
        quality_score: 8.9,
        consistency_score: 8.5,
        generation_time_ms: 52000,
        cost: 0.04
      },
      tags: ['戰士', '盔甲', '決心', '戰場']
    },
    {
      id: '4',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '月下的貓咪',
      description: '一隻優雅的黑貓坐在屋頂上，月光為牠的毛髮鍍上銀邊',
      character_name: '露娜',
      style_template: '漫畫風格',
      created_at: '2024-01-12T21:10:00Z',
      metadata: {
        seed_value: 3333333333,
        quality_score: 8.3,
        consistency_score: 8.8,
        generation_time_ms: 38000,
        cost: 0.04
      },
      tags: ['貓咪', '月亮', '屋頂', '夜晚']
    },
    {
      id: '5',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '森林中的精靈',
      description: '翠綠的森林深處，一位精靈少女與蝴蝶共舞，身邊環繞著螢火蟲',
      character_name: '希爾薇',
      style_template: '奇幻場景',
      created_at: '2024-01-11T14:30:00Z',
      metadata: {
        seed_value: 7777777777,
        quality_score: 9.3,
        consistency_score: 9.0,
        generation_time_ms: 71000,
        cost: 0.04
      },
      tags: ['精靈', '森林', '蝴蝶', '螢火蟲']
    },
    {
      id: '6',
      image_url: '/api/placeholder/300/400',
      thumbnail_url: '/api/placeholder/150/200',
      title: '城堡的夕陽',
      description: '古老的城堡在夕陽下顯得格外壯麗，橙紅色的天空映照著城牆',
      character_name: undefined,
      style_template: '精美插畫',
      created_at: '2024-01-10T18:45:00Z',
      metadata: {
        seed_value: 2222222222,
        quality_score: 8.6,
        consistency_score: undefined,
        generation_time_ms: 49000,
        cost: 0.04
      },
      tags: ['城堡', '夕陽', '壯麗', '天空']
    }
  ];

  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);

  // 載入插畫歷史
  const loadIllustrations = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 應用篩選和搜索
      let filteredResults = mockIllustrations;
      
      // 搜索篩選
      if (searchTerm.trim()) {
        filteredResults = filteredResults.filter(item =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      // 角色篩選
      if (filter.character_ids && filter.character_ids.length > 0) {
        filteredResults = filteredResults.filter(item => {
          const character = characters.find(c => c.name === item.character_name);
          return character && filter.character_ids!.includes(character.id);
        });
      }
      
      // 風格篩選
      if (filter.style_types && filter.style_types.length > 0) {
        filteredResults = filteredResults.filter(item =>
          filter.style_types!.includes(item.style_template)
        );
      }
      
      // 品質篩選
      if (filter.quality_range) {
        filteredResults = filteredResults.filter(item =>
          item.metadata.quality_score >= filter.quality_range![0] * 10 &&
          item.metadata.quality_score <= filter.quality_range![1] * 10
        );
      }
      
      // 排序
      filteredResults.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (filter.sort_by) {
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'quality_score':
            aValue = a.metadata.quality_score;
            bValue = b.metadata.quality_score;
            break;
          case 'consistency_score':
            aValue = a.metadata.consistency_score || 0;
            bValue = b.metadata.consistency_score || 0;
            break;
          default:
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
        }
        
        if (filter.sort_order === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
      
      // 分頁
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      
      setIllustrations(paginatedResults);
      setTotalPages(Math.ceil(filteredResults.length / itemsPerPage));
      
    } catch (err) {
      setError(`載入插畫失敗: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新篩選
  const updateFilter = (key: keyof IllustrationFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 清除篩選
  const clearFilters = () => {
    setFilter({
      character_ids: [],
      style_types: [],
      quality_range: [0, 1],
      date_range: undefined,
      tags: [],
      sort_by: 'created_at',
      sort_order: 'desc'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 獲取品質顏色
  const getQualityColor = (score: number) => {
    if (score >= 9) return 'text-green-400';
    if (score >= 8) return 'text-blue-400';
    if (score >= 7) return 'text-yellow-400';
    return 'text-red-400';
  };

  // 組件初始化
  useEffect(() => {
    if (currentProject) {
      loadIllustrations();
    }
  }, [currentProject, filter, searchTerm, currentPage]);

  return (
    <div className={`illustration-history-panel ${className}`}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-2">🖼️</span>
            插畫歷史
          </h2>
          
          {/* 視圖切換 */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            {[
              { type: 'grid' as const, icon: '⊞', label: '網格' },
              { type: 'list' as const, icon: '☰', label: '列表' },
              { type: 'timeline' as const, icon: '⧖', label: '時間軸' }
            ].map(view => (
              <button
                key={view.type}
                onClick={() => setViewMode(view.type)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === view.type
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
                title={view.label}
              >
                {view.icon}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索和篩選 */}
        <div className="mb-6 space-y-4">
          {/* 搜索框 */}
          <div className="flex space-x-3">
            <CosmicInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索插畫標題、描述、角色或標籤..."
              className="flex-1"
            />
            <CosmicButton onClick={clearFilters} variant="secondary">
              清除篩選
            </CosmicButton>
          </div>

          {/* 篩選選項 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 角色篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                角色
              </label>
              <select
                multiple
                value={filter.character_ids || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  updateFilter('character_ids', values);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                size={3}
              >
                {projectCharacters.map(character => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 風格篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                風格
              </label>
              <select
                multiple
                value={filter.style_types || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  updateFilter('style_types', values);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                size={3}
              >
                <option value="動漫人物肖像">動漫人物肖像</option>
                <option value="奇幻場景">奇幻場景</option>
                <option value="漫畫風格">漫畫風格</option>
                <option value="精美插畫">精美插畫</option>
              </select>
            </div>

            {/* 品質範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                品質範圍
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={filter.quality_range?.[0] * 10 || 0}
                  onChange={(e) => {
                    const newRange: [number, number] = [
                      parseFloat(e.target.value) / 10,
                      filter.quality_range?.[1] || 1
                    ];
                    updateFilter('quality_range', newRange);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{(filter.quality_range?.[0] * 10 || 0).toFixed(1)}</span>
                  <span>{(filter.quality_range?.[1] * 10 || 10).toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* 排序 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                排序
              </label>
              <select
                value={filter.sort_by}
                onChange={(e) => updateFilter('sort_by', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
              >
                <option value="created_at">創建時間</option>
                <option value="quality_score">品質分數</option>
                <option value="consistency_score">一致性分數</option>
              </select>
              
              <select
                value={filter.sort_order}
                onChange={(e) => updateFilter('sort_order', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {/* 載入狀態 */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* 插畫展示 */}
        {!isLoading && (
          <>
            {/* 網格視圖 */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                {illustrations.map(item => (
                  <div
                    key={item.id}
                    className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedIllustration(item)}
                  >
                    <div className="aspect-[3/4] bg-gray-700">
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-white text-sm mb-1 truncate">
                        {item.title}
                      </h3>
                      
                      {item.character_name && (
                        <p className="text-xs text-purple-400 mb-1">
                          {item.character_name}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className={getQualityColor(item.metadata.quality_score)}>
                          ★ {item.metadata.quality_score.toFixed(1)}
                        </span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 列表視圖 */}
            {viewMode === 'list' && (
              <div className="space-y-3 mb-6">
                {illustrations.map(item => (
                  <div
                    key={item.id}
                    className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedIllustration(item)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-20 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={item.thumbnail_url || item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-white mb-1">
                              {item.title}
                            </h3>
                            {item.character_name && (
                              <p className="text-sm text-purple-400 mb-1">
                                {item.character_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                          
                          <div className="text-right text-sm">
                            <div className={`font-medium ${getQualityColor(item.metadata.quality_score)}`}>
                              ★ {item.metadata.quality_score.toFixed(1)}
                            </div>
                            <div className="text-gray-400 mt-1">
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="text-xs text-gray-400">
                            {item.style_template} • 耗時 {(item.metadata.generation_time_ms / 1000).toFixed(1)}s
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 時間軸視圖 */}
            {viewMode === 'timeline' && (
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-600"></div>
                  
                  <div className="space-y-6">
                    {illustrations.map(item => (
                      <div key={item.id} className="relative flex items-start space-x-6">
                        <div className="absolute left-3.5 w-2 h-2 bg-purple-500 rounded-full"></div>
                        
                        <div className="ml-8 bg-gray-800 p-4 rounded-lg flex-1 hover:bg-gray-700 transition-colors cursor-pointer"
                             onClick={() => setSelectedIllustration(item)}>
                          <div className="flex items-start space-x-4">
                            <div className="w-20 h-24 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={item.thumbnail_url || item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-white">
                                  {item.title}
                                </h3>
                                <time className="text-sm text-gray-400">
                                  {formatDate(item.created_at)}
                                </time>
                              </div>
                              
                              {item.character_name && (
                                <p className="text-sm text-purple-400 mb-2">
                                  {item.character_name}
                                </p>
                              )}
                              
                              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                                {item.description}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 4).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                
                                <div className={`text-sm ${getQualityColor(item.metadata.quality_score)}`}>
                                  ★ {item.metadata.quality_score.toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 分頁 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <CosmicButton
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                  size="sm"
                >
                  ←
                </CosmicButton>
                
                <span className="text-gray-300 text-sm">
                  頁面 {currentPage} / {totalPages}
                </span>
                
                <CosmicButton
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  size="sm"
                >
                  →
                </CosmicButton>
              </div>
            )}
          </>
        )}

        {/* 空狀態 */}
        {!isLoading && illustrations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-600 mb-4">🖼️</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              沒有找到插畫
            </h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filter.character_ids?.length || filter.style_types?.length
                ? '沒有符合篩選條件的插畫'
                : '還沒有生成任何插畫'}
            </p>
            
            {(searchTerm || filter.character_ids?.length || filter.style_types?.length) && (
              <CosmicButton onClick={clearFilters} variant="secondary">
                清除篩選
              </CosmicButton>
            )}
          </div>
        )}

        {/* 詳情模態框 */}
        {selectedIllustration && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl max-h-full overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {selectedIllustration.title}
                  </h3>
                  <CosmicButton
                    onClick={() => setSelectedIllustration(null)}
                    variant="secondary"
                    size="sm"
                  >
                    ✕
                  </CosmicButton>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 圖像 */}
                  <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={selectedIllustration.image_url}
                      alt={selectedIllustration.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* 詳細信息 */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-300 mb-2">描述</h4>
                      <p className="text-white text-sm">
                        {selectedIllustration.description}
                      </p>
                    </div>
                    
                    {selectedIllustration.character_name && (
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">關聯角色</h4>
                        <p className="text-purple-400 text-sm">
                          {selectedIllustration.character_name}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-300 mb-2">風格模板</h4>
                      <p className="text-white text-sm">
                        {selectedIllustration.style_template}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">品質分數</h4>
                        <p className={`text-lg font-bold ${getQualityColor(selectedIllustration.metadata.quality_score)}`}>
                          ★ {selectedIllustration.metadata.quality_score.toFixed(1)}
                        </p>
                      </div>
                      
                      {selectedIllustration.metadata.consistency_score && (
                        <div>
                          <h4 className="font-medium text-gray-300 mb-2">一致性分數</h4>
                          <p className={`text-lg font-bold ${getQualityColor(selectedIllustration.metadata.consistency_score)}`}>
                            ★ {selectedIllustration.metadata.consistency_score.toFixed(1)}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">生成時間：</span>
                        <span className="text-white">
                          {(selectedIllustration.metadata.generation_time_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">費用：</span>
                        <span className="text-white">
                          ${selectedIllustration.metadata.cost.toFixed(3)}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">種子值：</span>
                        <span className="text-white font-mono">
                          {selectedIllustration.metadata.seed_value}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-gray-400">創建時間：</span>
                        <span className="text-white">
                          {formatDate(selectedIllustration.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-300 mb-2">標籤</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedIllustration.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IllustrationHistoryPanel;