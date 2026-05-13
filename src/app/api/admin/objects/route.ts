// POST /api/admin/objects — create a new object (paired preview + cube upload)
// GET — list

import { errorResponse, HttpError, requirePermission } from "@/lib/api-helpers";
import { createObjectWithFirstVersion, extractObjectFiles } from "@/lib/object-upload";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const rows = await prisma.file.findMany({
      where: { category: "OBJECT" },
      include: { currentVersion: true },
      orderBy: [{ slug: "asc" }, { assetRole: "asc" }],
    });
    // Group by slug for the UI
    const bySlug = new Map<string, { slug: string; name: string; isActive: boolean; preview?: typeof rows[0]; cube?: typeof rows[0] }>();
    for (const r of rows) {
      const baseName = r.name.replace(/ \((preview|cube)\)$/, "");
      const entry = bySlug.get(r.slug) ?? { slug: r.slug, name: baseName, isActive: r.isActive };
      if (r.assetRole === "PREVIEW") entry.preview = r;
      if (r.assetRole === "CUBE") entry.cube = r;
      entry.isActive = entry.isActive && r.isActive;
      bySlug.set(r.slug, entry);
    }
    return Response.json({ objects: Array.from(bySlug.values()) });
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
    if (!slug || !name) throw new HttpError(400, "slug and name are required");

    const { preview, cube } = await extractObjectFiles(form);
    const result = await createObjectWithFirstVersion({
      slug, name, preview, cube, createdBy: session.user.id, notes: notes ?? undefined,
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
