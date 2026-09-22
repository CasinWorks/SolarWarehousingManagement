import Link from "next/link";
import { requireUser } from "@/lib/session";
import { startScanOut } from "@/app/(app)/actions/scan";

export default async function ScanOutStartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Scan Out</h1>
        <Link href="/delivery" className="btn-outline">
          Cancel
        </Link>
      </div>
      {sp.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-[color:var(--low)]">{sp.error}</div>}
      <form action={startScanOut} className="card space-y-4 p-4">
        <p className="text-[color:var(--muted)]">
          Who is this for? Then scan products out. Print the Delivery Receipt when finished.
        </p>
        <div>
          <label className="mb-1 block font-semibold">Customer Name *</label>
          <input name="customerName" className="input" required />
        </div>
        <div>
          <label className="mb-1 block font-semibold">Project Site</label>
          <input name="projectSite" className="input" placeholder="e.g. Batangas Rooftop Array" />
        </div>
        <div>
          <label className="mb-1 block font-semibold">Customer Address</label>
          <input name="customerAddress" className="input" />
        </div>
        <div>
          <label className="mb-1 block font-semibold">Note</label>
          <input name="note" className="input" />
        </div>
        <button type="submit" className="btn-amber w-full min-h-14">
          Start Scan Out
        </button>
      </form>
    </div>
  );
}
