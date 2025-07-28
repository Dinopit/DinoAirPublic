'use client';

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface IPieChartData {
  label: string;
  value: number;
  color?: string;
}

interface IPieChartProps {
  data: IPieChartData[];
  title?: string;
  height?: number;
  variant?: 'pie' | 'doughnut';
  showLegend?: boolean;
  showPercentages?: boolean;
  colors?: string[];
}

const defaultColors = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#ec4899',
  '#6366f1',
];

export function PieChart({
  data,
  title,
  height = 300,
  variant = 'pie',
  showLegend = true,
  showPercentages = true,
  colors = defaultColors,
}: IPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const chartData = {
    labels: data.map((item: IPieChartData) => item.label),
    datasets: [
      {
        data: data.map((item: IPieChartData) => item.value),
        backgroundColor: data.map(
          (item: IPieChartData, index: number) => item.color ?? colors[index % colors.length]
        ),
        borderColor: data.map(
          (item: IPieChartData, index: number) => item.color ?? colors[index % colors.length]
        ),
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: isMobile ? ('bottom' as const) : ('right' as const),
        labels: {
          padding: isMobile ? 10 : 20,
          boxWidth: isMobile ? 12 : 16,
          font: {
            size: isMobile ? 10 : 12,
          },
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: showPercentages ? `${label} (${percentage}%)` : label,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
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
        padding: {
          bottom: isMobile ? 10 : 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderWidth: 1,
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
        callbacks: {
          label: (context: any) => {
            const label = context.label ?? '';
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const ChartComponent = variant === 'doughnut' ? Doughnut : Pie;

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}
