import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isManager } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function addLocation(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!isManager(user.role)) return;
  await prisma.location.create({
    data: {
      code: String(formData.get("code") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      zone: String(formData.get("zone") || "").trim() || null,
      capacity: Number(formData.get("capacity") || 0),
    },
  });
  revalidatePath("/catalog/locations");
}

export default async function LocationsPage() {
  const user = await requireUser();
  const rows = await prisma.location.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Locations (Bays)</h1>
        <Link href="/catalog/components" className="btn-outline">
          Components
        </Link>
      </div>
      {isManager(user.role) && (
        <form action={addLocation} className="card grid gap-3 p-4 sm:grid-cols-5">
          <input name="code" className="input" placeholder="Code" required />
          <input name="name" className="input" placeholder="Name" required />
          <input name="zone" className="input" placeholder="Zone" />
          <input name="capacity" type="number" className="input" placeholder="Capacity" />
          <button className="btn-amber">Add</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2 text-right">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-mono font-bold">{l.code}</td>
                <td className="px-3 py-2">{l.name}</td>
                <td className="px-3 py-2">{l.zone ?? "—"}</td>
                <td className="px-3 py-2 text-right">{l.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
