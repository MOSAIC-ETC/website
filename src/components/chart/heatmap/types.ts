import type React from "react";
import type { ReactNode } from "react";

export type Colormap = [number, number, number][];

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

export interface HeatmapPolygonPoint {
  x: number;
  y: number;
}

export interface HeatmapPolygonSelection {
  /** Array of polygon vertices */
  points: HeatmapPolygonPoint[];
  /** Whether the polygon is closed/complete */
  closed: boolean;
}

export type SelectionMode = "rectangle" | "polygon";

export type HeatmapProps = {
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
  /** Colormap to use for the heatmap */
  colormap?: Colormap | string;
} & React.HTMLAttributes<HTMLDivElement>;

export interface HeatmapMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
