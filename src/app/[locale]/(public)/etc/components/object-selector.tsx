"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Heatmap, HeatmapProvider, useHeatmapSelectionContext, type HeatmapCellData } from "@/components/chart/heatmap";
import { Download, Check, SquareDashed, TriangleDashed, Eraser } from "lucide-react";
import type { ObjectEntry } from "../lib/types";
import type { UseObjectStoreReturn } from "../hooks/use-object-store";
import { CircularProgress } from "@/components/circular-progress";

interface ObjectSelectorProps {
  objects: ObjectEntry[];
  selectedObject: ObjectEntry | null;
  onSelect: (obj: ObjectEntry | null) => void;
  store: UseObjectStoreReturn;
}

function SelectionControls() {
  const { selectionMode, setSelectionMode, clearSelections } = useHeatmapSelectionContext();

  return (
    <div className="flex flex-col gap-2 mt-12">
      <Button
        onClick={() => setSelectionMode("rectangle")}
        variant={selectionMode === "rectangle" ? "default" : "outline"}
        size="icon-sm"
      >
        <SquareDashed />
      </Button>
      <Button
        onClick={() => setSelectionMode("polygon")}
        variant={selectionMode === "polygon" ? "default" : "outline"}
        size="icon-sm"
      >
        <TriangleDashed />
      </Button>
      <Button onClick={clearSelections} variant="destructive" size="icon-sm">
        <Eraser />
      </Button>
    </div>
  );
}

export function ObjectSelector({ objects, selectedObject, onSelect, store }: ObjectSelectorProps) {
  const t = useTranslations("etc.object");

  return (
    <HeatmapProvider>
      <Card className="bg-background/60 backdrop-blur-sm border h-full">
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select
              value={selectedObject?.id ?? ""}
              onValueChange={(id) => {
                const obj = objects.find((o) => o.id === id) ?? null;
                onSelect(obj);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("select-placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {objects.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedObject && !store.cubeReady && store.downloadProgress === null && (
              <Button variant="outline" size="icon" onClick={store.downloadCube} title={t("download")}>
                <Download className="size-4" />
              </Button>
            )}

            {store.downloadProgress !== null && (
              <Button variant="outline" size="icon" disabled className="pointer-events-none">
                <CircularProgress value={store.downloadProgress} />
              </Button>
            )}

            {store.cubeReady && (
              <Button variant="outline" size="icon" disabled className="pointer-events-none">
                <Check className="size-4" />
              </Button>
            )}
          </div>

          {/* Preview heatmap */}
          <div className="flex justify-center">
            {store.preview && (
              <div className="flex justify-center gap-4">
                <Heatmap
                  values={store.preview}
                  width={570}
                  height={550}
                  colormap="inferno"
                  showAxes={false}
                  tooltip
                  selectable
                  renderTooltip={(cell: HeatmapCellData) => (
                    <>
                      <p>
                        x: {cell.x}, y: {cell.y}
                      </p>
                      <div className="flex items-center mt-2 min-w-25">
                        <div style={{ backgroundColor: cell.color }} className="inline-block mr-2 w-3 h-3" />
                        <p className="mr-auto pr-5 text-muted-foreground">Value</p>
                        <span>{cell.value.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                />
                <SelectionControls />
              </div>
            )}
          </div>

          {store.error && <p className="text-destructive text-sm">{store.error}</p>}
        </CardContent>
      </Card>
    </HeatmapProvider>
  );
}
