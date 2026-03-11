"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ETCForm } from "./components/etc-form";
import { SNRChart } from "./components/snr-chart";
import { calculateSNR } from "./lib/calculate";
import { fetchFilterCurve, FILTERS } from "./lib/filters";
import { OBJECTS } from "./lib/objects";
import { useObjectStore } from "./hooks/use-object-store";
import type { ObjectEntry, SNRDataPoint } from "./lib/types";
import type { HeatmapCell } from "@/components/chart/heatmap";
import type { ETCFormSchema } from "./lib/schema";

export default function ETCPage() {
  const t = useTranslations("etc");

  const [chartData, setChartData] = useState<SNRDataPoint[]>([]);
  const [selectedObject, setSelectedObject] = useState<ObjectEntry | null>(OBJECTS[0] ?? null);
  const store = useObjectStore(selectedObject);

  async function handleSubmit(values: ETCFormSchema, selection: HeatmapCell[]) {
    if (!store.cube) {
      // TODO: use toast to display warning
      return;
    }

    const filter = FILTERS.find((f) => f.id === values.filterId);
    if (!filter) return;

    const filterCurve = await fetchFilterCurve(filter);
    const data = calculateSNR(values, filter, filterCurve, selection, store.cube);
    setChartData(data);
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
        <ETCForm
          filters={FILTERS}
          objects={OBJECTS}
          selectedObject={selectedObject}
          onSelectObject={setSelectedObject}
          store={store}
          onSubmit={handleSubmit}
        />
        <SNRChart data={chartData} />
      </div>
    </main>
  );
}
