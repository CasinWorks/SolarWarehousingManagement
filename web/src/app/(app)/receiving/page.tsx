import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { format } from "date-fns";

export default async function ReceivingListPage() {
  await requireUser();
  const rows = await prisma.receiving.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Receiving</h1>
        <div className="flex gap-2">
          <Link href="/receiving/scan" className="btn-ok">
            Scan In
          </Link>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">PO</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Units</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-mono font-bold">
                  <Link href={`/receiving/scan/${r.id}`} className="underline-offset-2 hover:underline">
                    {r.refNo}
                  </Link>
                </td>
                <td className="px-3 py-2">{r.supplier?.name ?? "—"}</td>
                <td className="px-3 py-2">{r.poNumber ?? "—"}</td>
                <td className="px-3 py-2 text-[color:var(--muted)]">{format(r.receivedAt, "MMM d, yyyy")}</td>
                <td className="px-3 py-2 text-right font-bold">
                  {r.items.reduce((s, i) => s + i.quantity, 0)}
                </td>
                <td className="px-3 py-2">
                  <span className={r.status === "POSTED" ? "pill-ok" : "pill-draft"}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
