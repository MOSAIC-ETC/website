import { z } from "zod";

import { Instrument, MagnitudeUnit, RedshiftUnit, SkyCondition } from "./types";

type TranslationFn = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Creates the ETC form schema, optionally constraining wavelength range
 * to the [wmin, wmax] bounds read from the object's FITS FLUX header.
 */
export function createEtcFormSchema(t: TranslationFn, wmin?: number, wmax?: number) {
  return z
    .object({
      objectId: z.string().min(1, t("errors.select-object")),
      numberOfExposures: z.coerce.number().int().positive(),
      exposureTime: z.coerce.number().positive(),
      magnitude: z.coerce.number(),
      magnitudeUnit: z.enum(MagnitudeUnit),
      wavelengthMin: z.coerce.number().positive(),
      wavelengthMax: z.coerce.number().positive(),
      redshift: z.coerce.number().min(0),
      redshiftUnit: z.enum(RedshiftUnit),
      filterId: z.string().min(1, t("errors.select-filter")),
      instrument: z.enum(Instrument),
      skyCondition: z.enum(SkyCondition),
    })
    .refine((data) => data.wavelengthMax > data.wavelengthMin, {
      message: t("errors.wavelength-max-greater"),
      path: ["wavelengthMax"],
    })
    .refine((data) => wmin === undefined || data.wavelengthMin >= wmin, {
      message: t("errors.wavelength-min-gte", { wmin: wmin! }),
      path: ["wavelengthMin"],
    })
    .refine((data) => wmax === undefined || data.wavelengthMax <= wmax, {
      message: t("errors.wavelength-max-lte", { wmax: wmax! }),
      path: ["wavelengthMax"],
    });
}

export type ETCFormSchema = z.infer<ReturnType<typeof createEtcFormSchema>>;
