// Main component
export { Heatmap } from "./heatmap";

// Context provider and hook for external selection access
export { HeatmapProvider, useHeatmapSelectionContext } from "./context";

// Types
export type {
  HeatmapProps,
  HeatmapCellData,
  HeatmapSelection,
  HeatmapPolygonPoint,
  HeatmapPolygonSelection,
  SelectionMode,
  Colormap,
  HeatmapMargins,
} from "./types";

// Colormaps
export { colormaps, interpolateColormap, getColormap } from "./colormaps";

// Utilities
export {
  isPointInPolygon,
  getCellsInPolygon,
  getPixelOutlineEdges,
  generateColorBarTicks,
  cellToCanvas,
  getVertexAtPosition,
} from "./utils";
