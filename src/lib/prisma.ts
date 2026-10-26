import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  databaseUrl?: string;
};
const databaseUrl = process.env.DATABASE_URL;
const canReuse = globalForPrisma.prisma && globalForPrisma.databaseUrl === databaseUrl;
if (!canReuse && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect();
}
// Construction is lazy with respect to connections, so builds do not query the database.
export const prisma = canReuse ? globalForPrisma.prisma! : new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8000,
    max: 4,
  }),
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.databaseUrl = databaseUrl;
}
