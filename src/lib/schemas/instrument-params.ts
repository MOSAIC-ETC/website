// Schema for InstrumentParameter.params (the editable subset of physical / instrumental
// constants). Physical constants like Planck or c stay hardcoded.
//
// `schemaVersion` is bumped whenever the shape changes so old snapshots remain
// interpretable on read.

import { z } from "zod";

export const INSTRUMENT_PARAMS_SCHEMA_VERSION = 1;

const modeSchema = z.object({
  resolution: z.number().positive(),
  apertureDiameterArcsec: z.number().positive(),
  pixelsPerObject: z.number().int().positive(),
});

const ifuSchema = z.object({
  resolution: z.number().positive(),
  spaxelSizeArcsec: z.number().positive(),
  spaxelsPerSpaxel: z.number().int().positive(),
});

const detectorSchema = z.object({
  darkCurrentEPerSecPerPixel: z.number().nonnegative(),
  ronEPerPixel: z.number().nonnegative(),
});

export const instrumentParamsSchema = z.object({
  schemaVersion: z.literal(INSTRUMENT_PARAMS_SCHEMA_VERSION),
  eltDiameterM: z.number().positive(),
  mangaPixelScaleArcsec: z.number().positive(),
  mosaicPixelScaleArcsec: z.number().positive(),
  mosVis: modeSchema,
  mosNir: modeSchema,
  ifu: ifuSchema,
  detectors: z.object({
    vis: detectorSchema,
    nir: detectorSchema,
  }),
});

export type InstrumentParams = z.infer<typeof instrumentParamsSchema>;

export const DEFAULT_INSTRUMENT_PARAMS: InstrumentParams = {
  schemaVersion: INSTRUMENT_PARAMS_SCHEMA_VERSION,
  eltDiameterM: 38.542,
  mangaPixelScaleArcsec: 0.5,
  mosaicPixelScaleArcsec: 0.15,
  mosVis: { resolution: 5000, apertureDiameterArcsec: 0.7, pixelsPerObject: 175 },
  mosNir: { resolution: 5000, apertureDiameterArcsec: 0.6, pixelsPerObject: 63 },
  ifu: { resolution: 5000, spaxelSizeArcsec: 0.15, spaxelsPerSpaxel: 27 },
  detectors: {
    vis: { darkCurrentEPerSecPerPixel: 10 / 3600, ronEPerPixel: 3 },
    nir: { darkCurrentEPerSecPerPixel: 0.01, ronEPerPixel: 3 },
  },
};
