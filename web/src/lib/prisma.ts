import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Serverless-friendly URL: reuse one connection per warm instance via the pooler. */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", "10");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

/**
 * Single Prisma client for:
 * - Hosted: Supabase Postgres (DATABASE_URL on Vercel)
 * - Offline buyoff: local Postgres via docker-compose
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Reuse across warm serverless invocations
globalForPrisma.prisma = prisma;
