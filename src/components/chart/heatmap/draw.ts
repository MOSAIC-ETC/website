import type { Colormap, HeatmapSelection, HeatmapPolygonSelection, HeatmapPolygonPoint, HeatmapMargins } from "./types";
import { getCellsInPolygon, getPixelOutlineEdges, generateColorBarTicks, cellToCanvas } from "./utils";
import { interpolateColormap } from "./colormaps";

interface DrawHeatmapOptions {
  ctx: CanvasRenderingContext2D;
  values: number[][];
  width: number;
  height: number;
  margin: HeatmapMargins;
  plotWidth: number;
  plotHeight: number;
  numRows: number;
  numCols: number;
  maxVal: number;
  colormap: Colormap;
  title?: string;
  xLabel: string;
  yLabel: string;
  showAxes: boolean;
  highlightCell?: { x: number; y: number } | null;
  selectionRect?: HeatmapSelection | null;
  polygonSel?: HeatmapPolygonSelection | null;
  preview?: HeatmapPolygonPoint | null;
}

export function drawHeatmap({
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
  colormap,
  title,
  xLabel,
  yLabel,
  showAxes,
  highlightCell,
  selectionRect,
  polygonSel,
  preview,
}: DrawHeatmapOptions) {
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 0)";
  ctx.fillRect(0, 0, width, height);

  // Get foreground color from CSS
  const styles = getComputedStyle(document.documentElement);
  const foregroundColor = styles.getPropertyValue("--foreground").trim() || "#000000";
  const mutedForegroundColor = styles.getPropertyValue("--muted-foreground").trim() || "#555555";

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
      ctx.fillStyle = interpolateColormap(normalizedValue, colormap);
      const x = margin.left + col * cellWidth;
      const y = margin.top + (numRows - 1 - row) * cellHeight;
      ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
    }
  }

  // Draw polygon selection
  if (polygonSel && polygonSel.points.length > 0) {
    drawPolygonSelection(ctx, polygonSel, preview, {
      margin,
      plotWidth,
      plotHeight,
      numRows,
      numCols,
      cellWidth,
      cellHeight,
    });
  } else if (selectionRect) {
    // Draw rectangle selection
    drawRectangleSelection(ctx, selectionRect, {
      margin,
      plotWidth,
      plotHeight,
      numRows,
      cellWidth,
      cellHeight,
    });
  }

  // Draw highlight border on hovered cell (only if not selecting)
  if (highlightCell && !selectionRect && !(polygonSel && !polygonSel.closed)) {
    const x = margin.left + highlightCell.y * cellWidth;
    const y = margin.top + (numRows - 1 - highlightCell.x) * cellHeight;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
  }

  // Draw axes
  drawAxes(ctx, {
    margin,
    plotWidth,
    plotHeight,
    numRows,
    numCols,
    cellWidth,
    cellHeight,
    showAxes,
    xLabel,
    yLabel,
    width,
    height,
    mutedForegroundColor,
  });

  // Draw color bar
  drawColorBar(ctx, {
    margin,
    plotHeight,
    width,
    maxVal,
    colormap,
    mutedForegroundColor,
  });
}

interface DrawPolygonOptions {
  margin: HeatmapMargins;
  plotWidth: number;
  plotHeight: number;
  numRows: number;
  numCols: number;
  cellWidth: number;
  cellHeight: number;
}

