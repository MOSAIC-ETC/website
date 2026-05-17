// Server-side format validation for uploads. Reject before any DB or storage
// writes — "validate before persist".

import type { AssetRole, FileCategory } from "@prisma/client";

import { CSVParser, FITSParser, NMParser, WavelengthUnit } from "@/lib/parser";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export async function validateUploadedFile(args: {
  category: FileCategory;
  assetRole: AssetRole;
  bytes: Buffer;
  filterUnit?: "NM" | "UM";
}): Promise<ValidationResult> {
  const { category, assetRole, bytes, filterUnit } = args;
  try {
    if (category === "FILTER") {
      const unit = filterUnit === "UM" ? WavelengthUnit.UM : WavelengthUnit.NM;
      new NMParser(bytes.toString("utf8"), unit).parse();
      return { ok: true };
    }
    if (category === "TABLE") {
      new CSVParser(bytes.toString("utf8")).parse();
      return { ok: true };
    }
    if (category === "OBJECT" && (assetRole === "PREVIEW" || assetRole === "CUBE")) {
      // FITSParser expects an ArrayBuffer; Buffer.buffer may be a slice of a
      // larger pool, so slice precisely.
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      new FITSParser(ab).parse();
      return { ok: true };
    }
    return { ok: false, reason: `Unsupported category/role combination: ${category}/${assetRole}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Parse error" };
  }
}
