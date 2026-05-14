import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { UsersAdminClient } from "./client";

export default async function UsersAdminPage() {
  const t = await getTranslations("admin.users");
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
        <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{t("all-card")}</CardTitle></CardHeader>
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
