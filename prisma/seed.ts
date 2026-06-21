// Bootstrap script: seeds roles, the first admin user, all files in prisma/seed-data/,
// and an initial InstrumentParameter snapshot. Idempotent — safe to re-run.
//
// Run via `prisma db seed` (configured in prisma.config.ts).

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { AssetRole, FileCategory, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { ALL_PERMISSIONS } from "../src/lib/permissions";
import { DEFAULT_INSTRUMENT_PARAMS } from "../src/lib/schemas/instrument-params";
import { importLocalFile } from "../src/lib/storage";

const SEED_DATA_DIR = path.resolve("prisma", "seed-data");

type FilterSeed = {
  slug: string;
  name: string;
  filename: string;
  effWavelengthNm: number;
  effWavelengthUnit: "NM" | "UM";
  zeroPoint: number;
};

const FILTERS: FilterSeed[] = [
  { slug: "u", name: "U (0.36 μm)", filename: "BessFilter_U.txt", effWavelengthNm: 360, effWavelengthUnit: "NM", zeroPoint: 1.79e7 },
  { slug: "b", name: "B (0.44 μm)", filename: "BessFilter_B.txt", effWavelengthNm: 440, effWavelengthUnit: "NM", zeroPoint: 5.5e7 },
  { slug: "v", name: "V (0.55 μm)", filename: "BessFilter_V.txt", effWavelengthNm: 550, effWavelengthUnit: "NM", zeroPoint: 9.71e7 },
  { slug: "r", name: "R (0.67 μm)", filename: "BessFilter_R.txt", effWavelengthNm: 670, effWavelengthUnit: "NM", zeroPoint: 1.14e8 },
  { slug: "i", name: "I (0.87 μm)", filename: "BessFilter_I.txt", effWavelengthNm: 870, effWavelengthUnit: "NM", zeroPoint: 1.06e8 },
  { slug: "z", name: "Z (0.876 μm)", filename: "GMOSNFilter_Z.txt", effWavelengthNm: 876, effWavelengthUnit: "NM", zeroPoint: 3.9e9 },
  { slug: "j", name: "J (1.25 μm)", filename: "2massFilter_J.txt", effWavelengthNm: 1250, effWavelengthUnit: "UM", zeroPoint: 1.06e8 },
  { slug: "h", name: "H (1.65 μm)", filename: "2massFilter_H.txt", effWavelengthNm: 1650, effWavelengthUnit: "UM", zeroPoint: 1.06e8 },
  { slug: "k", name: "K (2.2 μm)", filename: "2massFilter_Ks.txt", effWavelengthNm: 2200, effWavelengthUnit: "UM", zeroPoint: 9.36e7 },
  { slug: "n", name: "N (10.5 μm)", filename: "Filter_N.txt", effWavelengthNm: 10500, effWavelengthUnit: "UM", zeroPoint: 3.02e6 },
  { slug: "q", name: "Q (20.9 μm)", filename: "Filter_Q.txt", effWavelengthNm: 20900, effWavelengthUnit: "UM", zeroPoint: 3.27e5 },
  { slug: "u_prime", name: "u' (0.35 μm)", filename: "GMOSNFilter_u.txt", effWavelengthNm: 350, effWavelengthUnit: "NM", zeroPoint: 1.6e7 },
  { slug: "g_prime", name: "g' (0.48 μm)", filename: "GMOSFilter_g.txt", effWavelengthNm: 480, effWavelengthUnit: "NM", zeroPoint: 6.31e7 },
  { slug: "r_prime", name: "r' (0.62 μm)", filename: "GMOSNFilter_r.txt", effWavelengthNm: 620, effWavelengthUnit: "NM", zeroPoint: 8.67e7 },
  { slug: "i_prime", name: "i' (0.77 μm)", filename: "GMOSNFilter_i.txt", effWavelengthNm: 770, effWavelengthUnit: "NM", zeroPoint: 8.08e7 },
  { slug: "z_prime", name: "z' (0.925 μm)", filename: "GMOSN_z.txt", effWavelengthNm: 925, effWavelengthUnit: "NM", zeroPoint: 5.21e7 },
];

const TABLES = [
  { slug: "background", name: "Background", filename: "Background.csv" },
  { slug: "enclosedEnergy", name: "Enclosed Energy", filename: "EnclosedEnergy.csv" },
  { slug: "hrThroughput", name: "HR Throughput", filename: "HR-Throughput.csv" },
  { slug: "lrThroughput", name: "LR Throughput", filename: "LR-Throughput.csv" },
];

const OBJECTS = [
  {
    slug: "manga-9041-6101",
    name: "MaNGA 9041-6101",
    dirname: "MaNGA-9041-6101",
    preview: "preview.fits",
    cube: "cube.fits",
  },
  {
    slug: "manga-8485-1901",
    name: "MaNGA 8485-1901",
    dirname: "MaNGA-8485-1901",
    preview: "preview.fits",
    cube: "cube.fits",
  },
  {
    slug: "manga-7443-12701",
    name: "MaNGA 7443-12701",
    dirname: "MaNGA-7443-12701",
    preview: "preview.fits",
    cube: "cube.fits",
  },
];

function makePrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function seedRoles(prisma: PrismaClient) {
  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    create: {
      name: "admin",
      description: "Full access — all permissions",
      permissions: ALL_PERMISSIONS,
    },
    update: {
      permissions: ALL_PERMISSIONS, // keep in sync as we add permission keys
    },
  });

  const viewer = await prisma.role.upsert({
    where: { name: "viewer" },
    create: {
      name: "viewer",
      description: "Read-only — can sign in but cannot modify anything",
      permissions: [],
    },
    update: {},
  });

  return { admin, viewer };
}

