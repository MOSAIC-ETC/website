import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { ObjectsAdminClient } from "./client";

export default async function ObjectsAdminPage() {
  const t = await getTranslations("admin.objects");

  const rows = await prisma.file.findMany({
    where: { category: "OBJECT" },
    include: { currentVersion: true },
    orderBy: [{ slug: "asc" }, { assetRole: "asc" }],
  });

  // Pair preview + cube rows by slug
  const bySlug = new Map<
    string,
    {
      slug: string;
      name: string;
      isActive: boolean;
      versionNum: number | null;
      previewSize: number | null;
      cubeSize: number | null;
    }
  >();
  for (const r of rows) {
    const baseName = r.name.replace(/ \((preview|cube)\)$/, "");
    const entry = bySlug.get(r.slug) ?? {
      slug: r.slug,
      name: baseName,
      isActive: true,
      versionNum: null,
      previewSize: null,
      cubeSize: null,
    };
    entry.isActive = entry.isActive && r.isActive;
    if (r.currentVersion) {
      entry.versionNum = r.currentVersion.versionNum;
      if (r.assetRole === "PREVIEW") entry.previewSize = Number(r.currentVersion.fileSize);
      if (r.assetRole === "CUBE") entry.cubeSize = Number(r.currentVersion.fileSize);
    }
    bySlug.set(r.slug, entry);
  }

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
          <ObjectsAdminClient initial={Array.from(bySlug.values())} />
        </CardContent>
      </Card>
    </div>
  );
}
