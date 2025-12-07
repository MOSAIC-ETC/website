"use client";

import type React from "react";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

// Colormaps
type Colormap = [number, number, number][];

const colormaps = {
  viridis: [
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
  ],
  plasma: [
    [13, 8, 135],
    [75, 3, 161],
    [125, 3, 168],
    [168, 34, 150],
    [203, 70, 121],
    [229, 107, 93],
    [248, 148, 65],
    [253, 195, 40],
    [240, 249, 33],
  ],
  inferno: [
    [0, 0, 4],
    [31, 12, 72],
    [85, 15, 109],
    [136, 34, 106],
    [186, 54, 85],
    [227, 89, 51],
    [249, 140, 10],
    [252, 201, 27],
    [240, 249, 33],
  ],
  magma: [
    [0, 0, 3],
    [28, 16, 68],
    [79, 18, 123],
    [129, 37, 129],
    [181, 54, 112],
    [229, 89, 77],
    [251, 140, 41],
    [254, 201, 54],
    [240, 249, 33],
  ],
};

function interpolateColormap(t: number, colormap: Colormap): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const idx = clampedT * (colormap.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const frac = idx - lower;

  const r = Math.round(colormap[lower][0] * (1 - frac) + colormap[upper][0] * frac);
  const g = Math.round(colormap[lower][1] * (1 - frac) + colormap[upper][1] * frac);
  const b = Math.round(colormap[lower][2] * (1 - frac) + colormap[upper][2] * frac);

  return `rgb(${r}, ${g}, ${b})`;
}

export interface HeatmapCellData {
  x: number;
  y: number;
  value: number;
  color: string;
}

export interface HeatmapSelection {
  /** Start X coordinate (row) */
  startX: number;
  /** Start Y coordinate (column) */
  startY: number;
  /** End X coordinate (row) */
  endX: number;
  /** End Y coordinate (column) */
  endY: number;
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
  /** Current selection (controlled) */
  selection?: HeatmapSelection | null;
  /** Callback when selection changes */
  onSelectionChange?: (selection: HeatmapSelection | null) => void;
  /** Colormap to use for the heatmap */
  colormap?: Colormap | keyof typeof colormaps;
} & React.HTMLAttributes<HTMLDivElement>;

