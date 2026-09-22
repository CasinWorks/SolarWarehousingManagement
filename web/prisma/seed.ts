import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { destackOut, nextRef, stackIn } from "../src/lib/stock";

const prisma = new PrismaClient();

async function main() {
  // Clear in dependency order
  await prisma.deliveryItem.deleteMany();
  await prisma.deliveryReceipt.deleteMany();
  await prisma.receivingItem.deleteMany();
  await prisma.receiving.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.component.deleteMany();
  await prisma.location.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  const hash = async (pw: string) => bcrypt.hash(pw, 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      fullName: "Danilo Montenejo",
      role: "admin",
      passwordHash: await hash("admin123"),
    },
  });
  await prisma.user.create({
    data: {
      username: "manager1",
      fullName: "Maria Santos",
      role: "manager",
      passwordHash: await hash("manager123"),
    },
  });
  const op = await prisma.user.create({
    data: {
      username: "operator1",
      fullName: "Jose Reyes",
      role: "operator",
      passwordHash: await hash("operator123"),
    },
  });

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Trina Solar PH",
        contactPerson: "A. Cruz",
        phone: "+63 917 111 2222",
        email: "sales@trina.ph",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Huawei FusionSolar",
        contactPerson: "L. Tan",
        phone: "+63 918 333 4444",
        email: "ph@huawei.com",
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Canadian Solar Distrib.",
        contactPerson: "R. Lim",
        phone: "+63 919 555 6666",
        email: "orders@csi.ph",
      },
    }),
  ]);

  const locs = await Promise.all(
    [
      { code: "A-01", name: "Panel Rack A1", zone: "Zone A", capacity: 500 },
      { code: "A-02", name: "Panel Rack A2", zone: "Zone A", capacity: 500 },
      { code: "B-01", name: "Inverter Shelf B1", zone: "Zone B", capacity: 120 },
      { code: "B-02", name: "Battery Bay B2", zone: "Zone B", capacity: 80 },
      { code: "C-01", name: "Mounting & BOS C1", zone: "Zone C", capacity: 1000 },
    ].map((l) => prisma.location.create({ data: l })),
  );

  const comps = await Promise.all(
    [
      { sku: "PNL-450M", name: "Mono PERC 450W Panel", category: "Panel", unit: "pc", reorderLevel: 60 },
      { sku: "PNL-550M", name: "Bifacial 550W Panel", category: "Panel", unit: "pc", reorderLevel: 40 },
      { sku: "INV-5K", name: "5kW Hybrid Inverter", category: "Inverter", unit: "pc", reorderLevel: 10 },
      { sku: "INV-10K", name: "10kW Three-Phase Inverter", category: "Inverter", unit: "pc", reorderLevel: 6 },
      { sku: "BAT-5KWH", name: "5kWh LiFePO4 Battery", category: "Battery", unit: "pc", reorderLevel: 8 },
      { sku: "MNT-RAIL", name: "Aluminum Mounting Rail 4.2m", category: "Mounting", unit: "pc", reorderLevel: 100 },
      { sku: "MNT-CLAMP", name: "Mid Clamp Set", category: "Mounting", unit: "set", reorderLevel: 200 },
      { sku: "CBL-6MM", name: "Solar DC Cable 6mm² (100m)", category: "Cable", unit: "roll", reorderLevel: 15 },
    ].map((c) => prisma.component.create({ data: c })),
  );

  const bySku = Object.fromEntries(comps.map((c) => [c.sku, c]));
  const byCode = Object.fromEntries(locs.map((l) => [l.code, l]));

  const rcv1Ref = await nextRef("RCV");
  const rcv1 = await prisma.receiving.create({
    data: {
      refNo: rcv1Ref,
      supplierId: suppliers[0].id,
      poNumber: "PO-2026-001",
      status: "POSTED",
      note: "Initial stock load",
      createdBy: admin.id,
    },
  });
  const r1 = [
    ["PNL-450M", "A-01", 300, "GOOD"],
    ["PNL-550M", "A-02", 180, "GOOD"],
    ["MNT-RAIL", "C-01", 400, "GOOD"],
    ["MNT-CLAMP", "C-01", 600, "GOOD"],
    ["PNL-450M", "A-01", 5, "DAMAGED"],
  ] as const;
  for (const [sku, code, qty, cond] of r1) {
    await prisma.receivingItem.create({
      data: {
        receivingId: rcv1.id,
        componentId: bySku[sku].id,
        locationId: byCode[code].id,
        quantity: qty,
        condition: cond,
      },
    });
    if (cond === "GOOD") {
      await stackIn({
        componentId: bySku[sku].id,
        locationId: byCode[code].id,
        quantity: qty,
        reference: rcv1.refNo,
        userId: admin.id,
        note: "Receiving intake",
      });
    }
  }

  const rcv2Ref = await nextRef("RCV");
  const rcv2 = await prisma.receiving.create({
    data: {
      refNo: rcv2Ref,
      supplierId: suppliers[1].id,
      poNumber: "PO-2026-014",
      status: "POSTED",
      note: "Inverters & batteries",
      createdBy: op.id,
    },
  });
  for (const [sku, code, qty] of [
    ["INV-5K", "B-01", 24],
    ["INV-10K", "B-01", 12],
    ["BAT-5KWH", "B-02", 20],
    ["CBL-6MM", "C-01", 30],
  ] as const) {
    await prisma.receivingItem.create({
      data: {
        receivingId: rcv2.id,
        componentId: bySku[sku].id,
        locationId: byCode[code].id,
        quantity: qty,
        condition: "GOOD",
      },
    });
    await stackIn({
      componentId: bySku[sku].id,
      locationId: byCode[code].id,
      quantity: qty,
      reference: rcv2.refNo,
      userId: op.id,
      note: "Receiving intake",
    });
  }

  const drRef = await nextRef("DR");
  const dr = await prisma.deliveryReceipt.create({
    data: {
      drNo: drRef,
      customerName: "Green Roof Homes",
      customerAddress: "88 Mabini St., Makati",
      projectSite: "Makati Rooftop",
      status: "ISSUED",
      note: "Demo delivery",
      preparedBy: op.id,
    },
  });
  await prisma.deliveryItem.create({
    data: {
      deliveryId: dr.id,
      componentId: bySku["PNL-450M"].id,
      locationId: byCode["A-01"].id,
      quantity: 20,
    },
  });
  await destackOut({
    componentId: bySku["PNL-450M"].id,
    locationId: byCode["A-01"].id,
    quantity: 20,
    reference: dr.drNo,
    userId: op.id,
    note: "Delivery to Green Roof Homes",
  });

  console.log("Seed complete.");
  console.log("  admin / admin123");
  console.log("  manager1 / manager123");
  console.log("  operator1 / operator123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
