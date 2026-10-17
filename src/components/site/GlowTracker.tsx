"use client";

import { useEffect } from "react";

/** One delegated listener drives the cursor glow on every [data-glow] card. */
export function GlowTracker() {
  useEffect(() => {
    if (matchMedia("(pointer: coarse)").matches) return;
    let el: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-glow]") ?? null;
      el = t;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    addEventListener("pointermove", move, { passive: true });
    return () => removeEventListener("pointermove", move);
  }, []);
  return null;
}
