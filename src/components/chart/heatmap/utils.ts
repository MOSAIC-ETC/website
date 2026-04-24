import type { HeatmapCell, HeatmapPoint, HeatmapRect } from "./types";

/**
 * Get all cells that are inside a rectangle selection
 */
export function getCellsInRectangle(selection: HeatmapRect): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const minX = Math.min(selection.start.x, selection.end.x);
  const maxX = Math.max(selection.start.x, selection.end.x);
  const minY = Math.min(selection.start.y, selection.end.y);
  const maxY = Math.max(selection.start.y, selection.end.y);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

/**
 * Convert polygon cells Set to array of coordinates
 */
export function cellsSetToCoordinates(cells: Set<string>): HeatmapCell[] {
  return Array.from(cells).map((cellKey) => {
    const [x, y] = cellKey.split(",").map(Number);
    return { x, y };
  });
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(x: number, y: number, polygon: HeatmapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Get all cells that are inside a polygon
 */
export function getCellsInPolygon(polygon: HeatmapPoint[], numRows: number, numCols: number): Set<string> {
  const cells = new Set<string>();
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      // Check center of cell
      if (
        isPointInPolygon(
          col + 0.5,
          row + 0.5,
          polygon.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 })),
        )
      ) {
        cells.add(`${col},${row}`);
      }
    }
  }
  return cells;
}

/**
 * Get edges for drawing pixel outline around selected cells
 */
export function getPixelOutlineEdges(selectedCells: Set<string>): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  selectedCells.forEach((cellKey) => {
    const [x, y] = cellKey.split(",").map(Number);

    // Top edge (if cell above is not selected)
    if (!selectedCells.has(`${x},${y + 1}`)) {
      edges.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
    }
    // Bottom edge (if cell below is not selected)
    if (!selectedCells.has(`${x},${y - 1}`)) {
      edges.push({ x1: x, y1: y, x2: x + 1, y2: y });
    }
    // Left edge (if cell to the left is not selected)
    if (!selectedCells.has(`${x - 1},${y}`)) {
      edges.push({ x1: x, y1: y, x2: x, y2: y + 1 });
    }
    // Right edge (if cell to the right is not selected)
    if (!selectedCells.has(`${x + 1},${y}`)) {
      edges.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
    }
  });

  return edges;
}

/**
 * Generate evenly spaced ticks for color bar with adaptive rounding.
 * Ticks run from maxValue (top of bar) down to minValue (bottom).
 */
export function generateColorBarTicks(minValue: number, maxValue: number, numTicks = 6): number[] {
  const range = maxValue - minValue;
  if (range === 0) return [minValue];

  // Round to the nearest power-of-10 fraction of the range
  const magnitude = Math.pow(10, Math.floor(Math.log10(range / numTicks)));
  const ticks: number[] = [];
  for (let i = 0; i < numTicks; i++) {
    const rawValue = maxValue - (range * i) / (numTicks - 1);
    ticks.push(Math.round(rawValue / magnitude) * magnitude);
  }
  return ticks;
}

/**
 * ZScale normalization (IRAF/DS9 algorithm, Lupton & Gunn 1986).
 *
 * Fits a line through the sorted pixel values to estimate the "density" of the
 * data distribution. The slope of that line controls how wide the display window
 * is: a small slope (many pixels at similar background values) → wide window that
 * shows fine structure; a large slope (data spread over a wide range, dominated by
 * outliers) → narrow window centred on the bulk of the data.
 *
 * Steps:
 *  1. Flatten and sort all pixel values.
 *  2. Subsample to `nsamples` uniformly spaced elements.
 *  3. Linear-regression: fit  value = slope × rank + intercept.
 *  4. z1 = median − contrast × (center_rank / slope)
 *     z2 = median + contrast × ((n−1−center_rank) / slope)
 *  5. Clamp to [zmin, zmax]. Fall back to full range if slope ≤ 0.
 *
 * @param values   2-D array of pixel values
 * @param contrast Controls the width of the display window (DS9 default: 0.25)
 * @param nsamples Number of pixels to subsample (default: 600)
 */
export function computeZScale(values: number[][], contrast = 0.25, nsamples = 600): { z1: number; z2: number } {
  const flat: number[] = [];

  for (const row of values) {
    for (const v of row) {
      // 1. O PULO DO GATO: Ignore os valores nulos/fundo absurdos!
      // Se o seu fundo é -899 ou -999, filtre qualquer coisa abaixo de -100
      if (v > -100 && !isNaN(v)) {
        flat.push(v);
      }
    }
  }

  if (flat.length === 0) return { z1: 0, z2: 1 };

  flat.sort((a, b) => a - b);
  const zmin = flat[0];
  const zmax = flat[flat.length - 1];
  if (zmin === zmax) return { z1: zmin, z2: zmax };

  // Subsample uniformly
  const n = Math.min(nsamples, flat.length);
  const step = flat.length / n;
  const samples: number[] = [];
  for (let i = 0; i < n; i++) samples.push(flat[Math.floor(i * step)]);

  // Linear regression
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += samples[i];
    sumXY += i * samples[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { z1: zmin, z2: zmax };

  const slope = (n * sumXY - sumX * sumY) / denom;
  if (slope <= 0) return { z1: zmin, z2: zmax };

  const centerIdx = Math.floor(n / 2);
  const median = samples[centerIdx];

  const slopeAdjusted = slope / contrast;
  const z1 = Math.max(zmin, median - centerIdx * slopeAdjusted);
  const z2 = Math.min(zmax, median + (n - 1 - centerIdx) * slopeAdjusted);

  if (z1 >= z2) return { z1: zmin, z2: zmax };
  return { z1, z2 };
}

/**
 * Convert cell coordinates to canvas coordinates
 */
export function cellToCanvas(
  cell: { x: number; y: number },
  plotWidth: number,
  plotHeight: number,
  numRows: number,
  numCols: number,
  marginLeft: number,
  marginTop: number,
): { canvasX: number; canvasY: number } {
  const cellWidth = plotWidth / numCols;
  const cellHeight = plotHeight / numRows;
  return {
    canvasX: marginLeft + cell.x * cellWidth + cellWidth / 2,
    canvasY: marginTop + (numRows - 1 - cell.y) * cellHeight + cellHeight / 2,
  };
}

/**
 * Get the vertex index at a given canvas position
 */
export function getVertexAtPosition(
  canvasX: number,
  canvasY: number,
  points: HeatmapPoint[],
  plotWidth: number,
  plotHeight: number,
  numRows: number,
  numCols: number,
  marginLeft: number,
  marginTop: number,
  hitRadius = 10,
): number | null {
  for (let i = 0; i < points.length; i++) {
    const { canvasX: vx, canvasY: vy } = cellToCanvas(
      points[i],
      plotWidth,
      plotHeight,
      numRows,
      numCols,
      marginLeft,
      marginTop,
    );

    const dist = Math.sqrt((canvasX - vx) ** 2 + (canvasY - vy) ** 2);
    if (dist <= hitRadius) {
      return i;
    }
  }
  return null;
}
