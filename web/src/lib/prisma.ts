import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * On Vercel, the bundled SQLite file is read-only — copy to /tmp once per instance.
 * Locally we use DATABASE_URL (file:./dev.db) for fast access.
 */
function resolveDatabaseUrl() {
  if (process.env.VERCEL) {
    const dest = "/tmp/solarstock.db";
    const candidates = [
      path.join(process.cwd(), "prisma", "deploy.db"),
      path.join(process.cwd(), "prisma", "dev.db"),
    ];
    const src = candidates.find((p) => fs.existsSync(p));
    if (src && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
    return `file:${dest}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
