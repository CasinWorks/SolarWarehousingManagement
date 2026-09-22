import { prisma } from "@/lib/prisma";

/** Case-insensitive SKU lookup without loading the whole catalog. */
export async function findComponentBySku(sku: string) {
  const trimmed = sku.trim();
  if (!trimmed) return null;
  return prisma.component.findFirst({
    where: { sku: { equals: trimmed, mode: "insensitive" } },
  });
}
