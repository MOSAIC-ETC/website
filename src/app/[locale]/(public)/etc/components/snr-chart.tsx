"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { InteractiveChart } from "@/components/interactive-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";

import type { SNRDataPoint } from "../lib/types";

interface SNRChartProps {
  data: SNRDataPoint[];
}

const chartConfig: ChartConfig = {
  snr: {
    label: "SNR",
    color: "var(--chart-1)",
  },
};

const lines = [{ dataKey: "snr" as const }];

function SNRTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background shadow-xl px-2.5 py-1.5 border border-border/50 rounded-lg min-w-32 text-xs">
      <p className="mb-1.5 font-medium">{Number(label).toFixed(2)} nm</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="rounded-[2px] w-2.5 h-2.5 shrink-0"
              style={{ backgroundColor: `var(--color-${entry.dataKey})` }}
            />
            <span className="text-muted-foreground">{chartConfig[entry.dataKey]?.label ?? entry.dataKey}</span>
          </div>
          <span className="font-mono font-medium tabular-nums">{Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function SNRChart({ data }: SNRChartProps) {
  const t = useTranslations("etc.chart");

  if (data.length === 0) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm border">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64 text-muted-foreground text-sm">
          {t("empty-state")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <InteractiveChart
          data={data}
          chartConfig={chartConfig}
          lines={lines}
          xAxisKey="wavelength"
          xAxisLabel={t("wavelength-label")}
          yAxisLabel={t("snr-label")}
          xAxisTickFormatter={(value) => Number(value).toFixed(1)}
          tooltipContent={<SNRTooltipContent />}
          brushTickFormatter={(value) => Number(value).toFixed(0)}
          height={320}
          showLegend={false}
          resetLabel={<RotateCw />}
        />
      </CardContent>
    </Card>
  );
}
