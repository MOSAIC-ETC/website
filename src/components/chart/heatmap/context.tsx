"use client";

import { type ReactNode, createContext, useCallback, useContext, useState } from "react";

import type { ContrastBias, HeatmapCell, SelectionMode } from "./types";

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
  /** Current contrast and bias values */
  contrastBias: ContrastBias;
  /** Set contrast and bias values */
  setContrastBias: (cb: ContrastBias) => void;
  /** Reset contrast and bias to defaults */
  resetContrastBias: () => void;
}

export const HeatmapSelectionContext = createContext<HeatmapContextValue | null>(null);

interface HeatmapProviderProps {
  children: ReactNode;
  /** Initial selection mode (default: "rectangle") */
  defaultSelectionMode?: SelectionMode;
}

const DEFAULT_CONTRAST_BIAS: ContrastBias = { contrast: 1.0, bias: 0.5 };

export function HeatmapProvider({ children, defaultSelectionMode = "rectangle" }: HeatmapProviderProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(defaultSelectionMode);
  const [selection, setSelection] = useState<HeatmapCell[]>([]);
  const [contrastBias, setContrastBias] = useState<ContrastBias>(DEFAULT_CONTRAST_BIAS);

  const clearSelections = useCallback(() => {
    setSelection([]);
  }, []);

  const resetContrastBias = useCallback(() => {
    setContrastBias(DEFAULT_CONTRAST_BIAS);
  }, []);

  return (
    <HeatmapSelectionContext.Provider
      value={{
        selectionMode,
        setSelectionMode,
        selection,
        setSelection,
        clearSelections,
        contrastBias,
        setContrastBias,
        resetContrastBias,
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
