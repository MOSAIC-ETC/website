// Shared helpers for admin API routes: permission gating, audit logging,
// and consistent error responses.

import type { Session } from "next-auth";

import { auth } from "@/auth";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new HttpError(401, "Unauthorized");
  return session;
}

export async function requirePermission(key: PermissionKey): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.user.permissions, key)) {
    throw new HttpError(403, `Missing permission: ${key}`);
  }
  return session;
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unexpected error:", err);
  return Response.json({ error: "Internal Server Error" }, { status: 500 });
}

export type AuditLogInput = {
  action: string;
  resourceType: string;
  resourceId: string;
  description: string;
  metadata?: Record<string, unknown>;
  performedBy?: string | null;
};

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      description: input.description,
      metadata: input.metadata ? (input.metadata as object) : undefined,
      performedBy: input.performedBy ?? null,
    },
  });
}
