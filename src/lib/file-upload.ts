// Core file-upload pipeline. Used by all admin file routes.
// Implements: validate format → stream-write to temp → DB tx with row lock
// → atomic rename → audit. See TCC.md §3.5, §3.6.

import { Readable } from "node:stream";

import type { AssetRole, FileCategory, FileVersion, Prisma } from "@prisma/client";

import { HttpError, writeAuditLog } from "@/lib/api-helpers";
import { validateUploadedFile } from "@/lib/file-validators";
import { prisma } from "@/lib/prisma";
import { abortTempFile, commitTempFile, finalRelativePath, writeTempFile } from "@/lib/storage";

export type FilterMetaInput = {
  effWavelengthNm: number;
  effWavelengthUnit: "NM" | "UM";
  zeroPoint: number;
};

export type FileFromForm = {
  bytes: Buffer;
  filename: string;
  mimeType: string;
};

export async function extractUploadedFile(form: FormData, field = "file"): Promise<FileFromForm> {
  const f = form.get(field);
  if (!(f instanceof File)) throw new HttpError(400, `Missing form field: ${field}`);
  const bytes = Buffer.from(await f.arrayBuffer());
  return { bytes, filename: f.name, mimeType: f.type || "application/octet-stream" };
}

async function bufferToTempStream(bytes: Buffer) {
  return writeTempFile(Readable.from(bytes));
}

async function nextVersionNum(tx: Prisma.TransactionClient, fileId: string): Promise<number> {
  // Row-level lock on the parent File serializes concurrent uploads for the
  // same slot, preventing versionNum collisions. See TCC.md §3.6.
  await tx.$queryRaw`SELECT id FROM "File" WHERE id = ${fileId} FOR UPDATE`;
  const count = await tx.fileVersion.count({ where: { fileId } });
  return count + 1;
}

export async function uploadNewVersion(args: {
  fileId: string;
  file: FileFromForm;
  uploadedBy: string;
  notes?: string;
  filterMetadata?: FilterMetaInput;
}): Promise<FileVersion> {
  const { fileId, file, uploadedBy, notes, filterMetadata } = args;

  const existing = await prisma.file.findUnique({ where: { id: fileId } });
  if (!existing) throw new HttpError(404, "File not found");
  if (!existing.isActive) throw new HttpError(409, "File slot is inactive");

  if (existing.category === "FILTER" && !filterMetadata) {
    throw new HttpError(400, "Filter uploads require filterMetadata");
  }

  const validation = await validateUploadedFile({
    category: existing.category,
    assetRole: existing.assetRole,
    bytes: file.bytes,
    filterUnit: filterMetadata?.effWavelengthUnit,
  });
  if (!validation.ok) throw new HttpError(400, `Invalid file: ${validation.reason}`);

  const { tmpPath, fileHash, fileSize } = await bufferToTempStream(file.bytes);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const versionNum = await nextVersionNum(tx, fileId);
      const storagePath = finalRelativePath({
        category: existing.category,
        slug: existing.slug,
        assetRole: existing.assetRole,
        versionNum,
        fileHash,
        originalFilename: file.filename,
      });

      const version = await tx.fileVersion.create({
        data: {
          fileId,
          versionNum,
          filename: file.filename,
          storagePath,
          fileHash,
          fileSize: BigInt(fileSize),
          mimeType: file.mimeType,
          notes,
          uploadedBy,
          filterMetadata: filterMetadata
            ? {
                create: {
                  effWavelengthNm: filterMetadata.effWavelengthNm,
                  effWavelengthUnit: filterMetadata.effWavelengthUnit,
                  zeroPoint: filterMetadata.zeroPoint,
                },
              }
            : undefined,
        },
      });

      await tx.file.update({
        where: { id: fileId },
        data: { currentVersionId: version.id },
      });

      return { version, storagePath };
    });

    await commitTempFile(tmpPath, result.storagePath);

    await writeAuditLog({
      action: "file.upload",
      resourceType: "file",
      resourceId: fileId,
      description: `Uploaded ${existing.category}/${existing.slug}/${existing.assetRole} v${result.version.versionNum}`,
      metadata: { versionId: result.version.id, fileHash, fileSize },
      performedBy: uploadedBy,
    });

    return result.version;
  } catch (err) {
    await abortTempFile(tmpPath);
    throw err;
  }
}

