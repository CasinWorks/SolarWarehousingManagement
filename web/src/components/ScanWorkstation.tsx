"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Props = {
  mode: "in" | "out";
  action: (formData: FormData) => void | Promise<void>;
  locations: { id: number; code: string; name: string }[];
  error?: string;
  ok?: boolean;
};

type Found = {
  ok: boolean;
  sku?: string;
  name?: string;
  stock?: number;
  unit?: string;
  category?: string;
  available?: number | null;
  error?: string;
};

export function ScanWorkstation({ mode, action, locations, error, ok }: Props) {
  const readerId = useId().replace(/:/g, "");
  const [locationId, setLocationId] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const [found, setFound] = useState<Found | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraMsg, setCameraMsg] = useState("");
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear?: () => void;
  } | null>(null);
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
    }, 180);
    return () => clearTimeout(t);
  }, [sku, locationId]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear?.();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setCameraOn(false);
    setCameraBusy(false);
  }, []);

  async function startCamera() {
    if (!locationId) {
      setCameraMsg("Pick a bay first, then open the camera.");
      return;
    }
    if (cameraBusy || cameraOn) return;
    setCameraBusy(true);
    setCameraMsg("Requesting camera…");

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      await stopCamera();

      const scanner = new Html5Qrcode(`camera-reader-${readerId}`);
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) {
        throw new Error("No camera found on this device.");
      }

      // Prefer back / environment camera on phones
      const back =
        cameras.find((c) => /back|rear|environment|world/i.test(c.label)) ||
        cameras[cameras.length - 1];

      const config = {
        fps: 12,
        aspectRatio: 1.333,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ],
        qrbox: (w: number, h: number) => {
          const width = Math.floor(Math.min(w * 0.92, 360));
          const height = Math.floor(Math.min(h * 0.42, 180));
          return { width, height };
        },
      };

      setCameraOn(true);
      // Wait one frame so the camera container is visible for html5-qrcode
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const onScan = (text: string) => {
        const code = String(text).trim();
        if (!code) return;
        const now = Date.now();
        if (code === lastScan.current.code && now - lastScan.current.at < 2200) return;
        lastScan.current = { code, at: now };
        setSku(code);
        setCameraMsg(`Scanned ${code}`);
        if (navigator.vibrate) navigator.vibrate(35);
      };

      try {
        await scanner.start(back.id, config, onScan, () => {});
      } catch {
        // Fallback: facingMode (works well on many phones)
        await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
      }
      setCameraMsg("Aim at the barcode — hold steady");
    } catch (e) {
      await stopCamera();
      const msg = e instanceof Error ? e.message : "Camera error";
      setCameraMsg(
        /Permission|NotAllowed|denied/i.test(msg)
          ? "Camera permission denied. Allow camera in browser settings, then try again."
          : `Camera failed: ${msg}`,
      );
    } finally {
      setCameraBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-[color:var(--low)]">{error}</div>
      )}
      {ok && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-[color:var(--ok)]">
          Item added — scan the next one.
        </div>
      )}

      <div className="card p-3 sm:p-4">
        <h2 className="mb-2 text-base font-bold sm:text-lg">1. Choose bay</h2>
        <input type="hidden" name="locationId" value={locationId} required />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {locations.map((l) => {
            const active = locationId === String(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocationId(String(l.id))}
                className={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center touch-manipulation ${
                  active
                    ? "border-[color:var(--amber)] bg-amber-50 shadow-sm"
                    : "border-[color:var(--border)] bg-white active:bg-[#f3f0ea]"
                }`}
              >
                <span className="font-mono text-lg font-bold">{l.code}</span>
                <span className="mt-0.5 line-clamp-2 text-xs font-normal text-[color:var(--muted)]">
                  {l.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden p-3 sm:p-4">
        <h2 className="mb-2 text-base font-bold sm:text-lg">2. Scan with phone camera</h2>

        <div className="mb-3 flex flex-col gap-2">
          {!cameraOn ? (
            <button
              type="button"
              className="btn-amber min-h-14 w-full touch-manipulation text-base sm:text-lg"
              onClick={startCamera}
              disabled={cameraBusy}
            >
              {cameraBusy ? "Opening camera…" : "📷 Open phone camera"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-outline min-h-12 w-full touch-manipulation"
              onClick={() => void stopCamera()}
            >
              Close camera
            </button>
          )}
          <p className="text-sm text-[color:var(--muted)]">
            Works on iPhone & Android in the browser (Safari / Chrome). Allow camera when asked.
          </p>
        </div>

        {/* Keep the reader node mounted so html5-qrcode can attach */}
        <div className={cameraOn ? "mb-3" : "hidden"}>
          <div className="overflow-hidden rounded-xl bg-[#0b1220]">
            <div
              id={`camera-reader-${readerId}`}
              className="camera-reader mx-auto w-full max-w-lg overflow-hidden [&_video]:!h-auto [&_video]:!max-h-[55vh] [&_video]:!w-full [&_video]:object-cover"
            />
            {cameraMsg && (
              <p className="px-3 py-2 text-center text-sm text-white/85">{cameraMsg}</p>
            )}
          </div>
        </div>

        {!cameraOn && cameraMsg && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-[color:var(--low)]">
            {cameraMsg}
          </p>
        )}

        <label className="mb-1 block text-sm font-semibold">Or type / USB barcode scanner</label>
        <input
          name="sku"
          className="input min-h-12 text-base font-semibold sm:text-lg"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Barcode / SKU…"
          autoComplete="off"
          inputMode="text"
          enterKeyHint="done"
          required
        />

        <div
          className={`mt-3 min-h-[72px] rounded-xl p-3 sm:p-4 ${
            found && !found.ok ? "bg-red-50 text-[color:var(--low)]" : "bg-[#eef1f6]"
          }`}
        >
          {!found && <span className="text-[color:var(--muted)]">Waiting for scan…</span>}
          {found && !found.ok && <span>{found.error}</span>}
          {found?.ok && (
            <div>
              <div className="text-base font-bold sm:text-lg">
                {found.sku} · {found.name}
              </div>
              <div className="mt-1 text-sm text-[color:var(--muted)]">
                {found.category ? `${found.category} · ` : ""}
                Total: {found.stock} {found.unit}
                {mode === "out" && found.available != null && (
                  <>
                    {" "}
                    · This bay: <strong>{found.available}</strong>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Qty</label>
            <input
              name="quantity"
              type="number"
              min={1}
              inputMode="numeric"
              className="input min-h-12"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          {mode === "in" && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Condition</label>
              <select name="condition" className="input min-h-12" defaultValue="GOOD">
                <option value="GOOD">Good</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-3 border-t border-[color:var(--border)] bg-[color:var(--surface)]/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-0 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          className="btn-ok min-h-14 w-full touch-manipulation text-base sm:text-lg disabled:opacity-40"
          disabled={!ready}
        >
          Confirm & Add Item
        </button>
      </div>
    </form>
  );
}
