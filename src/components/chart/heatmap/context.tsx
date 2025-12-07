"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { HeatmapSelection, HeatmapPolygonSelection, SelectionMode } from "./types";

export interface HeatmapSelectionContextValue {
  /** Current selection mode */
  selectionMode: SelectionMode;
  /** Set selection mode */
  setSelectionMode: (mode: SelectionMode) => void;
  /** Current rectangle selection */
  selection: HeatmapSelection | null;
  /** Set rectangle selection */
  setSelection: (selection: HeatmapSelection | null) => void;
  /** Current polygon selection */
  polygonSelection: HeatmapPolygonSelection | null;
  /** Set polygon selection */
  setPolygonSelection: (selection: HeatmapPolygonSelection | null) => void;
  /** Clear all selections */
  clearSelections: () => void;
}

export const HeatmapSelectionContext = createContext<HeatmapSelectionContextValue | null>(null);

interface HeatmapProviderProps {
  children: ReactNode;
  /** Initial selection mode (default: "rectangle") */
  defaultSelectionMode?: SelectionMode;
  /** Initial rectangle selection */
  defaultSelection?: HeatmapSelection | null;
  /** Initial polygon selection */
  defaultPolygonSelection?: HeatmapPolygonSelection | null;
}

export function HeatmapProvider({
  children,
  defaultSelectionMode = "rectangle",
  defaultSelection = null,
  defaultPolygonSelection = null,
}: HeatmapProviderProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(defaultSelectionMode);
  const [selection, setSelection] = useState<HeatmapSelection | null>(defaultSelection);
  const [polygonSelection, setPolygonSelection] = useState<HeatmapPolygonSelection | null>(defaultPolygonSelection);

  const clearSelections = useCallback(() => {
    setSelection(null);
    setPolygonSelection(null);
  }, []);

  return (
    <HeatmapSelectionContext.Provider
      value={{
        selectionMode,
        setSelectionMode,
        selection,
        setSelection,
        polygonSelection,
        setPolygonSelection,
        clearSelections,
      }}
    >
      {children}
    </HeatmapSelectionContext.Provider>
  );
}

/**
 * Hook to access heatmap selection state from anywhere within HeatmapProvider.
 * Must be used within a HeatmapProvider.
 */
export function useHeatmapSelectionContext() {
  const context = useContext(HeatmapSelectionContext);
  if (!context) {
    throw new Error("useHeatmapSelectionContext must be used within a HeatmapProvider");
  }
  return context;
}
