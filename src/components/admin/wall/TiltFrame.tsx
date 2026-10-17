"use client";

import { useRef, type ReactNode } from "react";

const MAX = 6; // degrees

/** Tilts its child slightly in 3D toward the pointer. Fine pointers only; off for reduced motion. */
export function TiltFrame({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || ev.pointerType !== "mouse" || !enabled()) return;
    const { clientX, clientY } = ev;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (clientX - r.left) / r.width - 0.5;
      const y = (clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${(x * MAX * 2).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * MAX * 1.4).toFixed(2)}deg`);
      el.dataset.tilting = "";
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.tilting;
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`wall-tilt ${className ?? ""}`}>
      {children}
    </div>
  );
}
