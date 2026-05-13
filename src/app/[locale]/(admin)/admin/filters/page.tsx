import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { FilterAdminClient } from "./client";

export default async function FiltersAdminPage() {
  const filters = await prisma.file.findMany({
    where: { category: "FILTER" },
    include: { currentVersion: { include: { filterMetadata: true } } },
    orderBy: { slug: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Filters</h1>
        <p className="text-muted-foreground">Manage filter transmission curves. New versions are added without losing history.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Active filters</CardTitle></CardHeader>
        <CardContent>
          <FilterAdminClient
            initial={filters.map((f) => ({
              id: f.id,
              slug: f.slug,
              name: f.name,
              isActive: f.isActive,
              currentVersion: f.currentVersion
                ? {
                    versionNum: f.currentVersion.versionNum,
                    fileHash: f.currentVersion.fileHash,
                    fileSize: Number(f.currentVersion.fileSize),
                    filename: f.currentVersion.filename,
                    metadata: f.currentVersion.filterMetadata
                      ? {
                          effWavelengthNm: f.currentVersion.filterMetadata.effWavelengthNm,
                          effWavelengthUnit: f.currentVersion.filterMetadata.effWavelengthUnit as "NM" | "UM",
                          zeroPoint: f.currentVersion.filterMetadata.zeroPoint,
                        }
                      : null,
                  }
                : null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
