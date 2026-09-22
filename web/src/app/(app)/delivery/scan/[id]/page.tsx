import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addScanOutItem } from "@/app/(app)/actions/scan";
import { ScanWorkstation } from "@/components/ScanWorkstation";

export default async function ScanOutSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const drId = Number(id);
  const dr = await prisma.deliveryReceipt.findUnique({
    where: { id: drId },
    include: {
      items: {
        include: { component: true, location: true },
        orderBy: { id: "desc" },
      },
    },
  });
  if (!dr) notFound();
  const locations = await prisma.location.findMany({ orderBy: { code: "asc" } });
  const total = dr.items.reduce((s, i) => s + i.quantity, 0);

  async function action(formData: FormData) {
    "use server";
    await addScanOutItem(drId, formData);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scan Out</h1>
          <span className="mt-2 inline-block rounded-lg bg-[color:var(--navy)] px-3 py-1 font-bold text-white">
            {dr.drNo}
          </span>
          <p className="mt-2 text-[color:var(--muted)]">
            {dr.customerName}
            {dr.projectSite ? ` · ${dr.projectSite}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/delivery/${dr.id}/pdf`} className="btn-outline" target="_blank">
            PDF
          </Link>
          <Link href="/delivery" className="btn-outline">
            Done
          </Link>
        </div>
      </div>

      <ScanWorkstation
        mode="out"
        action={action}
        locations={locations}
        error={sp.error}
        ok={!!sp.ok}
      />

      <div className="card p-4">
        <div className="mb-3 flex justify-between font-bold">
          <span>Items on {dr.drNo}</span>
          <span>{total} units</span>
        </div>
        <ul className="divide-y divide-[color:var(--border)]">
          {dr.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-semibold">
                  <span className="font-mono">{it.component.sku}</span> · {it.component.name}
                </div>
                <div className="text-sm text-[color:var(--muted)]">From bay {it.location.code}</div>
              </div>
              <div className="text-xl font-bold">{it.quantity}</div>
            </li>
          ))}
          {dr.items.length === 0 && (
            <li className="py-6 text-center text-[color:var(--muted)]">No items yet — pick a bay and scan.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
