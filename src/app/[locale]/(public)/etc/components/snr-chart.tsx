"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SNRDataPoint } from "../lib/types";

interface SNRChartProps {
  data: SNRDataPoint[];
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
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value) => [Number(value).toFixed(2), t("snr-label")]}
              labelFormatter={(label) => `${label} nm`}
            />
            <Line
              type="monotone"
              dataKey="snr"
              className="stroke-chart-1"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
