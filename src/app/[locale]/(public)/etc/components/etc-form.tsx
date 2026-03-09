"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MagnitudeUnit,
  RedshiftUnit,
  Instrument,
  SkyCondition,
  NON_STELLAR_OBJECTS,
  type FilterEntry,
} from "../lib/types";
import { etcFormSchema, type ETCFormSchema } from "../lib/schema";

interface ETCFormProps {
  filters: FilterEntry[];
  onSubmit: (values: ETCFormSchema) => void;
}

function enumOptions<T extends Record<string, string>>(enumObj: T) {
  return Object.entries(enumObj).map(([key, label]) => (
    <SelectItem key={key} value={label}>
      {label}
    </SelectItem>
  ));
}

export function ETCForm({ filters, onSubmit }: ETCFormProps) {
  const t = useTranslations("etc.form");
  const form = useForm<ETCFormSchema>({
    resolver: zodResolver(etcFormSchema) as Resolver<ETCFormSchema>,
    defaultValues: {
      numberOfExposures: 1,
      exposureTime: 3600,
      magnitude: 20,
      magnitudeUnit: MagnitudeUnit.AB,
      nonStellarObject: NON_STELLAR_OBJECTS[0],
      wavelengthMin: 400,
      wavelengthMax: 900,
      redshift: 0,
      redshiftUnit: RedshiftUnit.Z,
      filterId: filters[0]?.id || "",
      instrument: Instrument.MOS_VIS,
      skyCondition: SkyCondition.NO_MOON,
    },
  });

  return (
    <Card className="bg-background/60 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="text-base">{t("parameters")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <FormField
                control={form.control}
                name="nonStellarObject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("non-stellar-object")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("select-object")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NON_STELLAR_OBJECTS.map((obj) => (
                          <SelectItem key={obj} value={obj}>
                            {obj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <Button type="submit" className="w-full">
              {t("calculate-snr")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
