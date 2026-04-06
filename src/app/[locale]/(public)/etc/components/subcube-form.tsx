"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChartLine, Check, Download, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Heatmap, type HeatmapCellData } from "@/components/chart/heatmap";
import { CircularProgress } from "@/components/circular-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

import type { UseFITSCubeReturn } from "../hooks/use-fits-cube";
import { fetchFilterCurve } from "../lib/filters";
import { type SubcubeFormSchema, createSubcubeFormSchema } from "../lib/schema";
import {
  type FilterEntry,
  Instrument,
  MagnitudeUnit,
  type NMFile,
  type ObjectEntry,
  RedshiftUnit,
  SkyCondition,
} from "../lib/types";

interface SubcubeFormProps {
  filters: FilterEntry[];
  objects: ObjectEntry[];
  selectedObject: ObjectEntry | null;
  onSelectObject: (obj: ObjectEntry | null) => void;
  object: UseFITSCubeReturn;
  onSubmit: (values: SubcubeFormSchema) => void;
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

export function SubcubeForm({
  filters,
  objects,
  selectedObject,
  onSelectObject,
  object,
  onSubmit,
  disabled,
}: SubcubeFormProps) {
  const t = useTranslations("etc");
  const isMobile = useIsMobile();

  const [preview, setPreview] = useState<number[][] | null>(null);
  const [wavelengthRange, setWavelengthRange] = useState<{ min: number; max: number } | null>(null);

  const form = useForm<SubcubeFormSchema>({
    resolver: zodResolver(createSubcubeFormSchema(t)) as Resolver<SubcubeFormSchema>,
    defaultValues: {
      objectId: selectedObject?.id ?? "",
      numberOfExposures: 1,
      exposureTime: 60,
      magnitude: 21,
      magnitudeUnit: MagnitudeUnit.AB,
      redshift: 0,
      redshiftUnit: RedshiftUnit.Z,
      filterId: filters[0]?.id || "",
      instrument: Instrument.MOS_VIS,
      skyCondition: SkyCondition.NO_MOON_TH,
      targetWavelength: 550,
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
  }, [filters, watchedFilterId]);

  useEffect(() => {
    const obj = objects.find((o) => o.id === watchedObjectId) ?? null;
    onSelectObject(obj);
  }, [watchedObjectId, objects, onSelectObject]);

  useEffect(() => {
    if (object.preview) {
      const fluxHdu = object.preview.get("FLUX");
      if (!fluxHdu) {
        setPreview(null);
        setWavelengthRange(null);
        return;
      }

      const wmin = parseFloat(fluxHdu.header["WMIN"]);
      const wmax = parseFloat(fluxHdu.header["WMAX"]);
      if (!isNaN(wmin) && !isNaN(wmax)) {
        setWavelengthRange({ min: Math.round(wmin * 100) / 100, max: Math.round(wmax * 100) / 100 });
      } else {
        setWavelengthRange(null);
      }

      const flux = fluxHdu.data as number[][] | undefined;
      setPreview(flux ?? null);
    } else {
      setPreview(null);
      setWavelengthRange(null);
    }
  }, [object.preview]);

  return (
    <Card className="bg-background/60 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-base">{t("subcube-form.parameters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Object Section ── */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="objectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-0.5">
                      {t("form.object.title")}
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="ml-1 size-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-wrap">{t("form.object.tooltip")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <div className="flex gap-2">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t("form.object.select-placeholder")} />
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
                          title={t("form.object.download")}
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

              {wavelengthRange && (
                <p className="text-muted-foreground text-xs">
                  {t("form.wavelength-range", { min: wavelengthRange.min, max: wavelengthRange.max })}
                </p>
              )}

              {preview && (
                <div className="flex justify-center">
                  <Heatmap
                    values={preview}
                    width={isMobile ? 260 : 440}
                    height={isMobile ? 220 : 400}
                    colormap="inferno"
                    tooltip
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
                </div>
              )}

              {object.error && <p className="text-destructive text-sm">{object.error}</p>}
            </div>

            <Separator />

            {/* ── Target ── */}
            <div className="space-y-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                {t("form.section.target")}
              </p>

              <FormField
                control={form.control}
                name="magnitude"
                render={({ field: magField }) => (
                  <FormItem>
                    <FormLabel>{t("form.magnitude")}</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <Input type="number" step="any" className="border-r-0 rounded-r-none font-mono" {...magField} />
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

              <FormField
                control={form.control}
                name="redshift"
                render={({ field: redshiftField }) => (
                  <FormItem>
                    <FormLabel>{t("form.redshift")}</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="border-r-0 rounded-r-none font-mono"
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
            </div>

            <Separator />

            {/* ── Observation Setup ── */}
            <div className="space-y-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                {t("form.section.observation")}
              </p>

              <FormField
                control={form.control}
                name="targetWavelength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subcube-form.target-wavelength")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={wavelengthRange?.min}
                        max={wavelengthRange?.max}
                        step="any"
                        placeholder={t("subcube-form.target-wavelength-placeholder")}
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="gap-4 grid grid-cols-2">
                <FormField
                  control={form.control}
                  name="numberOfExposures"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.number-of-exposures")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} className="font-mono" {...field} />
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
                      <FormLabel>{t("form.exposure-time")}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="any" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="filterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.filter.label")}</FormLabel>
                    <div className="flex gap-2">
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("form.filter.placeholder")} />
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
                              ? t("form.filter-chart.title", { name: selectedFilterName })
                              : t("form.filter-chart.title-fallback")}
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
                                    value: t("form.filter-chart.x-axis-label"),
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
                                    value: t("form.filter-chart.y-axis-label"),
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
                                        t("form.filter-chart.tooltip.wavelength", {
                                          value: Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "-",
                                        })
                                      }
                                      transmissionText={t("form.filter-chart.tooltip.transmission")}
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
            </div>

            <Separator />

            {/* ── Instrument & Sky ── */}
            <div className="space-y-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                {t("form.section.instrument")}
              </p>

              <div className="gap-4 grid grid-cols-2">
                <FormField
                  control={form.control}
                  name="instrument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.instrument")}</FormLabel>
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
                      <FormLabel>{t("form.sky-condition")}</FormLabel>
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
            </div>

            <Separator />

            <Button type="submit" className="w-full" disabled={disabled}>
              {t("subcube-form.calculate-snr-map")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
