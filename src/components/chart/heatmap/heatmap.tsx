"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

import { getColormap, interpolateColormap } from "./colormaps";
import { HeatmapSelectionContext } from "./context";
import { drawHeatmap } from "./draw";
import type { Colormap, ContrastBias, HeatmapCellData, HeatmapPolygon, HeatmapProps, HeatmapRect } from "./types";
import { cellsSetToCoordinates, getCellsInPolygon, getCellsInRectangle, getVertexAtPosition } from "./utils";

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
  colormap = "viridis",
  selectable = false,
  className,
  ...props
}: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  const heatmapContext = useContext(HeatmapSelectionContext);
  const selectionMode = heatmapContext?.selectionMode ?? "rectangle";

  // Memoize stable values to prevent unnecessary callback/draw invalidation
  const margin = useMemo(() => ({ top: title ? 50 : 20, right: 80, bottom: 50, left: 50 }), [title]);
  const selectedColormap = useMemo(() => getColormap(colormap) as Colormap, [colormap]);
  const maxVal = useMemo(() => values.reduce((max, row) => Math.max(max, ...row), 0), [values]);

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const numRows = values.length;
  const numCols = values[0]?.length ?? 0;

  // Tooltip state (triggers React re-renders for DOM tooltip updates only)
  const [hoverInfo, setHoverInfo] = useState<HeatmapCellData | null>(null);
  const [hoveredCellPos, setHoveredCellPos] = useState<{ x: number; y: number } | null>(null);

  // Refs for rapidly-changing visual state — update canvas directly, no React re-renders
  const rectSelRef = useRef<HeatmapRect | null>(null);
  const polySelRef = useRef<HeatmapPolygon | null>(null);
  const hoveredCellRef = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingVertexRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  // Contrast & bias refs for real-time right-click drag adjustment
  const contrastBiasRef = useRef<ContrastBias>(heatmapContext?.contrastBias ?? { contrast: 1.0, bias: 0.5 });
  const isAdjustingCBRef = useRef(false);
  const cbDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cbStartValuesRef = useRef<ContrastBias>({ contrast: 1.0, bias: 0.5 });

  // Draw canvas from current ref values
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || numRows === 0 || numCols === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawHeatmap({
      ctx,
      values,
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      numRows,
      numCols,
      maxVal,
      colormap: selectedColormap,
      title,
      xLabel,
      yLabel,
      showAxes,
      highlightCell: isAdjustingCBRef.current ? null : hoveredCellRef.current,
      selectionRect: selectionMode === "rectangle" ? rectSelRef.current : null,
      polygonSel: selectionMode === "polygon" ? polySelRef.current : null,
      preview: previewRef.current,
      contrastBias: contrastBiasRef.current,
    });
  }, [
    values,
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    numRows,
    numCols,
    maxVal,
    selectedColormap,
    title,
    xLabel,
    yLabel,
    showAxes,
    selectionMode,
  ]);

  // Coalesce multiple calls per frame into a single redraw
  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redraw);
  }, [redraw]);

  // Redraw on data/prop/theme changes
  useEffect(() => {
    scheduleRedraw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [scheduleRedraw, resolvedTheme]);

  // Commit selection to context (only on mouseUp / polygon close — not every mouse move)
  const commitSelection = useCallback(() => {
    if (!heatmapContext?.setSelection) return;
    if (selectionMode === "rectangle" && rectSelRef.current) {
      heatmapContext.setSelection(getCellsInRectangle(rectSelRef.current));
    } else if (selectionMode === "polygon" && polySelRef.current?.closed) {
      const cells = getCellsInPolygon(polySelRef.current.points, numRows, numCols);
      heatmapContext.setSelection(cellsSetToCoordinates(cells));
    } else {
      heatmapContext.setSelection([]);
    }
  }, [heatmapContext, selectionMode, numRows, numCols]);

  // Handle external clear (e.g., Eraser button resets context selection)
  useEffect(() => {
    if (heatmapContext && heatmapContext.selection.length === 0 && (rectSelRef.current || polySelRef.current?.closed)) {
      rectSelRef.current = null;
      polySelRef.current = null;
      isSelectingRef.current = false;
      selectionStartRef.current = null;
      previewRef.current = null;
      draggingVertexRef.current = null;
      scheduleRedraw();
    }
  }, [heatmapContext, heatmapContext?.selection, scheduleRedraw]);

  // Sync contrast/bias ref when context changes externally
  useEffect(() => {
    if (heatmapContext?.contrastBias) {
      contrastBiasRef.current = heatmapContext.contrastBias;
      scheduleRedraw();
    }
  }, [heatmapContext?.contrastBias, scheduleRedraw]);

  // Unified cell-from-coordinates helper
  const getCellFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || numRows === 0 || numCols === 0) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      if (mx < margin.left || mx > margin.left + plotWidth || my < margin.top || my > margin.top + plotHeight)
        return null;
      const col = Math.floor((mx - margin.left) / (plotWidth / numCols));
      const row = numRows - 1 - Math.floor((my - margin.top) / (plotHeight / numRows));
      return { x: Math.max(0, Math.min(numCols - 1, col)), y: Math.max(0, Math.min(numRows - 1, row)) };
    },
    [numRows, numCols, margin, plotWidth, plotHeight],
  );

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const clearSelections = useCallback(() => {
    rectSelRef.current = null;
    polySelRef.current = null;
    isSelectingRef.current = false;
    selectionStartRef.current = null;
    previewRef.current = null;
    draggingVertexRef.current = null;
    heatmapContext?.clearSelections();
    scheduleRedraw();
  }, [heatmapContext, scheduleRedraw]);

  // Event handlers — update refs and schedule redraw (no React state during drag)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle contrast/bias drag (right-click)
      if (isAdjustingCBRef.current && cbDragStartRef.current) {
        const dx = e.clientX - cbDragStartRef.current.x;
        const dy = e.clientY - cbDragStartRef.current.y;

        // Normalize deltas relative to canvas dimensions
        const newBias = Math.max(0, Math.min(1, cbStartValuesRef.current.bias + dx / width));
        // Invert Y: moving up (negative dy) increases contrast
        const newContrast = Math.max(0, Math.min(10, cbStartValuesRef.current.contrast - (dy / height) * 5));

        contrastBiasRef.current = { contrast: newContrast, bias: newBias };
        scheduleRedraw();
        return;
      }

      const cell = getCellFromCoords(e.clientX, e.clientY);

      if (selectable && selectionMode === "polygon") {
        if (draggingVertexRef.current !== null && polySelRef.current && cell) {
          const newPoints = [...polySelRef.current.points];
          newPoints[draggingVertexRef.current] = { x: cell.x, y: cell.y };
          polySelRef.current = { ...polySelRef.current, points: newPoints };
          scheduleRedraw();
          return;
        }
        if (polySelRef.current && !polySelRef.current.closed && cell) {
          previewRef.current = cell;
          scheduleRedraw();
        }
      }

      if (selectable && selectionMode === "rectangle" && isSelectingRef.current && selectionStartRef.current && cell) {
        rectSelRef.current = {
          start: { x: selectionStartRef.current.x, y: selectionStartRef.current.y },
          end: { x: cell.x, y: cell.y },
        };
        scheduleRedraw();
      }

      if (cell) {
        hoveredCellRef.current = cell;
        // Only update tooltip state when not actively selecting (avoids unnecessary React re-renders)
        if (!isSelectingRef.current && draggingVertexRef.current === null) {
          const cellValue = values[cell.y]?.[cell.x] ?? 0;
          const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
          const cellColor = interpolateColormap(normalizedValue, selectedColormap);
          setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
          setHoveredCellPos(cell);
          scheduleRedraw();
        }
      } else {
        hoveredCellRef.current = null;
        previewRef.current = null;
        setHoverInfo(null);
        setHoveredCellPos(null);
        scheduleRedraw();
      }
    },
    [selectable, selectionMode, values, maxVal, selectedColormap, getCellFromCoords, scheduleRedraw],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Right-click: start contrast/bias drag
      if (e.button === 2) {
        isAdjustingCBRef.current = true;
        cbDragStartRef.current = { x: e.clientX, y: e.clientY };
        cbStartValuesRef.current = { ...contrastBiasRef.current };
        // Hide tooltip and cell highlight while adjusting
        hoveredCellRef.current = null;
        setHoverInfo(null);
        setHoveredCellPos(null);
        return;
      }

      if (e.button !== 0 || !selectable) return;
      const cell = getCellFromCoords(e.clientX, e.clientY);

      if (selectionMode === "polygon") {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if (polySelRef.current?.closed && coords) {
          const vertexIdx = getVertexAtPosition(
            coords.x,
            coords.y,
            polySelRef.current.points,
            plotWidth,
            plotHeight,
            numRows,
            numCols,
            margin.left,
            margin.top,
          );
          if (vertexIdx !== null) {
            draggingVertexRef.current = vertexIdx;
            return;
          }
        }
        if (!cell) return;
        if (!polySelRef.current || polySelRef.current.closed) {
          polySelRef.current = { points: [{ x: cell.x, y: cell.y }], closed: false };
          scheduleRedraw();
          return;
        }
        // Close polygon if clicking near first point
        const pts = polySelRef.current.points;
        if (pts.length >= 3 && cell.x === pts[0].x && cell.y === pts[0].y) {
          polySelRef.current = { ...polySelRef.current, closed: true };
          previewRef.current = null;
          scheduleRedraw();
          commitSelection();
          return;
        }
        polySelRef.current = { ...polySelRef.current, points: [...pts, { x: cell.x, y: cell.y }] };
        scheduleRedraw();
        return;
      }

      // Rectangle mode
      if (cell) {
        isSelectingRef.current = true;
        selectionStartRef.current = cell;
        rectSelRef.current = { start: { x: cell.x, y: cell.y }, end: { x: cell.x, y: cell.y } };
        setHoverInfo(null);
        setHoveredCellPos(null);
        scheduleRedraw();
      }
    },
    [
      selectable,
      selectionMode,
      getCellFromCoords,
      getCanvasCoords,
      plotWidth,
      plotHeight,
      numRows,
      numCols,
      margin,
      scheduleRedraw,
      commitSelection,
    ],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // End contrast/bias drag
      if (isAdjustingCBRef.current && e.button === 2) {
        isAdjustingCBRef.current = false;
        cbDragStartRef.current = null;
        // Commit to context
        heatmapContext?.setContrastBias({ ...contrastBiasRef.current });
        return;
      }

      if (!selectable) return;
      if (selectionMode === "polygon" && draggingVertexRef.current !== null) {
        draggingVertexRef.current = null;
        commitSelection();
        return;
      }
      if (e.button === 0 && isSelectingRef.current) {
        isSelectingRef.current = false;
        selectionStartRef.current = null;
        commitSelection();
      }
    },
    [selectable, selectionMode, commitSelection, heatmapContext],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (selectionMode === "polygon") return;
      const touch = e.touches[0];
      if (!touch) return;
      const cell = getCellFromCoords(touch.clientX, touch.clientY);
      if (selectable && cell) {
        isSelectingRef.current = true;
        selectionStartRef.current = cell;
        rectSelRef.current = { start: { x: cell.x, y: cell.y }, end: { x: cell.x, y: cell.y } };
        hoveredCellRef.current = cell;
        const cellValue = values[cell.y]?.[cell.x] ?? 0;
        const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
        const cellColor = interpolateColormap(normalizedValue, selectedColormap);
        setHoveredCellPos(cell);
        setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
        scheduleRedraw();
      }
    },
    [selectable, selectionMode, values, maxVal, selectedColormap, getCellFromCoords, scheduleRedraw],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;
      const cell = getCellFromCoords(touch.clientX, touch.clientY);

      if (
        selectable &&
        selectionMode === "polygon" &&
        draggingVertexRef.current !== null &&
        polySelRef.current &&
        cell
      ) {
        const newPoints = [...polySelRef.current.points];
        newPoints[draggingVertexRef.current] = { x: cell.x, y: cell.y };
        polySelRef.current = { ...polySelRef.current, points: newPoints };
        scheduleRedraw();
        return;
      }

      if (selectable && selectionMode === "rectangle" && isSelectingRef.current && selectionStartRef.current && cell) {
        rectSelRef.current = {
          start: { x: selectionStartRef.current.x, y: selectionStartRef.current.y },
          end: { x: cell.x, y: cell.y },
        };
        scheduleRedraw();
      }

      if (cell) {
        hoveredCellRef.current = cell;
        const cellValue = values[cell.y]?.[cell.x] ?? 0;
        const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
        const cellColor = interpolateColormap(normalizedValue, selectedColormap);
        setHoveredCellPos(cell);
        setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
      }
    },
    [selectable, selectionMode, values, maxVal, selectedColormap, getCellFromCoords, scheduleRedraw],
  );

  const handleTouchEnd = useCallback(() => {
    if (selectionMode === "polygon") {
      if (draggingVertexRef.current !== null) {
        draggingVertexRef.current = null;
        commitSelection();
      }
    } else if (isSelectingRef.current) {
      isSelectingRef.current = false;
      selectionStartRef.current = null;
      commitSelection();
    }
    setHoverInfo(null);
    setHoveredCellPos(null);
    hoveredCellRef.current = null;
  }, [selectionMode, commitSelection]);

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
    setHoveredCellPos(null);
    hoveredCellRef.current = null;
    previewRef.current = null;
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      selectionStartRef.current = null;
    }
    if (draggingVertexRef.current !== null) {
      draggingVertexRef.current = null;
    }
    // Cancel contrast/bias drag if mouse leaves canvas
    if (isAdjustingCBRef.current) {
      isAdjustingCBRef.current = false;
      cbDragStartRef.current = null;
      heatmapContext?.setContrastBias({ ...contrastBiasRef.current });
    }
    scheduleRedraw();
  }, [scheduleRedraw, heatmapContext]);

  const getTooltipPosition = () => {
    if (!hoveredCellPos || !canvasRef.current || numRows === 0 || numCols === 0) return { left: 0, top: 0 };
    const cellWidth = plotWidth / numCols;
    const cellHeight = plotHeight / numRows;
    const x = margin.left + hoveredCellPos.x * cellWidth + cellWidth / 2;
    const y = margin.top + (numRows - 1 - hoveredCellPos.y) * cellHeight;
    return { left: x, top: y - 10 };
  };

  const tooltipPos = getTooltipPosition();
  const showTooltip = hoverInfo && tooltip;

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
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          cursor: selectable ? "crosshair" : "default",
          touchAction: "none",
        }}
      />
      {showTooltip && (
        <div
          className="absolute bg-card shadow-2xl px-2.5 py-1.5 rounded font-mono text-card-foreground text-xs -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          {renderTooltip ? (
            renderTooltip(hoverInfo)
          ) : (
            <>
              <p>
                x: {hoverInfo.x}, y: {hoverInfo.y}
              </p>
              <div className="flex items-center mt-2 min-w-25">
                <div style={{ backgroundColor: hoverInfo.color }} className="inline-block mr-2 w-3 h-3" />
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
