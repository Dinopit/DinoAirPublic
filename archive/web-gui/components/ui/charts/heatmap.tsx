'use client';

import React from 'react';

interface IHeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface IHeatmapProps {
  data: IHeatmapData[];
  title?: string;
  width?: number;
  height?: number;
  xLabels?: string[];
  yLabels?: string[];
  colorScale?: string[];
  showValues?: boolean;
  cellSize?: number;
}

const defaultColorScale = [
  '#f0f9ff', // lightest blue
  '#e0f2fe',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#0369a1',
  '#075985', // darkest blue
];

export function Heatmap({
  data,
  title,
  width = 600,
  height = 400,
  xLabels = [],
  yLabels = [],
  colorScale = defaultColorScale,
  showValues = true,
  cellSize = 40,
}: IHeatmapProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const maxValue = Math.max(...data.map((d: IHeatmapData) => d.value));
  const minValue = Math.min(...data.map((d: IHeatmapData) => d.value));

  const getColor = (value: number) => {
    if (maxValue === minValue) return colorScale[0];
    const normalized = (value - minValue) / (maxValue - minValue);
    const index = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[Math.min(index, colorScale.length - 1)];
  };

  const maxX = Math.max(...data.map((d: IHeatmapData) => d.x));
  const maxY = Math.max(...data.map((d: IHeatmapData) => d.y));

  const adjustedCellSize = isMobile ? Math.min(cellSize, 30) : cellSize;
  const actualWidth = Math.max(isMobile ? 350 : width, (maxX + 1) * adjustedCellSize + 100);
  const actualHeight = Math.max(isMobile ? 300 : height, (maxY + 1) * adjustedCellSize + 100);

  return (
    <div className="heatmap-container w-full">
      {title && (
        <h3 className={`font-semibold mb-4 text-center ${isMobile ? 'text-base' : 'text-lg'}`}>
          {title}
        </h3>
      )}

      <div className="relative overflow-x-auto">
        <svg
          width={actualWidth}
          height={actualHeight}
          className="border rounded min-w-full"
          viewBox={isMobile ? `0 0 ${actualWidth} ${actualHeight}` : undefined}
        >
          {yLabels.map((label, index) => (
            <text
              key={`y-${index}`}
              x={40}
              y={60 + index * adjustedCellSize + adjustedCellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className={`fill-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}
              fontSize={isMobile ? '10' : '12'}
            >
              {label}
            </text>
          ))}

          {xLabels.map((label, index) => (
            <text
              key={`x-${index}`}
              x={50 + index * adjustedCellSize + adjustedCellSize / 2}
              y={40}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`fill-gray-600 ${isMobile ? 'text-xs' : 'text-xs'}`}
              fontSize={isMobile ? '10' : '12'}
              transform={`rotate(-45, ${50 + index * adjustedCellSize + adjustedCellSize / 2}, 40)`}
            >
              {label}
            </text>
          ))}

          {data.map((point, index) => (
            <g key={index}>
              <rect
                x={50 + point.x * adjustedCellSize}
                y={50 + point.y * adjustedCellSize}
                width={adjustedCellSize - 1}
                height={adjustedCellSize - 1}
                fill={getColor(point.value)}
                stroke="#fff"
                strokeWidth={1}
                className="hover:stroke-gray-400 hover:stroke-2 cursor-pointer"
              >
                <title>
                  {point.label ?? `(${point.x}, ${point.y})`}: {point.value}
                </title>
              </rect>

              {showValues && (
                <text
                  x={50 + point.x * adjustedCellSize + adjustedCellSize / 2}
                  y={50 + point.y * adjustedCellSize + adjustedCellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-800 pointer-events-none"
                  style={{
                    fontSize: Math.min(adjustedCellSize / 4, isMobile ? 10 : 12),
                  }}
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}
        </svg>

        <div
          className={`mt-4 flex items-center justify-center space-x-2 ${isMobile ? 'text-xs' : ''}`}
        >
          <span className="text-xs text-gray-600">{minValue}</span>
          <div className="flex">
            {colorScale.map((color, index) => (
              <div
                key={index}
                className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">{maxValue}</span>
        </div>
      </div>
    </div>
  );
}
