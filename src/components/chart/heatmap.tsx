"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

// Colormaps
const viridisColors = [
  [68, 1, 84],
  [72, 35, 116],
  [64, 67, 135],
  [52, 94, 141],
  [41, 120, 142],
  [32, 144, 140],
  [34, 167, 132],
  [68, 190, 112],
  [121, 209, 81],
  [189, 222, 38],
  [253, 231, 37],
];

function interpolateViridis(t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const idx = clampedT * (viridisColors.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const frac = idx - lower;

  const r = Math.round(viridisColors[lower][0] * (1 - frac) + viridisColors[upper][0] * frac);
  const g = Math.round(viridisColors[lower][1] * (1 - frac) + viridisColors[upper][1] * frac);
  const b = Math.round(viridisColors[lower][2] * (1 - frac) + viridisColors[upper][2] * frac);

  return `rgb(${r}, ${g}, ${b})`;
}

export interface HeatmapCellData {
  x: number;
  y: number;
  value: number;
  color: string;
}

type HeatmapProps = {
  /** 2D array of values (rows x cols) */
  values: number[][];
  /** Width of the canvas in pixels */
  width?: number;
  /** Height of the canvas in pixels */
  height?: number;
  /** Title displayed above the heatmap */
  title?: string;
  /** Label for the X axis */
  xLabel?: string;
  /** Label for the Y axis */
  yLabel?: string;
  /** Whether to show row/column indices (default) or hide axis labels */
  showAxes?: boolean;
  /** Whether to show tooltip on hover (default: true) */
  tooltip?: boolean;
  /** Custom tooltip renderer function. Receives cell data and returns React node */
  renderTooltip?: (data: HeatmapCellData) => ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Heatmap({
  values,
  width = 500,
  height = 450,
  title = "",
  xLabel = "X",
  yLabel = "Y",
  showAxes = true,
  tooltip = true,
  renderTooltip,
  className,
  ...props
}: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<HeatmapCellData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const { resolvedTheme } = useTheme();

  const margin = { top: 50, right: 80, bottom: 50, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Get dimensions from the values array
  const numRows = values.length;
  const numCols = values[0]?.length ?? 0;

  // Calculate max value
  const maxVal = values.reduce((max, row) => {
    return Math.max(max, ...row);
  }, 0);

  const generateColorBarTicks = useCallback((maxValue: number, numTicks = 6): number[] => {
    if (maxValue === 0) return [0];

    const ticks: number[] = [];
    for (let i = 0; i < numTicks; i++) {
      if (i === 0) {
        ticks.push(maxValue);
      } else if (i === numTicks - 1) {
        ticks.push(0);
      } else {
        const rawValue = maxValue * (1 - i / (numTicks - 1));
        ticks.push(Math.round(rawValue));
      }
    }
    return ticks;
  }, []);

  const drawHeatmap = useCallback(
    (highlightCell?: { x: number; y: number } | null) => {
      const canvas = canvasRef.current;
      if (!canvas || numRows === 0 || numCols === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0)";
      ctx.fillRect(0, 0, width, height);

      // Get foreground color from CSS
      const styles = getComputedStyle(document.documentElement);

      const foregroundColor = styles.getPropertyValue("--foreground").trim() || "#000000";
      const mutedForegroundColor =
        styles.getPropertyValue("--muted-foreground").trim() || "#555555";

      // Draw title
      if (title) {
        ctx.fillStyle = foregroundColor;
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(title, width / 2 - 15, 30);
      }

      // Draw heatmap cells
      const cellWidth = plotWidth / numCols;
      const cellHeight = plotHeight / numRows;

      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          const value = values[row][col];
          const normalizedValue = maxVal > 0 ? value / maxVal : 0;
          ctx.fillStyle = interpolateViridis(normalizedValue);
          const x = margin.left + col * cellWidth;
          const y = margin.top + (numRows - 1 - row) * cellHeight;
          ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
        }
      }

      // Draw highlight border on hovered cell
      if (highlightCell) {
        const x = margin.left + highlightCell.y * cellWidth;
        const y = margin.top + (numRows - 1 - highlightCell.x) * cellHeight;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }

      // Draw axes
      ctx.strokeStyle = mutedForegroundColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top);
      ctx.lineTo(margin.left, margin.top + plotHeight);
      ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
      ctx.stroke();

      if (showAxes) {
        ctx.fillStyle = mutedForegroundColor;
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";

        const xTickStep = Math.max(1, Math.floor(numCols / 7));
        for (let i = 0; i < numCols; i += xTickStep) {
          const x = margin.left + (i + 0.5) * cellWidth;
          ctx.beginPath();
          ctx.moveTo(x, margin.top + plotHeight);
          ctx.lineTo(x, margin.top + plotHeight + 5);
          ctx.stroke();
          ctx.fillText(i.toString(), x, margin.top + plotHeight + 18);
        }

        ctx.textAlign = "right";
        const yTickStep = Math.max(1, Math.floor(numRows / 7));
        for (let i = 0; i < numRows; i += yTickStep) {
          const y = margin.top + (numRows - 1 - i + 0.5) * cellHeight;
          ctx.beginPath();
          ctx.moveTo(margin.left, y);
          ctx.lineTo(margin.left - 5, y);
          ctx.stroke();
          ctx.fillText(i.toString(), margin.left - 10, y + 4);
        }
      }

      // Axis titles
      ctx.fillStyle = mutedForegroundColor;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(xLabel, margin.left + plotWidth / 2, height - 10);

      ctx.save();
      ctx.translate(15, margin.top + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();

      // Draw color bar
      const colorBarWidth = 20;
      const colorBarHeight = plotHeight;
      const colorBarX = width - margin.right + 20;
      const colorBarY = margin.top;

      for (let i = 0; i < colorBarHeight; i++) {
        const t = 1 - i / colorBarHeight;
        ctx.fillStyle = interpolateViridis(t);
        ctx.fillRect(colorBarX, colorBarY + i, colorBarWidth, 1);
      }

      // Color bar border
      ctx.strokeStyle = mutedForegroundColor;
      ctx.strokeRect(colorBarX, colorBarY, colorBarWidth, colorBarHeight);

      // Color bar ticks
      ctx.fillStyle = mutedForegroundColor;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      const colorBarTicks = generateColorBarTicks(maxVal, 6);
      colorBarTicks.forEach((tick) => {
        const y =
          maxVal > 0
            ? colorBarY + ((maxVal - tick) / maxVal) * colorBarHeight
            : colorBarY + colorBarHeight;
        if (y >= colorBarY && y <= colorBarY + colorBarHeight) {
          ctx.fillText(tick.toString(), colorBarX + colorBarWidth + 5, y + 4);
        }
      });
    },
    [
      numRows,
      numCols,
      width,
      height,
      margin.left,
      margin.right,
      margin.top,
      plotWidth,
      plotHeight,
      values,
      maxVal,
      title,
      xLabel,
      yLabel,
      showAxes,
      generateColorBarTicks,
    ]
  );

  useEffect(() => {
    drawHeatmap(hoveredCell);
  }, [drawHeatmap, hoveredCell]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      drawHeatmap(hoveredCell);
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme, drawHeatmap, hoveredCell]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || numRows === 0 || numCols === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
      mouseX >= margin.left &&
      mouseX <= margin.left + plotWidth &&
      mouseY >= margin.top &&
      mouseY <= margin.top + plotHeight
    ) {
      const cellWidth = plotWidth / numCols;
      const cellHeight = plotHeight / numRows;

      const col = Math.floor((mouseX - margin.left) / cellWidth);
      const row = numRows - 1 - Math.floor((mouseY - margin.top) / cellHeight);

      const clampedCol = Math.max(0, Math.min(numCols - 1, col));
      const clampedRow = Math.max(0, Math.min(numRows - 1, row));

      const cellValue = values[clampedRow]?.[clampedCol] ?? 0;
      const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
      const cellColor = interpolateViridis(normalizedValue);

      setHoveredCell({ x: clampedRow, y: clampedCol });
      setHoverInfo({ x: clampedRow, y: clampedCol, value: cellValue, color: cellColor });
    } else {
      setHoverInfo(null);
      setHoveredCell(null);
    }
  };

  const getTooltipPosition = () => {
    if (!hoveredCell || !canvasRef.current || numRows === 0 || numCols === 0)
      return { left: 0, top: 0 };

    const cellWidth = plotWidth / numCols;
    const cellHeight = plotHeight / numRows;
    const x = margin.left + hoveredCell.y * cellWidth + cellWidth / 2;
    const y = margin.top + (numRows - 1 - hoveredCell.x) * cellHeight;

    return { left: x, top: y - 10 };
  };

  const tooltipPos = getTooltipPosition();

  return (
    <div className={cn("inline-block relative", className)} {...props}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoverInfo(null);
          setHoveredCell(null);
        }}
      />
      {hoverInfo && tooltip && (
        <div
          className={
            "absolute bg-card shadow-2xl px-2.5 py-1.5 rounded font-mono text-card-foreground text-xs -translate-x-1/2 -translate-y-full pointer-events-none"
          }
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          {renderTooltip ? (
            renderTooltip(hoverInfo)
          ) : (
            <>
              <p>
                x: {hoverInfo.x}, y: {hoverInfo.y}
              </p>
              <div className="flex items-center mt-2 min-w-[100px]">
                <div
                  style={{ backgroundColor: hoverInfo.color }}
                  className="inline-block mr-2 w-3 h-3"
                />
                <p className="mr-auto pr-5 text-muted-foreground">Value</p>
                <span>{hoverInfo.value}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
