'use client';

import React from 'react';

interface HeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface HeatmapProps {
  data: HeatmapData[];
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
}: HeatmapProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));

  const getColor = (value: number) => {
    if (maxValue === minValue) return colorScale[0];
    const normalized = (value - minValue) / (maxValue - minValue);
    const index = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[Math.min(index, colorScale.length - 1)];
  };

  const maxX = Math.max(...data.map((d) => d.x));
  const maxY = Math.max(...data.map((d) => d.y));

  const actualWidth = Math.max(width, (maxX + 1) * cellSize + 100);
  const actualHeight = Math.max(height, (maxY + 1) * cellSize + 100);

  return (
    <div className="heatmap-container">
      {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}

      <div className="relative">
        <svg width={actualWidth} height={actualHeight} className="border rounded">
          {/* Y-axis labels */}
          {yLabels.map((label, index) => (
            <text
              key={`y-${index}`}
              x={40}
              y={60 + index * cellSize + cellSize / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {label}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, index) => (
            <text
              key={`x-${index}`}
              x={50 + index * cellSize + cellSize / 2}
              y={40}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
              transform={`rotate(-45, ${50 + index * cellSize + cellSize / 2}, 40)`}
            >
              {label}
            </text>
          ))}

          {/* Heatmap cells */}
          {data.map((point, index) => (
            <g key={index}>
              <rect
                x={50 + point.x * cellSize}
                y={50 + point.y * cellSize}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={getColor(point.value)}
                stroke="#fff"
                strokeWidth={1}
                className="hover:stroke-gray-400 hover:stroke-2 cursor-pointer"
              >
                <title>
                  {point.label || `(${point.x}, ${point.y})`}: {point.value}
                </title>
              </rect>

              {showValues && (
                <text
                  x={50 + point.x * cellSize + cellSize / 2}
                  y={50 + point.y * cellSize + cellSize / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-800 pointer-events-none"
                  style={{
                    fontSize: Math.min(cellSize / 4, 12),
                  }}
                >
                  {point.value}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Color scale legend */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <span className="text-xs text-gray-600">{minValue}</span>
          <div className="flex">
            {colorScale.map((color, index) => (
              <div key={index} className="w-4 h-4" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-xs text-gray-600">{maxValue}</span>
        </div>
      </div>
    </div>
  );
}
