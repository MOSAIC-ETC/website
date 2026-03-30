import { PLANCK_CONSTANT, SPEED_OF_LIGHT, ZERO_POINT } from "./constants";
import type { FilterEntry, MagnitudeUnit } from "./types";
import { MagnitudeUnit as MU } from "./types";

const c = SPEED_OF_LIGHT * 1e9; // Speed of light in nm/s
const h = PLANCK_CONSTANT * 1e7; // Planck's constant in erg·s

/**
 * Convert a magnitude/flux value to spectral flux density F_λ (erg/s/cm²/nm).
 */
export function convertToFluxLambda(
  value: number,
  unit: MagnitudeUnit,
  wavelength: number,
  filter: FilterEntry,
): number {
  switch (unit) {
    case MU.APPARENT: {
      const { effWavelength, zeroPoint } = filter;
      return zeroPoint * 10 ** (-0.4 * value) * ((h * c) / effWavelength) * 1e-7;
    }
    case MU.AB: {
      const f_nu = 10 ** (-0.4 * (value - ZERO_POINT)); // erg/s/cm²/Hz
      return (f_nu * c) / wavelength ** 2;
    }
    case MU.JY:
      return ((value * c) / wavelength ** 2) * 1e-7;
    case MU.W_M2_UM:
      return value; // 1 W/m²/μm ≡ 1 erg/s/cm²/nm
    case MU.ERGS_S_CM2_ANGSTROM:
      return value * 10; // 1 Å = 0.1 nm → multiply by 10
    case MU.ERGS_S_CM2_HZ:
      return ((value * c) / wavelength ** 2) * 1e-7;
  }
}
