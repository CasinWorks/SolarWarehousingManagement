import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { format } from "date-fns";

export default async function DashboardPage() {
  await requireUser();

  const [components, stockSum, receivingCount, drCount, movements, locations] =
    await Promise.all([
      prisma.component.findMany({ include: { stockItems: true } }),
      prisma.stockItem.aggregate({ _sum: { quantity: true } }),
      prisma.receiving.count(),
      prisma.deliveryReceipt.count(),
      prisma.stockMovement.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { component: true, location: true },
      }),
      prisma.location.findMany({
        orderBy: { code: "asc" },
        include: { stockItems: true },
      }),
    ]);

  const lowStock = components.filter((c) => {
    const total = c.stockItems.reduce((s, i) => s + i.quantity, 0);
    return total <= c.reorderLevel;
  });

  const locUsage = locations.map((loc) => {
    const used = loc.stockItems.reduce((s, i) => s + i.quantity, 0);
    const pct = loc.capacity ? Math.min(100, Math.round((used / loc.capacity) * 100)) : 0;
    return { loc, used, pct };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Warehouse Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/receiving/scan" className="btn-ok">
            Scan In
          </Link>
          <Link href="/delivery/scan" className="btn-amber">
            Scan Out
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Units in stock", value: stockSum._sum.quantity ?? 0 },
          { label: "Component SKUs", value: components.length },
          { label: "Receivings", value: receivingCount },
          { label: "Delivery Receipts", value: drCount },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-[color:var(--muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 font-bold">
            <span>Recent stacking / de-stacking</span>
            <Link href="/inventory/movements" className="text-sm font-normal text-[color:var(--muted)]">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#eef1f6] text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Component</th>
                  <th className="px-3 py-2">Bay</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-[color:var(--border)]">
                    <td className="px-3 py-2 text-[color:var(--muted)]">
                      {format(m.createdAt, "MMM d HH:mm")}
                    </td>
                    <td className="px-3 py-2">
                      <span className={m.movementType === "IN" ? "pill-ok" : "pill-low"}>
                        {m.movementType}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {m.component.sku} · {m.component.name}
                    </td>
                    <td className="px-3 py-2 font-mono">{m.location.code}</td>
                    <td className="px-3 py-2 text-right font-bold">{m.quantity}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[color:var(--muted)]">
                      No movements yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <div className="border-b border-[color:var(--border)] px-4 py-3 font-bold">Low stock alerts</div>
            <ul className="divide-y divide-[color:var(--border)]">
              {lowStock.map((c) => {
                const total = c.stockItems.reduce((s, i) => s + i.quantity, 0);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      {c.sku} · {c.name}
                    </span>
                    <span className="pill-low">
                      {total} / reorder {c.reorderLevel}
                    </span>
                  </li>
                );
              })}
              {lowStock.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">
                  All components above reorder level.
                </li>
              )}
            </ul>
          </div>

          <div className="card p-4">
            <div className="mb-3 font-bold">Bay utilisation</div>
            <div className="space-y-3">
              {locUsage.map(({ loc, used, pct }) => (
                <div key={loc.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-mono font-semibold">
                      {loc.code} <span className="font-normal text-[color:var(--muted)]">{loc.name}</span>
                    </span>
                    <span className="text-[color:var(--muted)]">
                      {used}
                      {loc.capacity ? ` / ${loc.capacity}` : ""}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#e8e4dc]">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? "bg-[color:var(--low)]" : "bg-[color:var(--amber)]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
