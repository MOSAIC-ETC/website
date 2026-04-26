import type { HeatmapCell } from "@/components/chart/heatmap";
import type { WavelengthUnit } from "@/lib/parser";

export { WavelengthUnit, type NMFile } from "@/lib/parser";
export type { HeatmapCell };

export enum MagnitudeUnit {
  APPARENT = "mag",
  AB = "AB mag",
  JY = "Jy",
  W_M2_UM = "W/m²/um",
  ERGS_S_CM2_ANGSTROM = "ergs/s/cm²/Å",
  ERGS_S_CM2_HZ = "ergs/s/cm²/Hz",
}

export enum RedshiftUnit {
  Z = "Redshift (z)",
  KM_S = "Velocity (km/s)",
}

export enum Instrument {
  MOS_VIS = "MOS VIS",
  MOS_NIR = "MOS NIR",
  IFU = "IFU",
}

export enum SkyCondition {
  NO_MOON = "Sky NO MOON",
  NO_MOON_TH = "Sky NO MOON+Th",
  ALL = "Sky ALL",
  ALL_TH = "Sky ALL+Th",
}

export interface FilterEntry {
  id: string;
  name: string;
  path: string;
  effWavelength: number;
  effWavelengthUnit: WavelengthUnit;
  zeroPoint: number;
}

export interface ObjectEntry {
  id: string;
  name: string;
  previewPath: string;
  cubePath: string;
}

export interface ETCFormValues {
  objectId: string;
  numberOfExposures: number;
  exposureTime: number;
  magnitude: number;
  magnitudeUnit: MagnitudeUnit;
  redshift: number;
  redshiftUnit: RedshiftUnit;
  filterId: string;
  instrument: Instrument;
  skyCondition: SkyCondition;
  selection: HeatmapCell[];
}

export interface SNRDataPoint {
  wavelength: number;
  snr: number;
}

export interface SubcubeFormValues {
  objectId: string;
  numberOfExposures: number;
  exposureTime: number;
  magnitude: number;
  magnitudeUnit: MagnitudeUnit;
  redshift: number;
  redshiftUnit: RedshiftUnit;
  filterId: string;
  instrument: Instrument;
  skyCondition: SkyCondition;
  targetWavelength: number;
}
