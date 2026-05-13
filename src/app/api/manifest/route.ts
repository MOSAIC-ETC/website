// Manifest endpoint — clients fetch this to decide whether their IndexedDB
// cache entries are still valid. See TCC.md §3.7.

import { prisma } from "@/lib/prisma";

type FilterEntry = { slug: string; name: string; hash: string; version: number; effWavelengthNm: number; effWavelengthUnit: string; zeroPoint: number };
type TableEntry = { slug: string; name: string; hash: string; version: number };
type ObjectEntry = { slug: string; name: string; version: number; previewHash: string; cubeHash: string };

export async function GET() {
  const [filters, tables, objects] = await Promise.all([loadFilters(), loadTables(), loadObjects()]);

  return Response.json(
    { filters, tables, objects },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

async function loadFilters(): Promise<FilterEntry[]> {
  const rows = await prisma.file.findMany({
    where: { category: "FILTER", isActive: true },
    include: { currentVersion: { include: { filterMetadata: true } } },
    orderBy: { slug: "asc" },
  });
  return rows.flatMap((file) => {
    const v = file.currentVersion;
    const meta = v?.filterMetadata;
    if (!v || !meta) return [];
    return [{
      slug: file.slug,
      name: file.name,
      hash: v.fileHash,
      version: v.versionNum,
      effWavelengthNm: meta.effWavelengthNm,
      effWavelengthUnit: meta.effWavelengthUnit,
      zeroPoint: meta.zeroPoint,
    }];
  });
}

async function loadTables(): Promise<TableEntry[]> {
  const rows = await prisma.file.findMany({
    where: { category: "TABLE", isActive: true },
    include: { currentVersion: true },
    orderBy: { slug: "asc" },
  });
  return rows.flatMap((file) => {
    const v = file.currentVersion;
    if (!v) return [];
    return [{ slug: file.slug, name: file.name, hash: v.fileHash, version: v.versionNum }];
  });
}

async function loadObjects(): Promise<ObjectEntry[]> {
  // Objects are stored as two File rows (PREVIEW + CUBE) sharing a slug.
  // Pair them up; only return objects that have both assets present.
  const rows = await prisma.file.findMany({
    where: { category: "OBJECT", isActive: true },
    include: { currentVersion: true },
    orderBy: { slug: "asc" },
  });

  const bySlug = new Map<string, { name: string; preview?: typeof rows[0]; cube?: typeof rows[0] }>();
  for (const file of rows) {
    const entry = bySlug.get(file.slug) ?? { name: file.name.replace(/ \((preview|cube)\)$/, "") };
    if (file.assetRole === "PREVIEW") entry.preview = file;
    if (file.assetRole === "CUBE") entry.cube = file;
    bySlug.set(file.slug, entry);
  }

  const out: ObjectEntry[] = [];
  for (const [slug, { name, preview, cube }] of bySlug) {
    const previewVersion = preview?.currentVersion;
    const cubeVersion = cube?.currentVersion;
    if (!previewVersion || !cubeVersion) continue;
    out.push({
      slug,
      name,
      version: previewVersion.versionNum, // invariant: preview.versionNum === cube.versionNum (TCC §4.3)
      previewHash: previewVersion.fileHash,
      cubeHash: cubeVersion.fileHash,
    });
  }
  return out;
}
