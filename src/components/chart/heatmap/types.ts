import type React from "react";
import type { ReactNode } from "react";

export type Colormap = [number, number, number][];

/** A cell in the heatmap grid */
export interface HeatmapCell {
  x: number;
  y: number;
}

/** Data for a heatmap cell including its value and color */
export interface HeatmapCellData {
  x: number;
  y: number;
  value: number;
  color: string;
}

/** A point in the heatmap coordinate system */
export interface HeatmapPoint {
  x: number;
  y: number;
}

/** Rectangle selection with start and end coordinates */
export interface HeatmapRect {
  /** Start point (row, column) */
  start: HeatmapPoint;
  /** End point (row, column) */
  end: HeatmapPoint;
}

/** Polygon selection with vertices */
export interface HeatmapPolygon {
  /** Array of polygon vertices */
  points: HeatmapPoint[];
  /** Whether the polygon is closed/complete */
  closed: boolean;
}

/** Selection mode: rectangle or polygon */
export type SelectionMode = "rectangle" | "polygon";

/** Props for the Heatmap component */
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
  /** Whether to enable selection (default: false) */
  selectable?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/** Margins around the heatmap for axes and labels */
export interface HeatmapMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
