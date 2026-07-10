import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createPrismaClient(): Promise<PrismaClient> {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (databaseUrl.startsWith("postgres") || databaseUrl.startsWith("postgresql")) {
    // ── Production: PostgreSQL (Neon / Vercel) ──
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter });
  } else {
    // ── Development: SQLite (local) ──
    const path = await import("path");
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  }
}

let _clientPromise: Promise<PrismaClient> | null = null;

function getClientPromise(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return Promise.resolve(globalForPrisma.prisma);
  if (!_clientPromise) {
    _clientPromise = createPrismaClient().then((c) => {
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = c;
      return c;
    });
  }
  return _clientPromise;
}

// Lazy proxy: prisma.user.findUnique(...) works transparently
// prisma.user → inner Proxy → method call resolves client first
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (typeof prop === "symbol") return undefined;
    return new Proxy({} as Record<string, unknown>, {
      get(_innerTarget, method) {
        if (typeof method === "symbol") return undefined;
        return (...args: unknown[]) =>
          getClientPromise().then(
            (client) =>
              (
                (client as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[
                  prop as string
                ][method as string]
              )(...args)
          );
      },
    });
  },
});
