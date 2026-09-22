import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isManager } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function addComponent(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isManager(user.role)) return;
  await prisma.component.create({
    data: {
      sku: String(formData.get("sku") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim() || null,
      unit: String(formData.get("unit") || "pc").trim() || "pc",
      reorderLevel: Number(formData.get("reorderLevel") || 0),
    },
  });
  revalidatePath("/catalog/components");
}

export default async function ComponentsPage() {
  const user = await requireUser();
  const rows = await prisma.component.findMany({ orderBy: { sku: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Components</h1>
        <div className="flex gap-2">
          <Link href="/catalog/locations" className="btn-outline">
            Locations
          </Link>
          <Link href="/catalog/suppliers" className="btn-outline">
            Suppliers
          </Link>
        </div>
      </div>
      {isManager(user.role) && (
        <form action={addComponent} className="card grid gap-3 p-4 sm:grid-cols-5">
          <input name="sku" className="input" placeholder="SKU" required />
          <input name="name" className="input sm:col-span-2" placeholder="Name" required />
          <input name="category" className="input" placeholder="Category" />
          <button className="btn-amber">Add</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Reorder</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-mono font-bold">{c.sku}</td>
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.category ?? "—"}</td>
                <td className="px-3 py-2">{c.unit}</td>
                <td className="px-3 py-2 text-right">{c.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
