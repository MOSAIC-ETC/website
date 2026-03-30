"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";

import type { HeatmapCell } from "@/components/chart/heatmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ETCForm } from "./components/etc-form";
import { SNRChart } from "./components/snr-chart";
import { SNRMap } from "./components/snr-map";
import { SubcubeForm } from "./components/subcube-form";
import { useCSVTables } from "./hooks/use-csv-tables";
import { useFITSCube } from "./hooks/use-fits-cube";
import { calculateSNR } from "./lib/calculate";
import { calculate2DSNR } from "./lib/calculate-2d";
import { FILTERS, fetchFilterCurve } from "./lib/filters";
import { OBJECTS } from "./lib/objects";
import type { ETCFormSchema, SubcubeFormSchema } from "./lib/schema";
import type { ObjectEntry, SNRDataPoint } from "./lib/types";

export default function ETCPage() {
  const t = useTranslations("etc");

  const [chartData, setChartData] = useState<SNRDataPoint[]>([]);
  const [snrMapData, setSnrMapData] = useState<number[][]>([]);
  const [selectedObject, setSelectedObject] = useState<ObjectEntry | null>(OBJECTS[0] ?? null);

  const object = useFITSCube(selectedObject);
  const tables = useCSVTables();

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

    const filterCurve = await fetchFilterCurve(filter);
    const data = calculateSNR(values, filter, filterCurve, selection, object.cube, tables.tables);
    setChartData(data);
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

    const filterCurve = await fetchFilterCurve(filter);
    const data = calculate2DSNR(values, filter, filterCurve, object.cube, tables.tables);
    setSnrMapData(data);
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
      <div className="space-y-6 mx-auto p-6 max-w-7xl">
        <h1 className="font-bold text-2xl">{t("title")}</h1>
        <Tabs defaultValue="snr-spectrum">
          <TabsList>
            <TabsTrigger value="snr-spectrum">{t("tabs.snr-spectrum")}</TabsTrigger>
            <TabsTrigger value="snr-map">{t("tabs.snr-map")}</TabsTrigger>
          </TabsList>
          <TabsContent value="snr-spectrum" className="space-y-6 mt-6">
            <ETCForm
              filters={FILTERS}
              objects={OBJECTS}
              selectedObject={selectedObject}
              onSelectObject={setSelectedObject}
              object={object}
              onSubmit={handleSubmit}
            />
            <SNRChart data={chartData} />
          </TabsContent>
          <TabsContent value="snr-map" className="space-y-6 mt-6">
            <SubcubeForm
              filters={FILTERS}
              objects={OBJECTS}
              selectedObject={selectedObject}
              onSelectObject={setSelectedObject}
              object={object}
              onSubmit={handleSubcubeSubmit}
            />
            <SNRMap data={snrMapData} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