export function Heatmap({
  values,
  width = 500,
  height = 450,
  title,
  xLabel = "X",
  yLabel = "Y",
  showAxes = true,
  tooltip = true,
  renderTooltip,
  selection,
  onSelectionChange,
  colormap = "viridis",
  className,
  ...props
}: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<HeatmapCellData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [internalSelection, setInternalSelection] = useState<HeatmapSelection | null>(null);
  const { resolvedTheme } = useTheme();

  const selectedColormap = (colormap instanceof Array ? colormap : colormaps[colormap]) as Colormap;

  // Use controlled selection if provided, otherwise use internal state
  const currentSelection = selection !== undefined ? selection : internalSelection;
  const setCurrentSelection = (sel: HeatmapSelection | null) => {
    if (onSelectionChange) {
      onSelectionChange(sel);
    }
    if (selection === undefined) {
      setInternalSelection(sel);
    }
  };

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
    (highlightCell?: { x: number; y: number } | null, selectionRect?: HeatmapSelection | null) => {
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
          ctx.fillStyle = interpolateColormap(normalizedValue, selectedColormap);
          const x = margin.left + col * cellWidth;
          const y = margin.top + (numRows - 1 - row) * cellHeight;
          ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
        }
      }

      if (selectionRect) {
        const minX = Math.min(selectionRect.startX, selectionRect.endX);
        const maxX = Math.max(selectionRect.startX, selectionRect.endX);
        const minY = Math.min(selectionRect.startY, selectionRect.endY);
        const maxY = Math.max(selectionRect.startY, selectionRect.endY);

        const selX = margin.left + minY * cellWidth;
        const selY = margin.top + (numRows - 1 - maxX) * cellHeight;
        const selW = (maxY - minY + 1) * cellWidth;
        const selH = (maxX - minX + 1) * cellHeight;

        // Draw dark overlay outside the selection
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(margin.left, margin.top, plotWidth, selY - margin.top);
        ctx.fillRect(margin.left, selY + selH, plotWidth, margin.top + plotHeight - (selY + selH));
        ctx.fillRect(margin.left, selY, selX - margin.left, selH);
        ctx.fillRect(selX + selW, selY, margin.left + plotWidth - (selX + selW), selH);

        // Draw white border around selection
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(selX, selY, selW, selH);
      }

      // Draw highlight border on hovered cell (only if not selecting)
      if (highlightCell && !selectionRect) {
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
        ctx.fillStyle = interpolateColormap(t, selectedColormap);
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
    drawHeatmap(hoveredCell, currentSelection);
  }, [drawHeatmap, hoveredCell, currentSelection]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      drawHeatmap(hoveredCell, currentSelection);
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme, drawHeatmap, hoveredCell, currentSelection]);

  const getCellFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || numRows === 0 || numCols === 0) return null;

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

      return {
        x: Math.max(0, Math.min(numRows - 1, row)),
        y: Math.max(0, Math.min(numCols - 1, col)),
      };
    }
    return null;
  };

  const getCellFromTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || numRows === 0 || numCols === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return null;

    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    if (
      touchX >= margin.left &&
      touchX <= margin.left + plotWidth &&
      touchY >= margin.top &&
      touchY <= margin.top + plotHeight
    ) {
      const cellWidth = plotWidth / numCols;
      const cellHeight = plotHeight / numRows;

      const col = Math.floor((touchX - margin.left) / cellWidth);
      const row = numRows - 1 - Math.floor((touchY - margin.top) / cellHeight);

      return {
        x: Math.max(0, Math.min(numRows - 1, row)),
        y: Math.max(0, Math.min(numCols - 1, col)),
      };
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromMouse(e);

    if (isSelecting && selectionStart && cell) {
      setCurrentSelection({
        startX: selectionStart.x,
        startY: selectionStart.y,
        endX: cell.x,
        endY: cell.y,
      });
    }

    if (cell) {
      const cellValue = values[cell.x]?.[cell.y] ?? 0;
      const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
      const cellColor = interpolateColormap(normalizedValue, selectedColormap);

      setHoveredCell(cell);
      setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
    } else {
      setHoverInfo(null);
      setHoveredCell(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click

    const cell = getCellFromMouse(e);
    if (cell) {
      setIsSelecting(true);
      setSelectionStart(cell);
      setCurrentSelection({
        startX: cell.x,
        startY: cell.y,
        endX: cell.x,
        endY: cell.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsSelecting(false);
      setSelectionStart(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setCurrentSelection(null);
    setIsSelecting(false);
    setSelectionStart(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const cell = getCellFromTouch(e);
    if (cell) {
      e.preventDefault(); // Prevent scrolling when starting selection
      setIsSelecting(true);
      setSelectionStart(cell);
      setCurrentSelection({
        startX: cell.x,
        startY: cell.y,
        endX: cell.x,
        endY: cell.y,
      });

      const cellValue = values[cell.x]?.[cell.y] ?? 0;
      const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
      const cellColor = interpolateColormap(normalizedValue, selectedColormap);
      setHoveredCell(cell);
      setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const cell = getCellFromTouch(e);

    if (isSelecting && selectionStart && cell) {
      e.preventDefault(); // Prevent scrolling during selection
      setCurrentSelection({
        startX: selectionStart.x,
        startY: selectionStart.y,
        endX: cell.x,
        endY: cell.y,
      });
    }

    if (cell) {
      const cellValue = values[cell.x]?.[cell.y] ?? 0;
      const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
      const cellColor = interpolateColormap(normalizedValue, selectedColormap);
      setHoveredCell(cell);
      setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
    }
  };

  const handleTouchEnd = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setHoverInfo(null);
    setHoveredCell(null);
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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {
          setHoverInfo(null);
          setHoveredCell(null);
          if (isSelecting) {
            setIsSelecting(false);
            setSelectionStart(null);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ cursor: isSelecting ? "crosshair" : "default", touchAction: "none" }}
      />
      {hoverInfo && tooltip && !isSelecting && (
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
