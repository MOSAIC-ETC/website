"use client";

import { useState, useCallback } from "react";
import type { HeatmapSelection, HeatmapPolygonSelection, HeatmapPolygonPoint, SelectionMode } from "./types";

interface UseHeatmapSelectionProps {
  selectionMode: SelectionMode;
  selection?: HeatmapSelection | null;
  onSelectionChange?: (selection: HeatmapSelection | null) => void;
  polygonSelection?: HeatmapPolygonSelection | null;
  onPolygonSelectionChange?: (selection: HeatmapPolygonSelection | null) => void;
}

export function useHeatmapSelection({
  selectionMode,
  selection,
  onSelectionChange,
  polygonSelection,
  onPolygonSelectionChange,
}: UseHeatmapSelectionProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [internalSelection, setInternalSelection] = useState<HeatmapSelection | null>(null);
  const [internalPolygonSelection, setInternalPolygonSelection] = useState<HeatmapPolygonSelection | null>(null);
  const [previewPoint, setPreviewPoint] = useState<HeatmapPolygonPoint | null>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Use controlled selection if provided, otherwise use internal state
  const currentSelection = selection !== undefined ? selection : internalSelection;
  const setCurrentSelection = useCallback(
    (sel: HeatmapSelection | null) => {
      if (onSelectionChange) {
        onSelectionChange(sel);
      }
      if (selection === undefined) {
        setInternalSelection(sel);
      }
    },
    [onSelectionChange, selection]
  );

  const currentPolygonSelection = polygonSelection !== undefined ? polygonSelection : internalPolygonSelection;
  const setCurrentPolygonSelection = useCallback(
    (sel: HeatmapPolygonSelection | null) => {
      if (onPolygonSelectionChange) {
        onPolygonSelectionChange(sel);
      }
      if (polygonSelection === undefined) {
        setInternalPolygonSelection(sel);
      }
    },
    [onPolygonSelectionChange, polygonSelection]
  );

  const isNearFirstPoint = useCallback(
    (cell: { x: number; y: number }) => {
      if (!currentPolygonSelection || currentPolygonSelection.points.length < 3) return false;
      const firstPoint = currentPolygonSelection.points[0];
      return cell.x === firstPoint.x && cell.y === firstPoint.y;
    },
    [currentPolygonSelection]
  );

  const clearSelections = useCallback(() => {
    setCurrentSelection(null);
    setCurrentPolygonSelection(null);
    setIsSelecting(false);
    setSelectionStart(null);
    setPreviewPoint(null);
    setDraggingVertexIndex(null);
  }, [setCurrentSelection, setCurrentPolygonSelection]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  return {
    isSelecting,
    setIsSelecting,
    selectionStart,
    setSelectionStart,
    currentSelection,
    setCurrentSelection,
    currentPolygonSelection,
    setCurrentPolygonSelection,
    previewPoint,
    setPreviewPoint,
    draggingVertexIndex,
    setDraggingVertexIndex,
    longPressTimer,
    setLongPressTimer,

    isNearFirstPoint,
    clearSelections,
    clearLongPressTimer,
  };
}
