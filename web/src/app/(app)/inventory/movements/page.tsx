import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "IN" || sp.type === "OUT" ? sp.type : undefined;
  const moves = await prisma.stockMovement.findMany({
    where: type ? { movementType: type } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      movementType: true,
      quantity: true,
      reference: true,
      createdAt: true,
      component: { select: { sku: true, name: true } },
      location: { select: { code: true } },
      user: { select: { fullName: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Movement Log</h1>
        <Link href="/inventory" className="btn-outline">
          Back
        </Link>
      </div>
      <div className="flex gap-2">
        <Link href="/inventory/movements" className="btn-outline !min-h-10">
          All
        </Link>
        <Link href="/inventory/movements?type=IN" className="btn-outline !min-h-10">
          IN
        </Link>
        <Link href="/inventory/movements?type=OUT" className="btn-outline !min-h-10">
          OUT
        </Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2">Bay</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">User</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 text-[color:var(--muted)]">{format(m.createdAt, "MMM d HH:mm")}</td>
                <td className="px-3 py-2">
                  <span className={m.movementType === "IN" ? "pill-ok" : "pill-low"}>{m.movementType}</span>
                </td>
                <td className="px-3 py-2">
                  {m.component.sku} · {m.component.name}
                </td>
                <td className="px-3 py-2 font-mono">{m.location.code}</td>
                <td className="px-3 py-2 text-right font-bold">{m.quantity}</td>
                <td className="px-3 py-2 text-[color:var(--muted)]">{m.reference}</td>
                <td className="px-3 py-2">{m.user?.fullName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
