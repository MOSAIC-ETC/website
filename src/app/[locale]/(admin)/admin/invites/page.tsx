import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { InvitesAdminClient } from "./client";

export default async function InvitesAdminPage() {
  const [invites, roles] = await Promise.all([
    prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        role: { select: { id: true, name: true } },
        creator: { select: { email: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Invites</h1>
        <p className="text-muted-foreground">Generate one-time signup links. Invitees pick a name and password to activate their account.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Invites</CardTitle></CardHeader>
        <CardContent>
          <InvitesAdminClient
            invites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              token: i.token,
              roleName: i.role.name,
              createdAt: i.createdAt.toISOString(),
              expiresAt: i.expiresAt.toISOString(),
              consumedAt: i.consumedAt?.toISOString() ?? null,
              creatorEmail: i.creator?.email ?? null,
            }))}
            roles={roles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
