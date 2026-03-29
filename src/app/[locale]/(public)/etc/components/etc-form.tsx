"use client";

import { useEffect, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChartLine, Check, Download, Eraser, Info, SquareDashedMousePointer } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Heatmap,
  type HeatmapCell,
  type HeatmapCellData,
  HeatmapProvider,
  useHeatmapSelectionContext,
} from "@/components/chart/heatmap";
import { CircularProgress } from "@/components/circular-progress";
import { PolygonDashedMousePointer } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

import type { UseFITSCubeReturn } from "../hooks/use-fits-cube";
import { fetchFilterCurve } from "../lib/filters";
import { type ETCFormSchema, createEtcFormSchema } from "../lib/schema";
import {
  type FilterEntry,
  Instrument,
  MagnitudeUnit,
  type NMFile,
  type ObjectEntry,
  RedshiftUnit,
  SkyCondition,
} from "../lib/types";

interface ETCFormProps {
  filters: FilterEntry[];
  objects: ObjectEntry[];
  selectedObject: ObjectEntry | null;
  onSelectObject: (obj: ObjectEntry | null) => void;
  object: UseFITSCubeReturn;
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

function FilterTooltipContent({
  active,
  payload,
  label,
  formatWavelength,
  transmissionText,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string | number;
  formatWavelength: (label: string | number | undefined) => string;
  transmissionText: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background shadow-xl px-2.5 py-1.5 border border-border/50 rounded-lg min-w-32 text-xs">
      <p className="mb-1.5 font-medium">{formatWavelength(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="rounded-[2px] w-2.5 h-2.5 shrink-0" style={{ backgroundColor: `var(--color-chart-1)` }} />
            <span className="text-muted-foreground">{transmissionText}</span>
          </div>
          <span className="font-mono font-medium tabular-nums">{(Number(entry.value) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

export function ETCForm({
  filters,
  objects,
  selectedObject,
  onSelectObject,
  object,
  onSubmit,
  disabled,
}: ETCFormProps) {
  return (
    <HeatmapProvider>
      <ETCFormInner
        filters={filters}
        onSubmit={onSubmit}
        disabled={disabled}
        objects={objects}
        selectedObject={selectedObject}
        onSelectObject={onSelectObject}
        object={object}
      />
    </HeatmapProvider>
  );
}

function SelectionControls() {
  const t = useTranslations("etc.form.selection-controls");
  const { selectionMode, setSelectionMode, clearSelections } = useHeatmapSelectionContext();

  return (
    <div className="flex lg:flex-col gap-2 lg:mt-10">
      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={() => setSelectionMode("rectangle")}
            variant={selectionMode === "rectangle" ? "default" : "outline"}
            size="icon-sm"
          >
            <SquareDashedMousePointer />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="max-w-xs text-wrap">{t("square-selection")}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={() => setSelectionMode("polygon")}
            variant={selectionMode === "polygon" ? "default" : "outline"}
            size="icon-sm"
          >
            <PolygonDashedMousePointer />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="max-w-xs text-wrap">{t("polygon-selection")}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1000}>
        <TooltipTrigger asChild>
          <Button type="button" onClick={clearSelections} variant="destructive" size="icon-sm">
            <Eraser />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="max-w-xs text-wrap">{t("erase-selection")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ETCFormInner({ filters, objects, selectedObject, onSelectObject, object, onSubmit, disabled }: ETCFormProps) {
  const t = useTranslations("etc.form");
  const isMobile = useIsMobile();
  const { selection } = useHeatmapSelectionContext();

  const [preview, setPreview] = useState<number[][] | null>(null);
  const [selectionError, setSelectionError] = useState(false);

  const schemaRef = useRef(createEtcFormSchema(t));

  const form = useForm<ETCFormSchema>({
    resolver: ((values, context, options) =>
      (zodResolver(schemaRef.current) as any)(values, context, options)) as Resolver<ETCFormSchema>,
    defaultValues: {
      objectId: selectedObject?.id ?? "",
      numberOfExposures: 1,
      exposureTime: 60,
      magnitude: 21,
      magnitudeUnit: MagnitudeUnit.AB,
      wavelengthMin: 400,
      wavelengthMax: 900,
      redshift: 0,
      redshiftUnit: RedshiftUnit.Z,
      filterId: filters[0]?.id || "",
      instrument: Instrument.MOS_VIS,
      skyCondition: SkyCondition.NO_MOON_TH,
    },
  });

  const watchedObjectId = useWatch({ control: form.control, name: "objectId" });
  const watchedFilterId = useWatch({ control: form.control, name: "filterId" });
  const selectedFilterName = filters.find((filter) => filter.id === watchedFilterId)?.name;
  const [filterCurveData, setFilterCurveData] = useState<NMFile[]>([]);
  const [isFilterCurveLoading, setIsFilterCurveLoading] = useState(false);

  useEffect(() => {
    const selectedFilter = filters.find((filter) => filter.id === watchedFilterId);
    if (!selectedFilter) {
      setFilterCurveData([]);
      return;
    }

    let isCancelled = false;
    setIsFilterCurveLoading(true);

    fetchFilterCurve(selectedFilter)
      .then((curve) => {
        if (!isCancelled) {
          setFilterCurveData(curve);
        }
      })
      .catch((error) => {
        console.warn(`Failed to load filter curve for ${selectedFilter.id}:`, error);
        if (!isCancelled) {
          setFilterCurveData([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsFilterCurveLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [form.control, filters, watchedFilterId]);

  useEffect(() => {
    const obj = objects.find((o) => o.id === watchedObjectId) ?? null;
    onSelectObject(obj);
  }, [watchedObjectId, objects, onSelectObject]);

  useEffect(() => {
    if (selection.length > 0) setSelectionError(false);
  }, [selection]);

  useEffect(() => {
    if (object.preview) {
      const fluxHdu = object.preview.get("FLUX");
      if (!fluxHdu) {
        console.warn("FLUX extension not found in FITS file");
        setPreview(null);
        schemaRef.current = createEtcFormSchema(t);
        return;
      }

      const wmin = parseFloat(fluxHdu.header["WMIN"]);
      const wmax = parseFloat(fluxHdu.header["WMAX"]);
      if (isNaN(wmin) || isNaN(wmax)) {
        console.warn("WMIN or WMAX header not found or invalid in FITS file");
        schemaRef.current = createEtcFormSchema(t);
        return;
      }

      schemaRef.current = createEtcFormSchema(t, Math.round(wmin * 100) / 100, Math.round(wmax * 100) / 100);
      form.trigger(["wavelengthMin", "wavelengthMax"]);

      const flux = fluxHdu.data as number[][] | undefined;
      setPreview(flux ?? null);
    } else {
      setPreview(null);
      schemaRef.current = createEtcFormSchema(t);
    }
  }, [object.preview, t]);

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
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormMessage>
                    {form.formState.errors.wavelengthMin?.message || form.formState.errors.wavelengthMax?.message}
                  </FormMessage>
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
                      <FormLabel>{t("filter.label")}</FormLabel>
                      <div className="flex gap-2">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("filter.placeholder")} />
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

                        <HoverCard openDelay={100} closeDelay={200}>
                          <HoverCardTrigger asChild>
                            <Button type="button" variant="outline" size="icon" disabled={!field.value}>
                              <ChartLine className="size-4" />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" className="p-4 w-auto">
                            <p className="mb-2 font-medium text-sm">
                              {selectedFilterName
                                ? t("filter-chart.title", { name: selectedFilterName })
                                : t("filter-chart.title-fallback")}
                            </p>
                            {isFilterCurveLoading ? (
                              <div className="flex justify-center items-center w-80 h-60 text-muted-foreground text-sm">
                                Loading...
                              </div>
                            ) : filterCurveData.length > 0 ? (
                              <ChartContainer config={{}} className="w-80 h-60">
                                <LineChart
                                  accessibilityLayer
                                  data={filterCurveData}
                                  margin={{ top: 12, bottom: 12, right: 8 }}
                                >
                                  <CartesianGrid vertical={false} />
                                  <XAxis
                                    dataKey="wavelength"
                                    type="number"
                                    domain={["dataMin", "dataMax"]}
                                    unit=" nm"
                                    label={{
                                      value: t("filter-chart.x-axis-label"),
                                      position: "insideBottom",
                                      offset: -5,
                                    }}
                                    tickFormatter={(value) => `${value.toFixed(1)}`}
                                  />
                                  <YAxis
                                    dataKey="transmission"
                                    type="number"
                                    domain={[0, 1]}
                                    label={{
                                      value: t("filter-chart.y-axis-label"),
                                      angle: -90,
                                      position: "insideLeft",
                                      offset: 15,
                                    }}
                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="transmission"
                                    stroke="var(--chart-1)"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                  />
                                  <ChartTooltip
                                    animationDuration={0}
                                    cursor={false}
                                    content={
                                      <FilterTooltipContent
                                        formatWavelength={(value) =>
                                          t("filter-chart.tooltip.wavelength", {
                                            value: Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "-",
                                          })
                                        }
                                        transmissionText={t("filter-chart.tooltip.transmission")}
                                      />
                                    }
                                  />
                                </LineChart>
                              </ChartContainer>
                            ) : (
                              <div className="flex justify-center items-center w-80 h-60 text-muted-foreground text-sm">
                                No filter data available.
                              </div>
                            )}
                          </HoverCardContent>
                        </HoverCard>
                      </div>
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
                      <FormLabel className="flex items-center gap-0.5">
                        {t("object.title")}
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="ml-1 size-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-wrap">{t("object.tooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <div className="flex gap-2">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder={t("object.select-placeholder")} />
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

                        {selectedObject && !object.cubeReady && object.downloadProgress === null && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={object.downloadCube}
                            title={t("object.download")}
                          >
                            <Download className="size-4" />
                          </Button>
                        )}

                        {object.downloadProgress !== null && (
                          <Button type="button" variant="outline" size="icon" disabled className="pointer-events-none">
                            <CircularProgress value={object.downloadProgress} />
                          </Button>
                        )}

                        {object.cubeReady && (
                          <Button type="button" variant="outline" size="icon" disabled className="pointer-events-none">
                            <Check className="size-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {preview && (
                  <div className="flex lg:flex-row flex-col justify-center items-center lg:items-start gap-3">
                    <Heatmap
                      values={preview}
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

                {selectionError && <p className="text-destructive text-sm">{t("object.selection-required")}</p>}
                {object.error && <p className="text-destructive text-sm">{object.error}</p>}
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
