"use client";

import { useMemo } from "react";

import { useManifest } from "@/hooks/use-manifest";

import { ObjectEntry } from "./types";

/**
 * Lists currently-available objects (from /api/manifest). The set was a static
 * array in v1; it now reflects the live catalog.
 */
export function useObjects(): { objects: ObjectEntry[]; loading: boolean; error: string | null } {
  const { manifest, loading, error } = useManifest();
  const objects = useMemo<ObjectEntry[]>(() => {
    if (!manifest) return [];
    return manifest.objects.map((o) => ({
      id: o.slug,
      name: o.name,
      previewPath: `/api/files/objects/${o.slug}/preview`,
      cubePath: `/api/files/objects/${o.slug}/cube`,
      previewHash: o.previewHash,
      cubeHash: o.cubeHash,
    }));
  }, [manifest]);
  return { objects, loading, error };
}
