import PDFDocument from "pdfkit";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const dr = await prisma.deliveryReceipt.findUnique({
    where: { id: Number(id) },
    include: {
      items: { include: { component: true, location: true } },
      preparer: true,
    },
  });
  if (!dr) return new NextResponse("Not found", { status: 404 });

  const company = process.env.COMPANY_NAME || "SolarStock Warehouse";
  const address = process.env.COMPANY_ADDRESS || "";

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.on("data", (c) => chunks.push(c as Buffer));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fillColor("#1B2A4A").fontSize(16).font("Helvetica-Bold").text(company, { continued: false });
  doc.fillColor("#555555").fontSize(9).font("Helvetica").text(address);
  doc.moveUp(2);
  doc.fillColor("#1B2A4A").fontSize(18).font("Helvetica-Bold").text("DELIVERY RECEIPT", { align: "right" });
  doc.fillColor("#000000").fontSize(10).font("Helvetica").text(`No. ${dr.drNo}`, { align: "right" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1B2A4A").stroke();
  doc.moveDown();

  doc.fillColor("#777777").fontSize(8).text("DELIVER TO");
  doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold").text(dr.customerName);
  doc.font("Helvetica").fontSize(10).text(dr.customerAddress || "-");
  doc.moveDown(0.5);
  doc.fillColor("#777777").fontSize(8).text("PROJECT SITE");
  doc.fillColor("#000000").fontSize(10).text(dr.projectSite || "-");
  doc.moveDown(0.5);
  doc.fillColor("#777777").fontSize(8).text("DATE");
  doc.fillColor("#000000").fontSize(10).text(format(dr.deliveryDate, "MMMM d, yyyy"));
  doc.moveDown();

  const startY = doc.y;
  doc.rect(50, startY, 495, 22).fill("#1B2A4A");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("#", 55, startY + 6, { width: 25 });
  doc.text("SKU", 80, startY + 6, { width: 70 });
  doc.text("Description", 155, startY + 6, { width: 220 });
  doc.text("Bay", 380, startY + 6, { width: 50 });
  doc.text("Qty", 440, startY + 6, { width: 40 });
  doc.text("Unit", 490, startY + 6, { width: 40 });

  let y = startY + 24;
  dr.items.forEach((it, idx) => {
    if (idx % 2 === 1) doc.rect(50, y - 2, 495, 20).fill("#EEF1F6");
    doc.fillColor("#000000").font("Helvetica").fontSize(9);
    doc.text(String(idx + 1), 55, y, { width: 25 });
    doc.text(it.component.sku, 80, y, { width: 70 });
    doc.text(it.component.name, 155, y, { width: 220 });
    doc.text(it.location.code, 380, y, { width: 50 });
    doc.text(String(it.quantity), 440, y, { width: 40 });
    doc.text(it.component.unit, 490, y, { width: 40 });
    y += 20;
  });

  doc.y = y + 10;
  const total = dr.items.reduce((s, i) => s + i.quantity, 0);
  doc.fillColor("#1B2A4A").font("Helvetica-Bold").fontSize(11).text(`TOTAL UNITS:  ${total}`, { align: "right" });

  if (dr.note) {
    doc.moveDown();
    doc.fillColor("#000000").font("Helvetica").fontSize(9).text(`Notes: ${dr.note}`);
  }

  doc.moveDown(3);
  const preparer = dr.preparer?.fullName || "";
  doc.fontSize(9).text("_______________________", 50, doc.y, { width: 200, align: "center" });
  doc.text("_______________________", 320, doc.y - 12, { width: 200, align: "center" });
  doc.moveDown(0.3);
  doc.text(`Prepared by\n${preparer}`, 50, doc.y, { width: 200, align: "center" });
  doc.text("Received in good condition by\n(Signature / Date)", 320, doc.y - 24, {
    width: 200,
    align: "center",
  });

  doc.end();
  const pdf = await done;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dr.drNo}.pdf"`,
    },
  });
}
