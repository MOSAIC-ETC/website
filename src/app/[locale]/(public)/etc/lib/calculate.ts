import type { ETCFormValues, SNRDataPoint, FilterEntry, FilterTransmissionPoint } from "./types";

/**
 * TODO: Replace this mock implementation with the actual ETC calculation.
 * The function should take the form values and return an array of
 * { wavelength, snr } data points for the specified wavelength range.
 */
export function calculateSNR(
  values: ETCFormValues,
  filter: FilterEntry,
  filterCurve: FilterTransmissionPoint[],
): SNRDataPoint[] {
  console.log("Calculating SNR with values:", values);
  console.log("Using filter:", filter);
  console.log("Filter curve points:", filterCurve);

  const { wavelengthMin, wavelengthMax, numberOfExposures, exposureTime } = values;
  const points = 200;
  const step = (wavelengthMax - wavelengthMin) / (points - 1);

  return Array.from({ length: points }, (_, i) => {
    const wavelength = wavelengthMin + i * step;
    const center = (wavelengthMin + wavelengthMax) / 2;
    const sigma = (wavelengthMax - wavelengthMin) / 4;
    const gaussian = Math.exp(-((wavelength - center) ** 2) / (2 * sigma ** 2));
    const scaleFactor = Math.sqrt(numberOfExposures * exposureTime) / 10;
    const snr = Math.max(0, gaussian * 50 * scaleFactor + (Math.random() - 0.5) * 3);

    return { wavelength: Math.round(wavelength), snr: Math.round(snr * 100) / 100 };
  });
}
