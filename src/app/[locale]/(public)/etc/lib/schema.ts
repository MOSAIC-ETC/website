import { z } from "zod";

import { Instrument, MagnitudeUnit, RedshiftUnit, SkyCondition } from "./types";

type TranslationFn = (key: string, values?: Record<string, string | number | Date>) => string;

export function createEtcFormSchema(t: TranslationFn) {
  return z.object({
    objectId: z.string().min(1, t("errors.select-object")),
    numberOfExposures: z.coerce.number().int().positive(),
    exposureTime: z.coerce.number().positive(),
    magnitude: z.coerce.number(),
    magnitudeUnit: z.enum(MagnitudeUnit),
    redshift: z.coerce.number().min(0),
    redshiftUnit: z.enum(RedshiftUnit),
    filterId: z.string().min(1, t("errors.select-filter")),
    instrument: z.enum(Instrument),
    skyCondition: z.enum(SkyCondition),
  });
}

export type ETCFormSchema = z.infer<ReturnType<typeof createEtcFormSchema>>;

export function createSubcubeFormSchema(t: TranslationFn) {
  return z.object({
    objectId: z.string().min(1, t("form.errors.select-object")),
    numberOfExposures: z.coerce.number().int().positive(),
    exposureTime: z.coerce.number().positive(),
    magnitude: z.coerce.number(),
    magnitudeUnit: z.enum(MagnitudeUnit),
    redshift: z.coerce.number().min(0),
    redshiftUnit: z.enum(RedshiftUnit),
    filterId: z.string().min(1, t("form.errors.select-filter")),
    instrument: z.enum(Instrument),
    skyCondition: z.enum(SkyCondition),
    targetWavelength: z.coerce.number().positive(t("form.errors.target-wavelength")),
  });
}

export type SubcubeFormSchema = z.infer<ReturnType<typeof createSubcubeFormSchema>>;
