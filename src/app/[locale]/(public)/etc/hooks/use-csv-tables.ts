"use client";

import { useState, useEffect } from "react";
import { CSVParser, CSVFile } from "@/lib/parser";
import { useIndexedDB } from "@/hooks/use-indexed-db";
import { DB_NAME, DB_STORES } from "../lib/db";

const TABLE_PATHS = {
  background: "/data/tables/Background.csv",
  enclosedEnergy: "/data/tables/EnclosedEnergy.csv",
  hrThroughput: "/data/tables/HR-Throughput.csv",
  lrThroughput: "/data/tables/LR-Throughput.csv",
} as const;

type TableName = keyof typeof TABLE_PATHS;

export type CSVTables = Record<TableName, CSVFile>;

export interface UseCSVTablesReturn {
  tables: CSVTables | null;
  loading: boolean;
  error: string | null;
}

export function useCSVTables(): UseCSVTablesReturn {
  const [tables, setTables] = useState<CSVTables | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const store = useIndexedDB<CSVFile>(DB_NAME, DB_STORES, "tables");

  useEffect(() => {
    let cancelled = false;

    const names = Object.keys(TABLE_PATHS) as TableName[];

    async function loadTable(name: TableName): Promise<CSVFile> {
      console.log(`Loading table ${name}...`);

      const cached = await store.get(name);
      if (cached) return cached;

      const res = await fetch(TABLE_PATHS[name]);
      if (!res.ok) throw new Error(`Failed to fetch ${TABLE_PATHS[name]}: ${res.status}`);

      const text = await res.text();
      const rows = new CSVParser(text).parse();

      await store.put(name, rows);
      return rows;
    }

    Promise.all(names.map((name) => loadTable(name)))
      .then((results) => {
        if (cancelled) return;

        const loaded = {} as CSVTables;
        names.forEach((name, i) => {
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
  }, [store.get, store.put]);

  return { tables, loading, error };
}
