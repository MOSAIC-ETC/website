"use client";

import { useTranslations } from "next-intl";

import { Heatmap } from "@/components/chart/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface SNRMapProps {
  data: number[][];
}

export function SNRMap({ data }: SNRMapProps) {
  const t = useTranslations("etc.snr-map");
  const isMobile = useIsMobile();

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
      <CardContent className="flex justify-center">
        <Heatmap
          values={data}
          width={isMobile ? 340 : 560}
          height={isMobile ? 300 : 510}
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
        />
      </CardContent>
    </Card>
  );
}
