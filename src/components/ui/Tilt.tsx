"use client";

import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";

/**
 * 3D "stage pass" tilt: the element pivots toward the pointer with a damped
 * spring, a specular glare follows the light, and an optional holographic
 * foil shimmers across it. Pure transforms (GPU-composited); static for
 * reduced motion and touch-only devices.
 */
export function Tilt({
  children,
  className,
  max = 9,
  foil = false,
  glare = true,
  lift = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  foil?: boolean;
  glare?: boolean;
  lift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    let active = false;
    const cur = { x: 0, y: 0, s: 0 }, tgt = { x: 0, y: 0, s: 0 };
    const step = () => {
      cur.x += (tgt.x - cur.x) * 0.14;
      cur.y += (tgt.y - cur.y) * 0.14;
      cur.s += (tgt.s - cur.s) * 0.14;
      el.style.setProperty("--rx", `${(-cur.y * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(cur.x * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((cur.x + 1) * 50).toFixed(1)}%`);
      el.style.setProperty("--gy", `${((cur.y + 1) * 50).toFixed(1)}%`);
      el.style.setProperty("--lift", cur.s.toFixed(3));
      const settled = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) + Math.abs(tgt.s - cur.s) < 0.002;
      raf = active || !settled ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tgt.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      tgt.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const enter = () => {
      active = true;
      tgt.s = 1;
      kick();
    };
    const leave = () => {
      active = false;
      tgt.x = tgt.y = tgt.s = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [max]);

  return (
    <div ref={ref} className={clsx("tilt relative [perspective:1000px]", className)}>
      <div className={clsx("tilt-body relative h-full [transform-style:preserve-3d]", lift && "tilt-lift")}>
        {children}
        {foil && <span aria-hidden className="tilt-foil pointer-events-none absolute inset-0 z-20 rounded-[inherit]" />}
        {glare && <span aria-hidden className="tilt-glare pointer-events-none absolute inset-0 z-20 rounded-[inherit]" />}
      </div>
    </div>
  );
}
