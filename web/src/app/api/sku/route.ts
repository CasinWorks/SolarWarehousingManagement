import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findComponentBySku } from "@/lib/components";
import { availableQty, componentTotalStock } from "@/lib/stock";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const sku = (req.nextUrl.searchParams.get("sku") || "").trim();
  const locationId = req.nextUrl.searchParams.get("location_id");
  if (!sku) return NextResponse.json({ ok: false, error: "Scan a SKU." }, { status: 400 });

  const component = await findComponentBySku(sku);
  if (!component) {
    return NextResponse.json({ ok: false, error: `No component for SKU “${sku}”.` }, { status: 404 });
  }

  const [stock, available] = await Promise.all([
    componentTotalStock(component.id),
    locationId ? availableQty(component.id, Number(locationId)) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    ok: true,
    id: component.id,
    sku: component.sku,
    name: component.name,
    category: component.category || "",
    unit: component.unit,
    stock,
    available,
  });
}
