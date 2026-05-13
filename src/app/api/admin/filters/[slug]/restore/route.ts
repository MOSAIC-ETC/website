// POST /api/admin/filters/[slug]/restore — restore a previous version

import { errorResponse, HttpError, requirePermission } from "@/lib/api-helpers";
import { restoreFileVersion } from "@/lib/file-admin";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_RESTORE);
    const { slug } = await params;
    const body = (await req.json()) as { versionId?: unknown };
    const versionId = typeof body.versionId === "string" ? body.versionId : null;
    if (!versionId) throw new HttpError(400, "versionId is required");

    const slot = await prisma.file.findUnique({
      where: { category_slug_assetRole: { category: "FILTER", slug, assetRole: "DATA" } },
    });
    if (!slot) throw new HttpError(404, "Filter not found");

    await restoreFileVersion({ fileId: slot.id, versionId, performedBy: session.user.id });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
