import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Single Prisma client for both:
 * - Hosted: Supabase Postgres (DATABASE_URL on Vercel)
 * - Offline buyoff: local Postgres via docker-compose (same DATABASE_URL shape)
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
