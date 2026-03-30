import { Instrument, SkyCondition } from "./types";

// Physical constants
export const ZERO_POINT = -48.6; // erg/s/cm²/Hz
export const PLANCK_CONSTANT = 6.63e-34; // J·s
export const SPEED_OF_LIGHT = 299_792_458; // m/s
export const ELT_DIAMETER = 38.542; // m

// Pixel scales
export const MANGA_PIXEL_SCALE = 0.5; // arcsec/pixel
export const MOSAIC_PIXEL_SCALE = 0.15; // arcsec/pixel
export const MANGA_PIXEL_AREA = MANGA_PIXEL_SCALE ** 2; // 0.25 arcsec²
export const MOSAIC_PIXEL_AREA = MOSAIC_PIXEL_SCALE ** 2; // 0.0225 arcsec²

// Instrument specifications
export const MOS = {
  VIS: {
    RESOLUTION: 5000,
    APERTURE_DIAMETER: 0.7, // arcsec
    PIXELS_PER_OBJECT: 175,
  },
  NIR: {
    RESOLUTION: 5000,
    APERTURE_DIAMETER: 0.6, // arcsec
    PIXELS_PER_OBJECT: 63,
  },
} as const;

export const IFU = {
  RESOLUTION: 5000,
  SPAXEL_SIZE: 0.15, // arcsec
  SPAXELS_PER_SPAXEL: 27,
} as const;

export const DETECTORS = {
  VIS: {
    DARK_CURRENT: 10 / 3600, // e/s/pixel
    RON: 3, // e/pixel
  },
  NIR: {
    DARK_CURRENT: 0.01, // e/s/pixel
    RON: 3, // e/pixel
  },
} as const;

// Instrument settings lookup
export type InstrumentSettings = {
  resolution: number;
  pixelsPerObject: number;
  apertureArea: number;
  darkCurrent: number;
  readOutNoise: number;
};

export function getInstrumentSettings(instrument: Instrument): InstrumentSettings {
  switch (instrument) {
    case Instrument.MOS_VIS:
      return {
        resolution: MOS.VIS.RESOLUTION,
        pixelsPerObject: MOS.VIS.PIXELS_PER_OBJECT,
        apertureArea: Math.PI * (MOS.VIS.APERTURE_DIAMETER / 2) ** 2,
        darkCurrent: DETECTORS.VIS.DARK_CURRENT,
        readOutNoise: DETECTORS.VIS.RON,
      };
    case Instrument.MOS_NIR:
      return {
        resolution: MOS.NIR.RESOLUTION,
        pixelsPerObject: MOS.NIR.PIXELS_PER_OBJECT,
        apertureArea: Math.PI * (MOS.NIR.APERTURE_DIAMETER / 2) ** 2,
        darkCurrent: DETECTORS.NIR.DARK_CURRENT,
        readOutNoise: DETECTORS.NIR.RON,
      };
    case Instrument.IFU:
      return {
        resolution: IFU.RESOLUTION,
        pixelsPerObject: IFU.SPAXELS_PER_SPAXEL,
        apertureArea: IFU.SPAXEL_SIZE ** 2,
        darkCurrent: DETECTORS.NIR.DARK_CURRENT,
        readOutNoise: DETECTORS.NIR.RON,
      };
  }
}

// CSV column mappings
export const ENCLOSED_ENERGY_COLUMNS: Record<Instrument, string> = {
  [Instrument.IFU]: "IFU",
  [Instrument.MOS_VIS]: "LRVis",
  [Instrument.MOS_NIR]: "LRNir",
};

export const BACKGROUND_COLUMNS: Record<SkyCondition, string> = {
  [SkyCondition.NO_MOON]: "NO MOON",
  [SkyCondition.NO_MOON_TH]: "NO MOON+Th",
  [SkyCondition.ALL]: "ALL",
  [SkyCondition.ALL_TH]: "ALL+Th",
};

export const THROUGHPUT_COLUMNS: Record<Instrument, string> = {
  [Instrument.MOS_VIS]: "vis",
  [Instrument.MOS_NIR]: "nir",
  [Instrument.IFU]: "nir",
};
