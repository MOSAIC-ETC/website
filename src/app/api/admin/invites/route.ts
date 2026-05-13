// GET  /api/admin/invites — list (active + consumed)
// POST /api/admin/invites — create a one-shot invite token

import { randomBytes } from "node:crypto";

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.USERS_MANAGE);
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        role: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    return Response.json({ invites });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
    const body = (await req.json()) as { email?: unknown; roleId?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const roleId = typeof body.roleId === "string" ? body.roleId : null;
    if (!email || !/.+@.+\..+/.test(email)) throw new HttpError(400, "Valid email is required");
    if (!roleId) throw new HttpError(400, "roleId is required");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new HttpError(404, "Role not found");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new HttpError(409, "A user with this email already exists");

    const token = randomBytes(32).toString("base64url");
    const invite = await prisma.invite.create({
      data: {
        email,
        token,
        roleId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        createdBy: session.user.id,
      },
    });

    await writeAuditLog({
      action: "invite.create",
      resourceType: "invite",
      resourceId: invite.id,
      description: `Invited ${email} as ${role.name}`,
      metadata: { email, roleName: role.name },
      performedBy: session.user.id,
    });

    return Response.json({
      id: invite.id,
      token: invite.token,
      url: `/accept-invite/${invite.token}`,
      expiresAt: invite.expiresAt,
    }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
