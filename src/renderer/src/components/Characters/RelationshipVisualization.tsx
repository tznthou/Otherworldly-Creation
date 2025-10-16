import React, { useMemo } from 'react';
import { Character } from '../../types/character';

interface RelationshipVisualizationProps {
  characters: Character[];
  onCharacterClick?: (character: Character) => void;
  selectedCharacterId?: string;
}

interface RelationshipNode {
  id: string;
  name: string;
  x: number;
  y: number;
  character: Character;
}

interface RelationshipEdge {
  source: string;
  target: string;
  type: string;
  description: string;
}

export const RelationshipVisualization: React.FC<RelationshipVisualizationProps> = ({
  characters,
  onCharacterClick,
  selectedCharacterId,
}) => {
  const { nodes, edges } = useMemo(() => {
    // 創建節點
    const nodes: RelationshipNode[] = characters.map((character, index) => {
      // 簡單的圓形佈局
      const angle = (index / characters.length) * 2 * Math.PI;
      const radius = Math.min(150, 50 + characters.length * 10);
      const centerX = 200;
      const centerY = 150;
      
      return {
        id: character.id,
        name: character.name,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        character,
      };
    });

    // 創建邊
    const edges: RelationshipEdge[] = [];
    characters.forEach((character) => {
      if (character.relationships) {
        character.relationships.forEach((relationship) => {
          edges.push({
            source: character.id,
            target: relationship.targetId,
            type: relationship.type,
            description: relationship.description,
          });
        });
      }
    });

    return { nodes, edges };
  }, [characters]);

  const getRelationshipColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      '朋友': '#10B981', // green
      '戀人': '#EF4444', // red
      '家人': '#F59E0B', // amber
      '師父': '#8B5CF6', // violet
      '弟子': '#06B6D4', // cyan
      '競爭對手': '#F97316', // orange
      '敵人': '#DC2626', // red-600
      '同事': '#6B7280', // gray
      '上司': '#4F46E5', // indigo
      '下屬': '#84CC16', // lime
      '鄰居': '#14B8A6', // teal
      '同學': '#3B82F6', // blue
    };
    return colorMap[type] || '#6B7280';
  };

  const handleNodeClick = (node: RelationshipNode) => {
    if (onCharacterClick) {
      onCharacterClick(node.character);
    }
  };

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-light/50 backdrop-blur-sm rounded-lg border-2 border-dashed border-warm-gold/10">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <p>沒有角色可以顯示關係圖</p>
        </div>
      </div>
    );
  }

  if (edges.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-light/50 backdrop-blur-sm rounded-lg border-2 border-dashed border-warm-gold/10">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🔗</div>
          <p>尚未建立任何角色關係</p>
          <p className="text-sm mt-1">編輯角色以添加關係</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark rounded-lg border border-warm-gold/10 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-2">角色關係圖</h3>
        <div className="text-sm text-gray-300">
          點擊角色節點查看詳細資訊，線條顏色代表不同的關係類型
        </div>
      </div>

      <div className="relative">
        <svg
          width="400"
          height="300"
          viewBox="0 0 400 300"
          className="w-full h-auto border border-warm-gold/10 rounded"
        >
          {/* 繪製關係線 */}
          {edges.map((edge, index) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;

            const color = getRelationshipColor(edge.type);
            
            return (
              <g key={index}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.7"
                />
                
                {/* 關係標籤 */}
                <text
                  x={(sourceNode.x + targetNode.x) / 2}
                  y={(sourceNode.y + targetNode.y) / 2}
                  fill={color}
                  fontSize="10"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {edge.type}
                </text>
              </g>
            );
          })}

          {/* 繪製角色節點 */}
          {nodes.map((node) => {
            const isSelected = selectedCharacterId === node.id;
            const nodeRadius = 25;
            
            return (
              <g key={node.id}>
                {/* 選中狀態的外圈 */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius + 3}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}
                
                {/* 角色節點 */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius}
                  fill={isSelected ? "#F59E0B" : "#374151"}
                  stroke={isSelected ? "#D97706" : "#6B7280"}
                  strokeWidth="2"
                  className="cursor-pointer hover:fill-blue-100 transition-colors"
                  onClick={() => handleNodeClick(node)}
                />
                
                {/* 角色名稱 */}
                <text
                  x={node.x}
                  y={node.y + 5}
                  fill={isSelected ? "#1F2937" : "white"}
                  fontSize="12"
                  fontWeight="500"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {node.name.length > 6 ? node.name.substring(0, 6) + '...' : node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 圖例 */}
      <div className="mt-4 pt-4 border-t border-warm-gold/10">
        <div className="text-sm font-medium text-gray-300 mb-2">關係類型圖例：</div>
        <div className="flex flex-wrap gap-3">
          {Array.from(new Set(edges.map(e => e.type))).map((type) => (
            <div key={type} className="flex items-center space-x-1">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: getRelationshipColor(type) }}
              />
              <span className="text-xs text-gray-400">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="mt-3 text-xs text-gray-400">
        {characters.length} 個角色，{edges.length} 個關係
      </div>
    </div>
  );
};