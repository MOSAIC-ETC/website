import { Instrument, SkyCondition } from "./types";

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
