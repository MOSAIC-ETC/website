"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SelectionMode, HeatmapCell } from "./types";

export interface HeatmapContextValue {
  /** Current selection mode */
  selectionMode: SelectionMode;
  /** Set selection mode */
  setSelectionMode: (mode: SelectionMode) => void;
  /** Array of selected cell coordinates */
  selection: HeatmapCell[];
  /** Set the selection coordinates */
  setSelection: (selection: HeatmapCell[]) => void;
  /** Clear all selections */
  clearSelections: () => void;
}

export const HeatmapSelectionContext = createContext<HeatmapContextValue | null>(null);

interface HeatmapProviderProps {
  children: ReactNode;
  /** Initial selection mode (default: "rectangle") */
  defaultSelectionMode?: SelectionMode;
}

export function HeatmapProvider({ children, defaultSelectionMode = "rectangle" }: HeatmapProviderProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(defaultSelectionMode);
  const [selection, setSelection] = useState<HeatmapCell[]>([]);

  const clearSelections = useCallback(() => {
    setSelection([]);
  }, []);

  return (
    <HeatmapSelectionContext.Provider
      value={{
        selectionMode,
        setSelectionMode,
        selection,
        setSelection,
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
export function useHeatmapSelectionContext(): HeatmapContextValue {
  const context = useContext(HeatmapSelectionContext);
  if (!context) {
    throw new Error("useHeatmapSelectionContext must be used within a HeatmapProvider");
  }
  return context;
}
