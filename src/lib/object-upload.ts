// Paired upload of an object (preview + cube): the two assets must be
// uploaded together so they never drift in version number.

import { Readable } from "node:stream";

import { HttpError, writeAuditLog } from "@/lib/api-helpers";
import type { FileFromForm, FilterMetaInput } from "@/lib/file-upload";
import { extractUploadedFile } from "@/lib/file-upload";
import { validateUploadedFile } from "@/lib/file-validators";
import { prisma } from "@/lib/prisma";
import { abortTempFile, commitTempFile, finalRelativePath, writeTempFile } from "@/lib/storage";

export async function extractObjectFiles(form: FormData): Promise<{ preview: FileFromForm; cube: FileFromForm }> {
  const preview = await extractUploadedFile(form, "preview");
  const cube = await extractUploadedFile(form, "cube");
  return { preview, cube };
}

async function writeBufferToTemp(bytes: Buffer) {
  return writeTempFile(Readable.from(bytes));
}

async function validateOrThrow(bytes: Buffer, role: "PREVIEW" | "CUBE") {
  const r = await validateUploadedFile({ category: "OBJECT", assetRole: role, bytes });
  if (!r.ok) throw new HttpError(400, `Invalid ${role.toLowerCase()} FITS: ${r.reason}`);
}

export async function createObjectWithFirstVersion(args: {
  slug: string;
  name: string;
  preview: FileFromForm;
  cube: FileFromForm;
  createdBy: string;
  notes?: string;
}) {
  const { slug, name, preview, cube, createdBy, notes } = args;

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(slug)) throw new HttpError(400, "Invalid slug");

  const existing = await prisma.file.findFirst({
    where: { category: "OBJECT", slug },
  });
  if (existing) throw new HttpError(409, "Object with this slug already exists");

  await validateOrThrow(preview.bytes, "PREVIEW");
  await validateOrThrow(cube.bytes, "CUBE");

  const previewTmp = await writeBufferToTemp(preview.bytes);
  const cubeTmp = await writeBufferToTemp(cube.bytes);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const previewFile = await tx.file.create({
        data: { category: "OBJECT", slug, assetRole: "PREVIEW", name: `${name} (preview)`, createdBy },
      });
      const cubeFile = await tx.file.create({
        data: { category: "OBJECT", slug, assetRole: "CUBE", name: `${name} (cube)`, createdBy },
      });

      const previewPath = finalRelativePath({
        category: "OBJECT", slug, assetRole: "PREVIEW", versionNum: 1, fileHash: previewTmp.fileHash, originalFilename: preview.filename,
      });
      const cubePath = finalRelativePath({
        category: "OBJECT", slug, assetRole: "CUBE", versionNum: 1, fileHash: cubeTmp.fileHash, originalFilename: cube.filename,
      });

      const previewVersion = await tx.fileVersion.create({
        data: {
          fileId: previewFile.id, versionNum: 1,
          filename: preview.filename, storagePath: previewPath,
          fileHash: previewTmp.fileHash, fileSize: BigInt(previewTmp.fileSize), mimeType: preview.mimeType,
          notes, uploadedBy: createdBy,
        },
      });
      const cubeVersion = await tx.fileVersion.create({
        data: {
          fileId: cubeFile.id, versionNum: 1,
          filename: cube.filename, storagePath: cubePath,
          fileHash: cubeTmp.fileHash, fileSize: BigInt(cubeTmp.fileSize), mimeType: cube.mimeType,
          notes, uploadedBy: createdBy,
        },
      });

      await tx.file.update({ where: { id: previewFile.id }, data: { currentVersionId: previewVersion.id } });
      await tx.file.update({ where: { id: cubeFile.id }, data: { currentVersionId: cubeVersion.id } });

      return { slug, previewPath, cubePath, previewVersionId: previewVersion.id, cubeVersionId: cubeVersion.id };
    });

    await commitTempFile(previewTmp.tmpPath, result.previewPath);
    await commitTempFile(cubeTmp.tmpPath, result.cubePath);

    await writeAuditLog({
      action: "object.create",
      resourceType: "object",
      resourceId: slug,
      description: `Created object ${slug} v1 (paired upload)`,
      metadata: { previewVersionId: result.previewVersionId, cubeVersionId: result.cubeVersionId },
      performedBy: createdBy,
    });

    return result;
  } catch (err) {
    await abortTempFile(previewTmp.tmpPath);
    await abortTempFile(cubeTmp.tmpPath);
    throw err;
  }
}

