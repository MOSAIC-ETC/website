import type { FITSFile } from "@/lib/parser";

import type { CSVTables } from "../hooks/use-csv-tables";
import { type Spectrum, lookupNearest, resampleFilter } from "./calculate";
import {
  BACKGROUND_COLUMNS,
  ELT_DIAMETER,
  ENCLOSED_ENERGY_COLUMNS,
  MANGA_PIXEL_AREA,
  MANGA_PIXEL_SCALE,
  MOSAIC_PIXEL_AREA,
  MOSAIC_PIXEL_SCALE,
  PLANCK_CONSTANT,
  SPEED_OF_LIGHT,
  THROUGHPUT_COLUMNS,
  ZERO_POINT,
  getInstrumentSettings,
} from "./constants";
import type { FilterEntry, NMFile, SubcubeFormValues } from "./types";
import { MagnitudeUnit, RedshiftUnit } from "./types";

const SUB_CUBE_HALF_WIDTH = 30; // nm

/**
 * Spatially collapse the full 3D cube into a 1D total spectrum by summing all spaxels.
 * f_λ,tot(λ) = Σ_{x,y} f_λ(x,y,λ)
 */
function collapseToTotalSpectrum(flux: number[][][], wavelengths: number[]): Spectrum {
  const nWave = wavelengths.length;
  const nY = flux[0].length;
  const nX = flux[0][0].length;

  const totalFlux = new Array<number>(nWave).fill(0);
  for (let w = 0; w < nWave; w++) {
    for (let y = 0; y < nY; y++) {
      for (let x = 0; x < nX; x++) {
        totalFlux[w] += flux[w][y][x];
      }
    }
  }

  return wavelengths.map((wl, i) => ({ wavelength: wl, flux: totalFlux[i] }));
}

/**
 * Compute the template AB magnitude using photon-counting synthetic photometry.
 *
 * <f_ν> = ∫ f_λ,tot(λ) · T(λ) · (λ/c) dλ  /  ∫ T(λ) · (1/λ) dλ
 * m_temp = -2.5 · log10(<f_ν>) - 48.60
 */
function syntheticPhotometry(totalSpectrum: Spectrum, filterCurve: NMFile[]): number {
  const c = SPEED_OF_LIGHT * 1e10; // Å/s

  // Resample filter curve onto the spectrum wavelengths
  const resampled = resampleFilter(totalSpectrum, filterCurve);

  // Numerator: ∫ f_λ · T(λ) · (λ/c) dλ
  // Wavelengths in the spectrum are in nm; f_λ is in 10^-17 erg/s/cm²/Å.
  // We convert λ from nm to Å for consistency: λ_Å = λ_nm * 10.
  const numeratorData = totalSpectrum.map((p, i) => ({
    wavelength: p.wavelength,
    flux: p.flux * resampled[i].transmission * ((p.wavelength * 10) / c),
  }));

  // Denominator: ∫ T(λ) · (1/λ) dλ
  // Here λ is in nm for integration, and 1/λ in 1/Å → 1/(λ_nm*10)
  const denominatorData = resampled.map((p) => ({
    wavelength: p.wavelength,
    transmission: p.transmission * (1 / (p.wavelength * 10)),
  }));

  // Integrate using trapezoidal rule (shared helpers work in nm for dλ)
  let numerator = 0;
  for (let i = 1; i < numeratorData.length; i++) {
    const dx = numeratorData[i].wavelength - numeratorData[i - 1].wavelength;
    numerator += 0.5 * (numeratorData[i - 1].flux + numeratorData[i].flux) * dx;
  }

  let denominator = 0;
  for (let i = 1; i < denominatorData.length; i++) {
    const dx = denominatorData[i].wavelength - denominatorData[i - 1].wavelength;
    denominator += 0.5 * (denominatorData[i - 1].transmission + denominatorData[i].transmission) * dx;
  }

  if (denominator === 0) return 0;

  // f_λ units are 10^-17 erg/s/cm²/Å, so <f_ν> needs the 10^-17 factor
  const fNuMean = (numerator / denominator) * 1e-17;
  const mTemp = -2.5 * Math.log10(fNuMean) + ZERO_POINT;
  return mTemp;
}

/**
 * Extract a sub-cube at targetWavelength ± halfWidth nm, collapsing along
 * the wavelength axis to produce a 2D flux map.
 * Returns the summed flux per spaxel (nY × nX).
 */
