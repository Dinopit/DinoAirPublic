'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import React from 'react';
import { Line } from 'react-chartjs-2';

import type { TimeSeriesDataPoint } from '../../../types/analytics';

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

interface LineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  color?: string;
  fill?: boolean;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export function LineChart({
  data,
  title,
  color = '#3b82f6',
  fill = false,
  height = 300,
  showGrid = true,
  showLegend = false,
  yAxisLabel,
  xAxisLabel,
}: LineChartProps) {
  const chartData = {
    labels: data.map((point) => point.label || new Date(point.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: title || 'Data',
        data: data.map((point) => point.value),
        borderColor: color,
        backgroundColor: fill ? `${color}20` : 'transparent',
        fill,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        mode: 'index' as const,
        intersect: false,
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
