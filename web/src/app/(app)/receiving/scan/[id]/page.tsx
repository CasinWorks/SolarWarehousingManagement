import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addScanInItem } from "@/app/(app)/actions/scan";
import { ScanWorkstation } from "@/components/ScanWorkstation";

export default async function ScanInSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const rcvId = Number(id);
  const rcv = await prisma.receiving.findUnique({
    where: { id: rcvId },
    include: {
      items: {
        include: { component: true, location: true },
        orderBy: { id: "desc" },
      },
    },
  });
  if (!rcv) notFound();
  const locations = await prisma.location.findMany({ orderBy: { code: "asc" } });
  const total = rcv.items.reduce((s, i) => s + i.quantity, 0);

  async function action(formData: FormData) {
    "use server";
    await addScanInItem(rcvId, formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scan In</h1>
          <span className="mt-2 inline-block rounded-lg bg-[color:var(--navy)] px-3 py-1 font-bold text-white">
            {rcv.refNo}
          </span>
        </div>
        <Link href="/receiving" className="btn-outline">
          Done
        </Link>
      </div>

      <ScanWorkstation
        mode="in"
        action={action}
        locations={locations}
        error={sp.error}
        ok={!!sp.ok}
      />

      <div className="card p-4">
        <div className="mb-3 flex justify-between font-bold">
          <span>Items on {rcv.refNo}</span>
          <span>{total} units</span>
        </div>
        <ul className="divide-y divide-[color:var(--border)]">
          {rcv.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-semibold">
                  <span className="font-mono">{it.component.sku}</span> · {it.component.name}
                </div>
                <div className="text-sm text-[color:var(--muted)]">
                  Bay {it.location.code} · {it.condition}
                </div>
              </div>
              <div className="text-xl font-bold">{it.quantity}</div>
            </li>
          ))}
          {rcv.items.length === 0 && (
            <li className="py-6 text-center text-[color:var(--muted)]">No items yet — pick a bay and scan.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
