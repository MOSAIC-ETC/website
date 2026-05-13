"use client";

import { useMemo } from "react";

import { useManifest } from "@/hooks/use-manifest";
import { NMParser, WavelengthUnit } from "@/lib/parser";

import type { FilterEntry, NMFile } from "./types";

function toEntry(f: { slug: string; name: string; hash: string; effWavelengthNm: number; effWavelengthUnit: "NM" | "UM"; zeroPoint: number }): FilterEntry {
  return {
    id: f.slug,
    name: f.name,
    path: `/api/files/filters/${f.slug}`,
    effWavelength: f.effWavelengthNm,
    effWavelengthUnit: f.effWavelengthUnit === "UM" ? WavelengthUnit.UM : WavelengthUnit.NM,
    zeroPoint: f.zeroPoint,
    hash: f.hash,
  };
}

/**
 * Lists the currently-available filters (from /api/manifest), sorted by
 * effective wavelength. The set was hardcoded in the v1 frontend; it now
 * mirrors whatever is current in the DB.
 */
export function useFilters(): { filters: FilterEntry[]; loading: boolean; error: string | null } {
  const { manifest, loading, error } = useManifest();
  const filters = useMemo(() => {
    if (!manifest) return [];
    return manifest.filters.map(toEntry).sort((a, b) => a.effWavelength - b.effWavelength);
  }, [manifest]);
  return { filters, loading, error };
}

/**
 * Fetches the filter curve data for a given filter entry and returns it as an array of transmission points.
 *
 * @param entry The filter entry containing the path to the filter curve file and the wavelength unit.
 * @returns A promise that resolves to an array of filter transmission points.
 * @throws An error if the filter curve file cannot be loaded or parsed.
 */
export async function fetchFilterCurve(entry: FilterEntry): Promise<NMFile[]> {
  const response = await fetch(entry.path);
  if (!response.ok) {
    throw new Error(`Failed to load filter curve: ${entry.path}`);
  }

  const text = await response.text();
  const parser = new NMParser(text, entry.effWavelengthUnit);
  return parser.parse();
}
