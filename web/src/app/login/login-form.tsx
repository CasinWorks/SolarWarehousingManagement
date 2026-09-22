"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      username: String(fd.get("username") || ""),
      password: String(fd.get("password") || ""),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid username or password.");
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[color:var(--navy-deep)] via-[color:var(--navy)] to-[#2a3f66] p-4">
      <div className="w-full max-w-md">
        <div className="card p-6 shadow-lg sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--amber)] text-2xl text-[color:var(--navy-deep)]">
              ☀
            </div>
            <h1 className="text-2xl font-bold">SolarStock Warehouse</h1>
            <p className="text-[color:var(--muted)]">Inventory & delivery management</p>
          </div>
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-[color:var(--low)]">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block font-semibold">Username</label>
              <input name="username" className="input" autoFocus required autoComplete="username" />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Password</label>
              <input name="password" type="password" className="input" required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn-amber w-100 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-white/70">
          <Image src="/img/pfs-logo.png" alt="PFS" width={90} height={28} className="h-7 w-auto rounded" />
          <span>·</span>
          <span>Powered by</span>
          <Image
            src="/img/casinworks-logo.png"
            alt="CasinWorks"
            width={100}
            height={22}
            className="h-6 w-auto rounded bg-white/90 px-2 py-1"
          />
        </div>
      </div>
    </div>
  );
}
