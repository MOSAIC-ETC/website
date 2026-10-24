/**
 * applySpatialTemplate: the 2D SNR map may take its morphology from the
 * integrated-light preview while keeping the cube's flux at the target
 * wavelength. The template must only set the shape: total flux is preserved,
 * the output is proportional to the template, and invalid pixels carry no flux.
 */

import { describe, expect, it } from "vitest";
import { applySpatialTemplate } from "@/lib/spatial-template";

const sum = (m: number[][]) => m.flat().reduce((a, b) => a + b, 0);

describe("applySpatialTemplate", () => {
  const flux = [
    [1, 2, 3],
    [4, 5, 6],
  ];

  it("preserves the total flux of the input map", () => {
    const template = [
      [0, 10, 0],
      [5, 20, 5],
    ];
    const out = applySpatialTemplate(flux, template);
    expect(sum(out)).toBeCloseTo(sum(flux), 12);
  });

  it("follows the template shape", () => {
    const template = [
      [1, 2, 1],
      [2, 4, 2],
    ];
    const out = applySpatialTemplate(flux, template);
    const k = out[0][0] / template[0][0];
    out.forEach((row, y) => row.forEach((v, x) => expect(v).toBeCloseTo(template[y][x] * k, 12)));
  });

  it("gives zero flux to NaN and negative template pixels", () => {
    const template = [
      [NaN, 1, -3],
      [1, 1, Infinity],
    ];
    const out = applySpatialTemplate(flux, template);
    expect(out[0][0]).toBe(0);
    expect(out[0][2]).toBe(0);
    expect(out[1][2]).toBe(0);
    expect(sum(out)).toBeCloseTo(sum(flux), 12);
  });

  it("ignores non-finite pixels of the flux map when computing the total", () => {
    const out = applySpatialTemplate([[NaN, 2]], [[1, 1]]);
    expect(out).toEqual([[1, 1]]);
  });

  it("rejects a template with a different shape", () => {
    expect(() => applySpatialTemplate(flux, [[1, 2]])).toThrow(/Spatial template/);
  });

  it("rejects a template without positive flux", () => {
    expect(() =>
      applySpatialTemplate(flux, [
        [0, 0, 0],
        [0, -1, NaN],
      ]),
    ).toThrow(/no positive flux/);
  });
});
