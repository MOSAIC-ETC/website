// DELETE /api/admin/invites/[id] — revoke an unconsumed invite

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
    const { id } = await params;

    const before = await prisma.invite.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Invite not found");
    if (before.consumedAt) throw new HttpError(409, "Invite has already been consumed");

    await prisma.invite.delete({ where: { id } });
    await writeAuditLog({
      action: "invite.revoke",
      resourceType: "invite",
      resourceId: id,
      description: `Revoked invite for ${before.email}`,
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
