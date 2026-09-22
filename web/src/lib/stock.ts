import { prisma } from "@/lib/prisma";

export class InsufficientStock extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStock";
  }
}

export async function availableQty(componentId: number, locationId: number) {
  const si = await prisma.stockItem.findUnique({
    where: { componentId_locationId: { componentId, locationId } },
  });
  return si?.quantity ?? 0;
}

export async function stackIn(opts: {
  componentId: number;
  locationId: number;
  quantity: number;
  reference: string;
  userId: number;
  note?: string;
}) {
  const { componentId, locationId, quantity, reference, userId, note } = opts;
  await prisma.$transaction(async (tx) => {
    await tx.stockItem.upsert({
      where: { componentId_locationId: { componentId, locationId } },
      create: { componentId, locationId, quantity },
      update: { quantity: { increment: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        componentId,
        locationId,
        movementType: "IN",
        quantity,
        reference,
        note,
        userId,
      },
    });
  });
}

export async function destackOut(opts: {
  componentId: number;
  locationId: number;
  quantity: number;
  reference: string;
  userId: number;
  note?: string;
}) {
  const { componentId, locationId, quantity, reference, userId, note } = opts;
  await prisma.$transaction(async (tx) => {
    const si = await tx.stockItem.findUnique({
      where: { componentId_locationId: { componentId, locationId } },
    });
    const have = si?.quantity ?? 0;
    if (have < quantity) {
      throw new InsufficientStock(
        `Only ${have} unit(s) available at this location, need ${quantity}.`,
      );
    }
    await tx.stockItem.update({
      where: { componentId_locationId: { componentId, locationId } },
      data: { quantity: { decrement: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        componentId,
        locationId,
        movementType: "OUT",
        quantity,
        reference,
        note,
        userId,
      },
    });
  });
}

export async function nextRef(prefix: "RCV" | "DR") {
  if (prefix === "RCV") {
    const last = await prisma.receiving.findFirst({ orderBy: { id: "desc" } });
    const seq = (last?.id ?? 0) + 1;
    return `RCV-${String(seq).padStart(4, "0")}`;
  }
  const last = await prisma.deliveryReceipt.findFirst({ orderBy: { id: "desc" } });
  const seq = (last?.id ?? 0) + 1;
  return `DR-${String(seq).padStart(4, "0")}`;
}

export async function componentTotalStock(componentId: number) {
  const rows = await prisma.stockItem.findMany({
    where: { componentId },
    select: { quantity: true },
  });
  return rows.reduce((s, r) => s + r.quantity, 0);
}