function extractSubCube(
  flux: number[][][],
  wavelengths: number[],
  targetWavelength: number,
  halfWidth: number = SUB_CUBE_HALF_WIDTH,
): number[][] {
  const nY = flux[0].length;
  const nX = flux[0][0].length;

  const result: number[][] = Array.from({ length: nY }, () => new Array<number>(nX).fill(0));

  for (let w = 0; w < wavelengths.length; w++) {
    if (Math.abs(wavelengths[w] - targetWavelength) <= halfWidth) {
      for (let y = 0; y < nY; y++) {
        for (let x = 0; x < nX; x++) {
          result[y][x] += flux[w][y][x];
        }
      }
    }
  }

  return result;
}

/**
 * Area-weighted (drizzle-style) resampling to a higher resolution grid.
 * Strictly conserves flux: for each output pixel, the surface brightness is the
 * area-weighted average of all overlapping input pixels. This guarantees that
 * Σ SB_out × Ω_out = Σ SB_in × Ω_in exactly.
 *
 * scaleRatio = MANGA_PIXEL_SCALE / MOSAIC_PIXEL_SCALE (e.g., 0.5/0.15 ≈ 3.33)
 */
function areaWeightedResample(map: number[][], scaleRatio: number): number[][] {
  const inRows = map.length;
  const inCols = map[0].length;
  const outRows = Math.round(inRows * scaleRatio);
  const outCols = Math.round(inCols * scaleRatio);

  const result: number[][] = Array.from({ length: outRows }, () => new Array<number>(outCols).fill(0));

  const invScale = 1 / scaleRatio;

  for (let oy = 0; oy < outRows; oy++) {
    // Output pixel footprint in input coordinates (Y axis)
    const inYLo = oy * invScale;
    const inYHi = (oy + 1) * invScale;
    const iyStart = Math.max(0, Math.floor(inYLo));
    const iyEnd = Math.min(inRows - 1, Math.floor(inYHi - 1e-12));

    for (let ox = 0; ox < outCols; ox++) {
      // Output pixel footprint in input coordinates (X axis)
      const inXLo = ox * invScale;
      const inXHi = (ox + 1) * invScale;
      const ixStart = Math.max(0, Math.floor(inXLo));
      const ixEnd = Math.min(inCols - 1, Math.floor(inXHi - 1e-12));

      let weightedSum = 0;
      let totalArea = 0;

      for (let iy = iyStart; iy <= iyEnd; iy++) {
        const overlapY = Math.min(iy + 1, inYHi) - Math.max(iy, inYLo);
        for (let ix = ixStart; ix <= ixEnd; ix++) {
          const overlapX = Math.min(ix + 1, inXHi) - Math.max(ix, inXLo);
          const area = overlapY * overlapX;
          weightedSum += map[iy][ix] * area;
          totalArea += area;
        }
      }

      result[oy][ox] = totalArea > 0 ? weightedSum / totalArea : 0;
    }
  }

  return result;
}

/**
 * Convert a magnitude value (in any supported unit) to AB magnitude.
 */
function convertToABMag(
  value: number,
  unit: SubcubeFormValues["magnitudeUnit"],
  wavelengthNm: number,
  filter: FilterEntry,
): number {
  const c = SPEED_OF_LIGHT * 1e9; // nm/s

  let fNu: number; // erg/s/cm²/Hz

  switch (unit) {
    case MagnitudeUnit.AB:
      return value; // Already AB
    case MagnitudeUnit.APPARENT: {
      const { effWavelength, zeroPoint } = filter;
      const h = PLANCK_CONSTANT * 1e7; // erg·s
      const fLambda = zeroPoint * 10 ** (-0.4 * value) * ((h * c) / effWavelength) * 1e-7;
      fNu = (fLambda * wavelengthNm ** 2) / c;
      break;
    }
    case MagnitudeUnit.JY:
      fNu = value * 1e-23; // 1 Jy = 1e-23 erg/s/cm²/Hz
      break;
    case MagnitudeUnit.W_M2_UM: {
      // W/m²/μm = erg/s/cm²/nm → convert to f_ν
      fNu = (value * wavelengthNm ** 2) / c;
      break;
    }
    case MagnitudeUnit.ERGS_S_CM2_ANGSTROM: {
      const fLambdaNm = value * 10; // erg/s/cm²/nm
      fNu = (fLambdaNm * wavelengthNm ** 2) / c;
      break;
    }
    case MagnitudeUnit.ERGS_S_CM2_HZ:
      fNu = value;
      break;
    default:
      return value;
  }

  return -2.5 * Math.log10(fNu) + ZERO_POINT;
}

/**
 * Main 2D SNR calculation.
 *
 * 1. Extract sub-cube at target wavelength ± 30nm → 2D flux map
 * 2. Compute m_temp via synthetic photometry of the full cube
 * 3. Scaling factor: S = 10^(-0.4 * (m_targ - m_temp))
 * 4. Convert to surface brightness: SB = F × S / Ω_MaNGA
 * 5. Resample SB to MOSAIC grid
 * 6. MOSAIC flux: F_MOSAIC = SB_resampled × Ω_MOSAIC
 * 7. Per-pixel SNR
 */
