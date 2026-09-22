import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startScanIn } from "@/app/(app)/actions/scan";

export default async function ScanInStartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Scan In</h1>
        <Link href="/receiving" className="btn-outline">
          Cancel
        </Link>
      </div>
      {sp.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-[color:var(--low)]">{sp.error}</div>}
      <form action={startScanIn} className="card space-y-4 p-4">
        <p className="text-[color:var(--muted)]">Optional header — then scan products into stock.</p>
        <div>
          <label className="mb-1 block font-semibold">Supplier</label>
          <select name="supplierId" className="input">
            <option value="">— Optional —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block font-semibold">PO Number</label>
          <input name="poNumber" className="input" placeholder="PO-1234" />
        </div>
        <div>
          <label className="mb-1 block font-semibold">Note</label>
          <input name="note" className="input" placeholder="Optional" />
        </div>
        <button type="submit" className="btn-ok w-full min-h-14">
          Start Scan In
        </button>
      </form>
    </div>
  );
}
