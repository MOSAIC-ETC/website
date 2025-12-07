"use client";

import { useMemo } from "react";
import { TriangleDashed, SquareDashed, Eraser } from "lucide-react";

import { Heatmap, HeatmapProvider, useHeatmapSelectionContext } from "@/components/chart/heatmap";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-col gap-2 mt-12">
        <Button
          onClick={() => setSelectionMode("rectangle")}
          variant={selectionMode === "rectangle" ? "default" : "outline"}
          size="icon-sm"
        >
          <SquareDashed />
        </Button>
        <Button
          onClick={() => setSelectionMode("polygon")}
          variant={selectionMode === "polygon" ? "default" : "outline"}
          size="icon-sm"
        >
          <TriangleDashed />
        </Button>
        <Button onClick={clearSelections} variant="destructive" size="icon-sm">
          <Eraser />
        </Button>
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
      <main className="flex justify-center items-center gap-4 bg-background p-8 min-h-screen">
        <div className="flex justify-center">
          <HeatmapDisplay />
          <SelectionControls />
        </div>
      </main>
    </HeatmapProvider>
  );
}
