import type { InstrumentParams } from "@/lib/schemas/instrument-params";

import { Instrument } from "./types";

export type InstrumentSettings = {
  resolution: number;
  pixelsPerObject: number;
  apertureArea: number;
  darkCurrent: number;
  readOutNoise: number;
};

export function getInstrumentSettings(
  instrument: Instrument,
  params: InstrumentParams,
): InstrumentSettings {
  switch (instrument) {
    case Instrument.MOS_VIS:
      return {
        resolution: params.mosVis.resolution,
        pixelsPerObject: params.mosVis.pixelsPerObject,
        apertureArea: Math.PI * (params.mosVis.apertureDiameterArcsec / 2) ** 2,
        darkCurrent: params.detectors.vis.darkCurrentEPerSecPerPixel,
        readOutNoise: params.detectors.vis.ronEPerPixel,
      };
    case Instrument.MOS_NIR:
      return {
        resolution: params.mosNir.resolution,
        pixelsPerObject: params.mosNir.pixelsPerObject,
        apertureArea: Math.PI * (params.mosNir.apertureDiameterArcsec / 2) ** 2,
        darkCurrent: params.detectors.nir.darkCurrentEPerSecPerPixel,
        readOutNoise: params.detectors.nir.ronEPerPixel,
      };
    case Instrument.IFU:
      return {
        resolution: params.ifu.resolution,
        pixelsPerObject: params.ifu.spaxelsPerSpaxel,
        apertureArea: params.ifu.spaxelSizeArcsec ** 2,
        darkCurrent: params.detectors.nir.darkCurrentEPerSecPerPixel,
        readOutNoise: params.detectors.nir.ronEPerPixel,
      };
  }
}
