"use client";

import { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Download, Check, SquareDashed, TriangleDashed, Eraser } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/circular-progress";
import {
  Heatmap,
  HeatmapProvider,
  useHeatmapSelectionContext,
  type HeatmapCell,
  type HeatmapCellData,
} from "@/components/chart/heatmap";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MagnitudeUnit,
  RedshiftUnit,
  Instrument,
  SkyCondition,
  type FilterEntry,
  type ObjectEntry,
} from "../lib/types";
import { etcFormSchema, type ETCFormSchema } from "../lib/schema";
import type { UseObjectStoreReturn } from "../hooks/use-object-store";

interface ETCFormProps {
  filters: FilterEntry[];
  objects: ObjectEntry[];
  selectedObject: ObjectEntry | null;
  onSelectObject: (obj: ObjectEntry | null) => void;
  store: UseObjectStoreReturn;
  onSubmit: (values: ETCFormSchema, heatmapSelection: HeatmapCell[]) => void;
  disabled?: boolean;
}

function enumOptions<T extends Record<string, string>>(enumObj: T) {
  return Object.entries(enumObj).map(([key, label]) => (
    <SelectItem key={key} value={label}>
      {label}
    </SelectItem>
  ));
}

export function ETCForm({ filters, objects, selectedObject, onSelectObject, store, onSubmit, disabled }: ETCFormProps) {
  const tObject = useTranslations("etc.object");

  return (
    <HeatmapProvider>
      <ETCFormInner
        filters={filters}
        onSubmit={onSubmit}
        disabled={disabled}
        objects={objects}
        selectedObject={selectedObject}
        onSelectObject={onSelectObject}
        store={store}
        tObject={tObject}
      />
    </HeatmapProvider>
  );
}

function SelectionControls() {
  const { selectionMode, setSelectionMode, clearSelections } = useHeatmapSelectionContext();

  return (
    <div className="flex lg:flex-col gap-2 lg:mt-10">
      <Button
        type="button"
        onClick={() => setSelectionMode("rectangle")}
        variant={selectionMode === "rectangle" ? "default" : "outline"}
        size="icon-sm"
        title="Rectangle selection"
      >
        <SquareDashed />
      </Button>
      <Button
        type="button"
        onClick={() => setSelectionMode("polygon")}
        variant={selectionMode === "polygon" ? "default" : "outline"}
        size="icon-sm"
        title="Polygon selection"
      >
        <TriangleDashed />
      </Button>
      <Button type="button" onClick={clearSelections} variant="destructive" size="icon-sm" title="Clear selection">
        <Eraser />
      </Button>
    </div>
  );
}

interface ETCFormInnerProps extends ETCFormProps {
  tObject: ReturnType<typeof useTranslations>;
}

function ETCFormInner({
  filters,
  objects,
  selectedObject,
  onSelectObject,
  store,
  onSubmit,
  disabled,
  tObject,
}: ETCFormInnerProps) {
  const t = useTranslations("etc.form");
  const isMobile = useIsMobile();
  const { selection } = useHeatmapSelectionContext();

  const [selectionError, setSelectionError] = useState(false);

  const form = useForm<ETCFormSchema>({
    resolver: zodResolver(etcFormSchema) as Resolver<ETCFormSchema>,
    defaultValues: {
      objectId: selectedObject?.id ?? "",
      numberOfExposures: 1,
      exposureTime: 3600,
      magnitude: 20,
      magnitudeUnit: MagnitudeUnit.AB,
      wavelengthMin: 400,
      wavelengthMax: 900,
      redshift: 0,
      redshiftUnit: RedshiftUnit.Z,
      filterId: filters[0]?.id || "",
      instrument: Instrument.MOS_VIS,
      skyCondition: SkyCondition.NO_MOON,
    },
  });

  const watchedObjectId = form.watch("objectId");

  useEffect(() => {
    const obj = objects.find((o) => o.id === watchedObjectId) ?? null;
    onSelectObject(obj);
  }, [watchedObjectId, objects, onSelectObject]);

  useEffect(() => {
    if (selection.length > 0) setSelectionError(false);
  }, [selection]);

  function handleFormSubmit(values: ETCFormSchema) {
    if (selection.length === 0) {
      setSelectionError(true);
      return;
    }
    setSelectionError(false);
    onSubmit(values, selection);
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-base">{t("parameters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="items-start gap-6 grid grid-cols-1 lg:grid-cols-2">
              <div className="gap-x-4 gap-y-4 grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="numberOfExposures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("number-of-exposures")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exposureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("exposure-time")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="magnitude"
                  render={({ field: magField }) => (
                    <FormItem>
                      <FormLabel>{t("magnitude")}</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input type="number" step="any" className="border-r-0 rounded-r-none" {...magField} />
                        </FormControl>
                        <FormField
                          control={form.control}
                          name="magnitudeUnit"
                          render={({ field: unitField }) => (
                            <Select value={unitField.value} onValueChange={unitField.onChange}>
                              <SelectTrigger className="shadow-none rounded-l-none w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>{enumOptions(MagnitudeUnit)}</SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>{t("wavelength-range")}</FormLabel>
                  <div className="flex items-center gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="wavelengthMin"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" min={0} step="any" placeholder={t("wavelength-min")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <span className="text-muted-foreground">–</span>
                    <FormField
                      control={form.control}
                      name="wavelengthMax"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" min={0} step="any" placeholder={t("wavelength-max")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="redshift"
                  render={({ field: redshiftField }) => (
                    <FormItem>
                      <FormLabel>{t("redshift")}</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            className="border-r-0 rounded-r-none"
                            {...redshiftField}
                          />
                        </FormControl>
                        <FormField
                          control={form.control}
                          name="redshiftUnit"
                          render={({ field: unitField }) => (
                            <Select value={unitField.value} onValueChange={unitField.onChange}>
                              <SelectTrigger className="shadow-none rounded-l-none w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>{enumOptions(RedshiftUnit)}</SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="filterId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("filter")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("select-filter")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filters.map((filter) => (
                            <SelectItem key={filter.id} value={filter.id}>
                              {filter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("instrument")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>{enumOptions(Instrument)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skyCondition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sky-condition")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>{enumOptions(SkyCondition)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="objectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tObject("title")}</FormLabel>
                      <div className="flex gap-2">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={tObject("select-placeholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objects.map((obj) => (
                              <SelectItem key={obj.id} value={obj.id}>
                                {obj.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedObject && !store.cubeReady && store.downloadProgress === null && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={store.downloadCube}
                            title={tObject("download")}
                          >
                            <Download className="size-4" />
                          </Button>
                        )}

                        {store.downloadProgress !== null && (
                          <Button type="button" variant="outline" size="icon" disabled className="pointer-events-none">
                            <CircularProgress value={store.downloadProgress} />
                          </Button>
                        )}

                        {store.cubeReady && (
                          <Button type="button" variant="outline" size="icon" disabled className="pointer-events-none">
                            <Check className="size-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {store.previewLoading && <Skeleton className="rounded-md w-full aspect-square" />}

                {store.preview && (
                  <div className="flex lg:flex-row flex-col justify-center items-center lg:items-start gap-3">
                    <Heatmap
                      values={store.preview}
                      width={isMobile ? 280 : 520}
                      height={isMobile ? 260 : 500}
                      colormap="inferno"
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
                      className="max-w-full"
                    />
                    <SelectionControls />
                  </div>
                )}

                {selectionError && <p className="text-destructive text-sm">{tObject("selection-required")}</p>}
                {store.error && <p className="text-destructive text-sm">{store.error}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={disabled}>
              {t("calculate-snr")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
