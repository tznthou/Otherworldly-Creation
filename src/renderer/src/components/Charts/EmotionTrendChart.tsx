import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface EmotionData {
  chapter: string;
  positive: number;
  negative: number;
  neutral: number;
  intensity: number;
}

interface EmotionTrendChartProps {
  emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotionalIntensity: number;
  chapterEmotions?: EmotionData[]; // 可選的章節情感變化數據
  className?: string;
}

/**
 * 情感分析趨勢圖組件
 * 展示角色的情感色調分佈和強度變化
 */
const EmotionTrendChart: React.FC<EmotionTrendChartProps> = ({
  emotionalTone,
  emotionalIntensity,
  chapterEmotions = [],
  className = ''
}) => {
  // 情感色調配色
  const EMOTION_COLORS = {
    positive: '#10B981', // green-500
    negative: '#EF4444', // red-500
    neutral: '#6B7280',  // gray-500
    mixed: '#F59E0B'     // gold-500
  };

  // 生成情感分佈數據（餅圖用）
  const emotionDistributionData = [
    {
      name: '積極情感',
      value: emotionalTone === 'positive' ? 70 : emotionalTone === 'mixed' ? 30 : 20,
      color: EMOTION_COLORS.positive
    },
    {
      name: '消極情感',
      value: emotionalTone === 'negative' ? 70 : emotionalTone === 'mixed' ? 40 : 15,
      color: EMOTION_COLORS.negative
    },
    {
      name: '中性情感',
      value: emotionalTone === 'neutral' ? 80 : emotionalTone === 'mixed' ? 30 : 65,
      color: EMOTION_COLORS.neutral
    }
  ];

  // 模擬章節情感數據（如果沒有提供）
  const mockChapterData = chapterEmotions.length > 0 ? chapterEmotions : [
    { chapter: '第1章', positive: 60, negative: 20, neutral: 20, intensity: 0.6 },
    { chapter: '第2章', positive: 40, negative: 35, neutral: 25, intensity: 0.7 },
    { chapter: '第3章', positive: 70, negative: 10, neutral: 20, intensity: 0.5 },
    { chapter: '第4章', positive: 30, negative: 50, neutral: 20, intensity: 0.8 },
    { chapter: '第5章', positive: 80, negative: 5, neutral: 15, intensity: 0.4 }
  ];

  // 自定義提示框
  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: Array<{ name: string; value: number; color: string }>; 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-dark border border-warm-gold/30 rounded-lg p-3 shadow-lg">
          <p className="text-warm-gold font-bold text-sm mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-medium">{entry.value}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 餅圖自定義標籤
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { 
    cx?: number; 
    cy?: number; 
    midAngle?: number; 
    innerRadius?: number; 
    outerRadius?: number; 
    percent?: number 
  }) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null;
    if (percent < 0.1) return null; // 小於10%不顯示標籤
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={10}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={`${className}`}>
      {/* 標題和總體情感指標 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-warm-gold font-bold text-sm flex items-center">
            <span className="mr-2">😊</span>
            情感分析圖表
          </h4>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <span className="text-gray-400">主要色調：</span>
              <span 
                className="ml-1 px-2 py-1 rounded text-white font-medium"
                style={{ backgroundColor: EMOTION_COLORS[emotionalTone] || EMOTION_COLORS.mixed }}
              >
                {emotionalTone === 'positive' && '積極'}
                {emotionalTone === 'negative' && '消極'} 
                {emotionalTone === 'neutral' && '中性'}
                {emotionalTone === 'mixed' && '混合'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400">情感強度：</span>
              <span className={`ml-1 font-medium ${
                emotionalIntensity >= 0.8 ? 'text-red-400' :
                emotionalIntensity >= 0.6 ? 'text-orange-400' :
                emotionalIntensity >= 0.4 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(emotionalIntensity * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 情感分佈餅圖 */}
        <div className="bg-bg-light/50 backdrop-blur-sm/30 rounded-lg p-4">
          <h5 className="text-warm-gold font-medium text-xs mb-3 flex items-center">
            <span className="mr-2">🎭</span>
            情感分佈
          </h5>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={emotionDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                stroke="none"
              >
                {emotionDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, '佔比']}
                labelStyle={{ color: '#F59E0B' }}
                contentStyle={{ 
                  backgroundColor: '#1F2937',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{
                  fontSize: '10px',
                  color: '#F3F4F6'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 章節情感趨勢線圖 */}
        <div className="bg-bg-light/50 backdrop-blur-sm/30 rounded-lg p-4">
          <h5 className="text-warm-gold font-medium text-xs mb-3 flex items-center">
            <span className="mr-2">📈</span>
            章節情感趨勢
          </h5>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mockChapterData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
              <XAxis 
                dataKey="chapter"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#6B7280' }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#6B7280' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="positive" 
                stroke={EMOTION_COLORS.positive}
                strokeWidth={2}
                dot={{ fill: EMOTION_COLORS.positive, strokeWidth: 2, r: 3 }}
                name="積極情感"
              />
              <Line 
                type="monotone" 
                dataKey="negative" 
                stroke={EMOTION_COLORS.negative}
                strokeWidth={2}
                dot={{ fill: EMOTION_COLORS.negative, strokeWidth: 2, r: 3 }}
                name="消極情感"
              />
              <Line 
                type="monotone" 
                dataKey="neutral" 
                stroke={EMOTION_COLORS.neutral}
                strokeWidth={2}
                dot={{ fill: EMOTION_COLORS.neutral, strokeWidth: 2, r: 3 }}
                name="中性情感"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 情感強度指示器 */}
      <div className="mt-4 p-3 bg-bg-dark/80/20 rounded-lg border border-gold-600/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-warm-gold text-sm font-medium flex items-center">
            <span className="mr-2">⚡</span>
            情感強度分析
          </span>
          <span className="text-xs text-gray-400">
            {emotionalIntensity >= 0.8 ? '非常強烈' :
             emotionalIntensity >= 0.6 ? '較強' :
             emotionalIntensity >= 0.4 ? '中等' : '溫和'}
          </span>
        </div>
        <div className="w-full h-2 bg-bg-light rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              emotionalIntensity >= 0.8 ? 'bg-gradient-to-r from-red-600 to-red-400' :
              emotionalIntensity >= 0.6 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
              emotionalIntensity >= 0.4 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
              'bg-gradient-to-r from-green-600 to-green-400'
            }`}
            style={{ width: `${emotionalIntensity * 100}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-gray-300 leading-relaxed">
          {emotionalIntensity >= 0.8 ? 
            '角色表現出極強的情感波動，內心世界豐富而激烈，容易被情境深度影響。' :
          emotionalIntensity >= 0.6 ?
            '角色具有較強的情感表達能力，對事物有明確的情感傾向和反應。' :
          emotionalIntensity >= 0.4 ?
            '角色情感表達較為平衡，在不同情境下會有適度的情感變化。' :
            '角色情感表達相對內斂，傾向於保持情緒穩定和理性思考。'
          }
        </div>
      </div>
    </div>
  );
};

export default EmotionTrendChart;

// 開發環境性能監控（暫時註解避免模組載入錯誤）
// if (process.env.NODE_ENV === 'development') {
//   import('../../utils/reactScan').then(({ monitorComponent }) => {
//     monitorComponent(EmotionTrendChart, 'EmotionTrendChart');
//   });
// }