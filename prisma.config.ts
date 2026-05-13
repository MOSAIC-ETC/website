import path from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Mirror Next.js precedence: .env.local overrides .env
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
