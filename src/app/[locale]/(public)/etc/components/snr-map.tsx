"use client";

import { Download, Grid3X3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Heatmap } from "@/components/chart/heatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

import { downloadSNRMapFITS } from "../lib/export";
import type { SubcubeFormValues } from "../lib/types";

interface SNRMapProps {
  data: number[][];
  formValues?: SubcubeFormValues;
}

export function SNRMap({ data, formValues }: SNRMapProps) {
  const t = useTranslations("etc.snr-map");
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm border">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center items-center">
          <div className="flex flex-col items-center gap-3 py-12 border border-dashed rounded-lg w-full text-center">
            <Grid3X3 className="size-10 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">{t("empty-state")}</p>
            <p className="text-muted-foreground/60 text-xs">{t("empty-state-hint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border">
      <CardHeader className="flex flex-row justify-between items-center gap-2">
        <CardTitle>{t("title")}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadSNRMapFITS(data, formValues)}
          aria-label={t("download-fits")}
        >
          <Download />
          {t("download-fits")}
        </Button>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Heatmap
          values={data}
          width={isMobile ? 340 : 520}
          height={isMobile ? 300 : 470}
          colormap="inferno"
          tooltip
          renderTooltip={(cell) => (
            <>
              <p>
                x: {cell.x}, y: {cell.y}
              </p>
              <div className="flex items-center mt-2 min-w-25">
                <div style={{ backgroundColor: cell.color }} className="inline-block mr-2 w-3 h-3" />
                <p className="mr-auto pr-5 text-muted-foreground">SNR</p>
                <span>{cell.value.toFixed(2)}</span>
              </div>
            </>
          )}
          className="max-w-full"
        />
      </CardContent>
    </Card>
  );
}
