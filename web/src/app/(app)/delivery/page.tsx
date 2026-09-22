import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { format } from "date-fns";

export default async function DeliveryListPage() {
  await requireUser();
  const rows = await prisma.deliveryReceipt.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Delivery Receipts</h1>
        <Link href="/delivery/scan" className="btn-amber">
          Scan Out
        </Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">DR No.</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Units</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-mono font-bold">{d.drNo}</td>
                <td className="px-3 py-2">{d.customerName}</td>
                <td className="px-3 py-2 text-[color:var(--muted)]">{d.projectSite ?? "—"}</td>
                <td className="px-3 py-2 text-[color:var(--muted)]">{format(d.deliveryDate, "MMM d, yyyy")}</td>
                <td className="px-3 py-2 text-right font-bold">
                  {d.items.reduce((s, i) => s + i.quantity, 0)}
                </td>
                <td className="px-3 py-2">
                  <span className={d.status === "ISSUED" ? "pill-ok" : "pill-draft"}>{d.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/api/delivery/${d.id}/pdf`} className="btn-outline !min-h-9 !py-1 text-xs" target="_blank">
                    PDF
                  </Link>
                  <Link href={`/delivery/scan/${d.id}`} className="btn-outline ml-1 !min-h-9 !py-1 text-xs">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
