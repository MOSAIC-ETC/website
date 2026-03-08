"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ETCForm } from "./components/etc-form";
import { SNRChart } from "./components/snr-chart";
import { calculateSNR } from "./lib/calculate";
import type { SNRDataPoint } from "./lib/types";
import type { ETCFormSchema } from "./lib/schema";

export default function ETCPage() {
  const t = useTranslations("etc");
  const [chartData, setChartData] = useState<SNRDataPoint[]>([]);

  function handleSubmit(values: ETCFormSchema) {
    const data = calculateSNR(values);
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
        <div className="items-start gap-6 grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
          <ETCForm onSubmit={handleSubmit} />
          <SNRChart data={chartData} />
        </div>
      </div>
    </main>
  );
}
