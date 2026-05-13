// Soft delete + restore helpers shared by all file admin routes.

import { HttpError, writeAuditLog } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function softDeleteFile(args: { fileId: string; performedBy: string }) {
  const file = await prisma.file.findUnique({ where: { id: args.fileId } });
  if (!file) throw new HttpError(404, "File not found");
  if (!file.isActive) return file;

  const updated = await prisma.file.update({
    where: { id: args.fileId },
    data: { isActive: false },
  });
  await writeAuditLog({
    action: "file.delete",
    resourceType: "file",
    resourceId: args.fileId,
    description: `Soft-deleted ${file.category}/${file.slug}/${file.assetRole}`,
    performedBy: args.performedBy,
  });
  return updated;
}

export async function restoreFileVersion(args: { fileId: string; versionId: string; performedBy: string }) {
  const [file, version] = await Promise.all([
    prisma.file.findUnique({ where: { id: args.fileId } }),
    prisma.fileVersion.findUnique({ where: { id: args.versionId } }),
  ]);
  if (!file) throw new HttpError(404, "File not found");
  if (!version || version.fileId !== args.fileId) throw new HttpError(404, "Version does not belong to this file");

  await prisma.file.update({
    where: { id: args.fileId },
    data: { currentVersionId: args.versionId, isActive: true },
  });
  await writeAuditLog({
    action: "file.restore",
    resourceType: "file",
    resourceId: args.fileId,
    description: `Restored ${file.category}/${file.slug}/${file.assetRole} to v${version.versionNum}`,
    metadata: { versionId: args.versionId, versionNum: version.versionNum },
    performedBy: args.performedBy,
  });
}
