// DELETE /api/admin/objects/[slug] — soft-deletes both preview + cube atomically

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_DELETE);
    const { slug } = await params;

    const slots = await prisma.file.findMany({ where: { category: "OBJECT", slug } });
    if (slots.length === 0) throw new HttpError(404, "Object not found");

    await prisma.$transaction(async (tx) => {
      for (const s of slots) {
        await tx.file.update({ where: { id: s.id }, data: { isActive: false } });
      }
    });
    await writeAuditLog({
      action: "object.delete",
      resourceType: "object",
      resourceId: slug,
      description: `Soft-deleted object ${slug} (preview + cube)`,
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
