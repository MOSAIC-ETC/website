/**
 * Redistribute a flux map following the morphology of a template image.
 *
 * The template only sets the spatial shape: its non-finite and negative pixels
 * are treated as zero, it is normalized to unit sum, and the result carries the
 * same total flux as `fluxMap`. Used by the 2D SNR map to take the morphology of
 * an object's integrated-light preview while keeping the photometric level of
 * the cube at the target wavelength.
 *
 *   out[y][x] = T[y][x] / Σ T · Σ F
 */
export function applySpatialTemplate(fluxMap: number[][], template: number[][]): number[][] {
  const nY = fluxMap.length;
  const nX = fluxMap[0]?.length ?? 0;
  if (template.length !== nY || (template[0]?.length ?? 0) !== nX) {
    throw new Error(
      `Spatial template is ${template.length}×${template[0]?.length ?? 0} but the cube is ${nY}×${nX}`,
    );
  }

  const clean = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

  let totalFlux = 0;
  for (const row of fluxMap) for (const v of row) if (Number.isFinite(v)) totalFlux += v;

  let templateSum = 0;
  for (const row of template) for (const v of row) templateSum += clean(v);
  if (templateSum === 0) throw new Error("Spatial template has no positive flux");

  const scale = totalFlux / templateSum;
  return template.map((row) => row.map((v) => clean(v) * scale));
}