export async function createSlotWithFirstVersion(args: {
  category: FileCategory;
  slug: string;
  assetRole: AssetRole;
  name: string;
  file: FileFromForm;
  createdBy: string;
  notes?: string;
  filterMetadata?: FilterMetaInput;
}): Promise<{ fileId: string; versionId: string }> {
  const { category, slug, assetRole, name, file, createdBy, notes, filterMetadata } = args;

  if (category === "FILTER" && !filterMetadata) {
    throw new HttpError(400, "Filter uploads require filterMetadata");
  }
  if (category === "TABLE") {
    throw new HttpError(409, "Table slots are fixed and cannot be created via API");
  }

  const slugOk = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug);
  if (!slugOk) throw new HttpError(400, "Invalid slug — use lowercase letters, digits, hyphens, underscores");

  const existing = await prisma.file.findUnique({
    where: { category_slug_assetRole: { category, slug, assetRole } },
  });
  if (existing) throw new HttpError(409, "Slot already exists for this category/slug/role");

  const validation = await validateUploadedFile({
    category,
    assetRole,
    bytes: file.bytes,
    filterUnit: filterMetadata?.effWavelengthUnit,
  });
  if (!validation.ok) throw new HttpError(400, `Invalid file: ${validation.reason}`);

  const { tmpPath, fileHash, fileSize } = await bufferToTempStream(file.bytes);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newFile = await tx.file.create({
        data: { category, slug, assetRole, name, createdBy },
      });
      const storagePath = finalRelativePath({
        category,
        slug,
        assetRole,
        versionNum: 1,
        fileHash,
        originalFilename: file.filename,
      });
      const version = await tx.fileVersion.create({
        data: {
          fileId: newFile.id,
          versionNum: 1,
          filename: file.filename,
          storagePath,
          fileHash,
          fileSize: BigInt(fileSize),
          mimeType: file.mimeType,
          notes,
          uploadedBy: createdBy,
          filterMetadata: filterMetadata
            ? {
                create: {
                  effWavelengthNm: filterMetadata.effWavelengthNm,
                  effWavelengthUnit: filterMetadata.effWavelengthUnit,
                  zeroPoint: filterMetadata.zeroPoint,
                },
              }
            : undefined,
        },
      });
      await tx.file.update({
        where: { id: newFile.id },
        data: { currentVersionId: version.id },
      });
      return { fileId: newFile.id, versionId: version.id, storagePath };
    });

    await commitTempFile(tmpPath, result.storagePath);

    await writeAuditLog({
      action: "file.create",
      resourceType: "file",
      resourceId: result.fileId,
      description: `Created ${category}/${slug}/${assetRole} v1`,
      metadata: { fileHash, fileSize },
      performedBy: createdBy,
    });

    return { fileId: result.fileId, versionId: result.versionId };
  } catch (err) {
    await abortTempFile(tmpPath);
    throw err;
  }
}

export function parseFilterMetadataJson(raw: string | null): FilterMetaInput | undefined {
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "filterMetadata is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new HttpError(400, "filterMetadata must be an object");
  }
  const obj = parsed as Record<string, unknown>;
  const eff = typeof obj.effWavelengthNm === "number" ? obj.effWavelengthNm : NaN;
  const unit = obj.effWavelengthUnit === "NM" || obj.effWavelengthUnit === "UM" ? obj.effWavelengthUnit : null;
  const zp = typeof obj.zeroPoint === "number" ? obj.zeroPoint : NaN;
  if (!Number.isFinite(eff) || eff <= 0) throw new HttpError(400, "filterMetadata.effWavelengthNm must be a positive number");
  if (!unit) throw new HttpError(400, "filterMetadata.effWavelengthUnit must be 'NM' or 'UM'");
  if (!Number.isFinite(zp) || zp <= 0) throw new HttpError(400, "filterMetadata.zeroPoint must be a positive number");
  return { effWavelengthNm: eff, effWavelengthUnit: unit, zeroPoint: zp };
}
