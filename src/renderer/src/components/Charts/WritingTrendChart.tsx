import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 註冊 Chart.js 組件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WritingSession {
  date: string;
  wordsWritten: number;
  timeSpent: number;
  chaptersWorked: number;
}

interface WritingTrendChartProps {
  data: WritingSession[];
  type?: 'words' | 'time';
  className?: string;
}

const WritingTrendChart: React.FC<WritingTrendChartProps> = ({
  data,
  type = 'words',
  className = ''
}) => {
  const chartData = {
    labels: data.map(session => session.date),
    datasets: [
      {
        label: type === 'words' ? '字數' : '寫作時間(分鐘)',
        data: data.map(session => type === 'words' ? session.wordsWritten : session.timeSpent),
        fill: true,
        backgroundColor: 'rgba(255, 215, 0, 0.1)', // 金色半透明
        borderColor: 'rgba(255, 215, 0, 0.8)', // 金色
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 215, 0, 1)',
        pointBorderColor: 'rgba(30, 41, 59, 1)', // cosmic-800
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4, // 平滑曲線
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            family: 'ui-sans-serif, system-ui, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)', // cosmic-800
        titleColor: 'rgba(255, 215, 0, 1)', // gold
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: { parsed: { y: number } }) {
            const value = context.parsed.y;
            if (type === 'words') {
              return `寫作字數: ${value.toLocaleString()} 字`;
            } else {
              const hours = Math.floor(value / 60);
              const minutes = value % 60;
              return `寫作時間: ${hours > 0 ? `${hours}小時` : ''}${minutes}分鐘`;
            }
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
          maxTicksLimit: 7, // 限制標籤數量
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
          callback: function(value: number | string) {
            if (type === 'words') {
              return `${value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}`;
            } else {
              return `${value}min`;
            }
          }
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
      },
    },
  };

  return (
    <div className={`relative ${className}`}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default WritingTrendChart;