// POST /api/admin/params/[id]/revert — make a past snapshot current

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.PARAMS_REVERT);
    const { id } = await params;

    const target = await prisma.instrumentParameter.findUnique({ where: { id } });
    if (!target) throw new HttpError(404, "Snapshot not found");
    if (target.isCurrent) return Response.json({ ok: true, note: "already current" });

    await prisma.$transaction([
      prisma.instrumentParameter.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.instrumentParameter.update({ where: { id }, data: { isCurrent: true } }),
    ]);

    await writeAuditLog({
      action: "params.revert",
      resourceType: "params",
      resourceId: id,
      description: `Reverted to InstrumentParameter v${target.version}`,
      metadata: { version: target.version },
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
