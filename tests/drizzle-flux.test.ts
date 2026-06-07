/**
 * Flux-conservation verification for areaWeightedResample (drizzle resampling).
 *
 * Conservation property:
 *   Σ SB_out[i,j] × Ω_actual(i,j) = Σ SB_in[p,q]
 *
 * where Ω_actual(i,j) is the physical area of each output pixel clipped to the
 * input grid boundary. Interior pixels have Ω = invScale²; boundary pixels have
 * Ω ≤ invScale² (partial coverage). Using Math.ceil for output dimensions ensures
 * every input pixel is fully covered, so the equality holds within floating-point
 * rounding (~10⁻¹⁵).
 */

import { describe, expect, it } from "vitest";
import { areaWeightedResample } from "@/lib/resample";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function totalFluxIn(grid: number[][]): number {
  let sum = 0;
  for (const row of grid) for (const v of row) sum += v;
  return sum;
}

function totalFluxOut(grid: number[][], inRows: number, inCols: number, invScale: number): number {
  let sum = 0;
  for (let oy = 0; oy < grid.length; oy++) {
    const covY = Math.min((oy + 1) * invScale, inRows) - oy * invScale;
    for (let ox = 0; ox < grid[0].length; ox++) {
      const covX = Math.min((ox + 1) * invScale, inCols) - ox * invScale;
      sum += grid[oy][ox] * covY * covX;
    }
  }
  return sum;
}

function relativeError(fluxIn: number, fluxOut: number): number {
  return Math.abs(fluxOut - fluxIn) / Math.abs(fluxIn);
}

function makeGrid(rows: number, cols: number, f: (r: number, c: number) => number): number[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => f(r, c)));
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const MANGA_SCALE = 0.5;   // arcsec/pixel
const MOSAIC_SCALE = 0.15; // arcsec/pixel
const REAL_RATIO = MANGA_SCALE / MOSAIC_SCALE; // ≈ 3.333...
const MAX_REL_ERROR = 1e-10;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("areaWeightedResample — conservação de fluxo", () => {
  function runCase(label: string, grid: number[][], scaleRatio: number) {
    it(label, () => {
      const inRows = grid.length;
      const inCols = grid[0].length;
      const output = areaWeightedResample(grid, scaleRatio);
      const fluxIn = totalFluxIn(grid);
      const fluxOut = totalFluxOut(output, inRows, inCols, 1 / scaleRatio);
      const relErr = relativeError(fluxIn, fluxOut);
      expect(relErr, `erro relativo = ${relErr.toExponential(2)}`).toBeLessThan(MAX_REL_ERROR);
    });
  }

  runCase(
    "Uniforme 5×5, R=3 (inteiro)",
    makeGrid(5, 5, () => 1.0),
    3,
  );

  runCase(
    "Gradiente 8×8, R=3 (inteiro)",
    makeGrid(8, 8, (r, c) => r + c + 1),
    3,
  );

  runCase(
    "Pixel único central 7×7, R=10/3",
    makeGrid(7, 7, (r, c) => (r === 3 && c === 3 ? 100.0 : 0.0)),
    10 / 3,
  );

  runCase(
    "Senoidal 10×10, R≈3,333 (escala MaNGA→MOSAIC)",
    makeGrid(10, 10, (r, c) => Math.abs(Math.sin(r + 1) * Math.cos(c + 1)) * 50 + 1),
    REAL_RATIO,
  );

  runCase(
    "Aleatório determinístico 20×20, R≈3,333",
    makeGrid(20, 20, (r, c) => ((r * 37 + c * 13 + 7) % 97) + 0.5),
    REAL_RATIO,
  );

  runCase(
    "Galáxia simulada 50×50, R≈3,333",
    makeGrid(50, 50, (r, c) => {
      const cy = 25, cx = 25, sigma = 10;
      return Math.exp(-((r - cy) ** 2 + (c - cx) ** 2) / (2 * sigma ** 2)) * 1000 + 0.1;
    }),
    REAL_RATIO,
  );
});