function drawPolygonSelection(
  ctx: CanvasRenderingContext2D,
  polygonSel: HeatmapPolygonSelection,
  preview: HeatmapPolygonPoint | null | undefined,
  options: DrawPolygonOptions
) {
  const { margin, plotWidth, plotHeight, numRows, numCols, cellWidth, cellHeight } = options;
  const points = polygonSel.points;

  const toCnv = (cell: { x: number; y: number }) =>
    cellToCanvas(cell, plotWidth, plotHeight, numRows, numCols, margin.left, margin.top);

  if (polygonSel.closed && points.length >= 3) {
    const selectedCells = getCellsInPolygon(points, numRows, numCols);

    // Draw dark overlay on cells OUTSIDE the selection
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        if (!selectedCells.has(`${row},${col}`)) {
          const x = margin.left + col * cellWidth;
          const y = margin.top + (numRows - 1 - row) * cellHeight;
          ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
        }
      }
    }

    // Draw pixel outline
    const edges = getPixelOutlineEdges(selectedCells, numRows, numCols);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    edges.forEach((edge) => {
      const x1 = margin.left + edge.x1 * cellWidth;
      const y1 = margin.top + (numRows - edge.y1) * cellHeight;
      const x2 = margin.left + edge.x2 * cellWidth;
      const y2 = margin.top + (numRows - edge.y2) * cellHeight;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    });
    ctx.stroke();
  } else {
    // Polygon is not closed yet - show preview with dotted lines
    ctx.beginPath();
    const firstPoint = toCnv(points[0]);
    ctx.moveTo(firstPoint.canvasX, firstPoint.canvasY);

    for (let i = 1; i < points.length; i++) {
      const { canvasX, canvasY } = toCnv(points[i]);
      ctx.lineTo(canvasX, canvasY);
    }

    if (preview) {
      const { canvasX, canvasY } = toCnv(preview);
      ctx.lineTo(canvasX, canvasY);
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw dotted line from preview back to first point when near closing
    if (preview && points.length >= 2) {
      ctx.beginPath();
      const { canvasX, canvasY } = toCnv(preview);
      ctx.moveTo(canvasX, canvasY);
      ctx.lineTo(firstPoint.canvasX, firstPoint.canvasY);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw vertex handles for incomplete polygon
    for (let i = 0; i < points.length; i++) {
      const { canvasX, canvasY } = toCnv(points[i]);
      const isFirstPoint = i === 0;

      // draw inner border
      const x = canvasX - cellWidth / 2 + 1;
      const y = canvasY - cellHeight / 2 + 1;
      ctx.strokeStyle = isFirstPoint && points.length >= 3 ? "#00ff00" : "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellWidth - 2, cellHeight - 2);
    }
  }
}

interface DrawRectangleOptions {
  margin: HeatmapMargins;
  plotWidth: number;
  plotHeight: number;
  numRows: number;
  cellWidth: number;
  cellHeight: number;
}

function drawRectangleSelection(
  ctx: CanvasRenderingContext2D,
  selectionRect: HeatmapSelection,
  options: DrawRectangleOptions
) {
  const { margin, plotWidth, plotHeight, numRows, cellWidth, cellHeight } = options;

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

interface DrawAxesOptions {
  margin: HeatmapMargins;
  plotWidth: number;
  plotHeight: number;
  numRows: number;
  numCols: number;
  cellWidth: number;
  cellHeight: number;
  showAxes: boolean;
  xLabel: string;
  yLabel: string;
  width: number;
  height: number;
  mutedForegroundColor: string;
}

function drawAxes(ctx: CanvasRenderingContext2D, options: DrawAxesOptions) {
  const {
    margin,
    plotWidth,
    plotHeight,
    numRows,
    numCols,
    cellWidth,
    cellHeight,
    showAxes,
    xLabel,
    yLabel,
    width,
    height,
    mutedForegroundColor,
  } = options;

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
}

interface DrawColorBarOptions {
  margin: HeatmapMargins;
  plotHeight: number;
  width: number;
  maxVal: number;
  colormap: Colormap;
  mutedForegroundColor: string;
}

function drawColorBar(ctx: CanvasRenderingContext2D, options: DrawColorBarOptions) {
  const { margin, plotHeight, width, maxVal, colormap, mutedForegroundColor } = options;

  const colorBarWidth = 20;
  const colorBarHeight = plotHeight;
  const colorBarX = width - margin.right + 20;
  const colorBarY = margin.top;

  for (let i = 0; i < colorBarHeight; i++) {
    const t = 1 - i / colorBarHeight;
    ctx.fillStyle = interpolateColormap(t, colormap);
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
    const y = maxVal > 0 ? colorBarY + ((maxVal - tick) / maxVal) * colorBarHeight : colorBarY + colorBarHeight;
    if (y >= colorBarY && y <= colorBarY + colorBarHeight) {
      ctx.fillText(tick.toString(), colorBarX + colorBarWidth + 5, y + 4);
    }
  });
}
