import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "manager") redirect("/dashboard");
  return user;
}

export function isManager(role: string) {
  return role === "admin" || role === "manager";
}
