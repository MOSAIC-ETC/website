// POST /api/admin/objects/[slug]/restore — restores both assets to a matching versionNum.
// Body: { versionNum: number }

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_RESTORE);
    const { slug } = await params;
    const body = (await req.json()) as { versionNum?: unknown };
    const versionNum = typeof body.versionNum === "number" && Number.isInteger(body.versionNum) ? body.versionNum : null;
    if (!versionNum || versionNum < 1) throw new HttpError(400, "versionNum is required (positive integer)");

    const slots = await prisma.file.findMany({
      where: { category: "OBJECT", slug },
      include: { versions: { where: { versionNum } } },
    });
    if (slots.length === 0) throw new HttpError(404, "Object not found");

    const previewSlot = slots.find((s) => s.assetRole === "PREVIEW");
    const cubeSlot = slots.find((s) => s.assetRole === "CUBE");
    const previewVersion = previewSlot?.versions[0];
    const cubeVersion = cubeSlot?.versions[0];
    if (!previewSlot || !cubeSlot || !previewVersion || !cubeVersion) {
      throw new HttpError(404, `v${versionNum} not found for both assets`);
    }

    await prisma.$transaction([
      prisma.file.update({ where: { id: previewSlot.id }, data: { currentVersionId: previewVersion.id, isActive: true } }),
      prisma.file.update({ where: { id: cubeSlot.id }, data: { currentVersionId: cubeVersion.id, isActive: true } }),
    ]);

    await writeAuditLog({
      action: "object.restore",
      resourceType: "object",
      resourceId: slug,
      description: `Restored object ${slug} to v${versionNum}`,
      metadata: { versionNum },
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
