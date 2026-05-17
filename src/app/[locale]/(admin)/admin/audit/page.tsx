import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { AuditAdminClient } from "./client";

export default async function AuditAdminPage() {
  const t = await getTranslations("admin.audit");

  // Surface the distinct values currently in the table so filter dropdowns are bounded.
  const [actions, resourceTypes, users] = await Promise.all([
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({
      distinct: ["resourceType"],
      select: { resourceType: true },
      orderBy: { resourceType: "asc" },
    }),
    prisma.user.findMany({
      where: { auditLogs: { some: {} } },
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("recent-card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditAdminClient
            actions={actions.map((a) => a.action)}
            resourceTypes={resourceTypes.map((r) => r.resourceType)}
            performers={users}
          />
        </CardContent>
      </Card>
    </div>
  );
}
