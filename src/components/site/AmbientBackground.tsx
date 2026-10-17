"use client";

import { useEffect, useRef } from "react";

// A handful of house colours: the canopy of light the whole site sits under.
const ORBS = ["#ff9a1f", "#16a34a", "#4f46e5", "#ea580c", "#0891b2", "#be185d", "#ca8a04", "#7c3aed"];

/**
 * Site-wide living background: soft light orbs that drift, breathe and lean
 * toward the cursor. Rendered at half resolution, capped at ~30fps, paused
 * when the tab is hidden, and frozen for prefers-reduced-motion.
 */
export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = 0.5;
    let w = 0, h = 0, raf = 0, last = 0;
    const mouse = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3 };

    const orbs = ORBS.map((c, i) => ({
      c,
      x: Math.random(),
      y: Math.random() * 0.9,
      r: 0.22 + Math.random() * 0.18,
      sx: 0.00006 + Math.random() * 0.00008,
      sy: 0.00005 + Math.random() * 0.00007,
      ph: i * 1.7,
    }));

    const resize = () => {
      w = canvas.width = Math.round(innerWidth * scale);
      h = canvas.height = Math.round(innerHeight * scale);
    };
    const dark = () => document.documentElement.dataset.theme === "stage";

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.globalCompositeOperation = dark() ? "lighter" : "source-over";
      const alpha = dark() ? 0.16 : 0.22;
      for (const o of orbs) {
        const x = (o.x + Math.sin(t * o.sx + o.ph) * 0.18 + (mouse.x - 0.5) * 0.12) * w;
        const y = (o.y + Math.cos(t * o.sy + o.ph) * 0.14 + (mouse.y - 0.5) * 0.1) * h;
        const r = o.r * Math.max(w, h) * (1 + Math.sin(t * 0.0004 + o.ph) * 0.08);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, o.c + Math.round(alpha * 255).toString(16).padStart(2, "0"));
        g.addColorStop(1, o.c + "00");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      // Cursor "follow-spot": a warm pool of light under the pointer.
      const sx = mouse.x * w, sy = mouse.y * h;
      const spot = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.22);
      spot.addColorStop(0, dark() ? "rgba(255,200,120,0.10)" : "rgba(255,170,60,0.13)");
      spot.addColorStop(1, "rgba(255,170,60,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, w, h);
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return;
      last = t;
      draw(t);
    };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / innerWidth;
      mouse.ty = e.clientY / innerHeight;
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(loop);
    };

    resize();
    draw(performance.now());
    addEventListener("resize", resize);
    if (!reduce) {
      addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full blur-2xl" />;
}
