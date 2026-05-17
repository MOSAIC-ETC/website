"use client";

// Client-side manifest fetch with a session-scoped memory cache.
// One in-flight request is deduplicated across all consumers.

import { useEffect, useState } from "react";

import type { InstrumentParams } from "@/lib/schemas/instrument-params";

export type ManifestFilter = {
  slug: string;
  name: string;
  hash: string;
  version: number;
  effWavelengthNm: number;
  effWavelengthUnit: "NM" | "UM";
  zeroPoint: number;
};

export type ManifestTable = {
  slug: string;
  name: string;
  hash: string;
  version: number;
};

export type ManifestObject = {
  slug: string;
  name: string;
  version: number;
  previewHash: string;
  cubeHash: string;
};

export type Manifest = {
  filters: ManifestFilter[];
  tables: ManifestTable[];
  objects: ManifestObject[];
  instrumentParams: { version: number; params: InstrumentParams };
};

let cachedManifest: Manifest | null = null;
let pendingFetch: Promise<Manifest> | null = null;

async function fetchManifest(): Promise<Manifest> {
  if (cachedManifest) return cachedManifest;
  if (!pendingFetch) {
    pendingFetch = fetch("/api/manifest")
      .then(async (res) => {
        if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
        const data = (await res.json()) as Manifest;
        cachedManifest = data;
        return data;
      })
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(cachedManifest);
  const [loading, setLoading] = useState(!cachedManifest);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedManifest) {
      setManifest(cachedManifest);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchManifest()
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { manifest, loading, error };
}

// Allows manual invalidation if you've performed an upload and want subsequent
// `useManifest` calls to see the fresh state. Not currently used.
export function invalidateManifest() {
  cachedManifest = null;
}
