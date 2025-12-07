"use client";

import { useMemo } from "react";
import { Heatmap, HeatmapProvider, useHeatmapSelectionContext } from "@/components/chart/heatmap";

function generateSampleCounts(rows: number, cols: number): number[][] {
  const counts: number[][] = [];
  const centerRow = rows / 2;
  const centerCol = cols / 2;

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const distRow = (r - centerRow) / (rows / 4);
      const distCol = (c - centerCol) / (cols / 4);
      const dist = distRow * distRow + distCol * distCol;
      const baseValue = Math.exp(-dist) * 15;
      const value = Math.floor(baseValue + Math.random() * 3);
      row.push(value);
    }
    counts.push(row);
  }
  return counts;
}

// Separate component that uses the selection hook
function SelectionControls() {
  const { selectionMode, setSelectionMode, clearSelections } = useHeatmapSelectionContext();

  return (
    <>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setSelectionMode("rectangle")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectionMode === "rectangle"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Rectangle
        </button>
        <button
          onClick={() => setSelectionMode("polygon")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectionMode === "polygon"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Polygon
        </button>
        <button
          onClick={clearSelections}
          className="bg-destructive hover:bg-destructive/90 px-4 py-2 rounded-lg font-medium text-destructive-foreground text-sm transition-colors"
        >
          Clear
        </button>
      </div>
    </>
  );
}

function HeatmapDisplay() {
  const values = useMemo(() => generateSampleCounts(50, 50), []);

  return <Heatmap values={values} width={550} height={500} title="Heatmap" xLabel="X" yLabel="Y" selectable />;
}

export default function ETCPage() {
  return (
    <HeatmapProvider defaultSelectionMode="rectangle">
      <main className="flex flex-col justify-center items-center gap-4 bg-background p-8 min-h-screen">
        <SelectionControls />
        <HeatmapDisplay />
      </main>
    </HeatmapProvider>
  );
}
