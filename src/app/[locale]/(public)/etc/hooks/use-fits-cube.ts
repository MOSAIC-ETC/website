"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useIndexedDB } from "@/hooks/use-indexed-db";
import { type FITSFile, FITSParser } from "@/lib/parser";

import { DB_NAME, DB_STORES } from "../lib/db";
import type { ObjectEntry } from "../lib/types";

export interface UseFITSCubeReturn {
  /** 2D flux array for heatmap preview (null until loaded) */
  preview: FITSFile | null;
  /** Whether the preview is loading */
  previewLoading: boolean;
  /** Parsed FITS file for the full data cube (null until downloaded/loaded) */
  cube: FITSFile | null;
  /** Whether the full data cube is stored and ready */
  cubeReady: boolean;
  /** Download progress 0-100 (null when not downloading) */
  downloadProgress: number | null;
  /** Start downloading the full cube */
  downloadCube: () => void;
  /** Error message if something went wrong */
  error: string | null;
}

export function useFITSCube(object: ObjectEntry | null): UseFITSCubeReturn {
  const [preview, setPreview] = useState<FITSFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cube, setCube] = useState<FITSFile | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const store = useIndexedDB<ArrayBuffer>(DB_NAME, DB_STORES, "cubes");

  // Reset state when object changes
  useEffect(() => {
    // Abort any in-flight download
    abortRef.current?.abort();
    abortRef.current = null;

    setPreview(null);
    setPreviewLoading(false);
    setCube(null);
    setDownloadProgress(null);
    setError(null);

    if (!object) return;

    // Load preview
    let cancelled = false;
    setPreviewLoading(true);

    fetch(object.previewPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load preview: ${res.status}`);

        return res.arrayBuffer();
      })
      .then((buf) => {
        if (cancelled) return;

        const file = new FITSParser(buf).parse();
        setPreview(file);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load preview");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    // Check if cube is already in IndexedDB and parse it
    store
      .get(object.id)
      .then((stored) => {
        if (!cancelled && stored) {
          setCube(new FITSParser(stored).parse());
        }
      })
      .catch(() => {
        // Ignore - just means cube isn't stored yet
      });

    return () => {
      cancelled = true;
    };
  }, [object]);

  const downloadCube = useCallback(() => {
    console.log("Download cube called");

    if (!object || downloadProgress !== null) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setDownloadProgress(0);
    setError(null);

    fetch(object.cubePath, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to download cube: ${res.status}`);

        const contentLength = res.headers.get("Content-Length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = res.body?.getReader();
        if (!reader) throw new Error("ReadableStream not supported");

        const chunks: Uint8Array[] = [];
        let loaded = 0;

        const pump = (): Promise<ArrayBuffer> =>
          reader.read().then(({ done, value }) => {
            if (done) {
              const result = new Uint8Array(loaded);
              let offset = 0;
              for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
              }
              return result.buffer;
            }
            chunks.push(value);
            loaded += value.length;
            if (total > 0) {
              setDownloadProgress(Math.round((loaded / total) * 100));
            }
            return pump();
          });

        return pump();
      })
      .then((buf) => store.put(object.id, buf).then(() => buf))
      .then((buf) => {
        setCube(new FITSParser(buf).parse());
        setDownloadProgress(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Download failed");
        setDownloadProgress(null);
      });
  }, [object, downloadProgress]);

  const cubeReady = cube !== null;

  return { preview, previewLoading, cube, cubeReady, downloadProgress, downloadCube, error };
}