export async function uploadNewObjectVersion(args: {
  slug: string;
  preview: FileFromForm;
  cube: FileFromForm;
  uploadedBy: string;
  notes?: string;
}) {
  const { slug, preview, cube, uploadedBy, notes } = args;

  const slots = await prisma.file.findMany({
    where: { category: "OBJECT", slug },
  });
  const previewSlot = slots.find((s) => s.assetRole === "PREVIEW");
  const cubeSlot = slots.find((s) => s.assetRole === "CUBE");
  if (!previewSlot || !cubeSlot) throw new HttpError(404, "Object not found");
  if (!previewSlot.isActive || !cubeSlot.isActive) throw new HttpError(409, "Object slot is inactive");

  await validateOrThrow(preview.bytes, "PREVIEW");
  await validateOrThrow(cube.bytes, "CUBE");

  const previewTmp = await writeBufferToTemp(preview.bytes);
  const cubeTmp = await writeBufferToTemp(cube.bytes);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock both parent rows to serialize concurrent uploads.
      await tx.$queryRaw`SELECT id FROM "File" WHERE id IN (${previewSlot.id}, ${cubeSlot.id}) FOR UPDATE`;

      const previewCount = await tx.fileVersion.count({ where: { fileId: previewSlot.id } });
      const cubeCount = await tx.fileVersion.count({ where: { fileId: cubeSlot.id } });
      if (previewCount !== cubeCount) {
        throw new HttpError(500, `Version drift detected: preview=${previewCount} cube=${cubeCount}`);
      }
      const versionNum = previewCount + 1;

      const previewPath = finalRelativePath({
        category: "OBJECT", slug, assetRole: "PREVIEW", versionNum, fileHash: previewTmp.fileHash, originalFilename: preview.filename,
      });
      const cubePath = finalRelativePath({
        category: "OBJECT", slug, assetRole: "CUBE", versionNum, fileHash: cubeTmp.fileHash, originalFilename: cube.filename,
      });

      const previewVersion = await tx.fileVersion.create({
        data: {
          fileId: previewSlot.id, versionNum,
          filename: preview.filename, storagePath: previewPath,
          fileHash: previewTmp.fileHash, fileSize: BigInt(previewTmp.fileSize), mimeType: preview.mimeType,
          notes, uploadedBy,
        },
      });
      const cubeVersion = await tx.fileVersion.create({
        data: {
          fileId: cubeSlot.id, versionNum,
          filename: cube.filename, storagePath: cubePath,
          fileHash: cubeTmp.fileHash, fileSize: BigInt(cubeTmp.fileSize), mimeType: cube.mimeType,
          notes, uploadedBy,
        },
      });

      await tx.file.update({ where: { id: previewSlot.id }, data: { currentVersionId: previewVersion.id } });
      await tx.file.update({ where: { id: cubeSlot.id }, data: { currentVersionId: cubeVersion.id } });

      return { versionNum, previewPath, cubePath, previewVersionId: previewVersion.id, cubeVersionId: cubeVersion.id };
    });

    await commitTempFile(previewTmp.tmpPath, result.previewPath);
    await commitTempFile(cubeTmp.tmpPath, result.cubePath);

    await writeAuditLog({
      action: "object.upload",
      resourceType: "object",
      resourceId: slug,
      description: `Uploaded object ${slug} v${result.versionNum} (paired)`,
      metadata: { versionNum: result.versionNum, previewVersionId: result.previewVersionId, cubeVersionId: result.cubeVersionId },
      performedBy: uploadedBy,
    });

    return result;
  } catch (err) {
    await abortTempFile(previewTmp.tmpPath);
    await abortTempFile(cubeTmp.tmpPath);
    throw err;
  }
}
