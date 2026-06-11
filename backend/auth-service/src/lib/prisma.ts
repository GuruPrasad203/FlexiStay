/**
 * Shared PrismaClient instance for the auth service.
 *
 * Prisma 7 requires passing an adapter to PrismaClient instead of reading
 * the DATABASE_URL from the schema. This file creates the adapter once and
 * exports a single client — the same pattern as a "singleton".
 *
 * TypeScript note:
 *   We export `prisma` as a named export so every route file does:
 *     import { prisma } from "../lib/prisma"
 *   There's only one connection pool for the whole process.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// pg Pool manages a set of PostgreSQL connections.
// Reusing one pool across requests is much faster than opening
// a new connection for every query.
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
