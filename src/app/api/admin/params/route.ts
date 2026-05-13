// GET  /api/admin/params — list all snapshots, newest first
// POST /api/admin/params — create a new snapshot and make it current

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { instrumentParamsSchema } from "@/lib/schemas/instrument-params";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.PARAMS_EDIT);
    const list = await prisma.instrumentParameter.findMany({
      orderBy: { version: "desc" },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });
    return Response.json({ snapshots: list });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.PARAMS_EDIT);
    const body = (await req.json()) as { params?: unknown; notes?: unknown };
    const parsed = instrumentParamsSchema.safeParse(body.params);
    if (!parsed.success) {
      throw new HttpError(400, `Invalid params: ${parsed.error.message}`);
    }
    const notes = typeof body.notes === "string" ? body.notes : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const max = await tx.instrumentParameter.aggregate({ _max: { version: true } });
      const nextVersion = (max._max.version ?? 0) + 1;

      await tx.instrumentParameter.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.instrumentParameter.create({
        data: {
          version: nextVersion,
          isCurrent: true,
          params: parsed.data,
          notes,
          createdBy: session.user.id,
        },
      });
    });

    await writeAuditLog({
      action: "params.update",
      resourceType: "params",
      resourceId: result.id,
      description: `Created InstrumentParameter v${result.version}`,
      metadata: { version: result.version },
      performedBy: session.user.id,
    });

    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
