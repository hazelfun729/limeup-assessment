/**
 * Shared Prisma client factory for seed scripts.
 * Supports both SQLite (local dev) and PostgreSQL (Vercel/production).
 */
import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";

export async function createPrismaClient(): Promise<PrismaClient> {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (databaseUrl.startsWith("postgres") || databaseUrl.startsWith("postgresql")) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter });
  } else {
    const path = await import("path");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  }
}
