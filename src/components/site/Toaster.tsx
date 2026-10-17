"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Toast = { id: number; message: string; tone?: "error" | "ok" | "info"; href?: string; cta?: string };

/** Fire-and-forget toasts from anywhere on the client. */
export function toast(message: string, opts: Omit<Toast, "id" | "message"> = {}) {
  window.dispatchEvent(new CustomEvent("sc:toast", { detail: { message, ...opts } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const t = { id: ++n, ...(e as CustomEvent).detail } as Toast;
      setItems((xs) => [...xs.slice(-3), t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.href ? 9000 : 4500);
    };
    window.addEventListener("sc:toast", on);
    return () => window.removeEventListener("sc:toast", on);
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${
            t.tone === "error" ? "border-onair/40 bg-danger-bg text-danger" : t.tone === "ok" ? "border-ok/30 bg-success-bg text-success" : "border-white/10 bg-ink-800/90 text-ink-100"
          }`}
        >
          <span>{t.message}</span>
          {t.href && (
            <Link href={t.href} className="shrink-0 rounded-full bg-spot-500 px-3 py-1 text-xs font-semibold text-on-spot">
              {t.cta ?? "Open"}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
