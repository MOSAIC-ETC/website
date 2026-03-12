import { RedshiftUnit } from "./types";
import type { ETCFormValues, SNRDataPoint, FilterEntry, NMFile } from "./types";
import type { HeatmapCell } from "@/components/chart/heatmap";
import type { FITSFile } from "@/lib/parser";
import type { CSVRow } from "@/lib/parser";
import type { CSVTables } from "../hooks/use-csv-tables";
import { convertToFluxLambda } from "./conversions";
import {
  VELOCITY_OF_LIGHT,
  PLANCK_CONSTANT,
  ELT_DIAMETER,
  ENCLOSED_ENERGY_COLUMNS,
  BACKGROUND_COLUMNS,
  THROUGHPUT_COLUMNS,
  getInstrumentSettings,
} from "./constants";

type Spectrum = {
  wavelength: number;
  flux: number;
}[];

export function calculateSNR(
  values: ETCFormValues,
  filter: FilterEntry,
  filterCurve: NMFile[],
  objectSelection: HeatmapCell[],
  object: FITSFile,
  tables: CSVTables,
): SNRDataPoint[] {
  const {
    numberOfExposures,
    exposureTime,
    magnitude,
    magnitudeUnit,
    wavelengthMin,
    wavelengthMax,
    redshift,
    redshiftUnit,
    instrument,
    skyCondition,
  } = values;

  const { background, enclosedEnergy, lrThroughput } = tables;

  const flux = object.get("FLUX")?.data as number[][][] | undefined; // shape (n_wave, ny, nx) = (4563, 54, 54)
  const wavelengths = object.get("WAVE")?.data as number[] | undefined; // shape (4563,)

  if (!flux || !wavelengths) {
    console.warn("FLUX or WAVE data not found in FITS file");
    return [];
  }

  // Extract and sum fluxes for selected pixels, then normalize at 550 nm
  const selectedFluxes: number[][] = getSelected(flux, objectSelection);
  const totalFlux: number[] = sumAll(selectedFluxes);

  const rawSpectrum: Spectrum = wavelengths.map((wavelength, i) => ({
    wavelength,
    flux: totalFlux[i],
  }));

  // NOTE: The reason why we normalize at 550 nm and then scale it back, is because in the previous iteration
  // of this problem, we were using a synthetic spectrum that was already normalized at 550 nm, so the value at 550 nm was 1.
  // For that reason, so we can reuse the same implementation and same mathematical equations to compute the SNR,
  // we need to normalize the observed spectrum at 550 nm as well, and then apply the scaling factor derived from the
  //  magnitude and filter-averaged flux.
  //
  // TODO: In the future, we might want to refactor the code to avoid this double normalization, but for now this is the simplest
  // way to adapt the existing implementation to work with observed spectra.
  const valueAt550nm = getNearestFlux(rawSpectrum, 550);
  const normalizedSpectrum = rawSpectrum.map((point) => ({
    wavelength: point.wavelength,
    flux: point.flux / valueAt550nm,
  }));

  // Filter by wavelength range
  const filteredSpectrum = normalizedSpectrum.filter(
    (p) => p.wavelength >= wavelengthMin && p.wavelength <= wavelengthMax,
  );
  if (filteredSpectrum.length === 0) return [];

  // Convert magnitude to F_λ at the normalization wavelength (550 nm)
  const fLambda = convertToFluxLambda(magnitude, magnitudeUnit, 550, filter);

  // Compute filter-averaged flux density to derive scaling factor
  const resampledFilter = resampleFilter(filteredSpectrum, filterCurve);
  const weighted = filteredSpectrum.map((p, i) => ({
    wavelength: p.wavelength,
    flux: p.flux * resampledFilter[i].transmission,
  }));

  const filterAveragedFlux = integrateSpectrum(weighted) / integrateTransmission(resampledFilter);
  const scalingFactor = fLambda / filterAveragedFlux;

  // Scale the full spectrum
  const scaledSpectrum = filteredSpectrum.map((p) => ({
    wavelength: p.wavelength,
    flux: p.flux * scalingFactor,
  }));

  // Compute SNR for each wavelength
  const c = VELOCITY_OF_LIGHT * 1e9; // nm/s
  const h = PLANCK_CONSTANT; // J·s
  const d = ELT_DIAMETER; // m
  const eltArea = Math.PI * ((d * 100) / 2) ** 2; // cm²

  const { resolution, pixelsPerObject, apertureArea, darkCurrent, readOutNoise } = getInstrumentSettings(instrument);

  const results: SNRDataPoint[] = [];

  for (const { wavelength: lambda, flux: fluxValue } of scaledSpectrum) {
    const deltaLambda = calculateDeltaLambda(lambda, redshift, redshiftUnit);
    const lambdaNm = lambda + deltaLambda;
    const lambdaUm = lambdaNm * 1e-3;

    const energy = ((h * c) / lambdaNm) * 1e7; // erg (1 J = 1e7 erg)

    const ee = lookupNearest(enclosedEnergy, lambdaNm, ENCLOSED_ENERGY_COLUMNS[instrument]);
    const gt = lookupNearest(lrThroughput, lambdaNm, THROUGHPUT_COLUMNS[instrument]);
    const bg = lookupNearest(background, lambdaNm, BACKGROUND_COLUMNS[skyCondition]);

    const sourceFlux = (fluxValue / energy) * eltArea * (lambdaNm / resolution) * ee * gt; // photons/s

    const eltMirrorArea = Math.PI * (d / 2) ** 2; // m²
    const backgroundFlux = bg * eltMirrorArea * (lambdaUm / resolution) * apertureArea * gt; // photons/s

    const sourceCount = sourceFlux * exposureTime;
    const backgroundCount = backgroundFlux * exposureTime;

    const signal = sourceCount * Math.sqrt(numberOfExposures);
    const noise = Math.sqrt(
      sourceCount + backgroundCount + pixelsPerObject * (readOutNoise ** 2 + darkCurrent * exposureTime),
    );

    results.push({ wavelength: lambda, snr: signal / noise });
  }

  return results;
}

