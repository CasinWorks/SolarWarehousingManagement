"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receiving", label: "Receiving" },
  { href: "/inventory", label: "Inventory" },
  { href: "/delivery", label: "Delivery Receipts" },
  { href: "/catalog/components", label: "Catalog" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch
      className={`rounded-lg px-3 py-2 ${
        active ? "bg-white/15 font-semibold text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  user,
  children,
  logoutAction,
}: {
  user: { fullName: string; role: string };
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-[color:var(--navy)] text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-3 py-2 sm:px-4">
          <Link href="/dashboard" prefetch className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[color:var(--amber)] text-[color:var(--navy-deep)]">
              ☀
            </span>
            <span className="leading-tight">
              <span className="block font-bold">SolarStock</span>
              <span className="block text-xs text-white/65">Warehouse Management</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
            {user.role === "admin" && <NavLink href="/users" label="Users" />}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">{user.fullName}</span>
            <span className="rounded-md bg-[color:var(--amber)] px-2 py-0.5 text-xs font-bold text-[color:var(--navy-deep)]">
              {user.role}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6">{children}</main>
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-[color:var(--border)] px-3 py-3 text-sm text-[color:var(--muted)]">
        <Image
          src="/img/pfs-logo.png"
          alt="PFS Automation"
          width={90}
          height={28}
          className="h-7 w-auto rounded"
          priority={false}
        />
        <span>·</span>
        <span>Powered by</span>
        <Image
          src="/img/casinworks-logo.png"
          alt="CasinWorks"
          width={100}
          height={22}
          className="h-5 w-auto opacity-80"
          priority={false}
        />
      </footer>
    </div>
  );
}
