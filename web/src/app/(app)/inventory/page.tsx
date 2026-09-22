import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const category = (sp.category || "").trim();

  const components = await prisma.component.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      stockItems: {
        where: { quantity: { gt: 0 } },
        include: { location: true },
      },
    },
  });

  const categories = (
    await prisma.component.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    })
  )
    .map((c) => c.category!)
    .filter(Boolean)
    .sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Link href="/inventory/movements" className="btn-outline">
          Movement Log
        </Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="input max-w-md" placeholder="Search SKU or name…" />
        <select name="category" defaultValue={category} className="input max-w-xs">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="btn-outline">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Bays</th>
            </tr>
          </thead>
          <tbody>
            {components.map((c) => {
              const total = c.stockItems.reduce((s, i) => s + i.quantity, 0);
              const low = total <= c.reorderLevel;
              return (
                <tr key={c.id} className="border-t border-[color:var(--border)]">
                  <td className="px-3 py-2">
                    <span className="font-mono">{c.sku}</span> · {c.name}
                  </td>
                  <td className="px-3 py-2 text-[color:var(--muted)]">{c.category ?? "—"}</td>
                  <td className={`px-3 py-2 text-right font-bold ${low ? "text-[color:var(--low)]" : "text-[color:var(--ok)]"}`}>
                    {total} {c.unit}
                    {low && <span className="pill-low ml-2">LOW</span>}
                  </td>
                  <td className="px-3 py-2">
                    {c.stockItems.map((si) => (
                      <span
                        key={si.id}
                        className="mb-1 mr-1 inline-block rounded border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-0.5 font-mono text-xs"
                      >
                        {si.location.code}: {si.quantity}
                      </span>
                    ))}
                    {c.stockItems.length === 0 && <span className="text-[color:var(--muted)]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
