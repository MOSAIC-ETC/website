/**
 * extractSubCube collapses the cube around the target wavelength for the 2D SNR
 * map. It must return the mean flux density over the window, not the sum: a sum
 * scales with the number of channels in the window (≈367 for ±30 nm at 710 nm
 * in MaNGA), which inflated the source counts of the 2D map.
 */

import { describe, expect, it } from "vitest";
import { extractSubCube } from "@/app/[locale]/(public)/etc/lib/calculate-2d";

// flux[λ][y][x]
function cube(values: number[], nY = 2, nX = 2): number[][][] {
  return values.map((v) => Array.from({ length: nY }, () => new Array<number>(nX).fill(v)));
}

describe("extractSubCube", () => {
  it("returns the per-channel mean inside the window", () => {
    const wavelengths = [700, 705, 710, 715, 720];
    const out = extractSubCube(cube([1, 2, 3, 4, 5]), wavelengths, 710, 5);
    // channels 705, 710, 715 → mean of 2, 3, 4
    out.flat().forEach((v) => expect(v).toBeCloseTo(3, 12));
  });

  it("does not depend on the window width for a flat spectrum", () => {
    const wavelengths = Array.from({ length: 101 }, (_, i) => 650 + i);
    const flat = cube(new Array(101).fill(7));
    const narrow = extractSubCube(flat, wavelengths, 700, 2);
    const wide = extractSubCube(flat, wavelengths, 700, 30);
    expect(narrow).toEqual(wide);
    narrow.flat().forEach((v) => expect(v).toBe(7));
  });

  it("throws when no channel falls inside the window", () => {
    expect(() => extractSubCube(cube([1, 2]), [400, 410], 700, 5)).toThrow(/No cube channels/);
  });
});
