"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ObjectEntry } from "../lib/types";
import { FITSParser, type FITSFile } from "@/lib/parser";

const DB_NAME = "etc-object-store";
const DB_VERSION = 1;
const STORE_NAME = "cubes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCubeFromDB(objectId: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(objectId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveCubeToDB(objectId: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, objectId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface UseObjectStoreReturn {
  /** 2D flux array for heatmap preview (null until loaded) */
  preview: number[][] | null;
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

export function useObjectStore(object: ObjectEntry | null): UseObjectStoreReturn {
  const [preview, setPreview] = useState<number[][] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cube, setCube] = useState<FITSFile | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        const hdu = file.get("FLUX");
        if (!hdu) throw new Error("FLUX extension not found");

        const flux = hdu.data as number[][];
        setPreview(flux);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load preview");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    // Check if cube is already in IndexedDB and parse it
    getCubeFromDB(object.id)
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
      .then((buf) => saveCubeToDB(object.id, buf).then(() => buf))
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
