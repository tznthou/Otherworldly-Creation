import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ConsistencyData {
  category: string;
  score: number;
  fullName: string;
  description: string;
  issues?: string[];
}

interface ConsistencyScoreChartProps {
  behaviorConsistency: number;
  consistencyDetails?: {
    personality: number;
    speech: number;
    behavior: number;
    emotion: number;
    relationship: number;
  };
  issues?: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    chapters: string[];
  }>;
  className?: string;
}

/**
 * 一致性評分圖表組件
 * 展示角色在不同方面的一致性評分和問題標記
 */
const ConsistencyScoreChart: React.FC<ConsistencyScoreChartProps> = ({
  behaviorConsistency,
  consistencyDetails = {
    personality: 0.85,
    speech: 0.78,
    behavior: 0.82,
    emotion: 0.75,
    relationship: 0.88
  },
  issues = [],
  className = ''
}) => {
  // 轉換一致性數據為圖表格式
  const data: ConsistencyData[] = [
    {
      category: '人格',
      score: Math.round(consistencyDetails.personality * 100),
      fullName: '人格一致性',
      description: '角色核心價值觀和性格特徵的前後一致性',
      issues: issues.filter(i => i.category === 'personality').map(i => i.description)
    },
    {
      category: '言語',
      score: Math.round(consistencyDetails.speech * 100),
      fullName: '言語風格一致性',
      description: '說話方式、用詞習慣、語氣的一致性',
      issues: issues.filter(i => i.category === 'speech').map(i => i.description)
    },
    {
      category: '行為',
      score: Math.round(consistencyDetails.behavior * 100),
      fullName: '行為模式一致性',
      description: '行動選擇、反應模式的一致性',
      issues: issues.filter(i => i.category === 'behavior').map(i => i.description)
    },
    {
      category: '情感',
      score: Math.round(consistencyDetails.emotion * 100),
      fullName: '情感表達一致性',
      description: '情緒反應、情感表達方式的一致性',
      issues: issues.filter(i => i.category === 'emotion').map(i => i.description)
    },
    {
      category: '關係',
      score: Math.round(consistencyDetails.relationship * 100),
      fullName: '人際關係一致性',
      description: '與其他角色互動方式的一致性',
      issues: issues.filter(i => i.category === 'relationship').map(i => i.description)
    }
  ];

  // 獲取評分對應的顏色
  const getScoreColor = (score: number) => {
    if (score >= 85) return '#10B981'; // green-500
    if (score >= 70) return '#F59E0B'; // yellow-500  
    if (score >= 55) return '#F97316'; // orange-500
    return '#EF4444'; // red-500
  };

  // 自定義提示框
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ConsistencyData }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-cosmic-900 border border-gold-600/30 rounded-lg p-3 shadow-lg max-w-64">
          <p className="text-gold-400 font-bold text-sm">{data.fullName}</p>
          <p className="text-white text-sm mb-2">
            評分: <span className="text-gold-300 font-medium">{data.score}%</span>
          </p>
          <p className="text-gray-300 text-xs mb-2 leading-tight">
            {data.description}
          </p>
          {data.issues && data.issues.length > 0 && (
            <div>
              <p className="text-red-400 text-xs font-medium mb-1">發現問題:</p>
              {data.issues.slice(0, 2).map((issue: string, idx: number) => (
                <p key={idx} className="text-red-300 text-xs">• {issue}</p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // 計算總體評估
  const overallScore = Math.round(behaviorConsistency * 100);
  const totalIssues = issues.length;
  const criticalIssues = issues.filter(i => i.severity === 'high').length;

  return (
    <div className={`${className}`}>
      {/* 標題和總體指標 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-gold-400 font-bold text-sm flex items-center">
            <span className="mr-2">📈</span>
            一致性分析圖表
          </h4>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <span className="text-gray-400">總體評分：</span>
              <span className={`ml-1 font-medium ${
                overallScore >= 85 ? 'text-green-400' :
                overallScore >= 70 ? 'text-yellow-400' :
                overallScore >= 55 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {overallScore}%
              </span>
            </div>
            {totalIssues > 0 && (
              <div className="flex items-center">
                <span className="text-gray-400">發現問題：</span>
                <span className={`ml-1 font-medium ${
                  criticalIssues > 0 ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {totalIssues}個
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 一致性評分條形圖 */}
      <div className="bg-cosmic-800/30 rounded-lg p-5 mb-6">
        <h5 className="text-gold-300 font-medium text-sm mb-4 flex items-center">
          <span className="mr-2">📊</span>
          各維度一致性評分
        </h5>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
            <XAxis 
              dataKey="category"
              tick={{ fontSize: 12, fill: '#F3F4F6' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#6B7280' }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="score" 
              radius={[4, 4, 0, 0]}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 問題標記列表 */}
      {issues.length > 0 && (
        <div className="bg-cosmic-800/30 rounded-lg p-5 mb-6">
          <h5 className="text-gold-300 font-medium text-sm mb-4 flex items-center">
            <span className="mr-2">⚠️</span>
            發現的一致性問題
          </h5>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {issues.map((issue, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  issue.severity === 'high' ? 'bg-red-900/20 border-red-500' :
                  issue.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                  'bg-blue-900/20 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    issue.severity === 'high' ? 'text-red-400' :
                    issue.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {issue.category === 'personality' ? '人格問題' :
                     issue.category === 'speech' ? '言語問題' :
                     issue.category === 'behavior' ? '行為問題' :
                     issue.category === 'emotion' ? '情感問題' :
                     '關係問題'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    issue.severity === 'high' ? 'bg-red-600 text-white' :
                    issue.severity === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {issue.severity === 'high' ? '嚴重' :
                     issue.severity === 'medium' ? '中等' : '輕微'}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {issue.description}
                </p>
                <div className="flex items-center text-xs text-gray-400 pt-2 border-t border-cosmic-600/30">
                  <span className="mr-2">📍 涉及章節：</span>
                  <span>{issue.chapters.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 總體評估和建議 */}
      <div className="p-5 bg-cosmic-700/20 rounded-lg border border-gold-600/20">
        <div className="flex items-center mb-3">
          <span className="text-gold-400 text-base font-medium">📋 一致性總評</span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">整體評級：</span>
            <span className={`font-medium text-lg ${
              overallScore >= 85 ? 'text-green-400' :
              overallScore >= 70 ? 'text-yellow-400' :
              overallScore >= 55 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {overallScore >= 85 ? '優秀' :
               overallScore >= 70 ? '良好' :
               overallScore >= 55 ? '尚可' : '需改善'}
            </span>
          </div>
          <p className="text-gray-300 leading-relaxed">
            {overallScore >= 85 ? 
              '角色表現出色的一致性，人物塑造連貫完整，讀者容易建立穩定的角色印象。' :
            overallScore >= 70 ?
              '角色整體一致性良好，偶有小幅度變化，但不影響整體人物形象。' :
            overallScore >= 55 ?
              '角色一致性有待改善，存在一些前後不一致的表現，建議重點關注問題區域。' :
              '角色一致性存在較嚴重問題，建議系統性檢查並修正人物設定和表現。'
            }
          </p>
          {totalIssues > 0 && (
            <div className="mt-2 pt-2 border-t border-cosmic-600">
              <p className="text-gray-400 mb-1">
                改進建議：優先處理 <span className="text-red-400 font-medium">{criticalIssues}</span> 個嚴重問題
              </p>
              <p className="text-gray-300 text-xs leading-relaxed">
                檢查角色設定文檔，確保核心特徵在所有章節中保持一致。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsistencyScoreChart;