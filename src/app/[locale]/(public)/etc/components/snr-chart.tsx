"use client";

import { useTranslations } from "next-intl";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SNRDataPoint } from "../lib/types";

interface SNRChartProps {
  data: SNRDataPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
  snrLabel,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string | number;
  snrLabel: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card shadow-2xl px-2.5 py-1.5 rounded font-mono text-card-foreground text-xs pointer-events-none">
      <p>{label} nm</p>
      <div className="flex items-center mt-2 min-w-25">
        <div className="inline-block bg-chart-1 mr-2 rounded-full w-3 h-3" />
        <p className="mr-auto pr-5 text-muted-foreground">{snrLabel}</p>
        <span>{Number(payload[0].value).toFixed(2)}</span>
      </div>
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
      <CardContent className="outline-none focus:outline-none **:focus:outline-none **:outline-none">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="wavelength"
              label={{ value: t("wavelength-label"), position: "insideBottom", offset: -10 }}
              className="fill-muted-foreground text-xs"
            />
            <YAxis
              label={{ value: t("snr-label"), angle: -90, position: "insideLeft", offset: 0 }}
              className="fill-muted-foreground text-xs"
            />
            <Tooltip content={<CustomTooltip snrLabel={t("snr-label")} />} animationDuration={0} />
            <Line
              type="monotone"
              dataKey="snr"
              className="stroke-chart-1"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              animationDuration={0}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
