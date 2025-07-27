'use client';

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export function BarChart({
  data,
  title,
  color = '#3b82f6',
  height = 300,
  horizontal = false,
  showGrid = true,
  showLegend = false,
  yAxisLabel,
  xAxisLabel,
}: BarChartProps) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: title || 'Data',
        data: data.map((item) => item.value),
        backgroundColor: data.map((item) => item.color || `${color}80`),
        borderColor: data.map((item) => item.color || color),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? ('y' as const) : ('x' as const),
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          boxWidth: isMobile ? 12 : 16,
          font: {
            size: isMobile ? 10 : 12,
          },
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: isMobile ? 14 : 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: color,
        borderWidth: 1,
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel,
          font: {
            size: isMobile ? 10 : 12,
          },
        },
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
          maxRotation: isMobile ? 45 : 0,
        },
        beginAtZero: true,
      },
      y: {
        display: true,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          font: {
            size: isMobile ? 10 : 12,
          },
        },
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div 
      style={{ height: `${height}px` }}
      className="w-full"
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}