async function seedAdminUser(prisma: PrismaClient, adminRoleId: string) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("⚠ ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin user creation");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ admin user ${email} already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name: "Admin", passwordHash, roleId: adminRoleId },
  });
  console.log(`✓ created admin user ${email}`);
}

async function seedFile(
  prisma: PrismaClient,
  args: {
    category: FileCategory;
    slug: string;
    assetRole: AssetRole;
    name: string;
    sourcePath: string;
    filterMetadata?: {
      effWavelengthNm: number;
      effWavelengthUnit: "NM" | "UM";
      zeroPoint: number;
    };
  },
): Promise<void> {
  const { category, slug, assetRole, name, sourcePath, filterMetadata } = args;

  const existing = await prisma.file.findUnique({
    where: { category_slug_assetRole: { category, slug, assetRole } },
  });
  if (existing) {
    console.log(`  · ${category}/${slug}/${assetRole} already seeded`);
    return;
  }

  const stored = await importLocalFile({ sourcePath, category, slug, assetRole, versionNum: 1 });

  await prisma.$transaction(async (tx) => {
    const file = await tx.file.create({
      data: { category, slug, assetRole, name },
    });
    const version = await tx.fileVersion.create({
      data: {
        fileId: file.id,
        versionNum: 1,
        filename: path.basename(sourcePath),
        storagePath: stored.storagePath,
        fileHash: stored.fileHash,
        fileSize: BigInt(stored.fileSize),
        mimeType: stored.mimeType,
        notes: "Seeded from prisma/seed-data/",
      },
    });
    await tx.file.update({
      where: { id: file.id },
      data: { currentVersionId: version.id },
    });
    if (filterMetadata) {
      await tx.filterMetadata.create({
        data: {
          fileVersionId: version.id,
          effWavelengthNm: filterMetadata.effWavelengthNm,
          effWavelengthUnit: filterMetadata.effWavelengthUnit,
          zeroPoint: filterMetadata.zeroPoint,
        },
      });
    }
  });

  console.log(`  ✓ ${category}/${slug}/${assetRole} ← ${path.basename(sourcePath)}`);
}

async function seedFilters(prisma: PrismaClient) {
  console.log("→ filters");
  for (const f of FILTERS) {
    await seedFile(prisma, {
      category: "FILTER",
      slug: f.slug,
      assetRole: "DATA",
      name: f.name,
      sourcePath: path.join(SEED_DATA_DIR, "filters", f.filename),
      filterMetadata: {
        effWavelengthNm: f.effWavelengthNm,
        effWavelengthUnit: f.effWavelengthUnit,
        zeroPoint: f.zeroPoint,
      },
    });
  }
}

async function seedTables(prisma: PrismaClient) {
  console.log("→ tables");
  for (const t of TABLES) {
    await seedFile(prisma, {
      category: "TABLE",
      slug: t.slug,
      assetRole: "DATA",
      name: t.name,
      sourcePath: path.join(SEED_DATA_DIR, "tables", t.filename),
    });
  }
}

async function seedObjects(prisma: PrismaClient) {
  console.log("→ objects");
  for (const o of OBJECTS) {
    await seedFile(prisma, {
      category: "OBJECT",
      slug: o.slug,
      assetRole: "PREVIEW",
      name: `${o.name} (preview)`,
      sourcePath: path.join(SEED_DATA_DIR, "objects", o.dirname, o.preview),
    });
    await seedFile(prisma, {
      category: "OBJECT",
      slug: o.slug,
      assetRole: "CUBE",
      name: `${o.name} (cube)`,
      sourcePath: path.join(SEED_DATA_DIR, "objects", o.dirname, o.cube),
    });
  }
}

async function seedInstrumentParameters(prisma: PrismaClient) {
  const existing = await prisma.instrumentParameter.findFirst({ where: { isCurrent: true } });
  if (existing) {
    console.log("✓ instrument parameters already seeded");
    return;
  }
  await prisma.instrumentParameter.create({
    data: {
      version: 1,
      isCurrent: true,
      params: DEFAULT_INSTRUMENT_PARAMS,
      notes: "Initial snapshot from constants.ts",
    },
  });
  console.log("✓ created instrument parameters v1");
}

async function main() {
  const prisma = makePrisma();
  try {
    console.log("Seeding…");
    const { admin } = await seedRoles(prisma);
    await seedAdminUser(prisma, admin.id);
    await seedFilters(prisma);
    await seedTables(prisma);
    await seedObjects(prisma);
    await seedInstrumentParameters(prisma);
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
