import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { UsersAdminClient } from "./client";

export default async function UsersAdminPage() {
  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: { role: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Users</h1>
        <p className="text-muted-foreground">Change roles or remove accounts. The last user holding a self-locking permission cannot be removed or downgraded.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>All users</CardTitle></CardHeader>
        <CardContent>
          <UsersAdminClient
            users={users.map((u) => ({
              id: u.id,
              email: u.email,
              name: u.name,
              roleId: u.role.id,
              roleName: u.role.name,
              createdAt: u.createdAt.toISOString(),
            }))}
            roles={roles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
