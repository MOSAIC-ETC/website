import type { HeatmapPoint, HeatmapRect, HeatmapCell } from "./types";

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
          row + 0.5,
          col + 0.5,
          polygon.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }))
        )
      ) {
        cells.add(`${row},${col}`);
      }
    }
  }
  return cells;
}

/**
 * Get edges for drawing pixel outline around selected cells
 */
export function getPixelOutlineEdges(
  selectedCells: Set<string>,
  numRows: number,
  numCols: number
): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  selectedCells.forEach((cellKey) => {
    const [row, col] = cellKey.split(",").map(Number);

    // Top edge (if cell above is not selected)
    if (!selectedCells.has(`${row + 1},${col}`)) {
      edges.push({ x1: col, y1: row + 1, x2: col + 1, y2: row + 1 });
    }
    // Bottom edge (if cell below is not selected)
    if (!selectedCells.has(`${row - 1},${col}`)) {
      edges.push({ x1: col, y1: row, x2: col + 1, y2: row });
    }
    // Left edge (if cell to the left is not selected)
    if (!selectedCells.has(`${row},${col - 1}`)) {
      edges.push({ x1: col, y1: row, x2: col, y2: row + 1 });
    }
    // Right edge (if cell to the right is not selected)
    if (!selectedCells.has(`${row},${col + 1}`)) {
      edges.push({ x1: col + 1, y1: row, x2: col + 1, y2: row + 1 });
    }
  });

  return edges;
}

/**
 * Generate evenly spaced ticks for color bar
 */
export function generateColorBarTicks(maxValue: number, numTicks = 6): number[] {
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
  marginTop: number
): { canvasX: number; canvasY: number } {
  const cellWidth = plotWidth / numCols;
  const cellHeight = plotHeight / numRows;
  return {
    canvasX: marginLeft + cell.y * cellWidth + cellWidth / 2,
    canvasY: marginTop + (numRows - 1 - cell.x) * cellHeight + cellHeight / 2,
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
  hitRadius = 10
): number | null {
  for (let i = 0; i < points.length; i++) {
    const { canvasX: vx, canvasY: vy } = cellToCanvas(
      points[i],
      plotWidth,
      plotHeight,
      numRows,
      numCols,
      marginLeft,
      marginTop
    );

    const dist = Math.sqrt((canvasX - vx) ** 2 + (canvasY - vy) ** 2);
    if (dist <= hitRadius) {
      return i;
    }
  }
  return null;
}
