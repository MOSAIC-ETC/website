"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";

import type { HeatmapCell } from "@/components/chart/heatmap";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ETCForm } from "./components/etc-form";
import { SNRChart } from "./components/snr-chart";
import { SNRMap } from "./components/snr-map";
import { SubcubeForm } from "./components/subcube-form";
import { useCSVTables } from "./hooks/use-csv-tables";
import { useFITSCube } from "./hooks/use-fits-cube";
import { FILTERS, fetchFilterCurve } from "./lib/filters";
import { OBJECTS } from "./lib/objects";
import type { ETCFormSchema, SubcubeFormSchema } from "./lib/schema";
import type { ETCFormValues, ObjectEntry, SNRDataPoint } from "./lib/types";
import type { WorkerRequest, WorkerResponse } from "./lib/worker";

export default function ETCPage() {
  const t = useTranslations("etc");

  const [chartData, setChartData] = useState<SNRDataPoint[]>([]);
  const [chartFormValues, setChartFormValues] = useState<ETCFormValues | undefined>();
  const [snrMapData, setSnrMapData] = useState<number[][]>([]);
  const [snrMapFormValues, setSnrMapFormValues] = useState<SubcubeFormSchema | undefined>();
  const [selectedObject, setSelectedObject] = useState<ObjectEntry | null>(OBJECTS[0] ?? null);
  const [isCalculating, setIsCalculating] = useState(false);

  const object = useFITSCube(selectedObject);
  const tables = useCSVTables();

  const workerRef = useRef<Worker | null>(null);
  const nextIdRef = useRef(0);
  const pendingRef = useRef<Map<number, (response: WorkerResponse) => void>>(new Map());

  useEffect(() => {
    const worker = new Worker(new URL("./lib/worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const resolve = pendingRef.current.get(response.id);
      if (resolve) {
        pendingRef.current.delete(response.id);
        resolve(response);
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const dispatch = useCallback((request: WorkerRequest): Promise<WorkerResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error("Worker not initialized"));
        return;
      }
      pendingRef.current.set(request.id, resolve);
      workerRef.current.postMessage(request);
    });
  }, []);

  function nextRequest<T extends Omit<WorkerRequest, "id">>(req: T): T & { id: number } {
    return { ...req, id: nextIdRef.current++ } as T & { id: number };
  }

  async function handleSubmit(values: ETCFormSchema, selection: HeatmapCell[]) {
    if (!object.cube) {
      toast.error(t("object-not-loaded"));
      return;
    }

    if (!tables.tables) {
      toast.error(t("tables-not-loaded"));
      return;
    }

    const filter = FILTERS.find((f) => f.id === values.filterId);
    if (!filter) return;

    const flux = object.cube.get("FLUX")?.data as number[][][] | undefined;
    const wavelengths = object.cube.get("WAVE")?.data as number[] | undefined;
    if (!flux || !wavelengths) {
      toast.error(t("object-not-loaded"));
      return;
    }

    setIsCalculating(true);
    try {
      const filterCurve = await fetchFilterCurve(filter);
      const etcValues: ETCFormValues = { ...values, selection };
      const response = await dispatch(
        nextRequest({
          type: "snr",
          values: etcValues,
          filter,
          filterCurve,
          flux,
          wavelengths,
          tables: tables.tables,
        }),
      );
      if (response.type === "error") {
        toast.error(response.message);
      } else if (response.type === "snr") {
        setChartData(response.data);
        setChartFormValues(etcValues);
      }
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSubcubeSubmit(values: SubcubeFormSchema) {
    if (!object.cube) {
      toast.error(t("object-not-loaded"));
      return;
    }

    if (!tables.tables) {
      toast.error(t("tables-not-loaded"));
      return;
    }

    const filter = FILTERS.find((f) => f.id === values.filterId);
    if (!filter) return;

    const flux = object.cube.get("FLUX")?.data as number[][][] | undefined;
    const wavelengths = object.cube.get("WAVE")?.data as number[] | undefined;
    if (!flux || !wavelengths) {
      toast.error(t("object-not-loaded"));
      return;
    }

    setIsCalculating(true);
    try {
      const filterCurve = await fetchFilterCurve(filter);
      const response = await dispatch(
        nextRequest({
          type: "snr-2d",
          values,
          filter,
          filterCurve,
          flux,
          wavelengths,
          tables: tables.tables,
        }),
      );
      if (response.type === "error") {
        toast.error(response.message);
      } else if (response.type === "snr-2d") {
        setSnrMapData(response.data);
        setSnrMapFormValues(values);
      }
    } finally {
      setIsCalculating(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-4rem)]">
      <div className="-z-10 absolute inset-0">
        <Image
          src="/assets/images/square-alt-grid.svg"
          alt="background pattern"
          className="opacity-60 dark:opacity-40 dark:invert object-cover mask-[radial-gradient(75%_75%_at_center,white,transparent)]"
          priority
          fill
        />
      </div>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-screen-2xl">
        <div className="mb-6">
          <h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">MOSAIC / ELT &mdash; {t("subtitle")}</p>
          <Separator className="mt-4" />
        </div>
        <Tabs defaultValue="snr-spectrum">
          <TabsList>
            <TabsTrigger value="snr-spectrum">{t("tabs.snr-spectrum")}</TabsTrigger>
            <TabsTrigger value="snr-map">{t("tabs.snr-map")}</TabsTrigger>
          </TabsList>
          <TabsContent value="snr-spectrum" className="mt-6">
            <div className="items-start gap-6 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <ETCForm
                filters={FILTERS}
                objects={OBJECTS}
                selectedObject={selectedObject}
                onSelectObject={setSelectedObject}
                object={object}
                onSubmit={handleSubmit}
                disabled={isCalculating}
              />
              <div className="lg:top-6 lg:sticky">
                <SNRChart data={chartData} formValues={chartFormValues} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="snr-map" className="mt-6">
            <div className="items-start gap-6 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <SubcubeForm
                filters={FILTERS}
                objects={OBJECTS}
                selectedObject={selectedObject}
                onSelectObject={setSelectedObject}
                object={object}
                onSubmit={handleSubcubeSubmit}
                disabled={isCalculating}
              />
              <div className="lg:top-6 lg:sticky">
                <SNRMap data={snrMapData} formValues={snrMapFormValues} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
