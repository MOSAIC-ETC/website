// POST /api/admin/filters/[slug]/versions — upload a new version of an existing filter

import { errorResponse, HttpError, requirePermission } from "@/lib/api-helpers";
import { extractUploadedFile, parseFilterMetadataJson, uploadNewVersion } from "@/lib/file-upload";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const { slug } = await params;
    const form = await req.formData();
    const notes = (form.get("notes") as string | null) ?? undefined;
    const filterMetadata = parseFilterMetadataJson(form.get("filterMetadata") as string | null);
    const file = await extractUploadedFile(form);

    const slot = await prisma.file.findUnique({
      where: { category_slug_assetRole: { category: "FILTER", slug, assetRole: "DATA" } },
    });
    if (!slot) throw new HttpError(404, "Filter not found");

    const version = await uploadNewVersion({
      fileId: slot.id,
      file,
      uploadedBy: session.user.id,
      notes: notes ?? undefined,
      filterMetadata,
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
      where: { category_slug_assetRole: { category: "FILTER", slug, assetRole: "DATA" } },
      include: {
        versions: {
          include: { filterMetadata: true, uploader: { select: { id: true, name: true, email: true } } },
          orderBy: { versionNum: "desc" },
        },
      },
    });
    if (!slot) throw new HttpError(404, "Filter not found");
    return Response.json({ slot, versions: slot.versions });
  } catch (err) {
    return errorResponse(err);
  }
}
