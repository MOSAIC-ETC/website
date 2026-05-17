import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

import { RolesAdminClient } from "./client";

export default async function RolesAdminPage() {
  const t = await getTranslations("admin.roles");
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("all-card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RolesAdminClient
            initial={roles.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              permissions: r.permissions,
              userCount: r._count.users,
            }))}
            availablePermissions={[...ALL_PERMISSIONS]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
