import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function addUser(formData: FormData) {
  "use server";
  await requireAdmin();
  const password = String(formData.get("password") || "");
  await prisma.user.create({
    data: {
      username: String(formData.get("username") || "").trim(),
      fullName: String(formData.get("fullName") || "").trim(),
      role: String(formData.get("role") || "operator"),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  revalidatePath("/users");
}

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { username: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <form action={addUser} className="card grid gap-3 p-4 sm:grid-cols-5">
        <input name="username" className="input" placeholder="Username" required />
        <input name="fullName" className="input" placeholder="Full name" required />
        <select name="role" className="input" defaultValue="operator">
          <option value="operator">operator</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <input name="password" type="password" className="input" placeholder="Password" required />
        <button className="btn-amber">Add user</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eef1f6] text-left">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[color:var(--border)]">
                <td className="px-3 py-2 font-mono font-bold">{u.username}</td>
                <td className="px-3 py-2">{u.fullName}</td>
                <td className="px-3 py-2">
                  <span className="pill-ok">{u.role}</span>
                </td>
                <td className="px-3 py-2">{u.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
