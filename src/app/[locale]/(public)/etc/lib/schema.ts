import { z } from "zod";
import { MagnitudeUnit, RedshiftUnit, Instrument, SkyCondition } from "./types";

export const etcFormSchema = z
  .object({
    numberOfExposures: z.coerce.number().int().positive(),
    exposureTime: z.coerce.number().positive(),
    magnitude: z.coerce.number(),
    magnitudeUnit: z.enum(MagnitudeUnit),
    nonStellarObject: z.string().min(1, "Select an object"),
    wavelengthMin: z.coerce.number().positive(),
    wavelengthMax: z.coerce.number().positive(),
    redshift: z.coerce.number().min(0),
    redshiftUnit: z.enum(RedshiftUnit),
    filterId: z.string().min(1, "Select a filter"),
    instrument: z.enum(Instrument),
    skyCondition: z.enum(SkyCondition),
  })
  .refine((data) => data.wavelengthMax > data.wavelengthMin, {
    message: "Max wavelength must be greater than min wavelength",
    path: ["wavelengthMax"],
  });

export type ETCFormSchema = z.infer<typeof etcFormSchema>;
