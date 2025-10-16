import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';

interface BatchRequest {
  id: string;
  scene_description: string;
  selectedCharacterIds: string[];
  scene_type: 'portrait' | 'scene' | 'interaction';
  style_template: string;
  aspect_ratio: string;
}

interface GenerationControlsProps {
  requests: BatchRequest[];
  onRemoveRequest: (id: string) => void;
  onUpdateRequest: (id: string, field: keyof BatchRequest, value: string | string[]) => void;
}

const GenerationControls: React.FC<GenerationControlsProps> = ({
  requests,
  onRemoveRequest,
  onUpdateRequest,
}) => {
  const { currentProvider } = useSelector((state: RootState) => state.visualCreation);
  const currentProject = useSelector((state: RootState) => state.projects.currentProject);
  const characters = useSelector((state: RootState) => state.characters.characters);
  
  // 獲取項目角色
  const projectCharacters = characters.filter(c => c.projectId === currentProject?.id);
  
  // 獲取角色名稱
  const getCharacterNames = (characterIds: string[]) => {
    return characterIds.map(id => {
      const char = projectCharacters.find(c => c.id === id);
      return char?.name || '未知角色';
    }).join('、');
  };
  
  // 場景類型圖標
  const getSceneTypeIcon = (type: string) => {
    switch (type) {
      case 'portrait': return '👤';
      case 'interaction': return '👥';
      case 'scene': return '🏞️';
      default: return '🎨';
    }
  };
  
  // 場景類型名稱
  const getSceneTypeName = (type: string) => {
    switch (type) {
      case 'portrait': return '肖像';
      case 'interaction': return '互動';
      case 'scene': return '場景';
      default: return '未知';
    }
  };
  
  return (
    <div className="bg-bg-light/50 backdrop-blur-sm/30 rounded-lg p-4 border border-warm-gold/10 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-serif-tc text-warm-gold">📝 生成列表</h3>
        <div className="text-xs text-text-secondary/80">
          {requests.length} 個請求
        </div>
      </div>
      
      {requests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-text-secondary/80 text-sm mb-1">尚未添加任何請求</p>
          <p className="text-text-secondary text-xs">
            選擇角色和場景類型後點擊「添加請求」
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {requests.map((request, index) => (
            <div
              key={request.id}
              className="bg-bg-dark/80/50 border border-warm-gold/10 rounded-lg p-3"
            >
              {/* 請求標題 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-warm-gold font-medium text-sm">
                    #{index + 1}
                  </span>
                  <span className="text-lg">
                    {getSceneTypeIcon(request.scene_type)}
                  </span>
                  <span className="text-text-secondary text-sm">
                    {getSceneTypeName(request.scene_type)}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveRequest(request.id)}
                  className="text-red-400 hover:text-red-300 text-sm p-1 hover:bg-red-900/20 rounded transition-colors"
                  title="刪除請求"
                >
                  🗑️
                </button>
              </div>
              
              {/* 角色資訊 */}
              {request.selectedCharacterIds.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-text-secondary/80 mb-1">角色：</p>
                  <p className="text-sm text-text-secondary/40">
                    {getCharacterNames(request.selectedCharacterIds)}
                  </p>
                </div>
              )}
              
              {/* 場景描述 */}
              <div className="mb-3">
                <p className="text-xs text-text-secondary/80 mb-1">場景描述：</p>
                <textarea
                  value={request.scene_description}
                  onChange={(e) => onUpdateRequest(request.id, 'scene_description', e.target.value)}
                  className="w-full px-2 py-2 bg-bg-light border border-warm-gold/20 rounded text-white placeholder-cosmic-400 text-sm resize-none"
                  rows={3}
                  placeholder="詳細描述想要生成的場景..."
                />
              </div>
              
              {/* 生成設定 */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-text-secondary/80 mb-1">風格模板：</p>
                  <select
                    value={request.style_template}
                    onChange={(e) => onUpdateRequest(request.id, 'style_template', e.target.value)}
                    className="w-full px-2 py-1 bg-bg-light border border-warm-gold/20 rounded text-white text-xs"
                  >
                    <option value="anime-portrait">動漫肖像</option>
                    <option value="fantasy-scene">奇幻場景</option>
                    <option value="realistic-portrait">寫實肖像</option>
                    <option value="watercolor-scene">水彩場景</option>
                    <option value="digital-art">數位藝術</option>
                  </select>
                </div>
                <div>
                  <p className="text-text-secondary/80 mb-1">長寬比：</p>
                  <select
                    value={request.aspect_ratio}
                    onChange={(e) => onUpdateRequest(request.id, 'aspect_ratio', e.target.value)}
                    className="w-full px-2 py-1 bg-bg-light border border-warm-gold/20 rounded text-white text-xs"
                  >
                    <option value="square">正方形 (1:1)</option>
                    <option value="portrait">肖像 (3:4)</option>
                    <option value="landscape">風景 (4:3)</option>
                    <option value="wide">寬屏 (16:9)</option>
                  </select>
                </div>
              </div>
              
              {/* 狀態指示器 */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-text-secondary/80">等待生成</span>
                </div>
                <div className="text-xs text-text-secondary">
                  使用 {currentProvider === 'pollinations' ? 'Pollinations.AI' : 'Google Imagen'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 批次操作提示 */}
      {requests.length > 0 && (
        <div className="mt-4 p-3 bg-warm-gold/10 border border-warm-gold/40 rounded-lg">
          <p className="text-warm-gold text-sm font-medium mb-1">
            🚀 準備生成 {requests.length} 張插畫
          </p>
          <div className="text-xs text-warm-gold space-y-1">
            <p>• 每張圖像大約需要 3-10 秒生成時間</p>
            <p>• 生成完成後可預覽並選擇要保存的圖像</p>
            {currentProvider === 'pollinations' && (
              <p>• 使用免費服務，無額外費用</p>
            )}
            {(currentProvider === 'gemini' || currentProvider === 'openrouter') && (
              <p>• 使用 {currentProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} 服務，請確認已設定 API 金鑰</p>
            )}
          </div>
        </div>
      )}
      
      {/* 使用技巧 */}
      <div className="mt-4 text-xs text-text-secondary">
        <p>💡 <strong>技巧：</strong></p>
        <p>• 場景描述越詳細，生成效果越好</p>
        <p>• 可以描述服裝、表情、背景、氛圍等</p>
        <p>• 避免過於複雜的場景，分開生成效果更佳</p>
      </div>
    </div>
  );
};

export default GenerationControls;