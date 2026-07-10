/**
 * Admin seed script — creates the default admin account.
 * Usage: npx tsx prisma/seed/seed-admin.ts
 *
 * Default credentials:
 *   Username: admin
 *   Password: admin123
 */

import { createPrismaClient } from "./prisma-helper";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = await createPrismaClient();

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const email = process.env.ADMIN_EMAIL || "admin@limeup.com";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { username },
    update: {
      passwordHash,
      email,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      username,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin account ready: ${admin.username} (${admin.email}), role=${admin.role}`);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
