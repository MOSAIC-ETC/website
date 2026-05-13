// Prisma 7 requires a driver adapter — the connection string is no longer read
// from the schema. Keep one PrismaClient + one pg pool per Node process to avoid
// connection storms in Next.js dev mode (which reloads modules on file change).
// See TCC.md §2.1 for the rationale on Prisma; §6.1 will document the singleton.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Make BigInt values JSON-serializable. fileSize columns are BigInt (Postgres
// int8) but never exceed Number.MAX_SAFE_INTEGER in practice, so it's safe to
// emit them as numbers. Without this, Response.json() throws on any payload
// that includes a FileVersion.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this as unknown as bigint);
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
