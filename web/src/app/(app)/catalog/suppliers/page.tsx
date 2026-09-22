import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isManager } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function addSupplier(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isManager(user.role)) return;
  await prisma.supplier.create({
    data: {
      name: String(formData.get("name") || "").trim(),
      contactPerson: String(formData.get("contactPerson") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
    },
  });
  revalidatePath("/catalog/suppliers");
}

export default async function SuppliersPage() {
  const user = await requireUser();
  const rows = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Link href="/catalog/components" className="btn-outline">
          Components
        </Link>
      </div>
      {isManager(user.role) && (
        <form action={addSupplier} className="card grid gap-3 p-4 sm:grid-cols-4">
          <input name="name" className="input" placeholder="Name" required />
          <input name="contactPerson" className="input" placeholder="Contact" />
          <input name="phone" className="input" placeholder="Phone" />
          <button className="btn-amber">Add</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-bold">{s.name}</td>
                <td className="px-3 py-2">{s.contactPerson ?? "—"}</td>
                <td className="px-3 py-2">{s.phone ?? "—"}</td>
                <td className="px-3 py-2">{s.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
