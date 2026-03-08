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

export const NON_STELLAR_OBJECTS = [
  "Elliptical Galaxy",
  "Spiral Galaxy",
  "Starburst Galaxy",
  "Seyfert Galaxy",
  "Quasar",
  "Nebula",
  "HII Region",
  "Planetary Nebula",
  "Supernova Remnant",
] as const;

export const FILTERS = ["U", "B", "V", "R", "I", "J", "H", "K", "g", "r", "i", "z"] as const;

export interface ETCFormValues {
  numberOfExposures: number;
  exposureTime: number;
  magnitude: number;
  magnitudeUnit: MagnitudeUnit;
  nonStellarObject: string;
  wavelengthMin: number;
  wavelengthMax: number;
  redshift: number;
  redshiftUnit: RedshiftUnit;
  filter: string;
  instrument: Instrument;
  skyCondition: SkyCondition;
}

export interface SNRDataPoint {
  wavelength: number;
  snr: number;
}