export function calculate2DSNR(
  values: SubcubeFormValues,
  filter: FilterEntry,
  filterCurve: NMFile[],
  object: FITSFile,
  tables: CSVTables,
): number[][] {
  const {
    numberOfExposures,
    exposureTime,
    magnitude,
    magnitudeUnit,
    redshift,
    redshiftUnit,
    instrument,
    skyCondition,
    targetWavelength,
  } = values;

  const { background, enclosedEnergy, lrThroughput } = tables;

  const flux = object.get("FLUX")?.data as number[][][] | undefined;
  const wavelengths = object.get("WAVE")?.data as number[] | undefined;

  if (!flux || !wavelengths) {
    console.warn("FLUX or WAVE data not found in FITS file");
    return [];
  }

  // Step 1: Extract sub-cube
  const fluxMap = extractSubCube(flux, wavelengths, targetWavelength);

  // Step 2: Synthetic photometry → m_temp
  const totalSpectrum = collapseToTotalSpectrum(flux, wavelengths);
  const mTemp = syntheticPhotometry(totalSpectrum, filterCurve);

  // Step 3: Scaling factor
  const mTarg = convertToABMag(magnitude, magnitudeUnit, targetWavelength, filter);
  const S = 10 ** (-0.4 * (mTarg - mTemp));

  // Step 4: Convert flux map to surface brightness
  // flux is in 10^-17 erg/s/cm²/Å, we keep the 10^-17 factor for later
  const sbMap = fluxMap.map((row) => row.map((f) => (f * S) / MANGA_PIXEL_AREA));

  // Step 5: Resample to MOSAIC grid (area-weighted, strictly flux-conserving)
  const scaleRatio = MANGA_PIXEL_SCALE / MOSAIC_PIXEL_SCALE;
  const resampledSB = areaWeightedResample(sbMap, scaleRatio);

  // Step 6: Convert back to flux per MOSAIC pixel
  const mosaicFluxMap = resampledSB.map((row) => row.map((sb) => sb * MOSAIC_PIXEL_AREA));

  // Step 7: Compute SNR per pixel at targetWavelength
  const c = SPEED_OF_LIGHT * 1e9; // nm/s
  const h = PLANCK_CONSTANT; // J·s
  const d = ELT_DIAMETER; // m
  const eltAreaCm2 = Math.PI * ((d * 100) / 2) ** 2; // cm²

  const { resolution, darkCurrent, readOutNoise } = getInstrumentSettings(instrument);

  // Apply redshift to target wavelength
  let deltaLambda: number;
  if (redshiftUnit === RedshiftUnit.Z) {
    deltaLambda = targetWavelength * redshift;
  } else {
    deltaLambda = targetWavelength * ((redshift * 1e3) / SPEED_OF_LIGHT);
  }
  const lambdaNm = targetWavelength + deltaLambda;
  const lambdaUm = lambdaNm * 1e-3;

  const energy = ((h * c) / lambdaNm) * 1e7; // erg

  const ee = lookupNearest(enclosedEnergy, lambdaNm, ENCLOSED_ENERGY_COLUMNS[instrument]);
  const gt = lookupNearest(lrThroughput, lambdaNm, THROUGHPUT_COLUMNS[instrument]);
  const bg = lookupNearest(background, lambdaNm, BACKGROUND_COLUMNS[skyCondition]);

  const eltMirrorArea = Math.PI * (d / 2) ** 2; // m²
  const backgroundFlux = bg * eltMirrorArea * (lambdaUm / resolution) * MOSAIC_PIXEL_AREA * gt; // photons/s
  const backgroundCount = backgroundFlux * exposureTime;

  // pixelsPerObject = 1 (per-pixel)
  const noiseFixed = 1 * (readOutNoise ** 2 + darkCurrent * exposureTime);

  const snrMap = mosaicFluxMap.map((row) =>
    row.map((fluxVal) => {
      // fluxVal is in 10^-17 erg/s/cm²/Å (surface brightness units carried through)
      // Convert to actual flux: multiply by 1e-17
      const actualFlux = fluxVal * 1e-17;
      const sourceFlux = (actualFlux / energy) * eltAreaCm2 * (lambdaNm / resolution) * ee * gt; // photons/s
      const sourceCount = sourceFlux * exposureTime;

      const signal = sourceCount * Math.sqrt(numberOfExposures);
      const noise = Math.sqrt(sourceCount + backgroundCount + noiseFixed);

      return noise > 0 ? signal / noise : 0;
    }),
  );

  return snrMap;
}
