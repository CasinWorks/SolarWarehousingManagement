"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { destackOut, InsufficientStock, nextRef, stackIn } from "@/lib/stock";

export async function startScanIn(formData: FormData) {
  const user = await requireUser();
  const refNo = await nextRef("RCV");
  const rcv = await prisma.receiving.create({
    data: {
      refNo,
      supplierId: formData.get("supplierId") ? Number(formData.get("supplierId")) : null,
      poNumber: String(formData.get("poNumber") || "").trim() || null,
      note: String(formData.get("note") || "").trim() || "Scan In",
      status: "DRAFT",
      createdBy: Number(user.id),
    },
  });
  redirect(`/receiving/scan/${rcv.id}`);
}

export async function addScanInItem(rcvId: number, formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    sku: z.string().min(1),
    locationId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    condition: z.enum(["GOOD", "DAMAGED"]).default("GOOD"),
  });
  const parsed = schema.safeParse({
    sku: formData.get("sku"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity") || 1,
    condition: formData.get("condition") || "GOOD",
  });
  if (!parsed.success) {
    redirect(`/receiving/scan/${rcvId}?error=Invalid+input`);
  }

  const rcv = await prisma.receiving.findUniqueOrThrow({ where: { id: rcvId } });
  const component = await prisma.component.findFirst({
    where: { sku: { equals: parsed.data.sku } },
  });
  // SQLite case-insensitive fallback
  const comp =
    component ||
    (await prisma.component.findMany()).find(
      (c) => c.sku.toLowerCase() === parsed.data.sku.toLowerCase(),
    );
  if (!comp) redirect(`/receiving/scan/${rcvId}?error=SKU+not+found`);

  await prisma.receivingItem.create({
    data: {
      receivingId: rcv.id,
      componentId: comp.id,
      locationId: parsed.data.locationId,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
    },
  });

  if (parsed.data.condition === "GOOD") {
    await stackIn({
      componentId: comp.id,
      locationId: parsed.data.locationId,
      quantity: parsed.data.quantity,
      reference: rcv.refNo,
      userId: Number(user.id),
      note: "Scan In",
    });
  }

  await prisma.receiving.update({
    where: { id: rcv.id },
    data: { status: "POSTED" },
  });

  revalidatePath(`/receiving/scan/${rcvId}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  redirect(`/receiving/scan/${rcvId}?ok=1`);
}

export async function startScanOut(formData: FormData) {
  const user = await requireUser();
  const customerName = String(formData.get("customerName") || "").trim();
  if (!customerName) redirect("/delivery/scan?error=Customer+required");
  const drNo = await nextRef("DR");
  const dr = await prisma.deliveryReceipt.create({
    data: {
      drNo,
      customerName,
      customerAddress: String(formData.get("customerAddress") || "").trim() || null,
      projectSite: String(formData.get("projectSite") || "").trim() || null,
      note: String(formData.get("note") || "").trim() || "Scan Out",
      status: "DRAFT",
      preparedBy: Number(user.id),
    },
  });
  redirect(`/delivery/scan/${dr.id}`);
}

export async function addScanOutItem(drId: number, formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    sku: z.string().min(1),
    locationId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
  });
  const parsed = schema.safeParse({
    sku: formData.get("sku"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity") || 1,
  });
  if (!parsed.success) redirect(`/delivery/scan/${drId}?error=Invalid+input`);

  const dr = await prisma.deliveryReceipt.findUniqueOrThrow({ where: { id: drId } });
  const all = await prisma.component.findMany();
  const comp = all.find((c) => c.sku.toLowerCase() === parsed.data.sku.toLowerCase());
  if (!comp) redirect(`/delivery/scan/${drId}?error=SKU+not+found`);

  try {
    await destackOut({
      componentId: comp.id,
      locationId: parsed.data.locationId,
      quantity: parsed.data.quantity,
      reference: dr.drNo,
      userId: Number(user.id),
      note: `Scan Out to ${dr.customerName}`,
    });
  } catch (e) {
    if (e instanceof InsufficientStock) {
      redirect(`/delivery/scan/${drId}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  await prisma.deliveryItem.create({
    data: {
      deliveryId: dr.id,
      componentId: comp.id,
      locationId: parsed.data.locationId,
      quantity: parsed.data.quantity,
    },
  });
  await prisma.deliveryReceipt.update({
    where: { id: dr.id },
    data: { status: "ISSUED" },
  });

  revalidatePath(`/delivery/scan/${drId}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  redirect(`/delivery/scan/${drId}?ok=1`);
}
