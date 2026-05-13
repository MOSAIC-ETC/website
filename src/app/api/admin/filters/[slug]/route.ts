// DELETE /api/admin/filters/[slug] — soft delete

import { errorResponse, HttpError, requirePermission } from "@/lib/api-helpers";
import { softDeleteFile } from "@/lib/file-admin";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_DELETE);
    const { slug } = await params;
    const slot = await prisma.file.findUnique({
      where: { category_slug_assetRole: { category: "FILTER", slug, assetRole: "DATA" } },
    });
    if (!slot) throw new HttpError(404, "Filter not found");
    await softDeleteFile({ fileId: slot.id, performedBy: session.user.id });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
