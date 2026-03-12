/**
 * Parser for whitespace-delimited wavelength/transmission filter curve files.
 *
 * These files typically contain two columns (wavelength and transmission)
 * with optional comment lines starting with '#'. Wavelength units can be
 * nanometers (nm) or micrometers (um).
 */

export enum WavelengthUnit {
  NM = "Nanometers (nm)",
  UM = "Micrometers (um)",
}

export interface NMFile {
  /** Wavelength in nanometers. */
  wavelength: number;
  /** Transmission value normalized to 0–1. */
  transmission: number;
}

/**
 * Parses whitespace-delimited filter transmission curve files.
 *
 * Handles comment lines (prefixed with '#'), wavelength unit conversion,
 * and automatic normalization of percentage-based transmission values.
 */
export class NMParser {
  private readonly text: string;
  private readonly wavelengthUnit: WavelengthUnit;

  /**
   * @param text - Raw text content of the filter curve file.
   * @param wavelengthUnit - Unit of the wavelength column (nm or um).
   */
  constructor(text: string, wavelengthUnit: WavelengthUnit) {
    this.text = text;
    this.wavelengthUnit = wavelengthUnit;
  }

  /**
   * Converts a wavelength value to nanometers based on the configured unit.
   */
  private toNanometers(value: number): number {
    return this.wavelengthUnit === WavelengthUnit.UM ? value * 1000 : value;
  }

  /**
   * Parses the file content into an array of transmission points.
   *
   * Wavelengths are converted to nanometers and transmission values are
   * normalized to the 0–1 range if originally given as percentages.
   *
   * @returns An array of parsed and normalized filter transmission points.
   */
  parse(): NMFile[] {
    const points: NMFile[] = [];

    for (const line of this.text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;

      const [rawWavelength, rawTransmission] = trimmed.split(/\s+/);
      const wavelength = parseFloat(rawWavelength);
      const transmission = parseFloat(rawTransmission);

      if (Number.isNaN(wavelength) || Number.isNaN(transmission)) continue;

      points.push({
        wavelength: this.toNanometers(wavelength),
        transmission,
      });
    }

    const maxTransmission = Math.max(...points.map((p) => p.transmission));
    if (maxTransmission > 1) {
      for (const point of points) {
        point.transmission /= 100;
      }
    }

    return points;
  }
}
