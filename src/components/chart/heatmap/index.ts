// Main component
export { Heatmap } from "./heatmap";

// Context provider and hook for external selection access
export { HeatmapProvider, useHeatmapSelectionContext } from "./context";

// Types
export type {
  HeatmapProps,
  HeatmapCellData,
  HeatmapRect,
  HeatmapPoint,
  HeatmapPolygon,
  HeatmapCell,
  SelectionMode,
  ScaleMode,
  Colormap,
  HeatmapMargins,
  ContrastBias,
} from "./types";

// Colormaps
export { colormaps, COLORMAP_NAMES, getColormap, interpolateColormap } from "./colormaps";

// Utilities
export {
  isPointInPolygon,
  getCellsInPolygon,
  getCellsInRectangle,
  cellsSetToCoordinates,
  getPixelOutlineEdges,
  generateColorBarTicks,
  cellToCanvas,
  getVertexAtPosition,
  computeZScale,
} from "./utils";
