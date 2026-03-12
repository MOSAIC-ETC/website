"use client";

import { useCallback, useRef } from "react";

function openDB(dbName: string, storeNames: readonly string[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of storeNames) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function useIndexedDB<T>(dbName: string, storeNames: readonly string[], storeName: string) {
  const dbRef = useRef<Promise<IDBDatabase> | null>(null);
  const dbNameRef = useRef(dbName);
  const storeNamesRef = useRef(storeNames);
  const storeNameRef = useRef(storeName);

  const get = useCallback(async (key: string): Promise<T | null> => {
    if (!dbRef.current) {
      dbRef.current = openDB(dbNameRef.current, storeNamesRef.current);
    }
    const db = await dbRef.current;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNameRef.current, "readonly");
      const store = tx.objectStore(storeNameRef.current);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const put = useCallback(async (key: string, value: T): Promise<void> => {
    if (!dbRef.current) {
      dbRef.current = openDB(dbNameRef.current, storeNamesRef.current);
    }
    const db = await dbRef.current;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNameRef.current, "readwrite");
      const store = tx.objectStore(storeNameRef.current);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, []);

  return { get, put };
}
