"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receiving", label: "Receiving" },
  { href: "/inventory", label: "Inventory" },
  { href: "/delivery", label: "Delivery" },
  { href: "/catalog/components", label: "Catalog" },
];

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={`block rounded-lg px-3 py-2.5 touch-manipulation ${
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const onScanPage = pathname.includes("/scan");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 bg-[color:var(--navy)] text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <Link href="/dashboard" prefetch className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color:var(--amber)] text-[color:var(--navy-deep)] sm:h-10 sm:w-10">
              ☀
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-bold">SolarStock</span>
              <span className="hidden text-xs text-white/65 sm:block">Warehouse Management</span>
            </span>
          </Link>

          <nav className="hidden flex-1 flex-wrap items-center gap-1 text-sm lg:flex">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
            {user.role === "admin" && <NavLink href="/users" label="Users" />}
          </nav>

          <div className="hidden items-center gap-2 text-sm sm:flex">
            <span className="hidden md:inline">{user.fullName}</span>
            <span className="rounded-md bg-[color:var(--amber)] px-2 py-0.5 text-xs font-bold text-[color:var(--navy-deep)]">
              {user.role}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">
                Logout
              </button>
            </form>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 touch-manipulation lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5">
              <span className={`block h-0.5 w-5 bg-white transition ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-5 bg-white transition ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-white transition ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 px-3 py-2 lg:hidden">
            <nav className="flex flex-col gap-0.5 text-sm">
              {links.map((l) => (
                <NavLink key={l.href} href={l.href} label={l.label} onNavigate={() => setMenuOpen(false)} />
              ))}
              {user.role === "admin" && (
                <NavLink href="/users" label="Users" onNavigate={() => setMenuOpen(false)} />
              )}
            </nav>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-sm">
              <span className="truncate text-white/80">
                {user.fullName} · {user.role}
              </span>
              <form action={logoutAction}>
                <button type="submit" className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      <main
        className={`mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6 ${
          onScanPage ? "pb-28" : "pb-20 lg:pb-6"
        }`}
      >
        {children}
      </main>

      {/* Mobile quick actions */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1 px-2 py-1.5 text-center text-[11px] font-semibold text-[color:var(--navy)]">
          <Link href="/dashboard" className="rounded-lg px-1 py-2 touch-manipulation active:bg-[#f3f0ea]">
            Home
          </Link>
          <Link
            href="/receiving/scan"
            className="rounded-lg bg-emerald-50 px-1 py-2 text-[color:var(--ok)] touch-manipulation"
          >
            Scan In
          </Link>
          <Link
            href="/delivery/scan"
            className="rounded-lg bg-amber-50 px-1 py-2 text-amber-800 touch-manipulation"
          >
            Scan Out
          </Link>
          <Link href="/inventory" className="rounded-lg px-1 py-2 touch-manipulation active:bg-[#f3f0ea]">
            Stock
          </Link>
        </div>
      </nav>

      <footer className="mt-auto hidden flex-wrap items-center justify-center gap-2 border-t border-[color:var(--border)] px-3 py-3 text-sm text-[color:var(--muted)] lg:flex">
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
