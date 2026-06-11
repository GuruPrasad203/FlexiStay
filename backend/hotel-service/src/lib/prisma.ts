/**
 * Shared PrismaClient instance for the hotel service.
 *
 * Prisma 7 requires passing an adapter to PrismaClient.
 * This file creates one pool + one adapter + one client for the whole process.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
