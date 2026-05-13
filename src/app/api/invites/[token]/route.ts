// GET  /api/invites/[token] — public: check whether an invite is valid (used by the accept page to render)
// POST /api/invites/[token] — public: consume the invite by submitting name + password

import bcrypt from "bcryptjs";

import { errorResponse, HttpError, writeAuditLog } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

async function findValid(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { role: { select: { id: true, name: true } } },
  });
  if (!invite) throw new HttpError(404, "Invite not found");
  if (invite.consumedAt) throw new HttpError(409, "Invite already consumed");
  if (invite.expiresAt < new Date()) throw new HttpError(410, "Invite expired");
  return invite;
}

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invite = await findValid(token);
    return Response.json({
      email: invite.email,
      role: invite.role.name,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = (await req.json()) as { name?: unknown; password?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const password = typeof body.password === "string" ? body.password : null;
    if (!name) throw new HttpError(400, "name is required");
    if (!password || password.length < 8) throw new HttpError(400, "password must be at least 8 characters");

    const invite = await findValid(token);

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) throw new HttpError(409, "A user with this email already exists");

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: invite.email, name, passwordHash, roleId: invite.roleId },
      });
      await tx.invite.update({ where: { id: invite.id }, data: { consumedAt: new Date() } });
      return created;
    });

    await writeAuditLog({
      action: "user.create",
      resourceType: "user",
      resourceId: user.id,
      description: `Created user ${user.email} (via invite ${invite.id})`,
      metadata: { inviteId: invite.id },
      performedBy: invite.createdBy,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
