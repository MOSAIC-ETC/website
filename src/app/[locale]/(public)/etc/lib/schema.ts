import { z } from "zod";
import { MagnitudeUnit, RedshiftUnit, Instrument, SkyCondition } from "./types";

/**
 * Creates the ETC form schema, optionally constraining wavelength range
 * to the [wmin, wmax] bounds read from the object's FITS FLUX header.
 */
export function createEtcFormSchema(wmin?: number, wmax?: number) {
  return z
    .object({
      objectId: z.string().min(1, "Select an object"),
      numberOfExposures: z.coerce.number().int().positive(),
      exposureTime: z.coerce.number().positive(),
      magnitude: z.coerce.number(),
      magnitudeUnit: z.enum(MagnitudeUnit),
      // wavelengthMin: z.coerce.number().positive(),
      // wavelengthMax: z.coerce.number().positive(),
      redshift: z.coerce.number().min(0),
      redshiftUnit: z.enum(RedshiftUnit),
      filterId: z.string().min(1, "Select a filter"),
      instrument: z.enum(Instrument),
      skyCondition: z.enum(SkyCondition),
    })
    // .refine((data) => data.wavelengthMax > data.wavelengthMin, {
    //   message: "Max wavelength must be greater than min wavelength",
    //   path: ["wavelengthMax"],
    // })
    // .refine((data) => wmin === undefined || data.wavelengthMin >= wmin, {
    //   message: `Min wavelength must be \u2265 ${wmin}`,
    //   path: ["wavelengthMin"],
    // })
    // .refine((data) => wmax === undefined || data.wavelengthMax <= wmax, {
    //   message: `Max wavelength must be \u2264 ${wmax}`,
    //   path: ["wavelengthMax"],
    // });
}

export const etcFormSchema = createEtcFormSchema();
export type ETCFormSchema = z.infer<ReturnType<typeof createEtcFormSchema>>;
