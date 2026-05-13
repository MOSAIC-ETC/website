// POST /api/admin/tables/[slug]/versions — replace a table with a new CSV version
// GET — list versions

import { errorResponse, HttpError, requirePermission } from "@/lib/api-helpers";
import { extractUploadedFile, uploadNewVersion } from "@/lib/file-upload";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const { slug } = await params;
    const form = await req.formData();
    const notes = (form.get("notes") as string | null) ?? undefined;
    const file = await extractUploadedFile(form);

    const slot = await prisma.file.findUnique({
      where: { category_slug_assetRole: { category: "TABLE", slug, assetRole: "DATA" } },
    });
    if (!slot) throw new HttpError(404, "Table not found");

    const version = await uploadNewVersion({
      fileId: slot.id,
      file,
      uploadedBy: session.user.id,
      notes: notes ?? undefined,
    });
    return Response.json({ versionId: version.id, versionNum: version.versionNum }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const { slug } = await params;
    const slot = await prisma.file.findUnique({
      where: { category_slug_assetRole: { category: "TABLE", slug, assetRole: "DATA" } },
      include: {
        versions: {
          include: { uploader: { select: { id: true, name: true, email: true } } },
          orderBy: { versionNum: "desc" },
        },
      },
    });
    if (!slot) throw new HttpError(404, "Table not found");
    return Response.json({ slot, versions: slot.versions });
  } catch (err) {
    return errorResponse(err);
  }
}