// --- Spectrum extraction helpers ---

function getSelected(flux: number[][][], selection: HeatmapCell[]): number[][] {
  const selected: number[][] = [];
  for (const cell of selection) {
    const { x, y: flippedY } = cell;
    const y = flux[0].length - 1 - flippedY; // flip Y coordinate

    const cellFlux = flux.map((waveSlice) => waveSlice[y][x]);
    selected.push(cellFlux);
  }
  return selected;
}

function sumAll(fluxes: number[][]): number[] {
  return fluxes.reduce((sum, cellFlux) => {
    return sum.map((val, i) => val + cellFlux[i]);
  }, new Array(fluxes[0].length).fill(0));
}

function getNearestFlux(spectrum: Spectrum, targetWavelength: number): number {
  let nearestFlux = spectrum[0].flux;
  let minDiff = Math.abs(spectrum[0].wavelength - targetWavelength);

  for (const point of spectrum) {
    const diff = Math.abs(point.wavelength - targetWavelength);
    if (diff < minDiff) {
      minDiff = diff;
      nearestFlux = point.flux;
    }
  }
  return nearestFlux;
}

// --- CSV table lookup ---

function lookupNearest(table: CSVRow[], wavelength: number, column: string): number {
  let best = table[0];
  let bestDiff = Math.abs(Number(best["wavelength"]) - wavelength);

  for (const row of table) {
    const diff = Math.abs(Number(row["wavelength"]) - wavelength);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = row;
    }
  }
  return Number(best[column]);
}

// --- Filter resampling (linear interpolation) ---

function resampleFilter(spectrum: Spectrum, filter: NMFile[]): { wavelength: number; transmission: number }[] {
  return spectrum.map(({ wavelength }) => ({
    wavelength,
    transmission: interpolateTransmission(filter, wavelength),
  }));
}

function interpolateTransmission(filter: NMFile[], wavelength: number): number {
  if (wavelength <= filter[0].wavelength) return filter[0].transmission;

  const last = filter.length - 1;
  if (wavelength >= filter[last].wavelength) return filter[last].transmission;

  let i = 0;
  while (i < last && filter[i + 1].wavelength < wavelength) i++;

  const { wavelength: x0, transmission: y0 } = filter[i];
  const { wavelength: x1, transmission: y1 } = filter[i + 1];

  if (wavelength === x0) return y0;
  if (wavelength === x1) return y1;

  const t = (wavelength - x0) / (x1 - x0);
  return y0 + (y1 - y0) * t;
}

// --- Integration ---

function integrateSpectrum(data: Spectrum): number {
  let integral = 0;
  for (let i = 1; i < data.length; i++) {
    const dx = data[i].wavelength - data[i - 1].wavelength;
    integral += 0.5 * (data[i - 1].flux + data[i].flux) * dx;
  }
  return integral;
}

function integrateTransmission(data: { wavelength: number; transmission: number }[]): number {
  let integral = 0;
  for (let i = 1; i < data.length; i++) {
    const dx = data[i].wavelength - data[i - 1].wavelength;
    integral += 0.5 * (data[i - 1].transmission + data[i].transmission) * dx;
  }
  return integral;
}

// --- Redshift ---

function calculateDeltaLambda(wavelength: number, redshift: number, unit: RedshiftUnit): number {
  switch (unit) {
    case RedshiftUnit.Z:
      return wavelength * redshift;
    case RedshiftUnit.KM_S:
      return wavelength * ((redshift * 1e3) / VELOCITY_OF_LIGHT);
  }
}
