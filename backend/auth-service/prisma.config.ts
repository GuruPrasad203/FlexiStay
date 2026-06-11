/**
 * Prisma 7 configuration file.
 *
 * Why this file exists:
 *   In Prisma 7, the database URL was removed from schema.prisma.
 *   This file configures the connection for "prisma migrate" CLI commands.
 *   The runtime PrismaClient gets the connection via the adapter in src/lib/prisma.ts.
 */
import { defineConfig } from "prisma/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "./prisma/schema.prisma",

  migrate: {
    // This adapter is used by "npx prisma migrate dev" and "npx prisma db push"
    async adapter() {
      const connectionString = process.env["DATABASE_URL"];
      if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
      }
      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
});
