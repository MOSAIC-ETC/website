import { type FITSHeaderCard, FITSWriter } from "@/lib/parser";

import { FILTERS } from "./filters";
import { OBJECTS } from "./objects";
import type { ETCFormValues, SNRDataPoint, SubcubeFormValues } from "./types";

/**
 * Triggers a download of a file with the given blob and filename.
 *
 * @param blob     The data to be downloaded as a Blob.
 * @param filename The name of the file to be downloaded.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a timestamp string suitable for filenames, in the format YYYY-MM-DDTHH-MM-SSZ.
 *
 * @returns A timestamp string with colons and dots replaced by dashes, and milliseconds removed.
 */
function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/-\d{3}Z$/, "Z");
}

/**
 * Exports the given SNR spectrum data as a TX file, including optional metadata from the form values.
 *
 * @param data   An array of SNRDataPoint objects representing the SNR spectrum to be exported.
 * @param values Optional ETCFormValues containing metadata about the observation, which will be included as comments in the TXT file.
 */
export function downloadSNRSpectrumTXT(data: SNRDataPoint[], values?: ETCFormValues) {
  const lines: string[] = [];
  lines.push("# MOSAIC ETC - SNR vs Wavelength");
  lines.push(`# Generated: ${new Date().toISOString()}`);

  if (values) {
    const filter = FILTERS.find((f) => f.id === values.filterId);
    lines.push(`# Instrument: ${values.instrument}`);
    lines.push(`# Filter: ${filter?.name ?? values.filterId}`);
    lines.push(`# Sky condition: ${values.skyCondition}`);
    lines.push(`# Number of exposures: ${values.numberOfExposures}`);
    lines.push(`# Exposure time (s): ${values.exposureTime}`);
    lines.push(`# Magnitude: ${values.magnitude} ${values.magnitudeUnit}`);
    lines.push(`# Redshift: ${values.redshift} (${values.redshiftUnit})`);
  }

  const colWavelength = "Wavelength (nm)";
  const colSNR = "SNR";
  const wWidth = Math.max(colWavelength.length, ...data.map((p) => p.wavelength.toFixed(4).length));
  const sWidth = Math.max(colSNR.length, ...data.map((p) => p.snr.toFixed(6).length));

  lines.push(`# ${colWavelength.padEnd(wWidth)}  ${colSNR}`);
  for (const point of data) {
    lines.push(`  ${point.wavelength.toFixed(4).padEnd(wWidth)}  ${point.snr.toFixed(6).padStart(sWidth)}`);
  }

  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `mosaic-etc-snr-${timestamp()}.txt`);
}

/**
 * Exports the given 2D SNR map data as a FITS file, including optional metadata from the form values as FITS header cards.
 *
 * @param data   A 2D array of numbers representing the SNR map to be exported.
 * @param values Optional SubcubeFormValues containing metadata about the observation, which will be included as header cards in the FITS file.
 */
export function downloadSNRMapFITS(data: number[][], values?: SubcubeFormValues) {
  const cards: FITSHeaderCard[] = [
    { key: "BUNIT", value: "SNR", comment: "Signal-to-noise ratio (dimensionless)" },
    { key: "ORIGIN", value: "MOSAIC ETC", comment: "Web ETC for MOSAIC on the ELT" },
    { key: "DATE", value: new Date().toISOString(), comment: "File creation UTC" },
    { key: "CTYPE1", value: "PIXEL", comment: "Spaxel index along NAXIS1" },
    { key: "CTYPE2", value: "PIXEL", comment: "Spaxel index along NAXIS2" },
  ];

  if (values) {
    const filter = FILTERS.find((f) => f.id === values.filterId);
    const object = OBJECTS.find((o) => o.id === values.objectId);

    cards.push(
      { key: "INSTRUME", value: values.instrument, comment: "MOSAIC instrument mode" },
      { key: "OBJECT", value: object?.name ?? values.objectId, comment: "Source data cube" },
      { key: "FILTER", value: filter?.name ?? values.filterId, comment: "Photometric filter" },
      { key: "SKYCOND", value: values.skyCondition, comment: "Sky background condition" },
      { key: "EXPTIME", value: values.exposureTime, comment: "[s] Exposure time per frame" },
      { key: "NEXP", value: values.numberOfExposures, comment: "Number of exposures" },
      { key: "MAGN", value: values.magnitude, comment: "Input source magnitude" },
      { key: "MAGUNIT", value: values.magnitudeUnit, comment: "Magnitude unit" },
      { key: "REDSHIFT", value: values.redshift, comment: "Input redshift value" },
      { key: "REDUNIT", value: values.redshiftUnit, comment: "Redshift unit" },
      { key: "TARGWAV", value: values.targetWavelength, comment: "[nm] Target wavelength" },
    );
  }

  const buffer = FITSWriter.write2D(data, cards);
  const blob = new Blob([buffer], { type: "application/fits" });
  triggerDownload(blob, `mosaic-etc-snr-map-${timestamp()}.fits`);
}
