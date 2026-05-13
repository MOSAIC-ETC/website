// POST /api/admin/objects/[slug]/versions — new paired version
// GET — list versions for both assets

import { errorResponse, requirePermission } from "@/lib/api-helpers";
import { extractObjectFiles, uploadNewObjectVersion } from "@/lib/object-upload";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const { slug } = await params;
    const form = await req.formData();
    const notes = (form.get("notes") as string | null) ?? undefined;
    const { preview, cube } = await extractObjectFiles(form);

    const result = await uploadNewObjectVersion({
      slug, preview, cube, uploadedBy: session.user.id, notes: notes ?? undefined,
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const { slug } = await params;
    const slots = await prisma.file.findMany({
      where: { category: "OBJECT", slug },
      include: {
        versions: {
          include: { uploader: { select: { id: true, name: true, email: true } } },
          orderBy: { versionNum: "desc" },
        },
      },
    });
    return Response.json({ slots });
  } catch (err) {
    return errorResponse(err);
  }
}
