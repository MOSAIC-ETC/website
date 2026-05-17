"use client";

import { useEffect, useState } from "react";

import { useIndexedDB } from "@/hooks/use-indexed-db";
import { useManifest } from "@/hooks/use-manifest";
import { CSVFile, CSVParser } from "@/lib/parser";

import { DB_NAME, DB_STORES } from "../lib/db";

type TableName = "background" | "enclosedEnergy" | "hrThroughput" | "lrThroughput";
const TABLE_NAMES: TableName[] = ["background", "enclosedEnergy", "hrThroughput", "lrThroughput"];

export type CSVTables = Record<TableName, CSVFile>;

export interface UseCSVTablesReturn {
  tables: CSVTables | null;
  loading: boolean;
  error: string | null;
}

// IndexedDB entries are { data, hash } so we can detect when the server has a
// newer version and evict on hash mismatch.
type Cached = { data: CSVFile; hash: string };

export function useCSVTables(): UseCSVTablesReturn {
  const [tables, setTables] = useState<CSVTables | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { manifest, loading: manifestLoading, error: manifestError } = useManifest();
  const store = useIndexedDB<Cached>(DB_NAME, DB_STORES, "tables");

  useEffect(() => {
    if (manifestError) {
      setError(manifestError);
      setLoading(false);
      return;
    }
    if (manifestLoading || !manifest) return;

    let cancelled = false;

    const hashBySlug = new Map(manifest.tables.map((t) => [t.slug, t.hash]));

    async function loadTable(name: TableName): Promise<CSVFile> {
      const expectedHash = hashBySlug.get(name);
      if (!expectedHash) throw new Error(`Table not in manifest: ${name}`);

      const cached = await store.get(name);
      if (cached && cached.hash === expectedHash && cached.data) {
        return cached.data;
      }

      const res = await fetch(`/api/files/tables/${name}`);
      if (!res.ok) throw new Error(`Failed to fetch table ${name}: ${res.status}`);
      const text = await res.text();
      const rows = new CSVParser(text).parse();

      await store.put(name, { data: rows, hash: expectedHash });
      return rows;
    }

    Promise.all(TABLE_NAMES.map((name) => loadTable(name)))
      .then((results) => {
        if (cancelled) return;
        const loaded = {} as CSVTables;
        TABLE_NAMES.forEach((name, i) => {
          loaded[name] = results[i];
        });
        setTables(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load tables");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [manifest, manifestLoading, manifestError, store.get, store.put]);

  return { tables, loading, error };
}
