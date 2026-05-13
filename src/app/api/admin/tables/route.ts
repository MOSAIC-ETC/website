// GET /api/admin/tables — list (creation not allowed; see TCC.md §4.2)

import { errorResponse, requirePermission } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.FILES_UPLOAD);
    const tables = await prisma.file.findMany({
      where: { category: "TABLE" },
      include: { currentVersion: true },
      orderBy: { slug: "asc" },
    });
    return Response.json({ tables });
  } catch (err) {
    return errorResponse(err);
  }
}
