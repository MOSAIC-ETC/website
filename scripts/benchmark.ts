/**
 * Performance benchmark for the client-side SNR computation kernels.
 *
 * Loads the three real MaNGA demonstration cubes (9041-6101, 8485-1901,
 * 7443-12701), calibration tables and a filter curve straight from `storage/`,
 * then times the exact functions the Web Worker calls (`calculateSNR`,
 * `calculate2DSNR`) per cube, plus the standalone drizzle resampler. Reporting
 * all three cubes shows how the cost scales with the spatial grid size.
 *
 * Run from the website root:  npx tsx scripts/benchmark.ts
 *
 * Caveat: this measures the compute kernel in Node's V8 (same engine family as
 * the browser); it excludes Web Worker postMessage/serialization overhead.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";

import { calculateSNR } from "@/app/[locale]/(public)/etc/lib/calculate";
import { calculate2DSNR } from "@/app/[locale]/(public)/etc/lib/calculate-2d";
import {
  Instrument,
  MagnitudeUnit,
  RedshiftUnit,
  SkyCondition,
} from "@/app/[locale]/(public)/etc/lib/types";
import { CSVParser, FITSParser, NMParser, WavelengthUnit } from "@/lib/parser";
import { areaWeightedResample } from "@/lib/resample";
import { DEFAULT_INSTRUMENT_PARAMS } from "@/lib/schemas/instrument-params";

import type { CSVTables } from "@/app/[locale]/(public)/etc/hooks/use-csv-tables";
import type {
  ETCFormValues,
  FilterEntry,
  SubcubeFormValues,
} from "@/app/[locale]/(public)/etc/lib/types";
import type { HeatmapCell } from "@/components/chart/heatmap";

const STORAGE = "storage";

function latestVersionDir(base: string): string {
  const dirs = readdirSync(base).filter((d) => !d.startsWith("."));
  dirs.sort();
  return dirs[dirs.length - 1];
}
function readArrayBuffer(p: string): ArrayBuffer {
  const b = readFileSync(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
function tablePath(name: string): string {
  const base = `${STORAGE}/tables/${name}`;
  return `${base}/${latestVersionDir(base)}/data.csv`;
}

function cubePathFor(slug: string): string {
  const base = `${STORAGE}/objects/${slug}`;
  for (const d of readdirSync(base).filter((x) => !x.startsWith("."))) {
    const p = `${base}/${d}/cube.fits`;
    if (existsSync(p)) return p;
  }
  throw new Error(`cube.fits not found for ${slug}`);
}

// --- Load the calibration tables and filter once (shared across all cubes) ---
const tables: CSVTables = {
  background: new CSVParser(readFileSync(tablePath("background"), "utf8")).parse(),
  enclosedEnergy: new CSVParser(readFileSync(tablePath("enclosedEnergy"), "utf8")).parse(),
  lrThroughput: new CSVParser(readFileSync(tablePath("lrThroughput"), "utf8")).parse(),
  hrThroughput: new CSVParser(readFileSync(tablePath("hrThroughput"), "utf8")).parse(),
};

const vBase = `${STORAGE}/filters/v`;
const filterCurve = new NMParser(
  readFileSync(`${vBase}/${latestVersionDir(vBase)}/data.txt`, "utf8"),
  WavelengthUnit.NM,
).parse();
const filter: FilterEntry = {
  id: "v",
  name: "V",
  path: "",
  effWavelength: 551,
  effWavelengthUnit: WavelengthUnit.NM,
  zeroPoint: 3.631e-9,
  hash: "",
};

// The three demonstration cubes, in ascending fibre-bundle / grid size.
const OBJECTS = ["manga-9041-6101", "manga-8485-1901", "manga-7443-12701"];

// --- Timing harness ---
function bench(label: string, fn: () => unknown, runs = 30) {
  for (let i = 0; i < 3; i++) fn(); // warm-up
  const t: number[] = [];
  for (let i = 0; i < runs; i++) {
    const s = performance.now();
    fn();
    t.push(performance.now() - s);
  }
  t.sort((a, b) => a - b);
  const pct = (p: number) => t[Math.min(t.length - 1, Math.floor(p * t.length))];
  console.log(
    `  ${label.padEnd(34)} min ${t[0].toFixed(1).padStart(7)}  p50 ${pct(0.5).toFixed(1).padStart(7)}` +
      `  p95 ${pct(0.95).toFixed(1).padStart(7)}  max ${t[t.length - 1].toFixed(1).padStart(7)}  ms`,
  );
}

console.log("\n=== MOSAIC ETC — client-side compute benchmark ===");
console.log(`Node ${process.version} | ${os.cpus()[0].model} | ${os.cpus().length} cores`);

for (const slug of OBJECTS) {
  // --- Load the real input data (same parsers the browser uses) ---
  const cube = new FITSParser(readArrayBuffer(cubePathFor(slug))).parse();
  const flux = cube.get("FLUX")?.data as number[][][] | undefined;
  const wavelengths = cube.get("WAVE")?.data as number[] | undefined;
  if (!flux || !wavelengths) throw new Error(`${slug}: cube missing FLUX/WAVE HDU`);

  const nWave = wavelengths.length;
  const nY = flux[0].length;
  const nX = flux[0][0].length;

  // Representative spatial selection for the 1D path: a centred square aperture.
  const side = Math.min(nY, nX, 20);
  const y0 = Math.floor((nY - side) / 2);
  const x0 = Math.floor((nX - side) / 2);
  const selection: HeatmapCell[] = [];
  for (let yy = 0; yy < side; yy++)
    for (let xx = 0; xx < side; xx++) selection.push({ x: x0 + xx, y: y0 + yy });

  const baseForm = {
    objectId: slug,
    numberOfExposures: 3,
    exposureTime: 900,
    magnitude: 21,
    magnitudeUnit: MagnitudeUnit.AB,
    redshift: 0.05,
    redshiftUnit: RedshiftUnit.Z,
    filterId: "v",
    skyCondition: SkyCondition.NO_MOON,
  };
  const values1d: ETCFormValues = { ...baseForm, instrument: Instrument.MOS_VIS, selection };
  const values2d: SubcubeFormValues = { ...baseForm, instrument: Instrument.IFU, targetWavelength: 650 };

  const outRows = Math.ceil(nY * (0.5 / 0.15));
  const outCols = Math.ceil(nX * (0.5 / 0.15));
  console.log(`\n--- ${slug}: λ×Y×X = ${nWave}×${nY}×${nX}  (${(nWave * nY * nX).toLocaleString()} voxels)` +
    ` | raw cube ≈ ${((nWave * nY * nX * 8) / 1e6).toFixed(0)} MB (float64) | drizzle ${nY}×${nX}→${outRows}×${outCols} ---`);

  bench("1D  calculateSNR  (MOS VIS)", () =>
    calculateSNR(values1d, filter, filterCurve, selection, flux, wavelengths, tables, DEFAULT_INSTRUMENT_PARAMS),
  );
  bench("2D  calculate2DSNR (IFU)", () =>
    calculate2DSNR(values2d, filter, filterCurve, flux, wavelengths, tables, DEFAULT_INSTRUMENT_PARAMS),
  );

  // Drizzle in isolation, at the real 2D spatial scale.
  const sbMap: number[][] = Array.from({ length: nY }, () => Array.from({ length: nX }, () => Math.random()));
  bench(`drizzle areaWeightedResample ${nY}×${nX}→${outRows}×${outCols}`, () =>
    areaWeightedResample(sbMap, 0.5 / 0.15),
  );
}

console.log("");
