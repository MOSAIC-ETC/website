import { NMParser, WavelengthUnit } from "@/lib/parser";

import type { FilterEntry, NMFile } from "./types";

export const FILTERS: FilterEntry[] = [
  {
    id: "u",
    name: "U (0.36 μm)",
    path: "/data/filters/BessFilter_U.txt",
    effWavelength: 360,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 1.79e7,
  },
  {
    id: "b",
    name: "B (0.44 μm)",
    path: "/data/filters/BessFilter_B.txt",
    effWavelength: 440,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 5.5e7,
  },
  {
    id: "v",
    name: "V (0.55 μm)",
    path: "/data/filters/BessFilter_V.txt",
    effWavelength: 550,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 9.71e7,
  },
  {
    id: "r",
    name: "R (0.67 μm)",
    path: "/data/filters/BessFilter_R.txt",
    effWavelength: 670,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 1.14e8,
  },
  {
    id: "i",
    name: "I (0.87 μm)",
    path: "/data/filters/BessFilter_I.txt",
    effWavelength: 870,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 1.06e8,
  },
  {
    id: "z",
    name: "Z (0.876 μm)",
    path: "/data/filters/GMOSNFilter_Z.txt",
    effWavelength: 876,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 3.9e9,
  },
  {
    id: "j",
    name: "J (1.25 μm)",
    path: "/data/filters/2massFilter_J.txt",
    effWavelength: 1250,
    effWavelengthUnit: WavelengthUnit.UM,
    zeroPoint: 1.06e8,
  },
  {
    id: "h",
    name: "H (1.65 μm)",
    path: "/data/filters/2massFilter_H.txt",
    effWavelength: 1650,
    effWavelengthUnit: WavelengthUnit.UM,
    zeroPoint: 1.06e8,
  },
  {
    id: "k",
    name: "K (2.2 μm)",
    path: "/data/filters/2massFilter_Ks.txt",
    effWavelength: 2200,
    effWavelengthUnit: WavelengthUnit.UM,
    zeroPoint: 9.36e7,
  },
  {
    id: "n",
    name: "N (10.5 μm)",
    path: "/data/filters/Filter_N.txt",
    effWavelength: 10500,
    effWavelengthUnit: WavelengthUnit.UM,
    zeroPoint: 3.02e6,
  },
  {
    id: "q",
    name: "Q (20.9 μm)",
    path: "/data/filters/Filter_Q.txt",
    effWavelength: 20900,
    effWavelengthUnit: WavelengthUnit.UM,
    zeroPoint: 3.27e5,
  },
  {
    id: "u_prime",
    name: "u' (0.35 μm)",
    path: "/data/filters/GMOSNFilter_u.txt",
    effWavelength: 350,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 1.6e7,
  },
  {
    id: "g_prime",
    name: "g' (0.48 μm)",
    path: "/data/filters/GMOSFilter_g.txt",
    effWavelength: 480,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 6.31e7,
  },
  {
    id: "r_prime",
    name: "r' (0.62 μm)",
    path: "/data/filters/GMOSNFilter_r.txt",
    effWavelength: 620,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 8.67e7,
  },
  {
    id: "i_prime",
    name: "i' (0.77 μm)",
    path: "/data/filters/GMOSNFilter_i.txt",
    effWavelength: 770,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 8.08e7,
  },
  {
    id: "z_prime",
    name: "z' (0.925 μm)",
    path: "/data/filters/GMOSN_z.txt",
    effWavelength: 925,
    effWavelengthUnit: WavelengthUnit.NM,
    zeroPoint: 5.21e7,
  },
].sort((a, b) => a.effWavelength - b.effWavelength);

/**
 * Fetches the filter curve data for a given filter entry and returns it as an array of transmission points.
 *
 * @param entry The filter entry containing the path to the filter curve file and the wavelength unit.
 * @returns A promise that resolves to an array of filter transmission points.
 * @throws An error if the filter curve file cannot be loaded or parsed.
 */
export async function fetchFilterCurve(entry: FilterEntry): Promise<NMFile[]> {
  const response = await fetch(entry.path);
  if (!response.ok) {
    throw new Error(`Failed to load filter curve: ${entry.path}`);
  }

  const text = await response.text();
  const parser = new NMParser(text, entry.effWavelengthUnit);
  return parser.parse();
}
