import type { CSVTables } from "../hooks/use-csv-tables";
import { calculateSNR } from "./calculate";
import { calculate2DSNR } from "./calculate-2d";
import type { ETCFormValues, FilterEntry, NMFile, SNRDataPoint, SubcubeFormValues } from "./types";

export type WorkerRequest =
  | {
      id: number;
      type: "snr";
      values: ETCFormValues;
      filter: FilterEntry;
      filterCurve: NMFile[];
      flux: number[][][];
      wavelengths: number[];
      tables: CSVTables;
    }
  | {
      id: number;
      type: "snr-2d";
      values: SubcubeFormValues;
      filter: FilterEntry;
      filterCurve: NMFile[];
      flux: number[][][];
      wavelengths: number[];
      tables: CSVTables;
    };

export type WorkerResponse =
  | { id: number; type: "snr"; data: SNRDataPoint[] }
  | { id: number; type: "snr-2d"; data: number[][] }
  | { id: number; type: "error"; message: string };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    if (req.type === "snr") {
      const data = calculateSNR(
        req.values,
        req.filter,
        req.filterCurve,
        req.values.selection,
        req.flux,
        req.wavelengths,
        req.tables,
      );
      const response: WorkerResponse = { id: req.id, type: "snr", data };
      self.postMessage(response);
    } else if (req.type === "snr-2d") {
      const data = calculate2DSNR(req.values, req.filter, req.filterCurve, req.flux, req.wavelengths, req.tables);
      const response: WorkerResponse = { id: req.id, type: "snr-2d", data };
      self.postMessage(response);
    }
  } catch (err) {
    const response: WorkerResponse = {
      id: req.id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
