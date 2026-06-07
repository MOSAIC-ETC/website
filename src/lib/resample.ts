/**
 * Area-weighted (drizzle-style) resampling to a finer resolution grid.
 *
 * For each output pixel, computes the weighted average of all overlapping input
 * pixels, where the weight is the intersection area between the input pixel
 * footprint and the output pixel footprint (both expressed in input-pixel units).
 *
 * Flux conservation:
 *   Σ_{out} SB_out[i,j] × Ω_out  =  Σ_{in} SB_in[p,q] × Ω_in
 * where Ω_in = 1 (unit) and Ω_out = (1/scaleRatio)².
 *
 * @param map        2-D surface-brightness grid (arbitrary units per input pixel)
 * @param scaleRatio inputPixelScale / outputPixelScale  (e.g. 0.5 / 0.15 ≈ 3.33)
 */
export function areaWeightedResample(map: number[][], scaleRatio: number): number[][] {
  const inRows = map.length;
  const inCols = map[0].length;
  const outRows = Math.ceil(inRows * scaleRatio);
  const outCols = Math.ceil(inCols * scaleRatio);

  const result: number[][] = Array.from({ length: outRows }, () =>
    new Array<number>(outCols).fill(0),
  );

  const invScale = 1 / scaleRatio;

  for (let oy = 0; oy < outRows; oy++) {
    const inYLo = oy * invScale;
    const inYHi = (oy + 1) * invScale;
    const iyStart = Math.max(0, Math.floor(inYLo));
    const iyEnd = Math.min(inRows - 1, Math.floor(inYHi - 1e-12));

    for (let ox = 0; ox < outCols; ox++) {
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
