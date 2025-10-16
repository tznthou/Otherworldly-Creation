import React, { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface PersonalityData {
  trait: string;
  score: number;
  fullName: string;
  description: string;
}

interface PersonalityRadarChartProps {
  personality: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  confidence: number;
  className?: string;
}

/**
 * 人格特徵雷達圖組件
 * 使用 Big Five 人格模型展示角色人格特徵
 */
const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = React.memo((props) => {
  const { personality, confidence, className = '' } = props;
  // 使用 useMemo 優化數據計算
  const data: PersonalityData[] = useMemo(() => [
    {
      trait: '開放性',
      score: Math.round(personality.openness * 100),
      fullName: 'Openness to Experience',
      description: '對新體驗、創新想法的接受程度'
    },
    {
      trait: '盡責性',
      score: Math.round(personality.conscientiousness * 100),
      fullName: 'Conscientiousness',
      description: '責任感、組織性和自律程度'
    },
    {
      trait: '外向性',
      score: Math.round(personality.extraversion * 100),
      fullName: 'Extraversion',
      description: '社交活躍度和對外界刺激的反應'
    },
    {
      trait: '親和性',
      score: Math.round(personality.agreeableness * 100),
      fullName: 'Agreeableness',
      description: '合作性、信任他人的傾向'
    },
    {
      trait: '神經質',
      score: Math.round(personality.neuroticism * 100),
      fullName: 'Neuroticism',
      description: '情緒穩定性和對壓力的反應'
    }
  ], [personality]);

  // 優化的自定義提示框
  const CustomTooltip = React.memo(({ active, payload }: { active?: boolean; payload?: Array<{ payload: PersonalityData }> }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    
    const data = payload[0].payload;
    return (
      <div className="bg-bg-dark border border-warm-gold/30 rounded-lg p-3 shadow-lg">
        <p className="text-white text-sm mb-1">
          評分: <span className="text-warm-gold font-medium">{data.score}%</span>
        </p>
        <p className="text-gray-300 text-xs max-w-48 leading-tight">
          {data.description}
        </p>
      </div>
    );
  });

  return (
    <div className={`${className}`}>
      {/* 置信度指示器 */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-warm-gold font-bold text-sm flex items-center">
          <span className="mr-2">🎯</span>
          人格特徵雷達圖
        </h4>
        <div className="flex items-center text-xs">
          <span className="text-gray-400">分析置信度：</span>
          <span className={`ml-1 font-medium ${
            confidence >= 0.8 ? 'text-green-400' :
            confidence >= 0.6 ? 'text-yellow-400' :
            confidence >= 0.4 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {(confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 雷達圖 */}
      <div className="bg-bg-light/50 backdrop-blur-sm/30 rounded-lg p-5">
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid 
              stroke="#374151" 
              strokeOpacity={0.6}
              radialLines={true}
            />
            <PolarAngleAxis 
              dataKey="trait"
              tick={{ 
                fontSize: 12, 
                fill: '#F3F4F6',
                fontWeight: 500
              }}
              className="text-gray-100"
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ 
                fontSize: 10, 
                fill: '#9CA3AF',
                fontWeight: 400
              }}
              tickCount={6}
              tickFormatter={(value) => `${value}%`}
            />
            <Radar
              name="人格特徵"
              dataKey="score"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="#F59E0B"
              fillOpacity={0.2}
              dot={{
                fill: '#F59E0B',
                strokeWidth: 2,
                stroke: '#FBBF24',
                r: 4
              }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 特徵解讀 */}
      <div className="mt-6 grid grid-cols-1 gap-3 text-sm">
        {data.map((item, index) => (
          <div 
            key={index}
            className="flex items-center justify-between bg-bg-dark/80/30 rounded-lg px-4 py-3"
          >
            <span className="text-gray-300 font-medium min-w-0 flex-shrink-0 mr-4">{item.trait}</span>
            <div className="flex items-center space-x-3 flex-1">
              <div className={`w-20 md:w-24 h-2 bg-bg-light rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-300"
                  style={{ width: `${item.score}%` }}
                ></div>
              </div>
              <span className={`font-medium w-10 text-right ${
                item.score >= 70 ? 'text-green-400' :
                item.score >= 50 ? 'text-yellow-400' :
                item.score >= 30 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {item.score}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 總體評估 */}
      <div className="mt-6 p-4 bg-bg-dark/80/20 rounded-lg border border-gold-600/20">
        <div className="flex items-center mb-3">
          <span className="text-warm-gold text-base font-medium">📋 人格總結</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          {getPersonalitySummary(data)}
        </p>
      </div>
    </div>
  );
});

// 設置組件顯示名稱
PersonalityRadarChart.displayName = 'PersonalityRadarChart';

/**
 * 基於人格特徵生成總結
 */
function getPersonalitySummary(data: PersonalityData[]): string {
  const traits = data.reduce((acc, item) => {
    acc[item.trait] = item.score;
    return acc;
  }, {} as Record<string, number>);

  const dominant = Object.entries(traits).reduce((a, b) => 
    traits[a[0]] > traits[b[0]] ? a : b
  );
  
  const secondary = Object.entries(traits)
    .filter(([trait]) => trait !== dominant[0])
    .reduce((a, b) => traits[a[0]] > traits[b[0]] ? a : b);

  const summaries: Record<string, string[]> = {
    '開放性': ['富有創造力和想像力', '喜歡探索新事物', '思維開放靈活'],
    '盡責性': ['有責任感和組織能力', '做事認真細心', '自律性強'],
    '外向性': ['活潑外向善於交際', '精力充沛', '樂於表達自己'],
    '親和性': ['善良友好', '樂於助人', '重視和諧關係'],
    '神經質': ['情感豐富敏感', '容易受環境影響', '內心世界複雜']
  };

  const dominantDesc = summaries[dominant[0]]?.[0] || '特徵明顯';
  const secondaryDesc = summaries[secondary[0]]?.[1] || '表現突出';
  
  return `這個角色主要表現為${dominantDesc}，同時${secondaryDesc}。整體人格特徵呈現${dominant[1] >= 70 ? '強烈' : dominant[1] >= 50 ? '中等' : '溫和'}的${dominant[0]}傾向。`;
}

export default PersonalityRadarChart;

// 開發環境性能監控（暫時註解避免模組載入錯誤）
// if (process.env.NODE_ENV === 'development') {
//   import('../../utils/reactScan').then(({ monitorComponent }) => {
//     monitorComponent(PersonalityRadarChart, 'PersonalityRadarChart');
//   });
// }