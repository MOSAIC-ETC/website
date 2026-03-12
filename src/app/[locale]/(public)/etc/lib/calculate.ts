import type { ETCFormValues, SNRDataPoint, FilterEntry, NMFile } from "./types";
import { HeatmapCell } from "@/components/chart/heatmap";
import { FITSFile } from "@/lib/parser";
import { CSVTables } from "../hooks/use-csv-tables";

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

  const { background, enclosedEnergy, hrThroughput, lrThroughput } = tables;

  const flux = object.get("FLUX")?.data as number[][][] | undefined; // shape (n_wave, ny, nx) = (4563, 54, 54)
  const wavelengths = object.get("WAVE")?.data as number[] | undefined; // shape (4563,)

  if (!flux || !wavelengths) {
    console.warn("FLUX or WAVE data not found in FITS file");
    return [];
  }

  const selectedFluxes: number[][] = getSelected(flux, objectSelection);
  const totalFlux: number[] = sumAll(selectedFluxes);

  return [];
}

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
