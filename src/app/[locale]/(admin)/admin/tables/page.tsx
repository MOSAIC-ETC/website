import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { TablesAdminClient } from "./client";

export default async function TablesAdminPage() {
  const t = await getTranslations("admin.tables");
  const rows = await prisma.file.findMany({
    where: { category: "TABLE" },
    include: { currentVersion: true },
    orderBy: { slug: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("seeded-card")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TablesAdminClient
            initial={rows.map((r) => ({
              slug: r.slug,
              name: r.name,
              isActive: r.isActive,
              currentVersion: r.currentVersion
                ? {
                    versionNum: r.currentVersion.versionNum,
                    fileSize: Number(r.currentVersion.fileSize),
                    filename: r.currentVersion.filename,
                  }
                : null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
