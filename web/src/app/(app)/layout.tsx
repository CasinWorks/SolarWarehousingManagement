import { Suspense } from "react";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { RouteProgress } from "@/components/RouteProgress";

// Run near Supabase ap-south-1 (Mumbai) to cut DB round-trip latency
export const preferredRegion = ["bom1"];

async function logoutAction() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user} logoutAction={logoutAction}>
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      {children}
    </AppShell>
  );
}
