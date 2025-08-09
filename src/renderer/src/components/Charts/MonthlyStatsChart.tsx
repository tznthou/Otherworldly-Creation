import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// 註冊 Chart.js 組件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyStats {
  month: string;
  wordsWritten: number;
  chaptersCompleted: number;
  timeSpent: number;
}

interface MonthlyStatsChartProps {
  data: MonthlyStats[];
  className?: string;
}

const MonthlyStatsChart: React.FC<MonthlyStatsChartProps> = ({
  data,
  className = ''
}) => {
  const chartData = {
    labels: data.map(stat => stat.month),
    datasets: [
      {
        label: '字數',
        data: data.map(stat => stat.wordsWritten),
        backgroundColor: 'rgba(255, 215, 0, 0.8)', // 金色
        borderColor: 'rgba(255, 215, 0, 1)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        yAxisID: 'y',
      },
      {
        label: '章節數',
        data: data.map(stat => stat.chaptersCompleted),
        backgroundColor: 'rgba(99, 102, 241, 0.8)', // 紫色
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            family: 'ui-sans-serif, system-ui, sans-serif',
            size: 12,
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)', // cosmic-800
        titleColor: 'rgba(255, 215, 0, 1)', // gold
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          afterBody: function(context: { dataIndex: number }[]) {
            const index = context[0].dataIndex;
            const stat = data[index];
            const hours = Math.floor(stat.timeSpent / 60);
            const minutes = stat.timeSpent % 60;
            return [`寫作時間: ${hours > 0 ? `${hours}小時` : ''}${minutes}分鐘`];
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 215, 0, 0.8)',
          font: {
            size: 11,
          },
          callback: function(value: number | string) {
            return `${value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}`;
          }
        },
        title: {
          display: true,
          text: '字數',
          color: 'rgba(255, 215, 0, 0.8)',
          font: {
            size: 12,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgba(99, 102, 241, 0.8)',
          font: {
            size: 11,
          },
        },
        title: {
          display: true,
          text: '章節數',
          color: 'rgba(99, 102, 241, 0.8)',
          font: {
            size: 12,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className={`relative ${className}`}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default MonthlyStatsChart;