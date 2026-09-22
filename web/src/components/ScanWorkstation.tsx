"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  mode: "in" | "out";
  lookupUrl?: string;
  action: (formData: FormData) => void | Promise<void>;
  locations: { id: number; code: string; name: string }[];
  error?: string;
  ok?: boolean;
};

export function ScanWorkstation({ mode, action, locations, error, ok }: Props) {
  const [locationId, setLocationId] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const [found, setFound] = useState<{
    ok: boolean;
    sku?: string;
    name?: string;
    stock?: number;
    unit?: string;
    category?: string;
    available?: number | null;
    error?: string;
  } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMsg, setCameraMsg] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastScan = useRef({ code: "", at: 0 });

  const ready =
    !!found?.ok && !!locationId && !!qty && Number(qty) > 0 && !!sku.trim();

  useEffect(() => {
    if (!sku.trim()) {
      setFound(null);
      return;
    }
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ sku: sku.trim() });
      if (locationId) params.set("location_id", locationId);
      const res = await fetch(`/api/sku?${params}`);
      const data = await res.json();
      setFound(data);
    }, 200);
    return () => clearTimeout(t);
  }, [sku, locationId]);

  async function stopCamera() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setCameraOn(false);
    setCameraMsg("");
  }

  async function startCamera() {
    if (!locationId) {
      setCameraMsg("Select a bay first.");
      return;
    }
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("camera-reader");
    scannerRef.current = scanner;
    setCameraOn(true);
    setCameraMsg("Starting camera…");
    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => ({
            width: Math.floor(w * 0.85),
            height: Math.min(Math.floor(h * 0.35), 160),
          }),
        },
        (text) => {
          const code = String(text).trim();
          const now = Date.now();
          if (code === lastScan.current.code && now - lastScan.current.at < 2500) return;
          lastScan.current = { code, at: now };
          setSku(code);
          setCameraMsg(`Scanned: ${code}`);
          if (navigator.vibrate) navigator.vibrate(40);
        },
        () => {},
      );
      setCameraMsg("Point the camera at the barcode");
    } catch (e) {
      setCameraOn(false);
      setCameraMsg(
        `Camera failed. Allow permission and use HTTPS/localhost. (${e instanceof Error ? e.message : "error"})`,
      );
    }
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-[color:var(--low)]">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-[color:var(--ok)]">Item added.</div>
      )}

      <div className="card p-4">
        <h2 className="mb-3 font-bold">1. Choose bay</h2>
        <input type="hidden" name="locationId" value={locationId} required />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocationId(String(l.id))}
              className={`flex min-h-[88px] flex-col items-center justify-center rounded-xl border-2 p-3 font-bold ${
                locationId === String(l.id)
                  ? "border-[color:var(--amber)] bg-amber-50"
                  : "border-[color:var(--border)] bg-white"
              }`}
            >
              <span className="font-mono">{l.code}</span>
              <span className="text-xs font-normal text-[color:var(--muted)]">{l.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-bold">2. Scan SKU</h2>
        <div className="mb-3 space-y-2">
          {!cameraOn ? (
            <button type="button" className="btn-amber w-full min-h-14 text-lg" onClick={startCamera}>
              Open camera to scan
            </button>
          ) : (
            <button type="button" className="btn-outline w-full" onClick={stopCamera}>
              Close camera
            </button>
          )}
          <p className="text-sm text-[color:var(--muted)]">
            On a phone: allow camera, then aim at the barcode. (Needs HTTPS or localhost.)
          </p>
        </div>
        {cameraOn && (
          <div className="mb-3 overflow-hidden rounded-xl bg-[#0b1220] p-2">
            <div id="camera-reader" className="min-h-[260px] w-full overflow-hidden rounded-lg" />
            {cameraMsg && <p className="mt-2 text-center text-sm text-white/80">{cameraMsg}</p>}
          </div>
        )}
        {!cameraOn && cameraMsg && (
          <p className="mb-3 text-sm text-[color:var(--low)]">{cameraMsg}</p>
        )}

        <label className="mb-1 block font-semibold">Or type / USB scanner</label>
        <input
          name="sku"
          className="input text-lg font-semibold"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Barcode / SKU…"
          autoComplete="off"
          required
        />
        <div
          className={`mt-3 min-h-[72px] rounded-xl p-4 ${
            found && !found.ok ? "bg-red-50 text-[color:var(--low)]" : "bg-[#eef1f6]"
          }`}
        >
          {!found && <span className="text-[color:var(--muted)]">Waiting for scan…</span>}
          {found && !found.ok && <span>{found.error}</span>}
          {found?.ok && (
            <div>
              <div className="text-lg font-bold">
                {found.sku} · {found.name}
              </div>
              <div className="text-[color:var(--muted)]">
                {found.category ? `${found.category} · ` : ""}
                Total stock: {found.stock} {found.unit}
                {mode === "out" && found.available != null && (
                  <>
                    {" "}
                    · In this bay: <strong>{found.available}</strong>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-semibold">Qty</label>
            <input
              name="quantity"
              type="number"
              min={1}
              className="input"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          {mode === "in" && (
            <div>
              <label className="mb-1 block font-semibold">Condition</label>
              <select name="condition" className="input" defaultValue="GOOD">
                <option value="GOOD">Good</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-[color:var(--surface)] via-[color:var(--surface)] to-transparent pb-[env(safe-area-inset-bottom)] pt-2">
        <button type="submit" className="btn-ok w-full min-h-14 text-lg" disabled={!ready}>
          Confirm & Add Item
        </button>
      </div>
    </form>
  );
}
