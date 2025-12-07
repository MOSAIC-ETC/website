"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

import type {
  HeatmapProps,
  HeatmapCellData,
  Colormap,
  HeatmapSelection,
  HeatmapPolygonSelection,
  SelectionMode,
} from "./types";
import { getColormap, interpolateColormap } from "./colormaps";
import { getVertexAtPosition } from "./utils";
import { drawHeatmap } from "./draw";
import { HeatmapSelectionContext } from "./context";

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
  const [hoverInfo, setHoverInfo] = useState<HeatmapCellData | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const { resolvedTheme } = useTheme();

  const externalContext = useContext(HeatmapSelectionContext);

  // Internal state for when not using context
  const [internalSelectionMode, setInternalSelectionMode] = useState<SelectionMode>("rectangle");
  const [internalSelection, setInternalSelection] = useState<HeatmapSelection | null>(null);
  const [internalPolygonSelection, setInternalPolygonSelection] = useState<HeatmapPolygonSelection | null>(null);

  // Use context if available, otherwise use internal state
  const selectionMode = externalContext?.selectionMode ?? internalSelectionMode;
  const currentSelection = externalContext?.selection ?? internalSelection;
  const setCurrentSelection = externalContext?.setSelection ?? setInternalSelection;
  const currentPolygonSelection = externalContext?.polygonSelection ?? internalPolygonSelection;
  const setCurrentPolygonSelection = externalContext?.setPolygonSelection ?? setInternalPolygonSelection;

  const selectedColormap = getColormap(colormap) as Colormap;

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const isNearFirstPoint = useCallback(
    (cell: { x: number; y: number }) => {
      if (!currentPolygonSelection || currentPolygonSelection.points.length < 3) return false;
      const firstPoint = currentPolygonSelection.points[0];
      return cell.x === firstPoint.x && cell.y === firstPoint.y;
    },
    [currentPolygonSelection]
  );

  const clearSelections = useCallback(() => {
    if (externalContext) {
      externalContext.clearSelections();
    } else {
      setInternalSelection(null);
      setInternalPolygonSelection(null);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setPreviewPoint(null);
    setDraggingVertexIndex(null);
  }, [externalContext]);

  const margin = { top: 50, right: 80, bottom: 50, left: 50 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const numRows = values.length;
  const numCols = values[0]?.length ?? 0;

  const maxVal = values.reduce((max, row) => Math.max(max, ...row), 0);

  const draw = useCallback(() => {
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
      highlightCell: hoveredCell,
      selectionRect: selectionMode === "rectangle" ? currentSelection : null,
      polygonSel: selectionMode === "polygon" ? currentPolygonSelection : null,
      preview: previewPoint,
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
    hoveredCell,
    selectionMode,
    currentSelection,
    currentPolygonSelection,
    previewPoint,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme, draw]);

  // Cell coordinate helpers
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

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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

  // Event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromMouse(e);
    const canvasCoords = getCanvasCoords(e);

    if (selectable && selectionMode === "polygon") {
      if (draggingVertexIndex !== null && currentPolygonSelection && cell) {
        const newPoints = [...currentPolygonSelection.points];
        newPoints[draggingVertexIndex] = { x: cell.x, y: cell.y };
        setCurrentPolygonSelection({ ...currentPolygonSelection, points: newPoints });
        return;
      }

      if (currentPolygonSelection && !currentPolygonSelection.closed && cell) {
        setPreviewPoint(cell);
      }
    }

    if (selectable && selectionMode === "rectangle" && isSelecting && selectionStart && cell) {
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
      setPreviewPoint(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (!selectable) return;

    const cell = getCellFromMouse(e);
    const canvasCoords = getCanvasCoords(e);

    if (selectionMode === "polygon") {
      if (currentPolygonSelection && currentPolygonSelection.closed && canvasCoords) {
        const vertexIdx = getVertexAtPosition(
          canvasCoords.x,
          canvasCoords.y,
          currentPolygonSelection.points,
          plotWidth,
          plotHeight,
          numRows,
          numCols,
          margin.left,
          margin.top
        );
        if (vertexIdx !== null) {
          setDraggingVertexIndex(vertexIdx);
          return;
        }
      }

      if (!cell) return;

      if (!currentPolygonSelection || currentPolygonSelection.closed) {
        setCurrentPolygonSelection({ points: [{ x: cell.x, y: cell.y }], closed: false });
        return;
      }

      if (isNearFirstPoint(cell)) {
        setCurrentPolygonSelection({ ...currentPolygonSelection, closed: true });
        setPreviewPoint(null);
        return;
      }

      setCurrentPolygonSelection({
        ...currentPolygonSelection,
        points: [...currentPolygonSelection.points, { x: cell.x, y: cell.y }],
      });
      return;
    }

    if (cell) {
      setIsSelecting(true);
      setSelectionStart(cell);
      setCurrentSelection({ startX: cell.x, startY: cell.y, endX: cell.x, endY: cell.y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectable) return;

    if (selectionMode === "polygon" && draggingVertexIndex !== null) {
      setDraggingVertexIndex(null);
      return;
    }

    if (e.button === 0) {
      setIsSelecting(false);
      setSelectionStart(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectable) return;
    if (selectionMode !== "polygon") return;

    const canvasCoords = getCanvasCoords(e);

    if (currentPolygonSelection && canvasCoords) {
      const vertexIdx = getVertexAtPosition(
        canvasCoords.x,
        canvasCoords.y,
        currentPolygonSelection.points,
        plotWidth,
        plotHeight,
        numRows,
        numCols,
        margin.left,
        margin.top
      );
      if (vertexIdx !== null) {
        const newPoints = currentPolygonSelection.points.filter((_: any, i: number) => i !== vertexIdx);
        if (newPoints.length < 3) {
          setCurrentPolygonSelection(null);
        } else {
          setCurrentPolygonSelection({ ...currentPolygonSelection, points: newPoints });
        }
        return;
      }
    }

    if (currentPolygonSelection && !currentPolygonSelection.closed && currentPolygonSelection.points.length >= 3) {
      setCurrentPolygonSelection({ ...currentPolygonSelection, closed: true });
      setPreviewPoint(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectable) return;
    e.preventDefault();
    clearSelections();
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const cell = getCellFromTouch(e);
    const canvasCoords = getCanvasCoords(e);

    if (selectable && selectionMode === "polygon") {
      if (currentPolygonSelection && currentPolygonSelection.closed && canvasCoords) {
        const vertexIdx = getVertexAtPosition(
          canvasCoords.x,
          canvasCoords.y,
          currentPolygonSelection.points,
          plotWidth,
          plotHeight,
          numRows,
          numCols,
          margin.left,
          margin.top
        );
        if (vertexIdx !== null) {
          e.preventDefault();
          setDraggingVertexIndex(vertexIdx);

          const timer = setTimeout(() => {
            const newPoints = currentPolygonSelection.points.filter((_: any, i: number) => i !== vertexIdx);
            if (newPoints.length < 3) {
              setCurrentPolygonSelection(null);
            } else {
              setCurrentPolygonSelection({ ...currentPolygonSelection, points: newPoints });
            }
            setDraggingVertexIndex(null);
          }, 500);
          setLongPressTimer(timer);
          return;
        }
      }

      if (!cell) return;
      e.preventDefault();

      if (!currentPolygonSelection || currentPolygonSelection.closed) {
        setCurrentPolygonSelection({ points: [{ x: cell.x, y: cell.y }], closed: false });
        return;
      }

      if (isNearFirstPoint(cell)) {
        setCurrentPolygonSelection({ ...currentPolygonSelection, closed: true });
        setPreviewPoint(null);
        return;
      }

      setCurrentPolygonSelection({
        ...currentPolygonSelection,
        points: [...currentPolygonSelection.points, { x: cell.x, y: cell.y }],
      });
      return;
    }

    if (selectable && cell) {
      e.preventDefault();
      setIsSelecting(true);
      setSelectionStart(cell);
      setCurrentSelection({ startX: cell.x, startY: cell.y, endX: cell.x, endY: cell.y });

      const cellValue = values[cell.x]?.[cell.y] ?? 0;
      const normalizedValue = maxVal > 0 ? cellValue / maxVal : 0;
      const cellColor = interpolateColormap(normalizedValue, selectedColormap);
      setHoveredCell(cell);
      setHoverInfo({ x: cell.x, y: cell.y, value: cellValue, color: cellColor });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    clearLongPressTimer();

    const cell = getCellFromTouch(e);

    if (selectable && selectionMode === "polygon" && draggingVertexIndex !== null && currentPolygonSelection && cell) {
      e.preventDefault();
      const newPoints = [...currentPolygonSelection.points];
      newPoints[draggingVertexIndex] = { x: cell.x, y: cell.y };
      setCurrentPolygonSelection({ ...currentPolygonSelection, points: newPoints });
      return;
    }

    if (selectable && selectionMode === "rectangle" && isSelecting && selectionStart && cell) {
      e.preventDefault();
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
    clearLongPressTimer();

    if (selectionMode === "polygon") {
      setDraggingVertexIndex(null);
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setHoverInfo(null);
    setHoveredCell(null);
  };

  const getTooltipPosition = () => {
    if (!hoveredCell || !canvasRef.current || numRows === 0 || numCols === 0) return { left: 0, top: 0 };

    const cellWidth = plotWidth / numCols;
    const cellHeight = plotHeight / numRows;
    const x = margin.left + hoveredCell.y * cellWidth + cellWidth / 2;
    const y = margin.top + (numRows - 1 - hoveredCell.x) * cellHeight;

    return { left: x, top: y - 10 };
  };

  const tooltipPos = getTooltipPosition();

  const showTooltip =
    hoverInfo &&
    tooltip &&
    !isSelecting &&
    !(selectionMode === "polygon" && currentPolygonSelection && !currentPolygonSelection.closed) &&
    draggingVertexIndex === null;

  return (
    <div className={cn("inline-block relative", className)} {...props}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {
          setHoverInfo(null);
          setHoveredCell(null);
          setPreviewPoint(null);
          if (isSelecting) {
            setIsSelecting(false);
            setSelectionStart(null);
          }
          if (draggingVertexIndex !== null) {
            setDraggingVertexIndex(null);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          cursor:
            selectable && (isSelecting || draggingVertexIndex !== null)
              ? "crosshair"
              : selectable && selectionMode === "polygon"
              ? "crosshair"
              : "default",
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
              <div className="flex items-center mt-2 min-w-[100px]">
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
