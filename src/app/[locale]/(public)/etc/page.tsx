"use client";

import { Heatmap } from "@/components/chart/heatmap";
import { useMemo } from "react";

function generateSampleCounts(rows: number, cols: number): number[][] {
  const counts: number[][] = [];
  const centerRow = rows / 2;
  const centerCol = cols / 2;

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      // Create a gaussian-like distribution centered in the middle
      const distRow = (r - centerRow) / (rows / 4);
      const distCol = (c - centerCol) / (cols / 4);
      const dist = distRow * distRow + distCol * distCol;
      const baseValue = Math.exp(-dist) * 15;
      // Add some randomness
      const value = Math.floor(baseValue + Math.random() * 3);
      row.push(value);
    }
    counts.push(row);
  }
  return counts;
}

export default function ETCPage() {
  const values = useMemo(() => generateSampleCounts(50, 50), []);

  return (
    <main className="flex justify-center items-center p-8 min-h-screen">
      <Heatmap values={values} width={550} height={500} title="Heatmap" xLabel="X" yLabel="Y" />
    </main>
  );
}
