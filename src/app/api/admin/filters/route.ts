// POST /api/admin/filters — create a new filter slot + v1
// GET  /api/admin/filters — list all filters (active + soft-deleted)

import { errorResponse, requirePermission } from "@/lib/api-helpers";
import { createSlotWithFirstVersion, extractUploadedFile, parseFilterMetadataJson } from "@/lib/file-upload";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const filters = await prisma.file.findMany({
      where: { category: "FILTER" },
      include: { currentVersion: { include: { filterMetadata: true } } },
      orderBy: { slug: "asc" },
    });
    return Response.json({ filters });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const form = await req.formData();
    const slug = (form.get("slug") as string | null)?.trim();
    const name = (form.get("name") as string | null)?.trim();
    const notes = (form.get("notes") as string | null) ?? undefined;
    const filterMetadata = parseFilterMetadataJson(form.get("filterMetadata") as string | null);
    const file = await extractUploadedFile(form);
    if (!slug || !name) return Response.json({ error: "slug and name are required" }, { status: 400 });

    const result = await createSlotWithFirstVersion({
      category: "FILTER",
      slug,
      assetRole: "DATA",
      name,
      file,
      createdBy: session.user.id,
      notes: notes ?? undefined,
      filterMetadata,
    });

    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
